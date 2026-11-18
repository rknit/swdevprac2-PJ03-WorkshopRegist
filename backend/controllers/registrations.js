const Registration = require("../models/Registration");
const Workshop = require("../models/Workshop");
const User = require("../models/User");
const { bangkokTodayStart } = require("../lib/dates");

// A user may hold at most this many registrations on still-active workshops.
const MAX_ACTIVE = 3;

const populateRegistration = (query, req) => {
  const populated = query
    .populate("workshop", "name description instructor workshopDate startTime endTime coverImage location capacity registeredCount isActive")
    .populate("user", "name email tel role");
  // Attendance is an admin-only field: members never receive it.
  return req && req.user.role !== "admin" ? populated.select("-attendance") : populated;
};

// The Bangkok calendar day (UTC+7) is the "today" for all date rules.
const bangkokToday = () => bangkokTodayStart();

// A workshop counts toward the 3-active limit while its date is today or later.
const isActiveOn = (date, today) => date >= today;

// Source of truth: how many of the user's registrations sit on active workshops.
const liveActiveCount = async (userId) => {
  const today = bangkokToday();
  const active = await Workshop.find({ isActive: true, workshopDate: { $gte: today } }).lean();
  if (active.length === 0) return 0;
  const activeIds = active.map((item) => item._id);
  return Registration.countDocuments({ user: userId, workshop: { $in: activeIds } });
};

// Duplicate + past-date checks. Capacity and the 3-active limit are NOT
// checked here: both are enforced by atomic conditional increments (the
// "gates"), which cannot be bypassed by concurrent requests.
const validateRegistration = async ({ workshopId, user }) => {
  if (typeof workshopId !== "string" || !/^[a-fA-F0-9]{24}$/.test(workshopId)) {
    return { status: 400, error: "A valid workshop ID is required" };
  }
  const workshop = await Workshop.findOne({ _id: workshopId, isActive: true });
  if (!workshop) return { status: 404, error: "Workshop not found or inactive" };
  const today = bangkokToday();
  if (workshop.workshopDate < today) {
    return { status: 400, error: "Cannot register after the workshop date" };
  }
  const duplicate = await Registration.findOne({ user, workshop: workshop.id });
  if (duplicate) return { status: 409, error: "Member is already registered for this workshop" };
  return { workshop, today };
};

// Capacity gate: reserve one slot. Matches only while registeredCount is
// below capacity, so it is safe under concurrency.
const reserveCapacity = (workshop) =>
  Workshop.updateOne(
    { _id: workshop.id, isActive: true, registeredCount: { $lt: workshop.capacity } },
    { $inc: { registeredCount: 1 } },
  ).then((r) => r.matchedCount === 1);

// Admin override ("Ignore Capacity"): take a seat even when the workshop is
// full. Still one atomic increment, so the count stays exact.
const forceCapacity = (workshop) =>
  Workshop.updateOne({ _id: workshop.id, isActive: true }, { $inc: { registeredCount: 1 } }).then((r) => r.matchedCount === 1);

const releaseCapacity = (workshopId) =>
  Workshop.updateOne({ _id: workshopId, registeredCount: { $gt: 0 } }, { $inc: { registeredCount: -1 } });

// 3-active gate on the user's activeCount. The counter is maintained by
// exact +1/-1 pairing and seeded once, so it is exact except for one
// conservative drift: a workshop passing its date frees a slot in the live
// sense but not in the counter. When the gate fails we therefore compare the
// live count; if it is below the limit we sync the counter and retry once.
const reserveActiveSlot = async (userId) => {
  const gate = () =>
    User.updateOne({ _id: userId, activeCount: { $lt: MAX_ACTIVE } }, { $inc: { activeCount: 1 } });
  if ((await gate()).matchedCount === 1) return true;
  const live = await liveActiveCount(userId);
  if (live < MAX_ACTIVE) {
    await User.updateOne({ _id: userId }, { activeCount: live });
    return (await gate()).matchedCount === 1;
  }
  return false;
};

const releaseActiveSlot = (userId) =>
  User.updateOne({ _id: userId, activeCount: { $gt: 0 } }, { $inc: { activeCount: -1 } });

// Members register for themselves; an admin must name the target user.
const resolveTargetUser = async (req) => {
  if (req.user.role === "admin") {
    if (typeof req.body.user !== "string" || !/^[a-fA-F0-9]{24}$/.test(req.body.user)) {
      return { error: "Admin registration requires a valid user ID", status: 400 };
    }
    const target = await User.findById(req.body.user);
    if (!target) return { error: "User not found", status: 404 };
    return { userId: target.id };
  }
  return { userId: req.user.id };
};

exports.getRegistrations = async (req, res, next) => {
  try {
    const filter = req.user.role === "admin" ? {} : { user: req.user.id };
    const registrations = await populateRegistration(Registration.find(filter).sort({ createdAt: 1 }), req);
    res.status(200).json({ success: true, count: registrations.length, data: registrations });
  } catch (error) {
    next(error);
  }
};

exports.getRegistration = async (req, res, next) => {
  try {
    const registration = await populateRegistration(Registration.findById(req.params.id), req);
    if (!registration) return res.status(404).json({ success: false, error: "Registration not found" });
    if (req.user.role !== "admin" && registration.user._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: "Not authorized to view this registration" });
    }
    res.status(200).json({ success: true, data: registration });
  } catch (error) {
    next(error);
  }
};

exports.createRegistration = async (req, res, next) => {
  let reserved = { user: false, workshop: null };
  try {
    if (req.body.ignoreCapacity !== undefined && typeof req.body.ignoreCapacity !== "boolean") {
      return res.status(400).json({ success: false, error: "ignoreCapacity must be true or false" });
    }
    const ignoreCapacity = req.body.ignoreCapacity === true;
    if (ignoreCapacity && req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Only an admin can ignore capacity" });
    }
    const { userId, error: userError, status: userStatus } = await resolveTargetUser(req);
    if (userError) return res.status(userStatus).json({ success: false, error: userError });

    const validated = await validateRegistration({ workshopId: req.body.workshop, user: userId });
    if (validated.error) return res.status(validated.status).json({ success: false, error: validated.error });
    const { workshop, today } = validated;

    const activeSlot = await reserveActiveSlot(userId);
    if (!activeSlot) {
      return res.status(409).json({ success: false, error: "Member can have at most 3 active workshop registrations" });
    }
    reserved.user = true;
    // Duplicate, past-date, and 3-active rules always apply; only capacity can be ignored.
    const capacityOk = ignoreCapacity ? await forceCapacity(workshop) : await reserveCapacity(workshop);
    if (!capacityOk) {
      await releaseActiveSlot(userId);
      return res.status(409).json({ success: false, error: "Workshop capacity has been reached" });
    }
    reserved.workshop = workshop.id;

    const registration = await Registration.create({ workshop: workshop.id, user: userId });
    res.status(201).json({ success: true, data: await populateRegistration(Registration.findById(registration.id), req) });
  } catch (error) {
    // A concurrent duplicate can still trip the unique compound index.
    if (error.code === 11000) {
      if (reserved.user) await releaseActiveSlot(req.user.role === "admin" ? req.body.user : req.user.id);
      if (reserved.workshop) await releaseCapacity(reserved.workshop);
      return res.status(409).json({ success: false, error: "Member is already registered for this workshop" });
    }
    next(error);
  }
};

// Edit a registration: the note (owner member or admin) and attendance (admin).
// A registration cannot move to another workshop: delete it and register again.
const ATTENDANCE = ["registered", "attended", "no-show"];

exports.updateRegistration = async (req, res, next) => {
  try {
    const registration = await Registration.findById(req.params.id);
    if (!registration) return res.status(404).json({ success: false, error: "Registration not found" });
    const isAdmin = req.user.role === "admin";
    if (!isAdmin && registration.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: "Not authorized to edit this registration" });
    }
    if (req.body.workshop !== undefined) {
      return res.status(400).json({ success: false, error: "A registration cannot move to another workshop. Delete it and register again." });
    }

    const update = {};
    if (req.body.note !== undefined) {
      if (typeof req.body.note !== "string") return res.status(400).json({ success: false, error: "note must be text" });
      const note = req.body.note.trim();
      if (note.length > 300) return res.status(400).json({ success: false, error: "Note can be at most 300 characters" });
      update.note = note;
    }
    if (req.body.attendance !== undefined) {
      if (!isAdmin) return res.status(403).json({ success: false, error: "Only an admin can set attendance" });
      if (!ATTENDANCE.includes(req.body.attendance)) {
        return res.status(400).json({ success: false, error: "attendance must be registered, attended, or no-show" });
      }
      update.attendance = req.body.attendance;
    }
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, error: "Nothing to update: send note or attendance" });
    }

    const workshop = await Workshop.findById(registration.workshop.toString());
    const today = bangkokToday();
    // A member edits only an upcoming registration; an admin can edit any.
    if (!isAdmin && (!workshop || !workshop.isActive || workshop.workshopDate < today)) {
      return res.status(400).json({ success: false, error: "Cannot edit a registration after the workshop date" });
    }
    // Attendance is known only from the workshop day on.
    if (update.attendance !== undefined && update.attendance !== "registered" && workshop && workshop.workshopDate >= new Date(today.getTime() + 24 * 60 * 60 * 1000)) {
      return res.status(400).json({ success: false, error: "Attendance can be set from the workshop day on" });
    }

    await Registration.updateOne({ _id: registration.id }, update, { runValidators: true });
    res.status(200).json({ success: true, data: await populateRegistration(Registration.findById(registration.id), req) });
  } catch (error) {
    next(error);
  }
};

exports.deleteRegistration = async (req, res, next) => {
  try {
    const registration = await Registration.findById(req.params.id);
    if (!registration) return res.status(404).json({ success: false, error: "Registration not found" });
    if (req.user.role !== "admin" && registration.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: "Not authorized to delete this registration" });
    }
    const today = bangkokToday();
    const workshop = await Workshop.findById(registration.workshop.toString());
    await registration.deleteOne();
    await releaseCapacity(registration.workshop.toString());
    // Free the active slot only while the workshop is still active; a past
    // workshop's slot no longer counts in the live sense.
    if (workshop && workshop.isActive && isActiveOn(workshop.workshopDate, today)) {
      await releaseActiveSlot(registration.user.toString());
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
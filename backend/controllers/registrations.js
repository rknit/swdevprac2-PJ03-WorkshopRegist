const Registration = require("../models/Registration");
const Workshop = require("../models/Workshop");
const User = require("../models/User");
const { bangkokTodayStart } = require("../lib/dates");

// A user may hold at most this many registrations on still-active workshops.
const MAX_ACTIVE = 3;

const populateRegistration = (query) => query
  .populate("workshop", "name description instructor workshopDate startTime coverImage location capacity registeredCount isActive")
  .populate("user", "name email tel role");

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
const validateRegistration = async ({ workshopId, user, excludeId }) => {
  if (typeof workshopId !== "string" || !/^[a-fA-F0-9]{24}$/.test(workshopId)) {
    return { status: 400, error: "A valid workshop ID is required" };
  }
  const workshop = await Workshop.findOne({ _id: workshopId, isActive: true });
  if (!workshop) return { status: 404, error: "Workshop not found or inactive" };
  const today = bangkokToday();
  if (workshop.workshopDate < today) {
    return { status: 400, error: "Cannot register after the workshop date" };
  }
  const exclude = excludeId ? { _id: { $ne: excludeId } } : {};
  const duplicate = await Registration.findOne({ user, workshop: workshop.id, ...exclude });
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
    const registrations = await populateRegistration(Registration.find(filter).sort({ createdAt: 1 }));
    res.status(200).json({ success: true, count: registrations.length, data: registrations });
  } catch (error) {
    next(error);
  }
};

exports.getRegistration = async (req, res, next) => {
  try {
    const registration = await populateRegistration(Registration.findById(req.params.id));
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
    const capacityOk = await reserveCapacity(workshop);
    if (!capacityOk) {
      await releaseActiveSlot(userId);
      return res.status(409).json({ success: false, error: "Workshop capacity has been reached" });
    }
    reserved.workshop = workshop.id;

    const registration = await Registration.create({ workshop: workshop.id, user: userId });
    res.status(201).json({ success: true, data: await populateRegistration(Registration.findById(registration.id)) });
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

exports.updateRegistration = async (req, res, next) => {
  try {
    const registration = await Registration.findById(req.params.id);
    if (!registration) return res.status(404).json({ success: false, error: "Registration not found" });
    if (req.user.role !== "admin" && registration.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: "Not authorized to edit this registration" });
    }
    const workshopId = req.body.workshop === undefined ? registration.workshop.toString() : req.body.workshop;
    const today = bangkokToday();

    if (workshopId === registration.workshop.toString()) {
      // No-op edit: just re-check the current workshop is still registerable.
      const workshop = await Workshop.findById(registration.workshop.toString());
      if (!workshop || !workshop.isActive || workshop.workshopDate < today) {
        return res.status(400).json({ success: false, error: "Cannot register after the workshop date" });
      }
      return res.status(200).json({ success: true, data: await populateRegistration(Registration.findById(registration.id)) });
    }

    const validated = await validateRegistration({ workshopId, user: registration.user, excludeId: registration.id });
    if (validated.error) return res.status(validated.status).json({ success: false, error: validated.error });
    const { workshop } = validated;

    const oldWorkshop = await Workshop.findById(registration.workshop.toString());
    const oldActive = Boolean(oldWorkshop && oldWorkshop.isActive && isActiveOn(oldWorkshop.workshopDate, today));
    const newActive = Boolean(workshop.isActive && isActiveOn(workshop.workshopDate, today));

    // Moving from an inactive workshop to an active one takes a 3-active slot.
    if (newActive && !oldActive && !(await reserveActiveSlot(registration.user))) {
      return res.status(409).json({ success: false, error: "Member can have at most 3 active workshop registrations" });
    }
    // Moving from an active workshop to an inactive one frees the slot.
    if (oldActive && !newActive) await releaseActiveSlot(registration.user);

    let reserved = { user: false, workshop: null };
    try {
      const capacityOk = await reserveCapacity(workshop);
      if (!capacityOk) {
        // Undo the reservations made for this move.
        if (newActive && !oldActive) await releaseActiveSlot(registration.user);
        else if (oldActive && !newActive) await User.updateOne({ _id: registration.user }, { $inc: { activeCount: 1 } });
        return res.status(409).json({ success: false, error: "Workshop capacity has been reached" });
      }
      reserved = { user: newActive && !oldActive, workshop: workshop.id };

      const updated = await Registration.findByIdAndUpdate(
        req.params.id,
        { workshop: workshop.id },
        { new: true, runValidators: true },
      );
      await releaseCapacity(registration.workshop.toString());
      if (!updated) return res.status(404).json({ success: false, error: "Registration not found" });
      res.status(200).json({ success: true, data: await populateRegistration(Registration.findById(updated.id)) });
    } catch (error) {
      // Roll back the reservations so a failed move leaks no capacity or slots.
      if (reserved.user) await releaseActiveSlot(registration.user);
      if (reserved.workshop) await releaseCapacity(reserved.workshop);
      throw error;
    }
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, error: "Member is already registered for this workshop" });
    }
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
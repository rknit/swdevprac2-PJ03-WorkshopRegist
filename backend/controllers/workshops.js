const Workshop = require("../models/Workshop");
const Registration = require("../models/Registration");
const { bangkokTodayStart, parseWorkshopDate, parseStartTime } = require("../lib/dates");

// A user may hold at most this many registrations on still-active workshops.
const MAX_ACTIVE = 3;

const todayBkk = () => bangkokTodayStart();

const parseWorkshopInput = ({ workshopDate, startTime, capacity }) => {
  const parsed = parseWorkshopDate(workshopDate);
  if (parsed.error) return parsed;
  const today = todayBkk();
  if (parsed.date < today) return { error: "Workshop date cannot be in the past" };
  const time = parseStartTime(startTime);
  if (time.error) return time;
  if (!Number.isInteger(capacity) || capacity < 1) {
    return { error: "Capacity must be a positive integer" };
  }
  return { workshopDate: parsed.date, startTime: time.given ? time.startTime : null, capacity };
};

const workshopFields = ({ name, description, instructor, location }) => ({ name, description, instructor, location });

exports.getWorkshops = async (req, res, next) => {
  try {
    const filter = { isActive: true };
    if (req.query.search !== undefined) {
      if (typeof req.query.search !== "string") {
        return res.status(400).json({ success: false, error: "search must be a string" });
      }
      const search = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = ["name", "description", "instructor", "location"].map((field) => ({
        [field]: { $regex: search, $options: "i" },
      }));
    }
    const workshops = await Workshop.find(filter).sort({ workshopDate: 1, name: 1 });
    res.status(200).json({ success: true, count: workshops.length, data: workshops });
  } catch (error) {
    next(error);
  }
};

exports.getWorkshop = async (req, res, next) => {
  try {
    const workshop = await Workshop.findOne({ _id: req.params.id, isActive: true });
    if (!workshop) return res.status(404).json({ success: false, error: "Workshop not found" });
    res.status(200).json({ success: true, data: workshop });
  } catch (error) {
    next(error);
  }
};

exports.createWorkshop = async (req, res, next) => {
  try {
    const parsed = parseWorkshopInput(req.body);
    if (parsed.error) return res.status(400).json({ success: false, error: parsed.error });
    const workshop = await Workshop.create({ ...workshopFields(req.body), ...parsed });
    res.status(201).json({ success: true, data: workshop });
  } catch (error) {
    next(error);
  }
};

exports.updateWorkshop = async (req, res, next) => {
  try {
    const workshop = await Workshop.findOne({ _id: req.params.id, isActive: true });
    if (!workshop) return res.status(404).json({ success: false, error: "Workshop not found" });

    // Only validate a workshopDate the request actually provides: an admin
    // must be able to edit any other field of a past workshop (FIX-8).
    let dateChange = null;
    if (req.body.workshopDate !== undefined) {
      const parsed = parseWorkshopDate(req.body.workshopDate);
      if (parsed.error) return res.status(400).json({ success: false, error: parsed.error });
      if (parsed.date < todayBkk()) {
        return res.status(400).json({ success: false, error: "Workshop date cannot be in the past" });
      }
      dateChange = parsed.date;
    }
    const time = parseStartTime(req.body.startTime);
    if (time.error) return res.status(400).json({ success: false, error: time.error });
    let capacityChange = null;
    if (req.body.capacity !== undefined) {
      if (!Number.isInteger(req.body.capacity) || req.body.capacity < 1) {
        return res.status(400).json({ success: false, error: "Capacity must be a positive integer" });
      }
      capacityChange = req.body.capacity;
    }

    const fields = workshopFields(req.body);
    Object.keys(fields).forEach((key) => { if (fields[key] === undefined) delete fields[key]; });
    const update = { ...fields };
    if (dateChange) update.workshopDate = dateChange;
    if (time.given) update.startTime = time.startTime;
    if (capacityChange !== null) {
      // Atomic capacity floor: the reduction only succeeds while the workshop
      // still holds at most the new capacity.
      const result = await Workshop.updateOne(
        { _id: workshop.id, isActive: true, registeredCount: { $lte: capacityChange } },
        { capacity: capacityChange },
      );
      if (result.matchedCount === 0) {
        return res.status(409).json({ success: false, error: "Capacity cannot be less than existing registrations" });
      }
    }

    // If the change moves the workshop from past to future, its existing
    // registrations reactivate and count toward each member's 3-active limit.
    if (dateChange && workshop.workshopDate < todayBkk() && dateChange >= todayBkk()) {
      const members = await Registration.distinct("user", { workshop: workshop.id });
      for (const user of members) {
        const live = await liveActiveCountExcluding(user, workshop.id);
        if (live >= MAX_ACTIVE) {
          return res.status(409).json({ success: false, error: "Workshop change would exceed a member's active registration limit" });
        }
      }
    }

    const updated = await Workshop.findOneAndUpdate(
      { _id: workshop.id, isActive: true },
      update,
      { new: true, runValidators: true },
    );
    if (!updated) return res.status(404).json({ success: false, error: "Workshop not found" });
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// Live active registrations for a user, not counting the given workshop.
const liveActiveCountExcluding = async (userId, excludeWorkshopId) => {
  const today = todayBkk();
  const active = await Workshop.find({
    isActive: true,
    workshopDate: { $gte: today },
    _id: { $ne: excludeWorkshopId },
  }).lean();
  if (active.length === 0) return 0;
  const activeIds = active.map((item) => item._id);
  return Registration.countDocuments({ user: userId, workshop: { $in: activeIds } });
};

exports.deleteWorkshop = async (req, res, next) => {
  try {
    const workshop = await Workshop.findOneAndUpdate(
      { _id: req.params.id, isActive: true },
      { isActive: false },
      { new: true },
    );
    if (!workshop) return res.status(404).json({ success: false, error: "Workshop not found" });
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
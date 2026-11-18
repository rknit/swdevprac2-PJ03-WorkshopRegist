const User = require("../models/User");
const Workshop = require("../models/Workshop");
const Registration = require("../models/Registration");
const { bangkokTodayStart } = require("../lib/dates");

// List all users (admin only).
exports.listUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("name email tel role createdAt").sort({ createdAt: 1 }).lean();
    // Live count of each user's registrations on active workshops (today or
    // later, not deleted). This is the same rule as the 3-active limit.
    const active = await Workshop.find({ isActive: true, workshopDate: { $gte: bangkokTodayStart() } }).select("_id").lean();
    const counts = active.length === 0 ? [] : await Registration.aggregate([
      { $match: { workshop: { $in: active.map((item) => item._id) } } },
      { $group: { _id: "$user", count: { $sum: 1 } } },
    ]);
    const byUser = new Map(counts.map((row) => [String(row._id), row.count]));
    const data = users.map((user) => ({ ...user, activeSeats: byUser.get(String(user._id)) ?? 0 }));
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};

// Change one user's role (admin only). This is the only way an admin role is
// assigned or removed: the spec does not allow users to self-assign.
exports.setRole = async (req, res, next) => {
  try {
    if (typeof req.body.role !== "string" || !["member", "admin"].includes(req.body.role)) {
      return res.status(400).json({ success: false, error: "role must be 'member' or 'admin'" });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });
    user.role = req.body.role;
    await user.save();
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};
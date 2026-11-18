const User = require("../models/User");

// List all users (admin only).
exports.listUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("name email tel role createdAt").sort({ createdAt: 1 });
    res.status(200).json({ success: true, count: users.length, data: users });
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
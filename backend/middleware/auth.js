const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const RevokedToken = require("../models/RevokedToken");

exports.protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, error: "Not authorized to access this route" });
  }

  // A logged-out token must not work again.
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  try {
    const revoked = await RevokedToken.findOne({ tokenHash });
    if (revoked) {
      return res.status(401).json({ success: false, error: "Token has been revoked" });
    }
  } catch (error) {
    // A revocation-store outage must not lock everyone out of the API.
    console.error(`Revocation lookup failed: ${error.message}`);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) {
      return res.status(401).json({ success: false, error: "User no longer exists" });
    }
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: "Not authorized to access this route" });
  }
};

exports.authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: `User role ${req.user.role} is not authorized to access this route`,
    });
  }
  next();
};
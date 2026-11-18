const User = require("../models/User");
const RevokedToken = require("../models/RevokedToken");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();
  const options = {
    expires: new Date(Date.now() + Number(process.env.JWT_COOKIE_EXPIRE) * 24 * 60 * 60 * 1000),
    httpOnly: true,
  };
  if (process.env.NODE_ENV === "production") options.secure = true;

  res.status(statusCode).cookie("token", token, options).json({
    success: true,
    data: { id: user._id, name: user.name, email: user.email, role: user.role, token },
  });
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, tel, password } = req.body;
    // The client is never allowed to choose a role: new users are always members.
    const user = await User.create({ name, email, tel, password, role: "member" });
    sendTokenResponse(user, 201, res);
  } catch (error) {
    // The unique email index rejects a second account; say so plainly
    // instead of passing on the raw database message.
    if (error.code === 11000 && error.keyPattern && error.keyPattern.email) {
      return res.status(409).json({ success: false, error: "This email is already in use." });
    }
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Please provide an email and password" });
    }
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }
    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    // Revoke the bearer token server-side: it must not authenticate again.
    const token = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : null;
    if (token) {
      const decoded = jwt.decode(token);
      // Keep the revocation record only until the token expires on its own.
      const expiresAt = new Date((decoded?.exp ?? Math.floor(Date.now() / 1000) + 30 * 86400) * 1000);
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      await RevokedToken.updateOne(
        { tokenHash },
        { $setOnInsert: { tokenHash, expiresAt } },
        { upsert: true },
      );
    }
    res.cookie("token", "none", { expires: new Date(Date.now() + 10 * 1000), httpOnly: true });
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    // Logout is best-effort: clear the client-side state even if the store fails.
    res.status(200).json({ success: true, data: {} });
  }
};

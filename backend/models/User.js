const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: [true, "Please add a name"], trim: true },
  email: {
    type: String,
    required: [true, "Please add an email"],
    unique: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please add a valid email"],
  },
  tel: { type: String, required: [true, "Please add a telephone number"] },
  role: { type: String, enum: ["member", "admin"], default: "member" },
  // Number of the user's registrations on currently-active workshops.
  // Maintained by exact +1/-1 pairing in the registration controllers and
  // seeded by scripts/seed-counters.js; gates the 3-active limit.
  activeCount: { type: Number, default: 0, min: 0 },
  password: { type: String, required: [true, "Please add a password"], minLength: 6, select: false },
  createdAt: { type: Date, default: Date.now },
});

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

UserSchema.methods.matchPassword = function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);

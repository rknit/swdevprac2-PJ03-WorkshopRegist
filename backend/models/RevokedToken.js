const mongoose = require("mongoose");

// Server-side JWT revocation. A logged-out token's hash is stored here until
// the token's own expiry, so logout actually ends the session.
const RevokedTokenSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true },
  // The revoked token becomes worthless at its own expiry; document expires then.
  expiresAt: { type: Date, required: true, expires: 0 },
});

module.exports = mongoose.model("RevokedToken", RevokedTokenSchema);
const mongoose = require("mongoose");

const RegistrationSchema = new mongoose.Schema(
  {
    workshop: { type: mongoose.Schema.Types.ObjectId, ref: "Workshop", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Free-text note from the member or an admin, e.g. accessibility needs.
    note: { type: String, trim: true, default: "", maxlength: [300, "Note can be at most 300 characters"] },
    // Admin-only record of whether the member came. Hidden from member responses.
    attendance: { type: String, enum: ["registered", "attended", "no-show"], default: "registered" },
  },
  { timestamps: true }
);

// One registration per member per workshop, including concurrent duplicate requests.
RegistrationSchema.index({ user: 1, workshop: 1 }, { unique: true });

module.exports = mongoose.model("Registration", RegistrationSchema);

const mongoose = require("mongoose");

const WorkshopSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Please add a workshop name"], trim: true },
    description: { type: String, required: [true, "Please add a description"], trim: true },
    instructor: { type: String, required: [true, "Please add an instructor"], trim: true },
    workshopDate: { type: Date, required: [true, "Please add a workshop date"] },
    // Optional start time on the workshop day, "HH:mm" in Asia/Bangkok time.
    // It is kept apart from workshopDate so that every day-based rule
    // (no past dates, no registration after the workshop date) stays unchanged.
    startTime: {
      type: String,
      default: null,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, "Start time must use HH:mm (24-hour) format"],
    },
    location: { type: String, required: [true, "Please add a location"], trim: true },
    // Optional banner image for the workshop card and detail page: an http(s) URL.
    coverImage: {
      type: String,
      default: null,
      trim: true,
      maxlength: [2048, "Cover image URL is too long"],
      match: [/^https?:\/\/\S+$/i, "Cover image must be an http(s) URL"],
    },
    capacity: {
      type: Number,
      required: [true, "Please add a capacity"],
      min: [1, "Capacity must be at least 1"],
      validate: { validator: Number.isInteger, message: "Capacity must be an integer" },
    },
    // Number of live registrations, maintained atomically. It is the
    // race-safe gate for capacity (atomic conditional increment) and the
    // source of the "registered so far" total shown to everyone.
    registeredCount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Workshop", WorkshopSchema);

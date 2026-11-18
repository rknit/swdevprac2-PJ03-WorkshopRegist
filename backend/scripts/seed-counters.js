/**
 * Seed / reconcile the counters the atomic gates rely on:
 *   Workshop.registeredCount  = live registrations on the workshop
 *   User.activeCount          = live registrations on currently-active workshops
 *
 * Run once after deploying the counter schema:  node scripts/seed-counters.js
 * It is idempotent (it overwrites both fields from the source of truth).
 */
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", "config", "config.env") });
const mongoose = require("mongoose");
const dns = require("node:dns");
const User = require("../models/User");
const Workshop = require("../models/Workshop");
const Registration = require("../models/Registration");
const { bangkokTodayStart } = require("../lib/dates");

dns.setServers(["1.1.1.1", "8.8.8.8"]);

(async () => {
  if (!process.env.MONGO_URI) { console.error("MONGO_URI not set"); process.exit(1); }
  await mongoose.connect(process.env.MONGO_URI);
  const today = bangkokTodayStart();

  // Workshop.registeredCount from live registrations.
  const workshops = await Workshop.find({ isActive: true }).lean();
  for (const w of workshops) {
    const count = await Registration.countDocuments({ workshop: w._id });
    await Workshop.updateOne({ _id: w._id }, { registeredCount: count });
  }

  // User.activeCount from live registrations on active (future/today) workshops.
  const active = workshops.filter((w) => w.workshopDate >= today);
  const activeIds = active.map((w) => w._id);
  const users = await User.find().lean();
  for (const u of users) {
    const count = activeIds.length
      ? await Registration.countDocuments({ user: u._id, workshop: { $in: activeIds } })
      : 0;
    await User.updateOne({ _id: u._id }, { activeCount: count });
  }

  const summary = {
    workshops: workshops.map((w) => ({ name: w.name, registeredCount: w.registeredCount, capacity: w.capacity })),
    users: users.map((u) => ({ email: u.email, role: u.role, activeCount: u.activeCount })),
  };
  console.log(JSON.stringify(summary, null, 1));
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
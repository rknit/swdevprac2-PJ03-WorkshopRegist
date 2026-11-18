/**
 * Seed verification fixtures for the 8 acceptance checks.
 * Run: node scripts/setup-verification.js  (uses MONGO_URI from config/env)
 *
 * Creates:
 * - 3 extra member users (c2..c4@test.dev) to fill Alpha's capacity
 * - Alpha registrations for those 3 users (Alpha becomes 4/4)
 * - workshops: Beta (2026-12-15), Gamma (2026-12-18), Old (past: 2026-01-15)
 */
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", "config", "config.env") });
const mongoose = require("mongoose");
const dns = require("node:dns");
const User = require("../models/User");
const Workshop = require("../models/Workshop");
const Registration = require("../models/Registration");

dns.setServers(["1.1.1.1", "8.8.8.8"]);

(async () => {
  if (!process.env.MONGO_URI) { console.error("MONGO_URI not set"); process.exit(1); }
  await mongoose.connect(process.env.MONGO_URI);

  const mkUser = async (name, email) => {
    let u = await User.findOne({ email });
    if (!u) { u = await User.create({ name, email, tel: "0111111111", password: "secret123" }); }
    return u;
  };
  const c2 = await mkUser("Extra Two", "c2@test.dev");
  const c3 = await mkUser("Extra Three", "c3@test.dev");
  const c4 = await mkUser("Extra Four", "c4@test.dev");

  const mkWorkshop = async (name, dateStr) => {
    let w = await Workshop.findOne({ name });
    if (!w) { w = await Workshop.create({ name, description: "fixture " + name, instructor: "Fix", workshopDate: new Date(dateStr + "T00:00:00Z"), location: "FixHall", capacity: 5, isActive: true }); }
    return w;
  };
  const beta = await mkWorkshop("Beta", "2026-12-15");
  const gamma = await mkWorkshop("Gamma", "2026-12-18");
  const old = await mkWorkshop("Old", "2026-01-15");

  const alpha = await Workshop.findOne({ name: "Alpha" });
  if (!alpha) { console.error("Alpha not found — run the C4 steps first"); process.exit(1); }
  for (const u of [c2, c3, c4]) {
    const exists = await Registration.findOne({ user: u.id, workshop: alpha.id });
    if (!exists) await Registration.create({ user: u.id, workshop: alpha.id });
  }

  console.log(JSON.stringify({
    alpha: { id: alpha.id, capacity: alpha.capacity },
    alphaRegs: await Registration.countDocuments({ workshop: alpha.id }),
    beta: beta.id, gamma: gamma.id, old: old.id,
    users: [c2, c3, c4].map(u => ({ email: u.email, id: u.id })),
  }, null, 1));
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
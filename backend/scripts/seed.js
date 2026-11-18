/* Seed an admin user and test data into the throwaway Atlas cluster.
 * Run: node scripts/seed.js
 * Reads MONGO_URI from backend/config/config.env or env.
 */
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", "config", "config.env") });
const mongoose = require("mongoose");
const dns = require("node:dns");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

dns.setServers(["1.1.1.1", "8.8.8.8"]);

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@workshop.test";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "Admin123!";

(async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) { console.error("MONGO_URI not set"); process.exit(1); }
  await mongoose.connect(uri);
  console.log("connected:", mongoose.connection.host);

  const existing = await User.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    console.log("admin exists:", existing.email, existing.role);
  } else {
    const user = new User({ name: "Admin", email: ADMIN_EMAIL, tel: "123456789", password: ADMIN_PASSWORD, role: "admin" });
    await user.save();
    console.log("created admin:", user.email);
  }
  const counts = {
    users: await User.countDocuments(),
    workshops: await mongoose.connection.collection("workshops").countDocuments(),
    registrations: await mongoose.connection.collection("registrations").countDocuments(),
  };
  console.log("counts:", counts);
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
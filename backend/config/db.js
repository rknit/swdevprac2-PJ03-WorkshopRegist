const mongoose = require("mongoose");

let connectPromise = null;

function getDb() {
  if (!connectPromise) {
    mongoose.set("strictQuery", true);
    connectPromise = mongoose.connect(process.env.MONGO_URI, {
      // Fail fast with a real error instead of hanging on cold start,
      // so serverless surfaces the true network cause.
      serverSelectionTimeoutMS: Number(process.env.MONGO_SS_TIMEOUT_MS || 8000),
      connectTimeoutMS: Number(process.env.MONGO_CONNECT_TIMEOUT_MS || 8000),
    }).then((conn) => {
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return conn;
    });
    // A rejected promise is not sticky: allow a later attempt in a fresh process.
    connectPromise.catch((error) => {
      console.error(`MongoDB connection failed: ${error.name}: ${error.message}`);
      connectPromise = null;
    });
  }
  return connectPromise;
}

module.exports = getDb;
const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;
  const databaseName = process.env.DATABASE_NAME;

  if (!mongoUri) {
    throw new Error("MONGO_URI is not configured");
  }

  if (!databaseName) {
    throw new Error("DATABASE_NAME is not configured");
  }

  try {
    await mongoose.connect(mongoUri, {
      dbName: databaseName,
    });

    console.log("MongoDB Atlas connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    throw error;
  }
};

module.exports = connectDB;
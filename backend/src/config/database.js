import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectToDB = async () => {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
        throw new Error("Mongo URI is not defined in env");
    }

    try {
        await mongoose.connect(mongoUri);
        console.log("MongoDB connected successfully");
    } catch (err) {
        console.error("MongoDB connection failed", err);
        throw err;
    }
};

export default connectToDB;

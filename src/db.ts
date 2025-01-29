import mongoose from "mongoose";
import dotenv from "dotenv";
import { appLogger } from "./logger";

dotenv.config();
console.log("MongoDB URI:", process.env.MONGODB_URI);


const MONGODB_URI = process.env.MONGODB_URI ?? "";

export const connectDB = async (): Promise<void> => {
    try {
        await mongoose.connect(MONGODB_URI);
        appLogger.debug("Successfully connected to MongoDB.");
    } catch (error) {
        appLogger.error("Error connecting to MongoDB:", error);
        process.exit(1);
    }

    mongoose.connection.on("error", (err) => {
        appLogger.error("MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
        appLogger.debug("MongoDB disconnected");
    });

    process.on("SIGINT", async () => {
        try {
            await mongoose.connection.close();
            appLogger.debug("MongoDB connection closed through app termination");
            process.exit(0);
        } catch (err) {
            appLogger.error("Error during MongoDB disconnection:", err);
            process.exit(1);
        }
    });
};

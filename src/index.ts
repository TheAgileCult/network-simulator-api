import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import { connectDB } from "./db";
import transactionRoutes from "./routes/transactions";
import { appLogger } from "./logger";

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/transactions", transactionRoutes);

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    appLogger.error(err.stack);
    res.status(500).json({
        success: false,
        message: "Internal server error"
    });
});

// Start server
const startServer = async () => {
    try {
        await connectDB();
        
        app.listen(port, () => {
            appLogger.debug(`Server is running on port ${port}`);
        });
    } catch (error) {
        appLogger.error("Error starting server:", error);
        process.exit(1);
    }
};

startServer(); 

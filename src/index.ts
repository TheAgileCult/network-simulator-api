import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import { connectDB } from "./db";
import transactionRoutes from "./routes/transactions";
import { appLogger } from "./logger";
import { NetworkType } from "./enums";

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const networkType = process.env.NETWORK_TYPE as NetworkType;

// Validate network type
if (!networkType || !Object.values(NetworkType).includes(networkType)) {
    appLogger.error("Invalid or missing NETWORK_TYPE environment variable");
    process.exit(1);
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes - mount the transaction routes under the network-specific path
app.use(`/${networkType.toLowerCase()}`, transactionRoutes);

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
    res.json({ 
        status: "ok",
        network: networkType,
        timestamp: new Date().toISOString()
    });
});

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
            appLogger.info(`${networkType} Network running on port ${port}`);
        });
    } catch (error) {
        appLogger.error("Error starting server:", error);
        process.exit(1);
    }
};

startServer(); 

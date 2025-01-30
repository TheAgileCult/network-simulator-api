import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import { connectDB } from "./db";
import transactionRoutes from "./routes/transactions";
import accountRoutes from "./routes/accounts";
import { appLogger } from "./logger";
import { NetworkType } from "./enums";
import { updateRates } from "./scripts/update-rates";
import { authCheck } from "./middleware/authCheck";

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
app.use(`/${networkType.toLowerCase()}/transactions`, transactionRoutes);
app.use(authCheck);
app.use(`/${networkType.toLowerCase()}/users`, accountRoutes);

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
        message: "Internal server error",
    });
});

// Start server
const startServer = async () => {
    try {
        await connectDB();
        await updateRates();

        app.listen(port, () => {
            appLogger.debug(`Server is running on port ${port}`);
        });
    } catch (error) {
        appLogger.error("Error starting server:", error);
        process.exit(1);
    }
};

startServer();

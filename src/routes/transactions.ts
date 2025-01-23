import { Router, Request, Response } from "express";
import { TransactionService } from "../services/transactions";

const router = Router();

// Login route
router.post("/login", async (req: Request, res: Response): Promise<void> => {
    try {
        const { cardNumber, pin } = req.body;
        if (!cardNumber || !pin) {
            res.status(400).json({
                success: false,
                message: "Card number and PIN are required"
            });
            return;
        }

        console.log("Login request received", { cardNumber });

        const result = await TransactionService.login(
            cardNumber,
            pin
        );

        res.status(result.success ? 200 : 401).json(result);
    } catch (error) {
        console.error("Error in login route:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

export default router; 

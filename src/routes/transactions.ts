import { Router, Request, Response } from "express";
import { TransactionService } from "../services/transactions";
import { appLogger } from "../logger";
import { AuthenticatedRequest } from "../@types/auth";
import { authCheck } from "../middleware/authCheck";
import { errorLogger, transactionLogger } from "../logger";
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

        appLogger.debug("Login request received", { cardNumber });

        const result = await TransactionService.login(
            cardNumber,
            pin
        );

        res.status(result.success ? 200 : 401).json(result);
    } catch (error) {
        appLogger.error("Error in login route:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

// Route to process withdrawal (protected)
router.post("/withdraw", authCheck, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { accountNumber, amount } = req.body;
        const cardNumber = req.user?.cardNumber;
        
        if (!amount || isNaN(amount)) {
            res.status(400).json({
                success: false,
                message: "Valid withdrawal amount is required"
            });
            return;
        }

        if (!accountNumber) {
            res.status(400).json({
                success: false,
                message: "Account number is required"
            });
            return;
        }

        transactionLogger.info("Withdrawal request received", { 
            accountNumber,
            cardNumber,
            amount 
        });
        
        const result = await TransactionService.withdraw(
            cardNumber!,
            accountNumber,
            parseFloat(amount)
        );
        
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        errorLogger.error("Error in withdrawal route:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});


export default router; 

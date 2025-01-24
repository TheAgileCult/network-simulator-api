import { Router, Request, Response } from "express";
import { TransactionService } from "../services/transactions";
import { authCheck } from "../middleware/authCheck";
import { transactionLogger, errorLogger } from "../logger";
import { TransactionType } from "../logger";

const router = Router();

// Extend Request type with our custom types
interface ExtendedAuthRequest extends Request {
    body: AuthRequest;
}

interface ExtendedWithdrawalRequest extends AuthenticatedRequest {
    body: WithdrawalRequest;
}

interface ExtendedBalanceRequest extends AuthenticatedRequest {
    body: BalanceRequest;
}

// Verify PIN and authenticate
router.post("/auth", async (req: ExtendedAuthRequest, res: Response): Promise<void> => {
    const { cardNumber, pin, atmId, transactionId, expiryDate } = req.body;

    transactionLogger.info("Authentication request received", {
        cardNumber,
        atmId,
        transactionId,
        expiryDate,
        transactionType: TransactionType.AUTH
    });

    try {
        const result = await TransactionService.login(cardNumber, pin);
        
        if (!result.success) {
            transactionLogger.error("Authentication failed", {
                cardNumber,
                atmId,
                transactionId,
                reason: result.message,
                transactionType: TransactionType.AUTH
            });
            errorLogger.error("Authentication failed", {
                cardNumber,
                atmId,
                transactionId,
                reason: result.message
            });
            
            res.status(401).json(result);
            return;
        }

        transactionLogger.info("Authentication successful", {
            cardNumber,
            atmId,
            transactionId,
            customerId: result.data?.customer.id,
            transactionType: TransactionType.AUTH
        });

        res.json(result);
    } catch (error) {
        const errorMsg = "Internal server error during authentication";
        transactionLogger.error(errorMsg, {
            cardNumber,
            atmId,
            transactionId,
            error: error instanceof Error ? error.message : "Unknown error",
            transactionType: TransactionType.AUTH
        });
        errorLogger.error(errorMsg, {
            cardNumber,
            atmId,
            transactionId,
            error: error instanceof Error ? error.message : "Unknown error"
        });
        
        res.status(500).json({
            success: false,
            message: errorMsg
        });
    }
});

// Withdraw funds
router.post("/withdraw", authCheck, async (req: ExtendedWithdrawalRequest, res: Response): Promise<void> => {
    const { amount, accountType, currency, atmId, transactionId } = req.body;
    const { customer, newToken } = req;
    const cardNumber = customer.cards[0].cardNumber;

    transactionLogger.info("Withdrawal request received", {
        cardNumber,
        atmId,
        transactionId,
        amount,
        currency,
        accountType,
        transactionType: TransactionType.WITHDRAWAL
    });

    try {
        const result = await TransactionService.withdraw(
            cardNumber,
            accountType,
            amount,
            customer
        );

        if (!result.success) {
            transactionLogger.error("Withdrawal failed", {
                cardNumber,
                atmId,
                transactionId,
                amount,
                currency,
                accountType,
                reason: result.message,
                transactionType: TransactionType.WITHDRAWAL
            });
            errorLogger.error("Withdrawal failed", {
                cardNumber,
                atmId,
                transactionId,
                amount,
                currency,
                accountType,
                reason: result.message
            });
            
            res.status(400).json(result);
            return;
        }

        transactionLogger.info("Withdrawal successful", {
            cardNumber,
            atmId,
            transactionId,
            amount,
            currency,
            accountType,
            remainingBalance: result.data?.remainingBalance,
            transactionType: TransactionType.WITHDRAWAL
        });

        res.json({
            ...result,
            data: {
                ...result.data,
                token: newToken
            }
        });
    } catch (error) {
        const errorMsg = "Internal server error during withdrawal";
        transactionLogger.error(errorMsg, {
            cardNumber,
            atmId,
            transactionId,
            amount,
            accountType,
            error: error instanceof Error ? error.message : "Unknown error",
            transactionType: TransactionType.WITHDRAWAL
        });
        errorLogger.error(errorMsg, {
            cardNumber,
            atmId,
            transactionId,
            amount,
            accountType,
            error: error instanceof Error ? error.message : "Unknown error"
        });
        
        res.status(500).json({
            success: false,
            message: errorMsg
        });
    }
});

// Check balance
router.post("/balance", authCheck, async (req: ExtendedBalanceRequest, res: Response): Promise<void> => {
    const { accountType, atmId, transactionId } = req.body;
    const { customer, newToken } = req;
    const cardNumber = customer.cards[0].cardNumber;

    transactionLogger.info("Balance check request received", {
        cardNumber,
        atmId,
        transactionId,
        accountType,
        transactionType: TransactionType.BALANCE
    });

    try {
        const result = await TransactionService.checkBalance(
            cardNumber,
            accountType,
            customer
        );

        if (!result.success) {
            transactionLogger.error("Balance check failed", {
                cardNumber,
                atmId,
                transactionId,
                accountType,
                reason: result.message,
                transactionType: TransactionType.BALANCE
            });
            errorLogger.error("Balance check failed", {
                cardNumber,
                atmId,
                transactionId,
                accountType,
                reason: result.message
            });
            
            res.status(400).json(result);
            return;
        }

        transactionLogger.info("Balance check successful", {
            cardNumber,
            atmId,
            transactionId,
            accountType,
            balance: result.data?.balance,
            transactionType: TransactionType.BALANCE
        });

        res.json({
            ...result,
            data: {
                ...result.data,
                token: newToken
            }
        });
    } catch (error) {
        const errorMsg = "Internal server error during balance check";
        transactionLogger.error(errorMsg, {
            cardNumber,
            atmId,
            transactionId,
            accountType,
            error: error instanceof Error ? error.message : "Unknown error",
            transactionType: TransactionType.BALANCE
        });
        errorLogger.error(errorMsg, {
            cardNumber,
            atmId,
            transactionId,
            accountType,
            error: error instanceof Error ? error.message : "Unknown error"
        });
        
        res.status(500).json({
            success: false,
            message: errorMsg
        });
    }
});

export default router; 

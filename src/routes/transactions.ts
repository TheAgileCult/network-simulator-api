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

interface ExtendedDepositRequest extends AuthenticatedRequest {
    body: DepositRequest;
}

// Verify PIN and authenticate
router.post("/auth", async (req: ExtendedAuthRequest, res: Response): Promise<void> => {
    const { cardNumber, pin, atmId, transactionId, expiryDate } = req.body;

    transactionLogger.info("Authentication request received", {
        transactionId,
        cardNumber,
        expiryDate,
        atmId,
        transactionType: TransactionType.AUTH
    });

    try {
        const result = await TransactionService.login(cardNumber, pin, atmId);
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
            transactionId,
            cardNumber,
            expiryDate,
            atmId,
            transactionType: TransactionType.AUTH,
            customerId: result.data?.customer.id,
            atmLocation: result.data?.atm.location,
            atmCurrency: result.data?.atm.currency
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
        transactionId,
        cardNumber,
        atmId,
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
            customer,
            atmId
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
            transactionId,
            cardNumber,
            atmId,
            amount,
            currency,
            accountType,
            atmLocation: result.data?.atmLocation,
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
        transactionId,
        cardNumber,
        atmId,
        accountType,
        transactionType: TransactionType.BALANCE
    });

    try {
        const result = await TransactionService.checkBalance(
            cardNumber,
            accountType,
            customer,
            atmId
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
            transactionType: TransactionType.BALANCE,
            atmLocation: result.data?.atm.location,
            currency: result.data?.atm.currency
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

// Deposit funds
router.post("/deposit", authCheck, async (req: ExtendedDepositRequest, res: Response): Promise<void> => {
    const { amount, currency, atmId, transactionId } = req.body;
    const { customer, newToken } = req;
    const cardNumber = customer.cards[0].cardNumber;

    transactionLogger.info("Deposit request received", {
        transactionId,
        cardNumber,
        atmId,
        amount,
        currency,
        transactionType: TransactionType.DEPOSIT
    });

    try {
        const result = await TransactionService.deposit(
            cardNumber,
            amount,
            customer,
            atmId
        );
        if (!result.success) {
            transactionLogger.error("Deposit failed", {
                cardNumber,
                atmId,
                transactionId,
                amount,
                currency,
                reason: result.message,
                transactionType: TransactionType.DEPOSIT
            });
            errorLogger.error("Deposit failed", {
                cardNumber,
                atmId,
                transactionId,
                amount,
                currency,
                reason: result.message
            });
            
            res.status(400).json(result);
            return;
        }

        transactionLogger.info("Deposit successful", {
            transactionId,
            cardNumber,
            atmId,
            amount,
            currency,
            atmLocation: result.data?.atm.location,
            remainingBalance: result.data?.remainingBalance,
            transactionType: TransactionType.DEPOSIT
        });

        res.json({
            ...result,
            data: {
                ...result.data,
                token: newToken
            }
        });
    } catch (error) {
        const errorMsg = "Internal server error during deposit";
        transactionLogger.error(errorMsg, {
            cardNumber,
            atmId,
            transactionId,
            amount,
            error: error instanceof Error ? error.message : "Unknown error",
            transactionType: TransactionType.DEPOSIT
        });
        errorLogger.error(errorMsg, {
            cardNumber,
            atmId,
            transactionId,
            amount,
            error: error instanceof Error ? error.message : "Unknown error"
        });
        
        res.status(500).json({
            success: false,
            message: errorMsg
        });
    }
});

export default router;

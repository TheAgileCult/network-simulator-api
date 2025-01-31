import { Router, Response } from "express";
import { errorLogger, transactionLogger  } from "../logger";
import { AccountService } from "../services/accounts";

const router = Router();

router.get(
    "/accountType/:currency",
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const { currency } = req.params;

        try {
            const result = await AccountService.getAccountTypesByCurrency(req.customer._id, currency);
            if (!result.success) {
                res.status(404).json(result);
                return;
            }

            transactionLogger.info("Successfully retrieved account types by currency", {
                userId: req.customer._id,
                currency,
                accountCount: result.data?.length ?? 0,
            });
            res.json(result);
        } catch (error) {
            const errorMsg = "Internal server error during account types retrieval";
            errorLogger.error(errorMsg, {
                currency,
                error: error instanceof Error ? error.message : "Unknown error",
            });
            res.status(500).json({
                success: false,
                message: errorMsg
            });
        }
    }
);

router.get(
    "/currency",
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const result = await AccountService.getUserCurrencies(req.customer._id);
            if (!result.success) {
                res.status(404).json(result);
                return;
            }

            transactionLogger.info("Successfully retrieved user currencies", {
                userId: req.customer._id,
                currencyCount: result.data?.length ?? 0,
            });
            res.json(result);
        } catch (error) {
            const errorMsg = "Internal server error during currencies retrieval";
            errorLogger.error(errorMsg, {
                userId: req.customer._id,
                error: error instanceof Error ? error.message : "Unknown error",
            });
            res.status(500).json({
                success: false,
                message: errorMsg
            });
        }
    }
);

export default router;

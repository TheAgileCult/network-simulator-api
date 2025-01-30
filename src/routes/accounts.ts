import { Router, Response } from "express";
import { authCheck } from "../middleware/authCheck";
import { appLogger, errorLogger } from "../logger";
import CustomerRepository from "../repositories/customers";

const router = Router();

router.get(
  "/:userId/accountType/:currency",
  authCheck,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { userId, currency } = req.params;

    try {
      const customer = await CustomerRepository.findCustomerById(userId);

      if (!customer) {
        errorLogger.error("Customer not found", {
          userId,
          currency,
        });
        res.status(404).json({
          success: false,
          message: "Customer not found",
        });
        return;
      }

      // Filter accounts by currency and map to account types
      const accountTypes = customer.accounts
        .filter((account: IAccount) => account.currency === currency)
        .map((account: IAccount) => ({
          accountType: account.accountType,
          accountId: account.accountNumber,
          balance: account.balance,
        }));

      if (accountTypes.length === 0) {
        appLogger.info("No accounts found for specified currency", {
          userId,
          currency,
        });
        res.status(404).json({
          success: false,
          message: `No accounts found with currency ${currency}`,
        });
        return;
      }

      appLogger.info("Successfully retrieved account types by currency", {
        userId,
        currency,
        accountCount: accountTypes.length,
      });

      res.json({
        success: true,
        data: accountTypes,
      });
    } catch (error) {
      errorLogger.error("Error retrieving account types", {
        userId,
        currency,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      res.status(500).json({
        success: false,
        message: "Error retrieving account types",
      });
    }
  }
);

router.get(
  "/:userId/currency",
  authCheck,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { userId } = req.params;

    try {
      const customer = await CustomerRepository.findCustomerById(userId);

      if (!customer) {
        errorLogger.error("Customer not found", {
          userId,
        });
        res.status(404).json({
          success: false,
          message: "Customer not found",
        });
        return;
      }

      // Get unique currencies from all accounts
      const uniqueCurrencies = [
        ...new Set(
          customer.accounts.map((account: IAccount) => account.currency)
        ),
      ];

      appLogger.info("Successfully retrieved user currencies", {
        userId,
        currencyCount: uniqueCurrencies.length,
      });

      res.json({
        success: true,
        data: uniqueCurrencies,
      });
    } catch (error) {
      errorLogger.error("Error retrieving user currencies", {
        userId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      res.status(500).json({
        success: false,
        message: "Error retrieving currencies",
      });
    }
  }
);

export default router;
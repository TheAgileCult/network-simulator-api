import { Router, Response } from "express";
import { authCheck } from "../middleware/authCheck";
import { appLogger, errorLogger } from "../logger";
import CustomerRepository from "../repositories/customers";

const router = Router();

router.get(
  "/:userId/accounts",
  authCheck,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { userId } = req.params;

    try {
      const customer = await CustomerRepository.findCustomerById(userId);

      if (!customer) {
        errorLogger.error("Customer not found", {
          userId
        });
        res.status(404).json({
          success: false,
          message: "Customer not found"
        });
        return;
      }

      const accounts = customer.accounts.map((account: IAccount) => ({
        accountId: account.accountNumber,
        accountType: account.accountType,
        balance: account.balance,
        currency: account.currency,
      }));

      appLogger.info("Successfully retrieved user accounts", {
        userId,
        accountCount: accounts.length,
      });

      res.json({
        success: true,
        data: accounts,
      });
    } catch (error) {
      errorLogger.error("Error retrieving user accounts", {
        userId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      res.status(500).json({
        success: false,
        message: "Error retrieving accounts",
      });
    }
  }
);

export default router;

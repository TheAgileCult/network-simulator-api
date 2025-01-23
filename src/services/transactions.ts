import { Customer } from "../models/customers";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { appLogger } from "../logger";
import { transactionLogger, errorLogger } from "../logger";
import { LoginResultData, TransactionResult, WithdrawalResultData } from "../@types/transactions";


const JWT_SECRET = process.env.JWT_SECRET || "default-secret-key";
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || "1h";

export class TransactionService {
  private static WITHDRAWAL_LIMIT = 1000;
  
  static async login(
    cardNumber: string,
    pin: string
  ): Promise<TransactionResult<LoginResultData>> {
    try {
      appLogger.debug("Login attempt initiated", { cardNumber });

      const customer = await Customer.findOne({
        "cards.cardNumber": cardNumber,
      });

      if (!customer) {
        appLogger.error("Login failed: Card not found", { cardNumber });
        return {
          success: false,
          message: "Card not found",
        };
      }

      const card = customer.cards.find((c) => c.cardNumber === cardNumber);

      if (!card) {
        appLogger.error("Login failed: Card not found in customer record", {
          cardNumber,
        });
        return {
          success: false,
          message: "Card not found",
        };
      }

      if (card.isBlocked) {
        appLogger.error("Login failed: Card is blocked", { cardNumber });
        return {
          success: false,
          message: "Card is blocked",
        };
      }

      if (card.expiryDate < new Date()) {
        appLogger.error("Login failed: Card is expired", { cardNumber });
        return {
          success: false,
          message: "Card is expired",
        };
      }

      const isValid = await customer.validatePin(cardNumber, pin);
      if (!isValid) {
        appLogger.error("Login failed: Invalid PIN", { cardNumber });
        return {
          success: false,
          message: "Invalid PIN",
        };
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          cardNumber,
          customerId: customer._id,
          cardType: card.cardType,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRATION }
      );

      // Update last used timestamp
      card.lastUsed = new Date();
      await customer.save();

      appLogger.debug("Login successful", {
        cardNumber,
        customerId: customer._id,
      });

      return {
        success: true,
        message: "Login successful",
        data: {
          token,
          customer: {
            id: (customer._id as Types.ObjectId).toString(),
            firstName: customer.firstName,
            lastName: customer.lastName,
            cardType: card.cardType,
          },
        },
      };
    } catch (error) {
      appLogger.error("Error during login:", error);
      return {
        success: false,
        message: "Error processing login request",
      };
    }
  }

  private static verifyToken(token: string): {
    valid: boolean;
    expired?: boolean;
    decoded?: any;
  } {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return { valid: true, decoded };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return { valid: false, expired: true };
      }
      return { valid: false };
    }
  }

  static async withdraw(
    cardNumber: string,
    accountNumber: string,
    amount: number,
    token?: string
  ): Promise<TransactionResult<WithdrawalResultData>> {
    try {
      // Verify and decode the token
      const tokenStatus = this.verifyToken(token || "");
      if (!token || !tokenStatus.valid) {
        return {
          success: false,
          message: tokenStatus.expired
            ? "Session expired - please login again"
            : "Authentication failed - please login again",
        };
      }

      // Validate withdrawal amount
      if (!this.isValidWithdrawalAmount(amount)) {
        errorLogger.error("Invalid withdrawal amount", {
          cardNumber,
          amount,
        });
        return {
          success: false,
          message: "Invalid withdrawal amount",
        };
      }

      // Find the customer
      const customer = await Customer.findOne({
        "cards.cardNumber": cardNumber,
      });

      if (!customer) {
        errorLogger.error("Customer not found", { cardNumber });
        return {
          success: false,
          message: "Customer not found",
        };
      }

      // Find the account
      const account = customer.accounts.find(
        (acc) => acc.accountNumber === accountNumber
      );

      if (!account) {
        errorLogger.error("Account not found", { accountNumber });
        return {
          success: false,
          message: "Account not found",
        };
      }

      // Check sufficient balance
      if (account.balance < amount) {
        errorLogger.error("Insufficient funds", {
          cardNumber,
          accountNumber,
          requested: amount,
          available: account.balance,
        });
        return {
          success: false,
          message: "Insufficient funds",
        };
      }

      // Process withdrawal
      account.balance -= amount;
      await customer.save();

      // Create new token for refresh
      const newToken = jwt.sign(
        {
          cardNumber,
          customerId: customer._id,
          cardType: customer.cards.find((c) => c.cardNumber === cardNumber)
            ?.cardType,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRATION }
      );

      transactionLogger.info("Withdrawal processed successfully", {
        cardNumber,
        accountNumber,
        amount,
        newBalance: account.balance,
      });

      return {
        success: true,
        message: "Withdrawal successful",
        data: {
          withdrawnAmount: amount,
          remainingBalance: account.balance,
          token: newToken, // Include the refreshed token
        },
      };
    } catch (error) {
      errorLogger.error("Error processing withdrawal:", error);
      return {
        success: false,
        message: "Error processing withdrawal",
      };
    }
  }

  private static isValidWithdrawalAmount(amount: number): boolean {
    return amount > 0 && amount <= this.WITHDRAWAL_LIMIT;
  }
} 

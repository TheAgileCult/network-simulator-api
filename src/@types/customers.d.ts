import { Document } from "mongoose";

declare global {
    interface ICard {
        cardNumber: string;
        expiryDate: Date;
        pin: string;
        dailyWithdrawalLimit: number;
        isBlocked: boolean;
        lastUsed: Date;
    }

    interface IAccount {
      accountNumber: string;
      accountType: "checking" | "savings" | "credit" | "loan";
      balance: number;
      currency: "USD" | "EUR" | "GBP";
      isActive: boolean;
      lastTransaction: Date;
      exchangeRates?: Map<string, number>;
      lastRateUpdate?: Date;
    }

    interface ITransaction {
        transactionId: string;
        type: "withdrawal" | "deposit" | "payment" | "inquiry";
        amount?: number;
        currency?: string;
        timestamp: Date;
        status: "pending" | "completed" | "failed";
        atmId: string;
    }

    interface ICustomer extends Document {
        firstName: string;
        lastName: string;
        dateOfBirth: Date;
        address: string;
        accounts: IAccount[];
        cards: ICard[];
        transactions: ITransaction[];
        createdAt: Date;
        updatedAt: Date;
        validatePin(cardNumber: string, pin: string): Promise<boolean>;
    }
}

export {}; 

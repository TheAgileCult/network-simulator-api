import { Document } from "mongoose";

declare global {
    interface ICard {
        cardNumber: string;
        expiryDate: Date;
        pin: string;
        cardType: "debit" | "credit";
        cvv: string;
        dailyWithdrawalLimit: number;
        isBlocked: boolean;
        lastUsed: Date;
    }

    interface IAccount {
        accountNumber: string;
        accountType: "checking" | "savings" | "credit" | "loan";
        balance: number;
        currency: string;
        interestRate?: number;
        creditLimit?: number;
        loanAmount?: number;
        loanStartDate?: Date;
        loanEndDate?: Date;
        minimumBalance: number;
        isActive: boolean;
        lastTransaction: Date;
    }

    interface ITransaction {
        transactionId: string;
        type: "withdrawal" | "deposit" | "transfer" | "payment";
        amount: number;
        currency: string;
        timestamp: Date;
        status: "pending" | "completed" | "failed";
        description?: string;
        location?: string;
    }

    interface ICustomer extends Document {
        firstName: string;
        lastName: string;
        dateOfBirth: Date;
        email: string;
        phoneNumber: string;
        address: string;
        accounts: IAccount[];
        cards: ICard[];
        transactions: ITransaction[];
        createdAt: Date;
        updatedAt: Date;
        identificationNumber: string;
        nationality: string;
        employmentStatus: string;
        annualIncome: number;
        creditScore: number;
        isBlacklisted: boolean;
        preferredLanguage: string;
        validatePin(cardNumber: string, pin: string): Promise<boolean>;
    }
}

export {}; 

declare global {
    type ITransactionResponse = "NO_TOKEN_PROVIDED" | "AUTH_FAILED" | "WITHDRAWAL_FAILED" | "DEPOSIT_FAILED" | "BALANCE_FAILED";

    interface BaseTransactionRequest {
        transactionId: string;
        cardNumber: string;
        atmId: string;
        pin: string;
        expiryDate: string;
    }

    interface WithdrawalRequest extends BaseTransactionRequest {
        amount: number;
        currency: string;
        accountType: AccountType;
    }

    interface AuthRequest extends BaseTransactionRequest {
        pin: string;
    }

    interface BalanceRequest extends BaseTransactionRequest {
        accountType: AccountType;
    }

    interface DepositRequest extends BaseTransactionRequest {
        amount: number;
        currency: string;
    }

    interface TransactionResult<T = unknown> {
        success: boolean;
        message: string;
        data?: T;
        code?: ITransactionResponse;
    }

    interface CustomerData {
        id: string;
        firstName: string;
        lastName: string;
    }

    interface LoginResultData {
        token: string;
        customer: CustomerData;
        atm: {
            location: string;
            currency: string;
        }
    }

    interface BalanceResultData {
        balance: number;
        accountType: string;
        token: string;
        currency: string;
        atm: {
            location: string;
            currency: string;
        }
    }

    interface WithdrawalResultData {
        withdrawnAmount: number;
        remainingBalance: number;
        token: string;
        currency: string;
        atmLocation: string;
    }

    interface IATM {
        atmId: string;
        location: string;
        supportedCurrency: string;
        availableCash: number;
        lastUsed: Date;
    }

    interface DepositResultData {
        depositedAmount: number;
        remainingBalance: number;
        currency: string;
        token: string;
        atm: {
            location: string;
            currency: string;
        }
    }
}

export {};

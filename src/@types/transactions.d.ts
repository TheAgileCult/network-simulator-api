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
        accountType: string;
    }

    interface AuthRequest extends BaseTransactionRequest {
        pin: string;
    }

    interface BalanceRequest extends BaseTransactionRequest {
        accountType: string;
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
    }

    interface WithdrawalResultData {
      withdrawnAmount: number;
      convertedAmount: number;
      fee: number;
      totalDeduction: number;
      accountCurrency: string;
      remainingBalance: number;
      token: string;
      Atmcurrency: string;
    }

    interface IATM {
        atmId: string;
        location: string;
        supportedCurrency: string;
        availableCash: number;
        lastUsed: Date;
    }

}

export {};

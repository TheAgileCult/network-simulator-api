export interface TransactionResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export interface CustomerData {
  id: string;
  firstName: string;
  lastName: string;
  cardType: string;
}

export interface LoginResultData {
  token: string;
  customer: CustomerData;
}

export interface BalanceResultData {
  balance: number;
  accountType: string;
  token: string;
}


interface TransactionResult<T = unknown> {
    success: boolean;
    message: string;
    data?: T;
}

interface CustomerData {
    id: string;
    firstName: string;
    lastName: string;
    cardType: string;
}

interface LoginResultData {
    token: string;
    customer: CustomerData;
}

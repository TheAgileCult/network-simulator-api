export enum TransactionResponse {
    // Authentication related
    AUTH_FAILED = "AUTH_FAILED",
    NO_TOKEN_PROVIDED = "NO_TOKEN_PROVIDED",
    TOKEN_EXPIRED = "TOKEN_EXPIRED",
    INVALID_TOKEN = "INVALID_TOKEN",

    // Transaction related
    WITHDRAWAL_FAILED = "WITHDRAWAL_FAILED",
    INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS",
    INVALID_AMOUNT = "INVALID_AMOUNT",
    DAILY_LIMIT_EXCEEDED = "DAILY_LIMIT_EXCEEDED",

    // Account related
    DEPOSIT_FAILED = "DEPOSIT_FAILED",
    BALANCE_FAILED = "BALANCE_FAILED",
    ACCOUNT_BLOCKED = "ACCOUNT_BLOCKED",
    INVALID_ACCOUNT_TYPE = "INVALID_ACCOUNT_TYPE",

    // Card related
    CARD_EXPIRED = "CARD_EXPIRED",
    CARD_BLOCKED = "CARD_BLOCKED",
    INVALID_CARD = "INVALID_CARD",

    // ATM related
    ATM_ERROR = "ATM_ERROR",
    ATM_OFFLINE = "ATM_OFFLINE",
    INSUFFICIENT_ATM_FUNDS = "INSUFFICIENT_ATM_FUNDS",

    // System related
    SYSTEM_ERROR = "SYSTEM_ERROR",
    DATABASE_ERROR = "DATABASE_ERROR",
    NETWORK_ERROR = "NETWORK_ERROR"
}

export enum NetworkType {
    VISA = "VISA",
    MASTERCARD = "MASTERCARD",
    AMEX = "AMEX"
}

import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { transactionLogger, errorLogger } from "../logger";
import { TransactionType } from "../logger";
import CustomerRepository from "../repositories/customers";
import { ATMRepository } from "../repositories/atms";
import RatesJSON from "../../rates.json";

const JWT_SECRET = process.env.JWT_SECRET || "default-secret-key";
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || "1h";

export class TransactionService {
    private static WITHDRAWAL_LIMIT = 1000;

    static async login(
        cardNumber: string,
        pin: string,
        atmId: string
    ): Promise<TransactionResult<LoginResultData>> {
        try {
            transactionLogger.debug("Login attempt initiated", { 
                cardNumber,
                atmId,
                transactionType: TransactionType.AUTH
            });
            
            // Verify ATM exists
            const atm = await ATMRepository.findATMById(atmId);
            if (!atm) {
                const errorMsg = "Login failed: ATM not found";
                transactionLogger.error(errorMsg, { 
                    cardNumber,
                    atmId,
                    transactionType: TransactionType.AUTH
                });
                return {
                    success: false,
                    message: errorMsg,
                };
            }
            
            const customer = await CustomerRepository.findCustomerByCardNumber(cardNumber);
            if (!customer) {
                const errorMsg = "Login failed: Card number not found";
                transactionLogger.error(errorMsg, { 
                    cardNumber,
                    atmId,
                    transactionType: TransactionType.AUTH
                });
                errorLogger.error(errorMsg, { cardNumber, atmId });
                return {
                    success: false,
                    message: errorMsg,
                };
            }

            const card = customer.cards.find((c) => c.cardNumber === cardNumber);
            if (!card) {
                const errorMsg = "Login failed: Card not found in customer record";
                transactionLogger.error(errorMsg, {
                    cardNumber,
                    atmId,
                    transactionType: TransactionType.AUTH
                });
                errorLogger.error(errorMsg, { cardNumber, atmId });
                return {
                    success: false,
                    message: errorMsg,
                };
            }

            if (card.isBlocked) {
                const errorMsg = "Login failed: Card is blocked";
                transactionLogger.error(errorMsg, { 
                    cardNumber,
                    atmId,
                    transactionType: TransactionType.AUTH
                });
                errorLogger.error(errorMsg, { cardNumber, atmId });
                return {
                    success: false,
                    message: errorMsg,
                };
            }

            if (card.expiryDate < new Date()) {
                const errorMsg = "Login failed: Card is expired";
                transactionLogger.error(errorMsg, { 
                    cardNumber,
                    expiryDate: card.expiryDate,
                    atmId,
                    transactionType: TransactionType.AUTH
                });
                errorLogger.error(errorMsg, { 
                    cardNumber,
                    expiryDate: card.expiryDate,
                    atmId
                });
                return {
                    success: false,
                    message: errorMsg,
                };
            }

            const isValid = await customer.validatePin(cardNumber, pin);
            if (!isValid) {
                const errorMsg = "Login failed: Invalid PIN";
                transactionLogger.error(errorMsg, { 
                    cardNumber,
                    atmId,
                    transactionType: TransactionType.AUTH
                });
                errorLogger.error(errorMsg, { cardNumber, atmId });
                return {
                    success: false,
                    message: errorMsg,
                };
            }

            // Generate JWT token
            const token = jwt.sign(
                {
                    cardNumber,
                    customerId: customer._id,
                },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRATION }
            );

            // Update last used timestamp
            card.lastUsed = new Date();
            await customer.save();

            transactionLogger.info("Login successful", {
                cardNumber,
                customerId: customer._id,
                atmId,
                transactionType: TransactionType.AUTH,
                atmLocation: atm.location,
                atmCurrency: atm.supportedCurrency
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
                    },
                    atm: {
                        location: atm.location,
                        currency: atm.supportedCurrency,
                        availableCash: atm.availableCash
                    }
                },
            };
        } catch (error) {
            const errorMsg = "Error during login";
            transactionLogger.error(errorMsg, {
                cardNumber,
                atmId,
                error: error instanceof Error ? error.message : "Unknown error",
                transactionType: TransactionType.AUTH
            });
            errorLogger.error(errorMsg, {
                cardNumber,
                atmId,
                error: error instanceof Error ? error.message : "Unknown error"
            });
            return {
                success: false,
                message: "Error processing login request",
            };
        }
    }

    static async withdraw(
        cardNumber: string,
        accountType: string,
        amount: number,
        customer: ICustomer,
        currency: string,
        atmId: string
    ): Promise<TransactionResult<WithdrawalResultData>> {
        try {
            transactionLogger.debug("Withdrawal initiated", {
                cardNumber,
                accountType,
                amount,
                currency,
                atmId,
                transactionType: TransactionType.WITHDRAWAL
            });

            // Validate ATM and its cash availability
            const atm = await ATMRepository.findATMById(atmId);
            if (!atm) {
                const errorMsg = "ATM not found";
                transactionLogger.error(errorMsg, {
                    cardNumber,
                    atmId,
                    transactionType: TransactionType.WITHDRAWAL
                });
                return {
                    success: false,
                    message: errorMsg
                };
            }

            if (atm.availableCash < amount) {
                const errorMsg = "Insufficient funds in ATM";
                transactionLogger.error(errorMsg, {
                    cardNumber,
                    atmId,
                    requested: amount,
                    available: atm.availableCash,
                    transactionType: TransactionType.WITHDRAWAL
                });
                return {
                    success: false,
                    message: errorMsg
                };
            }

            // Validate withdrawal amount
            if (!this.isValidWithdrawalAmount(amount)) {
                const errorMsg = "Invalid withdrawal amount";
                transactionLogger.error(errorMsg, {
                    cardNumber,
                    amount,
                    atmId,
                    transactionType: TransactionType.WITHDRAWAL
                });
                return {
                    success: false,
                    message: errorMsg
                };
            }

            const account = customer.accounts.find(
                (acc) => acc.accountType === accountType && acc.currency === currency
            );

            if (!account) {
                const errorMsg = "Account not found for specified currency and type";
                transactionLogger.error(errorMsg, {
                    accountType,
                    currency,
                    atmId,
                    transactionType: TransactionType.WITHDRAWAL
                });
                return {
                    success: false,
                    message: errorMsg
                };
            }

            // Currency conversion if ATM currency differs from account currency
            let convertedAmount = amount;
            let conversionRate = 1;
            const rates = RatesJSON["rates"];
            if (atm.supportedCurrency !== currency) {
                /* @ts-expect-error Ignore JSON parsing error */
                if (!rates[atm.supportedCurrency][currency]) {
                    const errorMsg = "Currency conversion not supported";
                    transactionLogger.error(errorMsg, {
                        fromCurrency: atm.supportedCurrency,
                        toCurrency: currency,
                        transactionType: TransactionType.WITHDRAWAL
                    });
                    return {
                        success: false,
                        message: errorMsg
                    };
                }

                /* @ts-expect-error Ignore JSON parsing error */
                conversionRate = rates[atm.supportedCurrency][currency];
                convertedAmount = amount * conversionRate;

                transactionLogger.info("Currency conversion applied", {
                    fromCurrency: atm.supportedCurrency,
                    toCurrency: currency,
                    originalAmount: amount,
                    convertedAmount,
                    rate: conversionRate,
                    transactionType: TransactionType.WITHDRAWAL
                });
            }

            // Apply 2% fee only for foreign currency transactions
            const fee = atm.supportedCurrency !== currency ? convertedAmount * 0.02 : 0;
            const totalDeduction = convertedAmount + fee;
            if (account.balance < totalDeduction) {
                const errorMsg = "Insufficient funds in account (including fees)";
                transactionLogger.error(errorMsg, {
                    cardNumber,
                    accountType,
                    requested: totalDeduction,
                    available: account.balance,
                    atmId,
                    transactionType: TransactionType.WITHDRAWAL
                });
                return {
                    success: false,
                    message: errorMsg
                };
            }

            // Process withdrawal from both ATM and account
            const newAtmAmount = atm.availableCash - amount;
            await ATMRepository.updateATMCash(atmId, newAtmAmount);

            account.balance -= totalDeduction;
            await customer.save();

            transactionLogger.info("Withdrawal successful", {
                cardNumber,
                accountType,
                originalAmount: amount,
                convertedAmount,
                fee,
                totalDeduction,
                newBalance: account.balance,
                atmId,
                atmLocation: atm.location,
                accountCurrency: currency,
                atmCurrency: atm.supportedCurrency,
                transactionType: TransactionType.WITHDRAWAL
            });

            return {
                success: true,
                message: "Withdrawal successful",
                data: {
                    withdrawnAmount: amount,
                    convertedAmount,
                    fee,
                    totalDeduction,
                    remainingBalance: account.balance,
                    atmCurrency: atm.supportedCurrency,
                    accountCurrency: currency,
                    token: jwt.sign(
                        {
                            cardNumber,
                            customerId: customer._id,
                        },
                        JWT_SECRET,
                        { expiresIn: JWT_EXPIRATION }
                    ),
                    atmLocation: atm.location
                }
            };
        } catch (error) {
            const errorMsg = "Error processing withdrawal";
            transactionLogger.error(errorMsg, {
                cardNumber,
                accountType,
                amount,
                atmId,
                error: error instanceof Error ? error.message : "Unknown error",
                transactionType: TransactionType.WITHDRAWAL
            });
            return {
                success: false,
                message: errorMsg
            };
        }
    }

    static async checkBalance(
        cardNumber: string,
        accountType: string,
        customer: ICustomer,
        atmId: string
    ): Promise<TransactionResult<BalanceResultData>> {
        try {
            transactionLogger.debug("Balance check initiated", {
                cardNumber,
                accountType,
                atmId,
                transactionType: TransactionType.BALANCE
            });

            // Verify ATM exists
            const atm = await ATMRepository.findATMById(atmId);
            if (!atm) {
                const errorMsg = "ATM not found";
                transactionLogger.error(errorMsg, {
                    cardNumber,
                    atmId,
                    transactionType: TransactionType.BALANCE
                });
                return {
                    success: false,
                    message: errorMsg
                };
            }

            // First try to find account in ATM's currency
            let account = customer.accounts.find(
                (acc) => acc.accountType === accountType && acc.currency === atm.supportedCurrency
            );

            // If no account in ATM's currency, find any account of the requested type
            if (!account) {
                account = customer.accounts.find(
                    (acc) => acc.accountType === accountType
                );
            }

            if (!account) {
                const errorMsg = "Account not found";
                transactionLogger.error(errorMsg, { 
                    accountType,
                    atmId,
                    transactionType: TransactionType.BALANCE
                });
                return {
                    success: false,
                    message: errorMsg
                };
            }

            const balance = account.balance;
            let convertedBalance = balance;
            let conversionRate = 1;
            const originalCurrency = account.currency;

            // Perform currency conversion if needed
            if (account.currency !== atm.supportedCurrency) {
                const rates = RatesJSON["rates"];
                /* @ts-expect-error Ignore JSON parsing error */
                if (!rates[account.currency][atm.supportedCurrency]) {
                    const errorMsg = "Currency conversion not supported";
                    transactionLogger.error(errorMsg, {
                        fromCurrency: account.currency,
                        toCurrency: atm.supportedCurrency,
                        transactionType: TransactionType.BALANCE
                    });
                    return {
                        success: false,
                        message: errorMsg
                    };
                }

                /* @ts-expect-error Ignore JSON parsing error */
                conversionRate = rates[account.currency][atm.supportedCurrency];
                convertedBalance = balance * conversionRate;

                transactionLogger.info("Currency conversion applied for balance", {
                    fromCurrency: account.currency,
                    toCurrency: atm.supportedCurrency,
                    originalBalance: balance,
                    convertedBalance,
                    rate: conversionRate,
                    transactionType: TransactionType.BALANCE
                });
            }

            transactionLogger.info("Balance check successful", {
                cardNumber,
                accountType,
                originalBalance: balance,
                originalCurrency,
                convertedBalance,
                atmCurrency: atm.supportedCurrency,
                conversionApplied: account.currency !== atm.supportedCurrency,
                atmId,
                atmLocation: atm.location,
                transactionType: TransactionType.BALANCE
            });

            return {
                success: true,
                message: "Balance retrieved successfully",
                data: {
                    balance: convertedBalance,
                    originalBalance: balance,
                    originalCurrency,
                    accountType: account.accountType,
                    currency: atm.supportedCurrency,
                    conversionRate: account.currency !== atm.supportedCurrency ? conversionRate : undefined,
                    token: jwt.sign(
                        {
                            cardNumber,
                            customerId: customer._id,
                        },
                        JWT_SECRET,
                        { expiresIn: JWT_EXPIRATION }
                    ),
                    atm: {
                        location: atm.location,
                        currency: atm.supportedCurrency
                    }
                }
            };
        } catch (error) {
            const errorMsg = "Error checking balance";
            transactionLogger.error(errorMsg, {
                cardNumber,
                accountType,
                atmId,
                error: error instanceof Error ? error.message : "Unknown error",
                transactionType: TransactionType.BALANCE
            });
            return {
                success: false,
                message: errorMsg
            };
        }
    }

    static async convertCurrency(
        fromCurrency: string,
        toCurrency: string,
        amount: number,
        cardNumber: string,
        applyFee: boolean,
        customerId: Types.ObjectId
    ): Promise<TransactionResult<CurrencyConversionResultData>> {
        try {
            const rates = RatesJSON["rates"];
            // Validate currencies exist in rates
            /* @ts-expect-error Ignore JSON parsing error */
            if (!rates[fromCurrency] || !rates[fromCurrency][toCurrency]) {
                const errorMsg = "Unsupported currency pair";
                transactionLogger.error(errorMsg, {
                    fromCurrency,
                    toCurrency,
                    transactionType: TransactionType.CURRENCY_CONVERSION
                });
                return {
                    success: false,
                    message: errorMsg
                };
            }

            /* @ts-expect-error Ignore JSON parsing error */
            const rate = rates[fromCurrency][toCurrency];
            const convertedAmount = amount * rate;

            // Calculate fee if applicable (2% when applyFee is true)
            const fee = applyFee ? convertedAmount * 0.02 : 0;
            const totalDeduction = convertedAmount + fee;

            transactionLogger.info("Currency conversion calculated", {
                fromCurrency,
                toCurrency,
                originalAmount: amount,
                convertedAmount,
                fee,
                totalDeduction,
                rate,
                transactionType: TransactionType.CURRENCY_CONVERSION
            });

            // Generate JWT token
            const token = jwt.sign(
                {
                    cardNumber,
                    customerId,
                },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRATION }
            );

            return {
                success: true,
                message: "Currency conversion successful",
                data: {
                    originalAmount: amount,
                    convertedAmount,
                    fee,
                    totalDeduction,
                    fromCurrency,
                    toCurrency,
                    rate,
                    token,
                }
            };
        } catch (error) {
            const errorMsg = "Error processing currency conversion";
            transactionLogger.error(errorMsg, {
                cardNumber,
                fromCurrency,
                toCurrency,
                amount,
                error: error instanceof Error ? error.message : "Unknown error",
                transactionType: TransactionType.CURRENCY_CONVERSION
            });
            return {
                success: false,
                message: errorMsg
            };
        }
    }

    static async deposit(
        cardNumber: string,
        amount: number,
        customer: ICustomer,
        atmId: string
    ): Promise<TransactionResult<DepositResultData>> {
        try {
            transactionLogger.debug("Deposit initiated", {
                cardNumber,
                amount,
                atmId,
                transactionType: TransactionType.DEPOSIT
            });

            // Validate deposit amount
            if (!this.isValidDepositAmount(amount)) {
                const errorMsg = "Invalid deposit amount";
                transactionLogger.error(errorMsg, {
                    cardNumber,
                    amount,
                    atmId,
                    transactionType: TransactionType.DEPOSIT
                });
                return {
                    success: false,
                    message: errorMsg
                };
            }

            // Verify ATM exists
            const atm = await ATMRepository.findATMById(atmId);
            if (!atm) {
                const errorMsg = "ATM not found";
                transactionLogger.error(errorMsg, {
                    cardNumber,
                    atmId,
                    transactionType: TransactionType.DEPOSIT
                });
                return {
                    success: false,
                    message: errorMsg
                };
            }

            // Find savings account with matching currency
            const account = customer.accounts.find(
                (acc) => (acc.accountType === "savings" || acc.accountType === "checking") && acc.currency === atm.supportedCurrency
            );

            if (!account) {
                const errorMsg = `No savings or checking account found with ${atm.supportedCurrency} currency`;
                transactionLogger.error(errorMsg, {
                    atmId,
                    atmCurrency: atm.supportedCurrency,
                    availableAccounts: customer.accounts
                        .filter(acc => (acc.accountType === "savings" || acc.accountType === "checking"))
                        .map(acc => acc.currency),
                    transactionType: TransactionType.DEPOSIT
                });
                return {
                    success: false,
                    message: errorMsg
                };
            }

            const newAtmAmount = atm.availableCash + amount;
            await ATMRepository.updateATMCash(atmId, newAtmAmount);

            account.balance += amount;
            await customer.save();

            transactionLogger.info("Deposit successful", {
                cardNumber,
                amount,
                newBalance: account.balance,
                atmId,
                atmLocation: atm.location,
                atmCurrency: atm.supportedCurrency,
                accountCurrency: account.currency,
                transactionType: TransactionType.DEPOSIT
            });

            return {
                success: true,
                message: "Deposit successful",
                data: {
                    depositedAmount: amount,
                    remainingBalance: account.balance,
                    currency: atm.supportedCurrency,
                    token: jwt.sign(
                        {
                            cardNumber,
                            customerId: customer._id,
                        },
                        JWT_SECRET,
                        { expiresIn: JWT_EXPIRATION }
                    ),
                    atmLocation: atm.location
                }
            };
        } catch (error) {
            const errorMsg = "Error processing deposit";
            transactionLogger.error(errorMsg, {
                cardNumber,
                amount,
                atmId,
                error: error instanceof Error ? error.message : "Unknown error",
                transactionType: TransactionType.DEPOSIT
            });
            return {
                success: false,
                message: errorMsg
            };
        }
    }

    private static isValidWithdrawalAmount(amount: number): boolean {
        return amount > 0 && amount <= this.WITHDRAWAL_LIMIT;
    }

    private static isValidDepositAmount(amount: number): boolean {
        return amount > 0;
    }
}

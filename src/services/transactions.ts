import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { transactionLogger, errorLogger } from "../logger";
import { TransactionType } from "../logger";
import CustomerRepository from "../repositories/customers";

const JWT_SECRET = process.env.JWT_SECRET || "default-secret-key";
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || "1h";

export class TransactionService {
    private static WITHDRAWAL_LIMIT = 1000;
  
    static async login(
        cardNumber: string,
        pin: string
    ): Promise<TransactionResult<LoginResultData>> {
        try {
            transactionLogger.debug("Login attempt initiated", { 
                cardNumber,
                transactionType: TransactionType.AUTH
            });
            
            const customer = await CustomerRepository.findCustomerByCardNumber(cardNumber);
            if (!customer) {
                const errorMsg = "Login failed: Card number not found";
                transactionLogger.error(errorMsg, { 
                    cardNumber,
                    transactionType: TransactionType.AUTH
                });
                errorLogger.error(errorMsg, { cardNumber });
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
                    transactionType: TransactionType.AUTH
                });
                errorLogger.error(errorMsg, { cardNumber });
                return {
                    success: false,
                    message: errorMsg,
                };
            }

            if (card.isBlocked) {
                const errorMsg = "Login failed: Card is blocked";
                transactionLogger.error(errorMsg, { 
                    cardNumber,
                    transactionType: TransactionType.AUTH
                });
                errorLogger.error(errorMsg, { cardNumber });
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
                    transactionType: TransactionType.AUTH
                });
                errorLogger.error(errorMsg, { 
                    cardNumber,
                    expiryDate: card.expiryDate
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
                    transactionType: TransactionType.AUTH
                });
                errorLogger.error(errorMsg, { cardNumber });
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
                transactionType: TransactionType.AUTH
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
                },
            };
        } catch (error) {
            const errorMsg = "Error during login";
            transactionLogger.error(errorMsg, {
                cardNumber,
                error: error instanceof Error ? error.message : "Unknown error",
                transactionType: TransactionType.AUTH
            });
            errorLogger.error(errorMsg, {
                cardNumber,
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
        customer: ICustomer
    ): Promise<TransactionResult<WithdrawalResultData>> {
        try {
            transactionLogger.debug("Withdrawal initiated", {
                cardNumber,
                accountType,
                amount,
                transactionType: TransactionType.WITHDRAWAL
            });

            // Validate withdrawal amount
            if (!this.isValidWithdrawalAmount(amount)) {
                const errorMsg = "Invalid withdrawal amount";
                transactionLogger.error(errorMsg, {
                    cardNumber,
                    amount,
                    transactionType: TransactionType.WITHDRAWAL
                });
                errorLogger.error(errorMsg, {
                    cardNumber,
                    amount
                });
                return {
                    success: false,
                    message: errorMsg
                };
            }

            const account = customer.accounts.find(
                (acc) => acc.accountType === accountType
            );

            if (!account) {
                const errorMsg = "Account not found";
                transactionLogger.error(errorMsg, { 
                    accountType,
                    transactionType: TransactionType.WITHDRAWAL
                });
                errorLogger.error(errorMsg, { accountType });
                return {
                    success: false,
                    message: errorMsg
                };
            }

            // Check sufficient balance
            if (account.balance < amount) {
                const errorMsg = "Insufficient funds";
                transactionLogger.error(errorMsg, {
                    cardNumber,
                    accountType,
                    requested: amount,
                    available: account.balance,
                    transactionType: TransactionType.WITHDRAWAL
                });
                errorLogger.error(errorMsg, {
                    cardNumber,
                    accountType,
                    requested: amount,
                    available: account.balance
                });
                return {
                    success: false,
                    message: errorMsg
                };
            }

            // Process withdrawal
            account.balance -= amount;
            await customer.save();

            transactionLogger.info("Withdrawal processed successfully", {
                cardNumber,
                accountType,
                amount,
                newBalance: account.balance,
                transactionType: TransactionType.WITHDRAWAL
            });

            return {
                success: true,
                message: "Withdrawal successful",
                data: {
                    withdrawnAmount: amount,
                    remainingBalance: account.balance,
                    token: jwt.sign(
                        {
                            cardNumber,
                            customerId: customer._id,
                        },
                        JWT_SECRET,
                        { expiresIn: JWT_EXPIRATION }
                    )
                }
            };
        } catch (error) {
            const errorMsg = "Error processing withdrawal";
            transactionLogger.error(errorMsg, {
                cardNumber,
                accountType,
                amount,
                error: error instanceof Error ? error.message : "Unknown error",
                transactionType: TransactionType.WITHDRAWAL
            });
            errorLogger.error(errorMsg, {
                cardNumber,
                accountType,
                amount,
                error: error instanceof Error ? error.message : "Unknown error"
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

    static async checkBalance(
        cardNumber: string,
        accountType: string,
        customer: ICustomer
    ): Promise<TransactionResult<BalanceResultData>> {
        try {
            transactionLogger.debug("Balance check initiated", {
                cardNumber,
                accountType,
                transactionType: TransactionType.BALANCE
            });

            const account = customer.accounts.find(
                (acc) => acc.accountType === accountType
            );

            if (!account) {
                const errorMsg = "Account not found";
                transactionLogger.error(errorMsg, { 
                    accountType,
                    transactionType: TransactionType.BALANCE
                });
                errorLogger.error(errorMsg, { accountType });
                return {
                    success: false,
                    message: errorMsg
                };
            }

            transactionLogger.info("Balance check successful", {
                cardNumber,
                accountType,
                balance: account.balance,
                transactionType: TransactionType.BALANCE
            });

            return {
                success: true,
                message: "Balance retrieved successfully",
                data: {
                    balance: account.balance,
                    accountType: account.accountType,
                    token: jwt.sign(
                        {
                            cardNumber,
                            customerId: customer._id,
                        },
                        JWT_SECRET,
                        { expiresIn: JWT_EXPIRATION }
                    )
                }
            };
        } catch (error) {
            const errorMsg = "Error checking balance";
            transactionLogger.error(errorMsg, {
                cardNumber,
                accountType,
                error: error instanceof Error ? error.message : "Unknown error",
                transactionType: TransactionType.BALANCE
            });
            errorLogger.error(errorMsg, {
                cardNumber,
                accountType,
                error: error instanceof Error ? error.message : "Unknown error"
            });
            return {
                success: false,
                message: errorMsg
            };
        }
    }
} 

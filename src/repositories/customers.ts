import { Customer } from "../models/customers";
import { appLogger, errorLogger, transactionLogger } from "../logger";
import { TransactionResponse } from "../enums";
import { TransactionType } from "../logger";

class CustomerRepository {
    static async findCustomerById(id: string): Promise<ICustomer | null> {
        try {
            appLogger.debug("Attempting to find customer by ID", { customerId: id });
            const customer = await Customer.findById(id);
            if (!customer) {
                appLogger.info("Customer not found by ID", { customerId: id });
                return null;
            }
            return customer;
        } catch (error) {
            const errorMsg = "Database error while finding customer by ID";
            errorLogger.error(errorMsg, {
                customerId: id,
                error: error instanceof Error ? error.message : "Unknown error"
            });
            throw new Error(TransactionResponse.DATABASE_ERROR);
        }
    }

    static async findCustomerByCardNumber(cardNumber: string): Promise<ICustomer | null> {
        try {
            transactionLogger.debug("Attempting to find customer by card number", { 
                cardNumber,
                transactionType: TransactionType.AUTH
            });
            const customer = await Customer.findOne({ "cards.cardNumber": cardNumber });
            if (!customer) {
                transactionLogger.info("Customer not found by card number", { 
                    cardNumber,
                    transactionType: TransactionType.AUTH
                });
            }
            return customer;
        } catch (error) {
            const errorMsg = "Database error while finding customer by card number";
            errorLogger.error(errorMsg, {
                cardNumber,
                error: error instanceof Error ? error.message : "Unknown error"
            });
            transactionLogger.error(errorMsg, {
                cardNumber,
                error: error instanceof Error ? error.message : "Unknown error",
                transactionType: TransactionType.AUTH
            });
            throw new Error(TransactionResponse.DATABASE_ERROR);
        }
    }

    static async findCustomerByAccountNumber(accountNumber: string): Promise<ICustomer | null> {
        try {
            appLogger.debug("Attempting to find customer by account number", { accountNumber });
            const customer = await Customer.findOne({ "accounts.accountNumber": accountNumber });
            if (!customer) {
                appLogger.info("Customer not found by account number", { accountNumber });
            }
            return customer;
        } catch (error) {
            const errorMsg = "Database error while finding customer by account number";
            errorLogger.error(errorMsg, {
                accountNumber,
                error: error instanceof Error ? error.message : "Unknown error"
            });
            throw new Error(TransactionResponse.DATABASE_ERROR);
        }
    }

    static async updateCustomerBalance(
        customerId: string,
        accountType: string,
        amount: number,
        operation: "withdraw" | "deposit"
    ): Promise<ICustomer | null> {
        const transactionType = operation === "withdraw" ? TransactionType.WITHDRAWAL : TransactionType.DEPOSIT;
        try {
            transactionLogger.debug(`Attempting to ${operation} from customer account`, {
                customerId,
                accountType,
                amount,
                transactionType
            });

            const updateOperation = operation === "withdraw" ? -amount : amount;
            
            const customer = await Customer.findOneAndUpdate(
                { 
                    _id: customerId,
                    "accounts.accountType": accountType
                },
                { 
                    $inc: { "accounts.$.balance": updateOperation }
                },
                { new: true }
            );

            if (!customer) {
                const errorMsg = `${operation} operation failed - Customer or account not found`;
                transactionLogger.error(errorMsg, {
                    customerId,
                    accountType,
                    transactionType
                });
                errorLogger.error(errorMsg, {
                    customerId,
                    accountType
                });
                return null;
            }

            transactionLogger.info(`Successfully performed ${operation} operation`, {
                customerId,
                accountType,
                amount,
                transactionType
            });

            return customer;
        } catch (error) {
            const errorMsg = `Database error while performing ${operation} operation`;
            errorLogger.error(errorMsg, {
                customerId,
                accountType,
                amount,
                error: error instanceof Error ? error.message : "Unknown error"
            });
            transactionLogger.error(errorMsg, {
                customerId,
                accountType,
                amount,
                error: error instanceof Error ? error.message : "Unknown error",
                transactionType
            });
            throw new Error(TransactionResponse.DATABASE_ERROR);
        }
    }

    static async validatePin(customerId: string, cardNumber: string, pin: string): Promise<boolean> {
        try {
            transactionLogger.debug("Attempting to validate PIN", {
                customerId,
                cardNumber,
                transactionType: TransactionType.AUTH
            });

            const customer = await Customer.findOne({
                _id: customerId,
                "cards.cardNumber": cardNumber
            });

            if (!customer) {
                transactionLogger.info("PIN validation failed - Customer not found", {
                    customerId,
                    cardNumber,
                    transactionType: TransactionType.AUTH
                });
                return false;
            }

            const card = customer.cards.find(c => c.cardNumber === cardNumber);
            const isValid = card?.pin === pin;

            transactionLogger.info("PIN validation result", {
                customerId,
                cardNumber,
                isValid,
                transactionType: TransactionType.AUTH
            });

            return isValid;
        } catch (error) {
            const errorMsg = "Database error while validating PIN";
            errorLogger.error(errorMsg, {
                customerId,
                cardNumber,
                error: error instanceof Error ? error.message : "Unknown error"
            });
            transactionLogger.error(errorMsg, {
                customerId,
                cardNumber,
                error: error instanceof Error ? error.message : "Unknown error",
                transactionType: TransactionType.AUTH
            });
            throw new Error(TransactionResponse.DATABASE_ERROR);
        }
    }

    static async getAccountBalance(
        customerId: string,
        accountType: string
    ): Promise<number | null> {
        try {
            transactionLogger.debug("Attempting to get account balance", {
                customerId,
                accountType,
                transactionType: TransactionType.BALANCE
            });

            const customer = await Customer.findOne({
                _id: customerId,
                "accounts.accountType": accountType
            });

            if (!customer) {
                const errorMsg = "Balance check failed - Customer or account not found";
                transactionLogger.error(errorMsg, {
                    customerId,
                    accountType,
                    transactionType: TransactionType.BALANCE
                });
                errorLogger.error(errorMsg, {
                    customerId,
                    accountType
                });
                return null;
            }

            const account = customer.accounts.find(a => a.accountType === accountType);
            const balance = account?.balance ?? null;

            transactionLogger.info("Successfully retrieved balance", {
                customerId,
                accountType,
                balance,
                transactionType: TransactionType.BALANCE
            });

            return balance;
        } catch (error) {
            const errorMsg = "Database error while getting balance";
            errorLogger.error(errorMsg, {
                customerId,
                accountType,
                error: error instanceof Error ? error.message : "Unknown error"
            });
            transactionLogger.error(errorMsg, {
                customerId,
                accountType,
                error: error instanceof Error ? error.message : "Unknown error",
                transactionType: TransactionType.BALANCE
            });
            throw new Error(TransactionResponse.DATABASE_ERROR);
        }
    }
}

export default CustomerRepository;

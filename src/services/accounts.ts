import { appLogger, errorLogger } from "../logger";
import CustomerRepository from "../repositories/customers";

export class AccountService {
    static async getAccountTypesByCurrency(
        userId: string,
        currency: string
    ): Promise<TransactionResult<Array<{ accountType: string; accountId: string; balance: number }>>> {
        try {
            const customer = await CustomerRepository.findCustomerById(userId);
            if (!customer) {
                appLogger.error("Customer not found", {
                    userId,
                    currency,
                });
                return {
                    success: false,
                    message: "Customer not found"
                };
            }

            const accountTypes = customer.accounts
                .filter((account: IAccount) => account.currency === currency)
                .map((account: IAccount) => ({
                    accountType: account.accountType,
                    accountId: account.accountNumber,
                    balance: account.balance,
                }));

            if (accountTypes.length === 0) {
                appLogger.info("No accounts found for specified currency", {
                    userId,
                    currency,
                });
                return {
                    success: false,
                    message: `No accounts found with currency ${currency}`
                };
            }

            return {
                success: true,
                message: "Account types retrieved successfully",
                data: accountTypes
            };
        } catch (error) {
            errorLogger.error("Error retrieving account types", {
                userId,
                currency,
                error: error instanceof Error ? error.message : "Unknown error",
            });
            return {
                success: false,
                message: "Error retrieving account types"
            };
        }
    }

    static async getUserCurrencies(
        userId: string
    ): Promise<TransactionResult<string[]>> {
        try {
            const customer = await CustomerRepository.findCustomerById(userId);
            if (!customer) {
                errorLogger.error("Customer not found", {
                    userId,
                });
                return {
                    success: false,
                    message: "Customer not found"
                };
            }

            // Get unique currencies from all accounts
            const uniqueCurrencies = [
                ...new Set(
                    customer.accounts.map((account: IAccount) => account.currency)
                ),
            ];

            return {
                success: true,
                message: "Currencies retrieved successfully",
                data: uniqueCurrencies
            };
        } catch (error) {
            errorLogger.error("Error retrieving user currencies", {
                userId,
                error: error instanceof Error ? error.message : "Unknown error",
            });
            return {
                success: false,
                message: "Error retrieving currencies"
            };
        }
    }
}

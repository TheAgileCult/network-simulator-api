import { Customer } from "../models/customers";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { appLogger } from "../logger";

const JWT_SECRET = process.env.JWT_SECRET || "default-secret-key";
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || "1h";

export class TransactionService {
    static async login(
        cardNumber: string,
        pin: string
    ): Promise<TransactionResult<LoginResultData>> {
        try {
            appLogger.debug("Login attempt initiated", { cardNumber });

            const customer = await Customer.findOne({ "cards.cardNumber": cardNumber });

            if (!customer) {
                appLogger.error("Login failed: Card not found", { cardNumber });
                return {
                    success: false,
                    message: "Card not found"
                };
            }

            const card = customer.cards.find(c => c.cardNumber === cardNumber);

            if (!card) {
                appLogger.error("Login failed: Card not found in customer record", { cardNumber });
                return {
                    success: false,
                    message: "Card not found"
                };
            }

            if (card.isBlocked) {
                appLogger.error("Login failed: Card is blocked", { cardNumber });
                return {
                    success: false,
                    message: "Card is blocked"
                };
            }

            if (card.expiryDate < new Date()) {
                appLogger.error("Login failed: Card is expired", { cardNumber });
                return {
                    success: false,
                    message: "Card is expired"
                };
            }

            const isValid = await customer.validatePin(cardNumber, pin);
            if (!isValid) {
                appLogger.error("Login failed: Invalid PIN", { cardNumber });
                return {
                    success: false,
                    message: "Invalid PIN"
                };
            }

            // Generate JWT token
            const token = jwt.sign(
                {
                    cardNumber,
                    customerId: customer._id,
                    cardType: card.cardType
                },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRATION }
            );

            // Update last used timestamp
            card.lastUsed = new Date();
            await customer.save();

            appLogger.debug("Login successful", {
                cardNumber,
                customerId: customer._id
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
                        cardType: card.cardType
                    }
                }
            };
        } catch (error) {
            appLogger.error("Error during login:", error);
            return {
                success: false,
                message: "Error processing login request"
            };
        }
    }
} 

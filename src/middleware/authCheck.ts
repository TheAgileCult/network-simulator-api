import { Response, NextFunction } from "express";
import { transactionLogger, errorLogger, appLogger } from "../logger";
import jwt from "jsonwebtoken";
import CustomerRepository from "../repositories/customers";
import { TransactionResponse } from "../enums";

const JWT_SECRET = process.env.JWT_SECRET ?? "";
const JWT_EXPIRATION = "1m";

export const authCheck = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const endpoint = req.originalUrl;
    const method = req.method;
    
    appLogger.info(`Incoming request to ${method} ${endpoint}`, {
        endpoint,
        method,
        ip: req.ip,
        userAgent: req.headers["user-agent"]
    });

    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            errorLogger.warn("Authentication failed - No token provided", {
                endpoint,
                method,
                ip: req.ip
            });
            res.status(401).json({
                success: false,
                message: "No token provided",
                code: TransactionResponse.AUTH_FAILED
            });
            return;
        }

        try {
            const token = authHeader.split(" ")[1];
            const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;      
            
            appLogger.debug("Token verification successful", {
                endpoint,
                customerId: decoded.customerId
            });

            const customer = await CustomerRepository.findCustomerById(decoded.customerId);
            if (!customer) {
                errorLogger.error("Authentication failed - Customer not found", {
                    endpoint,
                    customerId: decoded.customerId,
                    ip: req.ip
                });
                res.status(404).json({
                    success: false,
                    message: "Customer not found",
                    code: TransactionResponse.AUTH_FAILED
                });
                return;
            }

            const card = customer.cards.find(
                (c) => c.cardNumber === decoded.cardNumber
            );
            if (!card || card.isBlocked) {
                errorLogger.error("Authentication failed - Card invalid or blocked", {
                    endpoint,
                    cardNumber: decoded.cardNumber,
                    customerId: decoded.customerId,
                    isBlocked: card?.isBlocked
                });
                res.status(401).json({
                    success: false,
                    message: "Card is invalid or blocked",
                    code: TransactionResponse.AUTH_FAILED
                });
                return;
            }

            if (card.expiryDate < new Date()) {
                errorLogger.error("Authentication failed - Card expired", {
                    endpoint,
                    cardNumber: decoded.cardNumber,
                    customerId: decoded.customerId,
                    expiryDate: card.expiryDate
                });
                res.status(401).json({
                    success: false,
                    message: "Card is expired",
                    code: TransactionResponse.AUTH_FAILED
                });
                return;
            }

            const newToken = jwt.sign(
                {
                    cardNumber: decoded.cardNumber,
                    customerId: decoded.customerId
                },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRATION }
            );
            req.customer = customer;
            req.newToken = newToken;

            transactionLogger.info("Authentication successful", {
                endpoint,
                method,
                cardNumber: decoded.cardNumber,
                customerId: decoded.customerId,
                ip: req.ip
            });

            next();
        } catch (error) {
            if (error instanceof jwt.JsonWebTokenError) {
                errorLogger.error("Authentication failed - Invalid token", {
                    endpoint,
                    error: error.message,
                    ip: req.ip
                });
                res.status(401).json({
                    success: false,
                    message: "Invalid token",
                    code: TransactionResponse.AUTH_FAILED
                });
                return;
            }
            if (error instanceof jwt.TokenExpiredError) {
                errorLogger.error("Authentication failed - Token expired", {
                    endpoint,
                    error: error.message,
                    ip: req.ip
                });
                res.status(401).json({
                    success: false,
                    message: "Token expired",
                    code: TransactionResponse.AUTH_FAILED
                });
                return;
            }
            throw error;
        }
    } catch (error) {
        errorLogger.error("Critical authentication error", {
            endpoint,
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
            ip: req.ip
        });
        res.status(500).json({
            success: false,
            message: "Internal server error during authentication",
            code: TransactionResponse.AUTH_FAILED
        });
    }
};

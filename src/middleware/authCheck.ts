import { Response, NextFunction } from "express";
import { Customer } from "../models/customers";
import { transactionLogger, appLogger, errorLogger } from "../logger";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { AuthenticatedRequest, JwtPayload } from "../@types/auth";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET ?? "";

export const authCheck = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check for token in Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "No token provided",
      });
      return;
    }

    const token = authHeader.split(" ")[1];

    try {
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      req.user = decoded;
      req.token = token;

      // Find customer
      const customer = await Customer.findById(decoded.customerId);
      if (!customer) {
        res.status(404).json({
          success: false,
          message: "Customer not found",
        });
        return;
      }

      // Check if card exists and is not blocked
      const card = customer.cards.find(
        (c) => c.cardNumber === decoded.cardNumber
      );
      if (!card || card.isBlocked) {
        res.status(401).json({
          success: false,
          message: "Card is invalid or blocked",
        });
        return;
      }

      // Check if card is expired
      if (card.expiryDate < new Date()) {
        res.status(401).json({
          success: false,
          message: "Card is expired",
        });
        return;
      }

      // Attach customer to request
      req.customer = customer;
      transactionLogger.info("Authentication successful", {
        cardNumber: decoded.cardNumber,
        customerId: decoded.customerId,
      });

      next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        res.status(401).json({
          success: false,
          message: "Invalid token",
        });
        return;
      }
      if (error instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          success: false,
          message: "Token expired",
        });
        return;
      }
      throw error;
    }
  } catch (error) {
    errorLogger.error("Authentication error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during authentication",
    });
  }
};

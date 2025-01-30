import winston from "winston";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const logFilePath = "./logs";

// Create logs directory if it doesn't exist
if (!fs.existsSync(logFilePath)) {
    fs.mkdirSync(logFilePath);
}

// Transaction types for filtering
export enum TransactionType {
    AUTH = "AUTH",
    WITHDRAWAL = "WITHDRAWAL",
    DEPOSIT = "DEPOSIT",
    BALANCE = "BALANCE",
    CURRENCY_CONVERSION = "CURRENCY_CONVERSION"
}

// Color scheme for different log levels
const colors = {
    error: "red",
    warn: "yellow",
    info: "cyan",
    debug: "magenta"
};

winston.addColors(colors);

// Format metadata object for better readability
const formatMetadata = (metadata: Record<string, unknown> = {}): string => {
    if (Object.keys(metadata).length === 0) {
        return "";
    }

    const formattedData = Object.entries(metadata)
        .map(([key, value]) => {
            if (value instanceof Date) {
                return `\n  └─ ${key}: ${value.toISOString()}`;
            }
            if (value instanceof Error) {
                return `\n  └─ ${key}: ${value.message}`;
            }
            return `\n  └─ ${key}: ${JSON.stringify(value)}`;
        })
        .join("");

    return formattedData;
};

// Custom format for console output
const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
    winston.format.colorize({ all: true }),
    winston.format.printf(({ level, message, timestamp, transactionType, ...metadata }) => {
        const prefix = `[${timestamp}]`;
        const levelPadded = level.padEnd(16);
        const txType = transactionType ? `[${transactionType}]`.padEnd(12) : "";
        return `${prefix} ${levelPadded} ${txType}${message}${formatMetadata(metadata)}\n`;
    })
);

// Format for file output (without colors)
const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
    winston.format.printf(({ level, message, timestamp, transactionType, ...metadata }) => {
        const prefix = `[${timestamp}]`;
        const levelPadded = level.toUpperCase().padEnd(7);
        const txType = transactionType ? `[${transactionType}]`.padEnd(12) : "";
        return `${prefix} ${levelPadded} ${txType}${message}${formatMetadata(metadata)}\n`;
    })
);

// Transaction logger with enhanced formatting
const transactionLogger = winston.createLogger({
    level: "info",
    format: fileFormat,
    transports: [
        new winston.transports.File({
            filename: path.join(logFilePath, "transactions.log")
        }),
        new winston.transports.Console({
            format: consoleFormat
        })
    ]
});

// Error logger with enhanced formatting
const errorLogger = winston.createLogger({
    level: "error",
    format: fileFormat,
    transports: [
        new winston.transports.File({
            filename: path.join(logFilePath, "error.log")
        }),
        new winston.transports.Console({
            format: consoleFormat
        })
    ]
});

// Application logger with enhanced formatting
const appLogger = winston.createLogger({
    level: "debug",
    format: fileFormat,
    transports: [
        new winston.transports.File({
            filename: path.join(logFilePath, "app.log")
        }),
        new winston.transports.Console({
            format: consoleFormat
        })
    ]
});

export { transactionLogger, appLogger, errorLogger };

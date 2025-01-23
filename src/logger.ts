import winston from "winston";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const logFilePath = process.env.LOG_FILE_PATH || "./logs";
const logLevel = process.env.LOG_LEVEL || "info";

// Create logs directory if it doesn't exist
if (!fs.existsSync(logFilePath)) {
  fs.mkdirSync(logFilePath);
}

const customFormat = winston.format.printf(
  ({ level, message, timestamp, ...metadata }) => {
    // Only include metadata if it's not empty
    const metadataStr =
      Object.keys(metadata).length > 0 &&
      metadata.metadata &&
      Object.keys(metadata.metadata).length > 0
        ? ` - ${JSON.stringify(metadata.metadata)}`
        : "";

    return `(${timestamp}) - [${level.toUpperCase()}] - ${message}${metadataStr}`;
  }
);

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.metadata({ fillExcept: ["message", "level", "timestamp"] }),
  customFormat
);

const transactionLogger = winston.createLogger({
  level: "info",
  format: logFormat,
  transports: [
    new winston.transports.File({
      filename: path.join(logFilePath, "error.log"),
    }),
    new winston.transports.File({
      filename: path.join(logFilePath, "transactions.log"),
    }),
    new winston.transports.Console({
      format: winston.format.combine(customFormat),
    }),
  ],
});

const errorLogger = winston.createLogger({
  level: "error",
  format: logFormat,
  transports: [
    new winston.transports.File({
      filename: path.join(logFilePath, "error.log"),
    }),
    new winston.transports.Console({
      format: winston.format.combine(customFormat),
    }),
  ],
});

const appLogger = winston.createLogger({
  level: "debug",
  format: logFormat,
  transports: [
    new winston.transports.File({
      filename: path.join(logFilePath, "app.log"),
    }),
    new winston.transports.Console({
      format: winston.format.combine(customFormat),
    }),
  ],
});

export { transactionLogger, appLogger, errorLogger };

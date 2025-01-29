import mongoose from "mongoose";
import { ATM } from "../models/atms";
import { appLogger } from "../logger";

let sharedConnection: mongoose.Connection | null = null;

const getSharedConnection = () => {
    if (!sharedConnection) {
        const sharedMongoUri = process.env.SHARED_MONGODB_URI || "mongodb://localhost:27017/shared-atm-network";
        sharedConnection = mongoose.createConnection(sharedMongoUri);
        appLogger.debug("Connected to shared ATM database");
    }
    return sharedConnection;
};

export class ATMRepository {
    private static getATMModel() {
        const connection = getSharedConnection();
        return connection.model("ATM", ATM.schema);
    }

    static async findATMById(atmId: string): Promise<IATM | null> {
        try {
            const SharedATM = this.getATMModel();
            const atm = await SharedATM.findOne({ atmId });
            if (!atm) {
                appLogger.warn(`ATM not found: ${atmId}`);
            }
            return atm;
        } catch (error) {
            appLogger.error(`Error finding ATM: ${error}`);
            throw error;
        }
    }

    static async updateATMCash(atmId: string, newAmount: number): Promise<IATM | null> {
        try {
            const SharedATM = this.getATMModel();
            const result = await SharedATM.findOneAndUpdate(
                { atmId },
                { 
                    $set: { 
                        availableCash: newAmount,
                        lastUsed: new Date()
                    }
                },
                { new: true }
            );
            
            if (!result) {
                throw new Error(`ATM with ID ${atmId} not found`);
            }
            
            appLogger.info(`ATM ${atmId} cash updated to ${newAmount}`);
            return result;
        } catch (error) {
            appLogger.error(`Error updating ATM cash: ${error}`);
            throw error;
        }
    }
} 

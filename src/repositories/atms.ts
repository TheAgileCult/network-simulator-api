import { ATM } from "../models/atms";
import { appLogger } from "../logger";

export class ATMRepository {
    static async findATMById(atmId: string): Promise<IATM | null> {
        try {
            const atm = await ATM.findOne({ atmId });
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
            const atm = await ATM.findOneAndUpdate(
                { atmId },
                { 
                    $set: { 
                        availableCash: newAmount,
                        lastUsed: new Date()
                    }
                },
                { new: true }
            );
      
            if (atm) {
                appLogger.info(`ATM ${atmId} cash updated to ${newAmount}`);
            }
            return atm;
        } catch (error) {
            appLogger.error(`Error updating ATM cash: ${error}`);
            throw error;
        }
    }
} 

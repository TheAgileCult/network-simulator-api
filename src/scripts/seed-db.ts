import { faker } from "@faker-js/faker";
import mongoose from "mongoose";
import { connectDB } from "../db";
import { Customer } from "../models/customers";
import bcrypt from "bcrypt";
import { appLogger } from "../logger";
import { ATM } from "../models/atms";
import { NetworkType } from "../enums";

interface ICustomerData {
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    address: string;
    accounts: IAccount[];
    cards: ICard[];
    transactions: ITransaction[];
}

// Constants
const CITIES = [
    "New York City",
    "Los Angeles", 
    "Chicago",
    "Houston",
    "Phoenix",
    "Philadelphia",
    "San Antonio",
    "San Diego",
    "Dallas",
    "San Jose"
];

const DEFAULT_PIN = "1234";
const DEFAULT_CUSTOMER_COUNT = 4;

// Helper Functions
const generateATMId = (index: number): string => {
    return `ATM${String(index).padStart(4, "0")}`;
};

const generateFakeATM = (index: number) => {
    return {
        atmId: generateATMId(index),
        location: faker.helpers.arrayElement(CITIES),
        supportedCurrency: "USD",
        availableCash: faker.number.float({ min: 20000, max: 200000, fractionDigits: 2 })
    };
};

const generateAccount = (accountType: IAccount["accountType"]) => ({
    accountNumber: faker.string.numeric(12),
    accountType,
    balance: faker.number.float({ min: 1000, max: 10000, fractionDigits: 2 }),
    currency: "USD",
    isActive: true,
    lastTransaction: faker.date.recent(),
});

const generateCard = (cardNumber: string, hashedPin: string) => ({
    cardNumber,
    expiryDate: faker.date.future(),
    pin: hashedPin,
    dailyWithdrawalLimit: 1000,
    isBlocked: false,
    lastUsed: faker.date.recent()
});

const generateFakeCustomer = async (network: NetworkType, customConfig: { cardNumber?: string; allAccountTypes?: boolean } = {}): Promise<ICustomerData> => {
    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(DEFAULT_PIN, salt);

    const cardNumber = customConfig.cardNumber || faker.finance.creditCardNumber({ issuer: network.toLowerCase() });
    const accountTypes = ["checking", "savings", "credit", "loan"] as const;
    
    const accounts = customConfig.allAccountTypes
        ? accountTypes.map(type => generateAccount(type))
        : [generateAccount(faker.helpers.arrayElement(accountTypes))];

    return {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        dateOfBirth: faker.date.birthdate(),
        address: faker.location.streetAddress(),
        accounts,
        cards: [generateCard(cardNumber, hashedPin)],
        transactions: []
    };
};

// Seeding Functions
const seedATMs = async (count: number = 10) => {
    try {
        // Connect to shared ATM database
        const sharedMongoUri = process.env.SHARED_MONGODB_URI || "mongodb://localhost:27017/shared-atm-network";
        const sharedConnection = await mongoose.createConnection(sharedMongoUri);
        
        // Create ATM model on shared connection
        const SharedATM = sharedConnection.model("ATM", ATM.schema);
        
        await SharedATM.deleteMany({});
        
        const atms = Array.from({ length: count }, (_, i) => 
            generateFakeATM(i + 1)
        );

        await SharedATM.insertMany(atms);
        appLogger.info(`${count} ATMs seeded successfully in shared database`);
        
        // Close shared connection
        await sharedConnection.close();
    } catch (error) {
        appLogger.error("Error seeding ATMs:", error);
        throw error;
    }
};

const seedCustomersForNetwork = async (network: NetworkType, count: number = DEFAULT_CUSTOMER_COUNT) => {
    try {
        await Customer.deleteMany({});
        appLogger.debug(`Cleared existing customer data for ${network} network`);

        const customers = [];

        const specialCardNumbers: Record<NetworkType, string> = {
            [NetworkType.VISA]: "4111111111111111",
            [NetworkType.MASTERCARD]: "5111111111111118",
            [NetworkType.AMEX]: "341111111111111"
        };        
        const specialCustomer = await generateFakeCustomer(network, {
            cardNumber: specialCardNumbers[network],
            allAccountTypes: true
        });
        customers.push(specialCustomer);

        // Regular customers
        for (let i = 1; i < count; i++) {
            customers.push(await generateFakeCustomer(network));
        }

        await Customer.insertMany(customers);
        logCustomerData(customers, network);
        
        appLogger.debug(`Successfully seeded ${network} database with ${count} customers`);
    } catch (error) {
        appLogger.error(`Error seeding ${network} customers:`, error);
        throw error;
    }
};

const logCustomerData = (customers: ICustomerData[], network: NetworkType) => {
    customers.forEach((customer, index) => {
        appLogger.info(`${network} Test Customer ${index + 1}:`, {
            name: `${customer.firstName} ${customer.lastName}`,
            cardNumber: customer.cards[0].cardNumber,
            accountNumbers: customer.accounts.map(acc => ({
                number: acc.accountNumber,
                type: acc.accountType
            })),
            pin: DEFAULT_PIN,
        });
    });
};

const seedDatabase = async (customerCount: number = DEFAULT_CUSTOMER_COUNT, atmCount: number = 10) => {
    try {
        const networkType = process.env.NETWORK_TYPE as NetworkType;
        if (!networkType || !Object.values(NetworkType).includes(networkType)) {
            throw new Error("Invalid or missing NETWORK_TYPE environment variable");
        }

        await connectDB();
        
        // Seed ATMs in shared database only when running as VISA network
        // to avoid duplicate ATM seeding
        if (networkType === NetworkType.VISA) {
            await seedATMs(atmCount);
        }
        
        await seedCustomersForNetwork(networkType, customerCount);
        
        appLogger.info(`Database seeded successfully for ${networkType} network`);
        process.exit(0);
    } catch (error) {
        appLogger.error("Error seeding database:", error);
        process.exit(1);
    }
};

seedDatabase();

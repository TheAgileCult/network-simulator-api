import { faker } from "@faker-js/faker";
import { connectDB } from "../db";
import { Customer } from "../models/customers";
import bcrypt from "bcrypt";
import { appLogger } from "../logger";
import { ATM } from "../models/atms";

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


const generateFakeCustomer = async (customConfig: { cardNumber?: string; allAccountTypes?: boolean } = {}): Promise<ICustomerData> => {
    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(DEFAULT_PIN, salt);

    const cardNumber = customConfig.cardNumber || faker.finance.creditCardNumber();
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
        await ATM.deleteMany({});
        
        const atms = Array.from({ length: count }, (_, i) => 
            generateFakeATM(i + 1)
        );

        await ATM.insertMany(atms);
        appLogger.info(`${count} ATMs seeded successfully`);
    } catch (error) {
        appLogger.error("Error seeding ATMs:", error);
        throw error;
    }
};

const seedCustomers = async (count: number = DEFAULT_CUSTOMER_COUNT) => {
    try {
        await Customer.deleteMany({});
        appLogger.debug("Cleared existing customer data");

        const customers = [];
        
        // Special customer with all account types
        const specialCustomer = await generateFakeCustomer({
            cardNumber: "1111222233334444",
            allAccountTypes: true
        });
        customers.push(specialCustomer);

        // Regular customers
        for (let i = 1; i < count; i++) {
            customers.push(await generateFakeCustomer());
        }

        await Customer.insertMany(customers);
        logCustomerData(customers);
        
        appLogger.debug(`Successfully seeded database with ${count} customers`);
    } catch (error) {
        appLogger.error("Error seeding customers:", error);
        throw error;
    }
};

const logCustomerData = (customers: ICustomerData[]) => {
    customers.forEach((customer, index) => {
        appLogger.info(`Test Customer ${index + 1}:`, {
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
        await connectDB();
        await seedATMs(atmCount);
        await seedCustomers(customerCount);
        
        appLogger.info("Database seeded successfully");
        process.exit(0);
    } catch (error) {
        appLogger.error("Error seeding database:", error);
        process.exit(1);
    }
};

seedDatabase();

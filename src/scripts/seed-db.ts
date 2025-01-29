import { faker } from "@faker-js/faker";
import { connectDB } from "../db";
import { Customer } from "../models/customers";
import { ATM } from "../models/atms";
import bcrypt from "bcrypt";
import { appLogger } from "../logger";

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
    const supportedCurrencies = ["USD", "EUR", "GBP"];
    return {
        atmId: generateATMId(index),
        location: faker.helpers.arrayElement(CITIES),
        supportedCurrencies,
        availableCash: new Map(
            supportedCurrencies.map(currency => [
                currency,
                faker.number.float({ min: 20000, max: 200000, fractionDigits: 2 })
            ])
        )
    };
};

const generateFakeAccount = (
    currency: "USD" | "EUR" | "GBP", 
    accountType: "checking" | "savings" | "credit" | "loan"
) => {
    return {
        accountNumber: faker.string.numeric(12),
        accountType,
        balance: faker.number.float({ min: 1000, max: 10000, fractionDigits: 2 }),
        currency,
        isActive: true,
        lastTransaction: faker.date.recent(),
        exchangeRates: new Map([
            ["USD", 1],
            ["EUR", 0.85],
            ["GBP", 0.73]
        ]),
        lastRateUpdate: new Date()
    };
};

const generateCard = (cardNumber: string, hashedPin: string) => ({
    cardNumber,
    expiryDate: faker.date.future(),
    pin: hashedPin,
    dailyWithdrawalLimit: faker.number.float({ min: 1000, max: 3000, fractionDigits: 2 }),
    isBlocked: false,
    lastUsed: faker.date.recent()
});

const generateFakeCustomer = async (
    customConfig: { 
        cardNumber?: string; 
        allAccountTypes?: boolean;
        multiCurrency?: boolean;
    } = {}
) => {
    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(DEFAULT_PIN, salt);
    const cardNumber = customConfig.cardNumber || faker.string.numeric(16);

    let accounts = [];
    const accountTypes = ["checking", "savings", "credit", "loan"] as const;
    const currencies = ["USD", "EUR", "GBP"] as const;

    if (customConfig.allAccountTypes && customConfig.multiCurrency) {
        // Generate one account of each type for each currency
        for (const currency of currencies) {
            for (const accountType of accountTypes) {
                accounts.push(generateFakeAccount(currency, accountType));
            }
        }
    } else if (customConfig.allAccountTypes) {
        // Generate one account of each type in USD
        accounts = accountTypes.map(type => generateFakeAccount("USD", type));
    } else if (customConfig.multiCurrency) {
        // Generate one checking account for each currency
        accounts = currencies.map(currency => generateFakeAccount(currency, "checking"));
    } else {
        // Generate a single random account
        accounts = [
            generateFakeAccount(
                faker.helpers.arrayElement(currencies),
                faker.helpers.arrayElement(accountTypes)
            )
        ];
    }

    return {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        dateOfBirth: faker.date.birthdate(),
        address: faker.location.streetAddress(),
        accounts,
        cards: [generateCard(cardNumber, hashedPin)],
        transactions: [],
    };
};

const logCustomerData = (customers: any[]) => {
    customers.forEach((customer, index) => {
        appLogger.info(`Test Customer ${index + 1}:`, {
            name: `${customer.firstName} ${customer.lastName}`,
            cardNumber: customer.cards[0].cardNumber,
            accounts: customer.accounts.map((acc: any) => ({
                number: acc.accountNumber,
                type: acc.accountType,
                currency: acc.currency,
                balance: acc.balance
            })),
            pin: DEFAULT_PIN,
        });
    });
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
        
        // Special customer with all account types and currencies
        const specialCustomer = await generateFakeCustomer({
            cardNumber: "1111222233334444",
            allAccountTypes: true,
            multiCurrency: true
        });
        customers.push(specialCustomer);

        // Regular customers
        for (let i = 1; i < count; i++) {
            customers.push(await generateFakeCustomer({
                multiCurrency: faker.datatype.boolean() // Randomly give some customers multi-currency accounts
            }));
        }

        await Customer.insertMany(customers);
        logCustomerData(customers);
        
        appLogger.debug(`Successfully seeded database with ${count} customers`);
    } catch (error) {
        appLogger.error("Error seeding customers:", error);
        throw error;
    }
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
import { faker } from "@faker-js/faker";
import { connectDB } from "../db";
import { Customer } from "../models/customers";
import bcrypt from "bcrypt";
import { appLogger } from "../logger";

const generateFakeCustomer = async () => {
    const pin = "1234";
    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(pin, salt);

    const accountNumber = faker.string.numeric(12);
    const cardNumber = faker.string.numeric(16);
    const accountTypes = ["checking", "savings", "credit", "loan"] as const;
    const selectedAccountType = faker.helpers.arrayElement(accountTypes);

    const account: IAccount = {
        accountNumber,
        accountType: selectedAccountType,
        balance: faker.number.float({ min: 1000, max: 10000, fractionDigits: 2 }),
        currency: "USD",
        isActive: true,
        lastTransaction: faker.date.recent(),
    };

    return {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        dateOfBirth: faker.date.birthdate(),
        address: faker.location.streetAddress(),
        accounts: [account],
        cards: [
            {
                cardNumber,
                expiryDate: faker.date.future(),
                pin: hashedPin,
                dailyWithdrawalLimit: 1000,
                isBlocked: false,
                lastUsed: faker.date.recent()
            }
        ],
        transactions: []
    };
};

const seedDatabase = async (count: number = 2) => {
    try {
        await connectDB();

        // Clear existing data
        await Customer.deleteMany({});
        appLogger.debug("Cleared existing customer data");

        // Generate and insert new customers
        const customers = [];
        for (let i = 0; i < count; i++) {
            const customerData = await generateFakeCustomer();
            customers.push(customerData);
        }

        await Customer.insertMany(customers);

        appLogger.debug(`Successfully seeded database with ${count} customers`);

        // Log the test data for reference
        customers.forEach((customer, index) => {
            appLogger.log(`Test Customer ${index + 1}:`, {
                name: `${customer.firstName} ${customer.lastName}`,
                cardNumber: customer.cards[0].cardNumber,
                accountNumber: customer.accounts[0].accountNumber,
                pin: "1234", // Log the default PIN for testing
            });
        });

        process.exit(0);
    } catch (error) {
        appLogger.error("Error seeding database:", error);
        process.exit(1);
    }
};

seedDatabase(); 

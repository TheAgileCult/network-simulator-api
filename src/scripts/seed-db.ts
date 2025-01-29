import { faker } from "@faker-js/faker";
import { connectDB } from "../db";
import { Customer } from "../models/customers";
import bcrypt from "bcrypt";
import { appLogger } from "../logger";

const generateFakeAccount = (currency: "USD" | "EUR" | "GBP", accountType: "checking" | "savings" | "credit" | "loan"): IAccount => {
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

const generateFakeCustomer = async () => {
  const pin = "1234";
  const salt = await bcrypt.genSalt(10);
  const hashedPin = await bcrypt.hash(pin, salt);
  const cardNumber = faker.string.numeric(16);

  // Generate multiple accounts with different currencies and types
  const accounts: IAccount[] = [
    generateFakeAccount("USD", "checking"),
    generateFakeAccount("EUR", "savings"),
    generateFakeAccount("GBP", "credit"),
    generateFakeAccount("USD", "loan"),
    generateFakeAccount("EUR", "credit")
  ];

  return {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    dateOfBirth: faker.date.birthdate(),
    address: faker.location.streetAddress(),
    accounts,
    cards: [
      {
        cardNumber,
        expiryDate: faker.date.future(),
        pin: hashedPin,
        dailyWithdrawalLimit: 1000,
        isBlocked: false,
        lastUsed: faker.date.recent(),
      },
      {
        cardNumber: faker.string.numeric(16),
        expiryDate: faker.date.future(),
        pin: hashedPin,
        dailyWithdrawalLimit: 2000,
        isBlocked: false,
        lastUsed: faker.date.recent(),
      }
    ],
    transactions: [],
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
        cards: customer.cards.map(card => card.cardNumber),
        accounts: customer.accounts.map(acc => ({
          number: acc.accountNumber,
          type: acc.accountType,
          currency: acc.currency,
          balance: acc.balance
        })),
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

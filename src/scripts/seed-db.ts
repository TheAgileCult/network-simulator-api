import { faker } from "@faker-js/faker";
import { connectDB } from "../db";
import { Customer } from "../models/customers";
import bcrypt from "bcrypt";

const generateFakeCustomer = async () => {
    const pin = "1234";
    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(pin, salt);

    const accountNumber = faker.string.numeric(12);
    const cardNumber = faker.string.numeric(16);
    const cvv = faker.string.numeric(3);

    const accountTypes = ["checking", "savings", "credit", "loan"] as const;
    const selectedAccountType = faker.helpers.arrayElement(accountTypes);

    const account = {
        accountNumber,
        accountType: selectedAccountType,
        balance: faker.number.float({ min: 1000, max: 10000, fractionDigits: 2 }),
        currency: "USD",
        minimumBalance: 0,
        isActive: true,
        lastTransaction: faker.date.recent(),
        interestRate: selectedAccountType === "savings" || selectedAccountType === "loan"
            ? faker.number.float({ min: 0.01, max: 0.1, fractionDigits: 4 })
            : undefined,
        creditLimit: selectedAccountType === "credit"
            ? faker.number.float({ min: 1000, max: 50000, fractionDigits: 2 })
            : undefined,
        loanAmount: selectedAccountType === "loan"
            ? faker.number.float({ min: 5000, max: 100000, fractionDigits: 2 })
            : undefined,
        loanStartDate: selectedAccountType === "loan"
            ? faker.date.past()
            : undefined,
        loanEndDate: selectedAccountType === "loan"
            ? faker.date.future()
            : undefined
    };

    return {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        dateOfBirth: faker.date.birthdate(),
        email: faker.internet.email(),
        phoneNumber: faker.phone.number(),
        address: faker.location.streetAddress(),
        identificationNumber: faker.string.alphanumeric(10),
        nationality: faker.location.country(),
        employmentStatus: faker.helpers.arrayElement([
            "employed",
            "self-employed",
            "unemployed",
            "retired"
        ]),
        annualIncome: faker.number.float({ min: 20000, max: 200000, fractionDigits: 2 }),
        creditScore: faker.number.int({ min: 300, max: 850 }),
        isBlacklisted: false,
        preferredLanguage: "en",
        accounts: [account],
        cards: [
            {
                cardNumber,
                expiryDate: faker.date.future(),
                pin: hashedPin,
                cardType: faker.helpers.arrayElement(["debit", "credit"]),
                cvv,
                dailyWithdrawalLimit: 1000,
                isBlocked: false,
                lastUsed: faker.date.recent()
            }
        ],
        transactions: Array.from({ length: 5 }, () => ({
            transactionId: faker.string.uuid(),
            type: faker.helpers.arrayElement([
                "withdrawal",
                "deposit",
                "transfer",
                "payment"
            ]),
            amount: faker.number.float({ min: 10, max: 1000, fractionDigits: 2 }),
            currency: "USD",
            timestamp: faker.date.recent(),
            status: faker.helpers.arrayElement([
                "completed",
                "pending",
                "failed"
            ]),
            description: faker.finance.transactionDescription(),
            location: faker.location.city()
        }))
    };
};

const seedDatabase = async (count: number = 5) => {
    try {
        await connectDB();

        // Clear existing data
        await Customer.deleteMany({});
        console.log("Cleared existing customer data");

        // Generate and insert new customers
        const customers = [];
        for (let i = 0; i < count; i++) {
            const customerData = await generateFakeCustomer();
            customers.push(customerData);
        }

        await Customer.insertMany(customers);

        console.log(`Successfully seeded database with ${count} customers`);

        // Log the test data for reference
        customers.forEach((customer, index) => {
            console.log(`Test Customer ${index + 1}:`, {
                name: `${customer.firstName} ${customer.lastName}`,
                email: customer.email,
                cardNumber: customer.cards[0].cardNumber,
                accountNumber: customer.accounts[0].accountNumber,
                pin: "1234" // Log the default PIN for testing
            });
        });

        process.exit(0);
    } catch (error) {
        console.error("Error seeding database:", error);
        process.exit(1);
    }
};

seedDatabase(); 

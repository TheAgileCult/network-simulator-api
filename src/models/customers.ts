import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import { TransactionSchema } from "./transactions";

export interface ICustomerDocument extends ICustomer, mongoose.Document {
    validatePin(cardNumber: string, pin: string): Promise<boolean>;
}

const CardSchema = new Schema<ICard>({
    cardNumber: {
        type: String,
        required: true,
        unique: true
    },
    expiryDate: {
        type: Date,
        required: true
    },
    pin: {
        type: String,
        required: true
    },
    cardType: {
        type: String,
        required: true,
        enum: ["debit", "credit"]
    },
    cvv: {
        type: String,
        required: true
    },
    dailyWithdrawalLimit: {
        type: Number,
        required: true,
        default: 1000
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    lastUsed: {
        type: Date,
        default: Date.now
    }
});

const AccountSchema = new Schema<IAccount>({
    accountNumber: {
        type: String,
        required: true
    },
    accountType: {
        type: String,
        required: true,
        enum: ["checking", "savings", "credit", "loan"]
    },
    balance: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        required: true,
        default: "USD"
    },
    interestRate: {
        type: Number,
        required: function () {
            return this.accountType === "savings" || this.accountType === "loan";
        }
    },
    creditLimit: {
        type: Number,
        required: function () {
            return this.accountType === "credit";
        }
    },
    loanAmount: {
        type: Number,
        required: function () {
            return this.accountType === "loan";
        }
    },
    loanStartDate: {
        type: Date,
        required: function () {
            return this.accountType === "loan";
        }
    },
    loanEndDate: {
        type: Date,
        required: function () {
            return this.accountType === "loan";
        }
    },
    minimumBalance: {
        type: Number,
        required: true,
        default: 0
    },
    isActive: {
        type: Boolean,
        required: true,
        default: true
    },
    lastTransaction: {
        type: Date,
        default: Date.now
    }
});

const CustomerSchema = new Schema<ICustomerDocument>({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    dateOfBirth: {
        type: Date,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phoneNumber: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    accounts: [AccountSchema],
    cards: [CardSchema],
    transactions: [TransactionSchema],
    identificationNumber: {
        type: String,
        required: true,
        unique: true
    },
    nationality: {
        type: String,
        required: true
    },
    employmentStatus: {
        type: String,
        required: true
    },
    annualIncome: {
        type: Number,
        required: true
    },
    creditScore: {
        type: Number,
        required: true,
        min: 300,
        max: 850
    },
    isBlacklisted: {
        type: Boolean,
        default: false
    },
    preferredLanguage: {
        type: String,
        default: "en"
    }
}, {
    timestamps: true
});

// Middleware to hash PIN before saving
CustomerSchema.pre("save", async function (next) {
    // Only hash the PIN if it has been modified (or is new)
    const modifiedCards = this.cards.filter(card => {
        const cardDoc = card as unknown as mongoose.Document;
        return cardDoc.isModified("pin");
    });

    for (const card of modifiedCards) {
        const salt = await bcrypt.genSalt(10);
        card.pin = await bcrypt.hash(card.pin, salt);
    }

    next();
});

// Method to validate PIN
CustomerSchema.methods.validatePin = async function (cardNumber: string, pin: string): Promise<boolean> {
    const card = this.cards.find((c: ICard) => c.cardNumber === cardNumber);
    if (!card) return false;

    return bcrypt.compare(pin, card.pin);
};

// Ensure account numbers are unique within a customer
CustomerSchema.path("accounts").validate(function (accounts: IAccount[]) {
    const accountNumbers = accounts.map(acc => acc.accountNumber);
    const uniqueAccountNumbers = new Set(accountNumbers);
    return accountNumbers.length === uniqueAccountNumbers.size;
}, "Account numbers must be unique for each customer");

export const Customer = mongoose.model<ICustomerDocument>("Customer", CustomerSchema); 

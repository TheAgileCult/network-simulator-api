import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";

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
    required: true,
  },
  accountType: {
    type: String,
    required: true,
    enum: ["checking", "savings", "credit", "loan"],
  },
  balance: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    required: true,
    enum: ["USD", "EUR", "GBP"],
    default: "USD",
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastTransaction: {
    type: Date,
    default: Date.now,
  },
  exchangeRates: {
    type: Map,
    of: Number,
    default: new Map(),
  },
  lastRateUpdate: {
    type: Date,
    default: Date.now,
  },
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
    address: {
        type: String,
        required: true
    },
    accounts: [AccountSchema],
    cards: [CardSchema],
    transactions: [{
        type: Schema.Types.ObjectId,
        ref: "Transaction"
    }]
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

// Add validation to ensure one account type per currency
CustomerSchema.path("accounts").validate(function(accounts: IAccount[]) {
    const accountTypeCurrency = new Set();
    for (const account of accounts) {
        const key = `${account.accountType}-${account.currency}`;
        if (accountTypeCurrency.has(key)) {
            return false; // Duplicate account type-currency combination found
        }
        accountTypeCurrency.add(key);
    }
    return true;
}, "Cannot have multiple accounts of the same type in the same currency");


export const Customer = mongoose.model<ICustomerDocument>("Customer", CustomerSchema); 

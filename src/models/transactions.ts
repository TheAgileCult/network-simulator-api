import { Schema } from "mongoose";


export const TransactionSchema = new Schema<ITransaction>({
    transactionId: {
        type: String,
        required: true,
        unique: true
    },
    type: {
        type: String,
        required: true,
        enum: ["withdrawal", "deposit", "transfer", "payment"]
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        required: true,
        default: "USD"
    },
    timestamp: {
        type: Date,
        required: true,
        default: Date.now
    },
    status: {
        type: String,
        required: true,
        enum: ["pending", "completed", "failed"]
    },
    description: String,
    location: String
});

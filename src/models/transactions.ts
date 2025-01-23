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
        enum: ["withdrawal", "deposit", "payment", "inquiry"]
    },
    amount: {
        type: Number,
        required: false
    },
    currency: {
        type: String,
        required: function() {
            return this.type !== "inquiry";
        },
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
    atmId: {
        type: String,
        required: true
    }
});

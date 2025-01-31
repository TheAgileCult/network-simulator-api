import { Schema, model } from "mongoose";


const atmSchema = new Schema<IATM>({
    atmId: {
        type: String,
        required: true,
        unique: true,
    },
    location: {
        type: String,
        required: true,
    },
    supportedCurrency: {
        type: String,
        required: true,
        enum: ["USD", "EUR", "GBP"],
        default: "USD",
    },
    availableCash: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
    },
    lastUsed: {
        type: Date,
        default: Date.now,
    },
});

// Middleware to update lastUsed timestamp
atmSchema.pre("save", function(next) {
    this.lastUsed = new Date();
    next();
});

export const ATM = model<IATM>("ATM", atmSchema); 

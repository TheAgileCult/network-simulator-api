import dotenv from "dotenv";
import fetch from "node-fetch";
import schedule from "node-schedule";
import fs from "fs";
import path from "path";

dotenv.config();

const JSON_PATH = path.join(__dirname, "../rates.json");
const API_KEY = process.env.API_KEY;
const BASE_CURRENCY = "USD";

async function fetchRates(): Promise<ExchangeRates | null> {
    try {
        const response = await fetch(
            `https://api.apilayer.com/exchangerates_data/latest?base=${BASE_CURRENCY}`,
            {
                headers: { apikey: API_KEY || "" },
            }
        );

        if (!response.ok) throw new Error("API request failed");
        const data = (await response.json()) as RatesResponse;
        if (!data.rates) throw new Error("Invalid API response");

        return {
            usdToEur: data.rates.EUR,
            usdToGbp: data.rates.GBP,
        };
    } catch (error) {
        console.error(
            "Error fetching rates:",
            error instanceof Error ? error.message : "Unknown error"
        );
        return null;
    }
}

function calculateRates(baseRates: ExchangeRates): RatesData {
    const { usdToEur, usdToGbp } = baseRates;

    return {
        date: new Date().toISOString().split("T")[0], // Current date in YYYY-MM-DD
        rates: {
            USD: {
                EUR: usdToEur,
                GBP: usdToGbp,
            },
            EUR: {
                USD: 1 / usdToEur,
                GBP: usdToGbp / usdToEur,
            },
            GBP: {
                USD: 1 / usdToGbp,
                EUR: usdToEur / usdToGbp,
            },
        },
    };
}

export async function updateRates(): Promise<void> {
    const baseRates = await fetchRates();
    if (!baseRates) return;

    const newData = calculateRates(baseRates);

    fs.writeFile(
        JSON_PATH,
        JSON.stringify(newData, null, 2),
        (err: NodeJS.ErrnoException | null) => {
            if (err) {
                console.error("Error writing file:", err);
            } else {
                console.log(`Rates updated successfully for ${newData.date}`);
            }
        }
    );
}

// Only run the scheduler if this file is run directly
if (require.main === module) {
    // Schedule daily update at midnight
    schedule.scheduleJob("0 0 * * *", () => {
        console.log("Running daily rate update...");
        updateRates();
    });

    // Initial update
    updateRates();
}

interface ExchangeRates {
    usdToEur: number;
    usdToGbp: number;
}

interface RatesResponse {
    rates: {
        EUR: number;
        GBP: number;
    };
}

interface RatesData {
    date: string;
    rates: {
        USD: {
            EUR: number;
            GBP: number;
        };
        EUR: {
            USD: number;
            GBP: number;
        };
        GBP: {
            USD: number;
            EUR: number;
        };
    };
}

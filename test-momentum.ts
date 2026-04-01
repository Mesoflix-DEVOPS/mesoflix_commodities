import { AurumMomentumEngine, Candle, calculateRSI } from './src/lib/automation/engines/gold';

// Generate 50 dummy candles (1H resolution)
const candles: Candle[] = [];
let basePrice = 2000;

for (let i = 0; i < 50; i++) {
    // Force a strong uptrend so RSI goes above 55
    basePrice += 1.5;

    // Create a resistance point around 2020 near candle 40
    let closePrice = basePrice;
    if (i === 40) closePrice = 2020; // Sets the resistance top

    // On the last candle, break resistance strongly
    if (i === 49) closePrice = 2035;

    candles.push({
        timestamp: new Date(Date.now() - (50 - i) * 3600 * 1000).toISOString(),
        open: closePrice - 1,
        close: closePrice + 1, // Bullish close
        high: closePrice + 2,
        low: closePrice - 2,
        volume: 150
    });
}

console.log("--- Testing Aurum Momentum Breakout ---");
console.log(`Latest Price: ${candles[candles.length - 1].close}`);

let highestHigh = 0;
let lowestLow = 999999;
for (let i = candles.length - 48; i < candles.length - 1; i++) {
    if (candles[i].high > highestHigh) highestHigh = candles[i].high;
    if (candles[i].low < lowestLow) lowestLow = candles[i].low;
}
console.log(`Highest High (Res): ${highestHigh}, Lowest Low (Sup): ${lowestLow}`);

const rsi = calculateRSI(candles, 14);
console.log(`RSI(14): ${rsi}`);

const signal = AurumMomentumEngine.analyze(candles, 'Balanced');
console.log(JSON.stringify(signal, null, 2));

console.log("Test execution finished.");

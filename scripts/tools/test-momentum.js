"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var gold_1 = require("./src/lib/automation/engines/gold");
// Generate 50 dummy candles (1H resolution)
var candles = [];
var basePrice = 2000;
for (var i = 0; i < 50; i++) {
    // Force a strong uptrend so RSI goes above 55
    basePrice += 1.5;
    // Create a resistance point around 2020 near candle 40
    var closePrice = basePrice;
    if (i === 40)
        closePrice = 2020; // Sets the resistance top
    // On the last candle, break resistance strongly
    if (i === 49)
        closePrice = 2035;
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
console.log("Latest Price: ".concat(candles[candles.length - 1].close));
var highestHigh = 0;
var lowestLow = 999999;
for (var i = candles.length - 48; i < candles.length - 1; i++) {
    if (candles[i].high > highestHigh)
        highestHigh = candles[i].high;
    if (candles[i].low < lowestLow)
        lowestLow = candles[i].low;
}
console.log("Highest High (Res): ".concat(highestHigh, ", Lowest Low (Sup): ").concat(lowestLow));
var rsi = (0, gold_1.calculateRSI)(candles, 14);
console.log("RSI(14): ".concat(rsi));
var signal = gold_1.AurumMomentumEngine.analyze(candles, 'Balanced');
console.log(JSON.stringify(signal, null, 2));
console.log("Test execution finished.");

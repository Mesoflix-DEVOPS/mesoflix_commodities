
function calculateSize(capital, riskPercentage, entryPrice, stopLoss) {
    const riskPerTrade = capital * (riskPercentage / 100);
    const slDistance = Math.abs(entryPrice - stopLoss);
    let calculatedSize = slDistance > 0 ? riskPerTrade / slDistance : 0.1;
    return Math.max(0.1, parseFloat(calculatedSize.toFixed(2)));
}

const entry = 2500;
const sl = 2495; // 5 point stop

console.log("--- Conservative Profile (1%) ---");
console.log("$50 Capital:", calculateSize(50, 1.0, entry, sl), "lots");
console.log("$500 Capital:", calculateSize(500, 1.0, entry, sl), "lots");
console.log("$5000 Capital:", calculateSize(5000, 1.0, entry, sl), "lots");

console.log("\n--- Balanced Profile (2.5%) ---");
console.log("$50 Capital:", calculateSize(50, 2.5, entry, sl), "lots");
console.log("$500 Capital:", calculateSize(500, 2.5, entry, sl), "lots");
console.log("$5000 Capital:", calculateSize(5000, 2.5, entry, sl), "lots");

console.log("\n--- Aggressive Profile (5%) ---");
console.log("$50 Capital:", calculateSize(50, 5.0, entry, sl), "lots");
console.log("$500 Capital:", calculateSize(500, 5.0, entry, sl), "lots");
console.log("$5000 Capital:", calculateSize(5000, 5.0, entry, sl), "lots");

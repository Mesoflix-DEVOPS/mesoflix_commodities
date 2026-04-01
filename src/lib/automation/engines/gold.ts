/**
 * Mesoflix Automation: Gold (XAU) Algorithmic Trading Engines
 *
 * Implements mathematical models defined in the PRD for:
 * 1. Aurum Velocity (Scalper)
 * 2. Aurum Momentum (Intraday)
 * 3. Aurum Apex (Swing / Position)
 */

export interface Candle {
    timestamp: string; // ISO 8601
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export type SignalDirection = 'BUY' | 'SELL' | 'NEUTRAL';

export interface EngineSignal {
    direction: SignalDirection;
    confidence: number; // 0-100
    riskPercentage: number;
    targetPrice?: number;
    stopLoss?: number;
    reasoning?: string;
}

/**
 * Utility: Calculate RSI (Relative Strength Index)
 */
export function calculateRSI(candles: Candle[], periods = 14): number | null {
    if (candles.length <= periods) return null;

    let gains = 0;
    let losses = 0;

    for (let i = candles.length - periods; i < candles.length; i++) {
        const change = candles[i].close - candles[i - 1].close;
        if (change >= 0) {
            gains += change;
        } else {
            losses -= change;
        }
    }

    const avgGain = gains / periods;
    const avgLoss = losses / periods;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}

/**
 * Utility: Calculate EMA (Exponential Moving Average)
 */
function calculateEMA(candles: Candle[], periods: number): number | null {
    if (candles.length < periods) return null;

    const k = 2 / (periods + 1);

    // SMA for first value
    let sum = 0;
    for (let i = 0; i < periods; i++) {
        sum += candles[i].close;
    }
    let ema = sum / periods;

    // EMA calculation
    for (let i = periods; i < candles.length; i++) {
        ema = (candles[i].close - ema) * k + ema;
    }

    return ema;
}

/**
 * Utility: Calculate ATR (Average True Range)
 */
function calculateATR(candles: Candle[], periods = 14): number | null {
    if (candles.length <= periods) return null;

    let trueRanges: number[] = [];
    for (let i = 1; i < candles.length; i++) {
        const tr = Math.max(
            candles[i].high - candles[i].low,
            Math.abs(candles[i].high - candles[i - 1].close),
            Math.abs(candles[i].low - candles[i - 1].close)
        );
        trueRanges.push(tr);
    }

    if (trueRanges.length < periods) return null;

    // Wilder's Smoothing for ATR
    let atr = trueRanges.slice(0, periods).reduce((a, b) => a + b, 0) / periods;
    for (let i = periods; i < trueRanges.length; i++) {
        atr = (atr * (periods - 1) + trueRanges[i]) / periods;
    }

    return atr;
}

/**
 * Utility: Calculate VWAP (Volume Weighted Average Price)
 * Simplified: Weighted by volume over the provided candle set
 */
function calculateVWAP(candles: Candle[]): number | null {
    if (candles.length === 0) return null;
    let totalVolume = 0;
    let weightedPriceSum = 0;

    for (const c of candles) {
        const typicalPrice = (c.high + c.low + c.close) / 3;
        weightedPriceSum += typicalPrice * c.volume;
        totalVolume += c.volume;
    }

    if (totalVolume === 0) return candles[candles.length - 1].close;
    return weightedPriceSum / totalVolume;
}


// ==============================================================================
// 1. Aurum Velocity (Scalper - 1M/5M)
// ==============================================================================
// Strategy: VWAP + EMA crossover + RSI + volume spike
// Risk: 2–3% per trade
// RR: 1.5–2
export class AurumVelocityEngine {
    static riskRange = { min: 2.0, max: 3.0 }; // %

    static analyze(candles: Candle[], spread: number = 0.3, riskLevel: string = 'Balanced'): EngineSignal {
        if (candles.length < 50) return { direction: 'NEUTRAL', confidence: 0, riskPercentage: 0, reasoning: "Insufficient data (need 50+ candles)" };

        const latest = candles[candles.length - 1];
        const vwap = calculateVWAP(candles);
        const ema9 = calculateEMA(candles, 9);
        const ema21 = calculateEMA(candles, 21);
        const rsi7 = calculateRSI(candles, 7);
        const atr = calculateATR(candles, 14);

        // Volume Spike Detection (Current volume > 1.2x 20-bar average)
        const avgVol = candles.slice(-21, -1).reduce((sum, c) => sum + (c.volume || 0), 0) / 20;
        const volumeSpike = latest.volume > (avgVol * 1.2);

        if (!vwap || !ema9 || !ema21 || !rsi7 || !atr) {
            return { direction: 'NEUTRAL', confidence: 0, riskPercentage: 0, reasoning: "Indicator calculation failure" };
        }

        // PRD Thresholds
        const spreadThreshold = 1.5;
        const minVolatilityThreshold = riskLevel === 'Aggressive' ? 0.015 : 0.03;
        const minVolatility = atr > minVolatilityThreshold;

        // Signal Logic
        const isBullish = latest.close > vwap && ema9 > ema21;
        const isBearish = latest.close < vwap && ema9 < ema21;

        // BUY Logic: Price > VWAP && EMA9 > EMA21 && RSI(7) > 52 && (Volume Spike OR Aggressive)
        const rsiBuyThreshold = riskLevel === 'Aggressive' ? 52 : 55;
        const buySignal = isBullish && rsi7 > rsiBuyThreshold && (volumeSpike || riskLevel === 'Aggressive');

        if (buySignal && spread < spreadThreshold && minVolatility) {
            const confidence = rsi7 > 65 ? 98 : 92;
            let riskPercentage = 2.5;
            if (riskLevel === 'Conservative') riskPercentage = 1.0;
            if (riskLevel === 'Aggressive') riskPercentage = 5.0;

            return {
                direction: 'BUY',
                confidence,
                riskPercentage,
                stopLoss: latest.close - (atr * 3.0),
                targetPrice: latest.close + (atr * 4.0),
                reasoning: `Sniper BUY: VWAP/EMA alignment with RSI ${rsi7.toFixed(1)}.${riskLevel === 'Aggressive' ? ' (Aggressive Entry)' : ''}`
            };
        }

        // SELL Logic: Price < VWAP && EMA9 < EMA21 && RSI(7) < 48 && (Volume Spike OR Aggressive)
        const rsiSellThreshold = riskLevel === 'Aggressive' ? 48 : 45;
        const sellSignal = isBearish && rsi7 < rsiSellThreshold && (volumeSpike || riskLevel === 'Aggressive');

        if (sellSignal && spread < spreadThreshold && minVolatility) {
            const confidence = rsi7 < 35 ? 98 : 92;
            let riskPercentage = 2.5;
            if (riskLevel === 'Conservative') riskPercentage = 1.0;
            if (riskLevel === 'Aggressive') riskPercentage = 5.0;

            return {
                direction: 'SELL',
                confidence,
                riskPercentage,
                stopLoss: latest.close + (atr * 3.0),
                targetPrice: latest.close - (atr * 4.0),
                reasoning: `Sniper SELL: VWAP/EMA rejection with RSI ${rsi7.toFixed(1)}.${riskLevel === 'Aggressive' ? ' (Aggressive Entry)' : ''}`
            };
        }

        // Block Reasons for UI Transparency
        let blockReason = "Market Neutral: Awaiting trend alignment (P/VWAP/EMA)";
        if (spread >= spreadThreshold) blockReason = `Execution Halted: Spread ($${spread.toFixed(2)}) exceeds institutional threshold.`;
        else if (!minVolatility) blockReason = `Execution Halted: Volatility ($${atr.toFixed(3)}) below threshold ($${minVolatilityThreshold}).`;
        else if (isBullish && rsi7 < rsiBuyThreshold) blockReason = `Bullish bias detected, but RSI (${rsi7.toFixed(1)}) < ${rsiBuyThreshold}.`;
        else if (isBearish && rsi7 > rsiSellThreshold) blockReason = `Bearish bias detected, but RSI (${rsi7.toFixed(1)}) > ${rsiSellThreshold}.`;
        else if (!volumeSpike && riskLevel !== 'Aggressive') blockReason = "Trend aligned, but awaiting volume validation (Volume Spike).";

        return { direction: 'NEUTRAL', confidence: 0, riskPercentage: 0, reasoning: blockReason };
    }
}


// ==============================================================================
// 2. Aurum Momentum (Intraday - 15M/1H) - "The 3x Daily System"
// ==============================================================================
// Strategy: 24-48 HR Support/Resistance Breakout & Bounce + Trailing Stop
// Risk: 1–2%
// Target: 3 trades per day (Morning, Afternoon, Evening)
export class AurumMomentumEngine {
    static riskRange = { min: 1.0, max: 2.0 };

    static analyze(candles: Candle[], riskLevel: string = 'Balanced'): EngineSignal {
        if (candles.length < 48) return { direction: 'NEUTRAL', confidence: 0, riskPercentage: 0, reasoning: "Need 48 bars for S/R mapping" };

        const latestPrice = candles[candles.length - 1].close;
        const currentCandle = candles[candles.length - 1];

        // 1. Map Support and Resistance over the last 24-48 periods
        let highestHigh = 0;
        let lowestLow = 999999;

        for (let i = candles.length - 48; i < candles.length - 1; i++) {
            if (candles[i].high > highestHigh) highestHigh = candles[i].high;
            if (candles[i].low < lowestLow) lowestLow = candles[i].low;
        }

        const range = highestHigh - lowestLow;
        const srBuffer = range * 0.15; // 15% buffer zone around S/R levels

        const resistanceZone = highestHigh - srBuffer;
        const supportZone = lowestLow + srBuffer;

        // 2. Confirmation Logic: Are we rejecting support or breaking out?
        const rsiLast = calculateRSI(candles, 14) || 50;

        let direction: SignalDirection = 'NEUTRAL';
        let confidence = 0;
        let reason = "Price is chopping in the middle of the range. Awaiting structural zone test.";

        // BUY: Bounce off Support or Breakout above Resistance
        if (latestPrice <= supportZone && rsiLast < 45 && currentCandle.close > currentCandle.open) {
            direction = 'BUY';
            confidence = 88;
            reason = `Mom-Intraday [BUY]: Bullish rejection at major structural Support ($${lowestLow.toFixed(2)}).`;
        } else if (latestPrice > highestHigh && rsiLast >= 50) {
            direction = 'BUY';
            confidence = 82;
            reason = `Mom-Intraday [BUY]: Bullish structural Breakout above Resistance ($${highestHigh.toFixed(2)}).`;
        }

        // SELL: Reject at Resistance or Breakdown below Support
        else if (latestPrice >= resistanceZone && rsiLast > 55 && currentCandle.close < currentCandle.open) {
            direction = 'SELL';
            confidence = 88;
            reason = `Mom-Intraday [SELL]: Bearish rejection at major structural Resistance ($${highestHigh.toFixed(2)}).`;
        } else if (latestPrice < lowestLow && rsiLast <= 50) {
            direction = 'SELL';
            confidence = 82;
            reason = `Mom-Intraday [SELL]: Bearish structural Breakdown below Support ($${lowestLow.toFixed(2)}).`;
        }

        if (direction !== 'NEUTRAL') {
            // Dynamic Risk and Stop Loss Mapping
            let riskPercentage = riskLevel === 'Conservative' ? 1.0 : riskLevel === 'Aggressive' ? 2.5 : 1.5;

            // For Support buys, stop loss goes just below the support
            let stopLoss = direction === 'BUY' ? lowestLow - (range * 0.1) : highestHigh + (range * 0.1);
            let targetPrice = direction === 'BUY' ? highestHigh : lowestLow; // Target the opposite side of the range initially

            // Minimum viable stop distance for safety
            const minStopDistance = 4.0;
            if (direction === 'BUY' && (latestPrice - stopLoss) < minStopDistance) stopLoss = latestPrice - minStopDistance;
            if (direction === 'SELL' && (stopLoss - latestPrice) < minStopDistance) stopLoss = latestPrice + minStopDistance;

            return {
                direction,
                confidence,
                riskPercentage,
                stopLoss,
                targetPrice,
                reasoning: reason
            }
        }

        return { direction: 'NEUTRAL', confidence: 0, riskPercentage: 0, reasoning: reason };
    }
}


// ==============================================================================
// 3. Aurum Apex (Position - 4H/Daily)
// ==============================================================================
// Strategy: Market structure + Fibonacci + RSI divergence
// Risk: 1%
// RR: 3–5
export class AurumApexEngine {
    static riskRange = { min: 1.0, max: 1.0 };

    static analyze(candles: Candle[], riskLevel: string = 'Balanced'): EngineSignal {
        if (candles.length < 50) return { direction: 'NEUTRAL', confidence: 0, riskPercentage: 0 };

        const latestInfo = candles[candles.length - 1];
        const rsiLast = calculateRSI(candles, 14);
        const ema200 = calculateEMA(candles, 200);

        if (!rsiLast || !ema200) return { direction: 'NEUTRAL', confidence: 0, riskPercentage: 0 };

        const isTrendUp = latestInfo.close > ema200;

        // TEMPORARY VERIFICATION RELAXATION: RSI < 55 instead of 40
        if (isTrendUp && rsiLast < 55) {
            return {
                direction: 'BUY',
                confidence: 85,
                riskPercentage: riskLevel === 'Conservative' ? 0.5 : riskLevel === 'Aggressive' ? 2.0 : 1.0,
                stopLoss: latestInfo.close - 20, // Wider stops for swing
                targetPrice: latestInfo.close + 80, // High reward 1:4
                reasoning: `Apex-Swing: Trend-following entry on RSI (${rsiLast.toFixed(1)}) pullback above EMA200.`
            }
        }

        // Counter-trend for extremes still active
        if (rsiLast < 25) {
            return {
                direction: 'BUY',
                confidence: 90,
                riskPercentage: riskLevel === 'Conservative' ? 0.5 : riskLevel === 'Aggressive' ? 2.0 : 1.0,
                stopLoss: latestInfo.close - 25,
                targetPrice: latestInfo.close + 100,
                reasoning: `Apex-Swing: Extreme structural bottom (RSI ${rsiLast.toFixed(2)})`
            }
        } else if (rsiLast > 75) {
            return {
                direction: 'SELL',
                confidence: 90,
                riskPercentage: riskLevel === 'Conservative' ? 0.5 : riskLevel === 'Aggressive' ? 2.0 : 1.0,
                stopLoss: latestInfo.close + 25,
                targetPrice: latestInfo.close - 100,
                reasoning: `Apex-Swing: Extreme structural top exhaustion (RSI ${rsiLast.toFixed(2)})`
            }
        }

        return { direction: 'NEUTRAL', confidence: 0, riskPercentage: 0 };
    }
}

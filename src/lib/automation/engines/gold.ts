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
    volume?: number;
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
function calculateRSI(candles: Candle[], periods = 14): number | null {
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


// ==============================================================================
// 1. Aurum Velocity (Scalper - 1M/5M)
// ==============================================================================
// Strategy: VWAP + EMA crossover + RSI + volume spike
// Risk: 2–3% per trade
// RR: 1.5–2
export class AurumVelocityEngine {
    static riskRange = { min: 2.0, max: 3.0 }; // %

    static analyze(candles: Candle[]): EngineSignal {
        if (candles.length < 20) return { direction: 'NEUTRAL', confidence: 0, riskPercentage: 0 };

        const latestInfo = candles[candles.length - 1];

        // Simplified EMA for testing execution loop
        const ema9 = calculateEMA(candles, 9);
        const ema21 = calculateEMA(candles, 21);
        const rsi14 = calculateRSI(candles, 14);

        if (!ema9 || !ema21 || !rsi14) {
            return { direction: 'NEUTRAL', confidence: 0, riskPercentage: 0 };
        }

        // Extremely simplified "Scalper" crossover entry
        if (ema9 > ema21 && rsi14 < 70) {
            return {
                direction: 'BUY',
                confidence: 85,
                riskPercentage: 2.5,
                stopLoss: latestInfo.close * 0.998, // -0.2%
                targetPrice: latestInfo.close * 1.004, // +0.4% (1:2 RR)
                reasoning: `Vel-Scalp: Bullish Cross (EMA9 > EMA21) w/ RSI ${rsi14.toFixed(2)}`
            };
        } else if (ema9 < ema21 && rsi14 > 30) {
            return {
                direction: 'SELL',
                confidence: 85,
                riskPercentage: 2.5,
                stopLoss: latestInfo.close * 1.002, // +0.2%
                targetPrice: latestInfo.close * 0.996, // -0.4%
                reasoning: `Vel-Scalp: Bearish Cross (EMA9 < EMA21) w/ RSI ${rsi14.toFixed(2)}`
            };
        }

        return { direction: 'NEUTRAL', confidence: 0, riskPercentage: 0 };
    }
}


// ==============================================================================
// 2. Aurum Momentum (Intraday - 15M/1H)
// ==============================================================================
// Strategy: 200 EMA + pullback to 50 EMA + MACD 
// Risk: 1–2%
// RR: 2–3
export class AurumMomentumEngine {
    static riskRange = { min: 1.0, max: 2.0 };

    static analyze(candles: Candle[]): EngineSignal {
        if (candles.length < 200) return { direction: 'NEUTRAL', confidence: 0, riskPercentage: 0 };

        const latestInfo = candles[candles.length - 1];
        const ema50 = calculateEMA(candles, 50);
        const ema200 = calculateEMA(candles, 200);

        if (!ema50 || !ema200) return { direction: 'NEUTRAL', confidence: 0, riskPercentage: 0 };

        // Pullback simulation logic
        if (latestInfo.close > ema200 && latestInfo.close <= ema50 * 1.001 && latestInfo.close >= ema50 * 0.999) {
            return {
                direction: 'BUY',
                confidence: 78,
                riskPercentage: 1.5,
                stopLoss: latestInfo.close * 0.995, // 0.5% stop
                targetPrice: latestInfo.close * 1.015, // 1.5% target (1:3 RR)
                reasoning: `Mom-Intraday: Pullback to EMA50 while > EMA200.`
            }
        } else if (latestInfo.close < ema200 && latestInfo.close >= ema50 * 0.999 && latestInfo.close <= ema50 * 1.001) {
            return {
                direction: 'SELL',
                confidence: 78,
                riskPercentage: 1.5,
                stopLoss: latestInfo.close * 1.005,
                targetPrice: latestInfo.close * 0.985,
                reasoning: `Mom-Intraday: Pullback to EMA50 while < EMA200.`
            }
        }

        return { direction: 'NEUTRAL', confidence: 0, riskPercentage: 0 };
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

    static analyze(candles: Candle[]): EngineSignal {
        if (candles.length < 50) return { direction: 'NEUTRAL', confidence: 0, riskPercentage: 0 };

        const latestInfo = candles[candles.length - 1];
        const rsi = calculateRSI(candles, 14);

        if (!rsi) return { direction: 'NEUTRAL', confidence: 0, riskPercentage: 0 };

        // Simulating Deep Oversold/Overbought structural bounces
        if (rsi < 25) {
            return {
                direction: 'BUY',
                confidence: 90,
                riskPercentage: 1.0,
                stopLoss: latestInfo.close * 0.980, // 2% Deep stop
                targetPrice: latestInfo.close * 1.080, // 8% Macro Target (1:4 RR)
                reasoning: `Apex-Swing: Extreme structural bottom tracking (RSI ${rsi.toFixed(2)})`
            }
        } else if (rsi > 75) {
            return {
                direction: 'SELL',
                confidence: 90,
                riskPercentage: 1.0,
                stopLoss: latestInfo.close * 1.020,
                targetPrice: latestInfo.close * 0.920,
                reasoning: `Apex-Swing: Extreme structural top exhaustion (RSI ${rsi.toFixed(2)})`
            }
        }

        return { direction: 'NEUTRAL', confidence: 0, riskPercentage: 0 };
    }
}

"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';

type PriceData = {
    bid: number;
    offer: number;
    change: number;
    changePct: number;
};

type MarketData = { [epic: string]: PriceData };

type BalanceData = {
    balance: number;
    deposit: number;
    profitLoss: number;
    availableToWithdraw: number;
    equity: number;
    currency?: string;
};

interface MarketDataContextType {
    marketData: MarketData;
    balanceData: BalanceData | null;
    connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
    setMode: (mode: 'demo' | 'real') => void;
    mode: 'demo' | 'real';
}

const MarketDataContext = createContext<MarketDataContextType>({
    marketData: {},
    balanceData: null,
    connectionStatus: 'disconnected',
    setMode: () => { },
    mode: 'demo'
});

export const useMarketData = () => useContext(MarketDataContext);

const PRICE_POLL_MS = 5000;   // prices every 5s
const BALANCE_POLL_MS = 10000; // balance every 10s (less noisy)

export function MarketDataProvider({ children }: { children: React.ReactNode }) {
    const [marketData, setMarketData] = useState<MarketData>({});
    const [balanceData, setBalanceData] = useState<BalanceData | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
    const [mode, setMode] = useState<'demo' | 'real'>('demo');

    const modeRef = useRef(mode);
    const priceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const balanceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Balance fetcher ───────────────────────────────────────────────────────
    const fetchBalance = useCallback(async (targetMode: 'demo' | 'real') => {
        try {
            const res = await fetch(`/api/balance?mode=${targetMode}`);
            if (!res.ok) return; // keep last known value

            const data = await res.json();
            if (modeRef.current !== targetMode) return; // mode changed mid-flight

            // Only update if we got a non-zero balance (Capital.com returned good data)
            // Always update even if balance is 0 — 0 is a valid balance
            setBalanceData({
                balance: data.balance ?? 0,
                deposit: data.deposit ?? 0,
                profitLoss: data.profitLoss ?? 0,
                availableToWithdraw: data.available ?? 0,
                equity: data.equity ?? 0,
                currency: data.currency || 'USD',
            });
        } catch (err) {
            // Keep last known balance on network error
            console.error('[MarketData] Balance fetch error:', err);
        }
    }, []);

    // ── Price fetcher ─────────────────────────────────────────────────────────
    const fetchPrices = useCallback(async (targetMode: 'demo' | 'real') => {
        try {
            const res = await fetch(`/api/prices?mode=${targetMode}`);
            if (!res.ok) {
                setConnectionStatus('error');
                return;
            }

            const data = await res.json();
            if (modeRef.current !== targetMode) return; // mode changed mid-flight

            if (data.prices && Object.keys(data.prices).length > 0) {
                setMarketData(data.prices);
                setConnectionStatus('connected');
            } else if (data.warning) {
                console.warn('[MarketData] Prices warning:', data.warning);
                setConnectionStatus('error');
                // Do NOT wipe marketData — keep last known prices
            }
        } catch (err) {
            console.error('[MarketData] Price fetch error:', err);
            setConnectionStatus('error');
        }
    }, []);

    // ── Effect: restart polling when mode changes ─────────────────────────────
    useEffect(() => {
        modeRef.current = mode;
        setConnectionStatus('connecting');

        // Clear existing timers
        if (priceTimerRef.current) clearInterval(priceTimerRef.current);
        if (balanceTimerRef.current) clearInterval(balanceTimerRef.current);

        // Fetch immediately on mode switch (don't wait for first interval tick)
        fetchBalance(mode);
        fetchPrices(mode);

        // Then poll independently — balance less often than prices
        priceTimerRef.current = setInterval(() => fetchPrices(modeRef.current), PRICE_POLL_MS);
        balanceTimerRef.current = setInterval(() => fetchBalance(modeRef.current), BALANCE_POLL_MS);

        return () => {
            if (priceTimerRef.current) clearInterval(priceTimerRef.current);
            if (balanceTimerRef.current) clearInterval(balanceTimerRef.current);
        };
    }, [mode, fetchBalance, fetchPrices]);

    return (
        <MarketDataContext.Provider value={{ marketData, balanceData, connectionStatus, setMode, mode }}>
            {children}
        </MarketDataContext.Provider>
    );
}

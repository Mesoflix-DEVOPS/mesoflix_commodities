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

const POLL_INTERVAL_MS = 5000;

export function MarketDataProvider({ children }: { children: React.ReactNode }) {
    const [marketData, setMarketData] = useState<MarketData>({});
    const [balanceData, setBalanceData] = useState<BalanceData | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
    const [mode, setMode] = useState<'demo' | 'real'>('demo');

    // Track the current mode in a ref so the async fetchAll closure always
    // has the latest mode — avoids stale closures overwriting state after switch.
    const modeRef = useRef(mode);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isFetchingRef = useRef(false);

    const fetchAll = useCallback(async (targetMode: 'demo' | 'real') => {
        // Guard: if mode changed while a fetch was in-flight, discard the results
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;

        try {
            // ── 1. Fetch live prices ──────────────────────────────────────────
            try {
                const priceRes = await fetch(`/api/prices?mode=${targetMode}`);
                if (priceRes.ok) {
                    const priceData = await priceRes.json();

                    // Only apply update if mode hasn't changed mid-flight
                    if (modeRef.current !== targetMode) return;

                    if (priceData.prices && Object.keys(priceData.prices).length > 0) {
                        setMarketData(priceData.prices);
                        setConnectionStatus('connected');
                    } else if (priceData.warning) {
                        // Capital.com issue — keep last known prices, mark as error
                        console.warn('[MarketData] Prices warning:', priceData.warning);
                        setConnectionStatus('error');
                        // Do NOT wipe marketData — preserve last good data
                    }
                } else {
                    setConnectionStatus('error');
                }
            } catch (priceErr) {
                console.error('[MarketData] Prices fetch failed:', priceErr);
                setConnectionStatus('error');
            }

            // ── 2. Fetch balance ─────────────────────────────────────────────
            try {
                const balRes = await fetch(`/api/dashboard?mode=${targetMode}`);
                if (balRes.ok) {
                    const balData = await balRes.json();

                    // Only apply update if mode hasn't changed mid-flight
                    if (modeRef.current !== targetMode) return;

                    if (balData.accounts?.length > 0) {
                        const acc = balData.accounts[0];
                        setBalanceData({
                            balance: acc.balance?.balance ?? 0,
                            deposit: acc.balance?.deposit ?? 0,
                            profitLoss: acc.balance?.profitLoss ?? 0,
                            availableToWithdraw: acc.balance?.available ?? acc.balance?.availableToWithdraw ?? 0,
                            equity: (acc.balance?.balance ?? 0) + (acc.balance?.profitLoss ?? 0),
                        });
                    }
                    // If accounts is empty (Capital.com warning), keep last balance
                    // Do NOT call setBalanceData(null) here — preserve last good data
                }
            } catch (balErr) {
                console.error('[MarketData] Balance fetch failed:', balErr);
            }

        } finally {
            isFetchingRef.current = false;
        }
    }, []);

    useEffect(() => {
        modeRef.current = mode;

        // Show connecting status but KEEP the existing data visible while
        // new data loads — prevents the "shows then disappears" flicker
        setConnectionStatus('connecting');

        // Cancel any existing poll
        if (pollRef.current) clearInterval(pollRef.current);
        isFetchingRef.current = false;

        // Fetch immediately for the new mode
        fetchAll(mode);

        // Then poll on interval
        pollRef.current = setInterval(() => fetchAll(modeRef.current), POLL_INTERVAL_MS);

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [mode, fetchAll]);

    return (
        <MarketDataContext.Provider value={{ marketData, balanceData, connectionStatus, setMode, mode }}>
            {children}
        </MarketDataContext.Provider>
    );
}

"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

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

const POLL_INTERVAL_MS = 5000; // poll every 5 seconds

export function MarketDataProvider({ children }: { children: React.ReactNode }) {
    const [marketData, setMarketData] = useState<MarketData>({});
    const [balanceData, setBalanceData] = useState<BalanceData | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
    const [mode, setMode] = useState<'demo' | 'real'>('demo');
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        // Clear stale data when mode changes
        setMarketData({});
        setBalanceData(null);
        setConnectionStatus('connecting');

        // Stop any existing poll
        if (pollRef.current) clearInterval(pollRef.current);

        const fetchAll = async () => {
            try {
                // --- 1. Fetch prices ---
                const priceRes = await fetch(`/api/prices?mode=${mode}`);
                if (priceRes.ok) {
                    const priceData = await priceRes.json();
                    if (priceData.prices && Object.keys(priceData.prices).length > 0) {
                        setMarketData(priceData.prices);
                        setConnectionStatus('connected');
                    } else if (priceData.error) {
                        console.warn('[MarketData] Prices error:', priceData.error);
                        setConnectionStatus('error');
                    }
                } else {
                    setConnectionStatus('error');
                }

                // --- 2. Fetch balance ---
                const balRes = await fetch(`/api/dashboard?mode=${mode}`);
                if (balRes.ok) {
                    const balData = await balRes.json();
                    if (balData.accounts?.length > 0) {
                        const acc = balData.accounts[0];
                        setBalanceData({
                            balance: acc.balance?.balance ?? 0,
                            deposit: acc.balance?.deposit ?? 0,
                            profitLoss: acc.balance?.profitLoss ?? 0,
                            // API field is "available" not "availableToWithdraw"
                            availableToWithdraw: acc.balance?.available ?? 0,
                            // Capital.com doesn't return "equity" - derive it
                            equity: (acc.balance?.balance ?? 0) + (acc.balance?.profitLoss ?? 0),
                        });
                    } else {
                        setBalanceData(null);
                    }
                }
            } catch (err) {
                console.error('[MarketData] Poll error:', err);
                setConnectionStatus('error');
            }
        };

        // Initial fetch immediately
        fetchAll();

        // Then poll on interval
        pollRef.current = setInterval(fetchAll, POLL_INTERVAL_MS);

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [mode]);

    return (
        <MarketDataContext.Provider value={{ marketData, balanceData, connectionStatus, setMode, mode }}>
            {children}
        </MarketDataContext.Provider>
    );
}

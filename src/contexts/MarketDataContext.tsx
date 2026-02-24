"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authedFetch } from '@/lib/fetch-utils';

type PriceData = {
    bid: number;
    offer: number;
    change: number;
    changePct: number;
};

type MarketData = { [epic: string]: PriceData };

export type BalanceData = {
    balance: number;
    deposit: number;
    profitLoss: number;
    availableToWithdraw: number;
    equity: number;
    currency: string;
    accountId?: string;
    accountName?: string;
    accountType?: string;
};

interface MarketDataContextType {
    marketData: MarketData;
    /** Balance for the currently active mode */
    balanceData: BalanceData | null;
    /** Separate cached balances per mode */
    demoBalance: BalanceData | null;
    realBalance: BalanceData | null;
    connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
    setMode: (mode: 'demo' | 'real') => void;
    mode: 'demo' | 'real';
}

const MarketDataContext = createContext<MarketDataContextType>({
    marketData: {},
    balanceData: null,
    demoBalance: null,
    realBalance: null,
    connectionStatus: 'disconnected',
    setMode: () => { },
    mode: 'real',
});

export const useMarketData = () => useContext(MarketDataContext);

// Polling intervals — generous to avoid hammering Capital.com while serverless
// warm instances may not have a cached session yet.
const PRICE_POLL_MS = 10_000;   // prices every 10 s
const BALANCE_POLL_MS = 90_000; // balance every 90 s (well under 8-min session TTL)

// ─── Helper ───────────────────────────────────────────────────────────────────
function parseBalance(data: any): BalanceData {
    return {
        balance: Number(data.balance ?? 0),
        deposit: Number(data.deposit ?? 0),
        profitLoss: Number(data.profitLoss ?? 0),
        availableToWithdraw: Number(data.available ?? data.availableToWithdraw ?? 0),
        equity: Number(data.equity ?? ((data.balance ?? 0) + (data.profitLoss ?? 0))),
        currency: data.currency || 'USD',
        accountId: data.accountId,
        accountName: data.accountName,
        accountType: data.accountType,
    };
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function MarketDataProvider({ children }: { children: ReactNode }) {
    const [mode, setModeState] = useState<'demo' | 'real'>('real');
    const [marketData, setMarketData] = useState<MarketData>({});
    // Separate state for each mode's balance — never bleed between modes
    const [demoBalance, setDemoBalance] = useState<BalanceData | null>(null);
    const [realBalance, setRealBalance] = useState<BalanceData | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');

    const modeRef = useRef(mode);
    const router = useRouter();

    // Flight locks — prevent concurrent requests for the same resource
    const balanceFetchingRef = useRef<{ [key: string]: boolean }>({});
    const priceFetchingRef = useRef(false);

    // ── Fetch balance for a specific mode ─────────────────────────────────────
    const fetchBalance = useCallback(async (targetMode: 'demo' | 'real') => {
        // Prevent overlapping requests for the same mode
        if (balanceFetchingRef.current[targetMode]) return;
        balanceFetchingRef.current[targetMode] = true;

        try {
            const res = await authedFetch(`/api/balance?mode=${targetMode}`, router);

            // 503: Capital.com temporarily unavailable — keep last known balance
            if (!res || res.status === 503) {
                console.warn(`[MarketData] Balance(${targetMode}) 503 — keeping last balance`);
                return;
            }

            if (!res.ok) {
                console.warn(`[MarketData] Balance(${targetMode}) failed: HTTP ${res.status}`);
                return;
            }

            const data = await res.json();

            // Only update if we got real data back
            const parsed = parseBalance(data);

            // Critical: only update the CORRECT mode's state
            // Never let demo balance contaminate the real slot or vice versa
            if (targetMode === 'demo') {
                setDemoBalance(prev => {
                    // If Capital.com returned all-zeros for a demo account we haven't
                    // confirmed exists, don't overwrite a known-good non-zero balance
                    if (parsed.balance === 0 && parsed.deposit === 0 &&
                        prev && (prev.balance > 0 || prev.deposit > 0)) {
                        return prev;
                    }
                    return parsed;
                });
            } else {
                setRealBalance(prev => {
                    if (parsed.balance === 0 && parsed.deposit === 0 &&
                        prev && (prev.balance > 0 || prev.deposit > 0)) {
                        return prev;
                    }
                    return parsed;
                });
            }

        } catch (error) {
            console.error(`[MarketData] Balance(${targetMode}) fetch threw:`, error);
        } finally {
            balanceFetchingRef.current[targetMode] = false;
        }
    }, [router]);

    // ── Fetch prices for the current mode ─────────────────────────────────────
    const fetchPrices = useCallback(async (targetMode: 'demo' | 'real') => {
        if (priceFetchingRef.current) return; // prevent overlapping requests
        priceFetchingRef.current = true;

        try {
            const res = await authedFetch(`/api/prices?mode=${targetMode}`, router);
            if (!res || !res.ok) {
                setConnectionStatus('error');
                return;
            }
            const data = await res.json();
            // Guard against stale responses (mode changed during fetch)
            if (modeRef.current !== targetMode) return;
            if (data.prices && Object.keys(data.prices).length > 0) {
                setMarketData(data.prices);
                setConnectionStatus('connected');
            } else {
                setConnectionStatus('error');
            }
        } catch (error) {
            console.error('[MarketData] Price fetch threw:', error);
            setConnectionStatus('error');
        } finally {
            priceFetchingRef.current = false;
        }
    }, [router]);

    // ── Bootstrap: fetch initial data ──────────────────────────────────────────
    useEffect(() => {
        // Initial fetch for the starting mode
        fetchBalance('real');
        fetchPrices('real');

        const balanceInterval = setInterval(() => {
            fetchBalance(modeRef.current);
        }, BALANCE_POLL_MS);

        const priceInterval = setInterval(() => {
            fetchPrices(modeRef.current);
        }, PRICE_POLL_MS);

        return () => {
            clearInterval(balanceInterval);
            clearInterval(priceInterval);
        };
    }, [fetchBalance, fetchPrices]);

    // ── On mode change: update ref, fetch the new mode's data ─────────────────
    useEffect(() => {
        modeRef.current = mode;
        setConnectionStatus('connecting');
        // Fetch balance+prices for the new mode immediately
        fetchBalance(mode);
        fetchPrices(mode);
    }, [mode, fetchBalance, fetchPrices]);

    // ── Active balance = only the current mode's balance ──────────────────────
    // IMPORTANT: never fall back to the other mode's balance.
    // If this mode has no data yet, return null (UI should show a loading state).
    const balanceData = mode === 'demo' ? demoBalance : realBalance;

    const setMode = useCallback((newMode: 'demo' | 'real') => {
        setModeState(newMode);
    }, []);

    return (
        <MarketDataContext.Provider value={{
            marketData,
            balanceData,
            demoBalance,
            realBalance,
            connectionStatus,
            setMode,
            mode,
        }}>
            {children}
        </MarketDataContext.Provider>
    );
}

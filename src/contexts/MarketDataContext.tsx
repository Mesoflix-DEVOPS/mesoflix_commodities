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

const EMPTY_BALANCE: BalanceData = {
    balance: 0, deposit: 0, profitLoss: 0,
    availableToWithdraw: 0, equity: 0, currency: 'USD',
};

interface MarketDataContextType {
    marketData: MarketData;
    balanceData: BalanceData | null;
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

const PRICE_POLL_MS = 5_000;    // live prices every 5 s
const BALANCE_POLL_MS = 60_000; // balance every 60 s (well under the 9-min session TTL)

// ─── Helper ───────────────────────────────────────────────────────────────────
function parseBalance(data: any): BalanceData {
    return {
        balance: data.balance ?? 0,
        deposit: data.deposit ?? 0,
        profitLoss: data.profitLoss ?? 0,
        availableToWithdraw: data.available ?? data.availableToWithdraw ?? 0,
        equity: data.equity ?? ((data.balance ?? 0) + (data.profitLoss ?? 0)),
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
    const [demoBalance, setDemoBalance] = useState<BalanceData | null>(null);
    const [realBalance, setRealBalance] = useState<BalanceData | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');

    const modeRef = useRef(mode);
    const router = useRouter();

    // ── Fetch one mode's balance ──────────────────────────────────────────────
    const fetchBalance = useCallback(async (targetMode: 'demo' | 'real') => {
        try {
            const res = await authedFetch(`/api/balance?mode=${targetMode}`, router);

            // If we get a 503 or network error, DO NOT reset the balance to zero.
            // Keep the last known good value so the user's screen doesn't blank out.
            if (!res) {
                console.warn('[MarketData] Balance fetch returned null (likely auth redirect)');
                return;
            }

            if (res.status === 503) {
                console.warn('[MarketData] Capital.com unavailable (503) — keeping last balance');
                return; // ← CRITICAL: don't update state, keep existing balance
            }

            if (!res.ok) {
                console.warn(`[MarketData] Balance fetch failed: HTTP ${res.status}`);
                return; // ← keep last balance
            }

            const data = await res.json();

            // Sanity check: if the payload is all zeros and we already have a real
            // balance, don't overwrite (this catches the old "zero on error" bug)
            const parsed = parseBalance(data);
            const isAllZero = parsed.balance === 0 && parsed.deposit === 0;
            const hasPreviousBalance = targetMode === 'demo'
                ? demoBalance && (demoBalance.balance > 0 || demoBalance.deposit > 0)
                : realBalance && (realBalance.balance > 0 || realBalance.deposit > 0);

            if (isAllZero && hasPreviousBalance) {
                // Zero balance could mean Capital.com returned an empty response
                // after a session error. Don't clear a known-good balance.
                console.warn('[MarketData] Received zero balance — ignoring to preserve display');
                return;
            }

            if (targetMode === 'demo') setDemoBalance(parsed);
            else setRealBalance(parsed);

        } catch (error) {
            console.error('[MarketData] Balance fetch threw:', error);
            // Network error — keep last known value
        }
    }, [router, demoBalance, realBalance]);

    // ── Fetch prices for current mode ─────────────────────────────────────────
    const fetchPrices = useCallback(async (targetMode: 'demo' | 'real') => {
        try {
            const res = await authedFetch(`/api/prices?mode=${targetMode}`, router);
            if (!res || !res.ok) { setConnectionStatus('error'); return; }
            const data = await res.json();
            if (modeRef.current !== targetMode) return; // stale — mode switched mid-flight
            if (data.prices && Object.keys(data.prices).length > 0) {
                setMarketData(data.prices);
                setConnectionStatus('connected');
            } else {
                setConnectionStatus('error'); // keep last prices
            }
        } catch (error) {
            console.error('[MarketData] Price fetch failed:', error);
            setConnectionStatus('error');
        }
    }, [router]);

    // ── Bootstrap: fetch initial state ─────────────────
    useEffect(() => {
        fetchBalance(modeRef.current);
        fetchPrices(modeRef.current);

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

    // ── When mode changes — refetch balance and prices immediately ────────────
    useEffect(() => {
        modeRef.current = mode;
        setConnectionStatus('connecting');
        // Fetch balance for the new mode immediately (don't wait for next poll)
        fetchBalance(mode);
        fetchPrices(mode);
    }, [mode, fetchBalance, fetchPrices]);

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

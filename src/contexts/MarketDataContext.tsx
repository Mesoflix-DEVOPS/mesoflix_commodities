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

// Prices every 10s; balance every 2 minutes (single call returns both demo+real)
const PRICE_POLL_MS = 10_000;
const BALANCE_POLL_MS = 120_000;

function parseBalance(data: any): BalanceData | null {
    if (!data) return null;
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

function isNonZero(b: BalanceData | null): boolean {
    return !!b && (b.balance > 0 || b.deposit > 0);
}

export function MarketDataProvider({ children }: { children: ReactNode }) {
    const [mode, setModeState] = useState<'demo' | 'real'>('real');
    const [marketData, setMarketData] = useState<MarketData>({});
    const [demoBalance, setDemoBalance] = useState<BalanceData | null>(null);
    const [realBalance, setRealBalance] = useState<BalanceData | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');

    const modeRef = useRef(mode);
    const router = useRouter();
    const balanceFetchingRef = useRef(false);
    const priceFetchingRef = useRef(false);

    // ── Single balance fetch — returns BOTH demo and real in one API call ──────
    const fetchBothBalances = useCallback(async () => {
        if (balanceFetchingRef.current) return;
        balanceFetchingRef.current = true;

        try {
            // No mode param needed — the backend returns both real & demo accounts at once
            const res = await authedFetch(`/api/balance`, router);

            if (!res || res.status === 503) {
                console.warn('[MarketData] Balance 503 — keeping last values');
                return;
            }
            if (!res.ok) {
                console.warn(`[MarketData] Balance failed: HTTP ${res.status}`);
                return;
            }

            const data = await res.json();
            console.log('[MarketData] Balance response:', JSON.stringify({
                hasDemo: data.hasDemo,
                hasLive: data.hasLive,
                realBalance: data.realBalance?.balance,
                demoBalance: data.demoBalance?.balance,
            }));

            const newReal = parseBalance(data.realBalance);
            const newDemo = parseBalance(data.demoBalance);

            // Only update if we got valid data; don't zero out a known-good balance
            if (newReal) {
                setRealBalance(prev => (isNonZero(newReal) || !isNonZero(prev)) ? newReal : prev);
            }
            if (newDemo) {
                setDemoBalance(prev => (isNonZero(newDemo) || !isNonZero(prev)) ? newDemo : prev);
            }

        } catch (error) {
            console.error('[MarketData] Balance fetch threw:', error);
        } finally {
            balanceFetchingRef.current = false;
        }
    }, [router]);

    // ── Fetch prices for the current mode ─────────────────────────────────────
    const fetchPrices = useCallback(async (targetMode: 'demo' | 'real') => {
        if (priceFetchingRef.current) return;
        priceFetchingRef.current = true;

        try {
            const res = await authedFetch(`/api/prices?mode=${targetMode}`, router);
            if (!res || !res.ok) { setConnectionStatus('error'); return; }
            const data = await res.json();
            if (modeRef.current !== targetMode) return; // stale — mode changed mid-flight
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

    // ── Bootstrap ──────────────────────────────────────────────────────────────
    useEffect(() => {
        fetchBothBalances();
        fetchPrices('real');

        const balanceInterval = setInterval(fetchBothBalances, BALANCE_POLL_MS);
        const priceInterval = setInterval(() => fetchPrices(modeRef.current), PRICE_POLL_MS);

        return () => {
            clearInterval(balanceInterval);
            clearInterval(priceInterval);
        };
    }, [fetchBothBalances, fetchPrices]);

    // ── On mode change — fetch prices for new mode immediately ────────────────
    useEffect(() => {
        modeRef.current = mode;
        setConnectionStatus('connecting');
        fetchPrices(mode);
        // Balance doesn't need refetching — both are already populated
    }, [mode, fetchPrices]);

    // Active balance is strictly the current mode's data — no cross-mode fallback
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

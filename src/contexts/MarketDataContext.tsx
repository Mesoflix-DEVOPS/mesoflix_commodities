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

    // Unused polling functions removed in favor of SSE

    // Active balance is strictly the current mode's data — no cross-mode fallback
    const balanceData = mode === 'demo' ? demoBalance : realBalance;

    const setMode = useCallback((newMode: 'demo' | 'real') => {
        setModeState(newMode);
    }, []);

    // ── Unified SSE Stream ──────────────────────────────────────────────────
    useEffect(() => {
        setConnectionStatus('connecting');

        const es = new EventSource(`/api/stream?mode=${mode}`);

        es.onopen = () => {
            console.log(`[MarketData] Unified Stream Connected (${mode})`);
        };

        es.addEventListener('market-data', (ev) => {
            try {
                const data = JSON.parse(ev.data);
                // Capital.com 'quote' destination messages
                if (data.destination === 'quote' && data.payload) {
                    const snap = data.payload;
                    const epic = snap.epic;
                    if (epic) {
                        setMarketData(prev => ({
                            ...prev,
                            [epic]: {
                                bid: snap.bid ?? prev[epic]?.bid ?? 0,
                                offer: snap.offer ?? prev[epic]?.offer ?? 0,
                                change: snap.netChange ?? prev[epic]?.change ?? 0,
                                changePct: snap.percentageChange ?? prev[epic]?.changePct ?? 0,
                            }
                        }));
                    }
                }
                setConnectionStatus('connected');
            } catch (e) {
                console.error("[MarketData] Pricing Parse Error", e);
            }
        });

        es.addEventListener('balance', (ev) => {
            try {
                const data = JSON.parse(ev.data);
                const newReal = parseBalance(data.realBalance);
                const newDemo = parseBalance(data.demoBalance);

                if (newReal) setRealBalance(prev => (isNonZero(newReal) || !isNonZero(prev)) ? newReal : prev);
                if (newDemo) setDemoBalance(prev => (isNonZero(newDemo) || !isNonZero(prev)) ? newDemo : prev);
            } catch (e) {
                console.error("[MarketData] Balance Parse Error", e);
            }
        });

        // Positions could also be listened to here if we exposed them in Context, 
        // but currently dashboard components fetch their own or rely on `/api/dashboard`.
        // If we want to broadcast them, we can add a positions state to MarketDataContext.
        // For now, we leave the listener out of context to keep it simple, or we can just ignore it.

        es.onerror = () => {
            console.warn(`[MarketData] Stream Error. Reconnecting in 3s...`);
            setConnectionStatus('error');
            es.close();
        };

        return () => {
            es.close();
        };
    }, [mode]);

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

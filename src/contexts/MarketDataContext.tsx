"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';

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
};

const EMPTY_BALANCE: BalanceData = {
    balance: 0, deposit: 0, profitLoss: 0,
    availableToWithdraw: 0, equity: 0, currency: 'USD',
};

interface MarketDataContextType {
    /** Prices for the currently selected mode */
    marketData: MarketData;
    /** Balance for the currently selected mode — switches instantly on setMode() */
    balanceData: BalanceData | null;
    /** Raw balances for each mode — available to any consumer */
    demoBalance: BalanceData | null;
    realBalance: BalanceData | null;
    connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
    setMode: (mode: 'demo' | 'real') => void;
    mode: 'demo' | 'real';
    accounts: any[];
    selectedAccountId: string | null;
    selectAccount: (id: string) => Promise<void>;
}

const MarketDataContext = createContext<MarketDataContextType>({
    marketData: {},
    balanceData: null,
    demoBalance: null,
    realBalance: null,
    connectionStatus: 'disconnected',
    setMode: () => { },
    mode: 'demo',
    accounts: [],
    selectedAccountId: null,
    selectAccount: async () => { },
});

export const useMarketData = () => useContext(MarketDataContext);

const PRICE_POLL_MS = 5_000;    // live prices every 5 s
const BALANCE_POLL_MS = 12_000; // balances every 12 s

// ─── Helper ───────────────────────────────────────────────────────────────────
function parseBalance(data: any): BalanceData {
    return {
        balance: data.balance ?? 0,
        deposit: data.deposit ?? 0,
        profitLoss: data.profitLoss ?? 0,
        availableToWithdraw: data.available ?? data.availableToWithdraw ?? 0,
        equity: data.equity ?? ((data.balance ?? 0) + (data.profitLoss ?? 0)),
        currency: data.currency || 'USD',
    };
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function MarketDataProvider({ children }: { children: React.ReactNode }) {
    const [mode, setModeState] = useState<'demo' | 'real'>('demo');
    const [marketData, setMarketData] = useState<MarketData>({});
    const [demoBalance, setDemoBalance] = useState<BalanceData | null>(null);
    const [realBalance, setRealBalance] = useState<BalanceData | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
    const [accounts, setAccounts] = useState<any[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

    const modeRef = useRef(mode);

    // ── Fetch one mode's balance ──────────────────────────────────────────────
    const fetchBalance = useCallback(async (targetMode: 'demo' | 'real') => {
        try {
            const res = await fetch(`/api/balance?mode=${targetMode}`);
            if (!res.ok) return;
            const data = await res.json();
            const parsed = parseBalance(data);

            // Extract accounts list and currently selected ID from the backend's perspective
            if (data.accounts) {
                setAccounts(data.accounts);
                // The backend tells us which one it targeted
                const targeted = data.accounts.find((a: any) => a.accountId === data.selectedAccountId) || data.accounts[0];
                if (targeted) {
                    setSelectedAccountId(targeted.accountId);
                    // Also sync the visual mode (Real/Demo) based on the account type
                    const intendedMode = (targeted.accountType === 'DEMO' || targeted.accountName?.toLowerCase().includes('demo')) ? 'demo' : 'real';
                    setModeState(intendedMode);
                }
            }

            if (targetMode === 'demo') setDemoBalance(parsed);
            else setRealBalance(parsed);
        } catch {
            // Network error — keep last known value, don't clear
        }
    }, []);

    // ── Fetch prices for current mode ─────────────────────────────────────────
    const fetchPrices = useCallback(async (targetMode: 'demo' | 'real') => {
        try {
            const res = await fetch(`/api/prices?mode=${targetMode}`);
            if (!res.ok) { setConnectionStatus('error'); return; }
            const data = await res.json();
            if (modeRef.current !== targetMode) return; // stale — mode switched mid-flight
            if (data.prices && Object.keys(data.prices).length > 0) {
                setMarketData(data.prices);
                setConnectionStatus('connected');
            } else {
                setConnectionStatus('error'); // keep last prices
            }
        } catch {
            setConnectionStatus('error');
        }
    }, []);

    // ── Bootstrap: fetch BOTH balances concurrently on mount ─────────────────
    useEffect(() => {
        // Pre-fetch both modes in parallel so switching is instant
        Promise.all([fetchBalance('demo'), fetchBalance('real')]);
        fetchPrices('demo'); // start with demo prices

        // Poll balances for BOTH modes independently
        const balanceInterval = setInterval(() => {
            fetchBalance('demo');
            fetchBalance('real');
        }, BALANCE_POLL_MS);

        // Poll prices for whichever mode is active
        const priceInterval = setInterval(() => {
            fetchPrices(modeRef.current);
        }, PRICE_POLL_MS);

        return () => {
            clearInterval(balanceInterval);
            clearInterval(priceInterval);
        };
    }, [fetchBalance, fetchPrices]);

    // ── When mode changes — update prices immediately, balance is already cached
    useEffect(() => {
        modeRef.current = mode;
        setConnectionStatus('connecting');
        fetchPrices(mode);
    }, [mode, fetchPrices]);

    // ── Expose the correct balance for current mode ───────────────────────────
    const balanceData = mode === 'demo' ? demoBalance : realBalance;

    const setMode = useCallback((newMode: 'demo' | 'real') => {
        setModeState(newMode);
    }, []);

    const selectAccount = useCallback(async (accountId: string) => {
        try {
            const res = await fetch('/api/capital/select', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountId })
            });
            if (res.ok) {
                // Refresh balances and state
                fetchBalance(mode);
            }
        } catch (e) {
            console.error('Failed to select account', e);
        }
    }, [fetchBalance, mode]);

    return (
        <MarketDataContext.Provider value={{
            marketData,
            balanceData,
            demoBalance,
            realBalance,
            connectionStatus,
            setMode,
            mode,
            accounts,
            selectedAccountId,
            selectAccount,
        }}>
            {children}
        </MarketDataContext.Provider>
    );
}

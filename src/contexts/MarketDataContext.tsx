"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';

type PriceData = {
    bid: number;
    offer: number;
    high: number;
    low: number;
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

import { ConnectionOverlay } from '@/components/dashboard/ConnectionOverlay';

interface MarketDataContextType {
    marketData: MarketData;
    balanceData: BalanceData | null;
    demoBalance: BalanceData | null;
    realBalance: BalanceData | null;
    positions: any[];
    connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
    setMode: (mode: 'demo' | 'real') => void;
    mode: 'demo' | 'real';
    isSyncing: boolean;
}

const MarketDataContext = createContext<MarketDataContextType>({
    marketData: {},
    balanceData: null,
    demoBalance: null,
    realBalance: null,
    positions: [],
    connectionStatus: 'disconnected',
    setMode: () => { },
    mode: 'real',
    isSyncing: false,
});

export const useMarketData = () => useContext(MarketDataContext);

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

export function MarketDataProvider({ children }: { children: ReactNode }) {
    const [mode, setModeState] = useState<'demo' | 'real'>('real');
    const [isSyncing, setIsSyncing] = useState(false);
    const [marketData, setMarketData] = useState<MarketData>({});
    const [demoBalance, setDemoBalance] = useState<BalanceData | null>(null);
    const [realBalance, setRealBalance] = useState<BalanceData | null>(null);
    const [positions, setPositions] = useState<any[]>([]);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');

    const socketRef = useRef<Socket | null>(null);
    const modeRef = useRef(mode);

    // Active balance is strictly the current mode's data — no cross-mode fallback
    const balanceData = mode === 'demo' ? demoBalance : realBalance;

    const performIsolatedHandshake = useCallback(async (newMode: 'demo' | 'real') => {
        setIsSyncing(true);
        console.log(`[Isolate Handshake] Initiating 5s deep sync for ${newMode}...`);
        
        // Clear ghost data immediately
        setMarketData({});
        setPositions([]);
        if (newMode === 'demo') setDemoBalance(null);
        else setRealBalance(null);

        try {
            const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
            const getCookie = (name: string) => {
                const value = `; ${document.cookie}`;
                const parts = value.split(`; ${name}=`);
                if (parts.length === 2) return parts.pop()?.split(';').shift();
            };
            const token = getCookie('access_token');

            // 1. Backend Isolate Trigger
            await fetch(`${SOCKET_URL}/api/auth/isolate-handshake`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ mode: newMode })
            });

            // 2. Refresh Socket Logic
            if (socketRef.current?.connected) {
                socketRef.current.emit('start-stream', { mode: newMode });
            }

        } catch (e) {
            console.error("[Isolate Handshake] Failed", e);
        }

        // Standardized 5-second buffer (Institutional requirement)
        setTimeout(() => {
            setIsSyncing(false);
            console.log(`[Isolate Handshake] Handshake complete for ${newMode}.`);
        }, 5000);
    }, []);

    const setMode = useCallback((newMode: 'demo' | 'real') => {
        if (newMode === modeRef.current) return;
        setModeState(newMode);
        modeRef.current = newMode;
        performIsolatedHandshake(newMode);
    }, [performIsolatedHandshake]);

    const fetchInitialData = useCallback(async (currentMode: 'demo' | 'real') => {
        try {
            const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
            const getCookie = (name: string) => {
                const value = `; ${document.cookie}`;
                const parts = value.split(`; ${name}=`);
                if (parts.length === 2) return parts.pop()?.split(';').shift();
            };
            const token = getCookie('access_token');
            if (!token) return;

            const res = await fetch(`${SOCKET_URL}/api/dashboard?mode=${currentMode}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.accounts) {
                    data.accounts.forEach((acc: any) => {
                        const isAccDemo = (acc.accountType || '').toLowerCase() === 'demo';
                        if (isAccDemo) setDemoBalance(parseBalance(acc));
                        else setRealBalance(parseBalance(acc));
                    });
                }
                if (data.positions) setPositions(data.positions);
            }
        } catch (e) { console.error("[MarketData] Initial Fetch Failed", e); }
    }, []);

    useEffect(() => {
        fetchInitialData(mode);
    }, [mode, fetchInitialData]);

    useEffect(() => {
        const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
        
        const getCookie = (name: string) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop()?.split(';').shift();
        };

        const token = getCookie('access_token');
        if (!token) {
            setConnectionStatus('disconnected');
            return;
        }

        const socket = io(SOCKET_URL, {
            auth: { token },
            reconnectionAttempts: Infinity,
            reconnectionDelay: 2000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
            transports: ['websocket'],
            autoConnect: true,
        });

        socketRef.current = socket;
        setConnectionStatus('connecting');

        socket.on('connect', () => {
            console.log(`[MarketData] Socket Connected: ${SOCKET_URL}`);
            setConnectionStatus('connected');
            socket.emit('start-stream', { mode: modeRef.current });
        });

        socket.on('market-data', (data: any[]) => {
            if (isSyncing) return; // Drop updates during sync
            setMarketData(prev => {
                const newState = { ...prev };
                data.forEach((snap: any) => {
                    const epic = snap.epic;
                    newState[epic] = {
                        bid: snap.bid ?? prev[epic]?.bid ?? 0,
                        offer: snap.offer ?? prev[epic]?.offer ?? 0,
                        high: snap.high ?? prev[epic]?.high ?? 0,
                        low: snap.low ?? prev[epic]?.low ?? 0,
                        change: snap.netChange ?? prev[epic]?.change ?? 0,
                        changePct: snap.percentageChange ?? prev[epic]?.changePct ?? 0,
                    };
                });
                return newState;
            });
        });

        socket.on('balance', (data: any) => {
            if (isSyncing) return; // Drop updates during sync
            const balanceObj = parseBalance(data);
            if (data.isDemo) setDemoBalance(balanceObj);
            else setRealBalance(balanceObj);
        });

        socket.on('positions', (data: any[]) => {
            if (isSyncing) return;
            setPositions(data);
        });

        socket.on('connect_error', (error) => {
            console.error('[MarketData] Socket Connection Error:', error);
            setConnectionStatus('error');
        });

        socket.on('disconnect', (reason) => {
            console.warn('[MarketData] Socket Disconnected:', reason);
            setConnectionStatus('disconnected');
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [isSyncing]); // Re-bind listeners when sync state changes

    return (
        <MarketDataContext.Provider value={{
            marketData,
            balanceData,
            demoBalance,
            realBalance,
            positions,
            connectionStatus,
            setMode,
            mode,
            isSyncing,
        }}>
            <ConnectionOverlay isVisible={isSyncing} mode={mode} />
            {children}
        </MarketDataContext.Provider>
    );
}

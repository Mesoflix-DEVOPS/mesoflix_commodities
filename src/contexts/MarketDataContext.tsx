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

interface MarketDataContextType {
    marketData: MarketData;
    balanceData: BalanceData | null;
    demoBalance: BalanceData | null;
    realBalance: BalanceData | null;
    positions: any[];
    connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
    setMode: (mode: 'demo' | 'real') => void;
    mode: 'demo' | 'real';
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
});

export const useMarketData = () => useContext(MarketDataContext);

function parseBalance(data: any): BalanceData | null {
    if (!data || data.balance === undefined || data.balance === null) return null;
    return {
        balance: Number(data.balance),
        deposit: Number(data.deposit ?? 0),
        profitLoss: Number(data.profitLoss ?? 0),
        availableToWithdraw: Number(data.available ?? data.availableToWithdraw ?? 0),
        equity: Number(data.equity ?? (Number(data.balance) + Number(data.profitLoss ?? 0))),
        currency: data.currency || 'USD',
        accountId: data.accountId,
        accountName: data.accountName,
        accountType: data.accountType,
    };
}

export function MarketDataProvider({ children }: { children: ReactNode }) {
    const [mode, setModeState] = useState<'demo' | 'real'>('real');
    const [marketData, setMarketData] = useState<MarketData>({});
    const [demoBalance, setDemoBalance] = useState<BalanceData | null>(null);
    const [realBalance, setRealBalance] = useState<BalanceData | null>(null);
    const [positions, setPositions] = useState<any[]>([]);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');

    const socketRef = useRef<Socket | null>(null);
    const modeRef = useRef(mode);

    const balanceData = mode === 'demo' ? demoBalance : realBalance;

    const fetchInitialData = useCallback(async (currentMode: 'demo' | 'real') => {
        try {
            const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
            
            // Item C2 Fix: Fetch a short-lived bridge token
            const tokenRes = await fetch('/api/auth/bridge-token');
            if (!tokenRes.ok) return;
            const { bridgeToken: token } = await tokenRes.json();
            
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

    const setMode = useCallback((newMode: 'demo' | 'real') => {
        if (newMode === modeRef.current) return;
        setModeState(newMode);
        modeRef.current = newMode;
        // Background Silent Trigger
        fetchInitialData(newMode);
        if (socketRef.current?.connected) {
            socketRef.current.emit('start-stream', { mode: newMode });
        }
    }, [fetchInitialData]);

    useEffect(() => {
        fetchInitialData(mode);
    }, [mode, fetchInitialData]);

    useEffect(() => {
        const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
        
        let socket: Socket | null = null;

        const initSocket = async () => {
            try {
                // Item C2 Fix: Fetch a short-lived bridge token instead of reading httpOnly cookie
                const tokenRes = await fetch('/api/auth/bridge-token');
                if (!tokenRes.ok) {
                    setConnectionStatus('disconnected');
                    return;
                }
                const { bridgeToken: token } = await tokenRes.json();

                if (!token) {
                    setConnectionStatus('disconnected');
                    return;
                }

                const createdSocket = io(SOCKET_URL, {
                    auth: { token },
                    reconnectionAttempts: Infinity,
                    reconnectionDelay: 2000,
                    reconnectionDelayMax: 5000,
                    timeout: 20000,
                    transports: ['websocket'],
                    autoConnect: true,
                });

                socket = createdSocket;
                socketRef.current = createdSocket;
                setConnectionStatus('connecting');

                createdSocket.on('connect', () => {
                    setConnectionStatus('connected');
                    createdSocket.emit('start-stream', { mode: modeRef.current });
                });

                createdSocket.on('market-data', (data: any[]) => {
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

                createdSocket.on('balance', (data: any) => {
                    const balanceObj = parseBalance(data);
                    if (data.isDemo) setDemoBalance(balanceObj);
                    else setRealBalance(balanceObj);
                });

                createdSocket.on('positions', (data: any[]) => {
                    setPositions(data);
                });

                createdSocket.on('connect_error', (error) => {
                    console.error('[MarketData] Socket Connection Error:', error);
                    setConnectionStatus('error');
                });

                createdSocket.on('disconnect', (reason) => {
                    console.warn('[MarketData] Socket Disconnected:', reason);
                    setConnectionStatus('disconnected');
                });

            } catch (err) {
                console.error('[MarketData] Socket Init Failed:', err);
                setConnectionStatus('error');
            }
        };

        initSocket();

        return () => {
            if (socket) socket.disconnect();
            socketRef.current = null;
        };
    }, []);

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
        }}>
            {children}
        </MarketDataContext.Provider>
    );
}

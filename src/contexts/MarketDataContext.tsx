"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

type MarketData = {
    [epic: string]: {
        bid: number;
        offer: number;
        change: number;
        changePct: number;
        updateTime: string;
    }
};

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

export function MarketDataProvider({ children }: { children: React.ReactNode }) {
    const [marketData, setMarketData] = useState<MarketData>({});
    const [balanceData, setBalanceData] = useState<BalanceData | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
    const [mode, setMode] = useState<'demo' | 'real'>('demo');

    useEffect(() => {
        let es: EventSource;

        const connectStream = () => {
            setConnectionStatus('connecting');
            es = new EventSource(`/api/stream?mode=${mode}`);

            es.addEventListener('market-data', (event) => {
                try {
                    const data = JSON.parse(event.data);

                    // Capital.com WebSocket quote format:
                    // { "status": "OK", "destination": "quote", "payload": { "epic": "GOLD", "bid": 1234.5, "ofr": 1234.7, ... } }
                    // Note: field is "ofr" NOT "offer", and each message is one quote, not an array
                    if (data.destination === 'quote' && data.payload?.epic) {
                        const q = data.payload;
                        setMarketData(prev => ({
                            ...prev,
                            [q.epic]: {
                                bid: q.bid,
                                offer: q.ofr,  // API uses "ofr" not "offer"
                                change: 0,
                                changePct: 0,
                                updateTime: String(q.timestamp || Date.now())
                            }
                        }));
                        setConnectionStatus('connected');
                    } else if (data.destination === 'ohlc.event' && data.payload?.epic) {
                        // OHLC event format: { destination: 'ohlc.event', payload: { epic, h, l, o, c, ... } }
                        const o = data.payload;
                        setMarketData(prev => ({
                            ...prev,
                            [o.epic]: {
                                ...prev[o.epic],
                                bid: o.c,   // close price as current price
                                offer: o.c,
                                change: 0,
                                changePct: 0,
                                updateTime: String(o.t || Date.now())
                            }
                        }));
                        setConnectionStatus('connected');
                    } else if (data.status === 'OK' && data.destination?.includes('subscribe')) {
                        // Subscription confirmation - mark as connected
                        console.log('[Stream] Subscription confirmed:', data.destination);
                        setConnectionStatus('connected');
                    }
                } catch (e) {
                    console.error("Error parsing SSE data", e);
                }
            });

            es.addEventListener('error', (event) => {
                console.error("MarketData Stream Error");
                setConnectionStatus('error');
            });

            es.addEventListener('system', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.status === 'disconnected') {
                        setConnectionStatus('disconnected');
                    }
                } catch (e) { }
            });
        };

        // Clear old data when mode changes
        setMarketData({});
        setBalanceData(null);
        setConnectionStatus('connecting');

        // Also fetch initial static balance
        fetch(`/api/dashboard?mode=${mode}`)
            .then(res => res.json())
            .then(data => {
                if (data.accounts?.length > 0) {
                    setBalanceData({
                        balance: data.accounts[0].balance.balance,
                        deposit: data.accounts[0].balance.deposit,
                        profitLoss: data.accounts[0].balance.profitLoss,
                        availableToWithdraw: data.accounts[0].balance.availableToWithdraw,
                        equity: data.accounts[0].balance.equity
                    });
                } else {
                    setBalanceData(null);
                }
            })
            .catch(err => {
                console.error("Error fetching balance data:", err);
                setBalanceData(null);
            });

        connectStream();

        return () => {
            if (es) {
                es.close();
            }
        };
    }, [mode]);

    return (
        <MarketDataContext.Provider value={{ marketData, balanceData, connectionStatus, setMode, mode }}>
            {children}
        </MarketDataContext.Provider>
    );
}

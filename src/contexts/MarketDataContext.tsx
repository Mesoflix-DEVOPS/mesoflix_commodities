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

                    if (data.payload && data.payload.quotes) {
                        setMarketData(prev => {
                            const newData = { ...prev };
                            data.payload.quotes.forEach((q: any) => {
                                newData[q.epic] = {
                                    bid: q.bid,
                                    offer: q.offer,
                                    change: q.netChange || 0,
                                    changePct: q.netChangePct || 0,
                                    updateTime: q.updateTime
                                };
                            });
                            return newData;
                        });
                        setConnectionStatus('connected');
                    } else if (data.payload && data.payload.ohlc) {
                        setMarketData(prev => {
                            const newData = { ...prev };
                            data.payload.ohlc.forEach((o: any) => {
                                if (o.epic) {
                                    newData[o.epic] = {
                                        ...newData[o.epic],
                                        bid: o.close.bid,
                                        offer: o.close.ask,
                                        change: 0,
                                    };
                                }
                            });
                            return newData;
                        });
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
                }
            })
            .catch(err => console.error("Error fetching balance data:", err));

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

"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

export type EngineState = "Not Deployed" | "Running" | "Paused" | "Stopped" | "Error" | "Target Achieved" | "Risk Halted" | "Cooldown";

export interface EngineDetails {
    id: string;
    name: string;
    commodity: string;
    state: EngineState;
    allocatedCapital: number;
    riskMultiplier: number;
    stopLossCap: number;
    targetProfit: number;
    dailyStopLoss: number;
    riskLevel: string;
    lastDecisionReason?: string;
    mode: "demo" | "real";
    pnl: number;
}

interface AutomationContextType {
    engines: Record<string, EngineDetails>;
    deployEngine: (engine: EngineDetails) => void;
    updateEngineState: (id: string, newState: EngineState) => void;
    updateEngineCapital: (id: string, newCapital: number) => void;
}

const AutomationContext = createContext<AutomationContextType | undefined>(undefined);

export function AutomationProvider({ children }: { children: ReactNode }) {
    const [engines, setEngines] = useState<Record<string, EngineDetails>>({});

    // Fetch initial state from database
    const fetchDeployments = useCallback(async () => {
        try {
            const RENDER_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
            const getCookie = (name: string) => {
                const value = `; ${document.cookie}`;
                const parts = value.split(`; ${name}=`);
                if (parts.length === 2) return parts.pop()?.split(';').shift();
            };
            const token = getCookie('access_token');

            const res = await fetch(`${RENDER_URL}/api/automation/deploy`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const loadedEngines: Record<string, EngineDetails> = {};
                data.deployments?.forEach((dep: any) => {
                    loadedEngines[dep.engine_id] = {
                        id: dep.engine_id,
                        name: dep.engine_id.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                        commodity: dep.commodity,
                        state: dep.status as EngineState,
                        allocatedCapital: parseFloat(dep.allocated_capital),
                        riskMultiplier: parseFloat(dep.risk_multiplier || "1"),
                        stopLossCap: parseFloat(dep.stop_loss_cap || "20"),
                        targetProfit: parseFloat(dep.target_profit || "0"),
                        dailyStopLoss: parseFloat(dep.daily_stop_loss || "0"),
                        riskLevel: dep.risk_level || "Balanced",
                        lastDecisionReason: dep.last_decision_reason,
                        mode: (dep.mode || "demo") as "demo" | "real",
                        pnl: parseFloat(dep.pnl || "0"),
                    };
                });
                setEngines(loadedEngines);
            }
        } catch (e) {
            console.error("Failed to load automation deployments", e);
        }
    }, []);

    useEffect(() => {
        fetchDeployments();
    }, [fetchDeployments]);

    // Engine Execution Loop - Pings the runner API to evaluate active strategies
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                // If there are running engines, trigger the API runner
                const hasRunning = Object.values(engines).some(e => e.state === 'Running');
                if (hasRunning) {
                    const RENDER_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
                    const getCookie = (name: string) => {
                        const value = `; ${document.cookie}`;
                        const parts = value.split(`; ${name}=`);
                        if (parts.length === 2) return parts.pop()?.split(';').shift();
                    };
                    const token = getCookie('access_token');

                    await fetch(`${RENDER_URL}/api/automation/runner`, { 
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                }
            } catch (e) {
                console.error("Engine heartbeat failed:", e);
            }
        }, 30000); // 30 second tick rate per Gold engine specs

        return () => clearInterval(interval);
    }, [engines]);

    const deployEngine = async (engine: EngineDetails) => {
        // Optimistic UI Update
        setEngines((prev) => ({
            ...prev,
            [engine.id]: engine,
        }));

        // Persist DB
        const RENDER_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
        const getCookie = (name: string) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop()?.split(';').shift();
        };
        const token = getCookie('access_token');

        await fetch(`${RENDER_URL}/api/automation/deploy`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                engine_id: engine.id,
                commodity: engine.commodity,
                allocated_capital: engine.allocatedCapital,
                risk_multiplier: engine.riskMultiplier,
                stop_loss_cap: engine.stopLossCap,
                target_profit: engine.targetProfit,
                daily_stop_loss: engine.dailyStopLoss,
                risk_level: engine.riskLevel,
                mode: engine.mode
            })
        });
    };

    const updateEngineState = async (id: string, newState: EngineState) => {
        setEngines((prev) => {
            if (!prev[id]) return prev;
            return {
                ...prev,
                [id]: { ...prev[id], state: newState },
            };
        });

        const RENDER_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
        const getCookie = (name: string) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop()?.split(';').shift();
        };
        const token = getCookie('access_token');

        await fetch(`${RENDER_URL}/api/automation/deploy`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                engine_id: id,
                action: 'update_state',
                status: newState
            })
        });
    };

    const updateEngineCapital = (id: string, newCapital: number) => {
        setEngines((prev) => {
            if (!prev[id]) return prev;
            return {
                ...prev,
                [id]: { ...prev[id], allocatedCapital: newCapital },
            };
        });
        // Simplification for PRD: Only persisting the state and deployment params initially.
    };

    return (
        <AutomationContext.Provider value={{ engines, deployEngine, updateEngineState, updateEngineCapital }}>
            {children}
        </AutomationContext.Provider>
    );
}

export function useAutomation() {
    const context = useContext(AutomationContext);
    if (context === undefined) {
        throw new Error("useAutomation must be used within an AutomationProvider");
    }
    return context;
}

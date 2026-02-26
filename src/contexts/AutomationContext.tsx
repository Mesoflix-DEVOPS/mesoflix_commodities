"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

export type EngineState = "Not Deployed" | "Running" | "Paused" | "Stopped" | "Error";

export interface EngineDetails {
    id: string;
    name: string;
    commodity: string;
    state: EngineState;
    allocatedCapital: number;
    riskMultiplier: number;
    stopLossCap: number;
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
            const res = await fetch('/api/automation/deploy');
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
                    await fetch('/api/automation/runner', { method: 'POST' });
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
        await fetch('/api/automation/deploy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                engine_id: engine.id,
                commodity: engine.commodity,
                allocated_capital: engine.allocatedCapital,
                risk_multiplier: engine.riskMultiplier,
                stop_loss_cap: engine.stopLossCap,
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

        await fetch('/api/automation/deploy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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

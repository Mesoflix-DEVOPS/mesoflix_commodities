"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

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

    const deployEngine = (engine: EngineDetails) => {
        setEngines((prev) => ({
            ...prev,
            [engine.id]: engine,
        }));
    };

    const updateEngineState = (id: string, newState: EngineState) => {
        setEngines((prev) => {
            if (!prev[id]) return prev;
            return {
                ...prev,
                [id]: { ...prev[id], state: newState },
            };
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

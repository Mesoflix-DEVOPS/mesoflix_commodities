"use client";

import { useState } from "react";
import { Copy, TriangleAlert, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeployModalProps {
    isOpen: boolean;
    onClose: () => void;
    engine: any;
    onConfirm: (capital: number, stopLoss: number, multiplier: number) => void;
}

export default function DeployModal({ isOpen, onClose, engine, onConfirm }: DeployModalProps) {
    const [capital, setCapital] = useState<number>(0);
    const [multiplier, setMultiplier] = useState<number>(1);
    const [stopLoss, setStopLoss] = useState<number>(20); // % cap

    if (!isOpen || !engine) return null;

    // Default capital injection button clicks
    const addCapital = (amount: number) => {
        setCapital(prev => prev + amount);
    };

    const handleConfirm = () => {
        if (capital < engine.minCap) {
            alert(`Minimum capital required is $${engine.minCap.toLocaleString()}`);
            return;
        }
        onConfirm(capital, stopLoss, multiplier);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-[#0A1622] border border-white/10 rounded-3xl w-full max-w-lg p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-2xl font-black text-white">Deploy Engine</h2>
                        <span className="px-2 py-0.5 rounded bg-teal/20 text-teal text-[10px] font-bold uppercase tracking-widest border border-teal/30">
                            {engine.name}
                        </span>
                    </div>
                    <p className="text-sm text-gray-400">Configure risk parameters and allocate capital to initialize the algorithm.</p>
                </div>

                <div className="space-y-6">
                    {/* Capital Allocation */}
                    <div className="bg-[#0E1B2A] rounded-2xl p-5 border border-white/5">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Capital Allocation (USD)</label>
                        <div className="relative mb-4">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white font-bold">$</span>
                            <input
                                type="number"
                                value={capital || ""}
                                onChange={(e) => setCapital(Number(e.target.value))}
                                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-8 pr-4 text-white font-bold outline-none focus:border-teal/50 transition-colors"
                                placeholder={`Min $${engine.minCap}`}
                            />
                        </div>
                        <div className="flex gap-2">
                            {[1000, 5000, 10000, 25000].map(amt => (
                                <button
                                    key={amt}
                                    onClick={() => setCapital(amt)}
                                    className="flex-1 bg-white/5 hover:bg-white/10 text-white text-xs font-bold py-2 rounded-lg transition-colors border border-white/5"
                                >
                                    +${amt >= 1000 ? `${amt / 1000}k` : amt}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Risk Multiplier */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#0E1B2A] rounded-2xl p-5 border border-white/5">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center justify-between">
                                Risk Multiplier
                                <Info size={12} className="text-gray-500" />
                            </label>
                            <select
                                value={multiplier}
                                onChange={(e) => setMultiplier(Number(e.target.value))}
                                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 px-4 text-white font-bold outline-none focus:border-white/20 transition-colors appearance-none"
                            >
                                <option value={0.5}>0.5x (Conservative)</option>
                                <option value={1}>1.0x (Standard)</option>
                                <option value={2}>2.0x (Aggressive)</option>
                                <option value={3}>3.0x (Maximum)</option>
                            </select>
                        </div>

                        {/* Stop Loss Capacity */}
                        <div className="bg-[#0E1B2A] rounded-2xl p-5 border border-white/5">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center justify-between">
                                Equity Stop Cap
                                <Info size={12} className="text-gray-500" />
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={stopLoss}
                                    onChange={(e) => setStopLoss(Number(e.target.value))}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-4 pr-8 text-white font-bold outline-none focus:border-red-500/50 transition-colors"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                            </div>
                        </div>
                    </div>

                    {/* Risk Notice */}
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3">
                        <TriangleAlert className="text-amber-500 shrink-0 mt-0.5" size={16} />
                        <div>
                            <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-1">Institutional Risk Warning</p>
                            <p className="text-xs text-amber-500/80 leading-relaxed">
                                Deploying <strong>{engine.name}</strong> grants the algorithmic engine execution autonomy.
                                By confirming, you accept potential drawdowns up to your allocated Capital.
                            </p>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex gap-4 pt-4">
                        <button
                            onClick={onClose}
                            className="flex-1 px-6 py-4 bg-transparent border border-white/10 text-white font-bold rounded-xl hover:bg-white/5 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={capital < engine.minCap}
                            className={cn(
                                "flex-[2] px-6 py-4 font-black rounded-xl transition-all shadow-lg flex justify-center items-center gap-2",
                                capital >= engine.minCap
                                    ? "bg-teal hover:bg-[#00e6c7] text-black shadow-teal/20"
                                    : "bg-gray-800 text-gray-500 cursor-not-allowed"
                            )}
                        >
                            <Copy size={18} /> Confirm Deployment
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

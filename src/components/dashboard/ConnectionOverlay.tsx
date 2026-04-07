"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Zap, Globe, Lock } from 'lucide-react';

interface ConnectionOverlayProps {
    isVisible: boolean;
    mode: 'demo' | 'real';
}

export const ConnectionOverlay: React.FC<ConnectionOverlayProps> = ({ isVisible, mode }) => {
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState("Initializing Handshake...");

    useEffect(() => {
        if (!isVisible) {
            setProgress(0);
            return;
        }

        const interval = setInterval(() => {
            setProgress(prev => Math.min(prev + 1, 100));
        }, 45); // Approx 4.5s to reach 100%

        const textTimer1 = setTimeout(() => setStatusText("Authenticating with Master Authority..."), 1200);
        const textTimer2 = setTimeout(() => setStatusText(`Securing Standalone ${mode.toUpperCase()} Tunnel...`), 2800);
        const textTimer3 = setTimeout(() => setStatusText("Verifying Institutional Liquidity..."), 4000);

        return () => {
            clearInterval(interval);
            clearTimeout(textTimer1);
            clearTimeout(textTimer2);
            clearTimeout(textTimer3);
        };
    }, [isVisible, mode]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-xl"
                >
                    <div className="max-w-md w-full p-8 text-center">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="relative mb-8"
                        >
                            <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full" />
                            <div className="relative flex justify-center">
                                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                                    {mode === 'real' ? (
                                        <ShieldCheck className="w-16 h-16 text-blue-400" />
                                    ) : (
                                        <Zap className="w-16 h-16 text-amber-400" />
                                    )}
                                </div>
                            </div>
                        </motion.div>

                        <h2 className="text-2xl font-bold text-white mb-2 uppercase tracking-widest">
                            Deep Connection Sync
                        </h2>
                        <p className="text-gray-400 text-sm mb-8 font-medium">
                            Establishing isolated standalone environment for {mode.toUpperCase()} mode.
                        </p>

                        <div className="relative h-1 w-full bg-white/10 rounded-full overflow-hidden mb-6">
                            <motion.div
                                className={`absolute inset-y-0 left-0 ${mode === 'real' ? 'bg-blue-500' : 'bg-amber-500'}`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>

                        <div className="flex items-center justify-center gap-4 text-xs font-mono text-gray-500">
                            <span className="flex items-center gap-1">
                                <Lock className="w-3 h-3" /> Secure
                            </span>
                            <span className="flex items-center gap-1">
                                <Globe className="w-3 h-3" /> Isolated
                            </span>
                            <span className="w-8 text-right font-bold text-gray-300">
                                {progress}%
                            </span>
                        </div>

                        <div className="mt-8">
                            <motion.span
                                key={statusText}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-sm font-medium text-white/60 italic"
                            >
                                {statusText}
                            </motion.span>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

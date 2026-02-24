"use client";

import {
    User,
    Shield,
    Link as LinkIcon,
    Bell,
    Cpu,
    Smartphone,
    CreditCard,
    Key,
    Save
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";
import jsPDF from "jspdf";

const tabs = [
    { id: "profile", name: "My Profile", icon: User },
    { id: "security", name: "Security", icon: Shield },
    { id: "capital", name: "Capital Account", icon: CreditCard },
    { id: "notifications", name: "Notifications", icon: Bell },
];

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState("profile");
    const [userData, setUserData] = useState<any>(null);

    // 2FA State
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [setupStep, setSetupStep] = useState<'idle' | 'qr' | 'verify' | 'backup' | 'done'>('idle');
    const [qrUri, setQrUri] = useState("");
    const [verifyCode, setVerifyCode] = useState("");
    const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        let isMounted = true;
        fetch('/api/user')
            .then(res => res.json())
            .then(data => {
                if (isMounted && data?.user) {
                    setUserData(data.user);
                    setTwoFactorEnabled(data.user.two_factor_enabled || false);
                    if (data.user.two_factor_enabled) setSetupStep('done');
                }
            })
            .catch(console.error);
        return () => { isMounted = false; };
    }, []);

    const start2FASetup = async () => {
        setIsProcessing(true);
        try {
            const res = await fetch('/api/auth/2fa/generate', { method: 'POST' });
            const data = await res.json();
            if (data.otpauthUrl) {
                setQrUri(data.otpauthUrl);
                setSetupStep('qr');
            }
        } catch (e) {
            console.error("Failed to generate 2FA", e);
        } finally {
            setIsProcessing(false);
        }
    };

    const verify2FASetup = async () => {
        if (verifyCode.length < 6) return;
        setIsProcessing(true);
        try {
            const res = await fetch('/api/auth/2fa/verify-setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: verifyCode })
            });
            const data = await res.json();
            if (data.success && data.recoveryCodes) {
                setRecoveryCodes(data.recoveryCodes);
                setTwoFactorEnabled(true);
                setSetupStep('backup');
            } else {
                alert(data.error || "Invalid code");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsProcessing(false);
        }
    };

    const downloadRecoveryCodes = () => {
        const doc = new jsPDF();
        doc.setFontSize(22);
        doc.text("Mesoflix Commodities - 2FA Recovery Codes", 20, 30);

        doc.setFontSize(12);
        doc.text("Keep these secure. Each code can only be used ONCE to recover your account.", 20, 45);
        doc.text("If you lose your Authenticator device, you will need these.", 20, 52);

        doc.setFontSize(14);
        recoveryCodes.forEach((code, index) => {
            const yPos = 70 + (index * 10);
            doc.text(`${index + 1}.   ${code}`, 30, yPos);
        });

        doc.save("Mesoflix_Recovery_Codes.pdf");
        setSetupStep('done');
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700 max-w-5xl">
            {/* Header */}
            <div>
                <h2 className="text-teal font-bold text-[10px] uppercase tracking-[0.3em] mb-2 px-1">Configurations</h2>
                <h1 className="text-4xl font-black text-white tracking-tight">Platform Settings</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Left: Tab Navigation */}
                <div className="lg:col-span-1 flex flex-col gap-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex items-center gap-3 px-5 py-4 rounded-2xl transition-all duration-300 font-bold text-sm",
                                activeTab === tab.id
                                    ? "bg-teal text-dark-blue shadow-xl scale-105"
                                    : "text-gray-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <tab.icon size={18} />
                            <span>{tab.name}</span>
                        </button>
                    ))}
                </div>

                {/* Right: Content Area */}
                <div className="lg:col-span-3 bg-[#0E1B2A] rounded-[2.5rem] border border-white/5 p-10 shadow-2xl min-h-[600px]">
                    {activeTab === "profile" && (
                        <div className="space-y-10">
                            <div>
                                <h3 className="text-xl font-bold text-white mb-1">User Information</h3>
                                <p className="text-xs text-gray-500">Update your primary identity and contact details</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <InputGroup label="Full Name" placeholder="Loading..." value={userData?.fullName || ""} disabled={true} />
                                <InputGroup label="Email Address" placeholder="Loading..." value={userData?.email || ""} disabled={true} />
                                <InputGroup label="Trading Role" placeholder="Loading..." value={userData?.role || "Trader"} disabled={true} />
                                <InputGroup label="Preferred Currency" placeholder="USD ($)" disabled={true} />
                            </div>

                            <div className="pt-6 border-t border-white/5 opacity-50 cursor-not-allowed">
                                <p className="text-xs text-gray-400">Profile identifying information is locked and managed separately for security compliance.</p>
                            </div>
                        </div>
                    )}

                    {activeTab === "capital" && (
                        <div className="space-y-10">
                            <div>
                                <h3 className="text-xl font-bold text-white mb-1">Capital.com Connection</h3>
                                <p className="text-xs text-gray-500">Manage your primary trading bridge credentials</p>
                            </div>

                            <div className="p-4 sm:p-8 bg-black/20 rounded-3xl border border-white/5 space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-teal/10 rounded-xl flex-shrink-0 flex items-center justify-center border border-teal/20">
                                            <CreditCard className="text-teal" size={24} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">Live Trading Bridge</p>
                                            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-1">Status: Active & Secure</p>
                                        </div>
                                    </div>
                                    <button className="text-[10px] text-red-400 font-bold uppercase border border-red-400/20 px-3 py-2 sm:py-1.5 rounded-lg hover:bg-red-400/10 transition-all text-center">Disconnect</button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-8">
                                <InputGroup label="Capital API Key" type="password" value="••••••••••••••••" />
                                <InputGroup label="Trading Password" type="password" value="••••••••••••••••" />
                            </div>
                        </div>
                    )}

                    {activeTab === "security" && (
                        <div className="space-y-10 animate-in fade-in duration-500">
                            <div>
                                <h3 className="text-xl font-bold text-white mb-1">Two-Factor Authentication</h3>
                                <p className="text-xs text-gray-500">Protect your account and bridging connections with an authenticator app.</p>
                            </div>

                            <div className="p-6 bg-black/20 rounded-3xl border border-white/5 space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                    <div className="flex items-center gap-4">
                                        <div className={cn("w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center border",
                                            twoFactorEnabled ? "bg-teal/10 border-teal/20" : "bg-white/5 border-white/10"
                                        )}>
                                            <Shield className={twoFactorEnabled ? "text-teal" : "text-gray-500"} size={24} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">Google Authenticator (TOTP)</p>
                                            <p className={cn("text-[10px] uppercase font-black tracking-widest mt-1",
                                                twoFactorEnabled ? "text-teal" : "text-gray-500"
                                            )}>
                                                {twoFactorEnabled ? "Status: Active & Secure" : "Status: Disabled"}
                                            </p>
                                        </div>
                                    </div>

                                    {setupStep === 'idle' && !twoFactorEnabled && (
                                        <button
                                            onClick={start2FASetup} disabled={isProcessing}
                                            className="px-6 py-2 bg-white text-black font-bold text-xs rounded-xl hover:bg-gray-200 transition-colors"
                                        >
                                            {isProcessing ? "Initializing..." : "Enable 2FA"}
                                        </button>
                                    )}

                                    {setupStep === 'done' && twoFactorEnabled && (
                                        <button disabled className="px-6 py-2 bg-white/5 text-gray-500 font-bold text-xs rounded-xl cursor-not-allowed border border-white/5">
                                            Enabled
                                        </button>
                                    )}
                                </div>

                                {/* Step 1: Show QR Code */}
                                {setupStep === 'qr' && (
                                    <div className="pt-6 border-t border-white/5 animate-in slide-in-from-top-4 duration-500">
                                        <p className="text-sm font-bold text-white mb-4">1. Scan this QR Code with your Authenticator App</p>
                                        <div className="bg-white p-4 inline-block rounded-2xl mb-6">
                                            <QRCodeSVG value={qrUri} size={150} />
                                        </div>
                                        <p className="text-sm font-bold text-white mb-4">2. Enter the 6-digit code</p>
                                        <div className="flex gap-4 max-w-xs">
                                            <input
                                                type="text"
                                                placeholder="000000"
                                                maxLength={6}
                                                value={verifyCode}
                                                onChange={(e) => setVerifyCode(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white font-mono tracking-widest text-center focus:outline-none focus:border-teal/50"
                                            />
                                            <button
                                                onClick={verify2FASetup}
                                                disabled={isProcessing || verifyCode.length < 6}
                                                className="bg-teal text-dark-blue px-6 py-2 rounded-xl font-black text-xs hover:bg-teal/90 disabled:opacity-50 transition-colors"
                                            >
                                                Verify
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Step 2: Backup Codes */}
                                {setupStep === 'backup' && (
                                    <div className="pt-6 border-t border-white/5 animate-in slide-in-from-top-4 duration-500">
                                        <div className="bg-teal/10 border border-teal/20 rounded-2xl p-6 mb-6">
                                            <h4 className="text-teal font-black text-lg mb-2">Save Your Recovery Codes</h4>
                                            <p className="text-sm text-gray-300 leading-relaxed max-w-2xl">
                                                These codes are the ONLY way to access your account if you lose your phone. We do not store them in plain-text, so we cannot recover them for you later.
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                                            {recoveryCodes.map((code, i) => (
                                                <div key={i} className="bg-black/40 border border-white/5 rounded-lg py-2 px-4 text-center">
                                                    <span className="text-white font-mono text-sm tracking-wider">{code}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <button
                                            onClick={downloadRecoveryCodes}
                                            className="w-full sm:w-auto px-8 py-3 bg-white text-black font-black text-xs rounded-xl hover:bg-gray-200 transition-colors"
                                        >
                                            DOWNLOAD RECOVERY PDF
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab !== "profile" && activeTab !== "capital" && activeTab !== "security" && (
                        <div className="flex flex-col items-center justify-center h-full text-center py-20">
                            <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center text-gray-700 mb-6 border border-white/5">
                                <Cpu size={40} />
                            </div>
                            <h3 className="text-sm font-black text-gray-500 uppercase tracking-[0.2em]">Module Initialization</h3>
                            <p className="text-xs text-gray-600 mt-2">Connecting to secure encrypted sub-sector...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function InputGroup({ label, placeholder, disabled, type = "text", value }: any) {
    return (
        <div className="space-y-3">
            <label className="text-[10px] text-gray-500 font-black uppercase tracking-[0.25em] px-1">{label}</label>
            <input
                type={type}
                placeholder={placeholder}
                defaultValue={value}
                disabled={disabled}
                className={cn(
                    "w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-5 text-sm text-white focus:outline-none focus:border-teal/30 focus:bg-white/10 transition-all font-medium",
                    disabled && "opacity-50 cursor-not-allowed grayscale"
                )}
            />
        </div>
    );
}

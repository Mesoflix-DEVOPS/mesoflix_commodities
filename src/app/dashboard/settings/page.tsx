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
    Save,
    Plus,
    Trash2,
    CheckCircle2,
    Power,
    X
} from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { authedFetch } from "@/lib/fetch-utils";
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
    const router = useRouter();

    // 2FA State
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [setupStep, setSetupStep] = useState<'idle' | 'qr' | 'verify' | 'backup' | 'done'>('idle');
    const [qrUri, setQrUri] = useState("");
    const [setupKey, setSetupKey] = useState("");
    const [verifyCode, setVerifyCode] = useState("");
    const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    // Options State
    const [savedTokens, setSavedTokens] = useState<any[]>([]);
    const [isAddingToken, setIsAddingToken] = useState(false);
    const [newTokenForm, setNewTokenForm] = useState({ label: '', login: '', password: '', apiKey: '' });

    useEffect(() => {
        let isMounted = true;
        authedFetch('/api/user', router)
            .then(res => res?.json())
            .then(data => {
                if (isMounted && data?.user) {
                    setUserData(data.user);
                    setTwoFactorEnabled(data.user.two_factor_enabled || false);
                    if (data.user.two_factor_enabled) setSetupStep('done');
                }
            })
            .catch(console.error);

        fetchCapitalAccounts();

        return () => { isMounted = false; };
    }, [router]);

    const fetchCapitalAccounts = async () => {
        try {
            const res = await authedFetch('/api/capital/connect', router);
            if (res && res.ok) {
                const data = await res.json();
                setSavedTokens(data.accounts || []);
            }
        } catch (e) { console.error("Error fetching capital accounts", e); }
    };

    const handleAddToken = async () => {
        if (!newTokenForm.label || !newTokenForm.apiKey || !newTokenForm.password) return;
        setIsProcessing(true);
        try {
            const res = await authedFetch('/api/capital/connect', router, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTokenForm)
            });
            if (res && res.ok) {
                setIsAddingToken(false);
                setNewTokenForm({ label: '', login: '', password: '', apiKey: '' });
                fetchCapitalAccounts();
            } else {
                const data = await res?.json();
                alert(data?.message || "Failed to add token. Check your credentials.");
            }
        } catch (e) {
            console.error(e);
            alert("Network error while adding token.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleTokenAction = async (accountId: string, action: 'connect' | 'disconnect') => {
        setIsProcessing(true);
        try {
            const res = await authedFetch('/api/capital/connect', router, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountId, action })
            });
            if (res && res.ok) {
                // Refresh to ensure all background streams and session caches are reset globally
                window.location.reload();
            } else {
                const data = await res?.json();
                alert(data?.message || `Failed to ${action} token.`);
            }
        } catch (e) {
            console.error(e);
            alert(`Error trying to ${action} token.`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteToken = async (accountId: string) => {
        if (!confirm("Are you sure you want to permanently delete this API Key?")) return;
        setIsProcessing(true);
        try {
            const res = await authedFetch(`/api/capital/connect?id=${accountId}`, router, { method: 'DELETE' });
            if (res && res.ok) {
                fetchCapitalAccounts();
            } else {
                const data = await res?.json();
                alert(data?.message || "Failed to delete token.");
            }
        } catch (e) {
            console.error(e);
            alert("Error while deleting token.");
        } finally {
            setIsProcessing(false);
        }
    };

    const start2FASetup = async () => {
        setIsProcessing(true);
        try {
            const res = await fetch('/api/auth/2fa/generate', { method: 'POST' });
            const data = await res.json();
            if (data.otpauthUrl) {
                setQrUri(data.otpauthUrl);
                setSetupKey(data.secret);
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
                            <div className="flex justify-between items-end">
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-1">Capital.com API Vault</h3>
                                    <p className="text-xs text-gray-500">Manage your active trading bridges. Only one token can be globally active at a time.</p>
                                </div>
                                <button
                                    onClick={() => setIsAddingToken(!isAddingToken)}
                                    className="flex items-center gap-2 px-4 py-2 bg-teal text-dark-blue font-black text-xs rounded-xl shadow-lg hover:bg-white hover:text-black transition-all"
                                >
                                    {isAddingToken ? <X size={16} /> : <Plus size={16} />}
                                    <span>{isAddingToken ? "Cancel" : "Add Token"}</span>
                                </button>
                            </div>

                            {/* Token List */}
                            <div className="space-y-4">
                                {savedTokens.length === 0 && !isAddingToken && (
                                    <div className="p-8 text-center bg-white/5 rounded-3xl border border-white/10 border-dashed">
                                        <Key size={32} className="mx-auto text-gray-500 mb-3 opacity-50" />
                                        <p className="text-sm font-bold text-gray-400">No API Tokens Saved</p>
                                        <p className="text-xs text-gray-600 mt-1">Add a Capital.com API key to enable live institutional trading.</p>
                                    </div>
                                )}

                                {savedTokens.map(token => (
                                    <div key={token.id} className={cn(
                                        "p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4",
                                        token.is_active ? "bg-teal/5 border-teal/20" : "bg-black/20 border-white/5 opacity-70 hover:opacity-100"
                                    )}>
                                        <div className="flex items-center gap-4">
                                            <div className={cn("w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center border",
                                                token.is_active ? "bg-teal/20 text-teal border-teal/30" : "bg-white/5 text-gray-500 border-white/10"
                                            )}>
                                                {token.is_active ? <CheckCircle2 size={24} /> : <Key size={24} />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white flex items-center gap-2">
                                                    {token.label}
                                                    {token.is_active && <span className="px-2 py-0.5 rounded-md bg-teal text-[#0A1622] text-[9px] uppercase tracking-widest font-black">Active Stream</span>}
                                                </p>
                                                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-1">Configured: {new Date(token.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {token.is_active ? (
                                                <button
                                                    onClick={() => handleTokenAction(token.id, 'disconnect')}
                                                    disabled={isProcessing || (savedTokens.filter(t => t.is_active).length <= 1)}
                                                    title={savedTokens.filter(t => t.is_active).length <= 1 ? "You must connect another token before disconnecting this one" : "Disconnect token"}
                                                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 font-bold text-xs rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                                >
                                                    <Power size={14} /> Disconnect
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleTokenAction(token.id, 'connect')}
                                                    disabled={isProcessing}
                                                    className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white hover:bg-white/20 font-bold text-xs rounded-lg transition-all"
                                                >
                                                    <LinkIcon size={14} /> Connect
                                                </button>
                                            )}

                                            <button
                                                onClick={() => handleDeleteToken(token.id)}
                                                disabled={isProcessing || token.is_active}
                                                title={token.is_active ? "Disconnect to delete" : "Delete token"}
                                                className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-500"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Add Token Form */}
                            {isAddingToken && (
                                <div className="p-8 bg-[#0A1622] rounded-3xl border border-teal/20 shadow-2xl animate-in slide-in-from-top-4 duration-500">
                                    <h4 className="text-teal font-black mb-6 flex items-center gap-2"><Plus size={18} /> DOCK NEW TOKEN</h4>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <InputGroup
                                            label="Identifier Label"
                                            placeholder="e.g., Main EUR, SubAccount 2"
                                            value={newTokenForm.label}
                                            onChange={(e: any) => setNewTokenForm({ ...newTokenForm, label: e.target.value })}
                                        />
                                        <InputGroup
                                            label="Capital Login (Email) - Optional"
                                            placeholder="investor@domain.com"
                                            value={newTokenForm.login}
                                            onChange={(e: any) => setNewTokenForm({ ...newTokenForm, login: e.target.value })}
                                        />
                                        <InputGroup
                                            label="Capital API Key"
                                            type="password"
                                            placeholder="Paste API Key String"
                                            value={newTokenForm.apiKey}
                                            onChange={(e: any) => setNewTokenForm({ ...newTokenForm, apiKey: e.target.value })}
                                        />
                                        <InputGroup
                                            label="Capital Password"
                                            type="password"
                                            placeholder="Account Password"
                                            value={newTokenForm.password}
                                            onChange={(e: any) => setNewTokenForm({ ...newTokenForm, password: e.target.value })}
                                        />
                                    </div>

                                    <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
                                        <button
                                            onClick={() => setIsAddingToken(false)}
                                            className="px-6 py-2 rounded-xl text-gray-400 hover:text-white font-bold text-xs"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleAddToken}
                                            disabled={!newTokenForm.label || !newTokenForm.apiKey || !newTokenForm.password || isProcessing}
                                            className="flex items-center gap-2 px-8 py-2 bg-teal text-dark-blue font-black text-xs rounded-xl hover:bg-teal/90 transition-all disabled:opacity-50"
                                        >
                                            <Save size={16} /> Save Token
                                        </button>
                                    </div>
                                </div>
                            )}
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

                                {/* Step 1: Show QR Code & Manual Key */}
                                {setupStep === 'qr' && (
                                    <div className="pt-6 border-t border-white/5 animate-in slide-in-from-top-4 duration-500">
                                        <p className="text-sm font-bold text-white mb-4">1. Scan QR Code or Enter Key</p>

                                        <div className="flex flex-col md:flex-row gap-8 mb-6">
                                            <div className="bg-white p-4 inline-block rounded-2xl w-fit">
                                                <QRCodeSVG value={qrUri} size={150} />
                                            </div>

                                            <div className="flex-1 space-y-3">
                                                <p className="text-xs text-gray-400 leading-relaxed">
                                                    If you cannot scan the QR code, manually enter the setup key below into your authenticator app (e.g., Google Authenticator, Authy).
                                                </p>
                                                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.25em] mb-1">Setup Key</p>
                                                    <p className="text-white font-mono tracking-widest break-all select-all">{setupKey}</p>
                                                </div>
                                            </div>
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

function InputGroup({ label, placeholder, disabled, type = "text", value, onChange }: any) {
    return (
        <div className="space-y-3">
            <label className="text-[10px] text-gray-500 font-black uppercase tracking-[0.25em] px-1">{label}</label>
            <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                disabled={disabled}
                className={cn(
                    "w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-5 text-sm text-white focus:outline-none focus:border-teal/30 focus:bg-white/10 transition-all font-medium",
                    disabled && "opacity-50 cursor-not-allowed grayscale"
                )}
            />
        </div>
    );
}

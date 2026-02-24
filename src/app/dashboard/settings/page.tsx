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
import { useState } from "react";
import { cn } from "@/lib/utils";

const tabs = [
    { id: "profile", name: "My Profile", icon: User },
    { id: "security", name: "Security", icon: Shield },
    { id: "capital", name: "Capital Account", icon: CreditCard },
    { id: "notifications", name: "Notifications", icon: Bell },
];

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState("profile");
    const [userData, setUserData] = useState<any>(null);

    // Fetch user data from DB once mounted if checking profile tab
    // (We actually can just fetch it globally since it's the default view)
    import("react").then(({ useEffect }) => {
        useEffect(() => {
            fetch('/api/user')
                .then(res => res.json())
                .then(data => {
                    if (data?.user) {
                        setUserData(data.user);
                    }
                })
                .catch(console.error);
        }, []);
    });

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

                    {activeTab !== "profile" && activeTab !== "capital" && (
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

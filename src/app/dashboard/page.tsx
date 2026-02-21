"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Key, Save, LogOut } from "lucide-react";

export default function DashboardPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [showConnect, setShowConnect] = useState(false);
    const [greeting, setGreeting] = useState("");

    const fetchData = (isSilent = false) => {
        if (!isSilent) setLoading(true);
        fetch("/api/dashboard")
            .then(async (res) => {
                if (res.status === 401) {
                    router.push("/login");
                    return;
                }
                if (res.status === 404) {
                    setShowConnect(true);
                    setData(null);
                    return;
                }
                const jsonData = await res.json();
                setData(jsonData);
                setShowConnect(false);
            })
            .catch((err) => console.error(err))
            .finally(() => {
                if (!isSilent) setLoading(false);
            });
    };

    useEffect(() => {
        fetchData();

        // Real-time updates: poll every 10 seconds
        const interval = setInterval(() => fetchData(true), 10000);

        // Set greeting based on time
        const hour = new Date().getHours();
        if (hour < 12) setGreeting("Good Morning");
        else if (hour < 18) setGreeting("Good Afternoon");
        else setGreeting("Good Evening");

        return () => clearInterval(interval);
    }, [router]);

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
    };

    const getFirstName = (fullName: string) => {
        if (!fullName) return "Trader";
        return fullName.split(" ")[0];
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0D1B2A]">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-teal/20 border-t-teal rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-gold font-bold text-xs">M</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0D1B2A] text-white">
            {/* Premium Header */}
            <nav className="bg-dark-blue/50 backdrop-blur-xl border-b border-white/5 py-4 px-6 md:px-12 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-2 bg-gradient-to-br from-teal to-dark-blue rounded-lg border border-white/10">
                            <span className="text-gold font-bold text-lg">M</span>
                        </Link>
                        <div className="hidden md:block">
                            <h2 className="text-sm font-medium text-gray-400">{greeting},</h2>
                            <p className="text-lg font-bold text-white tracking-tight">
                                {getFirstName(data?.user?.fullName)}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden lg:flex flex-col items-end">
                            <span className="text-[10px] text-teal font-bold uppercase tracking-widest">Active Session</span>
                            <span className="text-xs text-gray-400">Capital.com Live</span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-sm font-semibold border border-white/10"
                        >
                            <LogOut size={16} className="text-teal" />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-12 px-6">
                {/* Mobile Greeting */}
                <div className="md:hidden mb-8">
                    <h2 className="text-sm font-medium text-gray-400">{greeting},</h2>
                    <h1 className="text-3xl font-bold text-white tracking-tight">
                        {getFirstName(data?.user?.fullName)}
                    </h1>
                </div>

                {showConnect && (
                    <div className="max-w-md mx-auto bg-white/5 backdrop-blur-xl p-10 rounded-3xl border border-white/10 text-center shadow-2xl">
                        <div className="w-20 h-20 bg-teal/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-teal/20">
                            <Key size={40} className="text-teal animate-pulse" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-3">System Connecting...</h2>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Establishing secure bridge to Capital.com.<br />This usually takes a few seconds.
                        </p>
                        <div className="mt-8 flex justify-center gap-2">
                            <div className="w-1.5 h-1.5 bg-teal rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-1.5 h-1.5 bg-teal rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-1.5 h-1.5 bg-teal rounded-full animate-bounce"></div>
                        </div>
                    </div>
                )}

                {data?.accounts && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h2 className="text-teal font-bold text-xs uppercase tracking-[0.2em] mb-1">Market Overview</h2>
                                <h3 className="text-3xl font-bold text-white tracking-tight">Trading Portfolio</h3>
                            </div>
                            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                <span className="text-[10px] text-green-500 font-bold uppercase tracking-wider">Live Connectivity</span>
                            </div>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {data.accounts.map((acc: any) => (
                                <div key={acc.accountId} className="group bg-white/5 backdrop-blur-md p-8 rounded-[2rem] border border-white/10 transition-all duration-500 hover:border-teal/30 hover:bg-white/[0.07] hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)]">
                                    <div className="flex justify-between items-start mb-6">
                                        <h3 className="text-sm font-semibold text-gray-400 group-hover:text-gray-200 transition-colors">{acc.accountName}</h3>
                                        <div className="p-2 bg-teal/10 rounded-lg border border-teal/20 text-teal">
                                            <span className="text-[10px] font-bold uppercase">{acc.balance?.currency}</span>
                                        </div>
                                    </div>

                                    <div className="text-4xl font-bold text-white mb-8 tracking-tight font-mono">
                                        {acc.balance?.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
                                        <div>
                                            <span className="block text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Day PnL</span>
                                            <span className={`text-sm font-bold ${acc.balance?.profitLoss >= 0 ? "text-green-500" : "text-red-500"}`}>
                                                {acc.balance?.profitLoss >= 0 ? "+" : ""}{acc.balance?.profitLoss.toFixed(2)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Available</span>
                                            <span className="text-sm font-bold text-gray-300">
                                                {acc.balance?.available.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

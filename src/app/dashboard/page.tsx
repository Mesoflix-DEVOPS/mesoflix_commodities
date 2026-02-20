"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Key, Save, LogOut } from "lucide-react";

export default function DashboardPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [showConnect, setShowConnect] = useState(false);

    // Connect Form State
    // Connect Form State
    // const [login, setLogin] = useState("");
    // const [password, setPassword] = useState("");
    // const [apiKey, setApiKey] = useState("");
    // const [connectLoading, setConnectLoading] = useState(false);
    // const [connectError, setConnectError] = useState("");

    const fetchData = () => {
        setLoading(true);
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
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchData();
    }, [router]);



    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-light-gray dark:bg-dark-blue">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-light-gray dark:bg-dark-blue">
            <nav className="bg-dark-blue text-white py-4 px-6 md:px-12 sticky top-0 z-50 shadow-lg">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="text-2xl font-bold"> <span className="text-white">Mesoflix_</span><span className="text-teal">Dashboard</span></div>
                    <button onClick={handleLogout} className="text-gray-300 hover:text-white transition-colors flex items-center gap-2">
                        <LogOut size={18} />
                        Logout
                    </button>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-12 px-6">

                {showConnect && (
                    <div className="max-w-md mx-auto bg-white dark:bg-gray-900 p-8 rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 text-center">
                        <div className="bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-yellow-600">
                            <Key size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-dark-blue dark:text-white">System Connecting...</h2>
                        <p className="text-gray-500 mt-2">Connecting to Master Capital.com Account.</p>
                        <p className="text-sm text-gray-400 mt-4">If this persists, contact administrator to check System Settings.</p>
                    </div>
                )}

                {data?.accounts && (
                    <>
                        <div className="flex justify-between items-center mb-8">
                            <h1 className="text-3xl font-bold text-dark-blue dark:text-white">Live Market Data</h1>
                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">System Connected</span>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {data.accounts.map((acc: any) => (
                                <div key={acc.accountId} className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-md border border-gray-100 dark:border-gray-800 transition-transform hover:-translate-y-1">
                                    <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">{acc.accountName}</h3>
                                    <div className="text-3xl font-bold text-teal font-mono">
                                        {acc.balance?.balance} <span className="text-sm text-gray-400">{acc.balance?.currency}</span>
                                    </div>
                                    <div className="mt-4 flex justify-between text-sm text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-4">
                                        <span>PnL: <span className={acc.balance?.profitLoss >= 0 ? "text-green-500" : "text-red-500"}>{acc.balance?.profitLoss.toFixed(2)}</span></span>
                                        <span>Available: {acc.balance?.available.toFixed(2)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}

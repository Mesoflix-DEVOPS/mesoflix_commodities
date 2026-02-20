"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Key, Save } from "lucide-react";

export default function DashboardPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [showConnect, setShowConnect] = useState(false);

    // Connect Form State
    const [apiKey, setApiKey] = useState("");
    const [accountId, setAccountId] = useState(""); // Optional/Identifier
    const [connectLoading, setConnectLoading] = useState(false);
    const [connectError, setConnectError] = useState("");

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

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        setConnectLoading(true);
        setConnectError("");

        try {
            const res = await fetch("/api/capital/connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ apiKey, accountId }), // For now, apiKey holds the session tokens or actual key
            });

            if (!res.ok) {
                throw new Error("Failed to connect");
            }

            // Refresh data
            fetchData();
        } catch (err: any) {
            setConnectError(err.message);
        } finally {
            setConnectLoading(false);
        }
    };

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
                    <button onClick={handleLogout} className="text-gray-300 hover:text-white transition-colors">Logout</button>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-12 px-6">

                {showConnect && (
                    <div className="max-w-md mx-auto bg-white dark:bg-gray-900 p-8 rounded-xl shadow-xl border border-gray-100 dark:border-gray-800">
                        <div className="text-center mb-6">
                            <div className="bg-teal/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-teal">
                                <Key size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-dark-blue dark:text-white">Connect Capital.com</h2>
                            <p className="text-gray-500 text-sm mt-2">Enter your session tokens (CST:X-SECURITY-TOKEN) or API Key to start trading.</p>
                        </div>

                        {connectError && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{connectError}</div>}

                        <form onSubmit={handleConnect} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">API Key / Session Token</label>
                                <input
                                    type="text"
                                    required
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-teal outline-none dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                    placeholder="Paste your key here"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Identifier (Optional)</label>
                                <input
                                    type="text"
                                    value={accountId}
                                    onChange={(e) => setAccountId(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-teal outline-none dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                    placeholder="Login ID"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={connectLoading}
                                className="w-full bg-teal text-white font-bold py-3 rounded hover:bg-teal/90 transition-all flex items-center justify-center gap-2"
                            >
                                <Save size={20} />
                                {connectLoading ? "Connecting..." : "Save & Connect"}
                            </button>
                        </form>
                    </div>
                )}

                {data?.accounts && (
                    <>
                        <h1 className="text-3xl font-bold text-dark-blue dark:text-white mb-8">Your Accounts</h1>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {data.accounts.map((acc: any) => (
                                <div key={acc.accountId} className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-md border border-gray-100 dark:border-gray-800 transition-transform hover:-translate-y-1">
                                    <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">{acc.accountName}</h3>
                                    <div className="text-3xl font-bold text-teal font-mono">
                                        {acc.balance?.balance} <span className="text-sm text-gray-400">{acc.balance?.currency}</span>
                                    </div>
                                    <div className="mt-4 flex justify-between text-sm text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-4">
                                        <span>PnL: <span className={acc.balance?.profitLoss >= 0 ? "text-green-500" : "text-red-500"}>{acc.balance?.profitLoss}</span></span>
                                        <span>Available: {acc.balance?.available}</span>
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

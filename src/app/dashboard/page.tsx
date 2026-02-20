"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/landing/Navbar"; // Reusing Navbar for now or create a DashboardNavbar

export default function DashboardPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        fetch("/api/user")
            .then(async (res) => {
                if (res.status === 401) {
                    router.push("/login");
                    return;
                }
                const jsonData = await res.json();
                setData(jsonData);
            })
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-light-gray">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-dark-blue"></div>
            </div>
        );
    }

    // Capital.com API /accounts response structure:
    // { accounts: [ { accountId, accountName, balance: { balance, currency, ... } } ] }
    // Adjust based on actual response.

    return (
        <div className="min-h-screen bg-light-gray">
            <nav className="bg-dark-blue text-white py-4 px-6 md:px-12">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="text-2xl font-bold">Mesoflix Dashboard</div>
                    <button onClick={() => router.push('/')} className="text-gray-300 hover:text-white">Logout</button>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-12 px-6">
                <h1 className="text-3xl font-bold text-dark-blue mb-8">Your Accounts</h1>

                {data?.accounts ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {data.accounts.map((acc: any) => (
                            <div key={acc.accountId} className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                                <h3 className="text-lg font-bold text-gray-700 mb-2">{acc.accountName}</h3>
                                <div className="text-3xl font-bold text-teal">
                                    {acc.balance?.balance} <span className="text-sm text-gray-400">{acc.balance?.currency}</span>
                                </div>
                                <div className="mt-4 flex justify-between text-sm text-gray-500">
                                    <span>PnL: {acc.balance?.profitLoss}</span>
                                    <span>Available: {acc.balance?.available}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-gray-500">No account data available.</div>
                )}
            </main>
        </div>
    );
}

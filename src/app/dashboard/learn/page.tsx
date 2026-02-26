"use client";

import { useState } from "react";
import {
    BookOpen,
    ChevronDown,
    ChevronUp,
    TrendingUp,
    Shield,
    Globe,
    Layers,
    BarChart2,
    Zap,
    HelpCircle,
    AlertTriangle,
    Lightbulb,
    Activity,
    DollarSign,
    ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────

const topics = [
    {
        id: "what-is-capitalcom",
        label: "What is Capital.com?",
        icon: Globe,
        badge: "Start Here",
        badgeColor: "bg-teal/10 text-teal border-teal/20",
    },
    {
        id: "what-is-cfd",
        label: "Understanding CFDs",
        icon: BarChart2,
        badge: null,
    },
    {
        id: "commodities-overview",
        label: "Commodities Overview",
        icon: Layers,
        badge: null,
    },
    {
        id: "gold",
        label: "Gold (XAU/USD)",
        icon: DollarSign,
        badge: "Popular",
        badgeColor: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    },
    {
        id: "oil",
        label: "Oil (WTI & Brent)",
        icon: Activity,
        badge: null,
    },
    {
        id: "silver",
        label: "Silver (XAG/USD)",
        icon: TrendingUp,
        badge: null,
    },
    {
        id: "natural-gas",
        label: "Natural Gas",
        icon: Zap,
        badge: null,
    },
    {
        id: "how-to-trade",
        label: "How to Trade on Mesoflix",
        icon: ArrowRight,
        badge: "Guide",
        badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    },
    {
        id: "risk-management",
        label: "Risk Management",
        icon: Shield,
        badge: "Essential",
        badgeColor: "bg-red-500/10 text-red-400 border-red-500/20",
    },
    {
        id: "faq",
        label: "FAQ",
        icon: HelpCircle,
        badge: null,
    },
];

const content: Record<string, { title: string; body: React.ReactNode }> = {
    "what-is-capitalcom": {
        title: "What is Capital.com?",
        body: (
            <div className="space-y-6">
                <p className="text-gray-300 leading-relaxed text-base">
                    Capital.com is one of the world's most trusted and regulated online trading platforms. Founded in 2016, it has grown rapidly to serve over <span className="text-teal font-semibold">6 million clients</span> across more than <span className="text-teal font-semibold">160 countries</span>, offering access to thousands of financial instruments — from commodities and forex to stocks, indices, and cryptocurrencies.
                </p>
                <div className="bg-white/5 rounded-xl border border-white/10 p-5">
                    <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                        <Shield size={16} className="text-teal" /> Why Capital.com is Trusted
                    </h3>
                    <ul className="space-y-2 text-sm text-gray-300">
                        <li className="flex items-start gap-2"><span className="text-teal mt-1">✓</span> Regulated by top-tier authorities: FCA (UK), ASIC (Australia), CySEC (Cyprus), and NBRB (Belarus).</li>
                        <li className="flex items-start gap-2"><span className="text-teal mt-1">✓</span> Segregated client funds — your money is always kept separate from company funds.</li>
                        <li className="flex items-start gap-2"><span className="text-teal mt-1">✓</span> AI-powered risk management tools built into the platform.</li>
                        <li className="flex items-start gap-2"><span className="text-teal mt-1">✓</span> Zero commission on trades — revenue comes only from competitive spreads.</li>
                        <li className="flex items-start gap-2"><span className="text-teal mt-1">✓</span> Named "Best Trading Platform" multiple times by leading financial publications.</li>
                    </ul>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: "Clients Worldwide", value: "6M+" },
                        { label: "Countries Served", value: "160+" },
                        { label: "Instruments", value: "3,000+" },
                        { label: "Years Operating", value: "8+" },
                    ].map((stat) => (
                        <div key={stat.label} className="bg-white/5 rounded-xl border border-white/10 p-4 text-center">
                            <div className="text-2xl font-bold text-teal">{stat.value}</div>
                            <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
                        </div>
                    ))}
                </div>
                <div className="bg-teal/5 border border-teal/20 rounded-xl p-4">
                    <p className="text-sm text-gray-300"><span className="font-semibold text-teal">Our Connection:</span> Mesoflix_Pro integrates with Capital.com's API to give you institutional-grade market access, live prices, and the ability to execute real trades on commodities — all from within our unified dashboard.</p>
                </div>
            </div>
        ),
    },
    "what-is-cfd": {
        title: "Understanding CFDs (Contracts for Difference)",
        body: (
            <div className="space-y-6">
                <p className="text-gray-300 leading-relaxed">
                    A <span className="text-teal font-semibold">Contract for Difference (CFD)</span> is a financial agreement between you and a broker to exchange the difference in the price of an asset from when you open a position to when you close it. You never actually own the underlying asset — you're simply speculating on whether its price will go up or down.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-5">
                        <h3 className="font-semibold text-green-400 mb-3">Going LONG (Buy)</h3>
                        <p className="text-sm text-gray-300">You believe the price will <strong className="text-green-400">rise</strong>. You open a buy position. If the price goes up, you profit. If it goes down, you lose.</p>
                        <div className="mt-3 p-3 bg-black/30 rounded-lg text-xs text-gray-400 font-mono">
                            Gold at $2,300 → rises to $2,340<br />
                            Profit = $40 × (lot size)
                        </div>
                    </div>
                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
                        <h3 className="font-semibold text-red-400 mb-3">Going SHORT (Sell)</h3>
                        <p className="text-sm text-gray-300">You believe the price will <strong className="text-red-400">fall</strong>. You open a sell position. If the price drops, you profit. If it rises, you lose.</p>
                        <div className="mt-3 p-3 bg-black/30 rounded-lg text-xs text-gray-400 font-mono">
                            Gold at $2,300 → drops to $2,260<br />
                            Profit = $40 × (lot size)
                        </div>
                    </div>
                </div>
                <div className="bg-white/5 rounded-xl border border-white/10 p-5">
                    <h3 className="font-semibold text-white mb-3 flex items-center gap-2"><Lightbulb size={16} className="text-yellow-400" /> Key CFD Concepts</h3>
                    <div className="space-y-3 text-sm text-gray-300">
                        <div><span className="text-white font-medium">Leverage:</span> CFDs use leverage, meaning you only need a fraction of the full trade value as margin. This amplifies both profits and losses.</div>
                        <div><span className="text-white font-medium">Spread:</span> The difference between the buy (ask) price and the sell (bid) price. This is how brokers earn on zero-commission trades.</div>
                        <div><span className="text-white font-medium">Margin:</span> The deposit required to open a leveraged position. For example, 10:1 leverage means $100 controls a $1,000 position.</div>
                        <div><span className="text-white font-medium">Stop Loss:</span> An order that automatically closes your trade if the price moves against you by a set amount — protecting you from large losses.</div>
                        <div><span className="text-white font-medium">Take Profit:</span> An order that automatically closes your trade when it reaches your target profit level.</div>
                    </div>
                </div>
                <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 flex gap-3">
                    <AlertTriangle size={18} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-300"><span className="text-yellow-400 font-semibold">Important:</span> CFDs are complex instruments and carry a high risk of losing money rapidly due to leverage. Always use risk management tools like stop losses.</p>
                </div>
            </div>
        ),
    },
    "commodities-overview": {
        title: "Commodities Overview",
        body: (
            <div className="space-y-6">
                <p className="text-gray-300 leading-relaxed">
                    Commodities are raw materials or primary agricultural products that are traded on exchanges worldwide. They are divided into four main categories, and Mesoflix_Pro gives you access to the most liquid and volatile of them for maximum trading opportunity.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                    {[
                        { name: "Precious Metals", items: ["Gold (XAU/USD)", "Silver (XAG/USD)", "Platinum", "Palladium"], color: "yellow", icon: "🥇" },
                        { name: "Energy", items: ["Crude Oil WTI", "Brent Crude", "Natural Gas", "Heating Oil"], color: "orange", icon: "⚡" },
                        { name: "Agriculture", items: ["Wheat", "Corn", "Soybeans", "Cotton"], color: "green", icon: "🌾" },
                        { name: "Industrial Metals", items: ["Copper", "Aluminium", "Zinc", "Nickel"], color: "blue", icon: "🔧" },
                    ].map((cat) => (
                        <div key={cat.name} className="bg-white/5 border border-white/10 rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-xl">{cat.icon}</span>
                                <h3 className="font-semibold text-white">{cat.name}</h3>
                            </div>
                            <ul className="space-y-1">
                                {cat.items.map((item) => (
                                    <li key={item} className="text-sm text-gray-400 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-teal/60 flex-shrink-0" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
                <div className="bg-white/5 rounded-xl border border-white/10 p-5">
                    <h3 className="font-semibold text-white mb-3">Why Trade Commodities?</h3>
                    <ul className="space-y-2 text-sm text-gray-300">
                        <li className="flex items-start gap-2"><span className="text-teal mt-1">✓</span> <strong className="text-white">Inflation Hedge:</strong> Commodities like gold historically hold value during inflationary periods.</li>
                        <li className="flex items-start gap-2"><span className="text-teal mt-1">✓</span> <strong className="text-white">Portfolio Diversification:</strong> Low correlation to stocks makes commodities excellent portfolio diversifiers.</li>
                        <li className="flex items-start gap-2"><span className="text-teal mt-1">✓</span> <strong className="text-white">High Volatility = Opportunity:</strong> Commodity markets react strongly to geopolitical events and economic data.</li>
                        <li className="flex items-start gap-2"><span className="text-teal mt-1">✓</span> <strong className="text-white">24/5 Trading:</strong> Most commodity markets are tradeable around the clock on weekdays.</li>
                    </ul>
                </div>
            </div>
        ),
    },
    "gold": {
        title: "Gold (XAU/USD) — The Ultimate Safe Haven",
        body: (
            <div className="space-y-6">
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex gap-3">
                    <span className="text-2xl">🥇</span>
                    <div>
                        <p className="text-yellow-400 font-semibold">XAU/USD</p>
                        <p className="text-sm text-gray-300">Price of one troy ounce of gold, denominated in US dollars.</p>
                    </div>
                </div>
                <p className="text-gray-300 leading-relaxed">
                    Gold has been humanity's most prized store of value for over 5,000 years. On Mesoflix_Pro, Gold (XAU/USD) is our most actively traded commodity, favoured by both our automated engines and manual traders alike.
                </p>
                <div className="bg-white/5 rounded-xl border border-white/10 p-5 space-y-3">
                    <h3 className="font-semibold text-white">What Moves Gold Prices?</h3>
                    <div className="space-y-2 text-sm text-gray-300">
                        <div className="flex gap-2"><span className="text-yellow-400">▸</span> <div><span className="text-white font-medium">US Dollar Strength:</span> Gold and the USD typically move inversely. A weaker dollar = higher gold prices.</div></div>
                        <div className="flex gap-2"><span className="text-yellow-400">▸</span> <div><span className="text-white font-medium">Interest Rates:</span> Higher rates increase opportunity cost of holding gold (no yield), pressing prices down.</div></div>
                        <div className="flex gap-2"><span className="text-yellow-400">▸</span> <div><span className="text-white font-medium">Geopolitical Tension:</span> Wars, political crises, and uncertainty drive investors to gold as a safe haven.</div></div>
                        <div className="flex gap-2"><span className="text-yellow-400">▸</span> <div><span className="text-white font-medium">Inflation Data (CPI/PPI):</span> Higher inflation boosts gold demand as a purchasing power hedge.</div></div>
                        <div className="flex gap-2"><span className="text-yellow-400">▸</span> <div><span className="text-white font-medium">Central Bank Buying:</span> When central banks purchase gold reserves, prices often surge.</div></div>
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                        { label: "Typical Spread", value: "0.3 - 0.6 pips" },
                        { label: "Leverage Available", value: "Up to 20:1" },
                        { label: "Trading Hours", value: "Mon–Fri 24hrs" },
                        { label: "Min Trade Size", value: "0.01 lots" },
                        { label: "Price Driver", value: "USD & Rates" },
                        { label: "Volatility", value: "Medium-High" },
                    ].map((s) => (
                        <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                            <div className="text-sm font-semibold text-teal">{s.value}</div>
                            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                        </div>
                    ))}
                </div>
                <div className="bg-teal/5 border border-teal/20 rounded-xl p-4">
                    <p className="text-sm text-gray-300"><span className="text-teal font-semibold">On Mesoflix_Pro:</span> Our Gold engines deploy advanced strategies including momentum triggers, RSI divergence detection, and moving-average crossover signals. These run 24/5 autonomously once deployed.</p>
                </div>
            </div>
        ),
    },
    "oil": {
        title: "Oil Trading — WTI & Brent Crude",
        body: (
            <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
                        <h3 className="font-semibold text-orange-400 mb-2">🛢️ WTI (West Texas Intermediate)</h3>
                        <p className="text-sm text-gray-300">The US benchmark crude oil. Lighter and sweeter than Brent. Traded on NYMEX and typically slightly cheaper than Brent.</p>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                        <h3 className="font-semibold text-blue-400 mb-2">🌊 Brent Crude</h3>
                        <p className="text-sm text-gray-300">The global benchmark crude oil from the North Sea. Used to price about two-thirds of the world's internationally traded oil supplies.</p>
                    </div>
                </div>
                <p className="text-gray-300 leading-relaxed">Oil is the lifeblood of the global economy. Its price affects everything from transportation costs to manufacturing prices, making it one of the most closely watched commodities on earth.</p>
                <div className="bg-white/5 rounded-xl border border-white/10 p-5 space-y-3">
                    <h3 className="font-semibold text-white">Key Price Drivers</h3>
                    <div className="space-y-2 text-sm text-gray-300">
                        <div className="flex gap-2"><span className="text-orange-400">▸</span> <div><span className="text-white font-medium">OPEC+ Decisions:</span> Production cuts or increases by member nations directly impact supply and price.</div></div>
                        <div className="flex gap-2"><span className="text-orange-400">▸</span> <div><span className="text-white font-medium">US Crude Inventories:</span> Weekly EIA report — higher inventories suggest oversupply and pressure prices down.</div></div>
                        <div className="flex gap-2"><span className="text-orange-400">▸</span> <div><span className="text-white font-medium">Global Demand:</span> Economic growth, especially from China and India, drives energy demand high.</div></div>
                        <div className="flex gap-2"><span className="text-orange-400">▸</span> <div><span className="text-white font-medium">Geopolitical Events:</span> Middle East conflicts, pipeline disruptions, and sanctions can cause sudden spikes.</div></div>
                        <div className="flex gap-2"><span className="text-orange-400">▸</span> <div><span className="text-white font-medium">USD Strength:</span> Oil is priced in USD — a weaker dollar makes oil cheaper for foreign buyers, boosting demand.</div></div>
                    </div>
                </div>
            </div>
        ),
    },
    "silver": {
        title: "Silver (XAG/USD) — The Industrial Metal",
        body: (
            <div className="space-y-6">
                <div className="bg-gray-400/10 border border-gray-400/20 rounded-xl p-4 flex gap-3">
                    <span className="text-2xl">🥈</span>
                    <div>
                        <p className="text-gray-300 font-semibold">XAG/USD</p>
                        <p className="text-sm text-gray-400">Price of one troy ounce of silver, denominated in US dollars.</p>
                    </div>
                </div>
                <p className="text-gray-300 leading-relaxed">
                    Silver is unique among precious metals because it serves a dual role: it is both a financial safe-haven asset (like gold) and a critical industrial metal used in solar panels, electronics, and electric vehicles.
                </p>
                <div className="bg-white/5 rounded-xl border border-white/10 p-5 space-y-3">
                    <h3 className="font-semibold text-white">Silver vs Gold</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-gray-300">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="text-left py-2 text-teal">Feature</th>
                                    <th className="text-left py-2 text-yellow-400">Gold</th>
                                    <th className="text-left py-2 text-gray-400">Silver</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {[
                                    ["Volatility", "Medium", "High"],
                                    ["Industrial Use", "Low", "Very High"],
                                    ["Safe Haven", "Strong", "Moderate"],
                                    ["Price Range", "$1,800–$2,500+", "$20–$35+"],
                                    ["Gold/Silver Ratio", "—", "~75–90x cheaper"],
                                ].map(([f, g, s]) => (
                                    <tr key={f}>
                                        <td className="py-2 text-white">{f}</td>
                                        <td className="py-2 text-yellow-400">{g}</td>
                                        <td className="py-2 text-gray-300">{s}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="bg-teal/5 border border-teal/20 rounded-xl p-4">
                    <p className="text-sm text-gray-300"><span className="text-teal font-semibold">Trading Tip:</span> Silver is more volatile than gold, meaning larger price swings — both up and down. This creates more opportunity for skilled traders but also more risk.</p>
                </div>
            </div>
        ),
    },
    "natural-gas": {
        title: "Natural Gas — Energy's Wild Card",
        body: (
            <div className="space-y-6">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
                    <span className="text-2xl">⚡</span>
                    <div>
                        <p className="text-blue-400 font-semibold">NATGAS / NG</p>
                        <p className="text-sm text-gray-400">Priced per MMBtu (Million British Thermal Units). One of the most volatile commodities in the world.</p>
                    </div>
                </div>
                <p className="text-gray-300 leading-relaxed">Natural gas is a critical energy source used for heating  homes, generating electricity, and powering industry. Its price is extremely sensitive to weather patterns, making it one of the most volatile commodities available.</p>
                <div className="bg-white/5 rounded-xl border border-white/10 p-5 space-y-3">
                    <h3 className="font-semibold text-white">What Moves Natural Gas Prices?</h3>
                    <div className="space-y-2 text-sm text-gray-300">
                        <div className="flex gap-2"><span className="text-blue-400">▸</span> <div><span className="text-white font-medium">Weather Forecasts:</span> Cold winters and hot summers spike demand for heating and cooling.</div></div>
                        <div className="flex gap-2"><span className="text-blue-400">▸</span> <div><span className="text-white font-medium">EIA Storage Reports:</span> Weekly inventory data — low storage = higher prices.</div></div>
                        <div className="flex gap-2"><span className="text-blue-400">▸</span> <div><span className="text-white font-medium">LNG Export Levels:</span> More exports reduce domestic supply and push prices up.</div></div>
                        <div className="flex gap-2"><span className="text-blue-400">▸</span> <div><span className="text-white font-medium">Geopolitical Events:</span> The Russia-Ukraine war showed how dramatically gas prices can spike on supply concerns.</div></div>
                    </div>
                </div>
                <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 flex gap-3">
                    <AlertTriangle size={16} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-300"><span className="text-yellow-400 font-semibold">High Volatility Warning:</span> Natural gas can move 5–15% in a single session. Use conservative position sizing and always set stop-loss orders.</p>
                </div>
            </div>
        ),
    },
    "how-to-trade": {
        title: "How to Trade on Mesoflix_Pro",
        body: (
            <div className="space-y-6">
                <p className="text-gray-300 leading-relaxed">Mesoflix_Pro provides two powerful ways to trade commodities: <span className="text-teal font-semibold">Manual Trading</span> via the Trading page, and <span className="text-teal font-semibold">Automated Trading</span> via our bot engines. Here's how both work.</p>
                <div className="space-y-4">
                    {[
                        {
                            step: "1",
                            title: "Connect Your Account",
                            desc: "Mesoflix_Pro connects to Capital.com via our master trading system. Simply log in — your trades will execute through our integrated Capital.com API connection automatically.",
                        },
                        {
                            step: "2",
                            title: "Choose Your Trading Mode",
                            desc: "Navigate to the Trading page for manual chart-based trading, or visit the Automation page to deploy one of our pre-built trading engines for hands-free, 24/5 automated execution.",
                        },
                        {
                            step: "3",
                            title: "Select a Commodity",
                            desc: "Pick from our available commodities: Gold, Silver, Oil (WTI/Brent), Natural Gas, and more. Each has live price feeds from Capital.com.",
                        },
                        {
                            step: "4",
                            title: "Set Your Parameters",
                            desc: "For manual trades: set your position size, stop-loss, and take-profit levels. For automated engines: configure the risk level and let the bot handle execution.",
                        },
                        {
                            step: "5",
                            title: "Monitor & Track",
                            desc: "Watch your positions in real-time on the Dashboard. All closed trades are recorded in the Transactions tab for full history and performance review.",
                        },
                    ].map((s) => (
                        <div key={s.step} className="flex gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                            <div className="w-9 h-9 flex-shrink-0 rounded-full bg-teal/10 border border-teal/20 flex items-center justify-center text-teal font-bold text-sm">
                                {s.step}
                            </div>
                            <div>
                                <h4 className="font-semibold text-white text-sm">{s.title}</h4>
                                <p className="text-sm text-gray-400 mt-1">{s.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        ),
    },
    "risk-management": {
        title: "Risk Management — Protect Your Capital",
        body: (
            <div className="space-y-6">
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3">
                    <Shield size={18} className="text-red-400 flex-shrink-0" />
                    <p className="text-sm text-gray-300">Risk management is not optional — it is the single most important discipline for a long-term successful trader. Even experienced professionals suffer losses. The goal is to ensure no single loss can end your trading career.</p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                    {[
                        { title: "The 1-2% Rule", icon: "💡", desc: "Never risk more than 1-2% of your total capital on any single trade. This ensures even a string of 10 losses doesn't eliminate your account." },
                        { title: "Always Use Stop Loss", icon: "🛑", desc: "A stop-loss order automatically exits your trade if the market moves against you beyond your threshold. Always set one before entering a trade." },
                        { title: "Risk/Reward Ratio", icon: "⚖️", desc: "Aim for a minimum 1:2 risk/reward ratio — risk $1 to potentially gain $2. This means you can be wrong 40% of the time and still be profitable." },
                        { title: "Don't Overtrade", icon: "🧘", desc: "Quality over quantity. Trading too frequently increases transaction costs and emotional decision-making. Wait for high-confidence setups." },
                        { title: "Leverage Caution", icon: "⚠️", desc: "Higher leverage means higher risk. While leverage amplifies profit, it equally amplifies losses. New traders should use low leverage (2:1 to 5:1)." },
                        { title: "Diversify", icon: "🌐", desc: "Don't put all your capital into one commodity. Spreading across Gold, Oil, and other instruments reduces correlated risk." },
                    ].map((tip) => (
                        <div key={tip.title} className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">{tip.icon}</span>
                                <h4 className="font-semibold text-white text-sm">{tip.title}</h4>
                            </div>
                            <p className="text-sm text-gray-400">{tip.desc}</p>
                        </div>
                    ))}
                </div>
                <div className="bg-teal/5 border border-teal/20 rounded-xl p-4">
                    <p className="text-sm text-gray-300"><span className="text-teal font-semibold">Mesoflix_Pro Safety Features:</span> Our automated engines come with built-in stop-loss mechanisms, maximum drawdown limits, and circuit breakers that pause trading if market conditions become unusually volatile.</p>
                </div>
            </div>
        ),
    },
    "faq": {
        title: "Frequently Asked Questions",
        body: <FAQSection />,
    },
};

// ─────────────────────────────────────────────
// FAQ Section
// ─────────────────────────────────────────────

const faqs = [
    {
        q: "What is Mesoflix_Pro?",
        a: "Mesoflix_Pro is an advanced commodity trading intelligence platform that integrates with Capital.com's live market infrastructure. It allows users to trade commodities like Gold, Silver, and Oil, both manually and through automated AI-powered trading engines — all from one unified dashboard.",
    },
    {
        q: "Do I need my own Capital.com account?",
        a: "No. Mesoflix_Pro operates through a master trading system integrated with Capital.com's API. You don't need to create your own Capital.com account — all trading operations run through our platform seamlessly.",
    },
    {
        q: "Is my money safe on the platform?",
        a: "Your funds are managed via Capital.com, which is regulated by top-tier global authorities including the FCA, ASIC, and CySEC. Client funds are held in segregated bank accounts, completely separate from company operational funds.",
    },
    {
        q: "What commodities can I trade?",
        a: "We currently offer Gold (XAU/USD), Silver (XAG/USD), Crude Oil WTI, Brent Crude, and Natural Gas. We continuously add new instruments based on market demand.",
    },
    {
        q: "How do automated trading engines work?",
        a: "Our automated engines are pre-configured trading strategies that analyze live market data and execute buy/sell orders 24 hours a day, 5 days a week. You deploy an engine from the Automation page, set your risk preferences, and it operates independently while you track performance on your dashboard.",
    },
    {
        q: "Can I lose more money than I deposit?",
        a: "With the risk controls built into our system — including stop-loss orders and maximum drawdown limits on automated engines — your losses are capped at predefined levels. However, all trading carries risk and you should only trade with money you can afford to lose.",
    },
    {
        q: "What are the trading hours?",
        a: "Commodity markets are generally open 24 hours a day, Monday through Friday. Specific hours vary by instrument: Gold and Forex trade nearly continuously, while Oil follows the CME/ICE session hours with brief breaks.",
    },
    {
        q: "How do I track my trading history?",
        a: "All closed trades are recorded in the Transactions section of the sidebar. You can view your trade history, profit/loss per trade, and filter by date. The dashboard also shows your portfolio performance at a glance.",
    },
    {
        q: "What is leverage and should I use it?",
        a: "Leverage allows you to control a larger position with a smaller deposit. For example, 10:1 leverage means $100 controls a $1,000 trade. While this magnifies potential profits, it also magnifies losses proportionally. New traders should use minimal leverage until they gain experience.",
    },
    {
        q: "How do I get support if I have an issue?",
        a: "Visit the Support Hub from the sidebar. You can create a support ticket describing your issue, and our agents will respond promptly. The Support Hub shows all your open and resolved tickets.",
    },
    {
        q: "What makes Mesoflix_Pro different from regular trading platforms?",
        a: "Mesoflix_Pro combines institutional-grade Capital.com market access with AI-powered automation, real-time market intelligence, portfolio analytics, and a beautiful, intuitive interface — all in one platform. We also provide this educational hub to ensure every user understands what they're trading.",
    },
    {
        q: "Is there a demo or practice mode?",
        a: "Yes! Our automated engines support a demo mode where they operate against real market conditions but without executing live trades. This lets you test strategies risk-free before going live.",
    },
];

function FAQSection() {
    const [openIdx, setOpenIdx] = useState<number | null>(null);

    return (
        <div className="space-y-3">
            {faqs.map((faq, idx) => (
                <div
                    key={idx}
                    className={cn(
                        "rounded-xl border transition-all duration-300",
                        openIdx === idx
                            ? "border-teal/30 bg-teal/5"
                            : "border-white/10 bg-white/5 hover:border-white/20"
                    )}
                >
                    <button
                        className="w-full flex items-center justify-between px-5 py-4 text-left"
                        onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                    >
                        <span className={cn("font-medium text-sm", openIdx === idx ? "text-teal" : "text-white")}>
                            {faq.q}
                        </span>
                        {openIdx === idx ? (
                            <ChevronUp size={16} className="text-teal flex-shrink-0" />
                        ) : (
                            <ChevronDown size={16} className="text-gray-500 flex-shrink-0" />
                        )}
                    </button>
                    {openIdx === idx && (
                        <div className="px-5 pb-4 text-sm text-gray-300 leading-relaxed border-t border-white/5 pt-3">
                            {faq.a}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────

export default function LearnHubPage() {
    const [activeTopic, setActiveTopic] = useState("what-is-capitalcom");

    const activeContent = content[activeTopic];

    return (
        <div className="min-h-screen bg-[#070E14] text-white">
            {/* Header */}
            <div className="border-b border-white/5 bg-[#0A1622] px-6 md:px-8 py-5">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal/10 border border-teal/20 flex items-center justify-center">
                        <BookOpen size={18} className="text-teal" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg text-white">Learn Hub</h1>
                        <p className="text-xs text-gray-500">Your complete guide to trading on Mesoflix_Pro & Capital.com</p>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="flex flex-col md:flex-row min-h-[calc(100vh-73px)]">

                {/* Topic Navigator */}
                <aside className="w-full md:w-72 md:min-h-full border-b md:border-b-0 md:border-r border-white/5 bg-[#0A1622] p-4 shrink-0">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-1">Topics</p>
                    <div className="space-y-1">
                        {topics.map((topic) => {
                            const isActive = activeTopic === topic.id;
                            return (
                                <button
                                    key={topic.id}
                                    onClick={() => setActiveTopic(topic.id)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200",
                                        isActive
                                            ? "bg-teal/10 border border-teal/20 text-teal"
                                            : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                                    )}
                                >
                                    <topic.icon size={16} className={cn("flex-shrink-0 transition-colors", isActive ? "text-teal" : "group-hover:text-teal")} />
                                    <span className="text-sm font-medium">{topic.label}</span>
                                    {topic.badge && (
                                        <span className={cn("ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border", topic.badgeColor)}>
                                            {topic.badge}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Tip Box */}
                    <div className="mt-6 p-4 bg-teal/5 border border-teal/20 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                            <Lightbulb size={14} className="text-teal" />
                            <span className="text-xs font-semibold text-teal">Pro Tip</span>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">Start with the Capital.com overview and CFD explanations before exploring individual commodities.</p>
                    </div>
                </aside>

                {/* Content Area */}
                <main className="flex-1 p-6 md:p-8 max-w-4xl">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-white">{activeContent?.title}</h2>
                        <div className="mt-1 w-12 h-0.5 rounded bg-teal" />
                    </div>
                    <div>
                        {activeContent?.body}
                    </div>
                </main>
            </div>
        </div>
    );
}

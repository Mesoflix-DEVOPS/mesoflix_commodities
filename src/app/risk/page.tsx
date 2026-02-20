export default function RiskPage() {
    return (
        <div className="min-h-screen bg-light-gray dark:bg-dark-blue py-32 px-6">
            <div className="max-w-4xl mx-auto bg-white dark:bg-gray-900 p-8 md:p-12 rounded-2xl shadow-xl prose dark:prose-invert">
                <h1>Risk Disclosure</h1>
                <p className="border-l-4 border-red-500 pl-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 font-bold mb-8">
                    Trading commodities carries a high level of risk and may not be suitable for all investors.
                </p>

                <h2>1. General Risk</h2>
                <p>Before deciding to trade, you should carefully consider your investment objectives, level of experience, and risk appetite.</p>

                <h2>2. Market Volatility</h2>
                <p>Commodity prices can be highly volatile. Prices can change rapidly due to economic data, geopolitical events, and market sentiment.</p>

                <h2>3. Leverage</h2>
                <p>Leverage can work against you as well as for you. It amplifies both potential profits and potential losses.</p>

                <h2>4. No Advice</h2>
                <p>Mesoflix Commodities provides an execution-only service. We do not provide investment advice.</p>
            </div>
        </div>
    );
}

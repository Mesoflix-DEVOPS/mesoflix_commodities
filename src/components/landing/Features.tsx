import { TrendingUp, ShieldCheck, Zap, Globe, Smartphone, BarChart3 } from 'lucide-react';

const Features = () => {
    const features = [
        {
            icon: <TrendingUp size={40} className="text-teal" />,
            title: "Advanced AI Signals",
            description: "Quality execution signals across Gold, Oil, and Crypto."
        },
        {
            icon: <Zap size={40} className="text-teal" />,
            title: "Instant Execution",
            description: "Powered by Capital.com API. No requotes, no delays. Millisecond trade execution."
        },
        {
            icon: <ShieldCheck size={40} className="text-teal" />,
            title: "Regulated Access",
            description: "Introducing Broker connection. Your data and trades are highly secured."
        },
        {
            icon: <Globe size={40} className="text-teal" />,
            title: "Multi-Asset Automation",
            description: "Access Gold, Oil, and Crypto from a single automated dashboard."
        },
        {
            icon: <Smartphone size={40} className="text-teal" />,
            title: "Professional Analytics",
            description: "Real-time portfolio tracking and performance metrics for serious retail traders."
        },
        {
            icon: <BarChart3 size={40} className="text-teal" />,
            title: "Deep Liquidity",
            description: "Benefit from the deep liquidity pools provided by our Capital.com integration."
        }
    ];

    return (
        <section id="features" className="py-24 bg-white dark:bg-dark-blue/50 relative transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-6 md:px-12">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold text-dark-blue dark:text-white mb-6 tracking-tight">
                        Why Choose <span className="text-golden">Mesoflix?</span>
                    </h2>
                    <p className="text-lg text-gray-600 dark:text-gray-400">
                        We are a specialized Introducing Broker bridging the gap between sophisticated automation and institutional market access.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <div key={index} className="group p-8 rounded-2xl bg-light-gray dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border border-transparent hover:border-gold/30 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                            <div className="w-16 h-16 bg-white dark:bg-dark-blue rounded-xl shadow-md flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-gray-100 dark:border-white/10">
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-bold text-dark-blue dark:text-white mb-3 group-hover:text-gold transition-colors">
                                {feature.title}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Features;

import { TrendingUp, ShieldCheck, Zap, Globe, Smartphone, BarChart3 } from 'lucide-react';

const Features = () => {
    const features = [
        {
            icon: <TrendingUp size={40} className="text-teal" />,
            title: "Real-time Prices",
            description: "Direct feed from Capital.com ensures you trade with the most accurate market data available."
        },
        {
            icon: <Zap size={40} className="text-teal" />,
            title: "Instant Execution",
            description: "No requotes, no delays. Our infrastructure allows for milliseconds trade execution."
        },
        {
            icon: <ShieldCheck size={40} className="text-teal" />,
            title: "Bank-Grade Security",
            description: "Your tokens are AES-256 encrypted. We prioritize your data integrity above all else."
        },
        {
            icon: <Globe size={40} className="text-teal" />,
            title: "Global Markets",
            description: "Access Gold, Silver, Oil, and other major commodities from a single dashboard."
        },
        {
            icon: <Smartphone size={40} className="text-teal" />,
            title: "Mobile Optimized",
            description: "Trade on the go with our fully responsive design that works perfectly on any device."
        },
        {
            icon: <BarChart3 size={40} className="text-teal" />,
            title: "Advanced Analytics",
            description: "Visualize your portfolio performance with intuitive charts and breakdown tools."
        }
    ];

    return (
        <section id="features" className="py-24 bg-white relative">
            <div className="max-w-7xl mx-auto px-6 md:px-12">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold text-dark-blue mb-6">
                        Why Trade with <span className="text-teal">Mesoflix?</span>
                    </h2>
                    <p className="text-lg text-gray-600">
                        We combine powerful technology with a user-friendly interface to provide the best trading experience.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <div key={index} className="group p-8 rounded-2xl bg-light-gray hover:bg-white border border-transparent hover:border-teal/20 shadow-sm hover:shadow-xl transition-all duration-300">
                            <div className="w-16 h-16 bg-white rounded-xl shadow-md flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-gray-100">
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-bold text-dark-blue mb-3 group-hover:text-teal transition-colors">
                                {feature.title}
                            </h3>
                            <p className="text-gray-600 leading-relaxed">
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

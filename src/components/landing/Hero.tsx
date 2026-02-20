import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const Hero = () => {
    return (
        <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden bg-light-gray">
            {/* Background Elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gold/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

            <div className="max-w-7xl mx-auto px-6 md:px-12 grid md:grid-cols-2 gap-12 items-center relative z-10">

                {/* Text Content */}
                <div className="space-y-8 animate-fade-in-up">
                    <h1 className="text-5xl md:text-7xl font-extrabold text-dark-blue leading-tight tracking-tight">
                        Trade <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold to-orange-400">Gold</span>, Silver, Oil
                    </h1>

                    <p className="text-xl text-gray-600 max-w-lg leading-relaxed">
                        Powered by <span className="font-semibold text-dark-blue">Capital.com API</span>.
                        Experience institutional-grade execution with real-time data and automated tools.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <Link href="/login" className="inline-flex items-center justify-center gap-2 bg-dark-blue text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-teal transition-all duration-300 shadow-lg hover:shadow-teal/25 hover:-translate-y-1">
                            Start Trading
                            <ArrowRight size={20} />
                        </Link>
                        <Link href="#features" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-bold text-lg text-dark-blue border-2 border-dark-blue/10 hover:border-dark-blue hover:bg-white transition-all duration-300">
                            Explore Features
                        </Link>
                    </div>
                </div>

                {/* Hero Graphic */}
                <div className="relative h-[400px] md:h-[500px] w-full perspective-1000">
                    <div className="absolute inset-0 bg-gradient-to-br from-dark-blue to-[#001f3f] rounded-3xl shadow-2xl flex items-center justify-center overflow-hidden transform rotate-y-12 hover:rotate-y-0 transition-transform duration-700 ease-out">
                        <div className="absolute inset-0 opacity-20 bg-[url('/grid.svg')]"></div>

                        {/* Floating Elements */}
                        <div className="relative w-full max-w-sm">
                            {/* Gold Card */}
                            <div className="absolute top-0 right-[-20px] bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 shadow-xl animate-float-slow">
                                <div className="text-gray-300 text-xs uppercase tracking-wider mb-1">XAU/USD</div>
                                <div className="text-gold text-2xl font-mono font-bold">1,945.20</div>
                                <div className="text-green-400 text-xs">+1.25%</div>
                            </div>

                            {/* Oil Card */}
                            <div className="absolute bottom-[-150px] left-[-20px] bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 shadow-xl animate-float-medium">
                                <div className="text-gray-300 text-xs uppercase tracking-wider mb-1">UK OIL</div>
                                <div className="text-white text-2xl font-mono font-bold">85.40</div>
                                <div className="text-red-400 text-xs">-0.45%</div>
                            </div>

                            {/* Main Content */}
                            <div className="text-center p-8">
                                <h3 className="text-3xl font-bold text-white mb-2">Live Markets</h3>
                                <p className="text-teal mb-6">Zero Latency. 100% Secure.</p>
                                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div className="w-2/3 h-full bg-gradient-to-r from-teal to-gold animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </section>
    );
};

export default Hero;

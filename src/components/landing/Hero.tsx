import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const Hero = () => {
    return (
        <section className="relative min-h-screen flex items-center justify-center pt-28 pb-12 overflow-hidden bg-light-gray dark:bg-dark-blue transition-colors duration-300">
            {/* Background Elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gold/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-6 md:px-12 grid lg:grid-cols-2 gap-12 items-center relative z-10 w-full">

                {/* Text Content */}
                <div className="space-y-8 animate-fade-in-up text-center lg:text-left">
                    <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-dark-blue dark:text-white leading-tight tracking-tight">
                        Trade <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold to-orange-400">Gold</span>, Silver, Oil
                    </h1>

                    <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-lg mx-auto lg:mx-0 leading-relaxed">
                        Powered by <span className="font-semibold text-dark-blue dark:text-white">Capital.com API</span>.
                        Experience institutional-grade execution with real-time data and automated tools.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center lg:justify-start">
                        <Link href="/login" className="inline-flex items-center justify-center gap-2 bg-dark-blue text-white dark:bg-gold dark:text-dark-blue px-8 py-4 rounded-full font-bold text-lg hover:bg-teal dark:hover:bg-white transition-all duration-300 shadow-lg hover:shadow-teal/25 hover:-translate-y-1">
                            Start Trading
                            <ArrowRight size={20} />
                        </Link>
                        <Link href="#features" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-bold text-lg text-dark-blue dark:text-white border-2 border-dark-blue/10 dark:border-white/10 hover:border-dark-blue dark:hover:border-white hover:bg-white dark:hover:bg-white/5 transition-all duration-300">
                            Explore Features
                        </Link>
                    </div>
                </div>

                {/* Hero Graphic */}
                <div className="relative h-[400px] md:h-[500px] w-full perspective-1000 flex justify-center lg:justify-end">
                    <div className="relative w-full max-w-md h-full bg-gradient-to-br from-dark-blue to-[#001f3f] rounded-3xl shadow-2xl flex items-center justify-center overflow-hidden transform rotate-y-12 hover:rotate-y-0 transition-transform duration-700 ease-out border border-white/10">
                        <div className="absolute inset-0 opacity-20 bg-[url('/grid.svg')]"></div>

                        {/* Floating Elements */}
                        <div className="relative w-full max-w-[80%]">
                            {/* Gold Card */}
                            <div className="absolute -top-12 -right-4 md:-right-12 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 shadow-xl animate-float-slow z-20">
                                <div className="text-gray-300 text-xs uppercase tracking-wider mb-1">XAU/USD</div>
                                <div className="text-gold text-2xl font-mono font-bold">1,945.20</div>
                                <div className="text-green-400 text-xs">+1.25%</div>
                            </div>

                            {/* Oil Card */}
                            <div className="absolute -bottom-12 -left-4 md:-left-12 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 shadow-xl animate-float-medium z-20">
                                <div className="text-gray-300 text-xs uppercase tracking-wider mb-1">UK OIL</div>
                                <div className="text-white text-2xl font-mono font-bold">85.40</div>
                                <div className="text-red-400 text-xs">-0.45%</div>
                            </div>

                            {/* Main Content */}
                            <div className="text-center p-8 bg-black/20 rounded-2xl backdrop-blur-sm border border-white/5">
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

import Link from 'next/link';
import { ArrowRight, ShieldCheck, TrendingUp, BarChart3 } from 'lucide-react';

const Hero = () => {
    return (
        <section className="relative min-h-screen flex items-center justify-center pt-28 pb-12 overflow-hidden bg-light-gray dark:bg-dark-blue transition-colors duration-300">
            {/* Background Elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gold/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-6 md:px-12 grid lg:grid-cols-2 gap-12 items-center relative z-10 w-full">

                {/* Text Content */}
                <div className="space-y-8 animate-fade-in-up text-center lg:text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/20 text-gold text-xs font-bold uppercase tracking-widest">
                        <ShieldCheck size={14} />
                        Introducing Broker
                    </div>
                    <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-dark-blue dark:text-white leading-tight tracking-tight">
                        Master <span className="text-golden">Forex & Commodities</span> Automation
                    </h1>

                    <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                        The ultimate intelligence layer for professional traders. Directly integrated with <span className="font-semibold text-dark-blue dark:text-white">Capital.com API</span> for quality execution on global currencies and raw materials.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center lg:justify-start">
                        <Link href="/login" className="inline-flex items-center justify-center gap-2 bg-dark-blue text-white dark:bg-golden-gradient dark:text-dark-blue px-8 py-4 rounded-xl font-bold text-lg hover:shadow-[0_0_20px_rgba(255,215,0,0.4)] transition-all duration-300 transform hover:-translate-y-1">
                            Start Trading Now
                            <ArrowRight size={20} />
                        </Link>
                        <Link href="#features" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-lg text-dark-blue dark:text-white border-2 border-dark-blue/10 dark:border-white/10 hover:border-gold dark:hover:border-gold hover:bg-white dark:hover:bg-white/5 transition-all duration-300">
                            Explore Assets
                        </Link>
                    </div>
                </div>

                {/* Hero Graphic */}
                <div className="relative h-[450px] md:h-[550px] w-full perspective-1000 flex justify-center lg:justify-end">
                    <div className="relative w-full max-w-md h-full bg-gradient-to-br from-dark-blue to-[#001f3f] rounded-[2rem] shadow-2xl flex items-center justify-center overflow-hidden transform rotate-y-12 hover:rotate-y-0 transition-transform duration-700 ease-out border border-white/10">
                        <div className="absolute inset-0 opacity-20 bg-[url('/grid.svg')]"></div>

                        {/* Floating Elements */}
                        <div className="relative w-full max-w-[85%]">
                            {/* Gold Card */}
                            <div className="absolute -top-16 -right-6 md:-right-16 bg-white/5 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-2xl animate-float-slow z-20">
                                <div className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">XAU/USD</div>
                                <div className="text-gold text-2xl font-mono font-bold tracking-tighter">2,384.50</div>
                                <div className="flex items-center gap-1 text-green-400 text-xs font-bold">
                                    <TrendingUp size={12} />
                                    +2.14%
                                </div>
                            </div>

                            {/* Forex Card */}
                            <div className="absolute top-1/2 -left-8 md:-left-20 bg-white/5 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-2xl animate-float-medium z-20 transform -translate-y-1/2">
                                <div className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">EUR/USD</div>
                                <div className="text-white text-2xl font-mono font-bold tracking-tighter">1.08422</div>
                                <div className="flex items-center gap-1 text-red-400 text-xs font-bold">
                                    <TrendingUp size={12} className="rotate-180" />
                                    -0.15%
                                </div>
                            </div>

                            {/* Main Content */}
                            <div className="text-center p-10 bg-black/40 rounded-3xl backdrop-blur-md border border-white/10 shadow-inner">
                                <div className="w-16 h-16 bg-golden-gradient rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-gold/20">
                                    <BarChart3 size={32} className="text-dark-blue" />
                                </div>
                                <h3 className="text-3xl font-bold text-white mb-2 tracking-tight">Prime Access</h3>
                                <p className="text-teal font-medium tracking-wide mb-8">IB Deep Liquidity</p>
                                <div className="space-y-3">
                                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                        <div className="w-4/5 h-full bg-golden-gradient animate-pulse"></div>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                        <span>Signals</span>
                                        <span>Automation</span>
                                    </div>
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

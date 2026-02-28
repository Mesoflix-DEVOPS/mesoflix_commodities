import Link from 'next/link';
import { Facebook, Twitter, Instagram, Linkedin, ShieldCheck, Mail, Globe, ArrowRight } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="relative bg-white dark:bg-dark-blue border-t border-dark-blue/5 dark:border-white/5 pt-24 pb-12 transition-colors duration-300 overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent"></div>

            <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 mb-20">

                    {/* Brand Section */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 group">
                            <div className="w-10 h-10 bg-golden-gradient rounded-xl flex items-center justify-center shadow-lg shadow-gold/20 group-hover:scale-110 transition-transform duration-500">
                                <span className="text-dark-blue font-bold">M</span>
                            </div>
                            <h3 className="text-2xl font-black tracking-tighter text-dark-blue dark:text-white">
                                Mesoflix<span className="text-teal">_</span>
                            </h3>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-xs">
                            Authorized Introducing Broker providing cutting-edge automation for the modern trader. Institutional liquidity meets retail simplicity.
                        </p>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gold/10 border border-gold/20 text-gold text-[10px] font-bold uppercase tracking-widest">
                            <ShieldCheck size={14} />
                            FCA & ASIC Regulated Partners
                        </div>
                    </div>

                    {/* Ecosystem Links */}
                    <div>
                        <h4 className="text-sm font-bold text-dark-blue dark:text-white uppercase tracking-[0.2em] mb-8">Ecosystem</h4>
                        <ul className="space-y-4 text-gray-500 dark:text-gray-400 text-sm font-medium">
                            <li><Link href="/" className="hover:text-teal dark:hover:text-gold transition-colors flex items-center gap-2 group">Home <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" /></Link></li>
                            <li><Link href="#features" className="hover:text-teal dark:hover:text-gold transition-colors flex items-center gap-2 group">Core Features <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" /></Link></li>
                            <li><Link href="/dashboard/learn" className="hover:text-teal dark:hover:text-gold transition-colors flex items-center gap-2 group">Learn Hub <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" /></Link></li>
                            <li><Link href="/login" className="hover:text-teal dark:hover:text-gold transition-colors flex items-center gap-2 group">Platform Login <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" /></Link></li>
                        </ul>
                    </div>

                    {/* Support & Legal */}
                    <div>
                        <h4 className="text-sm font-bold text-dark-blue dark:text-white uppercase tracking-[0.2em] mb-8">Resources</h4>
                        <ul className="space-y-4 text-gray-500 dark:text-gray-400 text-sm font-medium">
                            <li><Link href="/support" className="hover:text-teal dark:hover:text-gold transition-colors flex items-center gap-2 group">Support Center <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" /></Link></li>
                            <li><Link href="/terms" className="hover:text-teal dark:hover:text-gold transition-colors flex items-center gap-2 group">Terms of Service <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" /></Link></li>
                            <li><Link href="/privacy" className="hover:text-teal dark:hover:text-gold transition-colors flex items-center gap-2 group">Privacy Policy <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" /></Link></li>
                            <li><Link href="/risk" className="hover:text-teal dark:hover:text-gold transition-colors flex items-center gap-2 group">Risk Disclosure <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" /></Link></li>
                        </ul>
                    </div>

                    {/* Contact Section */}
                    <div className="space-y-8">
                        <div>
                            <h4 className="text-sm font-bold text-dark-blue dark:text-white uppercase tracking-[0.2em] mb-6">Connect</h4>
                            <div className="flex gap-4">
                                {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
                                    <Link key={i} href="#" className="w-10 h-10 rounded-xl bg-dark-blue/5 dark:bg-white/5 flex items-center justify-center text-gray-400 hover:text-gold hover:bg-gold/10 transition-all border border-transparent hover:border-gold/20">
                                        <Icon size={18} />
                                    </Link>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-xs text-gray-500 font-bold uppercase tracking-widest">
                                <Mail size={14} className="text-teal" />
                                support@mesoflix.com
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-500 font-bold uppercase tracking-widest">
                                <Globe size={14} className="text-teal" />
                                Worldwide Access
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-12 border-t border-dark-blue/5 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                    <p className="text-gray-500 text-[11px] font-bold uppercase tracking-[0.2em]">
                        &copy; {new Date().getFullYear()} <span className="text-dark-blue dark:text-white">Mesoflix | Introducing Broker</span>. All Rights Reserved.
                    </p>
                    <p className="text-gray-400 text-[10px] max-w-md text-center md:text-right leading-relaxed font-medium">
                        Trading carries significant risk. Mesoflix is an authorized Introducing Broker. All trades are executed via Capital.com. High leverage can work against you.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;


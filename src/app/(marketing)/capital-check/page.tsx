"use client";

import Link from "next/link";
import { ArrowRight, ExternalLink, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CapitalCheckPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen flex items-center justify-center bg-light-gray dark:bg-[#070E14] transition-colors duration-300 p-6">
            <div className="max-w-xl w-full bg-white dark:bg-[#0A1622] rounded-[2rem] border border-dark-blue/5 dark:border-white/10 shadow-2xl p-8 md:p-12 text-center animate-in fade-in zoom-in-95 duration-500">
                <div className="w-20 h-20 bg-golden-gradient rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-gold/20">
                    <ShieldCheck size={40} className="text-dark-blue" />
                </div>
                
                <h1 className="text-3xl md:text-4xl font-black text-dark-blue dark:text-white mb-4 tracking-tight">
                    Do you have a <span className="text-teal">Capital.com</span> trading account?
                </h1>
                
                <p className="text-gray-600 dark:text-gray-400 mb-10 leading-relaxed">
                    Mesoflix is an official Introducing Broker for Capital.com. To guarantee proper tracking, deep liquidity, and automated trade execution, you must link an active Capital.com account during onboarding.
                </p>
                
                <div className="space-y-4">
                    <a
                        href="https://go.capital.com/visit/?bta=44529&brand=capital"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-3 bg-teal text-dark-blue px-6 py-5 rounded-2xl font-black md:text-lg hover:bg-teal/90 hover:shadow-[0_0_20px_rgba(0,191,166,0.3)] transition-all transform hover:-translate-y-1"
                    >
                        Create an account now
                        <ExternalLink size={20} />
                    </a>
                    
                    <button
                        onClick={() => router.push("/login?mode=register")}
                        className="w-full flex items-center justify-center gap-3 bg-dark-blue text-white dark:bg-white/5 dark:text-white px-6 py-5 rounded-2xl font-black md:text-lg border border-dark-blue/10 dark:border-white/10 hover:bg-gray-800 dark:hover:bg-white/10 transition-all transform hover:-translate-y-1"
                    >
                        Proceed with registration
                        <ArrowRight size={20} />
                    </button>
                </div>
                
                <p className="mt-8 text-xs text-gray-500 font-bold uppercase tracking-widest">
                    Already have a Mesoflix account? <Link href="/login" className="text-teal hover:underline ml-1">Sign In</Link>
                </p>
            </div>
        </div>
    );
}

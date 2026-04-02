"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, Sun, Moon, ArrowRight } from "lucide-react";
import { useTheme } from "next-themes";

import { usePathname } from "next/navigation";

const Navbar = () => {
    const pathname = usePathname();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Hide navbar on auth, dashboard, and support portal pages
    const isHiddenPage = pathname === "/login" || pathname === "/register" || pathname?.startsWith("/dashboard") || pathname?.startsWith("/support");

    // Prevent hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    if (isHiddenPage) return null;

    return (
        <nav
            className={`fixed w-full top-0 z-50 transition-all duration-500 ${isScrolled
                ? "bg-white/80 dark:bg-dark-blue/80 backdrop-blur-md py-3 shadow-2xl border-b border-dark-blue/5 dark:border-white/5"
                : "bg-transparent py-6"
                }`}
        >
            <div className="max-w-7xl mx-auto px-6 md:px-12 flex justify-between items-center">
                {/* Logo */}
                <Link
                    href="/"
                    className="text-2xl font-bold tracking-tight flex items-center gap-2 group z-50"
                >
                    <div className="w-8 h-8 bg-gradient-to-br from-teal to-dark-blue rounded flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                        <span className="text-gold text-sm">M</span>
                    </div>
                    <span className="text-dark-blue dark:text-white group-hover:text-teal transition-colors">
                        Mesoflix |
                        <span className="text-teal group-hover:text-gold transition-colors ml-1 hidden sm:inline">Introducing Broker</span>
                        <span className="text-teal group-hover:text-gold transition-colors ml-1 inline sm:hidden">IB</span>
                    </span>
                </Link>

                {/* Desktop Menu */}
                <div className="hidden md:flex space-x-10 items-center font-medium">
                    <NavLink href="/">Home</NavLink>
                    <NavLink href="/#features">Features</NavLink>
                    <NavLink href="/support">Support</NavLink>

                    <div className="h-6 w-px bg-white/10 mx-2" />

                    {mounted && (
                        <button
                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                            className="p-2.5 rounded-xl hover:bg-dark-blue/5 dark:hover:bg-white/10 transition-all text-dark-blue dark:text-white hover:text-gold"
                            aria-label="Toggle Theme"
                        >
                            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                    )}

                    <Link
                        href="/login"
                        className="font-bold text-dark-blue dark:text-white hover:text-teal dark:hover:text-teal transition-colors"
                    >
                        Sign In
                    </Link>
                    <Link
                        href="/capital-check"
                        className="px-8 py-2.5 bg-gradient-to-r from-teal to-[#008f7a] text-white rounded-xl font-bold hover:shadow-[0_0_20px_rgba(0,191,166,0.4)] transition-all transform hover:-translate-y-0.5 active:scale-95 border border-white/10"
                    >
                        Sign Up
                    </Link>
                </div>

                {/* Mobile Actions */}
                <div className="flex md:hidden items-center gap-3 z-50">
                    {mounted && (
                        <button
                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                            className="p-2 rounded-lg bg-dark-blue/5 dark:bg-white/5 text-dark-blue dark:text-white"
                        >
                            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                    )}
                    <button
                        className="p-2 text-dark-blue dark:text-white bg-dark-blue/5 dark:bg-white/5 rounded-lg active:scale-90 transition-all"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        {isMenuOpen ? <X size={26} /> : <Menu size={26} />}
                    </button>
                </div>

                {/* Mobile Drawer */}
                <div
                    className={`fixed inset-0 z-[100] md:hidden transition-all duration-700 ${isMenuOpen ? "visible" : "invisible"}`}
                >
                    {/* Backdrop */}
                    <div
                        className={`absolute inset-0 bg-dark-blue/80 backdrop-blur-md transition-opacity duration-700 ${isMenuOpen ? "opacity-100" : "opacity-0"}`}
                        onClick={() => setIsMenuOpen(false)}
                    />

                    {/* Drawer Content */}
                    <div
                        className={`absolute right-0 top-0 h-screen w-[85%] max-w-[360px] bg-white dark:bg-[#0A1622] border-l border-dark-blue/5 dark:border-white/5 flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-transform duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${isMenuOpen ? "translate-x-0" : "translate-x-full"}`}
                    >
                        {/* Drawer Header */}
                        <div className="p-8 flex justify-between items-center border-b border-dark-blue/5 dark:border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-golden-gradient rounded-xl flex items-center justify-center shadow-lg shadow-gold/20">
                                    <span className="text-dark-blue font-bold">M</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-lg font-bold text-dark-blue dark:text-white leading-none">Mesoflix</span>
                                    <span className="text-[10px] text-teal font-bold uppercase tracking-widest mt-1">Professional</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsMenuOpen(false)}
                                className="p-2.5 rounded-full bg-dark-blue/5 dark:bg-white/5 text-dark-blue dark:text-white hover:bg-dark-blue/10 dark:hover:bg-white/10 transition-all border border-dark-blue/10 dark:border-white/10"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Drawer Links */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-2">
                            <p className="text-[10px] font-bold text-teal uppercase tracking-[0.2em] mb-6 px-4 items-center flex gap-2">
                                <span className="w-1 h-1 bg-teal rounded-full"></span>
                                Navigation
                            </p>
                            <MobileNavLink href="/" onClick={() => setIsMenuOpen(false)}>
                                <span className="group-hover:translate-x-2 transition-transform block">Home</span>
                            </MobileNavLink>
                            <MobileNavLink href="/#features" onClick={() => setIsMenuOpen(false)}>
                                <span className="group-hover:translate-x-2 transition-transform block">Core Features</span>
                            </MobileNavLink>
                            <MobileNavLink href="/support" onClick={() => setIsMenuOpen(false)}>
                                <span className="group-hover:translate-x-2 transition-transform block">Help & Support</span>
                            </MobileNavLink>
                        </div>

                        <div className="p-8 border-t border-dark-blue/5 dark:border-white/5 bg-light-gray dark:bg-black/20 space-y-4">
                            <Link
                                href="/capital-check"
                                onClick={() => setIsMenuOpen(false)}
                                className="w-full py-4 bg-dark-blue dark:bg-teal text-white dark:text-dark-blue rounded-2xl text-center font-bold text-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 group border border-white/10"
                            >
                                <span>Sign Up</span>
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </Link>

                            <Link
                                href="/login"
                                onClick={() => setIsMenuOpen(false)}
                                className="w-full py-4 bg-transparent text-dark-blue dark:text-white rounded-2xl text-center font-bold text-lg hover:bg-dark-blue/5 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-3 border border-dark-blue/20 dark:border-white/20"
                            >
                                <span>Sign In</span>
                            </Link>

                            <div className="mt-8">
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="h-px bg-dark-blue/10 dark:bg-white/10 flex-1"></div>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] whitespace-nowrap px-2">IB Edition</span>
                                    <div className="h-px bg-dark-blue/10 dark:bg-white/10 flex-1"></div>
                                </div>
                                <p className="text-[9px] text-center text-gray-500 uppercase tracking-widest leading-relaxed">
                                    Introducing Broker <br /> Powered by Capital.com API
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

// Helper Components
const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <Link
        href={href}
        className="text-dark-blue/80 dark:text-white/80 hover:text-teal dark:hover:text-teal font-semibold transition-all duration-300 relative group text-sm tracking-wide"
    >
        {children}
        <span className="absolute -bottom-1.5 left-0 w-0 h-[2px] bg-teal rounded-full transition-all duration-300 group-hover:w-full"></span>
    </Link>
);

const MobileNavLink = ({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) => (
    <Link
        href={href}
        onClick={onClick}
        className="text-2xl font-black text-dark-blue/90 dark:text-white hover:text-teal dark:hover:text-gold transition-all flex items-center py-5 group border-b border-dark-blue/5 dark:border-white/5 last:border-0"
    >
        <span className="flex-1 transition-all group-hover:pl-2">{children}</span>
        <ArrowRight size={20} className="text-gray-300 dark:text-gray-700 opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all" />
    </Link>
);

export default Navbar;

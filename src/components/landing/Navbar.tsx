"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";

import { usePathname } from "next/navigation";

const Navbar = () => {
    const pathname = usePathname();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Hide navbar on auth pages
    const isAuthPage = pathname === "/login";

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

    if (isAuthPage) return null;

    return (
        <nav
            className={`fixed w-full top-0 z-50 transition-all duration-500 ${isScrolled
                ? "bg-dark-blue/80 backdrop-blur-md py-3 shadow-2xl border-b border-white/5"
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
                    <span className="text-white group-hover:text-teal transition-colors">
                        Mesoflix_
                        <span className="text-teal group-hover:text-gold transition-colors">Commodities</span>
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
                            className="p-2.5 rounded-xl hover:bg-white/10 transition-all text-white hover:text-gold"
                            aria-label="Toggle Theme"
                        >
                            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                    )}

                    <Link
                        href="/login"
                        className="px-8 py-2.5 bg-gradient-to-r from-teal to-[#008f7a] text-white rounded-xl font-bold hover:shadow-[0_0_20px_rgba(0,191,166,0.4)] transition-all transform hover:-translate-y-0.5 active:scale-95 border border-white/10"
                    >
                        Sign In
                    </Link>
                </div>

                {/* Mobile Actions */}
                <div className="flex md:hidden items-center gap-3 z-50">
                    {mounted && (
                        <button
                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                            className="p-2 rounded-lg bg-white/5 text-white"
                        >
                            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                    )}
                    <button
                        className="p-2 text-white bg-white/5 rounded-lg active:scale-90 transition-all"
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
                        className={`absolute right-0 top-0 h-screen w-[85%] max-w-[360px] bg-[#0A1622] border-l border-white/5 flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-transform duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${isMenuOpen ? "translate-x-0" : "translate-x-full"}`}
                    >
                        {/* Drawer Header */}
                        <div className="p-8 flex justify-between items-center border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-teal to-dark-blue rounded-xl flex items-center justify-center border border-white/10">
                                    <span className="text-gold font-bold">M</span>
                                </div>
                                <span className="text-lg font-bold text-white">Mesoflix</span>
                            </div>
                            <button
                                onClick={() => setIsMenuOpen(false)}
                                className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-white"
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

                        {/* Drawer Footer */}
                        <div className="p-8 border-t border-white/5 bg-black/20">
                            <Link
                                href="/login"
                                onClick={() => setIsMenuOpen(false)}
                                className="w-full py-5 bg-gradient-to-r from-teal to-[#008f7a] text-white rounded-2xl text-center font-bold text-lg hover:shadow-[0_0_30px_rgba(0,191,166,0.3)] transition-all flex items-center justify-center gap-3 group"
                            >
                                <span>Get Started</span>
                                <Sun size={18} className="group-hover:rotate-12 transition-transform" />
                            </Link>
                            <div className="mt-8 flex items-center justify-center gap-6">
                                <div className="h-px bg-white/5 flex-1"></div>
                                <span className="text-[9px] text-gray-600 font-bold uppercase tracking-[0.15em] whitespace-nowrap">Professional Edition</span>
                                <div className="h-px bg-white/5 flex-1"></div>
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
        className="text-white/80 hover:text-teal font-semibold transition-all duration-300 relative group text-sm tracking-wide"
    >
        {children}
        <span className="absolute -bottom-1.5 left-0 w-0 h-[2px] bg-teal rounded-full transition-all duration-300 group-hover:w-full"></span>
    </Link>
);

const MobileNavLink = ({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) => (
    <Link
        href={href}
        onClick={onClick}
        className="text-3xl font-black text-white hover:text-teal transition-all flex items-center py-4 group"
    >
        {children}
    </Link>
);

export default Navbar;

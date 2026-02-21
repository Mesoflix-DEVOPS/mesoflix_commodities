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
                    className={`fixed inset-0 bg-dark-blue/60 backdrop-blur-sm z-40 md:hidden transition-all duration-500 ${isMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                        }`}
                    onClick={() => setIsMenuOpen(false)}
                >
                    <div
                        className={`absolute right-0 top-0 h-screen w-[280px] bg-dark-blue border-l border-white/10 p-8 pt-24 space-y-8 flex flex-col shadow-2xl transition-transform duration-500 ease-out ${isMenuOpen ? "translate-x-0" : "translate-x-full"
                            }`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="space-y-6 flex flex-col">
                            <MobileNavLink href="/" onClick={() => setIsMenuOpen(false)}>Home</MobileNavLink>
                            <MobileNavLink href="/#features" onClick={() => setIsMenuOpen(false)}>Features</MobileNavLink>
                            <MobileNavLink href="/support" onClick={() => setIsMenuOpen(false)}>Support</MobileNavLink>
                        </div>

                        <div className="pt-6 border-t border-white/5 space-y-6">
                            <Link
                                href="/login"
                                onClick={() => setIsMenuOpen(false)}
                                className="w-full py-4 bg-teal text-white rounded-xl text-center font-bold text-lg hover:bg-gold hover:text-dark-blue transition-all inline-block"
                            >
                                Sign In
                            </Link>

                            <div className="text-center text-xs text-gray-500 uppercase tracking-widest font-medium">
                                Premium Trading Platform
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
        className="text-white hover:text-gold transition-colors duration-300 relative group"
    >
        {children}
        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gold transition-all group-hover:w-full"></span>
    </Link>
);

const MobileNavLink = ({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) => (
    <Link
        href={href}
        onClick={onClick}
        className="text-3xl font-bold text-white hover:text-gold transition-colors"
    >
        {children}
    </Link>
);

export default Navbar;

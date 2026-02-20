"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";

const Navbar = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Prevent hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 10) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <nav
            className={`fixed w-full top-0 z-50 transition-all duration-300 ${isScrolled
                ? "glass-dark py-3 shadow-lg"
                : "bg-transparent py-5"
                }`}
        >
            <div className="max-w-7xl mx-auto px-6 md:px-12 flex justify-between items-center">
                {/* Logo */}
                <Link
                    href="/"
                    className="text-2xl font-bold tracking-wide flex items-center gap-1 group z-50"
                >
                    <span className="text-white group-hover:text-gold transition-colors">
                        Mesoflix_
                    </span>
                    <span className="text-teal">Commodities</span>
                </Link>

                {/* Desktop Menu */}
                <div className="hidden md:flex space-x-8 items-center font-medium">
                    <NavLink href="/">Home</NavLink>
                    <NavLink href="/#features">Features</NavLink>
                    <NavLink href="/#about">About</NavLink>

                    {/* Theme Toggle */}
                    {mounted && (
                        <button
                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                            className="p-2 rounded-full hover:bg-white/10 transition-colors text-white"
                            aria-label="Toggle Theme"
                        >
                            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                    )}

                    <Link
                        href="/login"
                        className="px-6 py-2 bg-gradient-to-r from-teal to-[#008f7a] text-white rounded-full hover:shadow-[0_0_15px_rgba(0,191,166,0.5)] transition-all duration-300 transform hover:-translate-y-0.5"
                    >
                        Sign In
                    </Link>
                </div>

                {/* Mobile Actions */}
                <div className="flex items-center gap-4 md:hidden z-50">
                    {mounted && (
                        <button
                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                            className="p-2 rounded-full hover:bg-white/10 transition-colors text-white"
                        >
                            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                    )}
                    <button
                        className="text-white hover:text-gold transition-colors"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
                    </button>
                </div>

                {/* Mobile Menu Overlay */}
                <div
                    className={`fixed inset-0 bg-dark-blue/95 backdrop-blur-xl z-40 flex flex-col items-center justify-center space-y-8 transition-all duration-300 ${isMenuOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
                        }`}
                >
                    <MobileNavLink href="/" onClick={() => setIsMenuOpen(false)}>Home</MobileNavLink>
                    <MobileNavLink href="/#features" onClick={() => setIsMenuOpen(false)}>Features</MobileNavLink>
                    <MobileNavLink href="/#about" onClick={() => setIsMenuOpen(false)}>About</MobileNavLink>
                    <Link
                        href="/login"
                        onClick={() => setIsMenuOpen(false)}
                        className="px-8 py-3 bg-teal text-white rounded-full text-xl font-bold hover:bg-gold hover:text-dark-blue transition-all"
                    >
                        Sign In
                    </Link>
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

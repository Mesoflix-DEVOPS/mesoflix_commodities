import Link from 'next/link';
import { Menu } from 'lucide-react';

const Navbar = () => {
    return (
        <nav className="glass-dark text-white py-4 px-6 md:px-12 fixed w-full top-0 z-50 transition-all duration-300">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                {/* Logo */}
                <Link href="/" className="text-2xl font-bold tracking-wide flex items-center gap-1 group">
                    <span className="text-white group-hover:text-gold transition-colors">Mesoflix_</span>
                    <span className="text-teal">Commodities</span>
                </Link>

                {/* Desktop Menu */}
                <div className="hidden md:flex space-x-8 items-center font-medium">
                    <Link href="#" className="hover:text-gold transition-colors duration-300 relative group">
                        Home
                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gold transition-all group-hover:w-full"></span>
                    </Link>
                    <Link href="#features" className="hover:text-gold transition-colors duration-300 relative group">
                        Features
                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gold transition-all group-hover:w-full"></span>
                    </Link>
                    <Link href="#about" className="hover:text-gold transition-colors duration-300 relative group">
                        About
                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gold transition-all group-hover:w-full"></span>
                    </Link>
                    <Link href="/login" className="px-6 py-2 bg-gradient-to-r from-teal to-[#008f7a] text-white rounded-full hover:shadow-[0_0_15px_rgba(0,191,166,0.5)] transition-all duration-300 transform hover:-translate-y-0.5">
                        Sign In
                    </Link>
                </div>

                {/* Mobile Menu Button (Placeholder) */}
                <button className="md:hidden text-white hover:text-gold transition-colors">
                    <Menu size={28} />
                </button>
            </div>
        </nav>
    );
};

export default Navbar;

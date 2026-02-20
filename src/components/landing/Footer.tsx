import Link from 'next/link';
import { Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="bg-dark-blue text-white py-12">
            <div className="max-w-7xl mx-auto px-6 md:px-12">
                <div className="grid md:grid-cols-4 gap-8 mb-8">

                    {/* Brand */}
                    <div className="col-span-1 md:col-span-1">
                        <h3 className="text-2xl font-bold mb-4"><span className="text-white">Mesoflix_</span><span className="text-teal">Commodities</span></h3>
                        <p className="text-gray-400 text-sm">
                            Premium commodity trading platform powered by Capital.com API.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-lg font-bold text-gold mb-4">Quick Links</h4>
                        <ul className="space-y-2 text-gray-300">
                            <li><Link href="#" className="hover:text-teal transition-colors">Home</Link></li>
                            <li><Link href="#about" className="hover:text-teal transition-colors">About Us</Link></li>
                            <li><Link href="#features" className="hover:text-teal transition-colors">Features</Link></li>
                            <li><Link href="/login" className="hover:text-teal transition-colors">Sign In</Link></li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h4 className="text-lg font-bold text-gold mb-4">Legal</h4>
                        <ul className="space-y-2 text-gray-300">
                            <li><Link href="/terms" className="hover:text-teal transition-colors">Terms of Service</Link></li>
                            <li><Link href="/privacy" className="hover:text-teal transition-colors">Privacy Policy</Link></li>
                            <li><Link href="/risk" className="hover:text-teal transition-colors">Risk Disclosure</Link></li>
                        </ul>
                    </div>

                    {/* Socials */}
                    <div>
                        <h4 className="text-lg font-bold text-gold mb-4">Connect</h4>
                        <div className="flex space-x-4">
                            <a href="#" className="hover:text-teal transition-colors"><Facebook size={24} /></a>
                            <a href="#" className="hover:text-teal transition-colors"><Twitter size={24} /></a>
                            <a href="#" className="hover:text-teal transition-colors"><Instagram size={24} /></a>
                            <a href="#" className="hover:text-teal transition-colors"><Linkedin size={24} /></a>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-700 pt-8 text-center text-gray-500 text-sm">
                    &copy; {new Date().getFullYear()} Mesoflix_Commodities. All rights reserved.
                </div>
            </div>
        </footer>
    );
};

export default Footer;

"use client";

import Link from "next/link";
import { Mail, MessageSquare, Phone, ArrowLeft, Send } from "lucide-react";

export default function SupportPage() {
    return (
        <div className="min-h-screen bg-[#0D1B2A] text-white pt-24 pb-12 px-4">
            <div className="max-w-4xl mx-auto">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-teal hover:text-gold transition-colors mb-8"
                >
                    <ArrowLeft size={20} />
                    <span>Back to Home</span>
                </Link>

                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-teal to-gold bg-clip-text text-transparent">
                        How can we help?
                    </h1>
                    <p className="text-gray-400 text-lg">
                        Our team of experts is here to assist you with your commodity trading journey.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6 mb-12">
                    <SupportCard
                        icon={<Mail className="text-teal" size={32} />}
                        title="Email Us"
                        description="Direct support for technical questions."
                        contact="support@mesoflix.com"
                    />
                    <SupportCard
                        icon={<MessageSquare className="text-gold" size={32} />}
                        title="Live Chat"
                        description="Available 24/5 for active traders."
                        contact="Start Chatting"
                    />
                    <SupportCard
                        icon={<Phone className="text-teal" size={32} />}
                        title="Phone Support"
                        description="Priority assistance for VIP accounts."
                        contact="+1 (555) 000-0000"
                    />
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 transition-all hover:border-white/20">
                    <h2 className="text-2xl font-bold mb-6">Send us a Message</h2>
                    <form className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Name</label>
                                <input
                                    type="text"
                                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-teal outline-none transition-all"
                                    placeholder="Your full name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Email</label>
                                <input
                                    type="email"
                                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-teal outline-none transition-all"
                                    placeholder="name@example.com"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Subject</label>
                            <input
                                type="text"
                                className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-teal outline-none transition-all"
                                placeholder="What can we help with?"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Message</label>
                            <textarea
                                rows={4}
                                className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-teal outline-none transition-all"
                                placeholder="Describe your issue in detail..."
                            ></textarea>
                        </div>
                        <button
                            type="button"
                            className="w-full bg-gradient-to-r from-teal to-[#1B263B] text-gold font-bold py-4 rounded-xl hover:shadow-[0_0_20px_rgba(0,191,166,0.3)] transition-all flex items-center justify-center gap-2"
                        >
                            <Send size={20} />
                            <span>Send Message</span>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

function SupportCard({ icon, title, description, contact }: { icon: React.ReactNode, title: string, description: string, contact: string }) {
    return (
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col items-center text-center transition-all hover:bg-white/10 hover:-translate-y-1">
            <div className="mb-4">{icon}</div>
            <h3 className="text-xl font-bold mb-2">{title}</h3>
            <p className="text-gray-400 text-sm mb-4">{description}</p>
            <span className="text-teal font-semibold">{contact}</span>
        </div>
    );
}

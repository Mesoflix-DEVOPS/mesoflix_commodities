"use client";

import Link from "next/link";
import { Mail, MessageSquare, Phone, ArrowLeft, Send, ShieldCheck } from "lucide-react";

export default function SupportPage() {
    return (
        <div className="min-h-screen bg-[#0D1B2A] text-white pt-24 pb-12 px-4 transition-all duration-500">
            <div className="max-w-4xl mx-auto">
                <div className="mb-12">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-teal hover:text-gold transition-all group"
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="font-bold uppercase tracking-widest text-xs">Back to Home</span>
                    </Link>
                </div>

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center mb-12">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-teal to-gold bg-clip-text text-transparent tracking-tight">
                            How can we help?
                        </h1>
                        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
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

                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 md:p-12 transition-all hover:border-white/20 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <ShieldCheck size={120} className="text-teal" />
                        </div>
                        <h2 className="text-2xl font-bold mb-6">Send us a Message</h2>
                        <form className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest px-2">Name</label>
                                    <input
                                        type="text"
                                        className="w-full bg-white/5 border border-white/10 text-white px-4 py-4 rounded-2xl focus:ring-2 focus:ring-teal outline-none transition-all"
                                        placeholder="Your full name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest px-2">Email</label>
                                    <input
                                        type="email"
                                        className="w-full bg-white/5 border border-white/10 text-white px-4 py-4 rounded-2xl focus:ring-2 focus:ring-teal outline-none transition-all"
                                        placeholder="name@example.com"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest px-2">Subject</label>
                                <input
                                    type="text"
                                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-4 rounded-2xl focus:ring-2 focus:ring-teal outline-none transition-all"
                                    placeholder="What can we help with?"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest px-2">Message</label>
                                <textarea
                                    rows={4}
                                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-4 rounded-2xl focus:ring-2 focus:ring-teal outline-none transition-all resize-none"
                                    placeholder="Describe your issue in detail..."
                                ></textarea>
                            </div>
                            <button
                                type="button"
                                className="w-full bg-teal text-dark-blue font-black py-5 rounded-2xl hover:shadow-[0_0_30px_rgba(0,191,166,0.3)] transition-all flex items-center justify-center gap-3 transform active:scale-[0.98]"
                            >
                                <Send size={20} />
                                <span>Send Message</span>
                            </button>
                        </form>
                    </div>
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

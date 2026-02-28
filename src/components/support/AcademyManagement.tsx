"use client";

import { useState, useEffect } from "react";
import { Plus, Youtube, MessageSquare, GraduationCap, Trash2, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Class {
    id: string;
    title: string;
    description: string;
    youtube_url: string;
    category: string;
}

export default function AcademyManagement() {
    const [classes, setClasses] = useState<Class[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);

    // Form state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [youtubeUrl, setYoutubeUrl] = useState("");
    const [category, setCategory] = useState("Beginner");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        try {
            const res = await fetch("/api/academy/classes");
            if (res.ok) {
                const data = await res.json();
                setClasses(data);
            }
        } catch (err) {
            console.error("Failed to fetch classes", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError("");
        setSuccess("");

        try {
            const res = await fetch("/api/academy/classes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, description, youtube_url: youtubeUrl, category }),
            });

            if (res.ok) {
                setSuccess("Class uploaded successfully!");
                setTitle("");
                setDescription("");
                setYoutubeUrl("");
                setCategory("Beginner");
                setShowForm(false);
                fetchClasses();
            } else {
                const data = await res.json();
                setError(data.error || "Failed to upload class");
            }
        } catch (err) {
            setError("A network error occurred.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <GraduationCap className="text-teal" />
                        Academy Management
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">Upload and manage trading lessons for users.</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 bg-teal/10 hover:bg-teal/20 text-teal px-4 py-2 rounded-xl border border-teal/20 transition-all font-bold"
                >
                    <Plus size={20} />
                    {showForm ? "Cancel" : "New Class"}
                </button>
            </div>

            {showForm && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 animate-in slide-in-from-top-4 duration-300">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase">Lesson Title</label>
                                <input
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Introduction to Gold Trading"
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:border-teal outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase">Difficulty Category</label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:border-teal outline-none transition-all appearance-none"
                                >
                                    <option value="Beginner">Beginner</option>
                                    <option value="Intermediate">Intermediate</option>
                                    <option value="Advanced">Advanced</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">YouTube Link</label>
                            <div className="relative">
                                <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                <input
                                    required
                                    value={youtubeUrl}
                                    onChange={(e) => setYoutubeUrl(e.target.value)}
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    className="w-full bg-black/20 border border-white/10 rounded-xl pl-12 pr-4 py-3 focus:border-teal outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">Short Description</label>
                            <textarea
                                required
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={2}
                                placeholder="Explain what users will learn in this class..."
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:border-teal outline-none transition-all resize-none"
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-4 rounded-xl text-sm border border-red-400/20">
                                <AlertCircle size={18} />
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="flex items-center gap-2 text-teal bg-teal/10 p-4 rounded-xl text-sm border border-teal/20">
                                <CheckCircle2 size={18} />
                                {success}
                            </div>
                        )}

                        <button
                            disabled={isSubmitting}
                            type="submit"
                            className="w-full bg-teal text-dark-blue font-black py-4 rounded-xl hover:shadow-[0_0_20px_rgba(0,191,166,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" /> : "Upload to Academy"}
                        </button>
                    </form>
                </div>
            )}

            <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest px-2">Current Academy Classes</h3>
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="animate-spin text-teal" size={32} />
                    </div>
                ) : classes.length === 0 ? (
                    <div className="text-center py-12 bg-white/5 border border-white/10 rounded-2xl">
                        <p className="text-gray-400">No classes uploaded yet.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {classes.map((cls) => (
                            <div key={cls.id} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between group hover:border-white/20 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-black/20 rounded-xl flex items-center justify-center text-teal">
                                        <Youtube size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold">{cls.title}</h4>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className={cn(
                                                "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                                                cls.category === "Beginner" && "bg-teal/10 text-teal",
                                                cls.category === "Intermediate" && "bg-gold/10 text-gold",
                                                cls.category === "Advanced" && "bg-red-400/10 text-red-400"
                                            )}>
                                                {cls.category}
                                            </span>
                                            <span className="text-xs text-gray-500 truncate max-w-[200px] md:max-w-md">{cls.description}</span>
                                        </div>
                                    </div>
                                </div>
                                <button className="p-2 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

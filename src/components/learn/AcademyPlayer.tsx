"use client";

import { useEffect, useRef, useState } from "react";
import {
    Play,
    Pause,
    RotateCcw,
    CheckCircle2,
    FileDown,
    MessageSquare,
    ChevronLeft,
    Loader2,
    Save,
    Lightbulb
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AcademyPlayerProps {
    lesson: {
        id: string;
        title: string;
        description: string;
        youtube_url: string;
        category: string;
        thumbnail_url?: string;
    };
    onBack: () => void;
}

declare global {
    interface Window {
        onYouTubeIframeAPIReady: () => void;
        YT: any;
    }
}

export default function AcademyPlayer({ lesson, onBack }: AcademyPlayerProps) {
    const [player, setPlayer] = useState<any>(null);
    const [isApiLoaded, setIsApiLoaded] = useState(false);
    const [notes, setNotes] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isDone, setIsDone] = useState(false);
    const [isNotesActive, setIsNotesActive] = useState(false);
    const [showFullDescription, setShowFullDescription] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Load YouTube API
    useEffect(() => {
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

            window.onYouTubeIframeAPIReady = () => {
                setIsApiLoaded(true);
            };
        } else {
            setIsApiLoaded(true);
        }

        // Fetch user progress and notes
        fetchLessonData();

        return () => {
            if (player) {
                player.destroy();
            }
        };
    }, []);

    const fetchLessonData = async () => {
        try {
            const res = await fetch(`/api/academy/progress?class_id=${lesson.id}`);
            if (res.ok) {
                const data = await res.json();
                setNotes(data.notes || "");
                setIsDone(data.is_done || false);
            }
        } catch (err) {
            console.error("Failed to fetch lesson data", err);
        }
    };

    // Initialize Player when API is ready
    useEffect(() => {
        if (isApiLoaded && !player) {
            const videoId = extractVideoId(lesson.youtube_url);
            new window.YT.Player('youtube-player', {
                height: '100%',
                width: '100%',
                videoId: videoId,
                playerVars: {
                    playsinline: 1,
                    modestbranding: 1,
                    rel: 0,
                },
                events: {
                    onReady: (event: any) => setPlayer(event.target),
                }
            });
        }
    }, [isApiLoaded, lesson.youtube_url]);

    const extractVideoId = (url: string) => {
        // Handle full URLs
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        const result = (match && match[2].length === 11) ? match[2] : url;
        
        // Strip tracking/query params (e.g., ?si=...) if they survived
        return result.split('?')[0].split('&')[0].trim();
    };

    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const lastChar = newValue.slice(-1);

        // Smart Lists: Auto-continue numbering or bullets on Enter
        if (lastChar === '\n') {
            const lines = newValue.split('\n');
            const lastLine = lines[lines.length - 2];

            // Check for Numbered List (e.g., "1. ")
            const numMatch = lastLine?.match(/^(\d+)\.\s/);
            if (numMatch) {
                const nextNum = parseInt(numMatch[1]) + 1;
                setNotes(newValue + `${nextNum}. `);
                return;
            }

            // Check for Bullet List (e.g., "- ")
            if (lastLine?.startsWith('- ')) {
                setNotes(newValue + '- ');
                return;
            }
        }

        setNotes(newValue);
        setIsNotesActive(true);

        // Auto-pause video when typing
        if (player && player.getPlayerState() === (window.YT?.PlayerState?.PLAYING ?? 1)) {
            player.pauseVideo();
        }

        // Resume video after 2 seconds of inactivity
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            setIsNotesActive(false);
            if (player) {
                player.playVideo();
            }
            saveNotes(newValue);
        }, 2000);
    };

    const saveNotes = async (content: string) => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/academy/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ class_id: lesson.id, content }),
            });
            if (!res.ok) throw new Error("Save failed");
        } catch (err) {
            console.error("Failed to save notes", err);
        } finally {
            setIsSaving(false);
        }
    };

    const toggleComplete = async () => {
        const nextStatus = !isDone;
        setIsDone(nextStatus);
        try {
            await fetch('/api/academy/progress', {
                method: 'POST',
                body: JSON.stringify({ class_id: lesson.id, is_done: nextStatus }),
            });
        } catch (err) {
            console.error("Failed to update progress", err);
        }
    };

    const exportToPDF = async () => {
        if (!notes) {
            alert("No notes to export yet!");
            return;
        }

        try {
            const { jsPDF } = await import('jspdf');
            const doc = new jsPDF();

            // Premium Header
            doc.setFillColor(10, 22, 34); // Dark Blue Theme
            doc.rect(0, 0, 210, 40, 'F');

            doc.setTextColor(20, 184, 166); // Teal Accent
            doc.setFontSize(24);
            doc.setFont("helvetica", "bold");
            doc.text("MESOFLIX ACADEMY", 20, 25);

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10);
            doc.text("Official Learning Notes", 20, 32);

            // Lesson Info
            doc.setTextColor(10, 22, 34);
            doc.setFontSize(18);
            doc.text(lesson.title, 20, 60);

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100, 116, 139);
            doc.text(`Category: ${lesson.category}`, 20, 68);
            doc.text(`Exported on: ${new Date().toLocaleDateString()}`, 20, 73);

            doc.setDrawColor(20, 184, 166);
            doc.setLineWidth(0.5);
            doc.line(20, 80, 190, 80);

            // Notes Content
            doc.setTextColor(51, 65, 85);
            doc.setFontSize(12);
            const splitText = doc.splitTextToSize(notes, 170);
            doc.text(splitText, 20, 95);

            // Footer
            const pageCount = (doc as any).internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(148, 163, 184);
                doc.text(`Page ${i} of ${pageCount} | Mesoflix Commodities Terminal`, 105, 285, { align: 'center' });
            }

            doc.save(`Academy_Notes_${lesson.title.replace(/\s+/g, '_')}.pdf`);
        } catch (err) {
            console.error("PDF Export failed", err);
            alert("External export failed. Please try again.");
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 flex flex-col gap-0 md:gap-4 h-full">
            {/* Header - Transparent and professional on mobile */}
            <div className="flex flex-col gap-4 p-4 md:p-0 md:mb-8 bg-[#0A1622]/50 md:bg-transparent backdrop-blur-md md:backdrop-blur-none border-b border-white/5 md:border-none">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-gray-400 hover:text-teal transition-colors group w-fit"
                >
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-teal/10 transition-all border border-white/10 group-hover:border-teal/20">
                        <ChevronLeft size={18} />
                    </div>
                    <span className="font-bold uppercase tracking-widest text-[10px] sm:text-xs">Back to curriculum</span>
                </button>

                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
                    <button
                        onClick={exportToPDF}
                        className="flex-shrink-0 bg-white/5 hover:bg-white/10 text-white px-4 py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-[0.15em] transition-all border border-white/10 flex items-center gap-2 whitespace-nowrap"
                    >
                        <FileDown size={14} className="text-teal" />
                        Export Notes
                    </button>
                    <button
                        onClick={toggleComplete}
                        className={cn(
                            "flex-shrink-0 px-4 py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-[0.15em] transition-all flex items-center gap-2 border whitespace-nowrap",
                            isDone
                                ? "bg-teal/20 text-teal border-teal/30 hover:bg-teal/30"
                                : "bg-white/5 text-gray-400 border-white/10 hover:border-teal/30 hover:text-white"
                        )}
                    >
                        {isDone ? <CheckCircle2 size={14} /> : <div className="w-3.5 h-3.5 rounded-full border border-current opacity-50" />}
                        {isDone ? "Completed" : "Mark as Done"}
                    </button>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-0 md:gap-8">
                {/* Player Section */}
                <div className="lg:col-span-2 space-y-0 md:space-y-6 min-w-0">
                    <div className="bg-black aspect-video md:rounded-[2.5rem] overflow-hidden shadow-2xl md:border border-white/10 relative group">
                        <div id="youtube-player" className="w-full h-full" />

                        {!player && (
                            <img
                                src={lesson.thumbnail_url || `https://img.youtube.com/vi/${extractVideoId(lesson.youtube_url)}/maxresdefault.jpg`}
                                alt="Video Thumbnail"
                                className="absolute inset-0 w-full h-full object-cover opacity-50 blur-sm group-hover:blur-0 transition-all duration-700"
                            />
                        )}

                        {!isApiLoaded && (
                            <div className="absolute inset-0 flex items-center justify-center bg-dark-blue/80 backdrop-blur-md">
                                <Loader2 className="animate-spin text-teal" size={48} />
                            </div>
                        )}

                        {/* Typing Overlay */}
                        {isNotesActive && (
                            <div className="absolute inset-x-0 top-0 p-4 animate-in slide-in-from-top-4 duration-300">
                                <div className="bg-teal/90 backdrop-blur-sm text-dark-blue px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 w-fit mx-auto shadow-xl">
                                    <Pause size={12} fill="currentColor" />
                                    Auto-Paused while typing
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-5 md:p-0">
                        <div className="flex items-center gap-3 mb-3">
                            <span className={cn(
                                "text-[10px] font-black uppercase px-3 py-1 rounded-full border",
                                lesson.category === "Beginner" && "bg-teal/10 text-teal border-teal/20",
                                lesson.category === "Intermediate" && "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
                                lesson.category === "Advanced" && "bg-red-500/10 text-red-500 border-red-500/20",
                            )}>
                                {lesson.category}
                            </span>
                        </div>
                        <h1 className="text-xl sm:text-3xl font-black text-white mb-3 leading-tight tracking-tight uppercase">{lesson.title}</h1>

                        <div className="relative">
                            <p className={cn(
                                "text-gray-400 leading-relaxed text-sm sm:text-lg transition-all duration-500",
                                !showFullDescription && "line-clamp-2 md:line-clamp-none"
                            )}>
                                {lesson.description}
                            </p>
                            <button
                                onClick={() => setShowFullDescription(!showFullDescription)}
                                className="md:hidden mt-2 text-teal text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors"
                            >
                                {showFullDescription ? "View Less ▲" : "Read More ▼"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Notes Section */}
                <div className="p-5 md:p-0 space-y-6 h-fit min-w-0">
                    <div className="bg-[#0A1622] border border-white/10 md:rounded-[2.5rem] rounded-3xl overflow-hidden flex flex-col h-[400px] sm:h-[500px] shadow-2xl">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                            <div className="flex items-center gap-2">
                                <MessageSquare size={18} className="text-teal" />
                                <h3 className="font-bold text-white tracking-tight">Interactive Notes</h3>
                            </div>
                            <button
                                onClick={() => saveNotes(notes)}
                                disabled={isSaving}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border",
                                    isSaving
                                        ? "bg-teal/20 text-teal border-teal/30"
                                        : "bg-white/5 text-gray-400 border-white/10 hover:border-teal/30 hover:text-white"
                                )}
                            >
                                {isSaving ? <Loader2 className="animate-spin" size={12} /> : <Save size={12} />}
                                {isSaving ? "Saving..." : "Save Notes"}
                            </button>
                        </div>

                        <div className="flex-1 relative">
                            <textarea
                                value={notes}
                                onChange={handleNotesChange}
                                placeholder="Start typing your notes here. The video will auto-pause to give you time, and resume when you're done."
                                className="w-full h-full bg-transparent p-6 text-gray-300 text-sm leading-relaxed resize-none focus:outline-none placeholder:text-gray-600 custom-scrollbar"
                            />

                            {!notes && (
                                <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-12 text-center">
                                    <p className="text-xs text-gray-600 font-medium">As you watch, jot down key insights, strategies, or questions. Your notes are saved automatically.</p>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-white/[0.02] border-t border-white/10 flex items-center justify-between">
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Auto-saved to your profile</p>
                            <Save size={14} className={cn("transition-colors", isSaving ? "text-teal" : "text-gray-600")} />
                        </div>
                    </div>

                    <div className="bg-teal/5 border border-teal/20 rounded-[2rem] p-6 relative overflow-hidden group">
                        <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
                            <Lightbulb size={64} className="text-teal" />
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                            <Lightbulb size={16} className="text-teal" />
                            <span className="text-xs font-bold text-teal uppercase tracking-widest">Note-taking Tip</span>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed font-medium">Capture specific timecodes (e.g., 04:32) to easily reference key moments in the video later.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

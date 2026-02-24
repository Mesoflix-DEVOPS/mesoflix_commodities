"use client";
import { useEffect, useRef } from "react";
import { Calendar as CalendarIcon } from "lucide-react";

export default function CalendarPage() {
    const container = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!container.current) return;
        // Clean up previous script if re-rendering
        container.current.innerHTML = '';

        const script = document.createElement("script");
        script.src = "https://s3.tradingview.com/external-embedding/embed-widget-events.js";
        script.type = "text/javascript";
        script.async = true;
        // Dark theme configuration
        script.innerHTML = `
        {
          "colorTheme": "dark",
          "isTransparent": true,
          "width": "100%",
          "height": "100%",
          "locale": "en",
          "importanceFilter": "-1,0,1",
          "countryFilter": "ar,au,br,ca,cn,fr,de,in,id,it,jp,kr,mx,ru,sa,za,tr,gb,us,eu"
        }`;

        container.current.appendChild(script);
    }, []);

    return (
        <div className="space-y-6 h-[calc(100vh-140px)] animate-in fade-in duration-700 flex flex-col">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal/10 border border-teal/20 flex items-center justify-center text-teal">
                    <CalendarIcon size={20} />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight">Economic Calendar</h1>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">Global Market Events & News</p>
                </div>
            </div>

            <div className="flex-1 bg-[#0E1B2A] rounded-3xl border border-white/5 overflow-hidden shadow-2xl relative">
                {/* Loader showing underneath the transparent widget */}
                <div className="absolute inset-0 flex items-center justify-center -z-10">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-8 h-8 border-2 border-teal/20 border-t-teal rounded-full animate-spin" />
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Loading Events Data...</span>
                    </div>
                </div>
                <div className="w-full h-full" ref={container} />
            </div>
        </div>
    );
}

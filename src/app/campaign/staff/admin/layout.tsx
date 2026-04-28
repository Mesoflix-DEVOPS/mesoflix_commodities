import { ReactNode } from "react";
import CampaignAdminSidebar from "@/components/campaign/admin/AdminSidebar";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function CampaignAdminLayout({ children }: { children: ReactNode }) {
    const session = await auth();
    
    // Strict Institutional Security
    if (!session || session.user.role !== 'admin') {
        redirect("/campaign/dashboard");
    }

    return (
        <div className="min-h-screen bg-[#06111C] text-white selection:bg-teal/30 flex overflow-x-hidden">
            {/* Sidebar */}
            <CampaignAdminSidebar />

            {/* Main Area */}
            <main className="flex-1 lg:pl-0 pt-16 lg:pt-0">
                <div className="lg:pl-64 h-full min-h-screen transition-all duration-500">
                    <div className="max-w-7xl mx-auto p-4 md:p-8 lg:p-12">
                        {children}
                    </div>
                </div>
            </main>

            {/* Background elements */}
            <div className="fixed top-0 right-0 w-1/3 h-1/2 bg-teal/5 blur-[120px] rounded-full -mr-24 -mt-24 pointer-events-none z-0" />
            <div className="fixed bottom-0 left-0 w-1/4 h-1/3 bg-blue-500/5 blur-[100px] rounded-full -ml-12 -mb-12 pointer-events-none z-0" />
        </div>
    );
}

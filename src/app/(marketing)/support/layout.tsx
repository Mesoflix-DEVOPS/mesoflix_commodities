export default function SupportLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[#060D14] text-gray-100 flex flex-col font-sans selection:bg-teal/30">
            {children}
        </div>
    );
}

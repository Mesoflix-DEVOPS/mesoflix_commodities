export default function TermsPage() {
    return (
        <div className="min-h-screen bg-light-gray dark:bg-dark-blue py-32 px-6">
            <div className="max-w-4xl mx-auto bg-white dark:bg-gray-900 p-8 md:p-12 rounded-2xl shadow-xl prose dark:prose-invert">
                <h1>Terms of Service</h1>
                <p className="text-sm text-gray-500">Last Updated: {new Date().toLocaleDateString()}</p>

                <h2>1. Introduction</h2>
                <p>Welcome to Mesoflix Commodities. By accessing our platform, you agree to comply with these Terms of Service.</p>

                <h2>2. Services</h2>
                <p>We provide a platform for trading commodities via the Capital.com API. We are not a financial advisor.</p>

                <h2>3. User Responsibilities</h2>
                <p>You are responsible for maintaining the confidentiality of your account capabilities and for all activities that occur under your account.</p>

                <h2>4. Risk Warning</h2>
                <p>Trading commodities involves significant risk. You should only trade with funds you can afford to lose.</p>

                <h2>5. Termination</h2>
                <p>We reserve the right to terminate your access to the platform for any violation of these terms.</p>
            </div>
        </div>
    );
}

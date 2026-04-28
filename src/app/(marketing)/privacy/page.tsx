export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-light-gray dark:bg-dark-blue py-32 px-6">
            <div className="max-w-4xl mx-auto bg-white dark:bg-gray-900 p-8 md:p-12 rounded-2xl shadow-xl prose dark:prose-invert">
                <h1>Privacy Policy</h1>
                <p className="text-sm text-gray-500">Last Updated: {new Date().toLocaleDateString()}</p>

                <h2>1. Data Collection</h2>
                <p>We collect information necessary to provide our services, including but not limited to email addresses and trading identifiers.</p>

                <h2>2. Data Usage</h2>
                <p>Your data is used to facilitate trading via the Capital.com API and to improve our platform.</p>

                <h2>3. Security</h2>
                <p>We employ AES-256 encryption to protect your sensitive tokens. We do not sell your personal data.</p>

                <h2>4. Cookies</h2>
                <p>We use cookies to maintain your session security.</p>

                <h2>5. Contact Us</h2>
                <p>For privacy concerns, please contact privacy@mesoflix.com.</p>
            </div>
        </div>
    );
}

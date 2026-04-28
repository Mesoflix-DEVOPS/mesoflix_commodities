import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import Footer from "@/components/landing/Footer";
import OfferPopup from "@/components/landing/OfferPopup";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <OfferPopup />
      <Hero />
      <Features />
      <Footer />
    </main>
  );
}

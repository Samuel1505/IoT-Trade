import Header from '@/components/Header';
import Hero from '@/components/Hero';
import LiveStats from '@/components/LiveStats';
import Features from '@/components/Features';
import HowItWorks from '@/components/HowItWorks';
import UseCases from '@/components/UseCases';
import TechStack from '@/components/TechStack';
import DemoPreview from '@/components/DemoPreview';
import CTAFooter from '@/components/CTAFooter';

export default function Home() {
  return (
    <>
      <Header />
      <main className="min-h-screen">
        <Hero />
        <LiveStats />
        <Features />
        <HowItWorks />
        <UseCases />
        <TechStack />
        <DemoPreview />
        <CTAFooter />
      </main>
    </>
  );
}
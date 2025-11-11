'use client';

import { ArrowRight, CheckCircle, Database, DollarSign, Search } from 'lucide-react';

interface StepProps {
  number: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  isLast?: boolean;
  gradient: string;
}

function Step({ number, icon, title, description, isLast, gradient }: StepProps) {
  return (
    <div className="relative flex flex-col items-center text-center group">
      {/* Connecting Line */}
      {!isLast && (
        <div className="hidden lg:block absolute top-16 left-full w-full h-1 -ml-4">
          <div className="relative w-full h-full">
            <div className="absolute inset-0 bg-gradient-to-r from-primary-blue/20 to-cyan-accent/20 rounded-full" />
            <ArrowRight className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 text-primary-blue animate-pulse-slow" />
          </div>
        </div>
      )}

      {/* Step Circle */}
      <div className="relative mb-8 group-hover:scale-110 transition-all duration-500">
        {/* Glow Effect */}
        <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity blur-2xl"
             style={{ background: gradient }} />
        
        {/* Main Circle */}
        <div className="relative w-32 h-32 rounded-full shadow-2xl flex items-center justify-center"
             style={{ background: gradient }}>
          {icon}
          
          {/* Number Badge */}
          <div className="absolute -top-3 -right-3 w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center border-4 border-blue-50">
            <span className="text-2xl font-bold gradient-text">{number}</span>
          </div>
        </div>

        {/* Pulse Ring */}
        <div className="absolute inset-0 rounded-full border-4 border-primary-blue/20 animate-ping" />
      </div>

      {/* Content */}
      <div className="glass-strong rounded-3xl p-8 hover:shadow-xl transition-all duration-300 border border-white/20">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">{title}</h3>
        <p className="text-gray-600 leading-relaxed text-lg">{description}</p>
      </div>
    </div>
  );
}

export default function HowItWorks() {
  const providerSteps = [
    {
      icon: <Database className="w-14 h-14 text-white" />,
      title: 'Register Device',
      description: 'Connect your wallet and register your IoT device on the marketplace in seconds',
      gradient: 'linear-gradient(135deg, #0066FF 0%, #00D9FF 100%)',
    },
    {
      icon: <CheckCircle className="w-14 h-14 text-white" />,
      title: 'Publish Data',
      description: 'Start streaming real-time data to Somnia blockchain automatically',
      gradient: 'linear-gradient(135deg, #6B4FFF 0%, #0066FF 100%)',
    },
    {
      icon: <DollarSign className="w-14 h-14 text-white" />,
      title: 'Earn Money',
      description: 'Receive automatic micropayments for every data point published',
      gradient: 'linear-gradient(135deg, #00C853 0%, #00D9FF 100%)',
    },
  ];

  const consumerSteps = [
    {
      icon: <Search className="w-14 h-14 text-white" />,
      title: 'Browse Streams',
      description: 'Explore available data streams filtered by type, location, and quality score',
      gradient: 'linear-gradient(135deg, #0066FF 0%, #00D9FF 100%)',
    },
    {
      icon: <CheckCircle className="w-14 h-14 text-white" />,
      title: 'Subscribe',
      description: 'Choose a subscription plan and prepay for seamless data access',
      gradient: 'linear-gradient(135deg, #6B4FFF 0%, #0066FF 100%)',
    },
    {
      icon: <Database className="w-14 h-14 text-white" />,
      title: 'Access Data',
      description: 'Get instant access to live data streams with real-time updates',
      gradient: 'linear-gradient(135deg, #00C853 0%, #00D9FF 100%)',
    },
  ];

  return (
    <section id="how-it-works" className="py-32 px-6 bg-white relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-full h-full" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, #0066FF 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }} />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center mb-24">
          <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            How It <span className="gradient-text">Works</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Simple, transparent, and automated process for both data providers and consumers
          </p>
        </div>

        {/* Provider Journey */}
        <div className="mb-32">
          <div className="flex items-center gap-4 mb-16">
            <div className="px-8 py-4 gradient-primary rounded-full shadow-lg">
              <span className="text-white font-bold text-2xl">For Device Owners</span>
            </div>
            <div className="flex-1 h-1 bg-gradient-to-r from-primary-blue to-transparent rounded-full" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8">
            {providerSteps.map((step, index) => (
              <Step
                key={index}
                number={index + 1}
                {...step}
                isLast={index === providerSteps.length - 1}
              />
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="relative h-24 mb-32">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full h-px bg-gradient-to-r from-transparent via-primary-blue to-transparent" />
          </div>
          <div className="relative flex justify-center">
            <div className="px-8 py-4 glass-strong rounded-full border border-primary-blue/20">
              <span className="gradient-text font-bold text-xl">Two Simple Paths</span>
            </div>
          </div>
        </div>

        {/* Consumer Journey */}
        <div>
          <div className="flex items-center gap-4 mb-16">
            <div className="px-8 py-4 gradient-secondary rounded-full shadow-lg">
              <span className="text-white font-bold text-2xl">For Data Buyers</span>
            </div>
            <div className="flex-1 h-1 bg-gradient-to-r from-purple-accent to-transparent rounded-full" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8">
            {consumerSteps.map((step, index) => (
              <Step
                key={index}
                number={index + 1}
                {...step}
                isLast={index === consumerSteps.length - 1}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
'use client';

import { Coins, Database, Shield, Zap } from 'lucide-react';
import { useState } from 'react';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
  features: string[];
  index: number;
}

function FeatureCard({ icon, title, description, gradient, features, index }: FeatureCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="relative group h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Animated Glow */}
      <div 
        className={`absolute -inset-1 rounded-3xl opacity-0 group-hover:opacity-75 transition-all duration-500 blur-xl`}
        style={{ background: gradient }}
      />
      
      {/* Card */}
      <div className="relative bg-white rounded-3xl p-10 h-full shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute top-0 right-0 w-64 h-64 opacity-5 -mr-20 -mt-20">
          <div className="w-full h-full rounded-full" style={{ background: gradient }} />
        </div>

        {/* Icon */}
        <div className="relative mb-8">
          <div 
            className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl transform transition-all duration-500 ${isHovered ? 'scale-110 rotate-6' : ''}`}
            style={{ background: gradient }}
          >
            {icon}
          </div>
          {/* Floating Number */}
          <div className="absolute -top-3 -right-3 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-gray-100">
            <span className="font-bold text-gray-900">{index + 1}</span>
          </div>
        </div>
        
        {/* Title */}
        <h3 className="text-3xl font-bold text-gray-900 mb-4">{title}</h3>
        
        {/* Description */}
        <p className="text-gray-600 text-lg leading-relaxed mb-6">{description}</p>
        
        {/* Feature List */}
        <ul className="space-y-3">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                   style={{ background: gradient }}>
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-gray-700 font-medium">{feature}</span>
            </li>
          ))}
        </ul>

        {/* Hover Effect Line */}
        <div 
          className={`absolute bottom-0 left-0 right-0 h-1 transition-all duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
          style={{ background: gradient }}
        />
      </div>
    </div>
  );
}

export default function Features() {
  const features = [
    {
      icon: <Zap className="w-10 h-10 text-white" />,
      title: 'Real-time Streaming',
      description: 'Experience the future of IoT data with sub-second latency and instant updates.',
      gradient: 'linear-gradient(135deg, #0066FF 0%, #00D9FF 100%)',
      features: [
        'Sub-second latency',
        'WebSocket connections',
        'Live data updates',
        'No batch processing',
      ],
    },
    {
      icon: <Coins className="w-10 h-10 text-white" />,
      title: 'Automatic Micropayments',
      description: 'Smart contracts handle every transaction automatically with zero friction.',
      gradient: 'linear-gradient(135deg, #00C853 0%, #00D9FF 100%)',
      features: [
        'Pay per data point',
        'Instant settlements',
        'Zero transaction fees',
        'Passive income',
      ],
    },
    {
      icon: <Shield className="w-10 h-10 text-white" />,
      title: 'Verifiable Quality',
      description: 'On-chain quality scoring ensures every data point meets the highest standards.',
      gradient: 'linear-gradient(135deg, #6B4FFF 0%, #0066FF 100%)',
      features: [
        'Quality scoring',
        'Uptime tracking',
        'Data validation',
        'Trust metrics',
      ],
    },
    {
      icon: <Database className="w-10 h-10 text-white" />,
      title: 'Decentralized Trust',
      description: 'Built on Somnia blockchain for complete transparency and security.',
      gradient: 'linear-gradient(135deg, #FF6B00 0%, #6B4FFF 100%)',
      features: [
        'No single point of failure',
        'Complete ownership',
        'Transparent records',
        'Immutable history',
      ],
    },
  ];

  return (
    <section id="features" className="py-32 px-6 bg-gradient-to-b from-blue-50 to-white relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center mb-20">
          <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Why Choose <span className="gradient-text">Our Platform</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Built for the future of IoT data monetization with cutting-edge blockchain technology and unmatched performance
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
'use client';

import { Activity, DollarSign, Radio, TrendingUp, Users, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  prefix?: string;
  suffix?: string;
  delay?: number;
  gradient: string;
}

function StatCard({ icon, value, label, prefix = '', suffix = '', delay = 0, gradient }: StatCardProps) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      let start = 0;
      const end = value;
      const duration = 2000;
      const increment = end / (duration / 16);

      const counter = setInterval(() => {
        start += increment;
        if (start >= end) {
          setCount(end);
          clearInterval(counter);
        } else {
          setCount(Math.floor(start));
        }
      }, 16);

      return () => clearInterval(counter);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return (
    <div 
      className={`relative group transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Glow Effect */}
      <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl" 
           style={{ background: gradient }} />
      
      {/* Card */}
      <div className="relative bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:scale-105">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg"
             style={{ background: gradient }}>
          {icon}
        </div>
        
        {/* Value */}
        <div className="text-5xl font-bold mb-2" style={{ 
          background: gradient,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          {prefix}{count.toLocaleString()}{suffix}
        </div>
        
        {/* Label */}
        <div className="text-gray-600 font-semibold text-lg">{label}</div>
        
        {/* Progress Bar */}
        <div className="mt-6 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full transition-all duration-2000 rounded-full"
            style={{ 
              width: `${(count / value) * 100}%`,
              background: gradient,
            }}
          />
        </div>

        {/* Trend Indicator */}
        <div className="mt-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-success-green" />
          <span className="text-sm text-success-green font-semibold">+12% from yesterday</span>
        </div>
      </div>
    </div>
  );
}

export default function LiveStats() {
  return (
    <section className="py-32 px-6 bg-gradient-to-b from-white to-blue-50 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-blue rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-accent rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-3 px-6 py-3 glass-strong rounded-full mb-6 border border-primary-blue/20">
            <Activity className="w-5 h-5 text-primary-blue" />
            <span className="gradient-text font-bold">Live Platform Statistics</span>
            <div className="w-2 h-2 bg-success-green rounded-full animate-pulse-slow" />
          </div>
          <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Real-Time <span className="gradient-text">Marketplace Activity</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Join thousands of IoT device owners and data consumers in the world's most advanced decentralized data marketplace
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <StatCard
            icon={<Radio className="w-8 h-8 text-white" />}
            value={47}
            label="Active Devices"
            delay={0}
            gradient="linear-gradient(135deg, #0066FF 0%, #00D9FF 100%)"
          />
          <StatCard
            icon={<Zap className="w-8 h-8 text-white" />}
            value={12543}
            label="Data Points Today"
            delay={200}
            gradient="linear-gradient(135deg, #6B4FFF 0%, #0066FF 100%)"
          />
          <StatCard
            icon={<DollarSign className="w-8 h-8 text-white" />}
            value={234}
            label="Total Volume"
            prefix="$"
            delay={400}
            gradient="linear-gradient(135deg, #00C853 0%, #00D9FF 100%)"
          />
          <StatCard
            icon={<Users className="w-8 h-8 text-white" />}
            value={89}
            label="Active Subscribers"
            delay={600}
            gradient="linear-gradient(135deg, #FF6B00 0%, #6B4FFF 100%)"
          />
        </div>

        {/* Live Indicator */}
        <div className="mt-16 flex items-center justify-center gap-3 glass-strong px-8 py-4 rounded-full w-fit mx-auto">
          <div className="relative">
            <div className="w-4 h-4 bg-success-green rounded-full animate-pulse-slow" />
            <div className="absolute inset-0 w-4 h-4 bg-success-green rounded-full animate-ping" />
          </div>
          <span className="text-gray-900 font-bold">Live data updating every second</span>
        </div>
      </div>
    </section>
  );
}
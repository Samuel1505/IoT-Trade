'use client';

import { ArrowRight, Play, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Hero() {
  const [mounted, setMounted] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setMounted(true);
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 pt-20">
      {/* Animated Gradient Orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute w-[600px] h-[600px] rounded-full opacity-30 blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(0,102,255,0.4) 0%, transparent 70%)',
            left: `${mousePosition.x / 20}px`,
            top: `${mousePosition.y / 20}px`,
            transition: 'all 0.3s ease-out',
          }}
        />
        <div className="absolute top-20 right-20 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-cyan-accent/30 to-transparent blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-20 left-20 w-[400px] h-[400px] rounded-full bg-gradient-to-br from-purple-accent/30 to-transparent blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
      </div>

      {/* Floating Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `
          linear-gradient(to right, #0066FF 1px, transparent 1px),
          linear-gradient(to bottom, #0066FF 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }} />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 text-center">
        {/* Animated Badge */}
        <div className="inline-flex items-center gap-2 px-5 py-2.5 glass-strong rounded-full mb-8 animate-float border border-primary-blue/20">
          <Sparkles className="w-4 h-4 text-primary-blue" />
          <span className="gradient-text font-semibold text-sm">Powered by Somnia Blockchain</span>
          <div className="w-2 h-2 bg-success-green rounded-full animate-pulse-slow" />
        </div>

        {/* Main Heading with Gradient */}
        <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight">
          <span className="block text-gray-900">Monetize Your</span>
          <span className="block gradient-text">IoT Data Streams</span>
        </h1>

        {/* Subheading */}
        <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
          The world's first <span className="text-primary-blue font-semibold">decentralized marketplace</span> for real-time IoT data. 
          Stream, subscribe, and earn with <span className="text-primary-blue font-semibold">automatic micropayments</span>.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          <button className="group px-10 py-5 gradient-primary text-white rounded-full font-bold text-lg hover:shadow-2xl transition-all duration-300 flex items-center gap-3 hover:scale-105 shadow-lg">
            Start Earning Now
            <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
          </button>
          <button className="group px-10 py-5 bg-white text-gray-900 rounded-full font-bold text-lg hover:shadow-xl transition-all duration-300 flex items-center gap-3 border-2 border-gray-200 hover:border-primary-blue">
            <Play className="w-6 h-6 text-primary-blue" />
            Watch Demo
          </button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {[
            { value: '47+', label: 'Active Devices' },
            { value: '12.5K', label: 'Data Points/Day' },
            { value: '$234', label: 'Daily Volume' },
            { value: '<1s', label: 'Latency' },
          ].map((stat, i) => (
            <div key={i} className="glass-strong rounded-2xl p-6 hover:scale-105 transition-transform">
              <div className="text-3xl md:text-4xl font-bold gradient-text mb-2">{stat.value}</div>
              <div className="text-sm text-gray-600 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Floating Device Cards */}
        {mounted && (
          <div className="mt-20 flex justify-center gap-6 flex-wrap">
            {[
              { emoji: '📍', title: 'GPS Trackers', color: 'from-blue-500 to-cyan-500' },
              { emoji: '🌡️', title: 'Weather', color: 'from-orange-500 to-red-500' },
              { emoji: '💨', title: 'Air Quality', color: 'from-green-500 to-emerald-500' },
              { emoji: '⚡', title: 'Energy', color: 'from-purple-500 to-pink-500' },
            ].map((item, i) => (
              <div
                key={i}
                className="glass-strong px-8 py-6 rounded-3xl hover:scale-110 transition-all duration-300 cursor-pointer group border border-white/20"
                style={{
                  animation: 'float 6s ease-in-out infinite',
                  animationDelay: `${i * 0.5}s`,
                }}
              >
                <div className="text-5xl mb-3 group-hover:scale-125 transition-transform">{item.emoji}</div>
                <div className="text-sm font-bold text-gray-900">{item.title}</div>
                <div className={`h-1 w-full bg-gradient-to-r ${item.color} rounded-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity`} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-primary-blue rounded-full flex justify-center pt-2">
          <div className="w-1.5 h-3 bg-primary-blue rounded-full animate-pulse-slow" />
        </div>
      </div>
    </section>
  );
}
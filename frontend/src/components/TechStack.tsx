'use client';

import { Blocks, Code, Database, Layers } from 'lucide-react';

interface TechBadgeProps {
  name: string;
  category: string;
  icon: React.ReactNode;
}

function TechBadge({ name, category, icon }: TechBadgeProps) {
  return (
    <div className="group relative">
      <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-lg" />
      <div className="relative glass-strong rounded-2xl px-6 py-4 hover:scale-110 transition-all duration-300">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            {icon}
          </div>
          <div>
            <div className="font-semibold text-gray-900">{name}</div>
            <div className="text-xs text-gray-600">{category}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TechStack() {
  const technologies = [
    { name: 'Somnia', category: 'Blockchain', icon: <Blocks className="w-5 h-5 text-white" /> },
    { name: 'Data Streams', category: 'Protocol', icon: <Database className="w-5 h-5 text-white" /> },
    { name: 'Next.js 14', category: 'Frontend', icon: <Code className="w-5 h-5 text-white" /> },
    { name: 'TypeScript', category: 'Language', icon: <Code className="w-5 h-5 text-white" /> },
    { name: 'Solidity', category: 'Smart Contracts', icon: <Layers className="w-5 h-5 text-white" /> },
    { name: 'Viem', category: 'Web3 Library', icon: <Database className="w-5 h-5 text-white" /> },
  ];

  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="heading-xl text-gray-900 mb-4">
            Built on Cutting-Edge Technology
          </h2>
          <p className="body-lg text-gray-600 max-w-2xl mx-auto">
            Powered by Somnia blockchain and modern web technologies for unparalleled performance
          </p>
        </div>

        {/* Somnia Highlight */}
        <div className="relative mb-12">
          <div className="absolute inset-0 bg-gradient-primary opacity-20 blur-3xl rounded-full" />
          <div className="relative glass-strong rounded-3xl p-12 text-center">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full gradient-primary flex items-center justify-center animate-glow">
              <Blocks className="w-12 h-12 text-white" />
            </div>
            <h3 className="heading-lg text-gray-900 mb-4">Somnia Blockchain</h3>
            <p className="body-lg text-gray-600 max-w-2xl mx-auto">
              High-performance L1 blockchain designed for real-time data streaming with sub-second finality 
              and ultra-low transaction costs
            </p>
          </div>
        </div>

        {/* Tech Badges Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {technologies.map((tech, index) => (
            <TechBadge key={index} {...tech} />
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-12 text-center">
          <p className="body-sm text-gray-600">
            Open source • Fully audited • Production ready
          </p>
        </div>
      </div>
    </section>
  );
}
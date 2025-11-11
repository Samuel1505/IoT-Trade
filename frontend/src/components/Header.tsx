'use client';

import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-white/10">
      <nav className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <div>
              <div className="text-gray-900 font-bold text-lg">IoT Marketplace</div>
              <div className="text-xs text-gray-600">Powered by Somnia</div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-700 hover:text-primary-blue font-medium transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-gray-700 hover:text-primary-blue font-medium transition-colors">
              How It Works
            </a>
            <a href="#use-cases" className="text-gray-700 hover:text-primary-blue font-medium transition-colors">
              Use Cases
            </a>
            <a href="#tech" className="text-gray-700 hover:text-primary-blue font-medium transition-colors">
              Technology
            </a>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <button className="px-6 py-2.5 text-primary-blue font-semibold hover:bg-blue-50 rounded-full transition-all">
              Sign In
            </button>
            <button className="px-6 py-2.5 gradient-primary text-white font-semibold rounded-full hover:shadow-lg transition-all hover:scale-105">
              Get Started
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="w-6 h-6 text-gray-900" />
            ) : (
              <Menu className="w-6 h-6 text-gray-900" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-4">
            <a href="#features" className="block text-gray-700 hover:text-primary-blue font-medium">
              Features
            </a>
            <a href="#how-it-works" className="block text-gray-700 hover:text-primary-blue font-medium">
              How It Works
            </a>
            <a href="#use-cases" className="block text-gray-700 hover:text-primary-blue font-medium">
              Use Cases
            </a>
            <a href="#tech" className="block text-gray-700 hover:text-primary-blue font-medium">
              Technology
            </a>
            <div className="flex flex-col gap-2 pt-4">
              <button className="px-6 py-2.5 text-primary-blue font-semibold hover:bg-blue-50 rounded-full transition-all">
                Sign In
              </button>
              <button className="px-6 py-2.5 gradient-primary text-white font-semibold rounded-full">
                Get Started
              </button>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
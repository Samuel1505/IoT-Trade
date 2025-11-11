'use client';

import { ArrowRight, BookOpen, Github, Mail, Twitter } from 'lucide-react';

export default function CTAFooter() {
  return (
    <section className="relative py-32 px-6 overflow-hidden">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-blue via-blue-600 to-purple-accent" />
      
      {/* Animated Orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-cyan-accent/30 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-accent/30 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-white/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '3s' }} />
      </div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `
          linear-gradient(to right, white 1px, transparent 1px),
          linear-gradient(to bottom, white 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }} />

      <div className="relative max-w-7xl mx-auto">
        {/* Main CTA */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-6 py-3 glass-strong rounded-full mb-8 border border-white/20">
            <div className="w-2 h-2 bg-success-green rounded-full animate-pulse-slow" />
            <span className="text-white font-semibold">Join 1000+ IoT Device Owners</span>
          </div>

          <h2 className="text-5xl md:text-7xl font-bold text-white mb-8 leading-tight">
            Start Monetizing Your<br />
            <span className="text-cyan-accent">IoT Data Today</span>
          </h2>
          
          <p className="text-xl md:text-2xl text-blue-50 mb-12 max-w-3xl mx-auto leading-relaxed">
            Join the decentralized data revolution. Register your devices or start consuming real-time IoT data in minutes.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
            <button className="group px-12 py-6 bg-white text-primary-blue rounded-full font-bold text-xl hover:bg-blue-50 transition-all duration-300 flex items-center gap-3 shadow-2xl hover:shadow-3xl hover:scale-110">
              Get Started Free
              <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
            </button>
            <button className="px-12 py-6 glass-strong text-white rounded-full font-bold text-xl hover:bg-white/20 transition-all duration-300 flex items-center gap-3 border-2 border-white/30">
              <BookOpen className="w-6 h-6" />
              Read Documentation
            </button>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-8 text-white/80">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-success-green" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-semibold">No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-success-green" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-semibold">Setup in 5 minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-success-green" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-semibold">24/7 Support</span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/20 mb-16" />

        {/* Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <span className="text-white font-bold text-2xl">S</span>
              </div>
              <div>
                <div className="text-white font-bold text-xl">IoT Marketplace</div>
                <div className="text-blue-100 text-sm">by Somnia</div>
              </div>
            </div>
            <p className="text-blue-100 leading-relaxed mb-6">
              The future of decentralized IoT data monetization
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                <Twitter className="w-5 h-5 text-white" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                <Github className="w-5 h-5 text-white" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                <Mail className="w-5 h-5 text-white" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-bold text-lg mb-4">Platform</h4>
            <ul className="space-y-3">
              {['About Us', 'How It Works', 'Pricing', 'FAQ', 'Blog'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-blue-100 hover:text-white transition-colors flex items-center gap-2 group">
                    <span className="w-0 group-hover:w-2 h-px bg-white transition-all" />
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold text-lg mb-4">Developers</h4>
            <ul className="space-y-3">
              {['Documentation', 'API Reference', 'Smart Contracts', 'GitHub', 'SDK'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-blue-100 hover:text-white transition-colors flex items-center gap-2 group">
                    <span className="w-0 group-hover:w-2 h-px bg-white transition-all" />
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold text-lg mb-4">Community</h4>
            <ul className="space-y-3">
              {['Discord', 'Twitter', 'Telegram', 'Forum', 'Support'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-blue-100 hover:text-white transition-colors flex items-center gap-2 group">
                    <span className="w-0 group-hover:w-2 h-px bg-white transition-all" />
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-blue-100">
              © 2025 IoT Data Marketplace. Powered by <span className="text-white font-semibold">Somnia Blockchain</span>
            </p>
            <div className="flex items-center gap-6 text-blue-100">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
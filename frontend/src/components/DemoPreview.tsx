'use client';

import { Activity, MapPin, Play, Satellite } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function DemoPreview() {
  const [dataPoints, setDataPoints] = useState([
    { time: '10:23:45', location: '37.7749, -122.4194', speed: '45 km/h', status: 'verified' },
    { time: '10:23:44', location: '37.7748, -122.4193', speed: '44 km/h', status: 'verified' },
    { time: '10:23:43', location: '37.7747, -122.4192', speed: '45 km/h', status: 'verified' },
  ]);

  const [currentSpeed, setCurrentSpeed] = useState(45);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour12: false });
      const newSpeed = Math.floor(Math.random() * 20) + 40;
      setCurrentSpeed(newSpeed);
      
      const newPoint = {
        time: timeStr,
        location: `37.${Math.floor(Math.random() * 1000) + 7700}, -122.${Math.floor(Math.random() * 1000) + 4100}`,
        speed: `${newSpeed} km/h`,
        status: 'verified' as const,
      };
      setDataPoints(prev => [newPoint, ...prev.slice(0, 4)]);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-32 px-6 bg-gradient-to-b from-white to-blue-50 relative overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-primary-blue/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 left-0 w-96 h-96 bg-cyan-accent/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center mb-20">
          <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            See It <span className="gradient-text">In Action</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Experience real-time data streaming with our interactive dashboard preview
          </p>
        </div>

        {/* Demo Container */}
        <div className="relative">
          {/* Outer Glow */}
          <div className="absolute -inset-4 bg-gradient-primary opacity-20 blur-3xl rounded-3xl" />
          
          {/* Main Dashboard */}
          <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
            {/* Dashboard Header */}
            <div className="bg-gradient-to-r from-primary-blue to-cyan-accent p-8">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                    <MapPin className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-3xl font-bold text-white">GPS Tracker #A1B2C3</h3>
                      <div className="flex items-center gap-2 px-4 py-1.5 bg-success-green/20 backdrop-blur-sm rounded-full border border-success-green/30">
                        <div className="w-2.5 h-2.5 bg-success-green rounded-full animate-pulse-slow" />
                        <span className="text-white font-bold text-sm">LIVE</span>
                      </div>
                    </div>
                    <p className="text-blue-100 text-lg">San Francisco, California</p>
                  </div>
                </div>
                <button className="flex items-center gap-3 px-8 py-4 bg-white text-primary-blue rounded-full font-bold text-lg hover:shadow-xl transition-all hover:scale-105">
                  <Play className="w-5 h-5" />
                  Watch Full Demo
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-8 bg-gradient-to-b from-blue-50/50 to-white">
              <div className="glass-strong rounded-2xl p-6 hover:scale-105 transition-transform">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-gray-600 font-semibold">Location</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">37.7749, -122.4194</div>
                <div className="text-sm text-gray-500 mt-1">Altitude: 15m</div>
              </div>

              <div className="glass-strong rounded-2xl p-6 hover:scale-105 transition-transform">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 gradient-secondary rounded-xl flex items-center justify-center">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-gray-600 font-semibold">Speed</span>
                </div>
                <div className="text-2xl font-bold gradient-text">{currentSpeed} km/h</div>
                <div className="text-sm text-gray-500 mt-1">Heading: 180°</div>
              </div>

              <div className="glass-strong rounded-2xl p-6 hover:scale-105 transition-transform">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                    <Satellite className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-gray-600 font-semibold">Satellites</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">12 Connected</div>
                <div className="text-sm text-success-green mt-1">Accuracy: ±5m</div>
              </div>
            </div>

            {/* Live Data Stream */}
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-2xl font-bold text-gray-900">Live Data Stream</h4>
                <div className="flex items-center gap-2 px-4 py-2 glass-strong rounded-full">
                  <div className="w-2 h-2 bg-success-green rounded-full animate-pulse-slow" />
                  <span className="text-sm font-semibold text-gray-700">Updating every 2s</span>
                </div>
              </div>

              <div className="space-y-3">
                {dataPoints.map((point, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-5 rounded-2xl transition-all duration-500 ${
                      index === 0 
                        ? 'bg-gradient-to-r from-primary-blue/10 to-cyan-accent/10 border-2 border-primary-blue/20 scale-105' 
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                    style={{
                      animation: index === 0 ? 'slideIn 0.5s ease-out' : 'none',
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-success-green animate-pulse-slow' : 'bg-gray-400'}`} />
                      <span className="font-mono text-lg font-semibold text-gray-700">{point.time}</span>
                    </div>
                    <span className="text-gray-600 font-medium">{point.location}</span>
                    <span className="font-bold text-primary-blue text-lg">{point.speed}</span>
                    <div className="px-3 py-1 bg-success-green/10 text-success-green rounded-full text-sm font-semibold">
                      ✓ Verified
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 text-lg mb-6">Ready to start streaming your IoT data?</p>
          <button className="px-10 py-5 gradient-primary text-white rounded-full font-bold text-lg hover:shadow-2xl transition-all hover:scale-105">
            Register Your Device Now
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </section>
  );
}
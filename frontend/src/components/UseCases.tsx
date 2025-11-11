'use client';

import { Code, Factory, TrendingUp } from 'lucide-react';

interface UseCaseCardProps {
  icon: React.ReactNode;
  persona: string;
  role: string;
  goal: string;
  example: string;
  gradient: string;
  size?: 'normal' | 'large';
}

function UseCaseCard({ icon, persona, role, goal, example, gradient, size = 'normal' }: UseCaseCardProps) {
  return (
    <div className={`group relative ${size === 'large' ? 'md:col-span-2' : ''}`}>
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl blur-2xl"
           style={{ background: gradient }} />
      <div className="relative glass-strong rounded-3xl p-8 hover:scale-105 transition-all duration-300 h-full">
        {/* Icon & Persona */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
               style={{ background: gradient }}>
            {icon}
          </div>
          <div>
            <h3 className="heading-md text-gray-900 mb-1">{persona}</h3>
            <p className="body-sm text-gray-600 font-medium">{role}</p>
          </div>
        </div>

        {/* Goal */}
        <div className="mb-4">
          <span className="body-sm text-primary-blue font-semibold">Goal:</span>
          <p className="body-base text-gray-700 mt-1">{goal}</p>
        </div>

        {/* Example */}
        <div className="p-4 bg-blue-50 rounded-2xl">
          <span className="body-sm text-primary-blue font-semibold">Use Case:</span>
          <p className="body-sm text-gray-700 mt-1">{example}</p>
        </div>

        {/* Decorative Circle */}
        <div className="absolute bottom-4 right-4 w-32 h-32 rounded-full opacity-5"
             style={{ background: gradient }} />
      </div>
    </div>
  );
}

export default function UseCases() {
  const useCases = [
    {
      icon: <Factory className="w-8 h-8 text-white" />,
      persona: 'IoT Device Owner',
      role: 'Data Provider',
      goal: 'Monetize idle sensor data and generate passive income from existing IoT infrastructure',
      example: 'Homeowner with weather station earns $50/month by sharing temperature and humidity data with local weather apps and research institutions',
      gradient: 'linear-gradient(135deg, #0066FF 0%, #00D9FF 100%)',
      size: 'large' as const,
    },
    {
      icon: <Code className="w-8 h-8 text-white" />,
      persona: 'Data Buyer',
      role: 'Developer / Researcher',
      goal: 'Access verified real-time IoT data without expensive infrastructure or unreliable APIs',
      example: 'Weather app developer subscribes to 20 GPS trackers for $15/month to provide real-time traffic updates to users',
      gradient: 'linear-gradient(135deg, #6B4FFF 0%, #0066FF 100%)',
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-white" />,
      persona: 'Data Validator',
      role: 'Quality Assurance (Future)',
      goal: 'Earn fees by verifying data quality and maintaining marketplace trust',
      example: 'Third-party service validates air quality sensor accuracy and earns commission on each verified data point',
      gradient: 'linear-gradient(135deg, #00C853 0%, #00D9FF 100%)',
    },
  ];

  return (
    <section className="py-20 px-6 bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="heading-xl text-gray-900 mb-4">
            Who Benefits from Our Platform
          </h2>
          <p className="body-lg text-gray-600 max-w-2xl mx-auto">
            Empowering diverse stakeholders in the IoT data ecosystem
          </p>
        </div>

        {/* Use Cases Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {useCases.map((useCase, index) => (
            <UseCaseCard key={index} {...useCase} />
          ))}
        </div>
      </div>
    </section>
  );
}
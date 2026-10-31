'use client';

import Link from 'next/link';

export default function Pricing() {
  const plans = [
    {
      name: 'Starter',
      price: 'Free',
      features: [
        'Basic Music Commands',
        'Essential Moderation',
        'Simple Economy',
        'Standard Support',
        '50 Servers',
      ],
      recommended: false,
    },
    {
      name: 'Premium',
      price: '$10',
      period: '/month',
      features: [
        'Advanced Music System',
        'Full Moderation Suite',
        'Complete Economy',
        'Auto-Mod Protection',
        'Custom Commands',
        'Priority Support',
        '200 Servers',
        '24/7 Music Mode',
      ],
      recommended: true,
    },
    {
      name: 'Enterprise',
      price: '$50',
      period: '/month',
      features: [
        'Everything in Premium',
        'Unlimited Servers',
        'Dedicated Support',
        'Custom Features',
        'API Access',
        'White-label Option',
        'SLA Guarantee',
        'Personal Setup',
      ],
      recommended: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-red-700">
      {/* Navigation */}
      <nav className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </div>
              <span className="text-2xl font-bold text-white">CouplesHub</span>
            </Link>
            <Link
              href="/auth/signin"
              className="bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-lg transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="container mx-auto px-6 py-20 text-center">
        <h1 className="text-6xl font-bold text-white mb-6">Simple, Transparent Pricing</h1>
        <p className="text-2xl text-white/70 mb-12">Choose the perfect plan for your community</p>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-white/10 backdrop-blur-lg rounded-3xl p-8 border ${
                plan.recommended
                  ? 'border-pink-500 transform scale-105 shadow-2xl'
                  : 'border-white/20'
              }`}
            >
              {plan.recommended && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-2 rounded-full text-sm font-bold">
                    MOST POPULAR
                  </span>
                </div>
              )}
              <h3 className="text-3xl font-bold text-white mb-2">{plan.name}</h3>
              <div className="mb-6">
                <span className="text-5xl font-bold text-white">{plan.price}</span>
                {plan.period && <span className="text-white/70">{plan.period}</span>}
              </div>
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-white/80">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                className={`w-full py-4 rounded-xl font-bold transition-all ${
                  plan.recommended
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:opacity-90'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                Get Started
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="container mx-auto px-6 py-20">
        <h2 className="text-4xl font-bold text-white text-center mb-12">Why Choose CouplesHub?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <div className="text-4xl mb-4">🚀</div>
            <h3 className="text-2xl font-bold text-white mb-3">Lightning Fast</h3>
            <p className="text-white/70">Built with performance in mind. Response times under 100ms guaranteed.</p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-2xl font-bold text-white mb-3">Secure & Reliable</h3>
            <p className="text-white/70">99.9% uptime with enterprise-grade security measures.</p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-2xl font-bold text-white mb-3">24/7 Support</h3>
            <p className="text-white/70">Our dedicated team is always here to help you succeed.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

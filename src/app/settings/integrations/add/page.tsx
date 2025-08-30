'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Plus, 
  CheckCircle,
  AlertCircle,
  Settings,
  CreditCard,
  MessageSquare,
  MapPin,
  Mail,
  Shield,
  Database,
  BarChart3,
  Cloud,
  Webhook,
  Zap,
  Bot,
  Brain,
  TrendingUp
} from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  popular: boolean;
  connected: boolean;
}

const availableIntegrations: Integration[] = [
  // Payment - Global
  { id: 'stripe', name: 'Stripe', description: 'Accept online payments and manage transactions', category: 'Payment', icon: CreditCard, popular: true, connected: true },
  { id: 'paypal', name: 'PayPal', description: 'Global payment processing platform', category: 'Payment', icon: CreditCard, popular: true, connected: false },
  { id: 'square', name: 'Square', description: 'Point of sale and payment processing', category: 'Payment', icon: CreditCard, popular: false, connected: false },
  
  // Payment - Philippines
  { id: 'gcash', name: 'GCash', description: 'Philippines leading mobile wallet and payment platform', category: 'Payment', icon: CreditCard, popular: true, connected: false },
  { id: 'maya', name: 'Maya (PayMaya)', description: 'Digital financial services and mobile payments in PH', category: 'Payment', icon: CreditCard, popular: true, connected: false },
  { id: 'coinsph', name: 'Coins.ph', description: 'Cryptocurrency and digital wallet platform for Philippines', category: 'Payment', icon: CreditCard, popular: false, connected: false },
  { id: 'paymongo', name: 'PayMongo', description: 'Payment gateway for Philippine businesses and startups', category: 'Payment', icon: CreditCard, popular: false, connected: false },
  
  // Communication
  { id: 'twilio', name: 'Twilio', description: 'SMS, voice, and messaging APIs', category: 'Communication', icon: MessageSquare, popular: true, connected: true },
  { id: 'sendgrid', name: 'SendGrid', description: 'Email delivery and marketing platform', category: 'Communication', icon: Mail, popular: true, connected: false },
  { id: 'mailchimp', name: 'Mailchimp', description: 'Email marketing and automation', category: 'Communication', icon: Mail, popular: false, connected: false },
  { id: 'slack', name: 'Slack', description: 'Team communication and notifications', category: 'Communication', icon: MessageSquare, popular: true, connected: false },
  { id: 'lark', name: 'Lark', description: 'All-in-one collaboration platform with messaging, meetings, and docs', category: 'Communication', icon: MessageSquare, popular: false, connected: false },
  
  // Mapping & Location
  { id: 'google-maps', name: 'Google Maps', description: 'Maps, geocoding, and routing services', category: 'Mapping', icon: MapPin, popular: true, connected: true },
  { id: 'mapbox', name: 'Mapbox', description: 'Custom maps and location data', category: 'Mapping', icon: MapPin, popular: false, connected: false },
  { id: 'here-maps', name: 'HERE Maps', description: 'Enterprise mapping and location services', category: 'Mapping', icon: MapPin, popular: false, connected: false },
  
  // Analytics & Tracking
  { id: 'google-analytics', name: 'Google Analytics', description: 'Web analytics and insights', category: 'Analytics', icon: BarChart3, popular: true, connected: false },
  { id: 'mixpanel', name: 'Mixpanel', description: 'Product analytics and user tracking', category: 'Analytics', icon: BarChart3, popular: true, connected: false },
  { id: 'amplitude', name: 'Amplitude', description: 'Digital analytics and product intelligence platform', category: 'Analytics', icon: TrendingUp, popular: true, connected: false },
  { id: 'appsflyer', name: 'AppsFlyer', description: 'Mobile attribution and marketing analytics platform', category: 'Analytics', icon: BarChart3, popular: true, connected: false },
  { id: 'segment', name: 'Segment', description: 'Customer data platform', category: 'Analytics', icon: Database, popular: false, connected: false },
  
  // Marketing & Engagement
  { id: 'webengage', name: 'WebEngage', description: 'Customer engagement and retention platform', category: 'Marketing', icon: MessageSquare, popular: false, connected: false },
  
  // Security & Auth
  { id: 'auth0', name: 'Auth0', description: 'Identity and access management', category: 'Security', icon: Shield, popular: true, connected: false },
  { id: 'okta', name: 'Okta', description: 'Enterprise identity solutions', category: 'Security', icon: Shield, popular: false, connected: false },
  { id: 'firebase-auth', name: 'Firebase Auth', description: 'Google Firebase authentication', category: 'Security', icon: Shield, popular: true, connected: false },
  
  // Cloud & Infrastructure
  { id: 'aws-s3', name: 'Amazon S3', description: 'Cloud storage and file management', category: 'Cloud Storage', icon: Cloud, popular: true, connected: false },
  { id: 'cloudinary', name: 'Cloudinary', description: 'Image and video management', category: 'Cloud Storage', icon: Cloud, popular: false, connected: false },
  { id: 'digitalocean', name: 'DigitalOcean', description: 'Cloud infrastructure and hosting', category: 'Cloud Storage', icon: Cloud, popular: false, connected: false },
  
  // Automation
  { id: 'zapier', name: 'Zapier', description: 'Workflow automation and app connections', category: 'Automation', icon: Zap, popular: true, connected: false },
  { id: 'webhooks', name: 'Custom Webhooks', description: 'Custom HTTP webhooks and callbacks', category: 'Automation', icon: Webhook, popular: false, connected: false },
  
  // AI & Automation
  { id: 'claude-anthropic', name: 'Claude (Anthropic)', description: 'Advanced AI assistant for operations and customer support', category: 'AI & Automation', icon: Brain, popular: true, connected: false },
  { id: 'chatgpt', name: 'ChatGPT', description: 'OpenAI language model for automation and support', category: 'AI & Automation', icon: Bot, popular: true, connected: false },
  { id: 'grok', name: 'Grok', description: 'X (Twitter) AI assistant for social media and analytics', category: 'AI & Automation', icon: Bot, popular: false, connected: false },
  { id: 'gemini', name: 'Google Gemini', description: 'Google AI model for multimodal operations support', category: 'AI & Automation', icon: Brain, popular: true, connected: false }
];

export default function AddIntegrationPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showSuccess, setShowSuccess] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState(availableIntegrations);

  const categories = ['All', ...Array.from(new Set(availableIntegrations.map(i => i.category)))];

  const filteredIntegrations = integrations.filter(integration => {
    const matchesSearch = integration.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         integration.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || integration.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleConnect = async (integrationId: string, integrationName: string) => {
    // Redirect to setup page instead of showing simple success
    router.push(`/settings/integrations/setup/${integrationId}`);
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md mx-4">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Integration Connected!</h2>
          <p className="text-gray-600 mb-4">
            {showSuccess} has been successfully connected to your system.
          </p>
          <p className="text-sm text-gray-500">Redirecting back...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/settings')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Settings</span>
          </button>
          <div className="text-right">
            <h1 className="text-xl font-bold text-gray-900">Add Integration</h1>
            <p className="text-xs text-gray-600">Connect external services to extend functionality</p>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        {/* Search and Filter */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search integrations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Combined Integrations Table */}
        <div>
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium text-gray-900 flex items-center">
                    Available Integrations ({filteredIntegrations.length})
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">Popular integrations shown first</p>
                </div>
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Clear search
                  </button>
                )}
              </div>
            </div>
            
            {filteredIntegrations.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No integrations found</h3>
                <p className="text-gray-600">Try adjusting your search terms or category filter.</p>
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {/* Popular integrations first */}
                    {filteredIntegrations
                      .sort((a, b) => {
                        // Popular items first, then alphabetical
                        if (a.popular && !b.popular) return -1;
                        if (!a.popular && b.popular) return 1;
                        return a.name.localeCompare(b.name);
                      })
                      .map((integration, index) => {
                        const Icon = integration.icon;
                        const isFirstNonPopular = !integration.popular && 
                          index > 0 && 
                          filteredIntegrations
                            .sort((a, b) => {
                              if (a.popular && !b.popular) return -1;
                              if (!a.popular && b.popular) return 1;
                              return a.name.localeCompare(b.name);
                            })[index - 1].popular;
                        
                        return (
                          <React.Fragment key={integration.id}>
                            {/* Separator row between popular and other integrations */}
                            {isFirstNonPopular && (
                              <tr className="bg-gray-100">
                                <td colSpan={5} className="px-6 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                  Other Available Integrations
                                </td>
                              </tr>
                            )}
                            <tr className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${
                                    integration.popular ? 'bg-blue-50' : 'bg-gray-50'
                                  }`}>
                                    <Icon className={`w-4 h-4 ${
                                      integration.popular ? 'text-blue-600' : 'text-gray-600'
                                    }`} />
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">{integration.name}</div>
                                    {integration.popular && (
                                      <span className="text-xs text-yellow-600 font-medium">POPULAR</span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {integration.category}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
                                {integration.description}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {integration.connected ? (
                                  <div className="flex items-center">
                                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                      Connected
                                    </span>
                                  </div>
                                ) : (
                                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                                    Available
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                  onClick={() => handleConnect(integration.id, integration.name)}
                                  disabled={integration.connected}
                                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                                    integration.connected
                                      ? 'bg-green-100 text-green-700 cursor-not-allowed'
                                      : 'bg-blue-600 text-white hover:bg-blue-700'
                                  }`}
                                >
                                  {integration.connected ? 'Connected' : 'Connect'}
                                </button>
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        
        {/* Need Help Section */}
        <div className="mt-8 bg-gray-50 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Settings className="w-5 h-5 text-gray-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-gray-900 mb-1">Need a custom integration?</h3>
              <p className="text-sm text-gray-600 mb-3">
                Don't see the service you need? We can help you build custom integrations for your specific requirements.
              </p>
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                Contact our integration team →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
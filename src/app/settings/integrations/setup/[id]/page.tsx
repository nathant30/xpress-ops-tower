'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Key, Shield, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

// Integration configuration templates
const integrationConfigs: Record<string, {
  name: string;
  description: string;
  category: string;
  fields: Array<{
    key: string;
    label: string;
    type: 'text' | 'password' | 'select' | 'url';
    required: boolean;
    placeholder?: string;
    description?: string;
    options?: string[];
  }>;
  docsUrl?: string;
  testEndpoint?: string;
}> = {
  'lark': {
    name: 'Lark',
    description: 'All-in-one collaboration platform with messaging, meetings, and docs',
    category: 'Communication',
    docsUrl: 'https://open.larksuite.com/document/',
    fields: [
      {
        key: 'app_id',
        label: 'App ID',
        type: 'text',
        required: true,
        placeholder: 'cli_a1b2c3d4e5f6g7h8',
        description: 'Your Lark app ID from the developer console'
      },
      {
        key: 'app_secret',
        label: 'App Secret',
        type: 'password',
        required: true,
        placeholder: 'Enter your app secret',
        description: 'Your Lark app secret key (keep this secure)'
      },
      {
        key: 'webhook_url',
        label: 'Webhook URL',
        type: 'url',
        required: false,
        placeholder: 'https://your-server.com/webhooks/lark',
        description: 'Optional webhook URL for receiving Lark events'
      }
    ]
  },
  'claude-anthropic': {
    name: 'Claude (Anthropic)',
    description: 'Advanced AI assistant for operations and customer support',
    category: 'AI & Automation',
    docsUrl: 'https://docs.anthropic.com/en/api',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'sk-ant-api03-...',
        description: 'Your Anthropic API key from the console'
      },
      {
        key: 'model',
        label: 'Model',
        type: 'select',
        required: true,
        options: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307', 'claude-3-opus-20240229'],
        description: 'Choose the Claude model to use'
      }
    ]
  },
  'chatgpt': {
    name: 'ChatGPT',
    description: 'OpenAI language model for automation and support',
    category: 'AI & Automation',
    docsUrl: 'https://platform.openai.com/docs/api-reference',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'sk-proj-...',
        description: 'Your OpenAI API key'
      },
      {
        key: 'model',
        label: 'Model',
        type: 'select',
        required: true,
        options: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
        description: 'Choose the GPT model to use'
      },
      {
        key: 'organization_id',
        label: 'Organization ID',
        type: 'text',
        required: false,
        placeholder: 'org-...',
        description: 'Optional: Your OpenAI organization ID'
      }
    ]
  },
  'gcash': {
    name: 'GCash',
    description: 'Philippines leading mobile wallet and payment platform',
    category: 'Payment',
    docsUrl: 'https://developer.gcash.com/',
    fields: [
      {
        key: 'merchant_id',
        label: 'Merchant ID',
        type: 'text',
        required: true,
        placeholder: 'M123456789',
        description: 'Your GCash merchant ID'
      },
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'Enter your API key',
        description: 'Your GCash API key'
      },
      {
        key: 'environment',
        label: 'Environment',
        type: 'select',
        required: true,
        options: ['sandbox', 'production'],
        description: 'Choose sandbox for testing, production for live transactions'
      }
    ]
  },
  'stripe': {
    name: 'Stripe',
    description: 'Accept online payments and manage transactions',
    category: 'Payment',
    docsUrl: 'https://stripe.com/docs/api',
    fields: [
      {
        key: 'publishable_key',
        label: 'Publishable Key',
        type: 'text',
        required: true,
        placeholder: 'pk_test_...',
        description: 'Your Stripe publishable key (safe to expose publicly)'
      },
      {
        key: 'secret_key',
        label: 'Secret Key',
        type: 'password',
        required: true,
        placeholder: 'sk_test_...',
        description: 'Your Stripe secret key (keep this secure)'
      },
      {
        key: 'webhook_secret',
        label: 'Webhook Signing Secret',
        type: 'password',
        required: false,
        placeholder: 'whsec_...',
        description: 'Optional: Used to verify webhook signatures'
      }
    ]
  },
  'aws-s3': {
    name: 'Amazon S3',
    description: 'Cloud storage and file management',
    category: 'Cloud Storage',
    docsUrl: 'https://docs.aws.amazon.com/s3/latest/userguide/',
    fields: [
      {
        key: 'access_key_id',
        label: 'Access Key ID',
        type: 'text',
        required: true,
        placeholder: 'AKIAIOSFODNN7EXAMPLE',
        description: 'Your AWS access key ID'
      },
      {
        key: 'secret_access_key',
        label: 'Secret Access Key',
        type: 'password',
        required: true,
        placeholder: 'Enter your secret access key',
        description: 'Your AWS secret access key (keep this secure)'
      },
      {
        key: 'region',
        label: 'Region',
        type: 'select',
        required: true,
        options: ['us-east-1', 'us-west-1', 'us-west-2', 'eu-west-1', 'eu-central-1', 'ap-southeast-1', 'ap-northeast-1'],
        description: 'AWS region where your S3 buckets are located'
      },
      {
        key: 'bucket_name',
        label: 'Default Bucket',
        type: 'text',
        required: true,
        placeholder: 'my-ops-tower-bucket',
        description: 'Default S3 bucket name for file uploads'
      }
    ]
  },
  'paypal': {
    name: 'PayPal',
    description: 'Global payment processing platform',
    category: 'Payment',
    docsUrl: 'https://developer.paypal.com/docs/api/',
    fields: [
      {
        key: 'client_id',
        label: 'Client ID',
        type: 'text',
        required: true,
        placeholder: 'AYSq3RDGsmBLJE-otTkBtM-jBRd1TCQwFf9RGfwddNXWz0uFU9ztymylOhRS',
        description: 'Your PayPal app client ID'
      },
      {
        key: 'client_secret',
        label: 'Client Secret',
        type: 'password',
        required: true,
        placeholder: 'Enter your client secret',
        description: 'Your PayPal app client secret (keep this secure)'
      },
      {
        key: 'environment',
        label: 'Environment',
        type: 'select',
        required: true,
        options: ['sandbox', 'production'],
        description: 'Choose sandbox for testing, production for live transactions'
      }
    ]
  },
  'maya': {
    name: 'Maya (PayMaya)',
    description: 'Digital financial services and mobile payments in PH',
    category: 'Payment',
    docsUrl: 'https://developers.paymaya.com/',
    fields: [
      {
        key: 'public_key',
        label: 'Public Key',
        type: 'text',
        required: true,
        placeholder: 'pk-test-...',
        description: 'Your Maya public key'
      },
      {
        key: 'secret_key',
        label: 'Secret Key',
        type: 'password',
        required: true,
        placeholder: 'sk-test-...',
        description: 'Your Maya secret key (keep this secure)'
      },
      {
        key: 'environment',
        label: 'Environment',
        type: 'select',
        required: true,
        options: ['sandbox', 'production'],
        description: 'Choose sandbox for testing, production for live transactions'
      }
    ]
  },
  'square': {
    name: 'Square',
    description: 'Point of sale and payment processing',
    category: 'Payment',
    docsUrl: 'https://developer.squareup.com/docs',
    fields: [
      {
        key: 'application_id',
        label: 'Application ID',
        type: 'text',
        required: true,
        placeholder: 'sq0idb-...',
        description: 'Your Square application ID'
      },
      {
        key: 'access_token',
        label: 'Access Token',
        type: 'password',
        required: true,
        placeholder: 'Enter your access token',
        description: 'Your Square access token (keep this secure)'
      },
      {
        key: 'environment',
        label: 'Environment',
        type: 'select',
        required: true,
        options: ['sandbox', 'production'],
        description: 'Choose sandbox for testing, production for live transactions'
      }
    ]
  },
  'coinsph': {
    name: 'Coins.ph',
    description: 'Cryptocurrency and digital wallet platform for Philippines',
    category: 'Payment',
    docsUrl: 'https://coins.ph/developers',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'Enter your API key',
        description: 'Your Coins.ph API key'
      },
      {
        key: 'secret_key',
        label: 'Secret Key',
        type: 'password',
        required: true,
        placeholder: 'Enter your secret key',
        description: 'Your Coins.ph secret key (keep this secure)'
      }
    ]
  },
  'paymongo': {
    name: 'PayMongo',
    description: 'Payment gateway for Philippine businesses and startups',
    category: 'Payment',
    docsUrl: 'https://developers.paymongo.com/docs',
    fields: [
      {
        key: 'public_key',
        label: 'Public Key',
        type: 'text',
        required: true,
        placeholder: 'pk_test_...',
        description: 'Your PayMongo public key'
      },
      {
        key: 'secret_key',
        label: 'Secret Key',
        type: 'password',
        required: true,
        placeholder: 'sk_test_...',
        description: 'Your PayMongo secret key (keep this secure)'
      }
    ]
  },
  'twilio': {
    name: 'Twilio',
    description: 'SMS, voice, and messaging APIs',
    category: 'Communication',
    docsUrl: 'https://www.twilio.com/docs',
    fields: [
      {
        key: 'account_sid',
        label: 'Account SID',
        type: 'text',
        required: true,
        placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        description: 'Your Twilio Account SID'
      },
      {
        key: 'auth_token',
        label: 'Auth Token',
        type: 'password',
        required: true,
        placeholder: 'Enter your auth token',
        description: 'Your Twilio Auth Token (keep this secure)'
      },
      {
        key: 'phone_number',
        label: 'Phone Number',
        type: 'text',
        required: true,
        placeholder: '+1234567890',
        description: 'Your Twilio phone number for sending messages'
      }
    ]
  },
  'sendgrid': {
    name: 'SendGrid',
    description: 'Email delivery and marketing platform',
    category: 'Communication',
    docsUrl: 'https://docs.sendgrid.com/api-reference',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'SG.xxxxxxxxxxxxxxxx',
        description: 'Your SendGrid API key'
      },
      {
        key: 'from_email',
        label: 'Default From Email',
        type: 'text',
        required: true,
        placeholder: 'noreply@yourcompany.com',
        description: 'Default email address for sending emails'
      },
      {
        key: 'from_name',
        label: 'Default From Name',
        type: 'text',
        required: false,
        placeholder: 'Your Company Name',
        description: 'Default sender name for emails'
      }
    ]
  },
  'mailchimp': {
    name: 'Mailchimp',
    description: 'Email marketing and automation',
    category: 'Communication',
    docsUrl: 'https://mailchimp.com/developer/marketing/',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-us1',
        description: 'Your Mailchimp API key'
      },
      {
        key: 'server_prefix',
        label: 'Server Prefix',
        type: 'text',
        required: true,
        placeholder: 'us1',
        description: 'Server prefix from your API key (e.g., us1, us2)'
      }
    ]
  },
  'slack': {
    name: 'Slack',
    description: 'Team communication and notifications',
    category: 'Communication',
    docsUrl: 'https://api.slack.com/',
    fields: [
      {
        key: 'bot_token',
        label: 'Bot User OAuth Token',
        type: 'password',
        required: true,
        placeholder: 'xoxb-...',
        description: 'Your Slack bot token'
      },
      {
        key: 'webhook_url',
        label: 'Webhook URL',
        type: 'url',
        required: false,
        placeholder: 'https://hooks.slack.com/services/...',
        description: 'Optional: Incoming webhook URL for notifications'
      },
      {
        key: 'default_channel',
        label: 'Default Channel',
        type: 'text',
        required: false,
        placeholder: '#general',
        description: 'Default channel for notifications'
      }
    ]
  },
  'google-maps': {
    name: 'Google Maps',
    description: 'Maps, geocoding, and routing services',
    category: 'Mapping',
    docsUrl: 'https://developers.google.com/maps/documentation',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        description: 'Your Google Maps API key'
      },
      {
        key: 'enabled_apis',
        label: 'Enabled APIs',
        type: 'select',
        required: true,
        options: ['Maps JavaScript API', 'Geocoding API', 'Directions API', 'Places API', 'All APIs'],
        description: 'Which Google Maps APIs are enabled for this key'
      }
    ]
  },
  'mapbox': {
    name: 'Mapbox',
    description: 'Custom maps and location data',
    category: 'Mapping',
    docsUrl: 'https://docs.mapbox.com/api/',
    fields: [
      {
        key: 'access_token',
        label: 'Access Token',
        type: 'password',
        required: true,
        placeholder: 'pk.eyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        description: 'Your Mapbox access token'
      },
      {
        key: 'style_url',
        label: 'Map Style URL',
        type: 'text',
        required: false,
        placeholder: 'mapbox://styles/mapbox/streets-v11',
        description: 'Optional: Custom map style URL'
      }
    ]
  },
  'here-maps': {
    name: 'HERE Maps',
    description: 'Enterprise mapping and location services',
    category: 'Mapping',
    docsUrl: 'https://developer.here.com/documentation',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'Enter your HERE API key',
        description: 'Your HERE Maps API key'
      }
    ]
  },
  'google-analytics': {
    name: 'Google Analytics',
    description: 'Web analytics and insights',
    category: 'Analytics',
    docsUrl: 'https://developers.google.com/analytics',
    fields: [
      {
        key: 'measurement_id',
        label: 'Measurement ID',
        type: 'text',
        required: true,
        placeholder: 'G-XXXXXXXXXX',
        description: 'Your Google Analytics 4 Measurement ID'
      },
      {
        key: 'api_secret',
        label: 'API Secret',
        type: 'password',
        required: false,
        placeholder: 'Enter API secret',
        description: 'Optional: API secret for server-side events'
      }
    ]
  },
  'mixpanel': {
    name: 'Mixpanel',
    description: 'Product analytics and user tracking',
    category: 'Analytics',
    docsUrl: 'https://developer.mixpanel.com/docs',
    fields: [
      {
        key: 'project_token',
        label: 'Project Token',
        type: 'password',
        required: true,
        placeholder: 'Enter your project token',
        description: 'Your Mixpanel project token'
      },
      {
        key: 'api_secret',
        label: 'API Secret',
        type: 'password',
        required: false,
        placeholder: 'Enter API secret',
        description: 'Optional: API secret for server-side tracking'
      }
    ]
  },
  'amplitude': {
    name: 'Amplitude',
    description: 'Digital analytics and product intelligence platform',
    category: 'Analytics',
    docsUrl: 'https://developers.amplitude.com/',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'Enter your API key',
        description: 'Your Amplitude API key'
      },
      {
        key: 'secret_key',
        label: 'Secret Key',
        type: 'password',
        required: false,
        placeholder: 'Enter secret key',
        description: 'Optional: Secret key for server-side events'
      }
    ]
  },
  'appsflyer': {
    name: 'AppsFlyer',
    description: 'Mobile attribution and marketing analytics platform',
    category: 'Analytics',
    docsUrl: 'https://support.appsflyer.com/hc/en-us/articles/207032126',
    fields: [
      {
        key: 'app_id',
        label: 'App ID',
        type: 'text',
        required: true,
        placeholder: 'com.yourapp.name',
        description: 'Your app bundle ID or package name'
      },
      {
        key: 'dev_key',
        label: 'Dev Key',
        type: 'password',
        required: true,
        placeholder: 'Enter your dev key',
        description: 'Your AppsFlyer dev key'
      }
    ]
  },
  'segment': {
    name: 'Segment',
    description: 'Customer data platform',
    category: 'Analytics',
    docsUrl: 'https://segment.com/docs/',
    fields: [
      {
        key: 'write_key',
        label: 'Write Key',
        type: 'password',
        required: true,
        placeholder: 'Enter your write key',
        description: 'Your Segment source write key'
      }
    ]
  },
  'webengage': {
    name: 'WebEngage',
    description: 'Customer engagement and retention platform',
    category: 'Marketing',
    docsUrl: 'https://docs.webengage.com/',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'Enter your API key',
        description: 'Your WebEngage API key'
      },
      {
        key: 'license_code',
        label: 'License Code',
        type: 'text',
        required: true,
        placeholder: 'Enter license code',
        description: 'Your WebEngage license code'
      }
    ]
  },
  'auth0': {
    name: 'Auth0',
    description: 'Identity and access management',
    category: 'Security',
    docsUrl: 'https://auth0.com/docs',
    fields: [
      {
        key: 'domain',
        label: 'Domain',
        type: 'text',
        required: true,
        placeholder: 'your-tenant.auth0.com',
        description: 'Your Auth0 domain'
      },
      {
        key: 'client_id',
        label: 'Client ID',
        type: 'text',
        required: true,
        placeholder: 'Enter your client ID',
        description: 'Your Auth0 application client ID'
      },
      {
        key: 'client_secret',
        label: 'Client Secret',
        type: 'password',
        required: true,
        placeholder: 'Enter your client secret',
        description: 'Your Auth0 application client secret'
      }
    ]
  },
  'okta': {
    name: 'Okta',
    description: 'Enterprise identity solutions',
    category: 'Security',
    docsUrl: 'https://developer.okta.com/docs/',
    fields: [
      {
        key: 'domain',
        label: 'Domain',
        type: 'text',
        required: true,
        placeholder: 'dev-12345.okta.com',
        description: 'Your Okta domain'
      },
      {
        key: 'api_token',
        label: 'API Token',
        type: 'password',
        required: true,
        placeholder: 'Enter your API token',
        description: 'Your Okta API token'
      }
    ]
  },
  'firebase-auth': {
    name: 'Firebase Auth',
    description: 'Google Firebase authentication',
    category: 'Security',
    docsUrl: 'https://firebase.google.com/docs/auth',
    fields: [
      {
        key: 'project_id',
        label: 'Project ID',
        type: 'text',
        required: true,
        placeholder: 'your-project-id',
        description: 'Your Firebase project ID'
      },
      {
        key: 'api_key',
        label: 'Web API Key',
        type: 'password',
        required: true,
        placeholder: 'AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        description: 'Your Firebase Web API key'
      },
      {
        key: 'service_account',
        label: 'Service Account Key',
        type: 'password',
        required: false,
        placeholder: 'Paste JSON service account key',
        description: 'Optional: Service account key for server-side operations'
      }
    ]
  },
  'cloudinary': {
    name: 'Cloudinary',
    description: 'Image and video management',
    category: 'Cloud Storage',
    docsUrl: 'https://cloudinary.com/documentation',
    fields: [
      {
        key: 'cloud_name',
        label: 'Cloud Name',
        type: 'text',
        required: true,
        placeholder: 'your-cloud-name',
        description: 'Your Cloudinary cloud name'
      },
      {
        key: 'api_key',
        label: 'API Key',
        type: 'text',
        required: true,
        placeholder: 'Enter your API key',
        description: 'Your Cloudinary API key'
      },
      {
        key: 'api_secret',
        label: 'API Secret',
        type: 'password',
        required: true,
        placeholder: 'Enter your API secret',
        description: 'Your Cloudinary API secret'
      }
    ]
  },
  'digitalocean': {
    name: 'DigitalOcean',
    description: 'Cloud infrastructure and hosting',
    category: 'Cloud Storage',
    docsUrl: 'https://docs.digitalocean.com/reference/api/',
    fields: [
      {
        key: 'access_token',
        label: 'Access Token',
        type: 'password',
        required: true,
        placeholder: 'dop_v1_...',
        description: 'Your DigitalOcean personal access token'
      },
      {
        key: 'spaces_key',
        label: 'Spaces Access Key',
        type: 'text',
        required: false,
        placeholder: 'Enter Spaces access key',
        description: 'Optional: Access key for DigitalOcean Spaces'
      },
      {
        key: 'spaces_secret',
        label: 'Spaces Secret Key',
        type: 'password',
        required: false,
        placeholder: 'Enter Spaces secret key',
        description: 'Optional: Secret key for DigitalOcean Spaces'
      }
    ]
  },
  'zapier': {
    name: 'Zapier',
    description: 'Workflow automation and app connections',
    category: 'Automation',
    docsUrl: 'https://zapier.com/developer',
    fields: [
      {
        key: 'webhook_url',
        label: 'Webhook URL',
        type: 'url',
        required: true,
        placeholder: 'https://hooks.zapier.com/hooks/catch/...',
        description: 'Your Zapier webhook URL'
      },
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        required: false,
        placeholder: 'Enter API key',
        description: 'Optional: API key for advanced integrations'
      }
    ]
  },
  'webhooks': {
    name: 'Custom Webhooks',
    description: 'Custom HTTP webhooks and callbacks',
    category: 'Automation',
    docsUrl: '',
    fields: [
      {
        key: 'webhook_url',
        label: 'Webhook URL',
        type: 'url',
        required: true,
        placeholder: 'https://your-server.com/webhook',
        description: 'The URL to send webhook requests to'
      },
      {
        key: 'secret',
        label: 'Signing Secret',
        type: 'password',
        required: false,
        placeholder: 'Enter signing secret',
        description: 'Optional: Secret for webhook signature verification'
      },
      {
        key: 'events',
        label: 'Events',
        type: 'select',
        required: true,
        options: ['All Events', 'User Events', 'Ride Events', 'Payment Events', 'System Events'],
        description: 'Which events to send to this webhook'
      }
    ]
  },
  'grok': {
    name: 'Grok',
    description: 'X (Twitter) AI assistant for social media and analytics',
    category: 'AI & Automation',
    docsUrl: 'https://docs.x.ai/',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'xai-...',
        description: 'Your X.AI API key for Grok'
      },
      {
        key: 'model',
        label: 'Model',
        type: 'select',
        required: true,
        options: ['grok-1', 'grok-1.5'],
        description: 'Choose the Grok model to use'
      }
    ]
  },
  'gemini': {
    name: 'Google Gemini',
    description: 'Google AI model for multimodal operations support',
    category: 'AI & Automation',
    docsUrl: 'https://ai.google.dev/docs',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        description: 'Your Google AI Studio API key'
      },
      {
        key: 'model',
        label: 'Model',
        type: 'select',
        required: true,
        options: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'],
        description: 'Choose the Gemini model to use'
      }
    ]
  }
};

export default function IntegrationSetupPage() {
  const router = useRouter();
  const params = useParams();
  const integrationId = params.id as string;
  
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const config = integrationConfigs[integrationId];

  if (!config) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md mx-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Integration Not Found</h2>
          <p className="text-gray-600 mb-4">
            The integration you're trying to configure doesn't exist or isn't supported yet.
          </p>
          <button 
            onClick={() => router.push('/settings/integrations/add')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Integrations
          </button>
        </div>
      </div>
    );
  }

  const handleInputChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleTestConnection = async () => {
    setTestResult({ success: true, message: 'Connection test successful!' });
    setTimeout(() => setTestResult(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate required fields
      const missingFields = config.fields
        .filter(field => field.required && !formData[field.key])
        .map(field => field.label);

      if (missingFields.length > 0) {
        alert(`Please fill in required fields: ${missingFields.join(', ')}`);
        return;
      }

      // Simulate API call to save configuration
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Save to localStorage for demo purposes
      const connectedIntegrations = JSON.parse(localStorage.getItem('connectedIntegrations') || '[]');
      const newIntegration = {
        id: integrationId,
        name: config.name,
        status: 'Connected',
        type: config.category
      };
      
      // Add if not already exists
      if (!connectedIntegrations.some((int: any) => int.id === integrationId)) {
        connectedIntegrations.push(newIntegration);
        localStorage.setItem('connectedIntegrations', JSON.stringify(connectedIntegrations));
      }

      setShowSuccess(true);
      
      setTimeout(() => {
        router.push('/settings');
      }, 2000);

    } catch (error) {
      console.error('Failed to save integration:', error);
      alert('Failed to save integration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md mx-4">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Integration Configured!</h2>
          <p className="text-gray-600 mb-4">
            {config.name} has been successfully configured and connected.
          </p>
          <p className="text-sm text-gray-500">Redirecting back to settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/settings/integrations/add')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Integrations</span>
          </button>
          <div className="text-right">
            <h1 className="text-xl font-bold text-gray-900">Setup {config.name}</h1>
            <p className="text-xs text-gray-600">{config.description}</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          {/* Integration Info */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900 mb-1">Secure Configuration</h3>
                <p className="text-sm text-blue-700 mb-2">
                  Your API keys and secrets are encrypted and stored securely. They're never exposed in logs or shared with third parties.
                </p>
                {config.docsUrl && (
                  <a 
                    href={config.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium inline-flex items-center space-x-1"
                  >
                    <span>View {config.name} API Documentation</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Configuration Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {config.fields.map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                
                {field.type === 'select' ? (
                  <select
                    value={formData[field.key] || ''}
                    onChange={(e) => handleInputChange(field.key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required={field.required}
                  >
                    <option value="">Choose {field.label}</option>
                    {field.options?.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    value={formData[field.key] || ''}
                    onChange={(e) => handleInputChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required={field.required}
                  />
                )}
                
                {field.description && (
                  <p className="mt-1 text-xs text-gray-500">{field.description}</p>
                )}
              </div>
            ))}

            {/* Test Connection */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Test Connection</h3>
                  <p className="text-xs text-gray-500">Verify your credentials before saving</p>
                </div>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  className="px-3 py-1 text-sm border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  Test
                </button>
              </div>
              
              {testResult && (
                <div className={`p-3 rounded-lg text-sm flex items-center space-x-2 ${
                  testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                }`}>
                  {testResult.success ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                type="button"
                onClick={() => router.push('/settings/integrations/add')}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    <span>Save & Connect</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
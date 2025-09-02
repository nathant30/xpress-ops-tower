'use client';

import React, { memo, useState } from 'react';
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Smartphone,
  Volume2,
  VolumeX,
  CheckCircle,
  Clock,
  Settings,
  Users,
  AlertTriangle
} from 'lucide-react';

interface NotificationSetting {
  id: string;
  category: string;
  email: boolean;
  push: boolean;
  sms: boolean;
  inApp: boolean;
  description: string;
}

interface NotificationTemplate {
  id: string;
  name: string;
  type: 'email' | 'push' | 'sms';
  subject: string;
  content: string;
  variables: string[];
  active: boolean;
}

interface NotificationsPanelProps {
  notificationSettings: NotificationSetting[];
  templates: NotificationTemplate[];
  activeSubTab: string;
  loading: boolean;
  onSubTabChange: (tab: string) => void;
  onUpdateNotificationSetting: (setting: NotificationSetting) => void;
  onSendTestNotification: (type: 'email' | 'push' | 'sms') => void;
  onSaveTemplate: (template: NotificationTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
}

const NotificationsPanel = memo<NotificationsPanelProps>(({
  notificationSettings,
  templates,
  activeSubTab,
  loading,
  onSubTabChange,
  onUpdateNotificationSetting,
  onSendTestNotification,
  onSaveTemplate,
  onDeleteTemplate
}) => {
  const [testType, setTestType] = useState<'email' | 'push' | 'sms'>('email');
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);

  const subTabs = [
    { id: 'preferences', label: 'Preferences', icon: Settings },
    { id: 'templates', label: 'Templates', icon: MessageSquare },
    { id: 'channels', label: 'Channels', icon: Bell }
  ];

  const handleSettingChange = (settingId: string, channel: keyof Omit<NotificationSetting, 'id' | 'category' | 'description'>, enabled: boolean) => {
    const setting = notificationSettings.find(s => s.id === settingId);
    if (setting) {
      const updatedSetting = { ...setting, [channel]: enabled };
      onUpdateNotificationSetting(updatedSetting);
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return <Mail className="w-4 h-4" />;
      case 'push': return <Smartphone className="w-4 h-4" />;
      case 'sms': return <MessageSquare className="w-4 h-4" />;
      case 'inApp': return <Bell className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  const renderPreferencesTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Notification Preferences</h3>
            <p className="text-sm text-gray-600">Configure how you receive different types of notifications</p>
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={testType}
              onChange={(e) => setTestType(e.target.value as 'email' | 'push' | 'sms')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="email">Email</option>
              <option value="push">Push</option>
              <option value="sms">SMS</option>
            </select>
            <button
              onClick={() => onSendTestNotification(testType)}
              className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Bell className="w-4 h-4 mr-2" />
              Send Test
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notification Type
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Push
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SMS
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  In-App
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {notificationSettings.map((setting) => (
                <tr key={setting.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{setting.category}</div>
                      <div className="text-sm text-gray-500">{setting.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={setting.email}
                        onChange={(e) => handleSettingChange(setting.id, 'email', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={setting.push}
                        onChange={(e) => handleSettingChange(setting.id, 'push', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={setting.sms}
                        onChange={(e) => handleSettingChange(setting.id, 'sms', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={setting.inApp}
                        onChange={(e) => handleSettingChange(setting.id, 'inApp', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderTemplatesTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Notification Templates</h3>
          <p className="text-sm text-gray-600">Customize notification messages and content</p>
        </div>
        <button
          onClick={() => setEditingTemplate({
            id: '',
            name: 'New Template',
            type: 'email',
            subject: '',
            content: '',
            variables: [],
            active: true
          })}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          New Template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates.map((template) => (
          <div key={template.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                {getChannelIcon(template.type)}
                <div>
                  <h4 className="font-medium text-gray-900">{template.name}</h4>
                  <p className="text-sm text-gray-500 capitalize">{template.type} template</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {template.active ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <Clock className="w-5 h-5 text-gray-400" />
                )}
                <button
                  onClick={() => setEditingTemplate(template)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Edit
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <div>
                <span className="text-sm font-medium text-gray-700">Subject:</span>
                <p className="text-sm text-gray-600">{template.subject}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Variables:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {template.variables.map((variable, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                    >
                      {variable}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderChannelsTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Mail className="w-8 h-8 text-blue-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Email</h3>
                <p className="text-sm text-gray-600">SMTP Configuration</p>
              </div>
            </div>
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <p>Server: smtp.xpress.ops</p>
            <p>Port: 587 (TLS)</p>
            <p>Status: Connected</p>
            <p>Daily Limit: 10,000 emails</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Smartphone className="w-8 h-8 text-purple-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Push Notifications</h3>
                <p className="text-sm text-gray-600">FCM Integration</p>
              </div>
            </div>
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <p>Provider: Firebase Cloud Messaging</p>
            <p>Registered Devices: 1,247</p>
            <p>Status: Active</p>
            <p>Delivery Rate: 98.2%</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <MessageSquare className="w-8 h-8 text-green-600" />
              <div>
                <h3 className="font-semibold text-gray-900">SMS</h3>
                <p className="text-sm text-gray-600">Twilio Integration</p>
              </div>
            </div>
            <AlertTriangle className="w-6 h-6 text-yellow-600" />
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <p>Provider: Twilio</p>
            <p>Phone Numbers: +1-555-XPRESS</p>
            <p>Status: Rate Limited</p>
            <p>Monthly Budget: ₱2,500</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Channel Health Monitoring</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center space-x-3">
              <Volume2 className="w-5 h-5 text-green-600" />
              <div>
                <h4 className="font-medium text-green-900">All Systems Operational</h4>
                <p className="text-sm text-green-600">All notification channels are functioning normally</p>
              </div>
            </div>
            <div className="text-right text-sm text-green-600">
              <div>Last Check: 2 minutes ago</div>
              <div>Uptime: 99.8%</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Mail className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <div className="text-lg font-bold text-blue-800">2,847</div>
              <div className="text-sm text-blue-600">Emails Today</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Smartphone className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <div className="text-lg font-bold text-purple-800">1,234</div>
              <div className="text-sm text-purple-600">Push Notifications</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <MessageSquare className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <div className="text-lg font-bold text-green-800">456</div>
              <div className="text-sm text-green-600">SMS Messages</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {subTabs.map((tab) => {
          const isActive = activeSubTab === tab.id;
          const Icon = tab.icon;
          
          return (
            <button
              key={tab.id}
              onClick={() => onSubTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-blue-50 text-blue-600 border border-blue-200'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div>
        {activeSubTab === 'preferences' && renderPreferencesTab()}
        {activeSubTab === 'templates' && renderTemplatesTab()}
        {activeSubTab === 'channels' && renderChannelsTab()}
      </div>
    </div>
  );
});

NotificationsPanel.displayName = 'NotificationsPanel';

export default NotificationsPanel;
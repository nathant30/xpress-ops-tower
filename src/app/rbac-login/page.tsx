'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, AlertCircle, Loader2, Lock, Mail } from 'lucide-react';
import { useRBAC } from '@/hooks/useRBAC';

export default function RBACLoginPage() {
  const router = useRouter();
  const { login } = useRBAC();
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/rbac', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.data.user);
        setToken(data.data.access_token);
        
        // Use RBAC context to login
        login(data.data.access_token);
        
        // Redirect based on role
        if (data.data.user.role === 'expansion_manager') {
          router.push('/dashboard?rbac=true');
        } else {
          router.push('/dashboard?rbac=true');
        }
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(''); // Clear error when typing
  };

  const testAPI = async (endpoint: string, method = 'GET', body?: any) => {
    try {
      const options: RequestInit = {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      };
      
      if (body) {
        options.body = JSON.stringify(body);
      }
      
      const response = await fetch(endpoint, options);
      const data = await response.json();
      
      alert(`${method} ${endpoint}\n\nStatus: ${response.status}\n\nResponse: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      console.error('API Test Error:', error);
      alert(`Error testing ${endpoint}: ${error}`);
    }
  };

  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">RBAC+ABAC Dashboard</h1>
                <p className="text-gray-600">Welcome, {user.email}</p>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem('rbac_token');
                  setUser(null);
                  setToken('');
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>

          {/* User Info */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">User Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="font-medium">Role:</span> {user.role}
              </div>
              <div>
                <span className="font-medium">Level:</span> {user.level}
              </div>
              <div className="md:col-span-2">
                <span className="font-medium">Regions:</span> {user.regions.join(', ')}
              </div>
            </div>
          </div>

          {/* API Testing */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">API Testing</h2>
            <p className="text-gray-600 mb-4">Test your role permissions with these API endpoints:</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => testAPI('/api/drivers/rbac')}
                className="p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Test View Drivers
              </button>
              
              <button
                onClick={() => testAPI('/api/expansion/requests')}
                className="p-4 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Test Region Requests
              </button>
              
              <button
                onClick={() => testAPI('/api/expansion/requests', 'POST', { 
                  region_name: 'Test Region',
                  region_type: 'prospect' 
                })}
                className="p-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Create Region Request
              </button>
            </div>
            
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 font-medium">Your JWT Token (first 50 chars):</p>
              <code className="text-xs text-gray-500 break-all">
                {token.substring(0, 50)}...
              </code>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto h-12 w-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">RBAC+ABAC Login</h2>
            <p className="text-gray-600 mt-2">Access the 5-step authorization system</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="email"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Login with RBAC'
                )}
              </button>
            </div>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-purple-50 rounded-lg">
            <p className="text-sm font-medium text-purple-900 mb-3">RBAC Demo Accounts (Password: test123)</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium text-purple-800">🔥 executive (super admin)</span>
                <code className="text-purple-600 text-xs">admin@xpress.test</code>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-purple-800">expansion_manager</span>
                <code className="text-purple-600 text-xs">expansion.manager@xpress.test</code>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-purple-800">ground_ops</span>
                <code className="text-purple-600 text-xs">ground.ops.manila@xpress.test</code>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-purple-800">risk_investigator</span>
                <code className="text-purple-600 text-xs">risk.investigator@xpress.test</code>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            RBAC+ABAC System - 5-Step Authorization
          </p>
        </div>
      </div>
    </div>
  );
}
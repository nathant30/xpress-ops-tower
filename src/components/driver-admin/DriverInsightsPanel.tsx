'use client';

import React, { memo } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Users, 
  Star
} from 'lucide-react';
import { productionLogger } from '@/lib/security/productionLogger';

interface Achievement {
  emoji: string;
  title: string;
  score: number;
}

interface Review {
  rating: number;
  comment: string;
}

interface PerformanceMetrics {
  completionRate: number;
  completedTrips: number;
  totalTrips: number;
  acceptanceRate: number;
  acceptedRequests: number;
  totalRequests: number;
  cancellationRate: number;
  cancelledTrips: number;
}

interface ActiveHours {
  averagePerDay: number;
  totalForPeriod: number;
}

interface DriverInsightsPanelProps {
  performanceMetrics: PerformanceMetrics;
  activeHours: ActiveHours;
  achievements: Achievement[];
  reviews: Review[];
  onAchievementClick: (achievement: Achievement) => void;
}

const DriverInsightsPanel = memo<DriverInsightsPanelProps>(({
  performanceMetrics,
  activeHours,
  achievements,
  reviews,
  onAchievementClick
}) => {
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />);
    }
    
    if (hasHalfStar) {
      stars.push(<Star key="half" className="w-4 h-4 text-yellow-400 fill-current opacity-50" />);
    }
    
    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="w-4 h-4 text-gray-300" />);
    }
    
    return <div className="flex space-x-1">{stars}</div>;
  };

  const handleAchievementClick = (achievement: Achievement) => {
    productionLogger.info('Achievement clicked', { achievementTitle: achievement.title });
    onAchievementClick(achievement);
  };

  return (
    <div className="space-y-6">
      {/* Performance Metrics */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics (Today)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Completion Rate</p>
                <p className="text-2xl font-bold text-green-900">{performanceMetrics.completionRate}%</p>
                <p className="text-xs text-green-600">
                  {performanceMetrics.completedTrips}/{performanceMetrics.totalTrips} trips
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div className="mt-3 bg-green-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full" 
                style={{ width: `${performanceMetrics.completionRate}%` }}
              ></div>
            </div>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Acceptance Rate</p>
                <p className="text-2xl font-bold text-blue-900">{performanceMetrics.acceptanceRate}%</p>
                <p className="text-xs text-blue-600">
                  {performanceMetrics.acceptedRequests}/{performanceMetrics.totalRequests} requests
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <div className="mt-3 bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${performanceMetrics.acceptanceRate}%` }}
              ></div>
            </div>
          </div>
          
          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">Cancellation Rate</p>
                <p className="text-2xl font-bold text-red-900">{performanceMetrics.cancellationRate}%</p>
                <p className="text-xs text-red-600">
                  {performanceMetrics.cancelledTrips}/{performanceMetrics.totalTrips} trips
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <div className="mt-3 bg-red-200 rounded-full h-2">
              <div 
                className="bg-red-600 h-2 rounded-full" 
                style={{ width: `${performanceMetrics.cancellationRate}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Hours */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Hours</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Average per day</p>
            <p className="text-xl font-bold text-gray-900">{activeHours.averagePerDay} hrs</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total for period</p>
            <p className="text-xl font-bold text-gray-900">{activeHours.totalForPeriod} hrs</p>
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Achievements</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {achievements.map((badge, index) => (
            <div 
              key={index} 
              className="bg-gray-50 rounded-lg p-4 text-center hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleAchievementClick(badge)}
            >
              <div className="text-3xl mb-2">{badge.emoji}</div>
              <h4 className="text-sm font-medium text-gray-900 mb-1">{badge.title}</h4>
              <p className="text-lg font-bold text-blue-600">{badge.score}%</p>
            </div>
          ))}
        </div>
      </div>

      {/* Customer Reviews */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Reviews</h3>
        <div className="space-y-4">
          {reviews.map((review, index) => (
            <div key={index} className="border-l-4 border-yellow-400 bg-yellow-50 p-4">
              <div className="flex items-center space-x-2 mb-2">
                {renderStars(review.rating)}
                <span className="text-sm font-medium text-gray-900">{review.rating}</span>
              </div>
              <p className="text-sm text-gray-700">{review.comment}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

DriverInsightsPanel.displayName = 'DriverInsightsPanel';

export default DriverInsightsPanel;
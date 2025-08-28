'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ServiceType {
  id: string;
  name: string;
  icon: string;
}

interface ServiceTypeContextValue {
  selectedServiceType: string;
  setSelectedServiceType: (serviceType: string) => void;
  serviceTypes: ServiceType[];
  setActiveSection?: (section: string) => void;
}

const ServiceTypeContext = createContext<ServiceTypeContextValue | undefined>(undefined);

export const useServiceType = () => {
  const context = useContext(ServiceTypeContext);
  if (context === undefined) {
    throw new Error('useServiceType must be used within a ServiceTypeProvider');
  }
  return context;
};

interface ServiceTypeProviderProps {
  children: ReactNode;
}

export const ServiceTypeProvider: React.FC<ServiceTypeProviderProps> = ({ children }) => {
  const [selectedServiceType, setSelectedServiceType] = useState('ALL');

  const serviceTypes: ServiceType[] = [
    { id: 'ALL', name: 'All Services', icon: '🚗' },
    { id: '2W', name: 'Motorcycle', icon: '🏍️' },
    { id: '4W_CAR', name: 'Car', icon: '🚗' },
    { id: '4W_SUV', name: 'SUV', icon: '🚙' },
    { id: '4W_TAXI', name: 'Taxi', icon: '🚖' }
  ];

  const value = {
    selectedServiceType,
    setSelectedServiceType,
    serviceTypes
  };

  return (
    <ServiceTypeContext.Provider value={value}>
      {children}
    </ServiceTypeContext.Provider>
  );
};
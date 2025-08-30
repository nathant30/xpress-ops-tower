import { useState, useCallback } from 'react';
import type { EmergencyIncident, SafetyStage, UserRole } from '@/types/dashboard';

export const useEmergencyIncidents = (userRole: UserRole) => {
  const [emergencyIncidents, setEmergencyIncidents] = useState<EmergencyIncident[]>([
    {
      id: 'sos-001',
      type: 'medical',
      priority: 'critical',
      driverId: 'DRV-001',
      driverName: 'Juan Dela Cruz',
      driverPhone: '+63 917 123 4567',
      location: { lat: 14.5547, lng: 121.0244, address: '26th St, BGC, Taguig' },
      timestamp: new Date(Date.now() - 2 * 60 * 1000),
      status: 'active',
      description: 'Medical emergency - passenger collapsed',
      notes: [
        { timestamp: new Date(), message: 'SOS activated', author: 'System' },
        { timestamp: new Date(), message: 'Emergency services notified', author: 'Dispatcher' }
      ]
    },
    {
      id: 'sos-002',
      type: 'accident',
      priority: 'high',
      driverId: 'DRV-002',
      driverName: 'Maria Santos',
      driverPhone: '+63 917 234 5678',
      location: { lat: 14.5995, lng: 120.9842, address: 'EDSA, Makati City' },
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      status: 'responding',
      description: 'Minor vehicular accident',
      notes: [
        { timestamp: new Date(), message: 'Accident reported', author: 'Driver' },
        { timestamp: new Date(), message: 'Response team dispatched', author: 'Dispatcher' }
      ]
    }
  ]);

  const [selectedIncident, setSelectedIncident] = useState<EmergencyIncident | null>(null);
  const [safetyStage, setSafetyStage] = useState<SafetyStage>('banner');
  const [modalLocked, setModalLocked] = useState(false);
  const [safetyDrawerOpen, setSafetyDrawerOpen] = useState(false);

  const handleIncidentAction = useCallback((incidentId: string, action: 'acknowledge' | 'respond' | 'resolve') => {
    const newNote = {
      timestamp: new Date(),
      message: `Action taken: ${action}`,
      author: userRole === 'dispatcher' ? 'Dispatcher' : 'Ops Manager'
    };

    setEmergencyIncidents(prev => prev.map(i => 
      i.id === incidentId 
        ? { 
            ...i, 
            notes: [...i.notes, newNote], 
            status: action === 'acknowledge' ? 'responding' : action === 'resolve' ? 'resolved' : i.status 
          }
        : i
    ));

    if (action === 'acknowledge') {
      setSafetyStage('drawer');
      setSafetyDrawerOpen(true);
    }
  }, [userRole]);

  const handleIncidentSelect = useCallback((incident: EmergencyIncident) => {
    setSelectedIncident(incident);
    setSafetyStage('modal');
    setModalLocked(true);
  }, []);

  const handleIncidentResolve = useCallback((incident: EmergencyIncident) => {
    handleIncidentAction(incident.id, 'resolve');
    setModalLocked(false);
    setSafetyDrawerOpen(false);
    setSelectedIncident(null);
  }, [handleIncidentAction]);

  const handleModalLock = useCallback(() => {
    setModalLocked(true);
    setSafetyDrawerOpen(false);
  }, []);

  const handleModalUnlock = useCallback(() => {
    setModalLocked(false);
  }, []);

  const handleDrawerToggle = useCallback(() => {
    setSafetyDrawerOpen(!safetyDrawerOpen);
    if (modalLocked) {
      setModalLocked(false);
    }
  }, [safetyDrawerOpen, modalLocked]);

  const handleAddNote = useCallback((incidentId: string, note: string) => {
    const newNote = {
      timestamp: new Date(),
      message: note,
      author: userRole === 'dispatcher' ? 'Dispatcher' : 'Ops Manager'
    };

    setEmergencyIncidents(prev => prev.map(i => 
      i.id === incidentId 
        ? { ...i, notes: [...i.notes, newNote] }
        : i
    ));
  }, [userRole]);

  const criticalIncidents = emergencyIncidents.filter(i => i.status === 'active' && i.priority === 'critical');

  return {
    emergencyIncidents,
    selectedIncident,
    safetyStage,
    modalLocked,
    safetyDrawerOpen,
    criticalIncidents,
    handleIncidentAction,
    handleIncidentSelect,
    handleIncidentResolve,
    handleModalLock,
    handleModalUnlock,
    handleDrawerToggle,
    handleAddNote
  };
};
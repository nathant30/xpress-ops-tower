'use client';

import React, { memo } from 'react';
import { AlertTriangle, X, PhoneCall, CheckCircle, MessageSquare, Clock } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { EmergencyIncident, SafetyStage } from '@/types/dashboard';

interface SafetyConsoleProps {
  emergencyIncidents: EmergencyIncident[];
  selectedIncident: EmergencyIncident | null;
  safetyStage: SafetyStage;
  modalLocked: boolean;
  safetyDrawerOpen: boolean;
  onIncidentSelect: (incident: EmergencyIncident) => void;
  onModalLock: () => void;
  onModalUnlock: () => void;
  onDrawerToggle: () => void;
  onIncidentResolve: (incident: EmergencyIncident) => void;
  onAddNote: (incidentId: string, note: string) => void;
}

const SafetyConsole = memo<SafetyConsoleProps>(({ 
  emergencyIncidents,
  selectedIncident,
  safetyStage,
  modalLocked,
  safetyDrawerOpen,
  onIncidentSelect,
  onModalLock,
  onModalUnlock,
  onDrawerToggle,
  onIncidentResolve,
  onAddNote
}) => {
  const renderEmergencyModal = () => {
    if (!modalLocked || !selectedIncident) return null;

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-red-200 bg-red-50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-red-900 flex items-center">
                <AlertTriangle className="w-6 h-6 mr-3" />
                EMERGENCY RESPONSE
              </h2>
              <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                selectedIncident.priority === 'critical' ? 'bg-red-600 text-white' :
                selectedIncident.priority === 'high' ? 'bg-orange-600 text-white' :
                'bg-yellow-600 text-white'
              }`}>
                {selectedIncident.priority.toUpperCase()}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-600 mb-1">DRIVER</h3>
                <p className="font-bold text-slate-900">{selectedIncident.driverName}</p>
                <p className="text-sm text-slate-600">{selectedIncident.driverPhone}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-600 mb-1">LOCATION</h3>
                <p className="font-bold text-slate-900">{selectedIncident.location.address}</p>
                <p className="text-sm text-slate-600">
                  {selectedIncident.location.lat.toFixed(4)}, {selectedIncident.location.lng.toFixed(4)}
                </p>
              </div>
            </div>
            
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-600 mb-1">INCIDENT DETAILS</h3>
              <p className="text-slate-900">{selectedIncident.description}</p>
              <p className="text-sm text-slate-500 mt-1">
                {selectedIncident.timestamp.toLocaleString()}
              </p>
            </div>
          </div>
          
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-6">
              <button 
                onClick={() => window.open(`tel:${selectedIncident.driverPhone}`)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold flex items-center justify-center space-x-2"
              >
                <PhoneCall className="w-5 h-5" />
                <span>Call Driver</span>
              </button>
              <button 
                onClick={() => onIncidentResolve(selectedIncident)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-semibold flex items-center justify-center space-x-2"
              >
                <CheckCircle className="w-5 h-5" />
                <span>Mark Resolved</span>
              </button>
            </div>
            
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-600 mb-2">INCIDENT NOTES</h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {selectedIncident.notes.map((note, index) => (
                  <div key={index} className="text-sm p-2 bg-slate-50 rounded">
                    <p className="text-slate-900">{note.message}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {note.author} • {note.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button 
                onClick={onModalUnlock}
                className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-semibold"
              >
                Minimize
              </button>
              <button 
                onClick={onDrawerToggle}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold"
              >
                Open Tracker
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSafetyDrawer = () => {
    if (!safetyDrawerOpen || !selectedIncident) return null;

    return (
      <div className="fixed bottom-0 right-0 w-96 h-80 bg-white border-t-2 border-l-2 border-slate-200 shadow-2xl z-40 rounded-tl-2xl">
        <div className="p-4 border-b border-slate-200 bg-slate-50 rounded-tl-2xl">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Incident Tracker</h3>
            <button 
              onClick={onDrawerToggle}
              className="text-slate-500 hover:text-slate-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-4 h-64 overflow-y-auto">
          <div className="mb-3">
            <h4 className="font-semibold text-slate-900">{selectedIncident.driverName}</h4>
            <p className="text-sm text-slate-600">{selectedIncident.description}</p>
          </div>
          <div className="space-y-2">
            {selectedIncident.notes.slice(-3).map((note, index) => (
              <div key={index} className="text-sm p-2 bg-slate-50 rounded">
                <p className="text-slate-900">{note.message}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {note.author} • {note.timestamp.toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
          <button 
            onClick={onModalLock}
            className="w-full mt-3 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-semibold"
          >
            Expand Full View
          </button>
        </div>
      </div>
    );
  };

  const renderIncidentTabs = () => (
    <div className="p-6">
      <Tabs defaultValue="incidents" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="incidents" className="text-sm">
            Active Incidents
          </TabsTrigger>
          <TabsTrigger value="history" className="text-sm">
            History
          </TabsTrigger>
        </TabsList>
        <TabsContent value="incidents" className="space-y-3 mt-4">
          {emergencyIncidents.slice(0, 3).map((incident) => (
            <div key={incident.id} className="p-3 border border-slate-200 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div className="text-sm font-medium text-slate-900">
                  {incident.driverName}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                  incident.priority === 'critical' ? 'bg-red-100 text-red-800' :
                  incident.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {incident.priority}
                </span>
              </div>
              <p className="text-xs text-slate-600 mb-2">{incident.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {Math.floor((Date.now() - incident.timestamp.getTime()) / (1000 * 60))}m ago
                </span>
                <button 
                  onClick={() => onIncidentSelect(incident)}
                  className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded font-semibold"
                >
                  RESPOND
                </button>
              </div>
            </div>
          ))}
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <div className="text-sm text-slate-600 text-center py-8">
            Historical incident data would appear here
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  return (
    <>
      {renderIncidentTabs()}
      {renderEmergencyModal()}
      {renderSafetyDrawer()}
    </>
  );
});

SafetyConsole.displayName = 'SafetyConsole';

export default SafetyConsole;
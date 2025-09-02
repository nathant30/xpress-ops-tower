// Add the SafetyPage component
const SafetyPage = () => {
  const [activeTab, setActiveTab] = useState('live-monitoring');
  const [incidents, setIncidents] = useState<SafetyIncident[]>(mockIncidents);
  const [selectedIncident, setSelectedIncident] = useState<SafetyIncident | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [responseNotes, setResponseNotes] = useState<{ [key: string]: string }>({});
  const [ertTeam, setErtTeam] = useState<ERTMember[]>(mockERTTeam);
  const alertSoundRef = useRef<HTMLAudioElement>(null);
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);

  const filteredIncidents = useMemo(() => {
    return incidents.filter(incident => {
      const matchesCategory = filterCategory === 'ALL' || incident.category === filterCategory;
      const matchesPriority = filterPriority === 'ALL' || incident.priority === filterPriority;
      const matchesSearch = searchTerm === '' || 
        incident.passengerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incident.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incident.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesCategory && matchesPriority && matchesSearch;
    });
  }, [incidents, filterCategory, filterPriority, searchTerm]);

  const priorityStats = useMemo(() => {
    const stats = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    incidents.forEach(incident => {
      if (incident.status === 'ACTIVE' || incident.status === 'RESPONDING') {
        stats[incident.priority]++;
      }
    });
    return stats;
  }, [incidents]);

  const handleEmergencyCall = useCallback((phone: string, type: 'passenger' | 'driver' = 'passenger') => {
    if (typeof window !== 'undefined') {
      try {
        window.open(`tel:${phone}`, '_self');
        } catch (error) {
        console.error('Failed to initiate call:', error);
        alert(`Failed to initiate call to ${phone}. Please call manually.`);
      }
    }
  }, []);

  const handleEmergencySMS = useCallback((phone: string, type: 'passenger' | 'driver' = 'passenger') => {
    if (typeof window !== 'undefined') {
      try {
        const message = `XPRESS EMERGENCY: This is an automated safety check from Xpress Operations. Please confirm your status immediately.`;
        window.open(`sms:${phone}?body=${encodeURIComponent(message)}`, '_self');
        } catch (error) {
        console.error('Failed to send SMS:', error);
        alert(`Failed to send SMS to ${phone}. Please contact manually.`);
      }
    }
  }, []);

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">Safety & Security</h1>
            <p className="text-base text-gray-500 mt-1">Emergency response and incident management</p>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          {activeTab === 'live-monitoring' && (
            <LiveMonitoringTab 
              incidents={filteredIncidents}
              priorityStats={priorityStats}
              selectedIncident={selectedIncident}
              setSelectedIncident={setSelectedIncident}
              onEmergencyCall={handleEmergencyCall}
              onEmergencySMS={handleEmergencySMS}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SafetyPage;
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  Server, 
  Cpu, 
  HardDrive, 
  Activity,
  RefreshCw,
  Plus,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import api from '../../services/api';
import { mockClusters, mockProfiles, mockCapacityStatus } from '../../data/mockCapacityData';

const CapacityDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [clusters, setClusters] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [capacityStatus, setCapacityStatus] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [useMockData, setUseMockData] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      if (useMockData) {
        // Use mock data when no integrations are available
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
        setClusters(mockClusters);
        setProfiles(mockProfiles);
        setCapacityStatus(mockCapacityStatus);
      } else {
        const [clustersRes, profilesRes, statusRes] = await Promise.all([
          api.get('/capacity/clusters'),
          api.get('/capacity/profiles'),
          api.get('/capacity/status')
        ]);

        setClusters(clustersRes.data.clusters || []);
        setProfiles(profilesRes.data.profiles || []);
        setCapacityStatus(statusRes.data);
      }
    } catch (error) {
      console.error('Error fetching capacity data:', error);
      
      // Fall back to mock data if API fails
      if (!useMockData) {
        toast.info('No capacity data available. Showing demo data.');
        setUseMockData(true);
        setClusters(mockClusters);
        setProfiles(mockProfiles);
        setCapacityStatus(mockCapacityStatus);
      } else {
        toast.error('Failed to fetch capacity data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculateCapacity = async (clusterId) => {
    setRefreshing(true);
    try {
      if (useMockData) {
        // Simulate recalculation with mock data
        await new Promise(resolve => setTimeout(resolve, 2000));
        toast.success('Capacity recalculated successfully (demo mode)');
        await fetchData();
      } else {
        await api.post(`/capacity/clusters/${clusterId}/recalculate`);
        toast.success('Capacity recalculated successfully');
        await fetchData();
      }
    } catch (error) {
      console.error('Error recalculating capacity:', error);
      toast.error('Failed to recalculate capacity');
    } finally {
      setRefreshing(false);
    }
  };

  const handleGenerateProfiles = async (clusterId) => {
    try {
      if (useMockData) {
        // Simulate profile generation with mock data
        await new Promise(resolve => setTimeout(resolve, 1500));
        toast.success('Generated 2 automatic profiles (demo mode)');
        await fetchData();
      } else {
        const response = await api.post(`/capacity/clusters/${clusterId}/auto-profiles`);
        toast.success(response.data.message);
        await fetchData();
      }
    } catch (error) {
      console.error('Error generating profiles:', error);
      toast.error('Failed to generate automatic profiles');
    }
  };

  const getUtilizationColor = (percentage) => {
    if (percentage >= 85) return '#ef4444';
    if (percentage >= 70) return '#f59e0b';
    return '#10b981';
  };

  const getUtilizationStatus = (percentage) => {
    if (percentage >= 85) return 'Critical';
    if (percentage >= 70) return 'Warning';
    return 'Good';
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="capacity-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Capacity Management</h1>
          <p>Monitor and manage infrastructure capacity across clusters</p>
        </div>
        <div className="header-actions">
          {useMockData && (
            <div className="demo-badge">
              <span>Demo Mode</span>
            </div>
          )}
          <button 
            className="btn btn-secondary"
            onClick={() => fetchData()}
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? 'spinning' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Capacity Overview */}
      {capacityStatus && (
        <div className="capacity-overview">
          <h2>Capacity Overview</h2>
          <div className="overview-cards">
            <div className="overview-card">
              <div className="card-icon">
                <Server size={24} />
              </div>
              <div className="card-content">
                <h3>Total Clusters</h3>
                <div className="metric-value">{capacityStatus.totalClusters || 0}</div>
              </div>
            </div>
            <div className="overview-card">
              <div className="card-icon">
                <Activity size={24} />
              </div>
              <div className="card-content">
                <h3>Allocation Profiles</h3>
                <div className="metric-value">{capacityStatus.totalProfiles || 0}</div>
              </div>
            </div>
            <div className="overview-card">
              <div className="card-icon">
                <TrendingUp size={24} />
              </div>
              <div className="card-content">
                <h3>Available Slots</h3>
                <div className="metric-value">{capacityStatus.availableSlots || 0}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clusters Section */}
      <div className="clusters-section">
        <div className="section-header">
          <h2>Cluster Capacity</h2>
          <p>Real-time capacity utilization across ESXi clusters</p>
        </div>
        
        <div className="clusters-grid">
          {clusters.map(cluster => (
            <div key={cluster._id} className="cluster-card">
              <div className="cluster-header">
                <div className="cluster-info">
                  <h3>{cluster.name}</h3>
                  <span className="cluster-hosts">{cluster.hostCount} hosts</span>
                </div>
                <div className="cluster-actions">
                  <button
                    className="btn btn-small"
                    onClick={() => handleRecalculateCapacity(cluster._id)}
                    disabled={refreshing}
                  >
                    <RefreshCw size={14} />
                  </button>
                  <button
                    className="btn btn-small btn-primary"
                    onClick={() => handleGenerateProfiles(cluster._id)}
                  >
                    <Plus size={14} />
                    Profiles
                  </button>
                </div>
              </div>

              <div className="capacity-metrics">
                <div className="metric">
                  <div className="metric-header">
                    <Cpu size={16} />
                    <span>CPU</span>
                  </div>
                  <div className="metric-bar">
                    <div 
                      className="metric-fill"
                      style={{ 
                        width: `${cluster.utilization?.cpu || 0}%`,
                        backgroundColor: getUtilizationColor(cluster.utilization?.cpu || 0)
                      }}
                    />
                  </div>
                  <div className="metric-details">
                    <span>{Math.round(cluster.utilization?.cpu || 0)}% used</span>
                    <span className={`status ${getUtilizationStatus(cluster.utilization?.cpu || 0).toLowerCase()}`}>
                      {getUtilizationStatus(cluster.utilization?.cpu || 0)}
                    </span>
                  </div>
                </div>

                <div className="metric">
                  <div className="metric-header">
                    <Activity size={16} />
                    <span>Memory</span>
                  </div>
                  <div className="metric-bar">
                    <div 
                      className="metric-fill"
                      style={{ 
                        width: `${cluster.utilization?.memory || 0}%`,
                        backgroundColor: getUtilizationColor(cluster.utilization?.memory || 0)
                      }}
                    />
                  </div>
                  <div className="metric-details">
                    <span>{Math.round(cluster.utilization?.memory || 0)}% used</span>
                    <span className={`status ${getUtilizationStatus(cluster.utilization?.memory || 0).toLowerCase()}`}>
                      {getUtilizationStatus(cluster.utilization?.memory || 0)}
                    </span>
                  </div>
                </div>

                <div className="metric">
                  <div className="metric-header">
                    <HardDrive size={16} />
                    <span>Storage</span>
                  </div>
                  <div className="metric-bar">
                    <div 
                      className="metric-fill"
                      style={{ 
                        width: `${cluster.utilization?.storage || 0}%`,
                        backgroundColor: getUtilizationColor(cluster.utilization?.storage || 0)
                      }}
                    />
                  </div>
                  <div className="metric-details">
                    <span>{Math.round(cluster.utilization?.storage || 0)}% used</span>
                    <span className={`status ${getUtilizationStatus(cluster.utilization?.storage || 0).toLowerCase()}`}>
                      {getUtilizationStatus(cluster.utilization?.storage || 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="capacity-summary">
                <div className="summary-item">
                  <span>Available CPU Cores</span>
                  <span>{cluster.availableCapacity?.cpu?.cores || 0}</span>
                </div>
                <div className="summary-item">
                  <span>Available Memory</span>
                  <span>{Math.round((cluster.availableCapacity?.memory?.mb || 0) / 1024)} GB</span>
                </div>
                <div className="summary-item">
                  <span>Available Storage</span>
                  <span>{Math.round((cluster.availableCapacity?.storage?.gb || 0))} GB</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Allocation Profiles Section */}
      <div className="profiles-section">
        <div className="section-header">
          <h2>Allocation Profiles</h2>
          <p>VM profiles grouped by similar specifications</p>
        </div>

        <div className="profiles-grid">
          {profiles.map(profile => (
            <div key={profile._id} className="profile-card">
              <div className="profile-header">
                <h3>{profile.name}</h3>
                {profile.autoGenerated && (
                  <span className="auto-badge">Auto</span>
                )}
              </div>

              <div className="profile-specs">
                <div className="spec-item">
                  <Cpu size={14} />
                  <span>{profile.resourceSpecs.cpu.cores} cores</span>
                </div>
                <div className="spec-item">
                  <Activity size={14} />
                  <span>{Math.round(profile.resourceSpecs.memory.mb / 1024)} GB</span>
                </div>
                <div className="spec-item">
                  <HardDrive size={14} />
                  <span>{profile.resourceSpecs.storage.gb} GB</span>
                </div>
              </div>

              <div className="allocation-status">
                <div className="allocation-bar">
                  <div 
                    className="allocation-fill"
                    style={{ 
                      width: `${(profile.allocation.current.count / Math.max(profile.allocation.maximum.count, 1)) * 100}%`
                    }}
                  />
                </div>
                <div className="allocation-details">
                  <span>
                    {profile.allocation.current.count} / {profile.allocation.maximum.count} allocated
                  </span>
                  <span className="available-slots">
                    {profile.availableSlots || 0} available
                  </span>
                </div>
              </div>

              {profile.allocation.current.count > profile.allocation.maximum.count && (
                <div className="overallocation-warning">
                  <AlertTriangle size={14} />
                  <span>Over-allocated</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .capacity-dashboard {
          padding: 24px;
          min-height: 100vh;
          background-color: #f8fafc;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
          padding-bottom: 24px;
          border-bottom: 1px solid #e5e7eb;
        }

        .header-content h1 {
          font-size: 28px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 8px 0;
        }

        .header-content p {
          color: #6b7280;
          font-size: 16px;
          margin: 0;
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

        .btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          background: white;
          color: #374151;
          font-weight: 500;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn:hover {
          background-color: #f9fafb;
          border-color: #9ca3af;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .demo-badge {
          background-color: #f59e0b;
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .btn-primary {
          background-color: #2563eb;
          border-color: #2563eb;
          color: white;
        }

        .btn-primary:hover {
          background-color: #1d4ed8;
        }

        .btn-small {
          padding: 6px 10px;
          font-size: 14px;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .capacity-overview,
        .clusters-section,
        .profiles-section {
          margin-bottom: 32px;
        }

        .capacity-overview h2,
        .section-header h2 {
          font-size: 20px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 8px 0;
        }

        .section-header p {
          color: #6b7280;
          margin: 0 0 20px 0;
        }

        .overview-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-top: 16px;
        }

        .overview-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .card-icon {
          width: 48px;
          height: 48px;
          background-color: #eff6ff;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2563eb;
        }

        .card-content h3 {
          font-size: 14px;
          font-weight: 500;
          color: #6b7280;
          margin: 0 0 4px 0;
        }

        .metric-value {
          font-size: 24px;
          font-weight: 700;
          color: #111827;
        }

        .clusters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 24px;
        }

        .cluster-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 24px;
        }

        .cluster-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }

        .cluster-info h3 {
          font-size: 18px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 4px 0;
        }

        .cluster-hosts {
          font-size: 14px;
          color: #6b7280;
        }

        .cluster-actions {
          display: flex;
          gap: 8px;
        }

        .capacity-metrics {
          margin-bottom: 20px;
        }

        .metric {
          margin-bottom: 16px;
        }

        .metric:last-child {
          margin-bottom: 0;
        }

        .metric-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }

        .metric-bar {
          width: 100%;
          height: 8px;
          background-color: #f3f4f6;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .metric-fill {
          height: 100%;
          transition: width 0.3s ease;
        }

        .metric-details {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
        }

        .status {
          padding: 2px 8px;
          border-radius: 12px;
          font-weight: 500;
          text-transform: uppercase;
          font-size: 10px;
        }

        .status.good {
          background-color: #dcfce7;
          color: #166534;
        }

        .status.warning {
          background-color: #fef3c7;
          color: #92400e;
        }

        .status.critical {
          background-color: #fee2e2;
          color: #991b1b;
        }

        .capacity-summary {
          border-top: 1px solid #f3f4f6;
          padding-top: 16px;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .summary-item:last-child {
          margin-bottom: 0;
        }

        .summary-item span:first-child {
          color: #6b7280;
        }

        .summary-item span:last-child {
          font-weight: 600;
          color: #111827;
        }

        .profiles-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }

        .profile-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
        }

        .profile-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .profile-header h3 {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .auto-badge {
          background-color: #059669;
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .profile-specs {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 16px;
        }

        .spec-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          color: #6b7280;
        }

        .allocation-status {
          margin-bottom: 16px;
        }

        .allocation-bar {
          width: 100%;
          height: 6px;
          background-color: #f3f4f6;
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .allocation-fill {
          height: 100%;
          background-color: #2563eb;
          transition: width 0.3s ease;
        }

        .allocation-details {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
        }

        .available-slots {
          color: #059669;
          font-weight: 500;
        }

        .overallocation-warning {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background-color: #fef3c7;
          border: 1px solid #fcd34d;
          border-radius: 8px;
          color: #92400e;
          font-size: 12px;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .capacity-dashboard {
            padding: 16px;
          }

          .dashboard-header {
            flex-direction: column;
            gap: 16px;
            align-items: stretch;
          }

          .clusters-grid,
          .profiles-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default CapacityDashboard;
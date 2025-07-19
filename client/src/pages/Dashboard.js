import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Monitor, 
  Users, 
  Activity, 
  Layers,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Server,
  BarChart as BarChartIcon,
  Cpu,
  HardDrive,
  Zap
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import api from '../services/api';
import { toast } from 'react-toastify';

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [metricsData, setMetricsData] = useState([]);
  const [utilizationData, setUtilizationData] = useState([]);
  const [capacityOverview, setCapacityOverview] = useState(null);
  const [vmSizingAlerts, setVmSizingAlerts] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Try to fetch real data, fallback to mock data
      try {
        const [summaryResponse, capacityResponse] = await Promise.all([
          api.get('/vdi/summary?dateRange=30'),
          api.get('/capacity/status')
        ]);
        
        setSummary(summaryResponse.data);
        setCapacityOverview(capacityResponse.data);
      } catch (apiError) {
        console.log('API not available, using mock data');
        // Generate mock data for demo
        setSummary(generateMockSummary());
        setCapacityOverview(generateMockCapacityOverview());
      }
      
      // Generate mock metrics data for demo
      const mockMetricsData = generateMockMetricsData();
      setMetricsData(mockMetricsData);
      
      // Generate mock utilization data for demo
      const mockUtilizationData = generateMockUtilizationData();
      setUtilizationData(mockUtilizationData);
      
      // Generate mock VM sizing alerts
      const mockVmSizingAlerts = generateMockVmSizingAlerts();
      setVmSizingAlerts(mockVmSizingAlerts);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const generateMockMetricsData = () => {
    const data = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      data.push({
        date: date.toISOString().split('T')[0],
        cpu: Math.round(Math.random() * 80 + 10),
        memory: Math.round(Math.random() * 70 + 15),
        storage: Math.round(Math.random() * 60 + 20),
        logins: Math.floor(Math.random() * 100) + 50
      });
    }
    
    return data;
  };

  const generateMockUtilizationData = () => {
    return [
      { name: 'High (>70%)', value: 15, color: '#dc2626' },
      { name: 'Medium (30-70%)', value: 35, color: '#f59e0b' },
      { name: 'Low (<30%)', value: 40, color: '#10b981' },
      { name: 'Idle', value: 10, color: '#6b7280' }
    ];
  };

  const generateMockSummary = () => ({
    totalVDIs: 156,
    activeVDIs: 134,
    activityStats: {
      uniqueUsers: 89,
      totalLogins: 1247
    },
    resourceAllocation: {
      totalCPU: 624,
      totalMemory: 2048000,
      totalStorage: 15728640
    }
  });

  const generateMockCapacityOverview = () => ({
    totalClusters: 3,
    totalProfiles: 6,
    availableSlots: 172,
    totalAllocated: 101,
    totalCapacity: 273,
    utilizationSummary: {
      cpu: 69,
      memory: 70,
      storage: 50
    }
  });

  const generateMockVmSizingAlerts = () => [
    {
      id: 1,
      type: 'oversized',
      vmName: 'DEV-JOHN-001',
      issue: 'CPU over-allocated',
      currentSpecs: '8 cores, 16GB RAM',
      recommendedSpecs: '4 cores, 12GB RAM',
      potentialSavings: '$180/month',
      confidence: 'high'
    },
    {
      id: 2,
      type: 'undersized',
      vmName: 'PROD-DB-03',
      issue: 'Memory under-allocated',
      currentSpecs: '16 cores, 32GB RAM',
      recommendedSpecs: '16 cores, 64GB RAM',
      potentialSavings: null,
      confidence: 'medium'
    },
    {
      id: 3,
      type: 'oversized',
      vmName: 'TEST-ENV-07',
      issue: 'Memory over-allocated',
      currentSpecs: '4 cores, 32GB RAM',
      recommendedSpecs: '4 cores, 16GB RAM',
      potentialSavings: '$95/month',
      confidence: 'high'
    }
  ];

  if (loading) {
    return <LoadingSpinner text="Loading dashboard..." />;
  }

  const statCards = [
    {
      title: 'Total VDIs',
      value: summary?.totalVDIs || 0,
      icon: Monitor,
      color: '#3b82f6',
      change: '+5%',
      trend: 'up'
    },
    {
      title: 'Active VDIs',
      value: summary?.activeVDIs || 0,
      icon: Activity,
      color: '#10b981',
      change: '+2%',
      trend: 'up'
    },
    {
      title: 'Clusters',
      value: capacityOverview?.totalClusters || 0,
      icon: Server,
      color: '#8b5cf6',
      change: '+1',
      trend: 'up'
    },
    {
      title: 'Available Slots',
      value: capacityOverview?.availableSlots || 0,
      icon: Zap,
      color: '#f59e0b',
      change: `+${Math.round((capacityOverview?.availableSlots || 0) * 0.08)}`,
      trend: 'up'
    }
  ];

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of your VDI infrastructure</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: stat.color }}>
                <Icon size={24} />
              </div>
              <div className="stat-value">{stat.value.toLocaleString()}</div>
              <div className="stat-label">{stat.title}</div>
              <div className={`stat-change ${stat.trend === 'up' ? 'positive' : 'negative'}`}>
                {stat.trend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                {stat.change}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-2">
        {/* Resource Utilization Trend */}
        <div className="chart-container">
          <div className="chart-header">
            <h3 className="chart-title">Resource Utilization Trend</h3>
            <div className="chart-controls">
              <select className="form-select">
                <option>Last 30 Days</option>
                <option>Last 7 Days</option>
                <option>Last 24 Hours</option>
              </select>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metricsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="cpu" stroke="#3b82f6" name="CPU %" />
              <Line type="monotone" dataKey="memory" stroke="#10b981" name="Memory %" />
              <Line type="monotone" dataKey="storage" stroke="#f59e0b" name="Storage %" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Utilization Distribution */}
        <div className="chart-container">
          <div className="chart-header">
            <h3 className="chart-title">CPU Utilization Distribution</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={utilizationData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {utilizationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Daily Login Activity */}
        <div className="chart-container">
          <div className="chart-header">
            <h3 className="chart-title">Daily Login Activity</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metricsData.slice(-14)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="logins" fill="#8b5cf6" name="Logins" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Resource Allocation Summary */}
        <div className="chart-container">
          <div className="chart-header">
            <h3 className="chart-title">Resource Allocation Summary</h3>
          </div>
          <div className="resource-summary">
            <div className="resource-item">
              <div className="resource-label">Total CPU Cores</div>
              <div className="resource-value">{summary?.resourceAllocation?.totalCPU || 0}</div>
            </div>
            <div className="resource-item">
              <div className="resource-label">Total Memory (GB)</div>
              <div className="resource-value">
                {Math.round((summary?.resourceAllocation?.totalMemory || 0) / 1024)}
              </div>
            </div>
            <div className="resource-item">
              <div className="resource-label">Total Storage (TB)</div>
              <div className="resource-value">
                {Math.round((summary?.resourceAllocation?.totalStorage || 0) / (1024 * 1024 * 1024))}
              </div>
            </div>
            <div className="resource-item">
              <div className="resource-label">Efficiency Score</div>
              <div className="resource-value">
                {Math.round(((summary?.activeVDIs || 0) / (summary?.totalVDIs || 1)) * 100)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="content-section">
        <div className="section-header">
          <h2 className="section-title">Quick Actions</h2>
        </div>
        <div className="quick-actions">
          <Link to="/vdi" className="quick-action-card">
            <Monitor size={32} />
            <h3>Manage VDIs</h3>
            <p>View and manage virtual desktop instances</p>
          </Link>
          <Link to="/profiles" className="quick-action-card">
            <Layers size={32} />
            <h3>VDI Profiles</h3>
            <p>Create and manage resource profiles</p>
          </Link>
          <Link to="/capacity" className="quick-action-card">
            <Server size={32} />
            <h3>Capacity Management</h3>
            <p>Monitor cluster capacity and allocation profiles</p>
          </Link>
          <Link to="/analytics" className="quick-action-card">
            <BarChartIcon size={32} />
            <h3>Analytics</h3>
            <p>Detailed usage and performance analytics</p>
          </Link>
        </div>
      </div>

      {/* VM Sizing Alerts */}
      {vmSizingAlerts.length > 0 && (
        <div className="content-section">
          <div className="section-header">
            <h2 className="section-title">VM Sizing Recommendations</h2>
            <Link to="/capacity" className="btn btn-secondary">View All</Link>
          </div>
          <div className="sizing-alerts">
            {vmSizingAlerts.slice(0, 3).map(alert => (
              <div key={alert.id} className={`sizing-alert ${alert.type}`}>
                <div className="alert-header">
                  <div className="alert-info">
                    <h4>{alert.vmName}</h4>
                    <span className={`alert-type ${alert.type}`}>
                      {alert.type === 'oversized' ? 'Over-allocated' : 'Under-allocated'}
                    </span>
                  </div>
                  <div className="alert-icon">
                    {alert.type === 'oversized' ? 
                      <TrendingDown size={20} color="#f59e0b" /> : 
                      <TrendingUp size={20} color="#ef4444" />
                    }
                  </div>
                </div>
                <p className="alert-issue">{alert.issue}</p>
                <div className="alert-specs">
                  <div className="spec-item">
                    <span className="spec-label">Current:</span>
                    <span className="spec-value">{alert.currentSpecs}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">Recommended:</span>
                    <span className="spec-value">{alert.recommendedSpecs}</span>
                  </div>
                </div>
                {alert.potentialSavings && (
                  <div className="alert-savings">
                    <span>Potential savings: {alert.potentialSavings}</span>
                  </div>
                )}
                <div className="alert-confidence">
                  <span className={`confidence ${alert.confidence}`}>
                    {alert.confidence} confidence
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Capacity Overview */}
      {capacityOverview && (
        <div className="content-section">
          <div className="section-header">
            <h2 className="section-title">Infrastructure Capacity</h2>
            <Link to="/capacity" className="btn btn-secondary">View Details</Link>
          </div>
          <div className="capacity-cards">
            <div className="capacity-card">
              <div className="capacity-icon">
                <Cpu size={24} />
              </div>
              <div className="capacity-content">
                <h4>CPU Utilization</h4>
                <div className="capacity-bar">
                  <div 
                    className="capacity-fill cpu"
                    style={{ width: `${capacityOverview.utilizationSummary?.cpu || 0}%` }}
                  />
                </div>
                <span className="capacity-text">{capacityOverview.utilizationSummary?.cpu || 0}% utilized</span>
              </div>
            </div>
            <div className="capacity-card">
              <div className="capacity-icon">
                <Activity size={24} />
              </div>
              <div className="capacity-content">
                <h4>Memory Utilization</h4>
                <div className="capacity-bar">
                  <div 
                    className="capacity-fill memory"
                    style={{ width: `${capacityOverview.utilizationSummary?.memory || 0}%` }}
                  />
                </div>
                <span className="capacity-text">{capacityOverview.utilizationSummary?.memory || 0}% utilized</span>
              </div>
            </div>
            <div className="capacity-card">
              <div className="capacity-icon">
                <HardDrive size={24} />
              </div>
              <div className="capacity-content">
                <h4>Storage Utilization</h4>
                <div className="capacity-bar">
                  <div 
                    className="capacity-fill storage"
                    style={{ width: `${capacityOverview.utilizationSummary?.storage || 0}%` }}
                  />
                </div>
                <span className="capacity-text">{capacityOverview.utilizationSummary?.storage || 0}% utilized</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .dashboard {
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .resource-summary {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          height: 300px;
          align-items: center;
        }
        
        .resource-item {
          text-align: center;
          padding: 20px;
          background-color: #f8f9fa;
          border-radius: 8px;
        }
        
        .resource-label {
          font-size: 0.9rem;
          color: #6c757d;
          margin-bottom: 8px;
        }
        
        .resource-value {
          font-size: 2rem;
          font-weight: bold;
          color: #495057;
        }
        
        .quick-actions {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
        }
        
        .quick-action-card {
          background: white;
          border-radius: 8px;
          padding: 30px;
          text-align: center;
          text-decoration: none;
          color: inherit;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          transition: all 0.2s;
        }
        
        .quick-action-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
          text-decoration: none;
          color: inherit;
        }
        
        .quick-action-card svg {
          color: #3b82f6;
          margin-bottom: 16px;
        }
        
        .quick-action-card h3 {
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 8px;
          color: #495057;
        }
        
        .quick-action-card p {
          font-size: 0.9rem;
          color: #6c757d;
          margin: 0;
        }
        
        .sizing-alerts {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 20px;
        }

        .sizing-alert {
          background: var(--bg-primary);
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          padding: 20px;
          box-shadow: var(--shadow-sm);
        }

        .sizing-alert.oversized {
          border-left: 4px solid #f59e0b;
        }

        .sizing-alert.undersized {
          border-left: 4px solid #ef4444;
        }

        .alert-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .alert-info h4 {
          margin: 0 0 4px 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .alert-type {
          font-size: 0.8rem;
          font-weight: 500;
          padding: 2px 8px;
          border-radius: 12px;
          text-transform: uppercase;
        }

        .alert-type.oversized {
          background-color: #fef3c7;
          color: #92400e;
        }

        .alert-type.undersized {
          background-color: #fee2e2;
          color: #991b1b;
        }

        .alert-issue {
          margin: 0 0 16px 0;
          color: var(--text-secondary);
          font-size: 0.9rem;
        }

        .alert-specs {
          margin-bottom: 12px;
        }

        .spec-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
          font-size: 0.9rem;
        }

        .spec-label {
          color: var(--text-secondary);
        }

        .spec-value {
          font-weight: 500;
          color: var(--text-primary);
        }

        .alert-savings {
          background-color: #d1fae5;
          color: #065f46;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 0.9rem;
          font-weight: 500;
          margin-bottom: 12px;
        }

        .alert-confidence {
          text-align: right;
        }

        .confidence {
          font-size: 0.8rem;
          padding: 2px 8px;
          border-radius: 12px;
          text-transform: capitalize;
        }

        .confidence.high {
          background-color: #dcfce7;
          color: #166534;
        }

        .confidence.medium {
          background-color: #fef3c7;
          color: #92400e;
        }

        .capacity-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
        }

        .capacity-card {
          background: var(--bg-primary);
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          padding: 20px;
          box-shadow: var(--shadow-sm);
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .capacity-icon {
          width: 48px;
          height: 48px;
          background-color: var(--bg-tertiary);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-primary);
          flex-shrink: 0;
        }

        .capacity-content {
          flex: 1;
        }

        .capacity-content h4 {
          margin: 0 0 8px 0;
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .capacity-bar {
          width: 100%;
          height: 8px;
          background-color: var(--bg-tertiary);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .capacity-fill {
          height: 100%;
          transition: width 0.3s ease;
        }

        .capacity-fill.cpu {
          background-color: #3b82f6;
        }

        .capacity-fill.memory {
          background-color: #10b981;
        }

        .capacity-fill.storage {
          background-color: #f59e0b;
        }

        .capacity-text {
          font-size: 0.9rem;
          color: var(--text-secondary);
        }

        @media (max-width: 768px) {
          .resource-summary {
            grid-template-columns: 1fr;
            height: auto;
          }
          
          .quick-actions {
            grid-template-columns: 1fr;
          }

          .sizing-alerts {
            grid-template-columns: 1fr;
          }

          .capacity-cards {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
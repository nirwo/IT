import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Monitor, 
  Users, 
  Activity, 
  Layers,
  TrendingUp,
  TrendingDown,
  AlertTriangle
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

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [summaryResponse] = await Promise.all([
        api.get('/vdi/summary?dateRange=30')
      ]);
      
      setSummary(summaryResponse.data);
      
      // Generate mock metrics data for demo
      const mockMetricsData = generateMockMetricsData();
      setMetricsData(mockMetricsData);
      
      // Generate mock utilization data for demo
      const mockUtilizationData = generateMockUtilizationData();
      setUtilizationData(mockUtilizationData);
      
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
        cpu: Math.random() * 80 + 10,
        memory: Math.random() * 70 + 15,
        storage: Math.random() * 60 + 20,
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
      title: 'Unique Users',
      value: summary?.activityStats?.uniqueUsers || 0,
      icon: Users,
      color: '#8b5cf6',
      change: '+8%',
      trend: 'up'
    },
    {
      title: 'Total Logins',
      value: summary?.activityStats?.totalLogins || 0,
      icon: TrendingUp,
      color: '#f59e0b',
      change: '-3%',
      trend: 'down'
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
          <Link to="/analytics" className="quick-action-card">
            <BarChart size={32} />
            <h3>Analytics</h3>
            <p>Detailed usage and performance analytics</p>
          </Link>
        </div>
      </div>

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
        
        @media (max-width: 768px) {
          .resource-summary {
            grid-template-columns: 1fr;
            height: auto;
          }
          
          .quick-actions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
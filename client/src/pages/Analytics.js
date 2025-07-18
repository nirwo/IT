import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Monitor, 
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  MemoryStick,
  HardDrive
} from 'lucide-react';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import api from '../services/api';
import { toast } from 'react-toastify';

const Analytics = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('cpu');

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/vdi/summary?dateRange=${dateRange.replace('d', '')}`);
      setSummary(response.data);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const generateMockTrendData = () => {
    const data = [];
    const days = parseInt(dateRange.replace('d', ''));
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      data.push({
        date: date.toISOString().split('T')[0],
        cpu: Math.random() * 80 + 10,
        memory: Math.random() * 70 + 15,
        storage: Math.random() * 60 + 20,
        logins: Math.floor(Math.random() * 200) + 50,
        activeUsers: Math.floor(Math.random() * 150) + 30,
        incidents: Math.floor(Math.random() * 10) + 1
      });
    }
    
    return data;
  };

  const generateUtilizationDistribution = () => {
    return [
      { name: 'Idle (0-10%)', value: summary?.utilizationStats?.idle || 10, color: '#6b7280' },
      { name: 'Low (10-30%)', value: summary?.utilizationStats?.lowUtilization || 25, color: '#10b981' },
      { name: 'Medium (30-70%)', value: summary?.utilizationStats?.mediumUtilization || 35, color: '#f59e0b' },
      { name: 'High (70-100%)', value: summary?.utilizationStats?.highUtilization || 15, color: '#dc2626' }
    ];
  };

  const generateScatterData = () => {
    const data = [];
    for (let i = 0; i < 50; i++) {
      data.push({
        cpuUsage: Math.random() * 100,
        memoryUsage: Math.random() * 100,
        size: Math.random() * 20 + 5
      });
    }
    return data;
  };

  const trendData = generateMockTrendData();
  const utilizationData = generateUtilizationDistribution();
  const scatterData = generateScatterData();

  if (loading) {
    return <LoadingSpinner text="Loading analytics..." />;
  }

  const metricOptions = [
    { key: 'cpu', label: 'CPU Usage', color: '#3b82f6' },
    { key: 'memory', label: 'Memory Usage', color: '#10b981' },
    { key: 'storage', label: 'Storage Usage', color: '#f59e0b' },
    { key: 'logins', label: 'Daily Logins', color: '#8b5cf6' }
  ];

  const currentMetric = metricOptions.find(m => m.key === selectedMetric);

  return (
    <div className="analytics">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Comprehensive VDI usage and performance analytics</p>
        </div>
        <div className="page-actions">
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value)}
            className="form-select"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#3b82f6' }}>
            <Monitor size={24} />
          </div>
          <div className="stat-value">{summary?.totalVDIs || 0}</div>
          <div className="stat-label">Total VDIs</div>
          <div className="stat-change positive">
            <TrendingUp size={16} />
            +5.2%
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#10b981' }}>
            <Activity size={24} />
          </div>
          <div className="stat-value">{summary?.activeVDIs || 0}</div>
          <div className="stat-label">Active VDIs</div>
          <div className="stat-change positive">
            <TrendingUp size={16} />
            +3.1%
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#f59e0b' }}>
            <Users size={24} />
          </div>
          <div className="stat-value">{summary?.activityStats?.uniqueUsers || 0}</div>
          <div className="stat-label">Active Users</div>
          <div className="stat-change negative">
            <TrendingDown size={16} />
            -2.1%
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#8b5cf6' }}>
            <Clock size={24} />
          </div>
          <div className="stat-value">
            {Math.round(((summary?.activeVDIs || 0) / (summary?.totalVDIs || 1)) * 100)}%
          </div>
          <div className="stat-label">Utilization Rate</div>
          <div className="stat-change positive">
            <TrendingUp size={16} />
            +1.8%
          </div>
        </div>
      </div>

      {/* Trend Analysis */}
      <div className="content-section">
        <div className="section-header">
          <h2 className="section-title">Trend Analysis</h2>
          <div className="section-actions">
            <div className="metric-selector">
              {metricOptions.map(metric => (
                <button
                  key={metric.key}
                  onClick={() => setSelectedMetric(metric.key)}
                  className={`metric-btn ${selectedMetric === metric.key ? 'active' : ''}`}
                  style={{ 
                    backgroundColor: selectedMetric === metric.key ? metric.color : 'transparent',
                    color: selectedMetric === metric.key ? 'white' : metric.color,
                    borderColor: metric.color
                  }}
                >
                  {metric.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey={selectedMetric} 
                stroke={currentMetric.color} 
                strokeWidth={3}
                dot={{ fill: currentMetric.color, strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Resource Analytics */}
      <div className="grid grid-2">
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

        {/* Resource Correlation */}
        <div className="chart-container">
          <div className="chart-header">
            <h3 className="chart-title">CPU vs Memory Usage Correlation</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart data={scatterData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="cpuUsage" name="CPU Usage" unit="%" />
              <YAxis dataKey="memoryUsage" name="Memory Usage" unit="%" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter dataKey="size" fill="#3b82f6" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Resource Efficiency */}
      <div className="content-section">
        <div className="section-header">
          <h2 className="section-title">Resource Efficiency</h2>
        </div>
        
        <div className="efficiency-cards">
          <div className="efficiency-card">
            <div className="efficiency-header">
              <Cpu size={24} />
              <h3>CPU Efficiency</h3>
            </div>
            <div className="efficiency-metrics">
              <div className="metric-item">
                <span className="metric-label">Allocated</span>
                <span className="metric-value">{summary?.resourceAllocation?.totalCPU || 0} cores</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Average Usage</span>
                <span className="metric-value">67.3%</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Efficiency Score</span>
                <span className="metric-value efficiency-good">B+</span>
              </div>
            </div>
          </div>

          <div className="efficiency-card">
            <div className="efficiency-header">
              <MemoryStick size={24} />
              <h3>Memory Efficiency</h3>
            </div>
            <div className="efficiency-metrics">
              <div className="metric-item">
                <span className="metric-label">Allocated</span>
                <span className="metric-value">
                  {Math.round((summary?.resourceAllocation?.totalMemory || 0) / 1024)} GB
                </span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Average Usage</span>
                <span className="metric-value">54.8%</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Efficiency Score</span>
                <span className="metric-value efficiency-fair">C+</span>
              </div>
            </div>
          </div>

          <div className="efficiency-card">
            <div className="efficiency-header">
              <HardDrive size={24} />
              <h3>Storage Efficiency</h3>
            </div>
            <div className="efficiency-metrics">
              <div className="metric-item">
                <span className="metric-label">Allocated</span>
                <span className="metric-value">
                  {Math.round((summary?.resourceAllocation?.totalStorage || 0) / (1024 * 1024 * 1024))} TB
                </span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Average Usage</span>
                <span className="metric-value">41.2%</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Efficiency Score</span>
                <span className="metric-value efficiency-poor">D</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="content-section">
        <div className="section-header">
          <h2 className="section-title">Optimization Recommendations</h2>
        </div>
        
        <div className="recommendations">
          <div className="recommendation high">
            <div className="recommendation-icon">
              <AlertTriangle size={20} />
            </div>
            <div className="recommendation-content">
              <h3>Storage Optimization Required</h3>
              <p>
                Average storage utilization is only 41.2%. Consider implementing storage 
                thin provisioning or reducing allocated storage for underutilized VDIs.
              </p>
              <div className="recommendation-impact">
                Potential savings: ~30% storage costs
              </div>
            </div>
            <div className="recommendation-priority">
              <span className="priority-badge high">High</span>
            </div>
          </div>

          <div className="recommendation medium">
            <div className="recommendation-icon">
              <TrendingUp size={20} />
            </div>
            <div className="recommendation-content">
              <h3>CPU Right-sizing Opportunity</h3>
              <p>
                15 VDIs are showing consistently high CPU usage (>80%). Consider upgrading 
                these instances to prevent performance bottlenecks.
              </p>
              <div className="recommendation-impact">
                Affects 15 users, potential performance improvement
              </div>
            </div>
            <div className="recommendation-priority">
              <span className="priority-badge medium">Medium</span>
            </div>
          </div>

          <div className="recommendation low">
            <div className="recommendation-icon">
              <CheckCircle size={20} />
            </div>
            <div className="recommendation-content">
              <h3>Idle VDI Cleanup</h3>
              <p>
                {summary?.utilizationStats?.idle || 10} VDIs have been idle for more than 30 days. 
                Consider deallocating these resources to reduce costs.
              </p>
              <div className="recommendation-impact">
                Potential cost reduction: ~12%
              </div>
            </div>
            <div className="recommendation-priority">
              <span className="priority-badge low">Low</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .analytics {
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .metric-selector {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        
        .metric-btn {
          padding: 8px 16px;
          border: 2px solid;
          border-radius: 20px;
          background: transparent;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .metric-btn:hover {
          transform: translateY(-1px);
        }
        
        .efficiency-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
        }
        
        .efficiency-card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
        }
        
        .efficiency-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
          color: #374151;
        }
        
        .efficiency-header h3 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 600;
        }
        
        .efficiency-metrics {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .metric-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #f3f4f6;
        }
        
        .metric-item:last-child {
          border-bottom: none;
        }
        
        .metric-label {
          font-size: 0.9rem;
          color: #6b7280;
        }
        
        .metric-value {
          font-size: 1rem;
          font-weight: 600;
          color: #374151;
        }
        
        .efficiency-good {
          color: #10b981;
        }
        
        .efficiency-fair {
          color: #f59e0b;
        }
        
        .efficiency-poor {
          color: #dc2626;
        }
        
        .recommendations {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .recommendation {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          display: flex;
          align-items: flex-start;
          gap: 20px;
          border-left: 4px solid #e5e7eb;
        }
        
        .recommendation.high {
          border-left-color: #dc2626;
        }
        
        .recommendation.medium {
          border-left-color: #f59e0b;
        }
        
        .recommendation.low {
          border-left-color: #10b981;
        }
        
        .recommendation-icon {
          width: 48px;
          height: 48px;
          background-color: #f3f4f6;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6b7280;
          flex-shrink: 0;
        }
        
        .recommendation-content {
          flex: 1;
        }
        
        .recommendation-content h3 {
          margin: 0 0 8px 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: #374151;
        }
        
        .recommendation-content p {
          margin: 0 0 12px 0;
          color: #6b7280;
          line-height: 1.5;
        }
        
        .recommendation-impact {
          font-size: 0.9rem;
          color: #10b981;
          font-weight: 500;
        }
        
        .priority-badge {
          padding: 6px 12px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .priority-badge.high {
          background-color: #fef2f2;
          color: #dc2626;
        }
        
        .priority-badge.medium {
          background-color: #fffbeb;
          color: #f59e0b;
        }
        
        .priority-badge.low {
          background-color: #f0fdf4;
          color: #10b981;
        }
        
        @media (max-width: 768px) {
          .metric-selector {
            flex-direction: column;
          }
          
          .metric-btn {
            width: 100%;
            text-align: center;
          }
          
          .efficiency-cards {
            grid-template-columns: 1fr;
          }
          
          .recommendation {
            flex-direction: column;
            text-align: center;
          }
          
          .recommendation-icon {
            align-self: center;
          }
        }
      `}</style>
    </div>
  );
};

export default Analytics;
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Monitor, 
  User, 
  HardDrive, 
  Cpu, 
  MemoryStick,
  Activity,
  Calendar,
  Clock,
  ArrowLeft,
  Edit3,
  RefreshCw
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

const VDIDetail = () => {
  const { id } = useParams();
  const [vdi, setVdi] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [dateRange, setDateRange] = useState('7d');

  useEffect(() => {
    fetchVDIDetail();
  }, [id]);

  useEffect(() => {
    if (vdi) {
      fetchMetrics();
    }
  }, [vdi, dateRange]);

  const fetchVDIDetail = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/vdi/${id}`);
      setVdi(response.data.vdi);
      setMetrics(response.data.recentMetrics || []);
      setActivity(response.data.recentActivity || []);
    } catch (error) {
      console.error('Error fetching VDI details:', error);
      toast.error('Failed to load VDI details');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      setMetricsLoading(true);
      const endDate = new Date();
      const startDate = new Date();
      
      switch (dateRange) {
        case '24h':
          startDate.setHours(startDate.getHours() - 24);
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        default:
          startDate.setDate(startDate.getDate() - 7);
      }

      const response = await api.get(`/vdi/${id}/metrics`, {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          interval: dateRange === '24h' ? 'hour' : 'day'
        }
      });
      
      setMetrics(response.data.metrics || []);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      toast.error('Failed to load metrics data');
    } finally {
      setMetricsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      active: 'status-badge status-active',
      inactive: 'status-badge status-inactive',
      provisioning: 'status-badge status-provisioning',
      maintenance: 'status-badge status-maintenance'
    };
    return statusClasses[status] || 'status-badge';
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 GB';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (date) => {
    return format(new Date(date), 'MMM dd, yyyy HH:mm');
  };

  if (loading) {
    return <LoadingSpinner text="Loading VDI details..." />;
  }

  if (!vdi) {
    return (
      <div className="error-state">
        <h2>VDI not found</h2>
        <p>The requested VDI could not be found.</p>
        <Link to="/vdi" className="btn btn-primary">
          Back to VDI List
        </Link>
      </div>
    );
  }

  return (
    <div className="vdi-detail">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link to="/vdi" className="breadcrumb-item">VDI Management</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-item active">{vdi.ciName}</span>
      </div>

      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <Link to="/vdi" className="back-button">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="page-title">
              <Monitor size={24} />
              {vdi.ciName}
            </h1>
            <p className="page-subtitle">
              Assigned to {vdi.assignedUser.username}
            </p>
          </div>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline" onClick={fetchVDIDetail}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className="btn btn-primary">
            <Edit3 size={16} />
            Edit VDI
          </button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="info-cards">
        <div className="info-card">
          <div className="info-header">
            <h3>Status</h3>
            <span className={getStatusBadge(vdi.status)}>
              {vdi.status}
            </span>
          </div>
        </div>

        <div className="info-card">
          <div className="info-header">
            <h3>Operating System</h3>
          </div>
          <div className="info-content">
            <div className="os-info">
              <span className="os-type">{vdi.operatingSystem.type}</span>
              {vdi.operatingSystem.version && (
                <span className="os-version">{vdi.operatingSystem.version}</span>
              )}
            </div>
          </div>
        </div>

        <div className="info-card">
          <div className="info-header">
            <h3>ESXi Host</h3>
          </div>
          <div className="info-content">
            <span className="host-name">{vdi.esxiHost}</span>
          </div>
        </div>

        <div className="info-card">
          <div className="info-header">
            <h3>Last Seen</h3>
          </div>
          <div className="info-content">
            <span className="last-seen">{formatDate(vdi.lastSeen)}</span>
          </div>
        </div>
      </div>

      {/* Resource Allocation */}
      <div className="content-section">
        <div className="section-header">
          <h2 className="section-title">Resource Allocation</h2>
        </div>
        <div className="resource-cards">
          <div className="resource-card">
            <div className="resource-icon">
              <Cpu size={24} />
            </div>
            <div className="resource-details">
              <div className="resource-label">CPU</div>
              <div className="resource-value">{vdi.resourceAllocation.cpu.cores} cores</div>
              {vdi.resourceAllocation.cpu.reservedMhz && (
                <div className="resource-extra">
                  Reserved: {vdi.resourceAllocation.cpu.reservedMhz} MHz
                </div>
              )}
            </div>
          </div>

          <div className="resource-card">
            <div className="resource-icon">
              <MemoryStick size={24} />
            </div>
            <div className="resource-details">
              <div className="resource-label">Memory</div>
              <div className="resource-value">
                {formatBytes(vdi.resourceAllocation.memory.allocated * 1024 * 1024)}
              </div>
              {vdi.resourceAllocation.memory.reservation && (
                <div className="resource-extra">
                  Reserved: {formatBytes(vdi.resourceAllocation.memory.reservation * 1024 * 1024)}
                </div>
              )}
            </div>
          </div>

          <div className="resource-card">
            <div className="resource-icon">
              <HardDrive size={24} />
            </div>
            <div className="resource-details">
              <div className="resource-label">Storage</div>
              <div className="resource-value">
                {formatBytes(vdi.resourceAllocation.storage.allocated * 1024 * 1024)}
              </div>
              {vdi.resourceAllocation.storage.provisioned && (
                <div className="resource-extra">
                  Provisioned: {formatBytes(vdi.resourceAllocation.storage.provisioned * 1024 * 1024)}
                </div>
              )}
            </div>
          </div>

          {vdi.resourceAllocation.gpu && vdi.resourceAllocation.gpu.allocated > 0 && (
            <div className="resource-card">
              <div className="resource-icon">
                <Monitor size={24} />
              </div>
              <div className="resource-details">
                <div className="resource-label">GPU</div>
                <div className="resource-value">{vdi.resourceAllocation.gpu.allocated}</div>
                {vdi.resourceAllocation.gpu.type && (
                  <div className="resource-extra">
                    Type: {vdi.resourceAllocation.gpu.type}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Information */}
      <div className="content-section">
        <div className="section-header">
          <h2 className="section-title">User Information</h2>
        </div>
        <div className="user-info-card">
          <div className="user-avatar">
            <User size={32} />
          </div>
          <div className="user-details">
            <div className="user-name">{vdi.assignedUser.username}</div>
            {vdi.assignedUser.email && (
              <div className="user-email">{vdi.assignedUser.email}</div>
            )}
            {vdi.assignedUser.manager && (
              <div className="user-manager">Manager: {vdi.assignedUser.manager}</div>
            )}
            {vdi.assignedUser.productGroup && (
              <div className="user-group">Group: {vdi.assignedUser.productGroup}</div>
            )}
            {vdi.assignedUser.groupType && (
              <div className="user-type">Type: {vdi.assignedUser.groupType}</div>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Charts */}
      <div className="content-section">
        <div className="section-header">
          <h2 className="section-title">Performance Metrics</h2>
          <div className="section-actions">
            <select 
              value={dateRange} 
              onChange={(e) => setDateRange(e.target.value)}
              className="form-select"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
        </div>
        
        {metricsLoading ? (
          <LoadingSpinner text="Loading metrics..." />
        ) : (
          <div className="metrics-charts">
            <div className="chart-container">
              <div className="chart-header">
                <h3 className="chart-title">Resource Utilization</h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy HH:mm')}
                    formatter={(value, name) => [`${value.toFixed(1)}%`, name]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cpu.usage" 
                    stroke="#3b82f6" 
                    name="CPU Usage"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="memory.usage" 
                    stroke="#10b981" 
                    name="Memory Usage"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="storage.usage" 
                    stroke="#f59e0b" 
                    name="Storage Usage"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="content-section">
        <div className="section-header">
          <h2 className="section-title">Recent Activity</h2>
        </div>
        <div className="activity-list">
          {activity.length > 0 ? (
            activity.map((item, index) => (
              <div key={index} className="activity-item">
                <div className="activity-icon">
                  <Activity size={16} />
                </div>
                <div className="activity-details">
                  <div className="activity-type">{item.eventType}</div>
                  <div className="activity-time">{formatDate(item.timestamp)}</div>
                  {item.sessionDuration && (
                    <div className="activity-duration">
                      Duration: {Math.round(item.sessionDuration / 60)} minutes
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="no-activity">
              <Activity size={48} />
              <p>No recent activity found</p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .vdi-detail {
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .back-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          color: #6b7280;
          text-decoration: none;
          transition: all 0.2s;
        }
        
        .back-button:hover {
          background-color: #f3f4f6;
          color: #374151;
        }
        
        .page-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .info-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        
        .info-card {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .info-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        
        .info-header h3 {
          font-size: 0.9rem;
          color: #6b7280;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .info-content {
          font-size: 1.1rem;
          font-weight: 500;
          color: #374151;
        }
        
        .os-info {
          display: flex;
          flex-direction: column;
        }
        
        .os-type {
          font-size: 1.1rem;
          font-weight: 600;
          color: #374151;
        }
        
        .os-version {
          font-size: 0.9rem;
          color: #6b7280;
          margin-top: 4px;
        }
        
        .resource-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
        }
        
        .resource-card {
          background: white;
          border-radius: 8px;
          padding: 24px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .resource-icon {
          width: 48px;
          height: 48px;
          background-color: #f3f4f6;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6b7280;
        }
        
        .resource-details {
          flex: 1;
        }
        
        .resource-label {
          font-size: 0.8rem;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        
        .resource-value {
          font-size: 1.2rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 2px;
        }
        
        .resource-extra {
          font-size: 0.8rem;
          color: #6b7280;
        }
        
        .user-info-card {
          background: white;
          border-radius: 8px;
          padding: 24px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          display: flex;
          align-items: center;
          gap: 20px;
        }
        
        .user-avatar {
          width: 64px;
          height: 64px;
          background-color: #3b82f6;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        
        .user-details {
          flex: 1;
        }
        
        .user-name {
          font-size: 1.2rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 4px;
        }
        
        .user-email {
          font-size: 0.9rem;
          color: #6b7280;
          margin-bottom: 8px;
        }
        
        .user-manager,
        .user-group,
        .user-type {
          font-size: 0.8rem;
          color: #6b7280;
          margin-bottom: 4px;
        }
        
        .metrics-charts {
          display: grid;
          gap: 20px;
        }
        
        .activity-list {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        
        .activity-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 24px;
          border-bottom: 1px solid #f3f4f6;
        }
        
        .activity-item:last-child {
          border-bottom: none;
        }
        
        .activity-icon {
          width: 32px;
          height: 32px;
          background-color: #f3f4f6;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6b7280;
        }
        
        .activity-details {
          flex: 1;
        }
        
        .activity-type {
          font-size: 0.9rem;
          font-weight: 500;
          color: #374151;
          text-transform: capitalize;
        }
        
        .activity-time {
          font-size: 0.8rem;
          color: #6b7280;
          margin-top: 2px;
        }
        
        .activity-duration {
          font-size: 0.8rem;
          color: #6b7280;
          margin-top: 2px;
        }
        
        .no-activity {
          text-align: center;
          padding: 60px 20px;
          color: #6b7280;
        }
        
        .no-activity svg {
          margin-bottom: 16px;
          opacity: 0.5;
        }
        
        .error-state {
          text-align: center;
          padding: 60px 20px;
        }
        
        .error-state h2 {
          color: #374151;
          margin-bottom: 12px;
        }
        
        .error-state p {
          color: #6b7280;
          margin-bottom: 24px;
        }
        
        @media (max-width: 768px) {
          .header-left {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          
          .page-header {
            flex-direction: column;
            gap: 16px;
          }
          
          .info-cards {
            grid-template-columns: 1fr;
          }
          
          .resource-cards {
            grid-template-columns: 1fr;
          }
          
          .user-info-card {
            flex-direction: column;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
};

export default VDIDetail;
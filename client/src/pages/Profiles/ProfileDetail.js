import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Layers, 
  Edit3, 
  Copy, 
  Trash2, 
  Users, 
  Cpu, 
  MemoryStick, 
  HardDrive,
  Monitor,
  TrendingUp,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { toast } from 'react-toastify';

const ProfileDetail = () => {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const { hasPermission } = useAuth();

  useEffect(() => {
    fetchProfileData();
  }, [id]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const [profileResponse, analyticsResponse] = await Promise.all([
        api.get(`/profiles/${id}`),
        api.get(`/profiles/${id}/analytics`)
      ]);
      
      setProfile(profileResponse.data.profile);
      setAnalytics(analyticsResponse.data);
    } catch (error) {
      console.error('Error fetching profile data:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleCloneProfile = async () => {
    try {
      const name = prompt('Enter name for the cloned profile:');
      if (!name) return;

      await api.post(`/profiles/${id}/clone`, { name });
      toast.success('Profile cloned successfully');
    } catch (error) {
      console.error('Error cloning profile:', error);
      toast.error('Failed to clone profile');
    }
  };

  const handleDeleteProfile = async () => {
    if (!window.confirm('Are you sure you want to delete this profile?')) {
      return;
    }

    try {
      await api.delete(`/profiles/${id}`);
      toast.success('Profile deleted successfully');
      window.location.href = '/profiles';
    } catch (error) {
      console.error('Error deleting profile:', error);
      toast.error(error.response?.data?.error || 'Failed to delete profile');
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 GB';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getAudienceColor = (audience) => {
    const colors = {
      developer: '#3b82f6',
      designer: '#8b5cf6',
      analyst: '#10b981',
      general: '#6b7280',
      'power-user': '#f59e0b'
    };
    return colors[audience] || '#6b7280';
  };

  const getRecommendationIcon = (type) => {
    switch (type) {
      case 'upsize':
        return <TrendingUp size={16} className="text-orange-500" />;
      case 'downsize':
        return <TrendingUp size={16} className="text-green-500" style={{ transform: 'rotate(180deg)' }} />;
      default:
        return <AlertTriangle size={16} className="text-blue-500" />;
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading profile details..." />;
  }

  if (!profile) {
    return (
      <div className="error-state">
        <h2>Profile not found</h2>
        <p>The requested profile could not be found.</p>
        <Link to="/profiles" className="btn btn-primary">
          Back to Profiles
        </Link>
      </div>
    );
  }

  const utilizationData = analytics ? [
    { name: 'Underutilized', value: analytics.utilizationAnalysis.underutilized, color: '#10b981' },
    { name: 'Normal', value: analytics.totalInstances - analytics.utilizationAnalysis.underutilized - analytics.utilizationAnalysis.overutilized, color: '#3b82f6' },
    { name: 'Overutilized', value: analytics.utilizationAnalysis.overutilized, color: '#f59e0b' }
  ] : [];

  return (
    <div className="profile-detail">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link to="/profiles" className="breadcrumb-item">Profiles</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-item active">{profile.name}</span>
      </div>

      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <Link to="/profiles" className="back-button">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="page-title">
              <Layers size={24} />
              {profile.name}
            </h1>
            <p className="page-subtitle">
              {profile.description || 'No description provided'}
            </p>
          </div>
        </div>
        <div className="page-actions">
          {hasPermission('profile_management') && (
            <>
              <button onClick={handleCloneProfile} className="btn btn-outline">
                <Copy size={16} />
                Clone
              </button>
              <Link to={`/profiles/${id}/edit`} className="btn btn-outline">
                <Edit3 size={16} />
                Edit
              </Link>
              <button onClick={handleDeleteProfile} className="btn btn-danger">
                <Trash2 size={16} />
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Profile Info */}
      <div className="profile-info">
        <div className="info-card">
          <div className="info-header">
            <h3>Target Audience</h3>
          </div>
          <div className="info-content">
            <span 
              className="audience-tag"
              style={{ 
                backgroundColor: `${getAudienceColor(profile.targetAudience)}20`, 
                color: getAudienceColor(profile.targetAudience) 
              }}
            >
              {profile.targetAudience}
            </span>
          </div>
        </div>

        <div className="info-card">
          <div className="info-header">
            <h3>Operating System</h3>
          </div>
          <div className="info-content">
            <div className="os-info">
              <span className="os-type">{profile.operatingSystem.type}</span>
              {profile.operatingSystem.version && (
                <span className="os-version">{profile.operatingSystem.version}</span>
              )}
            </div>
          </div>
        </div>

        <div className="info-card">
          <div className="info-header">
            <h3>Status</h3>
          </div>
          <div className="info-content">
            <span className={`status-badge ${profile.isActive ? 'status-active' : 'status-inactive'}`}>
              {profile.isActive ? 'Active' : 'Inactive'}
            </span>
            {profile.isTemplate && (
              <span className="template-tag">Template</span>
            )}
          </div>
        </div>

        <div className="info-card">
          <div className="info-header">
            <h3>Version</h3>
          </div>
          <div className="info-content">
            <span className="version-number">v{profile.version}</span>
          </div>
        </div>
      </div>

      {/* Resource Specifications */}
      <div className="content-section">
        <div className="section-header">
          <h2 className="section-title">Resource Specifications</h2>
        </div>
        <div className="resource-cards">
          <div className="resource-card">
            <div className="resource-icon">
              <Cpu size={24} />
            </div>
            <div className="resource-details">
              <div className="resource-label">CPU</div>
              <div className="resource-value">{profile.resourceSpecs.cpu.cores} cores</div>
              {profile.resourceSpecs.cpu.reservedMhz && (
                <div className="resource-extra">
                  Reserved: {profile.resourceSpecs.cpu.reservedMhz} MHz
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
                {formatBytes(profile.resourceSpecs.memory.allocated * 1024 * 1024)}
              </div>
              {profile.resourceSpecs.memory.reservation && (
                <div className="resource-extra">
                  Reserved: {formatBytes(profile.resourceSpecs.memory.reservation * 1024 * 1024)}
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
                {formatBytes(profile.resourceSpecs.storage.allocated * 1024 * 1024)}
              </div>
              <div className="resource-extra">
                Type: {profile.resourceSpecs.storage.type}
              </div>
            </div>
          </div>

          {profile.resourceSpecs.gpu && profile.resourceSpecs.gpu.allocated > 0 && (
            <div className="resource-card">
              <div className="resource-icon">
                <Monitor size={24} />
              </div>
              <div className="resource-details">
                <div className="resource-label">GPU</div>
                <div className="resource-value">{profile.resourceSpecs.gpu.allocated}</div>
                <div className="resource-extra">
                  Type: {profile.resourceSpecs.gpu.type}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Usage Statistics */}
      {analytics && (
        <div className="content-section">
          <div className="section-header">
            <h2 className="section-title">Usage Statistics</h2>
          </div>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <Users size={24} />
              </div>
              <div className="stat-value">{analytics.totalInstances}</div>
              <div className="stat-label">Total Instances</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <CheckCircle size={24} />
              </div>
              <div className="stat-value">{analytics.activeInstances}</div>
              <div className="stat-label">Active Instances</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <TrendingUp size={24} />
              </div>
              <div className="stat-value">{analytics.utilizationAnalysis.averageUsage.cpu.toFixed(1)}%</div>
              <div className="stat-label">Avg CPU Usage</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <MemoryStick size={24} />
              </div>
              <div className="stat-value">{analytics.utilizationAnalysis.averageUsage.memory.toFixed(1)}%</div>
              <div className="stat-label">Avg Memory Usage</div>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      {analytics && (
        <div className="content-section">
          <div className="section-header">
            <h2 className="section-title">Usage Analysis</h2>
          </div>
          <div className="charts-grid">
            <div className="chart-container">
              <div className="chart-header">
                <h3 className="chart-title">Utilization Distribution</h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={utilizationData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
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

            <div className="chart-container">
              <div className="chart-header">
                <h3 className="chart-title">Resource Allocation</h3>
              </div>
              <div className="resource-breakdown">
                <div className="breakdown-item">
                  <Cpu size={20} />
                  <div className="breakdown-details">
                    <div className="breakdown-label">Total CPU Cores</div>
                    <div className="breakdown-value">{analytics.resourceEfficiency.totalAllocatedCPU}</div>
                  </div>
                </div>
                <div className="breakdown-item">
                  <MemoryStick size={20} />
                  <div className="breakdown-details">
                    <div className="breakdown-label">Total Memory</div>
                    <div className="breakdown-value">
                      {formatBytes(analytics.resourceEfficiency.totalAllocatedMemory * 1024 * 1024)}
                    </div>
                  </div>
                </div>
                <div className="breakdown-item">
                  <HardDrive size={20} />
                  <div className="breakdown-details">
                    <div className="breakdown-label">Total Storage</div>
                    <div className="breakdown-value">
                      {formatBytes(analytics.resourceEfficiency.totalAllocatedStorage * 1024 * 1024)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {analytics && analytics.recommendations && analytics.recommendations.length > 0 && (
        <div className="content-section">
          <div className="section-header">
            <h2 className="section-title">Optimization Recommendations</h2>
          </div>
          <div className="recommendations">
            {analytics.recommendations.map((rec, index) => (
              <div key={index} className={`recommendation ${rec.priority}`}>
                <div className="recommendation-icon">
                  {getRecommendationIcon(rec.type)}
                </div>
                <div className="recommendation-content">
                  <div className="recommendation-title">{rec.type} Recommendation</div>
                  <div className="recommendation-message">{rec.message}</div>
                  {rec.suggestedChange && (
                    <div className="recommendation-change">
                      Suggested changes: {JSON.stringify(rec.suggestedChange)}
                    </div>
                  )}
                </div>
                <div className="recommendation-priority">
                  <span className={`priority-badge ${rec.priority}`}>
                    {rec.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {profile.tags && profile.tags.length > 0 && (
        <div className="content-section">
          <div className="section-header">
            <h2 className="section-title">Tags</h2>
          </div>
          <div className="tags-container">
            {profile.tags.map((tag, index) => (
              <span key={index} className="tag">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .profile-detail {
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
        
        .profile-info {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        
        .info-card {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .info-header h3 {
          font-size: 0.9rem;
          color: #6b7280;
          margin: 0 0 12px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .info-content {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        
        .audience-tag {
          padding: 6px 12px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 500;
          text-transform: capitalize;
        }
        
        .template-tag {
          padding: 6px 12px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 500;
          background-color: #f3f4f6;
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
        
        .version-number {
          font-size: 1.1rem;
          font-weight: 600;
          color: #374151;
        }
        
        .resource-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
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
        
        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 20px;
        }
        
        .resource-breakdown {
          display: flex;
          flex-direction: column;
          gap: 20px;
          height: 300px;
          justify-content: center;
        }
        
        .breakdown-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background-color: #f9fafb;
          border-radius: 8px;
        }
        
        .breakdown-details {
          flex: 1;
        }
        
        .breakdown-label {
          font-size: 0.9rem;
          color: #6b7280;
          margin-bottom: 4px;
        }
        
        .breakdown-value {
          font-size: 1.1rem;
          font-weight: 600;
          color: #374151;
        }
        
        .recommendations {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .recommendation {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          display: flex;
          align-items: flex-start;
          gap: 16px;
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
          width: 40px;
          height: 40px;
          background-color: #f3f4f6;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .recommendation-content {
          flex: 1;
        }
        
        .recommendation-title {
          font-size: 1rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 4px;
          text-transform: capitalize;
        }
        
        .recommendation-message {
          font-size: 0.9rem;
          color: #6b7280;
          margin-bottom: 8px;
        }
        
        .recommendation-change {
          font-size: 0.8rem;
          color: #9ca3af;
          font-family: monospace;
          background-color: #f3f4f6;
          padding: 8px;
          border-radius: 4px;
        }
        
        .priority-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: uppercase;
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
        
        .tags-container {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        
        .tag {
          display: inline-flex;
          align-items: center;
          padding: 6px 12px;
          background-color: #f3f4f6;
          color: #374151;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 500;
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
          
          .profile-info {
            grid-template-columns: 1fr;
          }
          
          .resource-cards {
            grid-template-columns: 1fr;
          }
          
          .charts-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default ProfileDetail;
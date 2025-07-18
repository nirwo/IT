import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Plus, 
  Layers, 
  Eye, 
  Edit3, 
  Copy,
  Trash2,
  Users,
  Cpu,
  MemoryStick,
  HardDrive
} from 'lucide-react';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { toast } from 'react-toastify';

const ProfileList = () => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    targetAudience: '',
    isActive: true
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { hasPermission } = useAuth();

  useEffect(() => {
    fetchProfiles();
  }, [filters]);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const params = { ...filters };
      const response = await api.get('/profiles', { params });
      setProfiles(response.data.profiles);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      toast.error('Failed to load profiles');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleCloneProfile = async (profileId) => {
    try {
      const name = prompt('Enter name for the cloned profile:');
      if (!name) return;

      await api.post(`/profiles/${profileId}/clone`, { name });
      toast.success('Profile cloned successfully');
      fetchProfiles();
    } catch (error) {
      console.error('Error cloning profile:', error);
      toast.error('Failed to clone profile');
    }
  };

  const handleDeleteProfile = async (profileId) => {
    if (!window.confirm('Are you sure you want to delete this profile?')) {
      return;
    }

    try {
      await api.delete(`/profiles/${profileId}`);
      toast.success('Profile deleted successfully');
      fetchProfiles();
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

  if (loading) {
    return <LoadingSpinner text="Loading profiles..." />;
  }

  return (
    <div className="profile-list">
      <div className="page-header">
        <div>
          <h1 className="page-title">VDI Profiles</h1>
          <p className="page-subtitle">Manage resource allocation profiles</p>
        </div>
        <div className="page-actions">
          {hasPermission('profile_management') && (
            <Link to="/profiles/create" className="btn btn-primary">
              <Plus size={16} />
              Create Profile
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="filter-container">
        <div className="search-box">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Search profiles..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <label>Target Audience</label>
          <select
            value={filters.targetAudience}
            onChange={(e) => handleFilterChange('targetAudience', e.target.value)}
            className="form-select"
          >
            <option value="">All Audiences</option>
            <option value="developer">Developer</option>
            <option value="designer">Designer</option>
            <option value="analyst">Analyst</option>
            <option value="general">General</option>
            <option value="power-user">Power User</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Status</label>
          <select
            value={filters.isActive}
            onChange={(e) => handleFilterChange('isActive', e.target.value === 'true')}
            className="form-select"
          >
            <option value={true}>Active</option>
            <option value={false}>Inactive</option>
          </select>
        </div>
      </div>

      {/* Profiles Grid */}
      <div className="profiles-grid">
        {profiles.map(profile => (
          <div key={profile._id} className="profile-card">
            <div className="profile-header">
              <div className="profile-title">
                <Layers size={20} />
                <h3>{profile.name}</h3>
              </div>
              <div className="profile-actions">
                <Link to={`/profiles/${profile._id}`} className="action-btn">
                  <Eye size={16} />
                </Link>
                {hasPermission('profile_management') && (
                  <>
                    <button 
                      onClick={() => handleCloneProfile(profile._id)}
                      className="action-btn"
                      title="Clone Profile"
                    >
                      <Copy size={16} />
                    </button>
                    <Link to={`/profiles/${profile._id}/edit`} className="action-btn">
                      <Edit3 size={16} />
                    </Link>
                    <button 
                      onClick={() => handleDeleteProfile(profile._id)}
                      className="action-btn danger"
                      title="Delete Profile"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="profile-description">
              {profile.description || 'No description provided'}
            </div>

            <div className="profile-audience">
              <span 
                className="audience-tag"
                style={{ backgroundColor: `${getAudienceColor(profile.targetAudience)}20`, color: getAudienceColor(profile.targetAudience) }}
              >
                {profile.targetAudience}
              </span>
              {profile.isTemplate && (
                <span className="template-tag">Template</span>
              )}
            </div>

            <div className="profile-resources">
              <div className="resource-item">
                <Cpu size={16} />
                <span>{profile.resourceSpecs.cpu.cores} cores</span>
              </div>
              <div className="resource-item">
                <MemoryStick size={16} />
                <span>{formatBytes(profile.resourceSpecs.memory.allocated * 1024 * 1024)}</span>
              </div>
              <div className="resource-item">
                <HardDrive size={16} />
                <span>{formatBytes(profile.resourceSpecs.storage.allocated * 1024 * 1024)}</span>
              </div>
            </div>

            <div className="profile-usage">
              <div className="usage-item">
                <Users size={16} />
                <span>{profile.usage.activeInstances} active</span>
              </div>
              <div className="usage-item">
                <span className="usage-total">
                  {profile.usage.totalInstances} total instances
                </span>
              </div>
            </div>

            <div className="profile-footer">
              <div className="profile-os">
                <span className="os-type">{profile.resourceSpecs.operatingSystem?.type || profile.operatingSystem?.type}</span>
                {(profile.resourceSpecs.operatingSystem?.version || profile.operatingSystem?.version) && (
                  <span className="os-version">
                    {profile.resourceSpecs.operatingSystem?.version || profile.operatingSystem?.version}
                  </span>
                )}
              </div>
              <div className="profile-date">
                Updated {new Date(profile.updatedAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {profiles.length === 0 && !loading && (
        <div className="empty-state">
          <Layers size={64} className="empty-state-icon" />
          <h3 className="empty-state-title">No profiles found</h3>
          <p className="empty-state-description">
            {filters.search || filters.targetAudience ? 
              'No profiles match your current filters.' : 
              'Create your first VDI profile to get started.'
            }
          </p>
          {hasPermission('profile_management') && (
            <Link to="/profiles/create" className="btn btn-primary">
              <Plus size={16} />
              Create Profile
            </Link>
          )}
        </div>
      )}

      <style jsx>{`
        .profile-list {
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .profiles-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 24px;
        }
        
        .profile-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          padding: 24px;
          transition: all 0.2s;
          border: 1px solid #e5e7eb;
        }
        
        .profile-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }
        
        .profile-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }
        
        .profile-title {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }
        
        .profile-title h3 {
          font-size: 1.1rem;
          font-weight: 600;
          color: #374151;
          margin: 0;
        }
        
        .profile-actions {
          display: flex;
          gap: 8px;
        }
        
        .action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: 1px solid #e5e7eb;
          background: white;
          border-radius: 6px;
          color: #6b7280;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .action-btn:hover {
          background-color: #f3f4f6;
          color: #374151;
          border-color: #d1d5db;
        }
        
        .action-btn.danger:hover {
          background-color: #fef2f2;
          color: #dc2626;
          border-color: #fecaca;
        }
        
        .profile-description {
          color: #6b7280;
          font-size: 0.9rem;
          line-height: 1.4;
          margin-bottom: 16px;
          min-height: 2.4rem;
        }
        
        .profile-audience {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        }
        
        .audience-tag {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: capitalize;
        }
        
        .template-tag {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 500;
          background-color: #f3f4f6;
          color: #374151;
        }
        
        .profile-resources {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
          padding: 16px;
          background-color: #f9fafb;
          border-radius: 8px;
        }
        
        .resource-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
          color: #6b7280;
        }
        
        .resource-item svg {
          color: #9ca3af;
        }
        
        .profile-usage {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding: 12px;
          background-color: #f0f9ff;
          border-radius: 8px;
        }
        
        .usage-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.85rem;
          color: #0369a1;
        }
        
        .usage-total {
          font-size: 0.8rem;
          color: #6b7280;
        }
        
        .profile-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 16px;
          border-top: 1px solid #f3f4f6;
        }
        
        .profile-os {
          display: flex;
          flex-direction: column;
        }
        
        .os-type {
          font-size: 0.9rem;
          font-weight: 500;
          color: #374151;
        }
        
        .os-version {
          font-size: 0.75rem;
          color: #6b7280;
        }
        
        .profile-date {
          font-size: 0.75rem;
          color: #9ca3af;
        }
        
        @media (max-width: 768px) {
          .profiles-grid {
            grid-template-columns: 1fr;
          }
          
          .profile-card {
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default ProfileList;
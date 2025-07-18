import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Monitor, 
  User, 
  HardDrive, 
  Cpu, 
  MemoryStick,
  Eye,
  Edit3,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import api from '../../services/api';
import { toast } from 'react-toastify';

const VDIList = () => {
  const [vdis, setVdis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    osType: '',
    esxiHost: '',
    assignedUser: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [sortBy, setSortBy] = useState('ciName');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    fetchVDIs();
  }, [filters, pagination.page, sortBy, sortOrder]);

  const fetchVDIs = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy,
        sortOrder,
        ...filters
      };

      const response = await api.get('/vdi', { params });
      setVdis(response.data.vdis);
      setPagination(prev => ({
        ...prev,
        ...response.data.pagination
      }));
    } catch (error) {
      console.error('Error fetching VDIs:', error);
      toast.error('Failed to load VDI data');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
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

  const getUtilizationColor = (usage) => {
    if (usage > 80) return '#dc2626';
    if (usage > 50) return '#f59e0b';
    if (usage > 20) return '#10b981';
    return '#6b7280';
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 GB';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (loading && vdis.length === 0) {
    return <LoadingSpinner text="Loading VDI data..." />;
  }

  return (
    <div className="vdi-list">
      <div className="page-header">
        <div>
          <h1 className="page-title">VDI Management</h1>
          <p className="page-subtitle">Monitor and manage virtual desktop instances</p>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-container">
        <div className="search-box">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Search VDIs..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <label>Status</label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="form-select"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="provisioning">Provisioning</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>

        <div className="filter-group">
          <label>OS Type</label>
          <select
            value={filters.osType}
            onChange={(e) => handleFilterChange('osType', e.target.value)}
            className="form-select"
          >
            <option value="">All OS</option>
            <option value="Windows">Windows</option>
            <option value="Linux">Linux</option>
            <option value="macOS">macOS</option>
          </select>
        </div>

        <div className="filter-group">
          <label>ESXi Host</label>
          <input
            type="text"
            placeholder="Filter by host"
            value={filters.esxiHost}
            onChange={(e) => handleFilterChange('esxiHost', e.target.value)}
            className="form-control"
          />
        </div>

        <div className="filter-group">
          <label>Assigned User</label>
          <input
            type="text"
            placeholder="Filter by user"
            value={filters.assignedUser}
            onChange={(e) => handleFilterChange('assignedUser', e.target.value)}
            className="form-control"
          />
        </div>
      </div>

      {/* VDI Table */}
      <div className="data-table">
        <div className="table-header">
          <h3 className="table-title">
            Virtual Desktop Instances ({pagination.total})
          </h3>
          <div className="table-controls">
            <button className="btn btn-outline">
              <Filter size={16} />
              Advanced Filters
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th onClick={() => handleSort('ciName')} className="sortable">
                  VDI Name {sortBy === 'ciName' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('assignedUser.username')} className="sortable">
                  Assigned User {sortBy === 'assignedUser.username' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th>Status</th>
                <th>OS</th>
                <th>Resources</th>
                <th>Utilization</th>
                <th>Activity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vdis.map(vdi => (
                <tr key={vdi._id}>
                  <td>
                    <div className="vdi-name">
                      <Monitor size={16} />
                      <span>{vdi.ciName}</span>
                    </div>
                  </td>
                  <td>
                    <div className="user-info">
                      <User size={16} />
                      <div>
                        <div className="username">{vdi.assignedUser.username}</div>
                        {vdi.assignedUser.productGroup && (
                          <div className="user-group">{vdi.assignedUser.productGroup}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={getStatusBadge(vdi.status)}>
                      {vdi.status}
                    </span>
                  </td>
                  <td>
                    <div className="os-info">
                      <span className="os-type">{vdi.operatingSystem.type}</span>
                      {vdi.operatingSystem.version && (
                        <span className="os-version">{vdi.operatingSystem.version}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="resource-summary">
                      <div className="resource-item">
                        <Cpu size={12} />
                        <span>{vdi.resourceAllocation.cpu.cores} cores</span>
                      </div>
                      <div className="resource-item">
                        <MemoryStick size={12} />
                        <span>{formatBytes(vdi.resourceAllocation.memory.allocated * 1024 * 1024)}</span>
                      </div>
                      <div className="resource-item">
                        <HardDrive size={12} />
                        <span>{formatBytes(vdi.resourceAllocation.storage.allocated * 1024 * 1024)}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    {vdi.latestMetrics ? (
                      <div className="utilization-metrics">
                        <div className="metric">
                          <span>CPU</span>
                          <div className="progress-bar">
                            <div 
                              className="progress-fill"
                              style={{ 
                                width: `${vdi.latestMetrics.cpu.usage}%`,
                                backgroundColor: getUtilizationColor(vdi.latestMetrics.cpu.usage)
                              }}
                            />
                          </div>
                          <span>{vdi.latestMetrics.cpu.usage.toFixed(1)}%</span>
                        </div>
                        <div className="metric">
                          <span>MEM</span>
                          <div className="progress-bar">
                            <div 
                              className="progress-fill"
                              style={{ 
                                width: `${vdi.latestMetrics.memory.usage}%`,
                                backgroundColor: getUtilizationColor(vdi.latestMetrics.memory.usage)
                              }}
                            />
                          </div>
                          <span>{vdi.latestMetrics.memory.usage.toFixed(1)}%</span>
                        </div>
                      </div>
                    ) : (
                      <span className="no-data">No data</span>
                    )}
                  </td>
                  <td>
                    <div className="activity-info">
                      <span className="activity-count">{vdi.activityCount}</span>
                      <span className="activity-label">logins (30d)</span>
                    </div>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <Link to={`/vdi/${vdi._id}`} className="btn btn-outline btn-sm">
                        <Eye size={14} />
                      </Link>
                      <button className="btn btn-outline btn-sm">
                        <Edit3 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="pagination">
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="btn btn-outline"
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          
          <div className="page-info">
            Page {pagination.page} of {pagination.pages}
          </div>
          
          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.pages}
            className="btn btn-outline"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <style jsx>{`
        .vdi-list {
          max-width: 1400px;
          margin: 0 auto;
        }
        
        .sortable {
          cursor: pointer;
          user-select: none;
        }
        
        .sortable:hover {
          background-color: #f8f9fa;
        }
        
        .vdi-name {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 500;
        }
        
        .user-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .username {
          font-weight: 500;
          font-size: 0.9rem;
        }
        
        .user-group {
          font-size: 0.75rem;
          color: #6c757d;
        }
        
        .os-info {
          display: flex;
          flex-direction: column;
        }
        
        .os-type {
          font-weight: 500;
          font-size: 0.9rem;
        }
        
        .os-version {
          font-size: 0.75rem;
          color: #6c757d;
        }
        
        .resource-summary {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .resource-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.75rem;
          color: #6c757d;
        }
        
        .utilization-metrics {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 120px;
        }
        
        .metric {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.75rem;
        }
        
        .metric span:first-child {
          width: 30px;
          font-weight: 500;
        }
        
        .metric span:last-child {
          width: 40px;
          text-align: right;
        }
        
        .progress-bar {
          flex: 1;
          height: 6px;
          background-color: #e9ecef;
          border-radius: 3px;
          overflow: hidden;
        }
        
        .progress-fill {
          height: 100%;
          transition: width 0.3s ease;
        }
        
        .activity-info {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .activity-count {
          font-size: 1.2rem;
          font-weight: 600;
          color: #495057;
        }
        
        .activity-label {
          font-size: 0.7rem;
          color: #6c757d;
        }
        
        .action-buttons {
          display: flex;
          gap: 8px;
        }
        
        .btn-sm {
          padding: 6px 8px;
          font-size: 0.75rem;
        }
        
        .no-data {
          color: #6c757d;
          font-style: italic;
          font-size: 0.8rem;
        }
        
        .page-info {
          display: flex;
          align-items: center;
          font-size: 0.9rem;
          color: #6c757d;
        }
        
        @media (max-width: 1200px) {
          .utilization-metrics {
            min-width: 100px;
          }
          
          .metric span:first-child {
            width: 25px;
          }
          
          .metric span:last-child {
            width: 35px;
          }
        }
        
        @media (max-width: 768px) {
          .table-container {
            overflow-x: auto;
          }
          
          .resource-summary {
            flex-direction: row;
            flex-wrap: wrap;
          }
          
          .utilization-metrics {
            min-width: 80px;
          }
        }
      `}</style>
    </div>
  );
};

export default VDIList;
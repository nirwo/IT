import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  User, 
  Shield, 
  Database, 
  Bell, 
  Eye, 
  EyeOff,
  Save,
  RefreshCw,
  Trash2,
  Plus,
  Moon,
  Sun
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'react-toastify';

const Settings = () => {
  const { user, isAdmin, updateProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [profileData, setProfileData] = useState({
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [organizationSettings, setOrganizationSettings] = useState({
    dataRetentionDays: 365,
    collectionInterval: 15,
    thresholds: {
      cpuIdle: 5,
      memoryIdle: 10,
      diskIdle: 15
    }
  });

  const [integrations, setIntegrations] = useState({
    serviceNow: {
      enabled: false,
      url: '',
      username: '',
      password: ''
    },
    vCenter: {
      enabled: false,
      url: '',
      username: '',
      password: ''
    },
    jira: {
      enabled: false,
      url: '',
      username: '',
      apiToken: ''
    },
    hyperV: {
      enabled: false,
      host: '',
      username: '',
      password: ''
    }
  });

  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    utilizationAlerts: true,
    capacityAlerts: true,
    systemAlerts: true
  });

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    
    if (profileData.newPassword && profileData.newPassword !== profileData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        email: profileData.email
      };

      if (profileData.newPassword) {
        updateData.currentPassword = profileData.currentPassword;
        updateData.newPassword = profileData.newPassword;
      }

      const result = await updateProfile(updateData);
      
      if (result.success) {
        toast.success('Profile updated successfully');
        setProfileData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleIntegrationToggle = (service) => {
    setIntegrations(prev => ({
      ...prev,
      [service]: {
        ...prev[service],
        enabled: !prev[service].enabled
      }
    }));
  };

  const handleIntegrationUpdate = (service, field, value) => {
    setIntegrations(prev => ({
      ...prev,
      [service]: {
        ...prev[service],
        [field]: value
      }
    }));
  };

  const testIntegration = async (service) => {
    try {
      setLoading(true);
      // Mock API call to test integration
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success(`${service} integration test successful`);
    } catch (error) {
      toast.error(`${service} integration test failed`);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'appearance', label: 'Appearance', icon: theme === 'dark' ? Sun : Moon },
    { id: 'organization', label: 'Organization', icon: SettingsIcon, adminOnly: true },
    { id: 'integrations', label: 'Integrations', icon: Database, adminOnly: true },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield, adminOnly: true }
  ];

  const filteredTabs = tabs.filter(tab => !tab.adminOnly || isAdmin());

  return (
    <div className="settings">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your account and system preferences</p>
        </div>
      </div>

      <div className="settings-container">
        {/* Sidebar */}
        <div className="settings-sidebar">
          <nav className="settings-nav">
            {filteredTabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                >
                  <Icon size={20} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="settings-content">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="settings-section">
              <div className="section-header">
                <h2>Profile Settings</h2>
                <p>Manage your personal account information</p>
              </div>

              <form onSubmit={handleProfileUpdate} className="settings-form">
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input
                    type="text"
                    value={user?.username || ''}
                    disabled
                    className="form-control"
                  />
                  <small className="form-text">Username cannot be changed</small>
                </div>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Role</label>
                  <input
                    type="text"
                    value={user?.role || ''}
                    disabled
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Organization</label>
                  <input
                    type="text"
                    value={user?.organization?.name || ''}
                    disabled
                    className="form-control"
                  />
                </div>

                <div className="form-divider">
                  <span>Change Password</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <div className="password-input-container">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={profileData.currentPassword}
                      onChange={(e) => setProfileData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      className="form-control"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="password-toggle"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    value={profileData.newPassword}
                    onChange={(e) => setProfileData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input
                    type="password"
                    value={profileData.confirmPassword}
                    onChange={(e) => setProfileData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="form-control"
                  />
                </div>

                <button type="submit" disabled={loading} className="btn btn-primary">
                  {loading ? (
                    <>
                      <RefreshCw size={16} className="spinning" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Update Profile
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="settings-section">
              <div className="section-header">
                <h2>Appearance Settings</h2>
                <p>Customize the look and feel of your dashboard</p>
              </div>

              <div className="appearance-settings">
                <div className="theme-setting">
                  <div className="setting-info">
                    <h3>Theme</h3>
                    <p>Choose between light and dark mode</p>
                  </div>
                  <div className="theme-options">
                    <button
                      onClick={() => theme !== 'light' && toggleTheme()}
                      className={`theme-option ${theme === 'light' ? 'active' : ''}`}
                    >
                      <Sun size={20} />
                      <span>Light</span>
                    </button>
                    <button
                      onClick={() => theme !== 'dark' && toggleTheme()}
                      className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
                    >
                      <Moon size={20} />
                      <span>Dark</span>
                    </button>
                  </div>
                </div>

                <div className="preview-section">
                  <h3>Preview</h3>
                  <div className="theme-preview">
                    <div className="preview-header">
                      <div className="preview-title">Dashboard Preview</div>
                      <div className="preview-actions">
                        <div className="preview-dot"></div>
                        <div className="preview-dot"></div>
                        <div className="preview-dot"></div>
                      </div>
                    </div>
                    <div className="preview-content">
                      <div className="preview-sidebar">
                        <div className="preview-nav-item active"></div>
                        <div className="preview-nav-item"></div>
                        <div className="preview-nav-item"></div>
                      </div>
                      <div className="preview-main">
                        <div className="preview-card"></div>
                        <div className="preview-cards">
                          <div className="preview-small-card"></div>
                          <div className="preview-small-card"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Organization Tab */}
          {activeTab === 'organization' && isAdmin() && (
            <div className="settings-section">
              <div className="section-header">
                <h2>Organization Settings</h2>
                <p>Configure organization-wide settings and policies</p>
              </div>

              <div className="settings-form">
                <div className="form-group">
                  <label className="form-label">Data Retention Period (days)</label>
                  <input
                    type="number"
                    value={organizationSettings.dataRetentionDays}
                    onChange={(e) => setOrganizationSettings(prev => ({ 
                      ...prev, 
                      dataRetentionDays: parseInt(e.target.value) 
                    }))}
                    className="form-control"
                    min="1"
                    max="3650"
                  />
                  <small className="form-text">How long to keep historical data</small>
                </div>

                <div className="form-group">
                  <label className="form-label">Collection Interval (minutes)</label>
                  <input
                    type="number"
                    value={organizationSettings.collectionInterval}
                    onChange={(e) => setOrganizationSettings(prev => ({ 
                      ...prev, 
                      collectionInterval: parseInt(e.target.value) 
                    }))}
                    className="form-control"
                    min="1"
                    max="60"
                  />
                  <small className="form-text">How often to collect metrics</small>
                </div>

                <div className="form-divider">
                  <span>Idle Thresholds</span>
                </div>

                <div className="form-group">
                  <label className="form-label">CPU Idle Threshold (%)</label>
                  <input
                    type="number"
                    value={organizationSettings.thresholds.cpuIdle}
                    onChange={(e) => setOrganizationSettings(prev => ({ 
                      ...prev, 
                      thresholds: { ...prev.thresholds, cpuIdle: parseInt(e.target.value) }
                    }))}
                    className="form-control"
                    min="0"
                    max="100"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Memory Idle Threshold (%)</label>
                  <input
                    type="number"
                    value={organizationSettings.thresholds.memoryIdle}
                    onChange={(e) => setOrganizationSettings(prev => ({ 
                      ...prev, 
                      thresholds: { ...prev.thresholds, memoryIdle: parseInt(e.target.value) }
                    }))}
                    className="form-control"
                    min="0"
                    max="100"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Disk Idle Threshold (%)</label>
                  <input
                    type="number"
                    value={organizationSettings.thresholds.diskIdle}
                    onChange={(e) => setOrganizationSettings(prev => ({ 
                      ...prev, 
                      thresholds: { ...prev.thresholds, diskIdle: parseInt(e.target.value) }
                    }))}
                    className="form-control"
                    min="0"
                    max="100"
                  />
                </div>

                <button className="btn btn-primary">
                  <Save size={16} />
                  Save Settings
                </button>
              </div>
            </div>
          )}

          {/* Integrations Tab */}
          {activeTab === 'integrations' && isAdmin() && (
            <div className="settings-section">
              <div className="section-header">
                <h2>System Integrations</h2>
                <p>Configure connections to external systems</p>
              </div>

              <div className="integrations-list">
                {Object.entries(integrations).map(([key, integration]) => (
                  <div key={key} className="integration-card">
                    <div className="integration-header">
                      <div className="integration-info">
                        <h3>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</h3>
                        <p>
                          {key === 'serviceNow' && 'ServiceNow ITSM integration for ticket management'}
                          {key === 'vCenter' && 'VMware vCenter integration for VM monitoring'}
                          {key === 'jira' && 'Atlassian Jira integration for issue tracking'}
                          {key === 'hyperV' && 'Microsoft Hyper-V integration for VM monitoring'}
                        </p>
                      </div>
                      <div className="integration-toggle">
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={integration.enabled}
                            onChange={() => handleIntegrationToggle(key)}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                    </div>

                    {integration.enabled && (
                      <div className="integration-form">
                        <div className="form-group">
                          <label className="form-label">
                            {key === 'hyperV' ? 'Host' : 'URL'}
                          </label>
                          <input
                            type="text"
                            value={integration.url || integration.host || ''}
                            onChange={(e) => handleIntegrationUpdate(key, key === 'hyperV' ? 'host' : 'url', e.target.value)}
                            className="form-control"
                            placeholder={key === 'hyperV' ? 'hyperv-host.example.com' : 'https://example.com'}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Username</label>
                          <input
                            type="text"
                            value={integration.username || ''}
                            onChange={(e) => handleIntegrationUpdate(key, 'username', e.target.value)}
                            className="form-control"
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">
                            {key === 'jira' ? 'API Token' : 'Password'}
                          </label>
                          <input
                            type="password"
                            value={integration.password || integration.apiToken || ''}
                            onChange={(e) => handleIntegrationUpdate(key, key === 'jira' ? 'apiToken' : 'password', e.target.value)}
                            className="form-control"
                          />
                        </div>

                        <div className="integration-actions">
                          <button 
                            onClick={() => testIntegration(key)}
                            className="btn btn-outline"
                            disabled={loading}
                          >
                            Test Connection
                          </button>
                          <button className="btn btn-primary">
                            Save Configuration
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="settings-section">
              <div className="section-header">
                <h2>Notification Settings</h2>
                <p>Configure when and how you receive notifications</p>
              </div>

              <div className="notification-settings">
                <div className="notification-item">
                  <div className="notification-info">
                    <h3>Email Alerts</h3>
                    <p>Receive email notifications for important events</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notifications.emailAlerts}
                      onChange={(e) => setNotifications(prev => ({ ...prev, emailAlerts: e.target.checked }))}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="notification-item">
                  <div className="notification-info">
                    <h3>Utilization Alerts</h3>
                    <p>Get notified when VDI utilization exceeds thresholds</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notifications.utilizationAlerts}
                      onChange={(e) => setNotifications(prev => ({ ...prev, utilizationAlerts: e.target.checked }))}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="notification-item">
                  <div className="notification-info">
                    <h3>Capacity Alerts</h3>
                    <p>Receive alerts when system capacity is running low</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notifications.capacityAlerts}
                      onChange={(e) => setNotifications(prev => ({ ...prev, capacityAlerts: e.target.checked }))}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="notification-item">
                  <div className="notification-info">
                    <h3>System Alerts</h3>
                    <p>Get notified about system maintenance and updates</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notifications.systemAlerts}
                      onChange={(e) => setNotifications(prev => ({ ...prev, systemAlerts: e.target.checked }))}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <button className="btn btn-primary">
                  <Save size={16} />
                  Save Preferences
                </button>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && isAdmin() && (
            <div className="settings-section">
              <div className="section-header">
                <h2>Security Settings</h2>
                <p>Manage security policies and access controls</p>
              </div>

              <div className="security-settings">
                <div className="security-item">
                  <h3>Session Management</h3>
                  <div className="form-group">
                    <label className="form-label">Session Timeout (minutes)</label>
                    <input
                      type="number"
                      defaultValue={60}
                      className="form-control"
                      min="5"
                      max="480"
                    />
                  </div>
                </div>

                <div className="security-item">
                  <h3>Password Policy</h3>
                  <div className="form-group">
                    <label className="form-label">Minimum Password Length</label>
                    <input
                      type="number"
                      defaultValue={8}
                      className="form-control"
                      min="6"
                      max="32"
                    />
                  </div>
                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input type="checkbox" defaultChecked />
                      Require uppercase letters
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" defaultChecked />
                      Require lowercase letters
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" defaultChecked />
                      Require numbers
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" />
                      Require special characters
                    </label>
                  </div>
                </div>

                <button className="btn btn-primary">
                  <Save size={16} />
                  Update Security Settings
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .settings {
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .settings-container {
          display: grid;
          grid-template-columns: 250px 1fr;
          gap: 30px;
        }
        
        .settings-sidebar {
          background: var(--bg-primary);
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          padding: 20px;
          box-shadow: var(--shadow-sm);
          height: fit-content;
        }
        
        .settings-nav {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: none;
          border: none;
          border-radius: 6px;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.95rem;
          font-weight: 500;
          text-align: left;
        }
        
        .nav-item:hover {
          background-color: #f3f4f6;
          color: #374151;
        }
        
        .nav-item.active {
          background-color: #eff6ff;
          color: #2563eb;
        }
        
        .settings-content {
          background: var(--bg-primary);
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          padding: 30px;
          box-shadow: var(--shadow-sm);
        }
        
        .settings-section {
          max-width: 600px;
        }
        
        .section-header {
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .section-header h2 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
        }
        
        .section-header p {
          color: #6b7280;
          margin: 0;
        }
        
        .settings-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .form-divider {
          display: flex;
          align-items: center;
          margin: 20px 0;
        }
        
        .form-divider::before,
        .form-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e5e7eb;
        }
        
        .form-divider span {
          padding: 0 15px;
          color: #6b7280;
          font-size: 0.9rem;
          font-weight: 500;
        }
        
        .form-text {
          color: #6b7280;
          font-size: 0.8rem;
          margin-top: 4px;
        }
        
        .password-input-container {
          position: relative;
        }
        
        .password-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #6b7280;
          padding: 4px;
          border-radius: 4px;
          transition: color 0.2s;
        }
        
        .password-toggle:hover {
          color: #374151;
        }
        
        .integrations-list {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        
        .integration-card {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
        }
        
        .integration-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }
        
        .integration-info h3 {
          margin: 0 0 4px 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: #374151;
        }
        
        .integration-info p {
          margin: 0;
          color: #6b7280;
          font-size: 0.9rem;
        }
        
        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
        }
        
        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        
        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #e5e7eb;
          transition: 0.4s;
          border-radius: 24px;
        }
        
        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.4s;
          border-radius: 50%;
        }
        
        input:checked + .toggle-slider {
          background-color: #2563eb;
        }
        
        input:checked + .toggle-slider:before {
          transform: translateX(20px);
        }
        
        .integration-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding-top: 16px;
          border-top: 1px solid #f3f4f6;
        }
        
        .integration-actions {
          display: flex;
          gap: 12px;
          margin-top: 8px;
        }
        
        .notification-settings {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        
        .notification-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }
        
        .notification-info h3 {
          margin: 0 0 4px 0;
          font-size: 1rem;
          font-weight: 600;
          color: #374151;
        }
        
        .notification-info p {
          margin: 0;
          color: #6b7280;
          font-size: 0.9rem;
        }
        
        .security-settings {
          display: flex;
          flex-direction: column;
          gap: 30px;
        }
        
        .security-item {
          padding: 20px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }
        
        .security-item h3 {
          margin: 0 0 16px 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: #374151;
        }
        
        .checkbox-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 12px;
        }
        
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
          color: #374151;
          cursor: pointer;
        }
        
        .checkbox-label input {
          margin: 0;
        }
        
        .spinning {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .appearance-settings {
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        .theme-setting {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border: 1px solid var(--border-primary);
          border-radius: 8px;
        }

        .setting-info h3 {
          margin: 0 0 4px 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .setting-info p {
          margin: 0;
          color: var(--text-secondary);
          font-size: 0.9rem;
        }

        .theme-options {
          display: flex;
          gap: 12px;
        }

        .theme-option {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 16px 20px;
          background: var(--bg-secondary);
          border: 2px solid var(--border-primary);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          min-width: 80px;
        }

        .theme-option:hover {
          border-color: var(--accent-primary);
        }

        .theme-option.active {
          background: var(--accent-primary);
          border-color: var(--accent-primary);
          color: white;
        }

        .theme-option span {
          font-size: 0.9rem;
          font-weight: 500;
        }

        .preview-section h3 {
          margin: 0 0 16px 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .theme-preview {
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          overflow: hidden;
          background: var(--bg-secondary);
        }

        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: var(--bg-primary);
          border-bottom: 1px solid var(--border-primary);
        }

        .preview-title {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .preview-actions {
          display: flex;
          gap: 6px;
        }

        .preview-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--text-tertiary);
        }

        .preview-content {
          display: flex;
          height: 120px;
        }

        .preview-sidebar {
          width: 60px;
          background: var(--bg-primary);
          border-right: 1px solid var(--border-primary);
          padding: 12px 8px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .preview-nav-item {
          height: 8px;
          border-radius: 4px;
          background: var(--text-tertiary);
        }

        .preview-nav-item.active {
          background: var(--accent-primary);
        }

        .preview-main {
          flex: 1;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .preview-card {
          height: 40px;
          background: var(--bg-primary);
          border: 1px solid var(--border-primary);
          border-radius: 4px;
        }

        .preview-cards {
          display: flex;
          gap: 8px;
          flex: 1;
        }

        .preview-small-card {
          flex: 1;
          background: var(--bg-primary);
          border: 1px solid var(--border-primary);
          border-radius: 4px;
        }
        
        @media (max-width: 768px) {
          .settings-container {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          
          .settings-sidebar {
            order: 2;
          }
          
          .settings-content {
            order: 1;
          }
          
          .settings-nav {
            flex-direction: row;
            overflow-x: auto;
            gap: 4px;
          }
          
          .nav-item {
            white-space: nowrap;
            min-width: auto;
          }
        }
      `}</style>
    </div>
  );
};

export default Settings;
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Bell, Settings, User, LogOut, Sun, Moon } from 'lucide-react';
import NotificationModal from '../Common/NotificationModal';

const Header = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <h1 className="header-logo">IT RND Dashboard</h1>
        </div>
        
        <div className="header-right">
          <div className="header-actions">
            <button
              onClick={toggleTheme}
              className="header-action-btn"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            
            <button 
              className="header-action-btn" 
              title="Notifications"
              onClick={() => setShowNotifications(true)}
            >
              <Bell size={20} />
              <span className="notification-badge">3</span>
            </button>
            
            <button 
              className="header-action-btn" 
              title="Settings"
              onClick={() => window.location.href = '/settings'}
            >
              <Settings size={20} />
            </button>
          </div>
          
          <div className="user-menu">
            <div className="user-info">
              <div className="user-avatar">
                <User size={20} />
              </div>
              <div className="user-details">
                <span className="user-name">{user?.username}</span>
                <span className="user-role">{user?.role}</span>
              </div>
            </div>
            
            <button 
              onClick={handleLogout}
              className="logout-btn"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      <NotificationModal 
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
      
      <style jsx>{`
        .header {
          background: white;
          border-bottom: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        
        .header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          height: 64px;
        }
        
        .header-left {
          display: flex;
          align-items: center;
        }
        
        .header-logo {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
        }
        
        .header-right {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        
        .header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .header-action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border: none;
          background: none;
          border-radius: 6px;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }
        
        .header-action-btn:hover {
          background-color: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .notification-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          background-color: #ef4444;
          color: white;
          font-size: 10px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 10px;
          min-width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .user-menu {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          border-radius: 8px;
          background-color: #f9fafb;
          border: 1px solid #e5e7eb;
        }
        
        .user-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background-color: #3b82f6;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .user-details {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }
        
        .user-name {
          font-size: 0.9rem;
          font-weight: 600;
          color: #1f2937;
          line-height: 1.2;
        }
        
        .user-role {
          font-size: 0.75rem;
          color: #6b7280;
          text-transform: capitalize;
          line-height: 1.2;
        }
        
        .logout-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: none;
          background: none;
          border-radius: 4px;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .logout-btn:hover {
          background-color: #fef2f2;
          color: #dc2626;
        }
        
        @media (max-width: 768px) {
          .header-content {
            padding: 0 16px;
          }
          
          .user-details {
            display: none;
          }
          
          .header-actions {
            gap: 4px;
          }
          
          .header-action-btn {
            width: 36px;
            height: 36px;
          }
        }
      `}</style>
    </header>
  );
};

export default Header;
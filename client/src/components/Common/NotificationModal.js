import React, { useState, useEffect } from 'react';
import { X, Bell, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';

const NotificationModal = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');

  // Mock notifications data
  const mockNotifications = [
    {
      id: 1,
      type: 'warning',
      title: 'High CPU Usage Detected',
      message: 'VDI "DEV-JOHN-001" has been running at 95% CPU for the last 30 minutes',
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      read: false,
      category: 'performance'
    },
    {
      id: 2,
      type: 'success',
      title: 'Capacity Recalculated',
      message: 'Production Cluster 01 capacity has been successfully recalculated',
      timestamp: new Date(Date.now() - 45 * 60 * 1000),
      read: true,
      category: 'system'
    },
    {
      id: 3,
      type: 'info',
      title: 'New Profile Generated',
      message: '2 automatic allocation profiles created for Testing Cluster 03',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      read: false,
      category: 'capacity'
    },
    {
      id: 4,
      type: 'error',
      title: 'Integration Error',
      message: 'vCenter connection failed for Production environment',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
      read: false,
      category: 'integration'
    },
    {
      id: 5,
      type: 'info',
      title: 'Memory Optimization Available',
      message: 'VDI "DEV-JANE-002" can reduce memory allocation by 4GB',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      read: true,
      category: 'optimization'
    }
  ];

  useEffect(() => {
    if (isOpen) {
      setNotifications(mockNotifications);
    }
  }, [isOpen]);

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} />;
      case 'warning':
        return <AlertTriangle size={20} />;
      case 'error':
        return <AlertCircle size={20} />;
      default:
        return <Info size={20} />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'success':
        return '#10b981';
      case 'warning':
        return '#f59e0b';
      case 'error':
        return '#ef4444';
      default:
        return '#3b82f6';
    }
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      return `${days}d ago`;
    }
  };

  const markAsRead = (id) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const deleteNotification = (id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread') return !notif.read;
    if (filter === 'read') return notif.read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!isOpen) return null;

  return (
    <div className="notification-modal-overlay">
      <div className="notification-modal">
        <div className="modal-header">
          <div className="header-left">
            <Bell size={20} />
            <h2>Notifications</h2>
            {unreadCount > 0 && (
              <span className="unread-badge">{unreadCount}</span>
            )}
          </div>
          <div className="header-actions">
            {unreadCount > 0 && (
              <button className="mark-all-read" onClick={markAllAsRead}>
                Mark all as read
              </button>
            )}
            <button className="close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="modal-filters">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({notifications.length})
          </button>
          <button 
            className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Unread ({unreadCount})
          </button>
          <button 
            className={`filter-btn ${filter === 'read' ? 'active' : ''}`}
            onClick={() => setFilter('read')}
          >
            Read ({notifications.length - unreadCount})
          </button>
        </div>

        <div className="modal-content">
          {filteredNotifications.length === 0 ? (
            <div className="empty-state">
              <Bell size={48} />
              <h3>No notifications</h3>
              <p>You're all caught up!</p>
            </div>
          ) : (
            <div className="notifications-list">
              {filteredNotifications.map(notification => (
                <div 
                  key={notification.id}
                  className={`notification-item ${!notification.read ? 'unread' : ''}`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="notification-icon" style={{ color: getTypeColor(notification.type) }}>
                    {getIcon(notification.type)}
                  </div>
                  <div className="notification-content">
                    <div className="notification-header">
                      <h4>{notification.title}</h4>
                      <span className="notification-time">{formatTime(notification.timestamp)}</span>
                    </div>
                    <p>{notification.message}</p>
                    <span className="notification-category">{notification.category}</span>
                  </div>
                  <div className="notification-actions">
                    {!notification.read && (
                      <div className="unread-indicator" />
                    )}
                    <button 
                      className="delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .notification-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease-out;
        }

        .notification-modal {
          background: var(--bg-primary);
          border-radius: 12px;
          box-shadow: var(--shadow-lg);
          width: 90vw;
          max-width: 600px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          animation: slideIn 0.3s ease-out;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-primary);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-left h2 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .unread-badge {
          background-color: #ef4444;
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .mark-all-read {
          background: none;
          border: none;
          color: var(--accent-primary);
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: background-color 0.2s;
        }

        .mark-all-read:hover {
          background-color: var(--bg-tertiary);
        }

        .close-btn {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .close-btn:hover {
          background-color: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .modal-filters {
          display: flex;
          gap: 4px;
          padding: 16px 24px 0;
          border-bottom: 1px solid var(--border-primary);
        }

        .filter-btn {
          background: none;
          border: none;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-btn:hover {
          background-color: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .filter-btn.active {
          background-color: var(--accent-primary);
          color: white;
        }

        .modal-content {
          flex: 1;
          overflow-y: auto;
          min-height: 300px;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: var(--text-secondary);
        }

        .empty-state h3 {
          margin: 16px 0 8px;
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .empty-state p {
          margin: 0;
          font-size: 0.9rem;
        }

        .notifications-list {
          padding: 16px 0;
        }

        .notification-item {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 16px 24px;
          cursor: pointer;
          transition: background-color 0.2s;
          border-left: 3px solid transparent;
        }

        .notification-item:hover {
          background-color: var(--bg-secondary);
        }

        .notification-item.unread {
          background-color: var(--bg-tertiary);
          border-left-color: var(--accent-primary);
        }

        .notification-icon {
          flex-shrink: 0;
          margin-top: 2px;
        }

        .notification-content {
          flex: 1;
          min-width: 0;
        }

        .notification-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 4px;
        }

        .notification-header h4 {
          margin: 0;
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.3;
        }

        .notification-time {
          flex-shrink: 0;
          font-size: 0.8rem;
          color: var(--text-tertiary);
        }

        .notification-content p {
          margin: 0 0 8px;
          font-size: 0.9rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .notification-category {
          display: inline-block;
          padding: 2px 8px;
          background-color: var(--bg-secondary);
          color: var(--text-secondary);
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: capitalize;
        }

        .notification-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .unread-indicator {
          width: 8px;
          height: 8px;
          background-color: var(--accent-primary);
          border-radius: 50%;
        }

        .delete-btn {
          background: none;
          border: none;
          color: var(--text-tertiary);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          opacity: 0;
          transition: all 0.2s;
        }

        .notification-item:hover .delete-btn {
          opacity: 1;
        }

        .delete-btn:hover {
          background-color: var(--bg-secondary);
          color: var(--error);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideIn {
          from { 
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (max-width: 768px) {
          .notification-modal {
            width: 95vw;
            max-height: 90vh;
          }

          .modal-header {
            padding: 16px 20px;
          }

          .modal-filters {
            padding: 12px 20px 0;
          }

          .notification-item {
            padding: 12px 20px;
          }

          .notification-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }

          .notification-time {
            align-self: flex-end;
          }
        }
      `}</style>
    </div>
  );
};

export default NotificationModal;
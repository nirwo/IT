import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  Monitor, 
  Layers, 
  BarChart3, 
  Settings, 
  Users,
  Database,
  Activity
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = () => {
  const { hasPermission } = useAuth();

  const navItems = [
    {
      path: '/',
      icon: Home,
      label: 'Dashboard',
      permission: 'read'
    },
    {
      path: '/vdi',
      icon: Monitor,
      label: 'VDI Management',
      permission: 'read'
    },
    {
      path: '/profiles',
      icon: Layers,
      label: 'Profiles',
      permission: 'read'
    },
    {
      path: '/analytics',
      icon: BarChart3,
      label: 'Analytics',
      permission: 'read'
    },
    {
      path: '/settings',
      icon: Settings,
      label: 'Settings',
      permission: 'admin'
    }
  ];

  const filteredNavItems = navItems.filter(item => 
    hasPermission(item.permission)
  );

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <ul className="nav-list">
          {filteredNavItems.map(item => {
            const Icon = item.icon;
            return (
              <li key={item.path} className="nav-item">
                <NavLink
                  to={item.path}
                  className={({ isActive }) => 
                    `nav-link ${isActive ? 'active' : ''}`
                  }
                  end={item.path === '/'}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <style jsx>{`
        .sidebar {
          width: 260px;
          background: white;
          border-right: 1px solid #e5e7eb;
          box-shadow: 1px 0 3px rgba(0, 0, 0, 0.05);
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 64px;
          height: calc(100vh - 64px);
          overflow-y: auto;
        }
        
        .sidebar-nav {
          flex: 1;
          padding: 24px 0;
        }
        
        .nav-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .nav-item {
          margin-bottom: 4px;
        }
        
        .nav-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 24px;
          color: #6b7280;
          text-decoration: none;
          font-weight: 500;
          transition: all 0.2s;
          border-radius: 0;
          position: relative;
        }
        
        .nav-link:hover {
          background-color: #f3f4f6;
          color: #374151;
        }
        
        .nav-link.active {
          background-color: #eff6ff;
          color: #2563eb;
          border-right: 3px solid #2563eb;
        }
        
        .nav-link.active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background-color: #2563eb;
        }
        
        @media (max-width: 1024px) {
          .sidebar {
            width: 80px;
          }
          
          .nav-link span {
            display: none;
          }
          
          .nav-link {
            justify-content: center;
            padding: 16px 12px;
          }
        }
        
        @media (max-width: 768px) {
          .sidebar {
            display: none;
          }
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
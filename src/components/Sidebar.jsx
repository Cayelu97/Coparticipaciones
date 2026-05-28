import React from 'react';
import { 
  LayoutDashboard, 
  FileSpreadsheet, 
  Users, 
  History, 
  Settings, 
  Activity,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, isCollapsed, setIsCollapsed }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'processor', label: 'Procesar Archivo', icon: FileSpreadsheet },
    { id: 'providers', label: 'Prestadores', icon: Users },
    { id: 'history', label: 'Historial', icon: History },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Activity size={28} className="logo-icon" />
        {!isCollapsed && <span className="logo-text">Sanatorio Mayo</span>}
        <button 
          className="sidebar-toggle-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expandir menú" : "Colapsar menú"}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
      
      <nav style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <ul className="sidebar-menu">
          {menuItems.map(item => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <a 
                  className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(item.id)}
                  title={isCollapsed ? item.label : ''}
                >
                  <Icon size={20} />
                  {!isCollapsed && <span>{item.label}</span>}
                </a>
              </li>
            );
          })}
        </ul>

        <div className="sidebar-footer">
          <a 
            className={`sidebar-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
            title={isCollapsed ? 'Configuración' : ''}
          >
            <Settings size={20} />
            {!isCollapsed && <span>Configuración</span>}
          </a>
          {!isCollapsed && (
            <div className="sidebar-version" style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              v1.0.0 (Local Storage)
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;

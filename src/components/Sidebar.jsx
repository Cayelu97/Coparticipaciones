import React from 'react';
import { 
  LayoutDashboard, 
  FileSpreadsheet, 
  Users, 
  History, 
  Settings, 
  Activity,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { supabase } from '../services/db';

const Sidebar = ({ activeTab, setActiveTab, isCollapsed, setIsCollapsed, role = 'admin', hasSupabase = false }) => {
  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'processor', label: 'Procesar Archivo', icon: FileSpreadsheet },
    { id: 'providers', label: 'Prestadores', icon: Users },
    { id: 'history', label: 'Historial', icon: History },
  ];

  // Filter menu items based on role
  const menuItems = role === 'reader' 
    ? allMenuItems.filter(item => ['dashboard', 'history'].includes(item.id))
    : allMenuItems;

  const handleLogout = async () => {
    if (hasSupabase) {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      } catch (err) {
        console.error('Error al cerrar sesión:', err);
        alert('Error al cerrar sesión: ' + err.message);
      }
    }
  };

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
      
      <nav style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 70px)' }}>
        <ul className="sidebar-menu" style={{ flex: 1 }}>
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

        <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {role === 'admin' && (
            <a 
              className={`sidebar-item ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
              title={isCollapsed ? 'Configuración' : ''}
            >
              <Settings size={20} />
              {!isCollapsed && <span>Configuración</span>}
            </a>
          )}

          {hasSupabase && (
            <a 
              className="sidebar-item"
              onClick={handleLogout}
              title={isCollapsed ? 'Cerrar Sesión' : ''}
              style={{ color: 'var(--danger)', cursor: 'pointer' }}
            >
              <LogOut size={20} />
              {!isCollapsed && <span>Cerrar Sesión</span>}
            </a>
          )}

          {!isCollapsed && (
            <div className="sidebar-version" style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              v1.0.0 ({hasSupabase ? 'Supabase Nube' : 'Local Storage'})
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;

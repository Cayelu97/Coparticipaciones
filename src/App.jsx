import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import FileProcessor from './components/FileProcessor';
import ProvidersConfig from './components/ProvidersConfig';
import HistoryList from './components/HistoryList';
import SettingsConfig from './components/SettingsConfig';
import Login from './components/Login';
import { dbService, hasSupabase, supabase } from './services/db';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [providers, setProviders] = useState([]);
  const [settings, setSettings] = useState({});
  const [history, setHistory] = useState([]);
  
  // Auth state
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(hasSupabase);

  // State for loading a preview from history
  const [preloadedHistoryItem, setPreloadedHistoryItem] = useState(null);

  // Monitor Auth State
  useEffect(() => {
    if (!hasSupabase) {
      setAuthLoading(false);
      return;
    }

    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Load initial data asynchronously once authenticated or if local
  useEffect(() => {
    if (authLoading || (hasSupabase && !user)) return;

    const loadInitialData = async () => {
      try {
        const loadedProviders = await dbService.getProviders();
        const loadedSettings = await dbService.getSettings();
        const loadedHistory = await dbService.getHistory();
        
        setProviders(loadedProviders);
        setSettings(loadedSettings);
        setHistory(loadedHistory);
      } catch (err) {
        console.error('Error cargando los datos iniciales:', err);
      }
    };
    loadInitialData();
  }, [authLoading, user]);

  const [userRoles, setUserRoles] = useState([]);

  useEffect(() => {
    if (settings && settings.multipliers) {
      setUserRoles(settings.multipliers.user_roles || [
        { email: 'aye.victoria.lopez2@gmail.com', role: 'admin' },
        { email: 'aye.victoria.lopez@gmail.com', role: 'admin' }
      ]);
    }
  }, [settings]);

  const cleanEmail = user?.email?.toLowerCase().trim();
  const matchedUser = userRoles.find(u => u.email?.toLowerCase().trim() === cleanEmail);
  const isAdminEmail = cleanEmail === 'aye.victoria.lopez2@gmail.com' || cleanEmail === 'aye.victoria.lopez@gmail.com';
  const role = !hasSupabase ? 'admin' : ((matchedUser?.role === 'admin' || isAdminEmail) ? 'admin' : 'reader');

  // Restrict reader to dashboard and history
  useEffect(() => {
    if (role === 'reader' && !['dashboard', 'history'].includes(activeTab)) {
      // If reader clicks on a restricted view or it tries to load, fall back to dashboard
      setActiveTab('dashboard');
    }
  }, [role, activeTab]);

  const handleUpdateProviders = (newProviders) => {
    setProviders(newProviders);
  };

  const handleUpdateSettings = (newSettings) => {
    setSettings(newSettings);
  };

  const handleRefreshHistory = async () => {
    const loadedHistory = await dbService.getHistory();
    setHistory(loadedHistory);
  };

  const handleDeleteHistoryItem = (id) => {
    setHistory(history.filter(h => h.id !== id));
  };

  const handleSelectHistoryItem = (item) => {
    // Save item details in a temporary state
    setPreloadedHistoryItem(item);
    // Switch to FileProcessor page where we will display the preview
    setActiveTab('processor');
  };

  // Render the active tab view component
  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            history={history} 
            providers={providers}
            onNavigate={setActiveTab}
            readOnly={role === 'reader'}
          />
        );
      
      case 'processor':
        // If we navigated here from the history preview click, we can pre-load results
        return (
          <FileProcessorWrapper 
            providers={providers}
            settings={settings}
            onSaveSuccess={handleRefreshHistory}
            preloadedItem={preloadedHistoryItem}
            clearPreloadedItem={() => setPreloadedHistoryItem(null)}
            history={history}
            onNavigate={setActiveTab}
            readOnly={role === 'reader'}
          />
        );
      
      case 'history':
        return (
          <HistoryList 
            history={history} 
            onSelectHistoryItem={handleSelectHistoryItem}
            onDeleteHistoryItem={handleDeleteHistoryItem}
            readOnly={role === 'reader'}
          />
        );
      
      case 'settings':
        return (
          <SettingsConfig 
            settings={settings} 
            onUpdateSettings={handleUpdateSettings}
            providers={providers}
            onUpdateProviders={handleUpdateProviders}
          />
        );

      default:
        return (
          <Dashboard 
            history={history} 
            providers={providers} 
            onNavigate={setActiveTab} 
            readOnly={role === 'reader'}
          />
        );
    }
  };

  const [isCollapsed, setIsCollapsed] = useState(false);

  if (authLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        width: '100vw',
        background: '#0d0e12',
        color: 'var(--text-primary)',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid rgba(139, 92, 246, 0.1)',
            borderTop: '4px solid var(--primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <span>Cargando aplicación...</span>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (hasSupabase && !user) {
    return <Login />;
  }

  return (
    <div className={`app-container ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isCollapsed={isCollapsed} 
        setIsCollapsed={setIsCollapsed} 
        role={role}
        hasSupabase={hasSupabase}
        userEmail={user?.email}
      />
      <main className="main-content">
        {renderActiveView()}
      </main>
    </div>
  );
}

/**
 * Un componente wrapper para FileProcessor que ayuda a inyectar resultados 
 * precalculados si el usuario hace clic en "Ver Preview" en el historial.
 */
const FileProcessorWrapper = ({ 
  providers, 
  settings, 
  onSaveSuccess, 
  preloadedItem, 
  clearPreloadedItem,
  history,
  onNavigate,
  readOnly = false
}) => {
  const [componentKey, setComponentKey] = useState(0);

  // Si hay un item precargado, necesitamos inicializar el FileProcessor con ese estado
  const [initialStateCalculated, setInitialStateCalculated] = useState(preloadedItem);

  useEffect(() => {
    if (preloadedItem) {
      setInitialStateCalculated(preloadedItem);
      clearPreloadedItem();
      // Forzar remonte para limpiar estados viejos
      setComponentKey(prev => prev + 1);
    }
  }, [preloadedItem]);

  return (
    <FileProcessorWithPreload 
      key={componentKey}
      providers={providers}
      settings={settings}
      onSaveSuccess={onSaveSuccess}
      preloadedData={initialStateCalculated}
      history={history}
      onNavigate={onNavigate}
      readOnly={readOnly}
    />
  );
};

// Componente secundario que extiende FileProcessor para soportar precarga del historial
const FileProcessorWithPreload = ({ providers, settings, onSaveSuccess, preloadedData, history, onNavigate, readOnly }) => {
  const [initData, setInitData] = React.useState(preloadedData);

  return (
    <FileProcessorProxy 
      providers={providers}
      settings={settings}
      onSaveSuccess={onSaveSuccess}
      initialCalculation={initData}
      history={history}
      onNavigate={onNavigate}
      readOnly={readOnly}
    />
  );
};

// Proxy para inyectar initialCalculation al FileProcessor
const FileProcessorProxy = ({ providers, settings, onSaveSuccess, initialCalculation, history, onNavigate, readOnly }) => {
  return (
    <FileProcessorInstance 
      providers={providers}
      settings={settings}
      onSaveSuccess={onSaveSuccess}
      initialCalculation={initialCalculation}
      history={history}
      onNavigate={onNavigate}
      readOnly={readOnly}
    />
  );
};

// Instancia final que enlaza la prop initialCalculation
const FileProcessorInstance = ({ providers, settings, onSaveSuccess, initialCalculation, history, onNavigate, readOnly }) => {
  return (
    <FileProcessor 
      providers={providers}
      settings={settings}
      onSaveSuccess={onSaveSuccess}
      initialCalculation={initialCalculation}
      history={history}
      onNavigate={onNavigate}
      readOnly={readOnly}
    />
  );
};

export default App;

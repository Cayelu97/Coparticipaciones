import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import FileProcessor from './components/FileProcessor';
import ProvidersConfig from './components/ProvidersConfig';
import HistoryList from './components/HistoryList';
import SettingsConfig from './components/SettingsConfig';
import { dbService } from './services/db';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [providers, setProviders] = useState([]);
  const [settings, setSettings] = useState({});
  const [history, setHistory] = useState([]);
  
  // State for loading a preview from history
  const [preloadedHistoryItem, setPreloadedHistoryItem] = useState(null);

  // Load initial data asynchronously
  useEffect(() => {
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
  }, []);

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
          />
        );
      
      case 'providers':
        return (
          <ProvidersConfig 
            providers={providers} 
            onUpdateProviders={handleUpdateProviders}
          />
        );
      
      case 'history':
        return (
          <HistoryList 
            history={history} 
            onSelectHistoryItem={handleSelectHistoryItem}
            onDeleteHistoryItem={handleDeleteHistoryItem}
          />
        );
      
      case 'settings':
        return (
          <SettingsConfig 
            settings={settings} 
            onUpdateSettings={handleUpdateSettings}
          />
        );

      default:
        return <Dashboard history={history} providers={providers} onNavigate={setActiveTab} />;
    }
  };

  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={`app-container ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isCollapsed={isCollapsed} 
        setIsCollapsed={setIsCollapsed} 
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
  onNavigate
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
    />
  );
};

// Componente secundario que extiende FileProcessor para soportar precarga del historial
const FileProcessorWithPreload = ({ providers, settings, onSaveSuccess, preloadedData, history, onNavigate }) => {
  const [initData, setInitData] = React.useState(preloadedData);

  return (
    <FileProcessorProxy 
      providers={providers}
      settings={settings}
      onSaveSuccess={onSaveSuccess}
      initialCalculation={initData}
      history={history}
      onNavigate={onNavigate}
    />
  );
};

// Proxy para inyectar initialCalculation al FileProcessor
const FileProcessorProxy = ({ providers, settings, onSaveSuccess, initialCalculation, history, onNavigate }) => {
  return (
    <FileProcessorInstance 
      providers={providers}
      settings={settings}
      onSaveSuccess={onSaveSuccess}
      initialCalculation={initialCalculation}
      history={history}
      onNavigate={onNavigate}
    />
  );
};

// Instancia final que enlaza la prop initialCalculation
const FileProcessorInstance = ({ providers, settings, onSaveSuccess, initialCalculation, history, onNavigate }) => {
  return (
    <FileProcessor 
      providers={providers}
      settings={settings}
      onSaveSuccess={onSaveSuccess}
      initialCalculation={initialCalculation}
      history={history}
      onNavigate={onNavigate}
    />
  );
};

export default App;

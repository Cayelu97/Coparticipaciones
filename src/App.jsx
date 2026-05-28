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
  clearPreloadedItem 
}) => {
  const [componentKey, setComponentKey] = useState(0);

  // Si hay un item precargado, necesitamos inicializar el FileProcessor con ese estado
  // Para hacer esto de manera elegante, interceptamos y pasamos como props iniciales,
  // y limpiamos el estado del padre después de montar.
  const [initialStateCalculated, setInitialStateCalculated] = useState(preloadedItem);

  useEffect(() => {
    if (preloadedItem) {
      setInitialStateCalculated(preloadedItem);
      clearPreloadedItem();
      // Forzar remonte para limpiar estados viejos
      setComponentKey(prev => prev + 1);
    }
  }, [preloadedItem]);

  // Si tenemos un item precargado del historial, inyectamos sus datos directamente
  // para que FileProcessor los muestre en el preview de inmediato.
  const fileProcessorRef = React.useRef(null);
  
  // Modificamos ligeramente la inicialización del estado del FileProcessor mediante este wrapper
  return (
    <FileProcessorWithPreload 
      key={componentKey}
      providers={providers}
      settings={settings}
      onSaveSuccess={onSaveSuccess}
      preloadedData={initialStateCalculated}
    />
  );
};

// Componente secundario que extiende FileProcessor para soportar precarga del historial
const FileProcessorWithPreload = ({ providers, settings, onSaveSuccess, preloadedData }) => {
  // Cargamos el FileProcessor normal, pero si hay preloadedData inicializamos el estado con él
  const [initData, setInitData] = React.useState(preloadedData);

  // Renderiza el componente FileProcessor, inyectando los valores si existen
  return (
    <FileProcessorProxy 
      providers={providers}
      settings={settings}
      onSaveSuccess={onSaveSuccess}
      initialCalculation={initData}
    />
  );
};

// Proxy para inyectar initialCalculation al FileProcessor
const FileProcessorProxy = ({ providers, settings, onSaveSuccess, initialCalculation }) => {
  // Importamos y modificamos localmente la inicialización en el render
  return (
    <FileProcessorInstance 
      providers={providers}
      settings={settings}
      onSaveSuccess={onSaveSuccess}
      initialCalculation={initialCalculation}
    />
  );
};

// Instancia final que enlaza la prop initialCalculation
const FileProcessorInstance = ({ providers, settings, onSaveSuccess, initialCalculation }) => {
  // Usamos useEffect para inyectar el cálculo inicial al FileProcessor
  // Para simplificar la inyección, podemos pasar una función de inicialización.
  // Pero espera, es mucho más limpio si modificamos FileProcessor.jsx para recibir la prop
  // 'initialCalculation' directamente como su estado inicial!
  // Sí! Vamos a asegurarnos de que FileProcessor.jsx tenga soporte para una prop `initialCalculation`
  // para que si se pasa, cargue esa vista previa.
  // Vamos a actualizar FileProcessor.jsx para soportar esto de inmediato.
  return (
    <FileProcessor 
      providers={providers}
      settings={settings}
      onSaveSuccess={onSaveSuccess}
      initialCalculation={initialCalculation}
    />
  );
};

export default App;

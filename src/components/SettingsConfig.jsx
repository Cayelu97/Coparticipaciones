import React, { useState } from 'react';
import { Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { dbService } from '../services/db';

const SettingsConfig = ({ settings = {}, onUpdateSettings }) => {
  const [aprossTariff, setAprossTariff] = useState(settings.tariffs?.apross || 12000);
  const [horizonteTariff, setHorizonteTariff] = useState(settings.tariffs?.horizonte || 14606);
  const [redTariff, setRedTariff] = useState(settings.tariffs?.redPrestacional || 17300);
  const [aprossMult, setAprossMult] = useState(settings.multipliers?.apross || 0.96);
  const [success, setSuccess] = useState('');

  const handleSave = async () => {
    const newSettings = {
      tariffs: {
        apross: parseFloat(aprossTariff) || 0,
        horizonte: parseFloat(horizonteTariff) || 0,
        redPrestacional: parseFloat(redTariff) || 0
      },
      multipliers: {
        apross: parseFloat(aprossMult) || 0
      }
    };

    const saved = await dbService.saveSettings(newSettings);
    if (saved) {
      onUpdateSettings(newSettings);
      setSuccess('Configuraciones y tarifas guardadas con éxito.');
      setTimeout(() => setSuccess(''), 4000);
    } else {
      alert('Error al intentar guardar las configuraciones.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1>Configuración de Tarifas</h1>
        <p>Ajuste los valores de tarifas fijas para prácticas de prestadores directos y otros coeficientes del sistema.</p>
      </div>

      {success && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--success)', padding: '1rem', background: 'var(--success-bg)', borderRadius: '10px' }}>
          <CheckCircle2 size={20} />
          <span>{success}</span>
        </div>
      )}

      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px' }}>
        <h2>Tarifas de Consultas Directas</h2>
        <p style={{ fontSize: '0.875rem' }}>Estos valores se multiplican por la cantidad de consultas directas (código 420101) registradas para cada profesional.</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
          <div className="input-group">
            <label>Tarifa APROSS (1)</label>
            <input 
              type="number" 
              value={aprossTariff} 
              onChange={(e) => setAprossTariff(e.target.value)} 
            />
          </div>

          <div className="input-group">
            <label>Multiplicador Coeficiente APROSS (96%)</label>
            <input 
              type="number" 
              step="0.01"
              value={aprossMult} 
              onChange={(e) => setAprossMult(e.target.value)} 
            />
          </div>

          <div className="input-group">
            <label>Tarifa Coop. Horizonte (21)</label>
            <input 
              type="number" 
              value={horizonteTariff} 
              onChange={(e) => setHorizonteTariff(e.target.value)} 
            />
          </div>

          <div className="input-group">
            <label>Tarifa Red Prestacional (78) / ARTs</label>
            <input 
              type="number" 
              value={redTariff} 
              onChange={(e) => setRedTariff(e.target.value)} 
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
          <button className="btn btn-primary" onClick={handleSave}>
            <Save size={16} />
            Guardar Tarifas
          </button>
        </div>
      </div>

      <div className="glass-card" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', maxWidth: '600px', background: 'rgba(59,130,246,0.05)', borderColor: 'rgba(59,130,246,0.2)' }}>
        <AlertCircle size={24} style={{ color: 'var(--info)' }} />
        <div>
          <h3 style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>Soporte de Fórmulas Dinámicas</h3>
          <p style={{ fontSize: '0.875rem', marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
            Cuando descarga la planilla Excel, las tarifas configuradas aquí se inyectarán como valores fijos, permitiendo que las celdas de liquidación (ej. =H4*0.96 o =L4*$D$4) funcionen dinámicamente con los nuevos importes dentro de Microsoft Excel.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsConfig;

import React, { useState } from 'react';
import { 
  Download, 
  Trash2, 
  Calendar, 
  FileText, 
  Search,
  Eye
} from 'lucide-react';
import { exportToExcel } from '../services/excelExporter';
import { dbService } from '../services/db';

const HistoryList = ({ history = [], onSelectHistoryItem, onDeleteHistoryItem, readOnly = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingId, setLoadingId] = useState('');

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const handleDownload = async (item) => {
    try {
      setLoadingId(item.id);
      const blob = await exportToExcel(item.rows, item.month, item.year);
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `COPARTICIPACION_${item.year}_${String(item.month).padStart(2, '0')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert(`Error al generar el archivo Excel: ${err.message}`);
    } finally {
      loadingId && setLoadingId('');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro de que desea eliminar este registro del historial? Esta acción no se puede deshacer.')) {
      const success = await dbService.deleteHistoryItem(id);
      if (success) {
        onDeleteHistoryItem(id);
      } else {
        alert('Error al intentar eliminar el registro.');
      }
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatDate = (isoString) => {
    const d = new Date(isoString);
    return `${d.toLocaleDateString('es-AR')} a las ${d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}hs`;
  };

  const filteredHistory = history.filter(item => {
    const name = `${monthNames[item.month - 1]} ${item.year}`.toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1>Historial de Liquidaciones</h1>
        <p>Acceda a los meses calculados previamente, visualice sus planillas en pantalla o vuelva a descargar los reportes en Excel.</p>
      </div>

      {/* Search Bar */}
      <div className="glass-card">
        <div className="search-bar" style={{ maxWidth: '400px' }}>
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Buscar por mes o año (ej: Marzo 2026)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* History Grid */}
      {filteredHistory.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {filteredHistory.map(item => (
            <div key={item.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <Calendar size={24} style={{ color: 'var(--primary)' }} />
                  <div>
                    <h3 style={{ textTransform: 'capitalize' }}>
                      {monthNames[item.month - 1]} {item.year}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Procesado: {formatDate(item.timestamp)}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem 0', borderTop: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Atenciones:</span>
                  <span style={{ fontWeight: '600' }}>{item.totalRowsCount.toLocaleString('es-AR')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Total Coseguros:</span>
                  <span style={{ fontWeight: '600' }}>{formatCurrency(item.totals.col_e)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Pago Liquidado:</span>
                  <span style={{ fontWeight: '600', color: 'var(--primary)' }}>{formatCurrency(item.totals.col_t)}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: readOnly ? '1fr 1fr' : '1fr 1fr 40px', gap: '0.5rem', marginTop: 'auto' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => onSelectHistoryItem(item)}
                  style={{ padding: '0.5rem' }}
                >
                  <Eye size={14} />
                  Ver Preview
                </button>
                
                <button 
                  className="btn btn-primary" 
                  onClick={() => handleDownload(item)}
                  disabled={loadingId === item.id}
                  style={{ padding: '0.5rem' }}
                >
                  <Download size={14} />
                  {loadingId === item.id ? 'Generando...' : 'Descargar'}
                </button>
                
                {!readOnly && (
                  <button 
                    className="btn btn-danger" 
                    onClick={() => handleDelete(item.id)}
                    style={{ padding: '0.5rem' }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card" style={{ padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
          <FileText size={64} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
          <div>
            <h2>No se encontraron registros</h2>
            <p style={{ marginTop: '0.5rem' }}>Aún no has guardado ninguna liquidación en el historial o ninguna coincide con tu criterio de búsqueda.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryList;

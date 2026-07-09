import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Undo2, 
  Save, 
  X, 
  AlertCircle 
} from 'lucide-react';
import { dbService } from '../services/db';

// Helper to translate Excel formulas into descriptive business names
const translateExcelFormula = (formulaStr, rowNum) => {
  if (!formulaStr) return '';
  let translated = formulaStr;

  const columnsMap = {
    E: 'Tot. Valorizado',
    D: '% Copart.',
    F: 'Coseguros',
    G: 'APROSS Cant.',
    I: 'APROSS Valor',
    J: 'APROSS Copart.',
    K: 'Horizonte Cant.',
    L: 'Horizonte Valor',
    M: 'Horizonte Copart.',
    N: 'Red Cant.',
    O: 'Red Valor',
    P: 'Red Copart.',
    Q: 'Subtotal Copart',
    S: 'Subtotal Especial',
    T: 'Pago Final'
  };

  const absoluteMap = {
    '\\$H\\$3': 'Tarifa APROSS',
    '\\$J\\$3': 'Multiplicador APROSS',
    '\\$K\\$3': 'Tarifa Horizonte',
    '\\$N\\$3': 'Tarifa Red'
  };

  // Replace absolute cells
  Object.entries(absoluteMap).forEach(([pattern, friendlyName]) => {
    const regex = new RegExp(pattern, 'gi');
    translated = translated.replace(regex, `[${friendlyName}]`);
  });

  // Match cell references like D65, $D$65, E4, etc.
  const cellRegex = /(\$?[A-Z]\$?)(\d+)/gi;
  translated = translated.replace(cellRegex, (match, colPart, rowPart) => {
    const cleanCol = colPart.replace(/\$/g, '').toUpperCase();
    const colName = columnsMap[cleanCol] || cleanCol;
    const targetRow = parseInt(rowPart, 10);
    
    if (targetRow === rowNum) {
      return `[${colName}]`;
    } else {
      return `[${colName}] (Fila ${targetRow})`;
    }
  });

  return translated;
};

// Componente interactivo para crear o editar fórmulas con ayuda visual
const FormulaInput = ({ label, value, onChange, placeholder, row }) => {
  const [showHelper, setShowHelper] = useState(false);

  const insertVariable = (token) => {
    onChange(value + token);
  };

  const columns = [
    { label: 'Tot. Valorizado', code: `E${row}` },
    { label: '% Copart.', code: `D${row}` },
    { label: 'Coseguros', code: `F${row}` },
    { label: 'APROSS Cant.', code: `G${row}` },
    { label: 'APROSS Valor', code: `I${row}` },
    { label: 'APROSS Cop.', code: `J${row}` },
    { label: 'Horiz. Cant.', code: `K${row}` },
    { label: 'Horiz. Valor', code: `L${row}` },
    { label: 'Horiz. Cop.', code: `M${row}` },
    { label: 'Red Cant.', code: `N${row}` },
    { label: 'Red Valor', code: `O${row}` },
    { label: 'Red Cop.', code: `P${row}` },
    { label: 'Subtotal Cop.', code: `Q${row}` },
    { label: 'Pago Final', code: `T${row}` },
    { label: 'Tarifa APROSS', code: '$H$3' },
    { label: 'Tarifa Horizonte', code: '$K$3' },
    { label: 'Tarifa Red', code: '$N$3' }
  ];

  const operators = ['+', '-', '*', '/', '(', ')'];

  const translation = translateExcelFormula(value, row);

  return (
    <div className="input-group" style={{ marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>{label}</label>
        <button 
          type="button" 
          onClick={() => setShowHelper(!showHelper)}
          style={{
            fontSize: '0.75rem',
            background: 'none',
            border: 'none',
            color: 'var(--primary)',
            cursor: 'pointer',
            padding: 0,
            textDecoration: 'underline'
          }}
        >
          {showHelper ? 'Ocultar Asistente' : 'Mostrar Asistente de Fórmulas'}
        </button>
      </div>

      <input 
        type="text" 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}
      />

      {translation && (
        <div style={{ 
          fontSize: '0.75rem', 
          color: 'var(--success)', 
          marginTop: '0.25rem', 
          background: 'rgba(16,185,129,0.04)', 
          padding: '0.35rem 0.5rem', 
          borderRadius: '4px',
          borderLeft: '2px solid var(--success)',
          fontStyle: 'italic'
        }}>
          <strong>Equivale a:</strong> {translation}
        </div>
      )}

      {showHelper && (
        <div style={{ 
          marginTop: '0.5rem', 
          padding: '0.75rem', 
          background: 'rgba(255,255,255,0.02)', 
          border: '1px solid var(--border-light)', 
          borderRadius: '6px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', width: '100%' }}>Operadores:</span>
            {operators.map(op => (
              <button
                key={op}
                type="button"
                onClick={() => insertVariable(op)}
                className="btn btn-secondary"
                style={{ padding: '0.15rem 0.4rem', fontSize: '0.75rem' }}
              >
                {op}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', width: '100%' }}>Variables de Fila (Fila {row}):</span>
            {columns.map(col => (
              <button
                key={col.label}
                type="button"
                onClick={() => insertVariable(col.code)}
                className="btn btn-secondary"
                style={{ padding: '0.15rem 0.4rem', fontSize: '0.75rem', border: '1px solid rgba(139,92,246,0.15)', textTransform: 'none' }}
              >
                {col.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ProvidersConfig = ({ providers = [], onUpdateProviders }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterService, setFilterService] = useState('ALL');
  const [editingProvider, setEditingProvider] = useState(null); // Provider object being edited
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProvider, setNewProvider] = useState({
    prof: '',
    mat: '',
    service: '',
    pct_copart: 0.35,
    pct_dist: '',
    raw_services_str: '',
    rule: '',
    formula_f: '',
    formula_j: '',
    formula_m: '',
    formula_p: '',
    formula_q: '',
    formula_s: '',
    formula_t: ''
  });
  const [success, setSuccess] = useState('');

  // Extract unique services for the filter dropdown
  const uniqueServices = Array.from(
    new Set(providers.map(p => p.service).filter(Boolean))
  ).sort();

  const handleOpenAddModal = () => {
    const nextRow = Math.max(...providers.map(p => p.row), 0) + 1;
    setNewProvider({
      prof: '',
      mat: '',
      service: '',
      pct_copart: 0.35,
      pct_dist: '',
      raw_services_str: '',
      rule: '',
      formula_f: `=E${nextRow}*D${nextRow}`,
      formula_j: `=I${nextRow}*D${nextRow}`,
      formula_m: `=L${nextRow}*D${nextRow}`,
      formula_p: `=O${nextRow}*D${nextRow}`,
      formula_q: `=F${nextRow}+J${nextRow}+M${nextRow}+P${nextRow}`,
      formula_s: '',
      formula_t: `=Q${nextRow}`
    });
    setIsAddModalOpen(true);
  };

  const handleEditClick = (p) => {
    setEditingProvider({
      ...p,
      raw_services_str: p.raw_services ? p.raw_services.join(', ') : '',
      formula_f: p.formulas?.col_f || '',
      formula_j: p.formulas?.col_j || '',
      formula_m: p.formulas?.col_m || '',
      formula_p: p.formulas?.col_p || '',
      formula_q: p.formulas?.col_q || '',
      formula_s: p.formulas?.col_s || '',
      formula_t: p.formulas?.col_t || ''
    });
  };

  const handleEditSave = async () => {
    if (!editingProvider) return;
    
    // Parse raw services string back to array
    const rawServicesArr = editingProvider.raw_services_str
      ? editingProvider.raw_services_str.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    const updated = providers.map(p => {
      if (p.row === editingProvider.row) {
        return {
          ...p,
          prof: editingProvider.prof,
          mat: editingProvider.mat ? (isNaN(Number(editingProvider.mat)) ? editingProvider.mat : Number(editingProvider.mat)) : null,
          service: editingProvider.service,
          pct_copart: editingProvider.pct_copart !== '' ? parseFloat(editingProvider.pct_copart) : null,
          pct_dist: editingProvider.pct_dist !== '' ? parseFloat(editingProvider.pct_dist) : null,
          raw_services: rawServicesArr,
          rule: editingProvider.rule || null,
          formulas: {
            col_f: editingProvider.formula_f ? editingProvider.formula_f.trim() : null,
            col_j: editingProvider.formula_j ? editingProvider.formula_j.trim() : null,
            col_m: editingProvider.formula_m ? editingProvider.formula_m.trim() : null,
            col_p: editingProvider.formula_p ? editingProvider.formula_p.trim() : null,
            col_q: editingProvider.formula_q ? editingProvider.formula_q.trim() : null,
            col_s: editingProvider.formula_s ? editingProvider.formula_s.trim() : null,
            col_t: editingProvider.formula_t ? editingProvider.formula_t.trim() : null
          }
        };
      }
      return p;
    });

    await dbService.saveProviders(updated);
    onUpdateProviders(updated);
    setEditingProvider(null);
    showSuccess('Profesional actualizado con éxito.');
  };

  const handleAddSave = async () => {
    // Generate new row index (highest row + 1)
    const nextRow = Math.max(...providers.map(p => p.row), 0) + 1;
    
    const rawServicesArr = newProvider.raw_services_str
      ? newProvider.raw_services_str.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    const providerToAdd = {
      row: nextRow,
      prof: newProvider.prof,
      mat: newProvider.mat ? (isNaN(Number(newProvider.mat)) ? newProvider.mat : Number(newProvider.mat)) : null,
      service: newProvider.service,
      pct_copart: newProvider.pct_copart !== '' ? parseFloat(newProvider.pct_copart) : null,
      pct_dist: newProvider.pct_dist !== '' ? parseFloat(newProvider.pct_dist) : null,
      raw_services: rawServicesArr,
      rule: newProvider.rule || null,
      formulas: {
        col_f: newProvider.formula_f ? newProvider.formula_f.trim() : null,
        col_j: newProvider.formula_j ? newProvider.formula_j.trim() : null,
        col_m: newProvider.formula_m ? newProvider.formula_m.trim() : null,
        col_p: newProvider.formula_p ? newProvider.formula_p.trim() : null,
        col_q: newProvider.formula_q ? newProvider.formula_q.trim() : null,
        col_s: newProvider.formula_s ? newProvider.formula_s.trim() : null,
        col_t: newProvider.formula_t ? newProvider.formula_t.trim() : null
      }
    };

    const updated = [...providers, providerToAdd];
    await dbService.saveProviders(updated);
    onUpdateProviders(updated);
    setIsAddModalOpen(false);
    showSuccess('Nuevo profesional agregado con éxito.');
  };

  const handleDeleteClick = async (rowId) => {
    if (window.confirm('¿Está seguro de que desea eliminar este profesional? Esta acción afectará los cálculos de las liquidaciones.')) {
      const updated = providers.filter(p => p.row !== rowId);
      await dbService.saveProviders(updated);
      onUpdateProviders(updated);
      showSuccess('Profesional eliminado con éxito.');
    }
  };

  const handleResetDefaults = async () => {
    if (window.confirm('¿Está seguro de que desea restablecer la base de datos de prestadores a los valores por defecto? Se perderán todas tus modificaciones manuales.')) {
      const reset = await dbService.resetProviders();
      onUpdateProviders(reset);
      showSuccess('Base de datos restablecida a los valores originales de fábrica.');
    }
  };

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 4000);
  };

  const filteredProviders = providers.filter(p => {
    // Exclude title/divider rows that don't represent real professionals
    if (!p.prof) return false;
    
    const matchesSearch = 
      p.prof.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.mat && String(p.mat).includes(searchTerm));

    const matchesService = filterService === 'ALL' || p.service === filterService;

    return matchesSearch && matchesService;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Base de Datos de Prestadores</h1>
          <p>Configure los profesionales, sus matrículas, porcentajes de coparticipación y reglas especiales.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={handleResetDefaults}>
            <Undo2 size={16} />
            Restablecer Valores Iniciales
          </button>
          <button className="btn btn-primary" onClick={handleOpenAddModal}>
            <Plus size={16} />
            Agregar Prestador
          </button>
        </div>
      </div>

      {success && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--success)', padding: '1rem', background: 'var(--success-bg)', borderRadius: '10px' }}>
          <span>{success}</span>
        </div>
      )}

      {/* Search & Filters */}
      <div className="glass-card" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: '280px' }}>
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nombre, matrícula, especialidad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="input-group" style={{ minWidth: '220px' }}>
          <select value={filterService} onChange={(e) => setFilterService(e.target.value)}>
            <option value="ALL">Todas las Especialidades</option>
            {uniqueServices.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Providers Table */}
      <div className="glass-card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Fila</th>
                <th>Especialidad / Servicio</th>
                <th>Matrícula</th>
                <th>Profesional y Fórmulas Excel</th>
                <th>% Copart.</th>
                <th>% Dist. Grupo</th>
                <th>Regla Especial</th>
                <th>Servicios en Excel Raw</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProviders.map(p => (
                <tr key={p.row}>
                  <td style={{ color: 'var(--text-muted)' }}>{p.row}</td>
                  <td style={{ fontWeight: '500' }}>{p.service}</td>
                  <td>{p.mat || '-'}</td>
                  <td>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{p.prof}</div>
                    {p.formulas && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                        {p.formulas.col_f && (
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>Coseguro (F):</span>{' '}
                            <span style={{ fontStyle: 'italic', color: '#a78bfa' }}>{translateExcelFormula(p.formulas.col_f, p.row)}</span>
                          </div>
                        )}
                        {p.formulas.col_j && (
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>APROSS (J):</span>{' '}
                            <span style={{ fontStyle: 'italic', color: '#22d3ee' }}>{translateExcelFormula(p.formulas.col_j, p.row)}</span>
                          </div>
                        )}
                        {p.formulas.col_m && (
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>Horizonte (M):</span>{' '}
                            <span style={{ fontStyle: 'italic', color: '#34d399' }}>{translateExcelFormula(p.formulas.col_m, p.row)}</span>
                          </div>
                        )}
                        {p.formulas.col_p && (
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>Red / ART (P):</span>{' '}
                            <span style={{ fontStyle: 'italic', color: '#f59e0b' }}>{translateExcelFormula(p.formulas.col_p, p.row)}</span>
                          </div>
                        )}
                        {p.formulas.col_q && (
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>Subtotal (Q):</span>{' '}
                            <span style={{ fontStyle: 'italic', color: '#a78bfa', fontWeight: '500' }}>{translateExcelFormula(p.formulas.col_q, p.row)}</span>
                          </div>
                        )}
                        {p.formulas.col_s && (
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>Esp. Grupo (S):</span>{' '}
                            <span style={{ fontStyle: 'italic', color: '#22d3ee', fontWeight: '500' }}>{translateExcelFormula(p.formulas.col_s, p.row)}</span>
                          </div>
                        )}
                        {p.formulas.col_t && (
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>Pago Final (T):</span>{' '}
                            <span style={{ fontStyle: 'italic', color: '#34d399', fontWeight: '600' }}>{translateExcelFormula(p.formulas.col_t, p.row)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td>{p.pct_copart ? `${(p.pct_copart * 100).toFixed(0)}%` : '-'}</td>
                  <td>{p.pct_dist ? `${(p.pct_dist * 100).toFixed(0)}%` : '-'}</td>
                  <td>
                    {p.rule ? (
                      <span className="badge badge-violet">{p.rule}</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Ninguna</span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.raw_services && p.raw_services.length > 0 ? p.raw_services.join(', ') : 'Todos'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => handleEditClick(p)}>
                        <Edit2 size={14} />
                      </button>
                      <button className="btn btn-danger" style={{ padding: '0.4rem' }} onClick={() => handleDeleteClick(p.row)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Agregar Nuevo Prestador</h3>
              <a onClick={() => setIsAddModalOpen(false)} style={{ cursor: 'pointer' }}><X size={20} /></a>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="input-group">
                <label>Nombre del Profesional</label>
                <input 
                  type="text" 
                  value={newProvider.prof} 
                  onChange={(e) => setNewProvider({...newProvider, prof: e.target.value})}
                  placeholder="Ej: Pérez, Juan"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label>Matrícula</label>
                  <input 
                    type="text" 
                    value={newProvider.mat} 
                    onChange={(e) => setNewProvider({...newProvider, mat: e.target.value})}
                    placeholder="Ej: 34522 o SERV."
                  />
                </div>

                <div className="input-group">
                  <label>Especialidad / Servicio</label>
                  <input 
                    type="text" 
                    value={newProvider.service} 
                    onChange={(e) => setNewProvider({...newProvider, service: e.target.value})}
                    placeholder="Ej: Cardiología"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label>% de Coparticipación</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={newProvider.pct_copart} 
                    onChange={(e) => setNewProvider({...newProvider, pct_copart: e.target.value})}
                    placeholder="Ej: 0.35"
                  />
                </div>

                <div className="input-group">
                  <label>% de Distribución Grupo (Opcional)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={newProvider.pct_dist} 
                    onChange={(e) => setNewProvider({...newProvider, pct_dist: e.target.value})}
                    placeholder="Ej: 0.40"
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Regla Especial (Opcional)</label>
                <select 
                  value={newProvider.rule} 
                  onChange={(e) => setNewProvider({...newProvider, rule: e.target.value})}
                >
                  <option value="">Ninguna</option>
                  <option value="percentage_dist">Distribución por Porcentaje (% Dist)</option>
                  <option value="sum_of_group">Acumulación de Grupo</option>
                </select>
              </div>

              <div className="input-group">
                <label>Nombres de Servicios en Excel Raw (Separados por coma)</label>
                <input 
                  type="text" 
                  value={newProvider.raw_services_str} 
                  onChange={(e) => setNewProvider({...newProvider, raw_services_str: e.target.value})}
                  placeholder="Ej: CARDIOLOGIA, ECO DOPPLER (Dejar vacío para incluir todos)"
                />
              </div>

              {/* Fórmulas de Excel */}
              <h4 style={{ color: 'var(--primary)', marginTop: '1.5rem', marginBottom: '0.5rem', fontSize: '0.9rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.4rem' }}>
                Fórmulas de Liquidación (Excel)
              </h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Configura las fórmulas de cálculo. Utiliza el asistente interactivo para no tener que recordar las letras y números de columna de Excel.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <FormulaInput 
                  label="Fórmula Coseguro (Col F)"
                  value={newProvider.formula_f}
                  onChange={(val) => setNewProvider({...newProvider, formula_f: val})}
                  placeholder="Ej: =E6*D6"
                  row={newProvider.formula_f ? Math.max(...providers.map(p => p.row), 0) + 1 : 1}
                />
                <FormulaInput 
                  label="Fórmula APROSS (Col J)"
                  value={newProvider.formula_j}
                  onChange={(val) => setNewProvider({...newProvider, formula_j: val})}
                  placeholder="Ej: =I6*D6"
                  row={newProvider.formula_j ? Math.max(...providers.map(p => p.row), 0) + 1 : 1}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <FormulaInput 
                  label="Fórmula Horizonte (Col M)"
                  value={newProvider.formula_m}
                  onChange={(val) => setNewProvider({...newProvider, formula_m: val})}
                  placeholder="Ej: =L6*D6"
                  row={newProvider.formula_m ? Math.max(...providers.map(p => p.row), 0) + 1 : 1}
                />
                <FormulaInput 
                  label="Fórmula Red / ART (Col P)"
                  value={newProvider.formula_p}
                  onChange={(val) => setNewProvider({...newProvider, formula_p: val})}
                  placeholder="Ej: =O6*D6"
                  row={newProvider.formula_p ? Math.max(...providers.map(p => p.row), 0) + 1 : 1}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <FormulaInput 
                  label="Fórmula Subtotal (Col Q)"
                  value={newProvider.formula_q}
                  onChange={(val) => setNewProvider({...newProvider, formula_q: val})}
                  placeholder="Ej: =F6+J6+M6+P6"
                  row={newProvider.formula_q ? Math.max(...providers.map(p => p.row), 0) + 1 : 1}
                />
                <FormulaInput 
                  label="Fórmula Especial (Col S)"
                  value={newProvider.formula_s}
                  onChange={(val) => setNewProvider({...newProvider, formula_s: val})}
                  placeholder="Vacío si no aplica"
                  row={newProvider.formula_s ? Math.max(...providers.map(p => p.row), 0) + 1 : 1}
                />
                <FormulaInput 
                  label="Fórmula Pago (Col T)"
                  value={newProvider.formula_t}
                  onChange={(val) => setNewProvider({...newProvider, formula_t: val})}
                  placeholder="Ej: =Q6"
                  row={newProvider.formula_t ? Math.max(...providers.map(p => p.row), 0) + 1 : 1}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAddSave}>
                <Save size={16} />
                Guardar Prestador
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingProvider && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Editar Prestador (Fila {editingProvider.row})</h3>
              <a onClick={() => setEditingProvider(null)} style={{ cursor: 'pointer' }}><X size={20} /></a>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="input-group">
                <label>Nombre del Profesional</label>
                <input 
                  type="text" 
                  value={editingProvider.prof} 
                  onChange={(e) => setEditingProvider({...editingProvider, prof: e.target.value})}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label>Matrícula</label>
                  <input 
                    type="text" 
                    value={editingProvider.mat || ''} 
                    onChange={(e) => setEditingProvider({...editingProvider, mat: e.target.value})}
                    placeholder="Ej: 34522 o SERV."
                  />
                </div>

                <div className="input-group">
                  <label>Especialidad / Servicio</label>
                  <input 
                    type="text" 
                    value={editingProvider.service} 
                    onChange={(e) => setEditingProvider({...editingProvider, service: e.target.value})}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label>% de Coparticipación</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={editingProvider.pct_copart || ''} 
                    onChange={(e) => setEditingProvider({...editingProvider, pct_copart: e.target.value})}
                  />
                </div>

                <div className="input-group">
                  <label>% de Distribución Grupo</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={editingProvider.pct_dist || ''} 
                    onChange={(e) => setEditingProvider({...editingProvider, pct_dist: e.target.value})}
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Regla Especial</label>
                <select 
                  value={editingProvider.rule || ''} 
                  onChange={(e) => setEditingProvider({...editingProvider, rule: e.target.value})}
                >
                  <option value="">Ninguna</option>
                  <option value="percentage_dist">Distribución por Porcentaje (% Dist)</option>
                  <option value="sum_of_group">Acumulación de Grupo</option>
                </select>
              </div>

              <div className="input-group">
                <label>Nombres de Servicios en Excel Raw (Separados por coma)</label>
                <input 
                  type="text" 
                  value={editingProvider.raw_services_str} 
                  onChange={(e) => setEditingProvider({...editingProvider, raw_services_str: e.target.value})}
                />
              </div>

              {/* Fórmulas de Excel */}
              <h4 style={{ color: 'var(--primary)', marginTop: '1.5rem', marginBottom: '0.5rem', fontSize: '0.9rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.4rem' }}>
                Fórmulas de Liquidación (Excel)
              </h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Modifica las fórmulas de Excel asignadas a este profesional. Usa la fila <strong>{editingProvider.row}</strong> para las referencias de celda.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <FormulaInput 
                  label="Fórmula Coseguro (Col F)"
                  value={editingProvider.formula_f}
                  onChange={(val) => setEditingProvider({...editingProvider, formula_f: val})}
                  placeholder="Ej: =E6*D6"
                  row={editingProvider.row}
                />
                <FormulaInput 
                  label="Fórmula APROSS (Col J)"
                  value={editingProvider.formula_j}
                  onChange={(val) => setEditingProvider({...editingProvider, formula_j: val})}
                  placeholder="Ej: =I6*D6"
                  row={editingProvider.row}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <FormulaInput 
                  label="Fórmula Horizonte (Col M)"
                  value={editingProvider.formula_m}
                  onChange={(val) => setEditingProvider({...editingProvider, formula_m: val})}
                  placeholder="Ej: =L6*D6"
                  row={editingProvider.row}
                />
                <FormulaInput 
                  label="Fórmula Red / ART (Col P)"
                  value={editingProvider.formula_p}
                  onChange={(val) => setEditingProvider({...editingProvider, formula_p: val})}
                  placeholder="Ej: =O6*D6"
                  row={editingProvider.row}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <FormulaInput 
                  label="Fórmula Subtotal (Col Q)"
                  value={editingProvider.formula_q}
                  onChange={(val) => setEditingProvider({...editingProvider, formula_q: val})}
                  placeholder="Ej: =F6+J6+M6+P6"
                  row={editingProvider.row}
                />
                <FormulaInput 
                  label="Fórmula Especial (Col S)"
                  value={editingProvider.formula_s}
                  onChange={(val) => setEditingProvider({...editingProvider, formula_s: val})}
                  placeholder="Vacío si no aplica"
                  row={editingProvider.row}
                />
                <FormulaInput 
                  label="Fórmula Pago (Col T)"
                  value={editingProvider.formula_t}
                  onChange={(val) => setEditingProvider({...editingProvider, formula_t: val})}
                  placeholder="Ej: =Q6"
                  row={editingProvider.row}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditingProvider(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleEditSave}>
                <Save size={16} />
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProvidersConfig;

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

const parseNum = (val) => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  const num = parseFloat(val);
  return isNaN(num) ? 0 : num;
};

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

// Helper to convert friendly tags back into Excel formulas
const translateFriendlyToExcel = (friendlyStr, rowNum) => {
  if (!friendlyStr) return null;
  let excel = friendlyStr.trim();

  const columnsMap = {
    'Tot. Valorizado': 'E',
    '% Copart.': 'D',
    'Coseguros': 'F',
    'APROSS Cant.': 'G',
    'APROSS Valor': 'I',
    'APROSS Copart.': 'J',
    'Horizonte Cant.': 'K',
    'Horizonte Valor': 'L',
    'Horizonte Copart.': 'M',
    'Red Cant.': 'N',
    'Red Valor': 'O',
    'Red Copart.': 'P',
    'Subtotal Copart': 'Q',
    'Subtotal Especial': 'S',
    'Pago Final': 'T'
  };

  const absoluteMap = {
    'Tarifa APROSS': '$H$3',
    'Multiplicador APROSS': '$J$3',
    'Tarifa Horizonte': '$K$3',
    'Tarifa Red': '$N$3'
  };

  // Replace absolute cells
  Object.entries(absoluteMap).forEach(([friendlyName, code]) => {
    const regex = new RegExp(`\\[${friendlyName}\\]`, 'gi');
    excel = excel.replace(regex, code);
  });

  // Replace variables like [Tot. Valorizado] (Fila 57) -> E57
  // Or [Tot. Valorizado] -> E[rowNum]
  const variableRegex = /\[([^\]]+)\](?:\s*\(Fila\s*(\d+)\))?/gi;
  excel = excel.replace(variableRegex, (match, varName, fileNum) => {
    const cleanVarName = varName.trim();
    const colCode = columnsMap[cleanVarName] || cleanVarName;
    const row = fileNum ? fileNum : rowNum;
    return colCode + row;
  });

  // Check if it's a numeric constant or formula
  if (excel !== '' && !excel.startsWith('=')) {
    // If it is just a number, don't prepend =
    if (isNaN(Number(excel))) {
      excel = '=' + excel;
    }
  }

  return excel;
};

// Componente interactivo para crear o editar fórmulas con ayuda visual simple
const FormulaInput = ({ label, value, onChange, placeholder }) => {
  const insertVariable = (token) => {
    onChange(value + token);
  };

  const commonChips = [
    { label: '[Tot. Valorizado]', code: '[Tot. Valorizado]' },
    { label: '[% Copart.]', code: '[% Copart.]' },
    { label: '[Coseguros]', code: '[Coseguros]' },
    { label: '[Subtotal Copart]', code: '[Subtotal Copart]' },
    { label: '[Pago Final]', code: '[Pago Final]' }
  ];

  const mathOps = ['+', '-', '*', '/'];

  const otherVariables = [
    { label: 'APROSS Cant.', code: '[APROSS Cant.]' },
    { label: 'APROSS Valor', code: '[APROSS Valor]' },
    { label: 'APROSS Copart.', code: '[APROSS Copart.]' },
    { label: 'Horizonte Cant.', code: '[Horizonte Cant.]' },
    { label: 'Horizonte Valor', code: '[Horizonte Valor]' },
    { label: 'Horizonte Copart.', code: '[Horizonte Copart.]' },
    { label: 'Red Cant.', code: '[Red Cant.]' },
    { label: 'Red Valor', code: '[Red Valor]' },
    { label: 'Red Copart.', code: '[Red Copart.]' },
    { label: 'Subtotal Especial', code: '[Subtotal Especial]' },
    { label: 'Tarifa APROSS', code: '[Tarifa APROSS]' },
    { label: 'Tarifa Horizonte', code: '[Tarifa Horizonte]' },
    { label: 'Tarifa Red', code: '[Tarifa Red]' }
  ];

  return (
    <div className="input-group" style={{ marginBottom: '1.25rem' }}>
      <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>{label}</label>
      <input 
        type="text" 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ letterSpacing: '0.5px' }}
      />
      
      {/* Helper inline chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.35rem', alignItems: 'center' }}>
        {mathOps.map(op => (
          <button
            key={op}
            type="button"
            onClick={() => insertVariable(` ${op} `)}
            style={{
              padding: '0.15rem 0.35rem',
              fontSize: '0.7rem',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border-light)',
              borderRadius: '4px',
              color: 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            {op}
          </button>
        ))}
        {commonChips.map(chip => (
          <button
            key={chip.label}
            type="button"
            onClick={() => insertVariable(chip.code)}
            style={{
              padding: '0.15rem 0.35rem',
              fontSize: '0.7rem',
              background: 'rgba(139,92,246,0.05)',
              border: '1px solid rgba(139,92,246,0.2)',
              borderRadius: '4px',
              color: 'var(--primary-light)',
              cursor: 'pointer'
            }}
          >
            {chip.label}
          </button>
        ))}

        <select
          onChange={(e) => {
            if (e.target.value) {
              insertVariable(e.target.value);
              e.target.value = ''; // Reset
            }
          }}
          style={{
            padding: '0.15rem 0.35rem',
            fontSize: '0.7rem',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border-light)',
            borderRadius: '4px',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            width: 'auto',
            height: 'auto',
            borderStyle: 'dashed'
          }}
          defaultValue=""
        >
          <option value="" disabled>+ Más variables...</option>
          {otherVariables.map(v => (
            <option key={v.code} value={v.code}>{v.label}</option>
          ))}
        </select>
      </div>
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
    formula_t: '',
    tariff_apross: '',
    tariff_horizonte: '',
    tariff_red: ''
  });
  const [success, setSuccess] = useState('');

  // Extract unique services for the filter dropdown
  const uniqueServices = Array.from(
    new Set(providers.map(p => p.service).filter(Boolean))
  ).sort();

  const handleOpenAddModal = () => {
    setNewProvider({
      prof: '',
      mat: '',
      service: '',
      pct_copart: 0.35,
      pct_dist: '',
      raw_services_str: '',
      rule: '',
      formula_f: '[Tot. Valorizado] * [% Copart.]',
      formula_j: '[APROSS Valor] * [% Copart.]',
      formula_m: '[Horizonte Valor] * [% Copart.]',
      formula_p: '[Red Valor] * [% Copart.]',
      formula_q: '[Coseguros] + [APROSS Copart.] + [Horizonte Copart.] + [Red Copart.]',
      formula_s: '',
      formula_t: '[Subtotal Copart]',
      tariff_apross: '',
      tariff_horizonte: '',
      tariff_red: ''
    });
    setIsAddModalOpen(true);
  };

  const handleEditClick = (p) => {
    setEditingProvider({
      ...p,
      raw_services_str: p.raw_services ? p.raw_services.join(', ') : '',
      formula_f: p.formulas?.col_f ? translateExcelFormula(p.formulas.col_f, p.row) : '',
      formula_j: p.formulas?.col_j ? translateExcelFormula(p.formulas.col_j, p.row) : '',
      formula_m: p.formulas?.col_m ? translateExcelFormula(p.formulas.col_m, p.row) : '',
      formula_p: p.formulas?.col_p ? translateExcelFormula(p.formulas.col_p, p.row) : '',
      formula_q: p.formulas?.col_q ? translateExcelFormula(p.formulas.col_q, p.row) : '',
      formula_s: p.formulas?.col_s ? translateExcelFormula(p.formulas.col_s, p.row) : '',
      formula_t: p.formulas?.col_t ? translateExcelFormula(p.formulas.col_t, p.row) : '',
      tariff_apross: p.formulas?.tariff_apross || '',
      tariff_horizonte: p.formulas?.tariff_horizonte || '',
      tariff_red: p.formulas?.tariff_red || ''
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
            col_f: editingProvider.formula_f ? translateFriendlyToExcel(editingProvider.formula_f, p.row) : null,
            col_j: editingProvider.formula_j ? translateFriendlyToExcel(editingProvider.formula_j, p.row) : null,
            col_m: editingProvider.formula_m ? translateFriendlyToExcel(editingProvider.formula_m, p.row) : null,
            col_p: editingProvider.formula_p ? translateFriendlyToExcel(editingProvider.formula_p, p.row) : null,
            col_q: editingProvider.formula_q ? translateFriendlyToExcel(editingProvider.formula_q, p.row) : null,
            col_s: editingProvider.formula_s ? translateFriendlyToExcel(editingProvider.formula_s, p.row) : null,
            col_t: editingProvider.formula_t ? translateFriendlyToExcel(editingProvider.formula_t, p.row) : null,
            tariff_apross: editingProvider.tariff_apross !== '' ? parseFloat(editingProvider.tariff_apross) : null,
            tariff_horizonte: editingProvider.tariff_horizonte !== '' ? parseFloat(editingProvider.tariff_horizonte) : null,
            tariff_red: editingProvider.tariff_red !== '' ? parseFloat(editingProvider.tariff_red) : null
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
        col_f: newProvider.formula_f ? translateFriendlyToExcel(newProvider.formula_f, nextRow) : null,
        col_j: newProvider.formula_j ? translateFriendlyToExcel(newProvider.formula_j, nextRow) : null,
        col_m: newProvider.formula_m ? translateFriendlyToExcel(newProvider.formula_m, nextRow) : null,
        col_p: newProvider.formula_p ? translateFriendlyToExcel(newProvider.formula_p, nextRow) : null,
        col_q: newProvider.formula_q ? translateFriendlyToExcel(newProvider.formula_q, nextRow) : null,
        col_s: newProvider.formula_s ? translateFriendlyToExcel(newProvider.formula_s, nextRow) : null,
        col_t: newProvider.formula_t ? translateFriendlyToExcel(newProvider.formula_t, nextRow) : null,
        tariff_apross: newProvider.tariff_apross !== '' ? parseFloat(newProvider.tariff_apross) : null,
        tariff_horizonte: newProvider.tariff_horizonte !== '' ? parseFloat(newProvider.tariff_horizonte) : null,
        tariff_red: newProvider.tariff_red !== '' ? parseFloat(newProvider.tariff_red) : null
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
                <th>Profesional</th>
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
                    {/* Render specific custom tariffs badges if they are defined */}
                    {p.formulas && (p.formulas.tariff_apross || p.formulas.tariff_horizonte || p.formulas.tariff_red) ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', fontSize: '0.68rem', marginTop: '0.25rem' }}>
                        {p.formulas.tariff_apross && (
                          <span style={{ background: 'rgba(6,182,212,0.08)', padding: '0.05rem 0.25rem', borderRadius: '4px', color: '#22d3ee', fontWeight: '500' }}>
                            Tarifa APROSS: ${parseNum(p.formulas.tariff_apross).toLocaleString('es-AR')}
                          </span>
                        )}
                        {p.formulas.tariff_horizonte && (
                          <span style={{ background: 'rgba(16,185,129,0.08)', padding: '0.05rem 0.25rem', borderRadius: '4px', color: '#34d399', fontWeight: '500' }}>
                            Tarifa Horiz: ${parseNum(p.formulas.tariff_horizonte).toLocaleString('es-AR')}
                          </span>
                        )}
                        {p.formulas.tariff_red && (
                          <span style={{ background: 'rgba(245,158,11,0.08)', padding: '0.05rem 0.25rem', borderRadius: '4px', color: '#fbbf24', fontWeight: '500' }}>
                            Tarifa Red: ${parseNum(p.formulas.tariff_red).toLocaleString('es-AR')}
                          </span>
                        )}
                      </div>
                    ) : null}
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

              {/* Tarifas Especiales */}
              <h4 style={{ color: 'var(--primary)', marginTop: '1.5rem', marginBottom: '0.5rem', fontSize: '0.9rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.4rem' }}>
                Tarifas Especiales por Prestador (Opcional)
              </h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Completa estos campos únicamente si este profesional tiene un valor de consulta diferente al valor general del sanatorio.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="input-group">
                  <label style={{ fontSize: '0.8rem' }}>Tarifa APROSS ($)</label>
                  <input 
                    type="number" 
                    value={newProvider.tariff_apross} 
                    onChange={(e) => setNewProvider({...newProvider, tariff_apross: e.target.value})}
                    placeholder="General: $12.000"
                  />
                </div>
                <div className="input-group">
                  <label style={{ fontSize: '0.8rem' }}>Tarifa Horizonte ($)</label>
                  <input 
                    type="number" 
                    value={newProvider.tariff_horizonte} 
                    onChange={(e) => setNewProvider({...newProvider, tariff_horizonte: e.target.value})}
                    placeholder="General: $14.606"
                  />
                </div>
                <div className="input-group">
                  <label style={{ fontSize: '0.8rem' }}>Tarifa Red ($)</label>
                  <input 
                    type="number" 
                    value={newProvider.tariff_red} 
                    onChange={(e) => setNewProvider({...newProvider, tariff_red: e.target.value})}
                    placeholder="General: $17.300"
                  />
                </div>
              </div>

              {/* Fórmulas de Excel */}
              <h4 style={{ color: 'var(--primary)', marginTop: '1.5rem', marginBottom: '0.5rem', fontSize: '0.9rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.4rem' }}>
                Fórmulas de Liquidación
              </h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Configura las fórmulas de cálculo utilizando variables del negocio. Haz clic en las etiquetas inferiores para autocompletar.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <FormulaInput 
                  label="Fórmula Coseguro (Col F)"
                  value={newProvider.formula_f}
                  onChange={(val) => setNewProvider({...newProvider, formula_f: val})}
                  placeholder="Ej: [Tot. Valorizado] * [% Copart.]"
                />
                <FormulaInput 
                  label="Fórmula APROSS (Col J)"
                  value={newProvider.formula_j}
                  onChange={(val) => setNewProvider({...newProvider, formula_j: val})}
                  placeholder="Ej: [APROSS Valor] * [% Copart.]"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <FormulaInput 
                  label="Fórmula Horizonte (Col M)"
                  value={newProvider.formula_m}
                  onChange={(val) => setNewProvider({...newProvider, formula_m: val})}
                  placeholder="Ej: [Horizonte Valor] * [% Copart.]"
                />
                <FormulaInput 
                  label="Fórmula Red / ART (Col P)"
                  value={newProvider.formula_p}
                  onChange={(val) => setNewProvider({...newProvider, formula_p: val})}
                  placeholder="Ej: [Red Valor] * [% Copart.]"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <FormulaInput 
                  label="Fórmula Subtotal (Col Q)"
                  value={newProvider.formula_q}
                  onChange={(val) => setNewProvider({...newProvider, formula_q: val})}
                  placeholder="Ej: [Coseguros] + [APROSS Copart.] + [Horizonte Copart.] + [Red Copart.]"
                />
                <FormulaInput 
                  label="Fórmula Especial (Col S)"
                  value={newProvider.formula_s}
                  onChange={(val) => setNewProvider({...newProvider, formula_s: val})}
                  placeholder="Vacío si no aplica"
                />
                <FormulaInput 
                  label="Fórmula Pago (Col T)"
                  value={newProvider.formula_t}
                  onChange={(val) => setNewProvider({...newProvider, formula_t: val})}
                  placeholder="Ej: [Subtotal Copart]"
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

              {/* Tarifas Especiales */}
              <h4 style={{ color: 'var(--primary)', marginTop: '1.5rem', marginBottom: '0.5rem', fontSize: '0.9rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.4rem' }}>
                Tarifas Especiales por Prestador (Opcional)
              </h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Completa estos campos únicamente si este profesional tiene un valor de consulta diferente al valor general del sanatorio.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="input-group">
                  <label style={{ fontSize: '0.8rem' }}>Tarifa APROSS ($)</label>
                  <input 
                    type="number" 
                    value={editingProvider.tariff_apross || ''} 
                    onChange={(e) => setEditingProvider({...editingProvider, tariff_apross: e.target.value})}
                    placeholder="General: $12.000"
                  />
                </div>
                <div className="input-group">
                  <label style={{ fontSize: '0.8rem' }}>Tarifa Horizonte ($)</label>
                  <input 
                    type="number" 
                    value={editingProvider.tariff_horizonte || ''} 
                    onChange={(e) => setEditingProvider({...editingProvider, tariff_horizonte: e.target.value})}
                    placeholder="General: $14.606"
                  />
                </div>
                <div className="input-group">
                  <label style={{ fontSize: '0.8rem' }}>Tarifa Red ($)</label>
                  <input 
                    type="number" 
                    value={editingProvider.tariff_red || ''} 
                    onChange={(e) => setEditingProvider({...editingProvider, tariff_red: e.target.value})}
                    placeholder="General: $17.300"
                  />
                </div>
              </div>

              {/* Fórmulas de Excel */}
              <h4 style={{ color: 'var(--primary)', marginTop: '1.5rem', marginBottom: '0.5rem', fontSize: '0.9rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.4rem' }}>
                Fórmulas de Liquidación
              </h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Modifica las fórmulas de cálculo utilizando variables del negocio. Haz clic en las etiquetas inferiores para autocompletar.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <FormulaInput 
                  label="Fórmula Coseguro (Col F)"
                  value={editingProvider.formula_f}
                  onChange={(val) => setEditingProvider({...editingProvider, formula_f: val})}
                  placeholder="Ej: [Tot. Valorizado] * [% Copart.]"
                />
                <FormulaInput 
                  label="Fórmula APROSS (Col J)"
                  value={editingProvider.formula_j}
                  onChange={(val) => setEditingProvider({...editingProvider, formula_j: val})}
                  placeholder="Ej: [APROSS Valor] * [% Copart.]"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <FormulaInput 
                  label="Fórmula Horizonte (Col M)"
                  value={editingProvider.formula_m}
                  onChange={(val) => setEditingProvider({...editingProvider, formula_m: val})}
                  placeholder="Ej: [Horizonte Valor] * [% Copart.]"
                />
                <FormulaInput 
                  label="Fórmula Red / ART (Col P)"
                  value={editingProvider.formula_p}
                  onChange={(val) => setEditingProvider({...editingProvider, formula_p: val})}
                  placeholder="Ej: [Red Valor] * [% Copart.]"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <FormulaInput 
                  label="Fórmula Subtotal (Col Q)"
                  value={editingProvider.formula_q}
                  onChange={(val) => setEditingProvider({...editingProvider, formula_q: val})}
                  placeholder="Ej: [Coseguros] + [APROSS Copart.] + [Horizonte Copart.] + [Red Copart.]"
                />
                <FormulaInput 
                  label="Fórmula Especial (Col S)"
                  value={editingProvider.formula_s}
                  onChange={(val) => setEditingProvider({...editingProvider, formula_s: val})}
                  placeholder="Vacío si no aplica"
                />
                <FormulaInput 
                  label="Fórmula Pago (Col T)"
                  value={editingProvider.formula_t}
                  onChange={(val) => setEditingProvider({...editingProvider, formula_t: val})}
                  placeholder="Ej: [Subtotal Copart]"
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

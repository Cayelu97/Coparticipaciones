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
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontFamily: 'monospace' }}>
                        {p.formulas.col_f && <span style={{ background: 'rgba(255,255,255,0.03)', padding: '0.05rem 0.2rem', borderRadius: '4px' }}>F: {p.formulas.col_f}</span>}
                        {p.formulas.col_j && <span style={{ background: 'rgba(255,255,255,0.03)', padding: '0.05rem 0.2rem', borderRadius: '4px' }}>J: {p.formulas.col_j}</span>}
                        {p.formulas.col_m && <span style={{ background: 'rgba(255,255,255,0.03)', padding: '0.05rem 0.2rem', borderRadius: '4px' }}>M: {p.formulas.col_m}</span>}
                        {p.formulas.col_p && <span style={{ background: 'rgba(255,255,255,0.03)', padding: '0.05rem 0.2rem', borderRadius: '4px' }}>P: {p.formulas.col_p}</span>}
                        {p.formulas.col_q && <span style={{ background: 'rgba(139,92,246,0.08)', padding: '0.05rem 0.2rem', borderRadius: '4px', color: '#a78bfa' }}>Q: {p.formulas.col_q}</span>}
                        {p.formulas.col_s && <span style={{ background: 'rgba(6,182,212,0.08)', padding: '0.05rem 0.2rem', borderRadius: '4px', color: '#22d3ee' }}>S: {p.formulas.col_s}</span>}
                        {p.formulas.col_t && <span style={{ background: 'rgba(16,185,129,0.08)', padding: '0.05rem 0.2rem', borderRadius: '4px', color: '#34d399', fontWeight: '500' }}>T: {p.formulas.col_t}</span>}
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
                Configura las fórmulas que se exportarán en el Excel. Se autocompletan para la siguiente fila disponible por defecto.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                <div className="input-group">
                  <label style={{ fontSize: '0.8rem' }}>Fórmula Coseguro (Col F)</label>
                  <input 
                    type="text" 
                    value={newProvider.formula_f} 
                    onChange={(e) => setNewProvider({...newProvider, formula_f: e.target.value})}
                    placeholder="Ej: =E6*D6"
                  />
                </div>
                <div className="input-group">
                  <label style={{ fontSize: '0.8rem' }}>Fórmula APROSS (Col J)</label>
                  <input 
                    type="text" 
                    value={newProvider.formula_j} 
                    onChange={(e) => setNewProvider({...newProvider, formula_j: e.target.value})}
                    placeholder="Ej: =I6*D6"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                <div className="input-group">
                  <label style={{ fontSize: '0.8rem' }}>Fórmula Horizonte (Col M)</label>
                  <input 
                    type="text" 
                    value={newProvider.formula_m} 
                    onChange={(e) => setNewProvider({...newProvider, formula_m: e.target.value})}
                    placeholder="Ej: =L6*D6"
                  />
                </div>
                <div className="input-group">
                  <label style={{ fontSize: '0.8rem' }}>Fórmula Red / ART (Col P)</label>
                  <input 
                    type="text" 
                    value={newProvider.formula_p} 
                    onChange={(e) => setNewProvider({...newProvider, formula_p: e.target.value})}
                    placeholder="Ej: =O6*D6"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label style={{ fontSize: '0.8rem' }}>Fórmula Subtotal (Col Q)</label>
                  <input 
                    type="text" 
                    value={newProvider.formula_q} 
                    onChange={(e) => setNewProvider({...newProvider, formula_q: e.target.value})}
                    placeholder="Ej: =F6+J6+M6+P6"
                  />
                </div>
                <div className="input-group">
                  <label style={{ fontSize: '0.8rem' }}>Fórmula Especial (Col S)</label>
                  <input 
                    type="text" 
                    value={newProvider.formula_s} 
                    onChange={(e) => setNewProvider({...newProvider, formula_s: e.target.value})}
                    placeholder="Vacío si no aplica"
                  />
                </div>
                <div className="input-group">
                  <label style={{ fontSize: '0.8rem' }}>Fórmula Pago (Col T)</label>
                  <input 
                    type="text" 
                    value={newProvider.formula_t} 
                    onChange={(e) => setNewProvider({...newProvider, formula_t: e.target.value})}
                    placeholder="Ej: =Q6"
                  />
                </div>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                <div className="input-group">
                  <label style={{ fontSize: '0.8rem' }}>Fórmula Coseguro (Col F)</label>
                  <input 
                    type="text" 
                    value={editingProvider.formula_f} 
                    onChange={(e) => setEditingProvider({...editingProvider, formula_f: e.target.value})}
                    placeholder="Ej: =E6*D6"
                  />
                </div>
                <div className="input-group">
                  <label style={{ fontSize: '0.8rem' }}>Fórmula APROSS (Col J)</label>
                  <input 
                    type="text" 
                    value={editingProvider.formula_j} 
                    onChange={(e) => setEditingProvider({...editingProvider, formula_j: e.target.value})}
                    placeholder="Ej: =I6*D6"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                <div className="input-group">
                  <label style={{ fontSize: '0.8rem' }}>Fórmula Horizonte (Col M)</label>
                  <input 
                    type="text" 
                    value={editingProvider.formula_m} 
                    onChange={(e) => setEditingProvider({...editingProvider, formula_m: e.target.value})}
                    placeholder="Ej: =L6*D6"
                  />
                </div>
                <div className="input-group">
                  <label style={{ fontSize: '0.8rem' }}>Fórmula Red / ART (Col P)</label>
                  <input 
                    type="text" 
                    value={editingProvider.formula_p} 
                    onChange={(e) => setEditingProvider({...editingProvider, formula_p: e.target.value})}
                    placeholder="Ej: =O6*D6"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label style={{ fontSize: '0.8rem' }}>Fórmula Subtotal (Col Q)</label>
                  <input 
                    type="text" 
                    value={editingProvider.formula_q} 
                    onChange={(e) => setEditingProvider({...editingProvider, formula_q: e.target.value})}
                    placeholder="Ej: =F6+J6+M6+P6"
                  />
                </div>
                <div className="input-group">
                  <label style={{ fontSize: '0.8rem' }}>Fórmula Especial (Col S)</label>
                  <input 
                    type="text" 
                    value={editingProvider.formula_s} 
                    onChange={(e) => setEditingProvider({...editingProvider, formula_s: e.target.value})}
                    placeholder="Vacío si no aplica"
                  />
                </div>
                <div className="input-group">
                  <label style={{ fontSize: '0.8rem' }}>Fórmula Pago (Col T)</label>
                  <input 
                    type="text" 
                    value={editingProvider.formula_t} 
                    onChange={(e) => setEditingProvider({...editingProvider, formula_t: e.target.value})}
                    placeholder="Ej: =Q6"
                  />
                </div>
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

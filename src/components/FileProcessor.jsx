import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  UploadCloud, 
  Download, 
  Search, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  FileSpreadsheet,
  Edit2
} from 'lucide-react';
import { calculateCoparticipation, recalculateFromAggregated } from '../services/calculator';
import { exportToExcel, exportOpGastosToExcel } from '../services/excelExporter';
import { dbService } from '../services/db';

const FileProcessor = ({ providers = [], settings = {}, onSaveSuccess, initialCalculation }) => {
  const [file, setFile] = useState(null);
  const [rawRows, setRawRows] = useState([]);
  const [calculatedData, setCalculatedData] = useState(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (initialCalculation) {
      setMonth(initialCalculation.month);
      setYear(initialCalculation.year);
      setRawRows([]);
      setCalculatedData({
        rows: initialCalculation.rows,
        totals: initialCalculation.totals
      });
      setSuccess(`Mostrando vista previa de la liquidación cargada para ${initialCalculation.month}/${initialCalculation.year}.`);
    }
  }, [initialCalculation]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCell, setEditingCell] = useState(null); // { rowIndex, field }
  const [editingValue, setEditingValue] = useState('');

  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (selectedFile) => {
    setFile(selectedFile);
    setLoading(true);
    setError('');
    setSuccess('');
    setCalculatedData(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Buscamos la pestaña que contenga "coparticipacion" o la primera hoja
        const sheetName = workbook.SheetNames.find(n => 
          n.toLowerCase().includes('coparticipacion') || n.toLowerCase().includes('atenciones')
        ) || workbook.SheetNames[0];

        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          throw new Error('La pestaña del archivo Excel está vacía.');
        }

        // Validar columnas clave
        const firstRow = jsonData[0];
        const requiredFields = ['pre_matp', 'me_cose', 'os_nombre', 'nom_cod'];
        const missingFields = requiredFields.filter(f => !(f in firstRow));

        if (missingFields.length > 0 && !('me_cose' in firstRow)) {
          console.warn('Algunos campos esperados no se encontraron:', missingFields);
        }

        setRawRows(jsonData);
        
        // Ejecutar cálculo inicial
        const results = calculateCoparticipation(jsonData, providers, settings);
        setCalculatedData(results);
        setSuccess(`Archivo "${selectedFile.name}" cargado exitosamente. Se encontraron ${jsonData.length} registros.`);
      } catch (err) {
        console.error(err);
        setError(`Error al procesar el Excel: ${err.message || 'Estructura no válida'}`);
        setFile(null);
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setError('Error de lectura del archivo.');
      setLoading(false);
    };

    reader.readAsArrayBuffer(selectedFile);
  };

  // Función para recalcular cuando el usuario edita a mano algún valor del preview
  const handleCellEditSubmit = (rowIndex, field) => {
    if (!calculatedData) return;

    const newValue = parseFloat(editingValue);
    if (isNaN(newValue)) {
      setEditingCell(null);
      return;
    }

    // Copiar las filas de resultados y mutar la celda editada
    const updatedRows = [...calculatedData.rows];
    const rowToUpdate = updatedRows[rowIndex];

    // Mapear campos editados de la UI a los contadores/valores base
    if (field === 'col_e') {
      rowToUpdate.me_cose_sum = newValue;
      rowToUpdate.col_e = newValue;
    } else if (field === 'col_g') {
      rowToUpdate.apross_count = newValue;
      rowToUpdate.col_g = newValue;
    } else if (field === 'col_k') {
      rowToUpdate.horiz_count = newValue;
      rowToUpdate.col_k = newValue;
    } else if (field === 'col_n') {
      rowToUpdate.red_count = newValue;
      rowToUpdate.col_n = newValue;
    }

    // Volver a correr la lógica de reglas grupales y subtotalizadores usando el motor compartido
    const results = recalculateFromAggregated(updatedRows, settings);
    setCalculatedData(results);
    setEditingCell(null);
  };

  const handleSaveToHistory = async () => {
    if (!calculatedData) return;
    
    const historyItem = {
      month,
      year,
      totalRowsCount: rawRows.length,
      totals: calculatedData.totals,
      rows: calculatedData.rows
    };

    const saved = await dbService.saveHistoryItem(historyItem);
    if (saved) {
      setSuccess(`Los resultados de ${month}/${year} fueron guardados con éxito en el historial.`);
      if (onSaveSuccess) onSaveSuccess();
    } else {
      setError('No se pudieron guardar los datos en el historial local.');
    }
  };

  const handleDownloadOpGastos = async () => {
    if (!calculatedData) return;
    try {
      setLoading(true);
      const blob = await exportOpGastosToExcel(calculatedData.rows, month, year);
      
      const monthNames = [
        'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
        'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
      ];
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `LISTADO_OP_GASTOS_${monthNames[month - 1]}_${year}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSuccess('Listado de OP Gastos generado exitosamente.');
    } catch (err) {
      console.error(err);
      setError(`Error al descargar el listado de OP Gastos: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (!calculatedData) return;
    try {
      setLoading(true);
      const blob = await exportToExcel(calculatedData.rows, month, year, settings);
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `COPARTICIPACION_${year}_${String(month).padStart(2, '0')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSuccess('Archivo Excel generado exitosamente.');
    } catch (err) {
      console.error(err);
      setError(`Error al descargar el Excel: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => {
    if (val === undefined || val === null) return '-';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(val);
  };

  const filteredRows = calculatedData 
    ? calculatedData.rows.filter(r => 
        (r.prof && r.prof.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.service && r.service.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.mat && String(r.mat).includes(searchTerm))
      )
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1>Procesar Listado de Atenciones</h1>
        <p>Sube el archivo Excel descargado del sistema y genera la planilla de coparticipaciones con fórmulas.</p>
      </div>

      {/* Configuration options and File Uploader */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          <div className="input-group">
            <label>Mes de Liquidación</label>
            <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
              <option value={1}>Enero</option>
              <option value={2}>Febrero</option>
              <option value={3}>Marzo</option>
              <option value={4}>Abril</option>
              <option value={5}>Mayo</option>
              <option value={6}>Junio</option>
              <option value={7}>Julio</option>
              <option value={8}>Agosto</option>
              <option value={9}>Septiembre</option>
              <option value={10}>Octubre</option>
              <option value={11}>Noviembre</option>
              <option value={12}>Diciembre</option>
            </select>
          </div>

          <div className="input-group">
            <label>Año</label>
            <select value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
              <option value={2028}>2028</option>
            </select>
          </div>
        </div>

        {/* Drag and drop zone */}
        <div 
          className="dropzone"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current.click()}
        >
          <UploadCloud size={48} className="dropzone-icon" />
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".xlsx, .xls"
            style={{ display: 'none' }}
          />
          {file ? (
            <div>
              <p style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{file.name}</p>
              <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Haga clic o arrastre para reemplazar el archivo</p>
            </div>
          ) : (
            <div>
              <p style={{ color: 'var(--text-primary)', fontWeight: '600' }}>Arrastra tu archivo Excel aquí</p>
              <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>O haz clic para explorar tus carpetas locales</p>
            </div>
          )}
        </div>

        {loading && <p style={{ color: 'var(--primary)', fontWeight: '600' }}>Procesando archivo...</p>}

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--danger)', padding: '1rem', background: 'var(--danger-bg)', borderRadius: '10px' }}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--success)', padding: '1rem', background: 'var(--success-bg)', borderRadius: '10px' }}>
            <CheckCircle2 size={20} />
            <span>{success}</span>
          </div>
        )}
      </div>

      {/* Calculations Preview Table */}
      {calculatedData && (
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <h2>Vista Previa de Liquidación ({month}/{year})</h2>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={handleSaveToHistory}>
                <Save size={16} />
                Guardar Historial
              </button>
              <button className="btn btn-secondary" onClick={handleDownloadOpGastos} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <FileSpreadsheet size={16} />
                Exportar OP Gastos
              </button>
              <button className="btn btn-primary" onClick={handleDownloadExcel}>
                <Download size={16} />
                Descargar Excel con Fórmulas
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="search-bar" style={{ flex: 1 }}>
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Buscar por profesional, especialidad o matrícula..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', borderRadius: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <strong>💡 Tip de Edición Rápida:</strong> Haz doble clic sobre los valores de las columnas <strong>Tot. Valorizado</strong>, <strong>APROSS Cant.</strong>, <strong>Horizonte Cant.</strong> o <strong>Red Cant.</strong> para modificarlos manualmente. El motor recalculará todas las sumas y reglas de distribución en tiempo real.
          </div>

          <div className="table-container">
            <table className="copart-table">
              <thead>
                <tr>
                  <th>Fila</th>
                  <th>Especialidad / Servicio</th>
                  <th>Mat.</th>
                  <th>Profesional</th>
                  <th>% Cop.</th>
                  <th>Tot. Valorizado</th>
                  <th>Coseguros (F)</th>
                  <th>APROSS Cant. (G)</th>
                  <th>APROSS Cop. (J)</th>
                  <th>Horiz Cant. (K)</th>
                  <th>Horiz Cop. (M)</th>
                  <th>Red Cant. (N)</th>
                  <th>Red Cop. (P)</th>
                  <th>Subtotal (S)</th>
                  <th>Pago Final (T)</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, idx) => {
                  // Find index in original array
                  const originalIndex = calculatedData.rows.findIndex(r => r.row === row.row);
                  
                  // highlight classes based on rules
                  const isSpecialGroup = [8, 9, 10, 11, 22, 23, 56, 57, 74, 75, 76, 77, 78, 79, 83, 84, 85, 86].includes(row.row);
                  const isCardio = row.row >= 26 && row.row <= 34;

                  return (
                    <tr 
                      key={row.row} 
                      className={
                        isSpecialGroup ? 'row-highlight-violet' : isCardio ? 'row-highlight-cyan' : ''
                      }
                    >
                      <td style={{ color: 'var(--text-muted)' }}>{row.row}</td>
                      <td style={{ fontWeight: '500' }}>{row.service || '-'}</td>
                      <td>{row.mat || '-'}</td>
                      <td>
                        {row.prof ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>{row.prof}</span>
                            {isSpecialGroup && <span className="badge badge-violet">Especial</span>}
                            {isCardio && <span className="badge badge-cyan">Cardio</span>}
                          </div>
                        ) : '-'}
                      </td>
                      <td>{row.pct_copart ? `${(row.pct_copart * 100).toFixed(0)}%` : '-'}</td>
                      
                      {/* E: Tot Valorizado (Editable) */}
                      <td 
                        onDoubleClick={() => {
                          setEditingCell({ rowIndex: originalIndex, field: 'col_e' });
                          setEditingValue(row.col_e || 0);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        {editingCell?.rowIndex === originalIndex && editingCell?.field === 'col_e' ? (
                          <input 
                            type="number"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => handleCellEditSubmit(originalIndex, 'col_e')}
                            onKeyDown={(e) => e.key === 'Enter' && handleCellEditSubmit(originalIndex, 'col_e')}
                            autoFocus
                            style={{ width: '80px', padding: '0.2rem' }}
                          />
                        ) : (
                          <span style={{ borderBottom: '1px dashed rgba(255,255,255,0.2)' }}>
                            {formatCurrency(row.col_e)}
                          </span>
                        )}
                      </td>

                      {/* F: Coseguros */}
                      <td>{formatCurrency(row.col_f)}</td>

                      {/* G: APROSS Cant (Editable) */}
                      <td 
                        onDoubleClick={() => {
                          if (row.formulas && row.formulas.col_j === null) return; // not active
                          setEditingCell({ rowIndex: originalIndex, field: 'col_g' });
                          setEditingValue(row.col_g || 0);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        {editingCell?.rowIndex === originalIndex && editingCell?.field === 'col_g' ? (
                          <input 
                            type="number"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => handleCellEditSubmit(originalIndex, 'col_g')}
                            onKeyDown={(e) => e.key === 'Enter' && handleCellEditSubmit(originalIndex, 'col_g')}
                            autoFocus
                            style={{ width: '60px', padding: '0.2rem' }}
                          />
                        ) : (
                          <span style={{ borderBottom: row.formulas?.col_j ? '1px dashed rgba(255,255,255,0.2)' : 'none', color: row.formulas?.col_j ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                            {row.col_g || '-'}
                          </span>
                        )}
                      </td>
                      
                      {/* J: APROSS Copart */}
                      <td>{formatCurrency(row.col_j)}</td>

                      {/* K: Horizonte Cant (Editable) */}
                      <td 
                        onDoubleClick={() => {
                          if (row.formulas && row.formulas.col_m === null) return; // not active
                          setEditingCell({ rowIndex: originalIndex, field: 'col_k' });
                          setEditingValue(row.col_k || 0);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        {editingCell?.rowIndex === originalIndex && editingCell?.field === 'col_k' ? (
                          <input 
                            type="number"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => handleCellEditSubmit(originalIndex, 'col_k')}
                            onKeyDown={(e) => e.key === 'Enter' && handleCellEditSubmit(originalIndex, 'col_k')}
                            autoFocus
                            style={{ width: '60px', padding: '0.2rem' }}
                          />
                        ) : (
                          <span style={{ borderBottom: row.formulas?.col_m ? '1px dashed rgba(255,255,255,0.2)' : 'none', color: row.formulas?.col_m ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                            {row.col_k || '-'}
                          </span>
                        )}
                      </td>

                      {/* M: Horizonte Copart */}
                      <td>{formatCurrency(row.col_m)}</td>

                      {/* N: Red Cant (Editable) */}
                      <td 
                        onDoubleClick={() => {
                          if (row.formulas && row.formulas.col_p === null) return; // not active
                          setEditingCell({ rowIndex: originalIndex, field: 'col_n' });
                          setEditingValue(row.col_n || 0);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        {editingCell?.rowIndex === originalIndex && editingCell?.field === 'col_n' ? (
                          <input 
                            type="number"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => handleCellEditSubmit(originalIndex, 'col_n')}
                            onKeyDown={(e) => e.key === 'Enter' && handleCellEditSubmit(originalIndex, 'col_n')}
                            autoFocus
                            style={{ width: '60px', padding: '0.2rem' }}
                          />
                        ) : (
                          <span style={{ borderBottom: row.formulas?.col_p ? '1px dashed rgba(255,255,255,0.2)' : 'none', color: row.formulas?.col_p ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                            {row.col_n || '-'}
                          </span>
                        )}
                      </td>

                      {/* P: Red Copart */}
                      <td>{formatCurrency(row.col_p)}</td>

                      {/* S: Subtotal */}
                      <td className={row.col_s ? 'cell-highlight-violet' : ''}>
                        {row.col_s ? formatCurrency(row.col_s) : '-'}
                      </td>

                      {/* T: Pago Final */}
                      <td className="cell-highlight-violet" style={{ fontSize: '0.95rem' }}>
                        {formatCurrency(row.col_t)}
                      </td>
                    </tr>
                  );
                })}
                
                {/* TOTALS ROW (99) */}
                <tr className="totals-row" style={{ background: 'rgba(139,92,246,0.15)', fontWeight: 'bold' }}>
                  <td colSpan={2}>TOTALES LIQUIDACIÓN</td>
                  <td>-</td>
                  <td>(Suma Excluye Exentos)</td>
                  <td>-</td>
                  <td>{formatCurrency(calculatedData.totals.col_e)}</td>
                  <td>{formatCurrency(calculatedData.totals.col_f)}</td>
                  <td>-</td>
                  <td>{formatCurrency(calculatedData.totals.col_j)}</td>
                  <td>-</td>
                  <td>{formatCurrency(calculatedData.totals.col_m)}</td>
                  <td>-</td>
                  <td>{formatCurrency(calculatedData.totals.col_p)}</td>
                  <td>-</td>
                  <td style={{ color: 'var(--primary)', fontSize: '1.05rem' }}>
                    {formatCurrency(calculatedData.totals.col_t)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileProcessor;

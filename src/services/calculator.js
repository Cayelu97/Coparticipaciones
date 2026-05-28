/**
 * Motor de Cálculo para Coparticipación Médica
 * 
 * Este módulo realiza el procesamiento de las atenciones médicas y aplica
 * las reglas de tarifas, distribución y sub-atribución de Sanatorio Mayo S.A.
 */

// Helper to clean and parse numbers
const parseNum = (val) => {
  if (val === null || val === undefined) return 0;
  const num = parseFloat(val);
  return isNaN(num) ? 0 : num;
};

/**
 * Determina si una obra social corresponde a Red Prestacional / ART
 */
export const isRedPrestacional = (osName) => {
  if (!osName || typeof osName !== 'string') return false;
  const name = osName.toUpperCase();
  if (name.includes('RED PREST')) return true;
  if (name.includes('ASOCIART')) return true;
  if (name.includes('F PATRONAL')) return true;
  
  // Match word ART using word boundary
  const artRegex = /\bART\b/i;
  return artRegex.test(osName);
};

// Dynamic Formula Evaluators

const evaluateCoseguro = (p, results) => {
  const formula = p.formulas ? p.formulas.col_f : null;
  if (formula === null) return 0;
  if (formula === undefined) return p.col_e * parseNum(p.pct_copart);
  if (!formula.startsWith('=')) {
    return parseNum(formula); // Valor fijo
  }

  const getE = (rowNum) => {
    const r = results.find(row => row.row === rowNum);
    return r ? (r.col_e || 0) : 0;
  };
  const getF = (rowNum) => {
    const r = results.find(row => row.row === rowNum);
    return r ? (r.col_f || 0) : 0;
  };

  // Special cases:
  // Leonardi: =(E56+E57)*D56
  if (p.row === 56) {
    return (getE(56) + getE(57)) * parseNum(p.pct_copart);
  }

  // Beningazza: =(E86*$D$86)+F83+F84+F85
  if (p.row === 86) {
    return (p.col_e * parseNum(p.pct_copart)) + getF(83) + getF(84) + getF(85);
  }

  // Anauch: =(E31*D31)+F26+F27+F28+F29+F30
  if (p.row === 31) {
    return (p.col_e * parseNum(p.pct_copart)) + getF(26) + getF(27) + getF(28) + getF(29) + getF(30);
  }

  // General case: =E4*D4 or =E4*$D$4
  return p.col_e * parseNum(p.pct_copart);
};

const evaluateAprossCopart = (p, results) => {
  const formula = p.formulas ? p.formulas.col_j : null;
  if (formula === null || formula === undefined) return 0;
  if (!formula.startsWith('=')) return parseNum(formula);

  const getJ = (rowNum) => {
    const r = results.find(row => row.row === rowNum);
    return r ? (r.col_j || 0) : 0;
  };

  // Check for Beningazza: =(I86*$D$86)+J83+J84+J85
  if (p.row === 86) {
    return (p.col_i * parseNum(p.pct_copart)) + getJ(83) + getJ(84) + getJ(85);
  }

  // Check for Cooke: =D8*E8 or =E8*D8
  if (p.row === 8) {
    return parseNum(p.pct_copart) * p.col_e;
  }

  // Default: =I4*D4 or =I4*$D$4
  return p.col_i * parseNum(p.pct_copart);
};

const evaluateHorizCopart = (p, results) => {
  const formula = p.formulas ? p.formulas.col_m : null;
  if (formula === null || formula === undefined) return 0;
  if (!formula.startsWith('=')) return parseNum(formula);

  const getM = (rowNum) => {
    const r = results.find(row => row.row === rowNum);
    return r ? (r.col_m || 0) : 0;
  };

  // Check for Beningazza: =(L86*$D$86)+M83+M84+M85
  if (p.row === 86) {
    return (p.col_l * parseNum(p.pct_copart)) + getM(83) + getM(84) + getM(85);
  }

  // Default: =L4*D4 or =L4*$D$4
  return p.col_l * parseNum(p.pct_copart);
};

const evaluateRedCopart = (p, results) => {
  const formula = p.formulas ? p.formulas.col_p : null;
  if (formula === null || formula === undefined) return 0;
  if (!formula.startsWith('=')) return parseNum(formula);

  // Default: =O4*D4 or =O4*$D$4
  return p.col_o * parseNum(p.pct_copart);
};

const evaluateTotalCopart = (p, results) => {
  const formula = p.formulas ? p.formulas.col_q : null;
  if (formula === null || formula === undefined) return 0;
  if (!formula.startsWith('=')) return parseNum(formula);
  
  if (p.row === 6) {
    return p.col_e;
  }
  if (p.row === 58) {
    return p.col_f + p.col_j + p.col_m;
  }
  
  return p.col_f + p.col_j + p.col_m + p.col_p;
};

const evaluateSubtotal = (formulaStr, results) => {
  if (!formulaStr || !formulaStr.startsWith('=')) return 0;
  
  const getVal = (rowNum) => {
    const row = results.find(r => r.row === rowNum);
    return row ? (row.col_q || 0) : 0;
  };

  // Parse range: =SUM(Q4:Q5)
  const rangeMatch = formulaStr.match(/=SUM\(Q(\d+):Q(\d+)\)/i);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1]);
    const end = parseInt(rangeMatch[2]);
    let sum = 0;
    for (let r = start; r <= end; r++) {
      sum += getVal(r);
    }
    return sum;
  }

  // Parse addition: =SUM(Q14+Q15) or =SUM(Q14+Q15+Q16)
  if (formulaStr.includes('+')) {
    const rows = formulaStr.match(/\d+/g).map(Number);
    let sum = 0;
    rows.forEach(r => {
      sum += getVal(r);
    });
    return sum;
  }

  // Parse single: =Q39 or =SUM(Q7)
  const singleMatch = formulaStr.match(/Q(\d+)/i);
  if (singleMatch) {
    return getVal(parseInt(singleMatch[1]));
  }

  return 0;
};

const evaluatePagoFinal = (p, results) => {
  const formula = p.formulas ? p.formulas.col_t : null;
  if (!formula) return 0;
  if (!formula.startsWith('=')) {
    return parseNum(formula);
  }

  const getColVal = (colLetter, rowNum) => {
    const row = results.find(r => r.row === rowNum);
    if (!row) return 0;
    if (colLetter === 'Q') return row.col_q || 0;
    if (colLetter === 'S') return row.col_s || 0;
    if (colLetter === 'R') return parseNum(row.pct_dist);
    return 0;
  };

  // Check for division: =$S$79/6
  const divMatch = formula.match(/S\$?(\d+)\/(\d+)/i);
  if (divMatch) {
    const rowNum = parseInt(divMatch[1]);
    const divisor = parseInt(divMatch[2]);
    const sVal = getColVal('S', rowNum);
    return sVal / divisor;
  }

  // Check for multiplication: =$S$11*R8 or =Q23*R22
  const multMatch = formula.match(/([QS])\$?(\d+)\*R\$?(\d+)/i);
  if (multMatch) {
    const colLetter = multMatch[1].toUpperCase();
    const rowValNum = parseInt(multMatch[2]);
    const rowDistNum = parseInt(multMatch[3]);
    const val = getColVal(colLetter, rowValNum);
    const dist = getColVal('R', rowDistNum);
    return val * dist;
  }

  // Check for subtotal: =S15
  const subMatch = formula.match(/^=S(\d+)$/i);
  if (subMatch) {
    return getColVal('S', parseInt(subMatch[1]));
  }

  // Check for own/other Q: =Q4
  const qMatch = formula.match(/^=Q(\d+)$/i);
  if (qMatch) {
    return getColVal('Q', parseInt(qMatch[1]));
  }

  return p.col_q || 0;
};

/**
 * Realiza el cálculo completo a partir de las filas de atenciones médicas
 * 
 * @param {Array} rawRows - Filas leídas del listado Excel original
 * @param {Array} providers - Lista de prestadores desde la base de datos
 * @param {Object} settings - Tarifas y multiplicadores configurados
 * @returns {Object} Resultados calculados fila por fila y totales generales
 */
const evaluateAprossVal = (p, results, tariffs) => {
  const formula = p.formulas ? p.formulas.col_h : null;
  if (formula === null) return 0;
  if (formula === undefined) {
    return p.col_g * tariffs.apross;
  }
  if (!formula.startsWith('=')) return parseNum(formula);

  // Check if it matches G{rowNum}*$H$3
  const match = formula.match(/G(\d+)\*\$H\$3/i);
  if (match) {
    const rowNum = parseInt(match[1]);
    const r = results.find(row => row.row === rowNum);
    const count = r ? (r.col_g || 0) : 0;
    return count * tariffs.apross;
  }

  return p.col_g * tariffs.apross;
};

const evaluateApross96 = (p, results, multipliers) => {
  const formula = p.formulas ? p.formulas.col_i : null;
  if (formula === null) return 0;
  if (formula === undefined) {
    return p.col_h * multipliers.apross;
  }
  if (!formula.startsWith('=')) return parseNum(formula);

  // Check for H{row}*$I$3
  const match = formula.match(/H(\d+)\*\$I\$3/i);
  if (match) {
    const rowNum = parseInt(match[1]);
    const r = results.find(row => row.row === rowNum);
    const val = r ? (r.col_h || 0) : 0;
    return val * multipliers.apross;
  }

  return p.col_h * multipliers.apross;
};

const evaluateHorizVal = (p, results, tariffs) => {
  const formula = p.formulas ? p.formulas.col_l : null;
  if (formula === null) return 0;
  if (formula === undefined) {
    return p.col_k * tariffs.horizonte;
  }
  if (!formula.startsWith('=')) return parseNum(formula);

  // Check for K{row}*$L$3
  const match = formula.match(/K(\d+)\*\$L\$3/i);
  if (match) {
    const rowNum = parseInt(match[1]);
    const r = results.find(row => row.row === rowNum);
    const count = r ? (r.col_k || 0) : 0;
    return count * tariffs.horizonte;
  }

  return p.col_k * tariffs.horizonte;
};

const evaluateRedVal = (p, results, tariffs) => {
  const formula = p.formulas ? p.formulas.col_o : null;
  if (formula === null) return 0;
  if (formula === undefined) {
    return p.col_n * tariffs.redPrestacional;
  }
  if (!formula.startsWith('=')) return parseNum(formula);

  // Check for N{row}*$O$3
  const match = formula.match(/N(\d+)\*\$O\$3/i);
  if (match) {
    const rowNum = parseInt(match[1]);
    const r = results.find(row => row.row === rowNum);
    const count = r ? (r.col_n || 0) : 0;
    return count * tariffs.redPrestacional;
  }

  return p.col_n * tariffs.redPrestacional;
};

/**
 * Realiza el cálculo completo a partir de las filas de atenciones médicas
 * 
 * @param {Array} rawRows - Filas leídas del listado Excel original
 * @param {Array} providers - Lista de prestadores desde la base de datos
 * @param {Object} settings - Tarifas y multiplicadores configurados
 * @returns {Object} Resultados calculados fila por fila y totales generales
 */
export const calculateCoparticipation = (rawRows, providers, settings) => {
  const { tariffs, multipliers } = settings;
  
  // clonamos los prestadores para no mutar el estado de la base de datos
  const results = providers.map(p => ({
    ...p,
    me_cose_sum: 0,
    apross_count: 0,
    horiz_count: 0,
    red_count: 0,
    // Valores de salida por columna
    col_e: 0, // Total Valorizado
    col_f: 0, // Coseguro Coparticipado
    col_g: 0, // APROSS Cantidad
    col_h: 0, // APROSS Valorizado
    col_i: 0, // APROSS 96%
    col_j: 0, // APROSS Copart
    col_k: 0, // Horizonte Cantidad
    col_l: 0, // Horizonte Valorizado
    col_m: 0, // Horizonte Copart
    col_n: 0, // Red Cantidad
    col_o: 0, // Red Valorizado
    col_p: 0, // Red Copart
    col_q: 0, // Total Copart
    col_s: 0, // Subtotales
    col_t: 0, // Pago Final
    is_calculated: false
  }));

  // Crear mapa de prestadores por matrícula para acceso rápido (solo profesionales)
  const providersMap = {};
  results.forEach(p => {
    if (p.mat !== null && p.mat !== undefined && String(p.mat).trim().toUpperCase() !== 'SERV.') {
      const mStr = String(p.mat).trim();
      if (!providersMap[mStr]) {
        providersMap[mStr] = [];
      }
      providersMap[mStr].push(p);
    }
  });

  // --- PASO 1: AGREGACIÓN DE DATOS RAW ---
  rawRows.forEach(row => {
    const mat = row.pre_matp;
    const osName = row.os_nombre ? String(row.os_nombre).trim() : '';
    const nomCod = row.nom_cod ? String(row.nom_cod).trim() : '';
    const servNombre = row.serv_nombre ? String(row.serv_nombre).trim() : '';
    const meCose = parseNum(row.me_cose);

    // A. Agregar por profesional (matrícula)
    if (mat !== null && mat !== undefined) {
      const mStr = String(mat).trim();
      const matchedProviders = providersMap[mStr];
      if (matchedProviders) {
        matchedProviders.forEach(p => {
          // Para Coseguros, filtramos por servicio si el prestador tiene raw_services configurados
          let matchService = true;
          if (p.raw_services && p.raw_services.length > 0) {
            if (!p.raw_services.includes(servNombre)) matchService = false;
          }
          
          if (matchService) {
            p.me_cose_sum += meCose;
          }

          // Para Consultas Directas (código 420101), NO filtramos por servicio.
          // Contamos todas las del profesional independientemente de la especialidad
          const codeVal = parseInt(nomCod, 10);
          if (codeVal >= 420101 && codeVal <= 420199) {
            if (osName === 'APROSS (1)') {
              p.apross_count++;
            } else if (osName === 'COOP. HORIZONTE (21)') {
              p.horiz_count++;
            } else if (isRedPrestacional(osName)) {
              p.red_count++;
            }
          }
        });
      }
    }

    // B. Agregar por servicio (para filas con mat === "SERV.")
    results.forEach(p => {
      if (p.mat !== null && typeof p.mat === 'string' && p.mat.trim().toUpperCase() === 'SERV.') {
        if (p.raw_services && p.raw_services.includes(servNombre)) {
          p.me_cose_sum += meCose;
        }
      }
    });
  });

  // Sort results by row number to satisfy evaluation dependencies
  results.sort((a, b) => a.row - b.row);

  return recalculateFromAggregated(results, settings);
};

export const recalculateFromAggregated = (results, settings) => {
  const { tariffs, multipliers } = settings;

  // --- PASO 2: PRIMER PASO DE FÓRMULAS INDIVIDUALES ---
  results.forEach(p => {
    if (!p.prof) return;

    p.is_calculated = true;
    p.col_e = p.exclude_coseguros ? 0 : p.me_cose_sum;

    // Columna G: APROSS Cantidad (Solo si tiene fórmula de APROSS y no está anulado por exclude_directs)
    const hasAprossFormula = p.formulas && p.formulas.col_j !== null;
    p.col_g = (hasAprossFormula && !p.exclude_directs) ? p.apross_count : 0;
    
    // Columna K: Horizonte Cantidad
    const hasHorizFormula = p.formulas && p.formulas.col_m !== null;
    p.col_k = (hasHorizFormula && !p.exclude_directs) ? p.horiz_count : 0;

    // Columna N: Red Cantidad
    const hasRedFormula = p.formulas && p.formulas.col_p !== null;
    p.col_n = (hasRedFormula && !p.exclude_directs) ? p.red_count : 0;
  });

  // Evaluar valores y columnas 96% después de que las cantidades se hayan establecido para todos
  results.forEach(p => {
    if (!p.prof) return;
    p.col_h = evaluateAprossVal(p, results, tariffs);
    p.col_i = evaluateApross96(p, results, multipliers);
    p.col_l = evaluateHorizVal(p, results, tariffs);
    p.col_o = evaluateRedVal(p, results, tariffs);
  });

  // --- PASO 3: SEGUNDO PASO (COSEGUROS Y COPARTICIPACIONES EN ORDEN DE FILAS) ---
  results.forEach(p => {
    if (!p.prof) return;
    
    p.col_f = evaluateCoseguro(p, results);
    p.col_j = evaluateAprossCopart(p, results);
    p.col_m = evaluateHorizCopart(p, results);
    p.col_p = evaluateRedCopart(p, results);
    p.col_q = evaluateTotalCopart(p, results);
  });

  // --- PASO 4: TERCER PASO (SUBTOTALES) ---
  results.forEach(p => {
    if (!p.prof) return;
    
    if (p.formulas && p.formulas.col_s) {
      p.col_s = evaluateSubtotal(p.formulas.col_s, results);
    }
  });

  // --- PASO 5: CUARTO PASO (PAGOS FINALES) ---
  results.forEach(p => {
    if (!p.prof) return;
    
    p.col_t = evaluatePagoFinal(p, results);
  });

  // --- PASO 6: CÁLCULO DE TOTALES GENERALES (Fila 99) ---
  const excludeRows = [53];
  const sumCols = ['col_e', 'col_f', 'col_j', 'col_m', 'col_p', 'col_q', 'col_t'];
  
  const totals = {
    col_e: 0,
    col_f: 0,
    col_j: 0,
    col_m: 0,
    col_p: 0,
    col_q: 0,
    col_t: 0
  };

  results.forEach(p => {
    if (!p.prof) return;
    if (excludeRows.includes(p.row)) return;
    
    sumCols.forEach(col => {
      totals[col] += p[col] || 0;
    });
  });

  return {
    rows: results,
    totals
  };
};

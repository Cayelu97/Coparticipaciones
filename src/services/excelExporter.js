import ExcelJS from 'exceljs';

/**
 * Remueve el signo '=' inicial de una fórmula si existe,
 * ya que ExcelJS requiere las fórmulas sin el signo '='.
 */
const cleanFormula = (formulaStr) => {
  if (!formulaStr) return null;
  if (formulaStr.startsWith('=')) {
    return formulaStr.substring(1);
  }
  return formulaStr;
};

/**
 * Exporta los resultados calculados a un archivo Excel basado en la plantilla original.
 * 
 * @param {Array} calculatedRows - Filas de resultados calculadas
 * @param {number} month - Número de mes (1-12)
 * @param {number} year - Año
 * @returns {Promise<Blob>} Blob del archivo Excel para descarga
 */
export const exportToExcel = async (calculatedRows, month, year, settings) => {
  const monthNames = [
    'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
  ];
  
  const targetSheetName = `${monthNames[month - 1]} ${year}`;
  
  // 1. Cargar la plantilla desde la carpeta pública
  const response = await fetch('/template.xlsx');
  if (!response.ok) {
    throw new Error('No se pudo cargar la plantilla Excel de base (/template.xlsx).');
  }
  const arrayBuffer = await response.arrayBuffer();
  
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  
  // 2. Obtener o crear la pestaña del mes
  let worksheet = workbook.getWorksheet(targetSheetName);
  
  if (!worksheet) {
    // Si no existe, buscamos una pestaña de referencia (ej. MARZO 2026 o la primera que encontremos)
    // para copiar su estructura y estilos
    const refSheet = workbook.getWorksheet('MARZO 2026') || workbook.worksheets[0];
    if (!refSheet) {
      throw new Error('No se encontró ninguna pestaña de referencia en la plantilla.');
    }
    
    // Clonar la hoja de referencia
    worksheet = workbook.addWorksheet(targetSheetName);
    
    // Copiar celdas y estilos de la hoja de referencia
    refSheet.eachRow({ includeEmpty: true }, (row, rowNum) => {
      const newRow = worksheet.getRow(rowNum);
      
      row.eachCell({ includeEmpty: true }, (cell, colNum) => {
        const newCell = newRow.getCell(colNum);
        
        // Copiar valor o fórmula
        if (cell.value && typeof cell.value === 'object' && cell.value.formula) {
          newCell.value = { formula: cell.value.formula };
        } else {
          newCell.value = cell.value;
        }
        
        // Copiar estilo
        newCell.style = JSON.parse(JSON.stringify(cell.style || {}));
      });
      
      newRow.height = row.height;
    });
    
    // Copiar anchos de columnas
    refSheet.columns.forEach((col, idx) => {
      const targetCol = worksheet.columns[idx];
      if (targetCol && col.width) {
        targetCol.width = col.width;
      }
    });
  }

  // Escribir los montos fijos globales de las tarifas en la fila 3
  if (settings) {
    const { tariffs, multipliers } = settings;
    if (tariffs) {
      if (tariffs.apross !== undefined) worksheet.getCell('H3').value = tariffs.apross;
      if (tariffs.horizonte !== undefined) worksheet.getCell('L3').value = tariffs.horizonte;
      if (tariffs.redPrestacional !== undefined) worksheet.getCell('O3').value = tariffs.redPrestacional;
    }
    if (multipliers && multipliers.apross !== undefined) {
      worksheet.getCell('I3').value = multipliers.apross;
    }
  }

  // 3. Escribir los valores y fórmulas en la hoja
  calculatedRows.forEach(p => {
    const rowNum = p.row;
    
    // Columna E: Total Valorizado (Coseguro)
    const cellE = worksheet.getCell(rowNum, 5); // Columna 5 is E
    cellE.value = p.col_e || 0;

    // Columna G: APROSS Cantidad
    const cellG = worksheet.getCell(rowNum, 7); // Columna 7 is G
    cellG.value = p.col_g > 0 ? p.col_g : null;

    // Columna K: Horizonte Cantidad
    const cellK = worksheet.getCell(rowNum, 11); // Columna 11 is K
    cellK.value = p.col_k > 0 ? p.col_k : null;

    // Columna N: Red Cantidad
    const cellN = worksheet.getCell(rowNum, 14); // Columna 14 is N
    cellN.value = p.col_n > 0 ? p.col_n : null;

    // Escribir fórmulas o valores para celdas calculadas (F, H, I, J, L, M, O, P, Q, S, T)
    const writeFormulaOrValue = (colLetter, colNum, val, formulaField) => {
      const cell = worksheet.getCell(rowNum, colNum);
      const formula = p.formulas ? p.formulas[formulaField] : null;
      
      if (formula) {
        // Si hay una fórmula en el maestro de profesionales, la escribimos limpia
        cell.value = { formula: cleanFormula(formula) };
      } else if (formula === null && p.formulas && formulaField in p.formulas) {
        // Si está explícitamente marcada como null en las fórmulas, es porque no calcula nada
        cell.value = null;
      } else {
        // En su defecto escribimos el valor numérico
        cell.value = val !== undefined && val !== null ? val : null;
      }
    };

    writeFormulaOrValue('F', 6, p.col_f, 'col_f');
    writeFormulaOrValue('H', 8, p.col_h, 'col_h');
    writeFormulaOrValue('I', 9, p.col_i, 'col_i');
    writeFormulaOrValue('J', 10, p.col_j, 'col_j');
    writeFormulaOrValue('L', 12, p.col_l, 'col_l');
    writeFormulaOrValue('M', 13, p.col_m, 'col_m');
    writeFormulaOrValue('O', 15, p.col_o, 'col_o');
    writeFormulaOrValue('P', 16, p.col_p, 'col_p');
    writeFormulaOrValue('Q', 17, p.col_q, 'col_q');
    writeFormulaOrValue('S', 19, p.col_s, 'col_s');
    writeFormulaOrValue('T', 20, p.col_t, 'col_t');
  });

  // 4. Generar el buffer final y retornar el Blob
  const buffer = await workbook.xlsx.writeBuffer();
  
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
};

/**
 * Exporta el listado de Orden de Pago (OP) Gastos para contabilidad.
 */
export const exportOpGastosToExcel = async (calculatedRows, month, year) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('OP Gastos');

  // Definición de columnas
  worksheet.columns = [
    { header: 'Matrícula', key: 'mat', width: 15 },
    { header: 'Nombre del Prestador', key: 'prof', width: 35 },
    { header: 'Comprobante', key: 'comprobante', width: 25 },
    { header: 'Fecha', key: 'fecha', width: 15 },
    { header: 'Concepto', key: 'concepto', width: 45 },
    { header: 'Importe', key: 'importe', width: 18 }
  ];

  // Estilo de encabezados
  worksheet.getRow(1).font = { name: 'Inter', bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' } // Premium Indigo header
  };
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(1).height = 28;

  // Fecha: último día del mes procesado
  const lastDay = new Date(year, month, 0).getDate();
  const dateStr = `${String(lastDay).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;

  // Concepto dinámico mensual
  const monthAbbrs = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  const yy = String(year).slice(-2);
  const conceptoStr = `Copartic. APROSS+COSEG+PART - ${monthAbbrs[month - 1]}/${yy}`;

  // Filtrar médicos reales con importes no nulos y distintos de cero
  const validRows = calculatedRows.filter(r => 
    r.prof && 
    r.mat && 
    String(r.mat).toUpperCase() !== 'SERV.' &&
    r.col_t !== null && 
    r.col_t !== undefined && 
    r.col_t !== 0
  );

  // Agregar filas de datos
  validRows.forEach(p => {
    const row = worksheet.addRow({
      mat: p.mat,
      prof: p.prof,
      comprobante: 'Orden de pago gastos',
      fecha: dateStr,
      concepto: conceptoStr,
      importe: p.col_t
    });

    row.getCell('mat').alignment = { horizontal: 'center' };
    row.getCell('fecha').alignment = { horizontal: 'center' };
    row.getCell('importe').numFmt = '$#,##0.00';
    row.getCell('importe').alignment = { horizontal: 'right' };
  });

  // Agregar fila de totales
  if (validRows.length > 0) {
    const totalRow = worksheet.addRow({
      mat: '',
      prof: 'TOTAL GENERAL',
      comprobante: '',
      fecha: '',
      concepto: '',
      importe: { formula: `SUM(F2:F${validRows.length + 1})` }
    });
    
    totalRow.font = { name: 'Inter', bold: true };
    totalRow.getCell('importe').numFmt = '$#,##0.00';
    totalRow.getCell('importe').alignment = { horizontal: 'right' };
  }

  // Bordes y estilos generales
  worksheet.eachRow((row, rowNum) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      };
      if (rowNum === 1) return;
      cell.font = { name: 'Inter', size: 10 };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
};

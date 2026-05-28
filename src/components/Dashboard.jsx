import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  DollarSign, 
  Users, 
  FileSpreadsheet, 
  ArrowUpRight,
  TrendingUp
} from 'lucide-react';

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

const Dashboard = ({ history = [], providers = [], onNavigate, readOnly = false }) => {
  const [selectedPeriod, setSelectedPeriod] = React.useState('latest');

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const monthNamesShort = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  // Determine active dataset
  let activePeriodLabel = '';
  let totalPaid = 0;
  let totalValorizado = 0;
  let totalAttentions = 0;
  let breakdownData = [];
  let serviceData = [];

  const lastCalculation = history.length > 0 ? history[0] : null;

  if (history.length > 0) {
    let targetItems = [];
    
    if (selectedPeriod === 'all') {
      targetItems = history;
      activePeriodLabel = 'Acumulado (Todos los períodos)';
    } else if (selectedPeriod === 'latest') {
      targetItems = [history[0]];
      activePeriodLabel = `Último Período (${monthNames[history[0].month - 1]} ${history[0].year})`;
    } else {
      const found = history.find(h => h.id === selectedPeriod);
      if (found) {
        targetItems = [found];
        activePeriodLabel = `${monthNames[found.month - 1]} ${found.year}`;
      } else {
        targetItems = [history[0]];
        activePeriodLabel = `Último Período (${monthNames[history[0].month - 1]} ${history[0].year})`;
      }
    }

    // Sum up KPIs
    targetItems.forEach(h => {
      totalPaid += h.totals.col_t || 0;
      totalValorizado += h.totals.col_e || 0;
      totalAttentions += h.totalRowsCount || 0;
    });

    // Sum up concepts breakdown for Pie Chart
    let cosegurosSum = 0;
    let aprossSum = 0;
    let horizSum = 0;
    let redSum = 0;

    targetItems.forEach(h => {
      cosegurosSum += h.totals.col_f || 0;
      aprossSum += h.totals.col_j || 0;
      horizSum += h.totals.col_m || 0;
      redSum += h.totals.col_p || 0;
    });

    breakdownData = [
      { name: 'Coseguros', value: cosegurosSum },
      { name: 'APROSS', value: aprossSum },
      { name: 'Horizonte', value: horizSum },
      { name: 'Red / ART', value: redSum }
    ].filter(d => d.value > 0);

    // Sum up service breakdown
    const serviceMap = {};
    targetItems.forEach(h => {
      h.rows.forEach(r => {
        if (!r.prof || !r.col_t) return;
        const sName = r.service || 'Otros';
        serviceMap[sName] = (serviceMap[sName] || 0) + r.col_t;
      });
    });

    serviceData = Object.entries(serviceMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }

  const activeProvidersCount = providers.filter(p => p.prof && p.mat !== null).length;

  // History trend data sorted chronologically (oldest first / left to right)
  const trendData = [...history]
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    })
    .map(h => {
      return {
        name: `${monthNamesShort[h.month - 1]} ${String(h.year).slice(-2)}`,
        Coseguros: h.totals.col_f,
        APROSS: h.totals.col_j,
        Horizonte: h.totals.col_m,
        Red: h.totals.col_p,
        Total: h.totals.col_t
      };
    });

  const handleChartClick = (state) => {
    if (state && state.activePayload && state.activePayload.length > 0) {
      const clickedName = state.activeLabel; // e.g., "Ene 26"
      const found = history.find(h => {
        const name = `${monthNamesShort[h.month - 1]} ${String(h.year).slice(-2)}`;
        return name === clickedName;
      });
      if (found) {
        setSelectedPeriod(found.id);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Resumen de Coparticipaciones</h1>
          <p>Panel principal para el control y análisis de liquidaciones médicas.</p>
        </div>

        {history.length > 0 && (
          <div className="input-group" style={{ width: '280px', margin: 0 }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block', fontWeight: '500' }}>
              Filtrar Período
            </label>
            <select 
              value={selectedPeriod} 
              onChange={(e) => setSelectedPeriod(e.target.value)}
              style={{ 
                background: 'rgba(255,255,255,0.05)', 
                backdropFilter: 'blur(10px)', 
                border: '1px solid var(--border-light)',
                padding: '0.5rem',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                width: '100%',
                cursor: 'pointer'
              }}
            >
              <option value="latest">Último Período ({monthNames[history[0].month - 1]} {history[0].year})</option>
              <option value="all">Acumulado (Todos los períodos)</option>
              {history.map(h => (
                <option key={h.id} value={h.id}>
                  {monthNames[h.month - 1]} {h.year}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid">
        <div className="glass-card kpi-card">
          <div className="kpi-header">
            <span>Total Coparticipado</span>
            <DollarSign size={20} style={{ color: 'var(--primary)' }} />
          </div>
          <div className="kpi-value">{formatCurrency(totalPaid)}</div>
          <div className="kpi-trend" style={{ color: 'var(--text-muted)' }}>
            <TrendingUp size={14} style={{ color: 'var(--primary)', marginRight: '4px' }} />
            <span>{activePeriodLabel}</span>
          </div>
        </div>

        <div className="glass-card kpi-card">
          <div className="kpi-header">
            <span>Total Valorizado Raw</span>
            <DollarSign size={20} style={{ color: 'var(--secondary)' }} />
          </div>
          <div className="kpi-value">{formatCurrency(totalValorizado)}</div>
          <div className="kpi-trend" style={{ color: 'var(--text-muted)' }}>
            <span>Coseguros en bruto</span>
          </div>
        </div>

        <div className="glass-card kpi-card">
          <div className="kpi-header">
            <span>Atenciones Procesadas</span>
            <FileSpreadsheet size={20} style={{ color: 'var(--success)' }} />
          </div>
          <div className="kpi-value">{totalAttentions.toLocaleString('es-AR')}</div>
          <div className="kpi-trend" style={{ color: 'var(--text-muted)' }}>
            <span>Consultas y prácticas</span>
          </div>
        </div>

        <div className="glass-card kpi-card">
          <div className="kpi-header">
            <span>Prestadores Registrados</span>
            <Users size={20} style={{ color: 'var(--warning)' }} />
          </div>
          <div className="kpi-value">{activeProvidersCount}</div>
          <div className="kpi-trend" style={{ color: 'var(--text-muted)' }}>
            <span>Médicos en base de datos</span>
          </div>
        </div>
      </div>

      {lastCalculation ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem' }}>
          {/* Chart 1: Breakdown Pie */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '350px' }}>
            <h3>Distribución por Obra Social/Concepto ({selectedPeriod === 'all' ? 'Acumulado' : activePeriodLabel})</h3>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={breakdownData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {breakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Top Services Bar */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '350px' }}>
            <h3>Top Especialidades por Pago Final</h3>
            <div style={{ flex: 1 }}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={serviceData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" tickFormatter={(v) => `$${v/1000}k`} stroke="var(--text-muted)" />
                  <YAxis dataKey="name" type="category" width={100} stroke="var(--text-muted)" style={{ fontSize: '0.75rem' }} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="value" fill="var(--primary)" radius={[0, 4, 4, 0]}>
                    {serviceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Trends Line/Bar (Visible if we have history > 1 month) */}
          {trendData.length > 1 && (
            <div className="glass-card" style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '350px' }}>
              <h3>Evolución Mensual de Coparticipaciones</h3>
              <div style={{ flex: 1 }}>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={trendData} onClick={handleChartClick} style={{ cursor: 'pointer' }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="var(--text-muted)" />
                    <YAxis tickFormatter={(v) => `$${v/1000}k`} stroke="var(--text-muted)" />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="Coseguros" stackId="a" fill="#8b5cf6" />
                    <Bar dataKey="APROSS" stackId="a" fill="#06b6d4" />
                    <Bar dataKey="Horizonte" stackId="a" fill="#10b981" />
                    <Bar dataKey="Red" stackId="a" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-card" style={{ padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
          <FileSpreadsheet size={64} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
          <div>
            <h2>No hay liquidaciones procesadas</h2>
            <p style={{ marginTop: '0.5rem' }}>Sube tu primer listado de atenciones en Excel para comenzar a visualizar métricas de rendimiento y gráficos mensuales.</p>
          </div>
          {!readOnly && (
            <button className="btn btn-primary" onClick={() => onNavigate('processor')}>
              Procesar Primer Archivo
              <ArrowUpRight size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;

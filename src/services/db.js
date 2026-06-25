import { createClient } from '@supabase/supabase-js';
import defaultProviders from '../data/professionals_db.json';

// Local Storage Keys
const PROVIDERS_KEY = 'copart_providers';
const SETTINGS_KEY = 'copart_settings';
const HISTORY_KEY = 'copart_history';

// Default Settings (Tariffs for direct practices)
const DEFAULT_SETTINGS = {
  tariffs: {
    apross: 12000,
    horizonte: 14606,
    redPrestacional: 17300
  },
  multipliers: {
    apross: 0.96
  }
};

// Supabase Configuration from Environment Variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validar que la URL sea válida y no sea un marcador de posición
const isValidUrl = (url) => {
  if (!url) return false;
  const urlStr = String(url).trim();
  if (urlStr === '' || urlStr.includes('PLACEHOLDER') || urlStr.includes('YOUR_SUPABASE')) {
    return false;
  }
  try {
    new URL(urlStr);
    return true;
  } catch (e) {
    return false;
  }
};

let client = null;
let active = false;

if (supabaseUrl && supabaseAnonKey && isValidUrl(supabaseUrl)) {
  try {
    client = createClient(supabaseUrl, supabaseAnonKey);
    active = true;
  } catch (err) {
    console.error('Error al inicializar el cliente de Supabase:', err);
    active = false;
  }
}

export const hasSupabase = active;
export const supabase = client;

if (hasSupabase) {
  console.log('⚡ Conectado exitosamente al cliente de Supabase.');
} else {
  console.warn('⚠️ Credenciales de Supabase ausentes, inválidas o marcadores de posición. Utilizando LocalStorage como base de datos por defecto.');
}

export const dbService = {
  // --- PROVIDERS (PROFESIONALES) ---
  getProviders: async () => {
    if (hasSupabase) {
      try {
        const { data, error } = await supabase
          .from('providers')
          .select('*')
          .order('row', { ascending: true });
        
         if (error) throw error;
         if (data && data.length > 0) {
           return data.map(p => ({
             row: p.row,
             service: p.service,
             mat: p.mat === null ? null : (isNaN(Number(p.mat)) ? p.mat : Number(p.mat)),
             prof: p.prof,
             pct_copart: p.pct_copart !== null ? parseFloat(p.pct_copart) : null,
             pct_dist: p.pct_dist !== null ? parseFloat(p.pct_dist) : null,
             rule: p.rule,
             formulas: p.formulas,
             raw_services: p.raw_services || [],
             exclude_coseguros: p.exclude_coseguros || false,
             exclude_directs: p.exclude_directs || false
           }));
         }
      } catch (err) {
        console.warn('Error al obtener prestadores desde Supabase, cayendo a LocalStorage:', err);
      }
    }
    
    try {
      const stored = localStorage.getItem(PROVIDERS_KEY);
      if (!stored) {
        localStorage.setItem(PROVIDERS_KEY, JSON.stringify(defaultProviders));
        return defaultProviders;
      }
      return JSON.parse(stored);
    } catch (e) {
      console.error('Error al leer prestadores desde localStorage', e);
      return defaultProviders;
    }
  },

  saveProviders: async (providers) => {
    if (hasSupabase) {
      try {
        const dbProviders = providers.map(p => ({
          row: p.row,
          service: p.service,
          mat: p.mat !== null ? String(p.mat) : null,
          prof: p.prof,
          pct_copart: p.pct_copart,
          pct_dist: p.pct_dist,
          rule: p.rule,
          formulas: p.formulas,
          raw_services: p.raw_services || [],
          exclude_coseguros: p.exclude_coseguros || false,
          exclude_directs: p.exclude_directs || false
        }));

        const { error } = await supabase.from('providers').upsert(dbProviders);
        if (error) throw error;
      } catch (err) {
        console.error('Error al guardar prestadores en Supabase:', err);
      }
    }

    try {
      localStorage.setItem(PROVIDERS_KEY, JSON.stringify(providers));
      return true;
    } catch (e) {
      console.error('Error al guardar prestadores en localStorage', e);
      return false;
    }
  },

  resetProviders: async () => {
    if (hasSupabase) {
      try {
        const dbProviders = defaultProviders.map(p => ({
          row: p.row,
          service: p.service,
          mat: p.mat !== null ? String(p.mat) : null,
          prof: p.prof,
          pct_copart: p.pct_copart,
          pct_dist: p.pct_dist,
          rule: p.rule,
          formulas: p.formulas,
          raw_services: p.raw_services || [],
          exclude_coseguros: p.exclude_coseguros || false,
          exclude_directs: p.exclude_directs || false
        }));

        const { error } = await supabase.from('providers').upsert(dbProviders);
        if (error) throw error;
      } catch (err) {
        console.error('Error al restablecer prestadores en Supabase:', err);
      }
    }

    try {
      localStorage.setItem(PROVIDERS_KEY, JSON.stringify(defaultProviders));
      return defaultProviders;
    } catch (e) {
      console.error('Error al restablecer prestadores en localStorage', e);
      return defaultProviders;
    }
  },

  // --- SETTINGS (TARIFAS Y CONFIGURACIONES) ---
  getSettings: async () => {
    if (hasSupabase) {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .eq('id', 1)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          return {
            tariffs: data.tariffs,
            multipliers: data.multipliers
          };
        }
      } catch (err) {
        console.warn('Error al obtener tarifas desde Supabase, cayendo a LocalStorage:', err);
      }
    }

    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (!stored) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
        return DEFAULT_SETTINGS;
      }
      return JSON.parse(stored);
    } catch (e) {
      console.error('Error al leer tarifas de localStorage', e);
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings: async (settings) => {
    if (hasSupabase) {
      try {
        const { error } = await supabase.from('settings').upsert({
          id: 1,
          tariffs: settings.tariffs,
          multipliers: settings.multipliers,
          updated_at: new Date().toISOString()
        });
        if (error) throw error;
      } catch (err) {
        console.error('Error al guardar tarifas en Supabase:', err);
      }
    }

    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      return true;
    } catch (e) {
      console.error('Error al guardar tarifas en localStorage', e);
      return false;
    }
  },

  // --- HISTORY (HISTORIAL MENSUAL) ---
  getHistory: async () => {
    if (hasSupabase) {
      try {
        const { data, error } = await supabase
          .from('history')
          .select('*')
          .order('timestamp', { ascending: false });

        if (error) throw error;
        if (data) {
          return data.map(h => ({
            id: h.id,
            month: h.month,
            year: h.year,
            totalRowsCount: h.total_rows_count,
            totals: h.totals,
            rows: h.rows,
            timestamp: h.timestamp
          }));
        }
      } catch (err) {
        console.warn('Error al obtener historial desde Supabase, cayendo a LocalStorage:', err);
      }
    }

    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Error al leer historial desde localStorage', e);
      return [];
    }
  },

  saveHistoryItem: async (item) => {
    const id = item.id || `${item.year}-${String(item.month).padStart(2, '0')}`;
    const timestamp = new Date().toISOString();
    
    const itemToSave = {
      ...item,
      id,
      timestamp
    };

    if (hasSupabase) {
      try {
        const { error } = await supabase.from('history').upsert({
          id,
          month: item.month,
          year: item.year,
          total_rows_count: item.totalRowsCount,
          totals: item.totals,
          rows: item.rows,
          timestamp
        });
        if (error) throw error;
      } catch (err) {
        console.error('Error al guardar historial en Supabase:', err);
      }
    }

    try {
      const history = await dbService.getHistory();
      const existingIndex = history.findIndex(h => h.id === id);
      
      if (existingIndex >= 0) {
        history[existingIndex] = itemToSave;
      } else {
        history.unshift(itemToSave);
      }
      
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
      return itemToSave;
    } catch (e) {
      console.error('Error al guardar historial en localStorage', e);
      return null;
    }
  },

  deleteHistoryItem: async (id) => {
    if (hasSupabase) {
      try {
        const { error } = await supabase.from('history').delete().eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.error('Error al eliminar registro de historial en Supabase:', err);
      }
    }

    try {
      const history = await dbService.getHistory();
      const filtered = history.filter(h => h.id !== id);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
      return true;
    } catch (e) {
      console.error('Error al eliminar registro de historial', e);
      return false;
    }
  }
};

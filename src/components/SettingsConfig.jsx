import React, { useState, useEffect } from 'react';
import { 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  Users, 
  DollarSign, 
  UserCheck, 
  Plus, 
  Trash2 
} from 'lucide-react';
import { dbService } from '../services/db';
import ProvidersConfig from './ProvidersConfig';

const SettingsConfig = ({ 
  settings = {}, 
  onUpdateSettings, 
  providers = [], 
  onUpdateProviders 
}) => {
  const [activeSubTab, setActiveSubTab] = useState('prestadores');
  
  // Tab 2 State: Tarifas Globales
  const [aprossTariff, setAprossTariff] = useState(settings.tariffs?.apross || 12000);
  const [horizonteTariff, setHorizonteTariff] = useState(settings.tariffs?.horizonte || 14606);
  const [redTariff, setRedTariff] = useState(settings.tariffs?.redPrestacional || 17300);
  const [aprossMult, setAprossMult] = useState(settings.multipliers?.apross || 0.96);
  const [tariffSuccess, setTariffSuccess] = useState('');

  // Tab 3 State: Gestión de Usuarios
  const [userRoles, setUserRoles] = useState(settings.multipliers?.user_roles || [
    { email: 'aye.victoria.lopez2@gmail.com', role: 'admin' },
    { email: 'aye.victoria.lopez@gmail.com', role: 'admin' }
  ]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('reader');
  const [userSuccess, setUserSuccess] = useState('');

  // Update local states when global settings change
  useEffect(() => {
    if (settings.tariffs) {
      setAprossTariff(settings.tariffs.apross);
      setHorizonteTariff(settings.tariffs.horizonte);
      setRedTariff(settings.tariffs.redPrestacional);
    }
    if (settings.multipliers) {
      setAprossMult(settings.multipliers.apross);
      if (settings.multipliers.user_roles) {
        setUserRoles(settings.multipliers.user_roles);
      }
    }
  }, [settings]);

  // Tab 2 Save: Tarifas Globales
  const handleSaveTariffs = async () => {
    const newSettings = {
      ...settings,
      tariffs: {
        apross: parseFloat(aprossTariff) || 0,
        horizonte: parseFloat(horizonteTariff) || 0,
        redPrestacional: parseFloat(redTariff) || 0
      },
      multipliers: {
        ...settings.multipliers,
        apross: parseFloat(aprossMult) || 0
      }
    };

    const saved = await dbService.saveSettings(newSettings);
    if (saved) {
      onUpdateSettings(newSettings);
      setTariffSuccess('Configuraciones y tarifas guardadas con éxito.');
      setTimeout(() => setTariffSuccess(''), 4000);
    } else {
      alert('Error al intentar guardar las configuraciones.');
    }
  };

  // Tab 3 Action: Agregar Usuario
  const handleAddUser = async () => {
    const emailClean = newUserEmail.trim().toLowerCase();
    if (!emailClean) return;

    // Check if user already exists
    if (userRoles.some(u => u.email.toLowerCase() === emailClean)) {
      alert('Este usuario ya se encuentra registrado.');
      return;
    }

    const updatedRoles = [...userRoles, { email: emailClean, role: newUserRole }];
    
    const newSettings = {
      ...settings,
      multipliers: {
        ...settings.multipliers,
        user_roles: updatedRoles
      }
    };

    const saved = await dbService.saveSettings(newSettings);
    if (saved) {
      setUserRoles(updatedRoles);
      onUpdateSettings(newSettings);
      setNewUserEmail('');
      setNewUserRole('reader');
      setUserSuccess('Usuario registrado con éxito.');
      setTimeout(() => setUserSuccess(''), 4000);
    } else {
      alert('Error al intentar agregar el usuario.');
    }
  };

  // Tab 3 Action: Eliminar Usuario
  const handleDeleteUser = async (emailToDelete) => {
    const emailClean = emailToDelete.trim().toLowerCase();
    
    // Prevent locking out administrators
    if (emailClean === 'aye.victoria.lopez2@gmail.com' || emailClean === 'aye.victoria.lopez@gmail.com') {
      alert('No puedes eliminar a los administradores principales del sistema.');
      return;
    }

    if (!window.confirm(`¿Estás seguro de que deseas eliminar los permisos para ${emailToDelete}?`)) {
      return;
    }

    const updatedRoles = userRoles.filter(u => u.email.toLowerCase() !== emailClean);

    const newSettings = {
      ...settings,
      multipliers: {
        ...settings.multipliers,
        user_roles: updatedRoles
      }
    };

    const saved = await dbService.saveSettings(newSettings);
    if (saved) {
      setUserRoles(updatedRoles);
      onUpdateSettings(newSettings);
      setUserSuccess('Permisos del usuario removidos con éxito.');
      setTimeout(() => setUserSuccess(''), 4000);
    } else {
      alert('Error al intentar remover el usuario.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1>Configuración del Sistema</h1>
        <p>Administre prestadores, modifique tarifas fijas globales y gestione los accesos de usuarios al sistema.</p>
      </div>

      {/* Tabs navigation */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-light)',
        gap: '1rem',
        marginBottom: '1rem'
      }}>
        <button 
          className={`btn ${activeSubTab === 'prestadores' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('prestadores')}
          style={{
            background: activeSubTab === 'prestadores' ? 'var(--primary)' : 'transparent',
            border: 'none',
            borderBottom: activeSubTab === 'prestadores' ? '2px solid var(--primary-light)' : 'none',
            borderRadius: '8px 8px 0 0',
            padding: '0.75rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: '600'
          }}
        >
          <Users size={16} />
          Prestadores y Fórmulas
        </button>

        <button 
          className={`btn ${activeSubTab === 'tarifas' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('tarifas')}
          style={{
            background: activeSubTab === 'tarifas' ? 'var(--primary)' : 'transparent',
            border: 'none',
            borderBottom: activeSubTab === 'tarifas' ? '2px solid var(--primary-light)' : 'none',
            borderRadius: '8px 8px 0 0',
            padding: '0.75rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: '600'
          }}
        >
          <DollarSign size={16} />
          Tarifas Globales
        </button>

        <button 
          className={`btn ${activeSubTab === 'usuarios' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('usuarios')}
          style={{
            background: activeSubTab === 'usuarios' ? 'var(--primary)' : 'transparent',
            border: 'none',
            borderBottom: activeSubTab === 'usuarios' ? '2px solid var(--primary-light)' : 'none',
            borderRadius: '8px 8px 0 0',
            padding: '0.75rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: '600'
          }}
        >
          <UserCheck size={16} />
          Gestión de Usuarios
        </button>
      </div>

      {/* Tab Contents */}
      {activeSubTab === 'prestadores' && (
        <ProvidersConfig 
          providers={providers} 
          onUpdateProviders={onUpdateProviders} 
        />
      )}

      {activeSubTab === 'tarifas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {tariffSuccess && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--success)', padding: '1rem', background: 'var(--success-bg)', borderRadius: '10px' }}>
              <CheckCircle2 size={20} />
              <span>{tariffSuccess}</span>
            </div>
          )}

          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px' }}>
            <h2>Tarifas de Consultas Directas</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Estos valores se multiplican por la cantidad de consultas directas (código 420101) de cada prestador (siempre que no tenga una tarifa especial configurada para ese profesional).
            </p>
            
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
              <button className="btn btn-primary" onClick={handleSaveTariffs}>
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
                Las tarifas globales configuradas aquí se utilizarán automáticamente en el procesamiento del sistema, a menos que asigne tarifas especiales por prestador. Al descargar la planilla Excel, estas tarifas también se inyectarán en las celdas correspondientes.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'usuarios' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', alignItems: 'start' }}>
          {/* User List */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2>Usuarios Autorizados y Roles</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Configure qué cuentas de correo pueden acceder a la aplicación y asigne sus correspondientes niveles de permiso.
            </p>

            {userSuccess && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--success)', padding: '0.75rem', background: 'var(--success-bg)', borderRadius: '8px', fontSize: '0.85rem' }}>
                <CheckCircle2 size={16} />
                <span>{userSuccess}</span>
              </div>
            )}

            <div className="table-container" style={{ marginTop: '1rem' }}>
              <table>
                <thead>
                  <tr>
                    <th>Usuario (Email)</th>
                    <th>Rol / Permiso</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {userRoles.map(user => (
                    <tr key={user.email}>
                      <td style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{user.email}</td>
                      <td>
                        <span className={`badge ${user.role === 'admin' ? 'badge-violet' : 'badge-green'}`}>
                          {user.role === 'admin' ? 'Administrador' : 'Solo Lectura (Reader)'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {user.email !== 'aye.victoria.lopez2@gmail.com' && user.email !== 'aye.victoria.lopez@gmail.com' ? (
                          <button 
                            className="btn btn-danger" 
                            style={{ padding: '0.4rem' }}
                            onClick={() => handleDeleteUser(user.email)}
                            title="Eliminar usuario"
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Protegido</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add User Form */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h2>Registrar Usuario</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Habilite un nuevo email para iniciar sesión con Supabase Auth.
            </p>

            <div className="input-group">
              <label>Correo Electrónico</label>
              <input 
                type="email" 
                value={newUserEmail} 
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="Ej: usuario@gmail.com"
              />
            </div>

            <div className="input-group">
              <label>Rol asignado</label>
              <select 
                value={newUserRole} 
                onChange={(e) => setNewUserRole(e.target.value)}
              >
                <option value="reader">Solo Lectura (Reader) - Acceso a Dashboard e Historial</option>
                <option value="admin">Administrador (Admin) - Acceso total y configuraciones</option>
              </select>
            </div>

            <button 
              className="btn btn-primary" 
              onClick={handleAddUser}
              style={{ width: '100%', marginTop: '0.5rem' }}
              disabled={!newUserEmail.trim()}
            >
              <Plus size={16} />
              Agregar Usuario
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsConfig;

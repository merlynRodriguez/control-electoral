import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';


export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleResetData = async () => {
    // Confirmar la acción destructiva
    const confirmado = window.confirm(
      '⚠️ ¿Está seguro que desea REINICIAR TODOS los resultados a cero?\n\n' +
      'Esta acción eliminará TODAS las actas cargadas y restaurará todas las mesas a estado "Pendiente".\n\n' +
      'Esta acción es IRREVERSIBLE.'
    );

    if (!confirmado) {
      setLoading(false);
      return;
    }

    try {
      // 1. Eliminar todas las actas
      const { error: errDelete } = await supabase
        .from('actas')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Truco para borrar todo

      if (errDelete) throw new Error('Error al eliminar actas: ' + errDelete.message);

      // 2. Restaurar todas las mesas a "Pendiente"
      const { error: errUpdate } = await supabase
        .from('mesas')
        .update({ estado: 'Pendiente' })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Actualizar todo

      if (errUpdate) throw new Error('Error al restaurar mesas: ' + errUpdate.message);

      setSuccessMsg('✅ Todos los resultados fueron reiniciados a cero exitosamente.');
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error al reiniciar datos');
      setSuccessMsg(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      // Detectar cuenta de reset
      if (email.toLowerCase().includes('reset')) {
        await handleResetData();
        return;
      }

      // Flujo normal de login
      if (email.includes('admin')) {
        navigate('/dashboard');
      } else {
        navigate('/veedor');
      }
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="card login-card">
        <h1 className="title">Control Electoral</h1>
        <p className="subtitle">Módulo de Conteo Rápido</p>
        
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label className="input-label" htmlFor="email">Usuario / Correo</label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label className="input-label" htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          {error && <p className="error-text">{error}</p>}
          {successMsg && (
            <p style={{ 
              color: '#166534', 
              backgroundColor: '#dcfce7', 
              padding: '0.75rem', 
              borderRadius: '0.5rem', 
              fontSize: '0.9rem',
              textAlign: 'center',
              marginTop: '0.5rem'
            }}>
              {successMsg}
            </p>
          )}
          
          <button type="submit" className="btn btn-primary mt-4" disabled={loading}>
            {loading ? 'Procesando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}

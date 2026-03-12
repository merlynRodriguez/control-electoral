import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { supabase } from '../services/supabase';

// Nombres de los candidatos
const OpcionesCandidatos = [
  { id: 'c_1', nombre: 'UNIDOS' },
  { id: 'c_2', nombre: 'NGP' },
  { id: 'c_3', nombre: 'PPS' },
  { id: 'c_4', nombre: 'UNE' },
  { id: 'c_5', nombre: 'PATRIA' },
  { id: 'c_6', nombre: 'MTS' },
  { id: 'c_7', nombre: 'SÚMATE' },
  { id: 'c_8', nombre: 'LIBRE' },
  { id: 'c_9', nombre: 'ALIANZA' },
  { id: 'c_10', nombre: 'FRI' },
  { id: 'c_11', nombre: 'SOLUCIONES CON TODOS' },
];

export default function Veedor() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  
  const [recintos, setRecintos] = useState<any[]>([]);
  const [mesas, setMesas] = useState<any[]>([]);
  
  const [recintoSeleccionado, setRecintoSeleccionado] = useState('');
  const [mesaSeleccionada, setMesaSeleccionada] = useState('');
  const [mesaObjeto, setMesaObjeto] = useState<any>(null);

  const [votos, setVotos] = useState<any>({
    c_1: '', c_2: '', c_3: '', c_4: '', c_5: '', c_6: '', 
    c_7: '', c_8: '', c_9: '', c_10: '', c_11: '',
    blancos: '', nulos: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    cargarRecintos();
  }, []);

  const cargarRecintos = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('recintos').select('*').order('nombre');
    if (!error && data) setRecintos(data);
    setLoading(false);
  };

  const cargarMesas = async (recintoId: string) => {
    setRecintoSeleccionado(recintoId);
    setMesaSeleccionada('');
    if (!recintoId) {
      setMesas([]);
      return;
    }
    const { data, error } = await supabase.from('mesas')
      .select('*')
      .eq('recinto_id', recintoId)
      .eq('estado', 'Pendiente')
      .order('numero_mesa');
      
    if (!error && data) setMesas(data);
  };

  const procesarPaso2 = () => {
    if (!recintoSeleccionado || !mesaSeleccionada) {
      setErrorMsg('Debe seleccionar recinto y mesa');
      return;
    }
    const mo = mesas.find(m => m.id === mesaSeleccionada);
    setMesaObjeto(mo);
    setErrorMsg('');
    setStep(2);
  };

  const handleVotoChange = (campo: string, valor: string) => {
    const num = valor === '' ? '' : parseInt(valor);
    setVotos({ ...votos, [campo]: num });
  };

  const calcularTotal = () => {
    let total = 0;
    Object.values(votos).forEach(v => {
      if (typeof v === 'number' && !isNaN(v)) total += v;
    });
    return total;
  };
  
  const handleLogout = () => {
    navigate('/login');
  };

  const handleSubmitActa = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setErrorMsg('');
    
    // Validación de que no haya campos vacíos
    const camposVacios = Object.values(votos).some(v => v === '');
    if (camposVacios) {
      setErrorMsg('Por favor llene todas las casillas. Si un candidato no tiene votos, ingrese 0.');
      setEnviando(false);
      return;
    }

    try {
      const total = calcularTotal();
      
      // 1. Insertar acta
      // Usamos el usuario real si existe
      const { data: userData } = await supabase.auth.getUser();
      const veedor_id = userData?.user?.id;
      
      const payload: any = {
        mesa_id: mesaSeleccionada,
        ...votos,
        total_votos: total
      };

      if (veedor_id) {
        payload.veedor_id = veedor_id;
      }

      const { error: errInsert } = await supabase.from('actas').insert([payload]);
      
      if (errInsert) {
        if (errInsert.code === '23502' || errInsert.code === '23503') {
           throw new Error("El sistema requiere que quites la restricción de 'veedor_id' obligatoria (NOT NULL) en la base de datos para pruebas anónimas. O debes iniciar sesión con un usuario válido.");
        } else if (errInsert.code === '42501' || errInsert.message.includes('RLS')) {
           throw new Error("Error de permisos (RLS). Las políticas no permiten insertar.");
        } else {
           throw errInsert;
        }
      }
      
      // 2. Actualizar estado de mesa
      const { error: errUpdate } = await supabase.from('mesas')
        .update({ estado: 'Escrutada' })
        .eq('id', mesaSeleccionada);
        
      if (errUpdate) throw errUpdate;
      
      // Reset flow
      alert('¡Acta guardada exitosamente!');
      setVotos({
        c_1: '', c_2: '', c_3: '', c_4: '', c_5: '', c_6: '', 
        c_7: '', c_8: '', c_9: '', c_10: '', c_11: '',
        blancos: '', nulos: ''
      });
      setMesaSeleccionada('');
      cargarMesas(recintoSeleccionado);
      setStep(1);
    } catch (err: any) {
      setErrorMsg('Error al guardar: ' + err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="container" style={{ paddingBottom: '80px' }}>
      <header className="flex justify-between items-center mb-4">
        <h1 className="title" style={{ margin: 0, textAlign: 'left', fontSize: '1.25rem' }}>Módulo Veedor</h1>
        <button onClick={handleLogout} className="btn" style={{ width: 'auto', padding: '0.5rem' }}>
          <LogOut size={20} />
        </button>
      </header>

      {step === 1 ? (
        <div className="card">
          <h2 style={{ marginBottom: '1rem' }}>Paso 1: Selecciona tu Mesa</h2>
          
          <div className="input-group">
            <label className="input-label">Recinto Electoral</label>
            <select className="input" value={recintoSeleccionado} onChange={(e) => cargarMesas(e.target.value)} disabled={loading}>
              <option value="">Seleccione un recinto...</option>
              {recintos.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </select>
          </div>
          
          <div className="input-group">
            <label className="input-label">Mesa</label>
            <select className="input" value={mesaSeleccionada} onChange={(e) => setMesaSeleccionada(e.target.value)} disabled={!recintoSeleccionado || loading}>
              <option value="">{loading ? 'Cargando...' : 'Seleccione una mesa...'}</option>
              {mesas.map(m => (
                <option key={m.id} value={m.id}>Mesa {m.numero_mesa}</option>
              ))}
            </select>
            {recintoSeleccionado && mesas.length === 0 && !loading && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>No hay mesas pendientes en este recinto.</p>
            )}
          </div>
          
          {errorMsg && <p className="error-text mb-4">{errorMsg}</p>}
          <button className="btn btn-primary" onClick={procesarPaso2} disabled={!mesaSeleccionada}>Comenzar Carga</button>
        </div>
      ) : (
        <div className="card">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h2>Paso 2: Acta - Mesa {mesaObjeto?.numero_mesa}</h2>
            <button className="btn" style={{ width: 'auto', padding: '0.25rem' }} onClick={() => setStep(1)}>Volver</button>
          </div>
          
          <form onSubmit={handleSubmitActa}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {OpcionesCandidatos.map(c => (
                <div key={c.id} className="flex justify-between items-center">
                  <label style={{ fontSize: '0.9rem', flex: 1 }}>{c.nombre}</label>
                  <input type="number" min="0" className="input" style={{ width: '80px', padding: '0.5rem' }} 
                    value={votos[c.id]} onChange={e => handleVotoChange(c.id, e.target.value)} required />
                </div>
              ))}
              <hr style={{ margin: '0.5rem 0', borderColor: 'var(--border)' }} />
              <div className="flex justify-between items-center">
                <label style={{ fontSize: '0.9rem', flex: 1, fontWeight: 'bold' }}>Votos Blancos</label>
                <input type="number" min="0" className="input" style={{ width: '80px', padding: '0.5rem' }} 
                  value={votos.blancos} onChange={e => handleVotoChange('blancos', e.target.value)} required />
              </div>
              <div className="flex justify-between items-center">
                <label style={{ fontSize: '0.9rem', flex: 1, fontWeight: 'bold' }}>Votos Nulos</label>
                <input type="number" min="0" className="input" style={{ width: '80px', padding: '0.5rem' }} 
                  value={votos.nulos} onChange={e => handleVotoChange('nulos', e.target.value)} required />
              </div>
              
              <div className="card" style={{ marginTop: '1rem', backgroundColor: 'var(--bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold' }}>Total Mesa:</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)' }}>{calcularTotal()}</span>
              </div>
            </div>
            
            {errorMsg && <p className="error-text mt-4 text-center">{errorMsg}</p>}
            <button type="submit" className="btn btn-primary mt-4" disabled={enviando}>
              {enviando ? 'Guardando...' : 'Confirmar y Enviar'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

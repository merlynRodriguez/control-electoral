import { useState } from 'react';
import { supabase } from '../services/supabase';

export default function ConfigDB() {
  const [status, setStatus] = useState<string>('Esperando acción...');
  
  const initDatabase = async () => {
    setStatus('Conectándose a Supabase y ejecutando RPC "crear_esquema"...');
    try {
      // Intentar una simple lectura para comprobar conexión
      const { error } = await supabase.from('recintos').select('id').limit(1);
      
      if (error && error.code === '42P01') {
        setStatus('❌ La tabla "recintos" no existe. ¡Debes crear las tablas en el Panel de Supabase usando init_db.sql!');
        return;
      } else if (error) {
        setStatus(`❌ Error de conexión: ${error.message}`);
        return;
      }
      
      setStatus('✅ Conexión exitosa. ¡Las tablas ya existen!');
    } catch (err: any) {
      setStatus(`❌ Error inesperado: ${err.message}`);
    }
  };

  const initMesas = async () => {
    setStatus('Creando mesas para los recintos actuales...');
    try {
      // 1. Obtener recintos
      const { data: recintos, error: errorR } = await supabase.from('recintos').select('*');
      if (errorR) throw errorR;
      if (!recintos || recintos.length === 0) {
        setStatus('❌ No hay recintos en la base de datos. Crea primero los recintos.');
        return;
      }

      let mesasCreadas = 0;
      
      // 2. Por cada recinto, crear la cantidad de mesas correspondientes
      for (const recinto of recintos) {
        const mesasParaInsertar = [];
        for (let i = 1; i <= recinto.total_mesas; i++) {
          mesasParaInsertar.push({
            numero_mesa: i,
            recinto_id: recinto.id,
            estado: 'Pendiente'
          });
        }
        
        // Insertar (ignorar errores de duplicado si ya existen gracias al constraint ON CONFLICT no disponible en postgrest simple, así que lo hacemos uno por uno o confiamos en q está vacío)
        const { error: errorI } = await supabase.from('mesas').insert(mesasParaInsertar);
        
        if (errorI) {
           console.error(`Error insertando mesas para ${recinto.nombre}:`, errorI);
        } else {
           mesasCreadas += mesasParaInsertar.length;
        }
      }
      
      setStatus(`✅ Se han creado ${mesasCreadas} mesas correctamente según la configuración de los recintos.`);
    } catch (err: any) {
      setStatus(`❌ Error: ${err.message}`);
    }
  };

  return (
    <div className="container mt-4">
      <div className="card">
        <h2 className="title">Configuración de Base de Datos</h2>
        <p className="subtitle" style={{ textAlign: 'left' }}>
          Ejecuta esta acción para comprobar que tu base de datos Supabase esté lista y con el esquema creado.
        </p>
        
        <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', fontFamily: 'monospace' }}>
          <strong>Estado Actual:</strong> <br />
          {status}
        </div>
        
        <div className="flex gap-4 mb-4">
          <button onClick={initDatabase} className="btn btn-primary" style={{ flex: 1 }}>
            1. Comprobar Conexión a Base de Datos
          </button>
          
          <button onClick={initMesas} className="btn" style={{ flex: 1, backgroundColor: 'var(--success)', color: 'white' }}>
            2. Generar Mesas (Auto-poblar)
          </button>
        </div>
        
        <div className="mt-4" style={{ backgroundColor: '#fffbe1', padding: '1rem', borderLeft: '4px solid #f59e0b', borderRadius: '4px' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#b45309' }}>Instrucción Manual:</h4>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            Si eres el desarrollador, copia el contenido del archivo <code>init_db.sql</code> generado en el proyecto y pégalo y ejecútalo en la pestaña "SQL Editor" de tu panel de Supabase en <code>https://supabase.com/dashboard/project/nuebsjpaofxixoxpgadp/sql</code> para crear todas las relaciones.
          </p>
        </div>
      </div>
    </div>
  );
}

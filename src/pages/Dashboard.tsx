import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, BarChart3, Users, CheckCircle } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { supabase } from '../services/supabase';

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

// Nombres de los candidatos
const OpcionesCandidatos = [
  { id: 'c_1', nombre: 'FRI' },
  { id: 'c_2', nombre: 'UNE' },
  { id: 'c_3', nombre: 'UNIDOS' },
  { id: 'c_4', nombre: 'SÚMATE' },
  { id: 'c_5', nombre: 'PPS' },
  { id: 'c_6', nombre: 'PATRIA' },
  { id: 'c_7', nombre: 'NGP' },
  { id: 'c_8', nombre: 'LIBRE' },
  { id: 'c_9', nombre: 'MAS-IPSP' },
  { id: 'c_10', nombre: 'CC' },
  { id: 'c_11', nombre: 'UCS' },
  { id: 'c_12', nombre: 'MTS' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  
  const [totalMesasTotales, setTotalMesasTotales] = useState(0);
  const [mesasEscrutadas, setMesasEscrutadas] = useState(0);
  const [totalVotos, setTotalVotos] = useState(0);
  
  const [resultados, setResultados] = useState<any[]>([]);

  useEffect(() => {
    cargarDatosIniciales();
    
    // Suscripción a cambios en tabla actas
    const subscription = supabase
      .channel('actas-channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'actas' }, (payload) => {
        console.log('Nueva acta recibida:', payload.new);
        sumarActa(payload.new);
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const cargarDatosIniciales = async () => {
    // Mesas Totales (Sumatoria de los recintos)
    const { data: recintos } = await supabase.from('recintos').select('total_mesas');
    const totMesas = recintos?.reduce((acc, r) => acc + (r.total_mesas || 0), 0) || 0;
    setTotalMesasTotales(totMesas);
    
    // Actas actuales
    const { data: actas } = await supabase.from('actas').select('*');
    if (actas) {
      setMesasEscrutadas(actas.length);
      recalcularTotalesBase(actas);
    }
  };

  const recalcularTotalesBase = (actasList: any[]) => {
    let totVotosGenerales = 0;
    const conteo = OpcionesCandidatos.map((c, index) => ({ id: c.id, nombre: c.nombre, votos: 0, color: generarColor(index) }));
    // Añadimos blancos y nulos
    conteo.push({ id: 'blancos', nombre: 'Blancos', votos: 0, color: '#94a3b8' });
    conteo.push({ id: 'nulos', nombre: 'Nulos', votos: 0, color: '#64748b' });
    
    actasList.forEach(acta => {
      totVotosGenerales += acta.total_votos || 0;
      conteo.forEach(c => {
        c.votos += acta[c.id] || 0;
      });
    });
    
    setTotalVotos(totVotosGenerales);
    setResultados(conteo.sort((a, b) => b.votos - a.votos)); // Ordenados de mayor a menor
  };

  // Cuando llega un acta nueva vía WebSockets
  const sumarActa = (nuevaActa: any) => {
    setMesasEscrutadas(prev => prev + 1);
    setTotalVotos(prev => prev + (nuevaActa.total_votos || 0));
    
    setResultados(prevResultados => {
      const nuevoConteo = prevResultados.map(item => ({
        ...item,
        votos: item.votos + (nuevaActa[item.id] || 0)
      }));
      return nuevoConteo.sort((a, b) => b.votos - a.votos); // Reordenar
    });
  };

  // Tonos vibrantes predefinidos para máximo contraste
  const PaletaColores = [
    '#e11d48', // Rose
    '#2563eb', // Blue
    '#16a34a', // Green
    '#d97706', // Amber
    '#9333ea', // Purple
    '#0891b2', // Cyan
    '#ea580c', // Orange
    '#4f46e5', // Indigo
    '#db2777', // Pink
    '#ca8a04', // Yellow
    '#059669', // Emerald
    '#dc2626', // Red
  ];

  const generarColor = (index: number) => PaletaColores[index % PaletaColores.length];


  const handleLogout = () => {
    navigate('/login');
  };

  const chartData = {
    labels: resultados.slice(0, 5).map(r => r.nombre).concat(resultados.length > 5 ? ['Otros'] : []),
    datasets: [
      {
        data: (() => {
          const top5 = resultados.slice(0, 5).map(r => r.votos);
          if (resultados.length > 5) {
            const otrosVotos = resultados.slice(5).reduce((acc, curr) => acc + curr.votos, 0);
            top5.push(otrosVotos);
          }
          return top5;
        })(),
        backgroundColor: resultados.slice(0, 5).map(r => r.color).concat(resultados.length > 5 ? ['#cbd5e1'] : []),
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  };

  const chartOptions: any = {
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
      datalabels: {
        color: '#fff',
        font: {
          weight: 'bold',
          size: 11
        },
        formatter: (value: number, context: any) => {
          if (value === 0) return null; // No mostrar 0%
          const label = context.chart.data.labels[context.dataIndex];
          const totalContext = context.chart.data.datasets[0].data.reduce((a: number, b: number) => a + b, 0);
          const percentage = ((value / totalContext) * 100).toFixed(1);
          return `${label}\n${percentage}%`;
        },
        textAlign: 'center',
        textStrokeColor: 'rgba(0,0,0,0.5)',
        textStrokeWidth: 3,
      }
    }
  };

  return (
    <div style={{ backgroundColor: '#f1f5f9', minHeight: '100vh' }}>
      <header style={{ backgroundColor: 'white', padding: '1rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
        <div className="container flex justify-between items-center" style={{ padding: 0 }}>
          <h1 className="title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 color="var(--primary)" />
            Centro de Cómputos
          </h1>
          <button onClick={handleLogout} className="btn btn-primary" style={{ width: 'auto', padding: '0.5rem 1rem' }}>
            <LogOut size={16} style={{ marginRight: '0.5rem' }} /> Salir
          </button>
        </div>
      </header>

      <div className="container mt-4">
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: 0 }}>
            <div style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)', padding: '1rem', borderRadius: '50%' }}>
              <Users color="var(--primary)" size={24} />
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500, margin: 0 }}>Total Votos Escrutados</p>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{totalVotos}</h2>
            </div>
          </div>
          
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: 0 }}>
            <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '50%' }}>
              <CheckCircle color="var(--success)" size={24} />
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500, margin: 0 }}>Mesas Escrutadas</p>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
                {mesasEscrutadas} / {totalMesasTotales} 
                <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                  ({totalMesasTotales > 0 ? ((mesasEscrutadas / totalMesasTotales) * 100).toFixed(1) : 0}%)
                </span>
              </h2>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-start' }}>
          {/* Chart */}
          <div className="card" style={{ flex: '1 1 300px' }}>
            <h3 style={{ marginBottom: '1rem' }}>Distribución de Votos (Top 5)</h3>
            <div style={{ position: 'relative', height: '350px', width: '100%', display: 'flex', justifyContent: 'center' }}>
              <Pie data={chartData} options={chartOptions} />
            </div>
          </div>
          
          {/* Table */}
          <div className="card" style={{ flex: '2 1 400px' }}>
            <h3 style={{ marginBottom: '1rem' }}>Resultados Detallados</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>Posición</th>
                    <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>Candidato / Opción</th>
                    <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>Votos</th>
                    <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {resultados.map((item, index) => {
                    const porcentaje = totalVotos > 0 ? ((item.votos / totalVotos) * 100).toFixed(2) : '0';
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem 0.5rem', fontWeight: 'bold' }}>{index + 1}</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>{item.nombre}</td>
                        <td style={{ padding: '0.75rem 0.5rem', fontWeight: 500 }}>{item.votos.toLocaleString()}</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>{porcentaje}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

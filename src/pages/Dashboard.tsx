import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { supabase } from '../services/supabase';

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels, CategoryScale, LinearScale, BarElement, Title);

// Nombres de los candidatos
const OpcionesCandidatos = [
  { id: 'c_1', partido: 'UNIDOS', candidato: 'Edwin Lopez Ticona' },
  { id: 'c_2', partido: 'NGP', candidato: 'Omar Ledezma Rivera' },
  { id: 'c_3', partido: 'PPS', candidato: 'Felix Quispe Calle' },
  { id: 'c_4', partido: 'UNE', candidato: 'Victor Carvajal' },
  { id: 'c_5', partido: 'PATRIA', candidato: 'Jesus Hinojosa' },
  { id: 'c_6', partido: 'MTS', candidato: 'Milton Paichucama' },
  { id: 'c_7', partido: 'SÚMATE', candidato: 'Roxana Moscoso' },
  { id: 'c_8', partido: 'LIBRE', candidato: 'Gualberto Mercado AYATO' },
  { id: 'c_9', partido: 'ALIANZA', candidato: 'Patricia Arce Guzman' },
  { id: 'c_10', partido: 'FRI', candidato: 'Omar Amaya' },
  { id: 'c_11', partido: 'SOLUCIONES CON TODOS', candidato: 'Alfredo Lucana' },
];

const TOTAL_MESAS_VINTO = 176;

// Función para generar relleno con franjas delgadas diagonales para Chart.js
const createStripePattern = (baseColor: string, stripeColor: string) => {
  if (typeof document === 'undefined') return baseColor;
  const canvas = document.createElement('canvas');
  // Canvas grande = más espacio blanco entre franjas delgadas
  canvas.width = 20;
  canvas.height = 20;
  const ctx = canvas.getContext('2d');
  if (!ctx) return baseColor;

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.lineWidth = 2; // Franja delgada (2px sobre 20px de tile = predomina el blanco)
  ctx.strokeStyle = stripeColor;
  ctx.beginPath();
  ctx.moveTo(0, 20);
  ctx.lineTo(20, 0);
  ctx.moveTo(-10, 10);
  ctx.lineTo(10, -10);
  ctx.moveTo(10, 30);
  ctx.lineTo(30, 10);
  ctx.stroke();

  return ctx.createPattern(canvas, 'repeat') || baseColor;
};

export default function Dashboard() {
  const navigate = useNavigate();
  
  const [mesasEscrutadas, setMesasEscrutadas] = useState(0);
  const [resultados, setResultados] = useState<any[]>([]);

  useEffect(() => {
    cargarDatosIniciales();
    
    // Suscripción a cambios en tabla actas
    const subscription = supabase
      .channel('actas-channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'actas' }, (payload) => {
        sumarActa(payload.new);
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const cargarDatosIniciales = async () => {
    // Actas actuales
    const { data: actas } = await supabase.from('actas').select('*');
    if (actas) {
      setMesasEscrutadas(actas.length);
      recalcularTotalesBase(actas);
    }
  };

  const recalcularTotalesBase = (actasList: any[]) => {
    const conteo = OpcionesCandidatos.map((c, index) => ({ 
      id: c.id, 
      partido: c.partido,
      candidato: c.candidato,
      votos: 0, 
      color: generarColor(index),
      perfil: `/candidatos/${c.id}.jpg` 
    }));
    
    actasList.forEach(acta => {
      conteo.forEach(c => {
        c.votos += acta[c.id] || 0;
      });
    });
    
    setResultados(conteo.sort((a, b) => b.votos - a.votos)); // Ordenados de mayor a menor
  };

  // Cuando llega un acta nueva vía WebSockets
  const sumarActa = (nuevaActa: any) => {
    setMesasEscrutadas(prev => prev + 1);
    
    setResultados(prevResultados => {
      const nuevoConteo = prevResultados.map(item => ({
        ...item,
        votos: item.votos + (nuevaActa[item.id] || 0)
      }));
      return nuevoConteo.sort((a, b) => b.votos - a.votos); // Reordenar
    });
  };

  // Paleta de colores por orden del array OpcionesCandidatos (c_1...c_11)
  // c_1=UNIDOS, c_2=NGP, c_3=PPS, c_4=UNE, c_5=PATRIA, c_6=MTS, c_7=SUMATE
  // c_8=LIBRE, c_9=ALIANZA, c_10=FRI, c_11=SOLUCIONES
  const PaletaColores = [
    createStripePattern('#ffffff', '#ff0000'), // 1. c_1 UNIDOS: blanco + franjas rojas delgadas
    '#F9A132', // 2. c_2 NGP
    '#eab308', // 3. c_3 PPS: amarillo
    '#38bdf8', // 4. c_4 UNE: celeste
    '#FF5B0D', // 5. c_5 Patria
    '#22c55e', // 6. c_6 MTS: verde
    '#a855f7', // 7. c_7 Sumate: purpura
    '#0000ff', // 8. c_8 LIBRE: azul
    createStripePattern('#ffffff', '#eab308'), // 9. c_9 ALIANZA: blanco + franjas amarillas delgadas
    '#ff0000', // 10. c_10 FRI: rojo
    '#f472b6', // 11. c_11 Soluciones: rosado
  ];

  const generarColor = (index: number) => PaletaColores[index % PaletaColores.length];

  const handleLogout = () => {
    navigate('/login');
  };

  const ganador = resultados.length > 0 ? resultados[0] : null;
  const porcentajeEscrutinio = ((mesasEscrutadas / TOTAL_MESAS_VINTO) * 100).toFixed(1);

  const pieChartData = {
    labels: resultados.map(r => r.partido),
    datasets: [
      {
        data: resultados.map(r => r.votos),
        backgroundColor: resultados.map(r => r.color),
        borderColor: '#e2f0e6', // Borde verde clarito del dashboard para resaltar el blanco
        borderWidth: 2,
      },
    ],
  };

  const pieChartOptions: any = {
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 40,
        bottom: 60, // ← Más espacio abajo para separar la leyenda (color de partido) de la torta
        left: 40,
        right: 40
      }
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 12, font: { size: 11 } }
      },
      datalabels: {
        color: '#333',
        font: { weight: 'bold', size: 11 },
        align: 'end',
        anchor: 'end',
        offset: 8,
        formatter: (value: number, context: any) => {
          if (value === 0) return null;
          const totalContext = context.chart.data.datasets[0].data.reduce((a: number, b: number) => a + b, 0);
          const percentage = ((value / totalContext) * 100).toFixed(1);
          if (parseFloat(percentage) < 3) return null; // Ocultar labels de porciones muy pequeñas
          const label = context.chart.data.labels[context.dataIndex];
          return `${label} ${percentage}%`;
        },
      }
    }
  };

  const barChartData = {
    labels: resultados.map(r => r.partido),
    datasets: [
      {
        label: 'Cantidad de Votos',
        data: resultados.map(r => r.votos),
        backgroundColor: resultados.map(r => r.color),
        borderRadius: 4,
      },
    ],
  };

  const barChartOptions: any = {
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      datalabels: {
        anchor: 'end',
        align: 'top',
        color: '#333',
        font: { weight: 'bold' },
        formatter: (value: number) => value > 0 ? value.toLocaleString() : '',
      }
    },
    scales: {
      x: {
        grid: { display: false }
      },
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Cantidad de Votos', color: '#666' }
      }
    }
  };

  return (
    <div style={{ backgroundColor: '#e2f0e6', minHeight: '100vh', paddingBottom: '2rem' }}>
      {/* HEADER: Colores de Vinto (Verde/Blanco) */}
      <header style={{ backgroundColor: '#16a34a', color: 'white', padding: '1rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
        <div className="container flex justify-between items-center" style={{ padding: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 'bold' }}>Elecciones subnacionales Vinto 2026</h1>
            <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>Resultados Preliminares - Municipal: Alcalde</span>
          </div>
          <button onClick={handleLogout} className="btn" style={{ backgroundColor: 'white', color: '#16a34a', border: 'none', fontWeight: 'bold', padding: '0.5rem 1rem', width: 'auto' }}>
            <LogOut size={16} style={{ marginRight: '0.5rem', display: 'inline' }} /> Salir
          </button>
        </div>
      </header>

      <div className="container mt-4">
        
        {/* BARRA DE PROGRESO DE ESCRUTINIO */}
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#333' }}>Estado de escrutinio</h3>
            <span style={{ fontWeight: 'bold', color: '#16a34a' }}>{porcentajeEscrutinio}% Mesas Escrutadas: {mesasEscrutadas} / {TOTAL_MESAS_VINTO}</span>
          </div>
          <div style={{ width: '100%', backgroundColor: '#e2e8f0', borderRadius: '9999px', height: '1.25rem', overflow: 'hidden' }}>
            <div 
              style={{ 
                width: `${Math.min(parseFloat(porcentajeEscrutinio), 100)}%`, 
                backgroundColor: '#16a34a', 
                height: '100%', 
                transition: 'width 1s ease-in-out',
                display: 'flex',
                alignItems: 'center',
                paddingLeft: '0.5rem',
                color: 'white',
                fontSize: '0.8rem',
                fontWeight: 'bold'
              }}
            >
              {porcentajeEscrutinio}%
            </div>
          </div>
        </div>

        {/* SECTOR MEDIO: CANDIDATO GANADOR Y GRÁFICO DE TORTA */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
          
          {/* IZQUIERDA: CANDIDATO GANADOR */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', color: '#333' }}>Candidato con mayor votación con el escrutinio actual</h3>
            
            <div style={{ 
              width: '160px', height: '160px', 
              borderRadius: '50%', 
              border: '6px solid #16a34a',
              padding: '4px',
              marginBottom: '1rem',
              backgroundColor: 'white',
              boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
            }}>
              <img 
                src={ganador?.perfil || `https://ui-avatars.com/api/?name=Ganador&background=16a34a&color=fff&size=200`} 
                alt="Candidato Ganador" 
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                onError={(e) => {
                  /* Si no encuentra la imagen local, usa el avatar predeterminado de sus iniciales */
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${ganador?.candidato || 'Ganador'}&background=eaenec&color=16a34a&size=200`;
                }}
              />
            </div>
            
            <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: '#1f2937' }}>
              {ganador && ganador.votos > 0 ? ganador.candidato : 'Esperando resultados...'}
            </h2>
            <p style={{ fontSize: '1.1rem', color: '#6b7280', margin: 0, fontWeight: 500 }}>
              {ganador && ganador.votos > 0 ? ganador.partido : 'Partido Múltiple'}
            </p>
            {ganador && ganador.votos > 0 && (
              <div style={{ marginTop: '1rem', backgroundColor: '#dcfce7', color: '#166534', padding: '0.5rem 1rem', borderRadius: '9999px', fontWeight: 'bold' }}>
                {ganador.votos.toLocaleString()} Votos Totales
              </div>
            )}
          </div>

          {/* DERECHA: GRÁFICO DE TORTA */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', textAlign: 'center' }}>Distribución de Votos Totales por Partido</h3>
            <div style={{ position: 'relative', height: '350px', width: '100%', display: 'flex', justifyContent: 'center' }}>
              <Pie data={pieChartData} options={pieChartOptions} />
            </div>
          </div>
        </div>

        {/* SECTOR INFERIOR: GRÁFICO DE BARRAS */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', textAlign: 'center' }}>Cantidad Total de Votos por Partido</h3>
          <div style={{ position: 'relative', height: '350px', width: '100%' }}>
            <Bar data={barChartData} options={barChartOptions} />
          </div>
        </div>

      </div>
    </div>
  );
}

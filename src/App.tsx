import hospital from './maps/hospital'

export default function App() {
  return <main><p>TAJIX · GOVHEALTH</p><h1>MediBot CPS</h1>
    <p>Base de desarrollo para la simulación de logística hospitalaria.</p>
    <p>{hospital.label} · {hospital.floors.length} plantas de prueba</p>
  </main>
}

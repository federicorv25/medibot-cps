import { useEffect, useReducer, useState } from 'react'
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Box, Building2, CircleCheck, ClipboardList,
  Cross, Eye, Footprints, Layers3, LockKeyhole, MapPin, Package, RotateCcw, Route, ShieldCheck, TriangleAlert,
} from 'lucide-react'
import hospital from './maps/hospital'
import HospitalScene, { type CameraView } from './simulation/HospitalScene'
import {
  buildNetwork, catalog, DEMO_PIN, destinations, initialMission, isCargoValid, pose, transition,
  type Action, type Cargo, type Destination, type Mission,
} from './simulation/model'
import './App.css'

const net = buildNetwork(hospital)
const reducer = (state: Mission, action: Action) => transition(net, state, action)
const floorList = [...hospital.floors].sort((a,b) => a.level - b.level)
const views = [{ id: 'orbit', label: '3D' }, { id: 'top', label: 'Planta' }, { id: 'follow', label: 'Seguir robot' }] as const
const initialQuantities = { paracetamol: '4', salina: '0', amoxicilina: '0' }

function timeLabel(value: number) {
  const seconds = Math.floor(value / 1000)
  return String(Math.floor(seconds / 60)).padStart(2,'0') + ':' + String(seconds % 60).padStart(2,'0')
}
function statusLabel(mission: Mission, inLift: boolean) {
  if (mission.phase === 'idle') return 'Disponible'
  if (mission.phase === 'waiting') return 'Sin paso'
  if (mission.phase === 'handoff') return 'En destino'
  if (mission.phase === 'unloading') return 'Entregando'
  if (mission.phase === 'complete') return 'De vuelta en base'
  if (inLift) return 'En ascensor'
  return mission.returning ? 'Regresando' : 'En tránsito'
}

export default function App() {
  const [mission, dispatch] = useReducer(reducer, net, initialMission)
  const [destination, setDestination] = useState<Destination>('emergency')
  const [quantities, setQuantities] = useState(initialQuantities)
  const [camera, setCamera] = useState<CameraView>('orbit')
  const [floorOverride, setFloorOverride] = useState<string | null>(null)
  const [pin, setPin] = useState('')
  const traveling = mission.phase === 'travel'
  const running = traveling || mission.phase === 'unloading'
  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => dispatch({ type: 'tick', ms: 45 }), 45)
    return () => window.clearInterval(timer)
  }, [running])
  const canEdit = mission.phase === 'idle' || mission.phase === 'complete'
  const destinationKey = mission.phase === 'idle' ? destination : mission.destination
  const currentFloor = net.nodes.get(mission.node)!.floor
  const shownFloor = (camera === 'follow' ? null : floorOverride) ?? currentFloor
  const currentFloorLabel = floorList.find((floor) => floor.id === currentFloor)!.label
  const quantitiesAreValid = catalog.every((item) => {
    const value = quantities[item.id].trim()
    return value === '' || /^\d+$/.test(value) && Number.isSafeInteger(Number(value))
  })
  const cargo: Cargo[] = catalog.map((item) => ({ id: item.id, quantity: Number(quantities[item.id]) }))
    .filter((item) => item.quantity > 0)
  const unitCount = mission.cargo.reduce((sum, item) => sum + item.quantity, 0)
  const inLift = traveling && pose(net,mission).lift
  const status = statusLabel(mission,inLift)
  const totalEvents = mission.events.length
  const blocked = mission.blocked.length
  const readyForBlock = traveling && mission.route.slice(mission.elapsed > 0 ? 1 : 0).some((leg) => leg.edge.kind === 'hall')
  function reset() {
    dispatch({ type: 'reset' })
    setQuantities(initialQuantities)
    setDestination('emergency')
    setCamera('orbit')
    setFloorOverride(null)
    setPin('')
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="wrap topbar-inner">
          <div className="brand"><div className="brand-icon"><Cross size={19} strokeWidth={3}/></div>
            <div><strong>MediBot<span> CPS</span></strong><small>LOGÍSTICA HOSPITALARIA</small></div>
          </div>
          <div className="top-right"><span className="team"><span>TAJIX</span><i/> GovHealth</span>
            <span className="demo-pill"><i/> Simulación activa</span>
          </div>
        </div>
      </header>
      <main className="wrap main">
        <div className="intro">
          <div className="intro-copy">
            <div className="kicker"><span/> CENTRO DE CONTROL</div>
            <h1>Logística en <em>movimiento.</em></h1>
            <p>Despacha medicamentos, sigue al robot y verifica cada entrega dentro del hospital.</p>
          </div>
          <div className="site-chip"><Building2 size={19}/><div><b>Caja Petrolera de Salud</b><small>Santa Cruz, Bolivia · Entorno recreado</small></div></div>
        </div>
        <div className="dashboard">
          <section className="card map-card" aria-labelledby="map-title">
            <header className="map-head">
              <div className="card-title"><div className="section-icon"><Layers3 size={19}/></div><div><h2 id="map-title">Hospital en 3D</h2><p>{hospital.label}</p></div></div>
              <div className="segmented" role="group" aria-label="Cámara">
                {views.map((view) => <button type="button" key={view.id} aria-pressed={camera === view.id} onClick={() => setCamera(view.id)}>{view.label}</button>)}
              </div>
            </header>
            <div className="map-body">
              <HospitalScene net={net} mission={mission} view={camera} shownFloor={shownFloor}/>
              <div className="floor-controls" role="group" aria-label="Planta del hospital">
                {floorList.map((floor) => <button type="button" key={floor.id} aria-pressed={shownFloor === floor.id}
                  onClick={() => { if (camera === 'follow') setCamera('orbit'); setFloorOverride(floor.id) }}>{floor.label}</button>)}
                {floorOverride && camera !== 'follow' && <button type="button" onClick={() => setFloorOverride(null)}>Auto</button>}
              </div>
              <div className="compass" aria-hidden="true"><ArrowUpRight size={18}/> <span>N</span></div>
              <div className="robot-chip">
                <div className="robot-icon"><Box size={16}/></div>
                <div><b>MEDI-01</b><span>{currentFloorLabel}</span></div>
                <span className="robot-state"><i className={mission.phase === 'waiting' ? 'warn' : ''}/>{status}</span>
              </div>
            </div>
            <footer className="map-foot">
              <div className="legend"><span><i className="route-key"/> Ruta</span><span><i className="robot-key"/> Robot</span><span><i className="obstacle-key"/> Bloqueo</span></div>
              <span className="camera-hint"><Eye size={14}/> {camera === 'orbit' ? 'Arrastra para girar · Rueda para acercar' : 'Vista ' + (camera === 'top' ? 'de planta' : 'de seguimiento')}</span>
            </footer>
          </section>
          <section className="card dispatch-card" aria-labelledby="dispatch-title">
            <header className="dispatch-head card-title"><div className="section-icon"><Package size={19}/></div><div><h2 id="dispatch-title">Despacho</h2><p>Farmacia Central · MEDI-01</p></div></header>
            {canEdit ? <form className="dispatch-body" onSubmit={(event) => {
              event.preventDefault()
              if (!quantitiesAreValid || !isCargoValid(cargo)) return
              setPin(''); setFloorOverride(null)
              dispatch({ type: 'dispatch', cargo, destination })
            }}>
              <label className="field-title" htmlFor="destination">Destino</label>
              <div className="select-wrap"><MapPin size={17}/><select id="destination" value={destination} onChange={(event) => setDestination(event.target.value as Destination)}>
                {Object.entries(destinations).map(([id,name]) => <option key={id} value={id}>{name}</option>)}
              </select></div>
              <div className="label-row"><span className="field-title">Medicamentos</span><span>Cant.</span></div>
              <div className="cargo-list">
                {catalog.map((item) => <div key={item.id} className="cargo-row">
                  <label htmlFor={item.id}><b>{item.name}</b><small>{item.unit}</small></label>
                  <input id={item.id} type="number" inputMode="numeric" min="0" step="1" value={quantities[item.id]} onChange={(event) => setQuantities({ ...quantities, [item.id]: event.target.value })}/>
                </div>)}
              </div>
              <button className="primary" type="submit" disabled={!quantitiesAreValid || !isCargoValid(cargo)}>Despachar robot <ArrowRight size={17}/></button>
              <p className="form-note"><ShieldCheck size={15}/> Inventario ficticio para la demostración.</p>
              {mission.phase === 'complete' && <button className="text-button" type="button" onClick={reset}><RotateCcw size={14}/> Reiniciar demo</button>}
            </form> : <div className="dispatch-body active-order">
              <div className="active-route"><span>Farmacia Central</span><ArrowRight size={15}/><b>{destinations[destinationKey]}</b></div>
              <div className="seal"><LockKeyhole size={16}/>{mission.events.some((event) => event.kind === 'delivery') ? 'Entrega confirmada' : 'Compartimento bloqueado'}</div>
              <div className="cargo-list" aria-label="Pedido en ruta">
                {mission.cargo.map((line) => {
                  const item = catalog.find((entry) => entry.id === line.id)!
                  return <div key={line.id} className="cargo-row"><span><b>{item.name}</b><small>{item.unit}</small></span><strong>{line.quantity}</strong></div>
                })}
              </div>
              {mission.phase === 'handoff' ? <form className="pin-form" onSubmit={(event) => { event.preventDefault(); dispatch({ type: 'pin', value: pin }) }}>
                <label className="field-title" htmlFor="pin">PIN de recepción</label>
                <small>Para esta simulación: <b>{DEMO_PIN}</b></small>
                <input id="pin" type="text" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={pin} onChange={(event) => setPin(event.target.value)} aria-invalid={mission.pinError}/>
                {mission.pinError && <p className="input-error" role="alert">PIN incorrecto. El compartimento sigue cerrado.</p>}
                <button className="primary" type="submit" disabled={pin.length !== 4}>Confirmar entrega <CircleCheck size={17}/></button>
              </form> : <div className="obstacle-controls">
                <button className="secondary danger" type="button" onClick={() => dispatch({type:'block'})} disabled={!readyForBlock}><TriangleAlert size={16}/> Bloquear un pasillo</button>
                {blocked > 0 && <button className="secondary" type="button" onClick={() => dispatch({type:'clear'})}>Liberar paso <ArrowDownRight size={15}/></button>}
              </div>}
              <button className="text-button" type="button" onClick={reset}><RotateCcw size={14}/> Reiniciar demo</button>
            </div>}
          </section>
          <section className="card trace" aria-labelledby="trace-title">
            <header className="trace-head card-title"><div className="section-icon"><ClipboardList size={18}/></div><div><h2 id="trace-title">Bitácora del traslado</h2><p>Seguimiento de cada evento del pedido.</p></div><span className="count">{totalEvents} {totalEvents === 1 ? 'evento' : 'eventos'}</span></header>
            {totalEvents ? <><p className="trace-cargo"><Package size={15}/> <span><b>Pedido:</b> {mission.cargo.map((line) => catalog.find((item) => item.id === line.id)!.name + ' × ' + line.quantity).join(' · ')}</span></p><ol className="events" aria-live="polite">
              {mission.events.map((event,index) => <li key={index}><span className={'event-dot ' + event.kind}/><time>{timeLabel(event.time)}</time><span>{event.text}</span></li>)}
            </ol></> : <div className="empty-log"><Activity size={19}/><span>Sin actividad. Despacha el robot para iniciar el registro.</span></div>}
          </section>
          <section className="card details" aria-labelledby="mission-title">
            <header className="card-title"><div className="section-icon"><Route size={18}/></div><div><h2 id="mission-title">Misión</h2><p>Vista operativa</p></div></header>
            <dl><div><dt><MapPin size={15}/> Destino</dt><dd>{destinations[destinationKey]}</dd></div>
              <div><dt><Package size={15}/> Unidades</dt><dd>{unitCount}</dd></div>
              <div><dt><Footprints size={15}/> Estado</dt><dd aria-live="polite">{status}</dd></div>
            </dl>
          </section>
        </div>
        <footer className="bottom"><span><Cross size={13}/> TAJIX · GovHealth</span><span>Prototipo de hackathon · Sin conexión a sistemas clínicos</span></footer>
      </main>
    </div>
  )
}

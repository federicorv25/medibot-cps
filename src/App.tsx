import { useEffect, useReducer, useRef, useState, type FormEvent } from 'react'
import {
  Activity, ArrowDownLeft, ArrowRight, ArrowUpRight, Box, Building2, CircleCheck, ClipboardList,
  Cross, Layers3, LockKeyhole, MapPin, Maximize2, Minimize2, Package, Play, RotateCcw, Route, TriangleAlert,
} from 'lucide-react'
import hospital from './maps/hospital'
import HospitalScene, { type CameraView } from './simulation/HospitalScene'
import {
  buildNetwork, catalog, DEMO_PIN, destinations, initialMission, isCargoValid, onboard, transition,
  type Action, type Cargo, type Destination, type Mission, type MissionKind,
} from './simulation/model'
import './App.css'

const net = buildNetwork(hospital)
const reducer = (state: Mission, action: Action) => transition(net, state, action)
const floors = [...hospital.floors].sort((a,b) => a.level - b.level)
const options = (Object.keys(destinations) as Destination[]).filter((id) => net.stations.has(id))
const views = [{ id: 'orbit', label: '3D' }, { id: 'top', label: 'Plano' }, { id: 'follow', label: 'Seguir robot' }, { id: 'building', label: 'Edificio' }] as const
const initialQuantities = { paracetamol: '4', salina: '2', amoxicilina: '0' }
const floorLabel = (id: string) => floors.find((floor) => floor.id === id)?.label ?? id
const cargoItem = (id: Cargo['id']) => catalog.find((item) => item.id === id)!
const describeCargo = (cargo: readonly Cargo[]) => cargo.map((line) => cargoItem(line.id).name + ' × ' + line.quantity).join(' · ')
const hasOrder = (s: Mission) => s.phase !== 'idle' && s.phase !== 'complete'

function timeLabel(value: number) {
  const seconds = Math.floor(value / 1000)
  return String(Math.floor(seconds / 60)).padStart(2,'0') + ':' + String(seconds % 60).padStart(2,'0')
}
function statusLabel(mission: Mission) {
  if (mission.phase === 'idle') return 'En base'
  if (mission.phase === 'waiting') return 'Paso bloqueado'
  if (mission.phase === 'handoff') return 'Esperando PIN'
  if (mission.phase === 'unloading') return mission.kind === 'pickup' ? 'Recogiendo' : 'Entregando'
  if (mission.phase === 'complete') return 'Misión completada'
  if (mission.route[0]?.edge.kind === 'lift') return 'En ascensor'
  return mission.returning ? 'Regresando' : 'En movimiento'
}

export default function App() {
  const [mission, dispatch] = useReducer(reducer, net, initialMission)
  const [destination, setDestination] = useState<Destination>('emergency')
  const [kind, setKind] = useState<MissionKind>('delivery')
  const [quantities, setQuantities] = useState(initialQuantities)
  const [camera, setCamera] = useState<CameraView>('building')
  const [facade, setFacade] = useState(true)
  const facadeShown = camera === 'building' && facade
  const [floorOverride, setFloorOverride] = useState<string | null>(null)
  const [pin, setPin] = useState('')
  const [fullscreen, setFullscreen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const viewer = useRef<HTMLElement>(null)
  const running = mission.phase === 'travel' || mission.phase === 'unloading'
  useEffect(() => {
    if (!running) return
    const timing = { previous: performance.now(), frame: 0 }
    const tick = (now: number) => {
      const elapsed = now - timing.previous
      if (elapsed >= 30) {
        // Mantener el tiempo real aunque el navegador reduzca cuadros al
        // alternar a PowerPoint o activar el ahorro de energía.
        dispatch({ type: 'tick', ms: elapsed })
        timing.previous = now
      }
      timing.frame = requestAnimationFrame(tick)
    }
    timing.frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(timing.frame)
  }, [running])
  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === viewer.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])
  useEffect(() => {
    if (!expanded) return
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setExpanded(false) }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [expanded])
  async function toggleFullscreen() {
    if (expanded) { setExpanded(false); return }
    if (document.fullscreenElement === viewer.current) { await document.exitFullscreen(); return }
    if (!document.fullscreenEnabled) { setExpanded(true); return }
    try { await viewer.current?.requestFullscreen() } catch { setExpanded(true) }
  }

  const active = hasOrder(mission)
  const isLarge = expanded || fullscreen
  const currentFloor = net.nodes.get(mission.node)!.floor
  const shownFloor = camera === 'follow' || camera === 'building' ? currentFloor : floorOverride ?? currentFloor
  const destinationKey = active ? mission.destination : destination
  const destinationName = net.stationLabels.get(destinationKey)!
  const destinationFloor = floorLabel(net.stations.get(destinationKey)!.floor)
  const outbound = active && !mission.returning
  const pickup = active ? mission.kind === 'pickup' : kind === 'pickup'
  const goalLabel = outbound || !active ? destinationName : 'Farmacia Central'
  const goalFloor = outbound || !active ? destinationFloor : floorLabel(net.nodes.get(net.pharmacy)!.floor)
  const quantitiesAreValid = catalog.every((item) => {
    const value = quantities[item.id].trim()
    return value === '' || /^\d+$/.test(value) && Number.isSafeInteger(Number(value))
  })
  const cargo: Cargo[] = catalog.map((item) => ({ id: item.id, quantity: Number(quantities[item.id]) }))
    .filter((item) => item.quantity > 0)
  const carrying = onboard(mission)
  const displayedCargo = !active ? (mission.phase === 'complete' ? mission.cargo : cargo) : carrying.length ? carrying : outbound && pickup ? mission.cargo : []
  const units = carrying.reduce((sum, item) => sum + item.quantity, 0)
  const status = statusLabel(mission)
  const taskLabel = !active ? (mission.phase === 'complete' ? 'En base · Misión completada' : 'En Farmacia Central')
    : mission.returning ? (pickup ? 'Lleva la recogida a Farmacia' : 'Regresa a Farmacia')
      : (mission.phase === 'unloading' ? pickup ? 'Recogiendo en ' : 'Entregando en '
        : mission.phase === 'handoff' ? pickup ? 'Recogida en ' : 'Entrega en '
          : pickup ? 'Va a recoger en ' : 'Va a entregar en ') + destinationName
  const trackingCargo = carrying.length ? describeCargo(carrying)
    : pickup && outbound ? 'Sin carga · Por recoger: ' + describeCargo(mission.cargo) : 'Sin carga'
  const summaryCargo = !active ? (mission.phase === 'complete' ? (mission.kind === 'pickup' ? 'Recogida recibida' : 'Pedido entregado') : 'Pedido preparado')
    : carrying.length ? 'Medicamentos a bordo' : pickup && outbound ? 'Por recoger · Robot sin carga' : 'Sin carga a bordo'
  const readyForBlock = mission.phase === 'travel' && mission.route.slice(mission.elapsed > 0 ? 1 : 0).some((leg) => leg.edge.kind === 'hall')
  const eta = mission.route.reduce((sum,leg) => sum + leg.duration,0) - mission.elapsed
  const latest = mission.events.at(-1)
  const pinInputId = isLarge ? 'pin-visor' : 'pin'
  function reset() {
    dispatch({ type: 'reset' })
    setQuantities(initialQuantities)
    setDestination('emergency')
    setKind('delivery')
    setCamera('building')
    setFacade(true)
    setFloorOverride(null)
    setPin('')
  }
  function start(requestedCargo: Cargo[], requestedDestination: Destination, requestedKind: MissionKind) {
    setPin(''); setFloorOverride(null)
    // El recorrido debe verse: al despachar abrimos el hospital.
    setFacade(false)
    setCamera('orbit')
    dispatch({ type: 'dispatch', cargo: requestedCargo, destination: requestedDestination, kind: requestedKind })
  }
  function startSample() {
    reset()
    start([{id:'paracetamol',quantity:4},{id:'salina',quantity:2}], 'inpatient', 'delivery')
    setCamera('building')
  }
  function submitPin(event: FormEvent) {
    event.preventDefault()
    dispatch({ type: 'pin', value: pin })
  }
  const missionControls = mission.phase === 'handoff' ? <form className="pin-form" onSubmit={submitPin}>
    <label htmlFor={pinInputId}>PIN {pickup ? 'para recoger' : 'de recepción'} <small>Demo: <b>{DEMO_PIN}</b></small></label>
    <div className="pin-actions">
      <input id={pinInputId} type="text" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={pin}
        onChange={(event) => setPin(event.target.value)} aria-invalid={mission.pinError} />
      <button className="primary" type="submit" disabled={pin.length !== 4}>
        {pickup ? 'Confirmar recogida' : 'Confirmar entrega'} <CircleCheck size={16}/>
      </button>
    </div>
    {mission.pinError && <p className="input-error" role="alert">PIN incorrecto. El compartimento sigue cerrado.</p>}
  </form> : <div className="obstacle-controls">
    {mission.phase === 'unloading' ? <span className="handoff-status"><CircleCheck size={16}/> {pickup ? 'Cargando medicamentos' : 'Entrega confirmada'}</span> :
      <button className="secondary danger" type="button" onClick={() => dispatch({type:'block'})} disabled={!readyForBlock}><TriangleAlert size={16}/> Bloquear pasillo</button>}
    {mission.blocked.length > 0 && <button className="secondary" type="button" onClick={() => dispatch({type:'clear'})}>Liberar paso <ArrowDownLeft size={15}/></button>}
  </div>

  return <div className="shell">
    <header className="topbar">
      <div className="wrap topbar-inner">
        <div className="brand"><div className="brand-icon"><Cross size={21} strokeWidth={2.9}/></div>
          <div><strong>MediBot<span> CPS</span></strong><small>LOGÍSTICA HOSPITALARIA</small></div>
        </div>
        <div className="top-right"><span className="team"><b>TAJIX</b><i/> GovHealth</span>
          <span className="demo-pill"><i/> Modo simulación</span></div>
      </div>
    </header>
    <main className="wrap main">
      <div className="intro">
        <div><div className="kicker"><span/> OPS / MEDIBOT 01</div>
          <h1>Centro de <em>control.</em></h1>
          <p>Entrega y recogida de medicamentos con seguimiento dentro del hospital.</p></div>
        <div className="intro-actions">
          <div className="site-chip"><Building2 size={19}/><div><b>Caja Petrolera de Salud</b><small>Santa Cruz, Bolivia</small></div></div>
          <a className="campus-link" href="./complejo.html"><Layers3 size={16}/> Complejo 3D · 3 torres</a>
          {!active && <button className="demo-start" type="button" onClick={startSample}><Play size={16} fill="currentColor"/> Probar recorrido · 5 plantas</button>}
        </div>
      </div>
      <section className="mission-strip" aria-label="Carga y destino">
        <div className="summary-task"><div className="summary-icon"><Route size={21}/></div><div>
          <small>{active ? pickup ? 'MISIÓN DE RECOGIDA' : 'MISIÓN DE ENTREGA' : 'MEDI-01 · EN BASE'}</small>
          <strong>{active ? taskLabel : 'Farmacia Central'}</strong>
        </div></div>
        <div className="summary-load"><small>{summaryCargo}</small><div className="load-pills">
          {displayedCargo.length ? displayedCargo.map((line) => <span key={line.id}><Package size={13}/>{cargoItem(line.id).name}<b>×{line.quantity}</b></span>)
            : <span className="empty-load"><Box size={14}/> Compartimento vacío</span>}
        </div></div>
        <div className="summary-destination"><small>{active ? 'Destino actual' : 'Próximo destino'}</small>
          <strong><MapPin size={15}/> {goalLabel}</strong><span>{goalFloor}</span>
        </div>
      </section>

      <div className="dashboard">
        <section ref={viewer} className={'card map-card' + (expanded ? ' expanded' : '')} aria-labelledby="map-title">
          <header className="map-head">
            <div className="card-title"><div className="section-icon"><Layers3 size={19}/></div><div><h2 id="map-title">Visor hospitalario</h2>
              <p>{hospital.label} · {floors.length} plantas</p></div></div>
            <div className="viewer-tools">
              <div className="segmented" role="group" aria-label="Cámara">
                {views.map((view) => <button type="button" key={view.id} aria-pressed={camera === view.id} onClick={() => setCamera(view.id)}>{view.label}</button>)}
              </div>
              <button className="facade-toggle" type="button" aria-pressed={facadeShown}
                title={facadeShown ? 'Ocultar la fachada para ver el interior' : 'Ver el edificio con su fachada exterior'}
                onClick={() => { if (camera !== 'building') { setCamera('building'); setFacade(true) } else setFacade(!facade) }}>
                <Building2 size={16}/><span>{facadeShown ? 'Ver por dentro' : 'Fachada'}</span>
              </button>
              <button className="fullscreen-toggle" type="button" onClick={() => void toggleFullscreen()}>
                {isLarge ? <Minimize2 size={16}/> : <Maximize2 size={16}/>}
                <span>{isLarge ? 'Salir de pantalla completa' : 'Pantalla completa'}</span>
              </button>
            </div>
          </header>
          <div className="map-body">
            <HospitalScene net={net} mission={mission} view={camera} shownFloor={shownFloor} robotTask={taskLabel} robotCargo={trackingCargo} facade={facade}/>
            <div className="floor-controls" role="group" aria-label="Planta del hospital">
              <span>NIVEL</span>
              {floors.map((floor) => <button type="button" key={floor.id} aria-pressed={camera !== 'building' && shownFloor === floor.id}
                aria-label={floor.label} title={floor.label} onClick={() => {
                  if (camera === 'follow' || camera === 'building') setCamera('orbit')
                  setFloorOverride(floor.id)
                }}>{floor.level === 0 ? 'PB' : String(floor.level).padStart(2,'0')}</button>)}
              {floorOverride && camera !== 'follow' && camera !== 'building' && <button type="button" onClick={() => setFloorOverride(null)}>Auto</button>}
            </div>
            <div className="map-readout"><ArrowUpRight size={16}/> {camera === 'building' ? (facade ? 'Edificio · fachada' : 'Edificio · interior') : floorLabel(shownFloor)}</div>
            <div className="robot-chip">
              <span className="robot-icon"><Box size={18}/></span>
              <div><b>MEDI-01</b><span>{floorLabel(currentFloor)} · {units} a bordo</span></div>
              <span className="robot-state"><i className={mission.phase === 'waiting' ? 'warn' : ''}/>{status}</span>
            </div>
            {camera !== 'follow' && floorOverride && floorOverride !== currentFloor && camera !== 'building' &&
              <button className="return-to-robot" type="button" onClick={() => { setFloorOverride(null); setCamera('follow') }}>Volver al robot <ArrowRight size={14}/></button>}
          </div>
          <footer className="map-foot">
            <div className="legend"><span><i className="route-key"/> Ruta activa</span><span><i className="robot-key"/> Robot</span><span><i className="obstacle-key"/> Bloqueo</span></div>
            <span className="camera-hint">{camera === 'orbit' || camera === 'building' ? 'Arrastra para girar · Rueda para acercar' : 'Cámara: ' + (camera === 'top' ? 'plano' : 'seguimiento')}</span>
          </footer>
          {isLarge && <div className="fullscreen-console"><div><strong>{taskLabel}</strong><small>{trackingCargo}</small></div>
            {active ? missionControls : <button className="primary" type="button" onClick={startSample}><Play size={16}/> Probar recorrido · 5 plantas</button>}</div>}
        </section>

        <section className="card dispatch-card" aria-labelledby="dispatch-title">
          <header className="dispatch-head card-title"><div className="section-icon"><Package size={19}/></div><div><h2 id="dispatch-title">{active ? 'Misión activa' : 'Nuevo traslado'}</h2><p>MEDI-01 · Farmacia Central</p></div></header>
          {!active ? <form className="dispatch-body" onSubmit={(event) => {
            event.preventDefault()
            if (quantitiesAreValid && isCargoValid(cargo)) start(cargo,destination,kind)
          }}>
            <div className="mission-kind" role="group" aria-label="Tipo de misión">
              <button type="button" aria-pressed={kind === 'delivery'} onClick={() => setKind('delivery')}><ArrowUpRight size={16}/> Entregar</button>
              <button type="button" aria-pressed={kind === 'pickup'} onClick={() => setKind('pickup')}><ArrowDownLeft size={16}/> Recoger</button>
            </div>
            <label className="field-title" htmlFor="destination">Destino</label>
            <div className="select-wrap"><MapPin size={16}/><select id="destination" value={destination} onChange={(event) => setDestination(event.target.value as Destination)}>
              {options.map((id) => <option key={id} value={id}>{net.stationLabels.get(id)} · {floorLabel(net.stations.get(id)!.floor)}</option>)}
            </select></div>
            <div className="label-row"><span className="field-title">Medicamentos</span><span>Cant.</span></div>
            <div className="cargo-list">{catalog.map((item) => <div key={item.id} className="cargo-row">
              <label htmlFor={item.id}><b>{item.name}</b><small>{item.unit}</small></label>
              <input id={item.id} type="number" inputMode="numeric" min="0" step="1" value={quantities[item.id]} onChange={(event) => setQuantities({ ...quantities, [item.id]: event.target.value })}/>
            </div>)}</div>
            <button className="primary" type="submit" disabled={!quantitiesAreValid || !isCargoValid(cargo)}>Despachar robot <ArrowRight size={17}/></button>
            <p className="form-note">Inventario ficticio para la simulación.</p>
            {mission.phase === 'complete' && <button className="text-button" type="button" onClick={reset}><RotateCcw size={14}/> Reiniciar demo</button>}
          </form> : <div className="dispatch-body active-order">
            <div className="active-route"><span>{mission.returning ? destinationName : 'Farmacia Central'}</span><ArrowRight size={15}/><b>{goalLabel}</b></div>
            <div className="seal"><LockKeyhole size={16}/>{mission.phase === 'unloading' ? 'Compartimento abierto' : 'Compartimento bloqueado'}</div>
            <div className="telemetry"><div><small>Estado</small><b>{status}</b></div><div><small>Tiempo restante</small><b>{mission.phase === 'travel' ? Math.max(1,Math.ceil(eta/1000)) + ' s' : '—'}</b></div></div>
            {!isLarge && missionControls}
            <button className="text-button" type="button" onClick={reset}><RotateCcw size={14}/> Reiniciar demo</button>
          </div>}
        </section>
        <section className="card trace" aria-labelledby="trace-title">
          <header className="trace-head card-title"><div className="section-icon"><ClipboardList size={18}/></div><div><h2 id="trace-title">Bitácora del traslado</h2><p>Eventos de la misión actual</p></div><span className="count">{mission.events.length} eventos</span></header>
          {latest ? <><p className="trace-cargo"><Package size={15}/><span><b>Pedido:</b> {describeCargo(mission.cargo)}</span></p>
            <ol className="events" aria-live="polite">{mission.events.map((event,index) => <li key={index}>
              <span className={'event-dot ' + event.kind}/><time>{timeLabel(event.time)}</time><span>{event.text}</span></li>)}</ol>
          </> : <div className="empty-log"><Activity size={18}/> Los eventos aparecerán al iniciar el recorrido.</div>}
        </section>
        <section className="card details" aria-label="Estado de la misión">
          <div className="kicker"><span/> TELEMETRÍA</div>
          <dl><div><dt>Posición</dt><dd>{floorLabel(currentFloor)}</dd></div>
            <div><dt>Carga a bordo</dt><dd>{units} unidades</dd></div>
            <div><dt>Estado</dt><dd aria-live="polite">{status}</dd></div></dl>
        </section>
      </div>
      <footer className="bottom"><span>TAJIX / GovHealth</span><span>Prototipo · No conectado a sistemas clínicos</span></footer>
    </main>
  </div>
}

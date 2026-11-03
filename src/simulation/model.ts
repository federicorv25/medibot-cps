import type { Corridor, HospitalMap, Station, Waypoint } from '../maps/contract'

export const FLOOR_HEIGHT = 5.2
export const DEMO_PIN = '0426'
export type Destination = Exclude<Station, 'pharmacy'>
export type MissionKind = 'delivery' | 'pickup'
export const destinations: Record<Destination, string> = {
  emergency: 'Urgencias', diagnostics: 'Diagnóstico', surgery: 'Quirófanos', care: 'Cuidados', inpatient: 'Internación',
}
export const catalog = [
  { id: 'paracetamol', name: 'Paracetamol', unit: 'cajas' },
  { id: 'salina', name: 'Solución salina', unit: 'bolsas' },
  { id: 'amoxicilina', name: 'Amoxicilina', unit: 'cajas' },
] as const
export type Cargo = { id: typeof catalog[number]['id']; quantity: number }
export type XYZ = [number, number, number]
export type Leg = { edge: Corridor; from: string; to: string; duration: number }

export function buildNetwork(map: HospitalMap) {
  const floors = new Map(map.floors.map((floor) => [floor.id, floor]))
  const nodes = new Map(map.nodes.map((node) => [node.id, node]))
  const edges = new Map(map.edges.map((edge) => [edge.id, edge]))
  const stations = new Map<Station, Waypoint>()
  if (floors.size !== map.floors.length || nodes.size !== map.nodes.length || edges.size !== map.edges.length ||
      new Set(map.floors.map((floor) => floor.level)).size !== floors.size) throw new Error('Identificadores o niveles del mapa duplicados.')
  for (const node of nodes.values()) {
    const floor = floors.get(node.floor)
    if (!floor || !node.at.every(Number.isFinite)) throw new Error('Nodo inválido: ' + node.id)
    if (node.station) {
      if (stations.has(node.station)) throw new Error('Estación duplicada: ' + node.station)
      stations.set(node.station, node)
    }
  }
  const pharmacy = stations.get('pharmacy')
  if (!pharmacy || !(['emergency', 'surgery', 'inpatient'] as const).every((name) => stations.has(name))) throw new Error('Faltan estaciones obligatorias.')
  const at = (id: string): XYZ => {
    const node = nodes.get(id)
    if (!node) throw new Error('Nodo desconocido: ' + id)
    return [node.at[0], floors.get(node.floor)!.level * FLOOR_HEIGHT, node.at[1]]
  }
  const neighbors = new Map<string, Leg[]>([...nodes.keys()].map((id) => [id, []]))
  for (const edge of edges.values()) {
    const from = nodes.get(edge.from)
    const to = nodes.get(edge.to)
    if (!from || !to || from.id === to.id || (edge.kind === 'lift') !== (from.floor !== to.floor) ||
      (edge.kind === 'lift' && (from.at[0] !== to.at[0] || from.at[1] !== to.at[1]))) throw new Error('Tramo inválido: ' + edge.id)
    const distance = Math.hypot(...at(from.id).map((v, i) => v - at(to.id)[i]))
    const duration = edge.kind === 'lift' ? 2400 : Math.max(600, distance * 440)
    neighbors.get(from.id)!.push({ edge, from: from.id, to: to.id, duration })
    neighbors.get(to.id)!.push({ edge, from: to.id, to: from.id, duration })
  }
  const path = (from: string, to: string, blocked: readonly string[] = []): Leg[] | null => {
    const open = new Set(nodes.keys())
    const distances = new Map([[from, 0]])
    const prev = new Map<string, Leg>()
    while (open.size) {
      let current: string | undefined
      let best = Infinity
      for (const id of open) {
        const value = distances.get(id) ?? Infinity
        if (value < best) { current = id; best = value }
      }
      if (!current) break
      if (current === to) {
        const result: Leg[] = []
        let cursor = current
        while (cursor !== from) {
          const leg = prev.get(cursor)!
          result.push(leg)
          cursor = leg.from
        }
        return result.reverse()
      }
      open.delete(current)
      for (const leg of neighbors.get(current)!) {
        if (!open.has(leg.to) || blocked.includes(leg.edge.id)) continue
        const candidate = best + leg.duration
        if (candidate < (distances.get(leg.to) ?? Infinity)) {
          distances.set(leg.to, candidate)
          prev.set(leg.to, leg)
        }
      }
    }
    return null
  }
  for (const station of stations.values()) {
    if (!path(pharmacy.id, station.id)) throw new Error('Estación sin acceso: ' + station.station)
  }
  return { map, nodes, edges, stations, pharmacy: pharmacy.id, at, path }
}
export type Network = ReturnType<typeof buildNetwork>
type Phase = 'idle' | 'travel' | 'waiting' | 'handoff' | 'unloading' | 'complete'
type EventKind = 'dispatch' | 'reroute' | 'warning' | 'floor' | 'arrive' | 'delivery' | 'pickup' | 'return'
export type Mission = {
  phase: Phase; node: string; goal: string; destination: Destination; kind: MissionKind
  returning: boolean; route: Leg[]; elapsed: number; time: number; blocked: string[]
  cargo: Cargo[]; events: { text: string; kind: EventKind; time: number }[]
  pinError: boolean
}
export type Action =
  | { type: 'dispatch'; cargo: Cargo[]; destination: Destination; kind?: MissionKind }
  | { type: 'tick'; ms: number }
  | { type: 'block' | 'clear' | 'reset' }
  | { type: 'pin'; value: string }

export function initialMission(net: Network): Mission {
  return { phase: 'idle', node: net.pharmacy, goal: net.pharmacy, destination: 'emergency', kind: 'delivery', returning: false,
    route: [], elapsed: 0, time: 0, blocked: [], cargo: [], events: [], pinError: false }
}
function event(s: Mission, kind: EventKind, text: string): Mission {
  return { ...s, events: [...s.events, { kind, text, time: s.time }] }
}
function arrive(s: Mission): Mission {
  if (s.node !== s.goal) return event({ ...s, phase: 'waiting' }, 'warning', 'Ruta sin paso. Robot detenido en un punto seguro.')
  return s.returning
    ? event({ ...s, phase: 'complete' }, 'return', s.kind === 'pickup'
      ? 'Medicamentos recogidos recibidos en Farmacia Central.' : 'Robot de vuelta en Farmacia Central.')
    : event({ ...s, phase: 'handoff' }, 'arrive', 'Llegó a ' + destinations[s.destination]
      + (s.kind === 'pickup' ? '. Esperando el PIN para recoger.' : '. Esperando el PIN de recepción.'))
}
export function onboard(s: Mission): readonly Cargo[] {
  if (s.phase === 'idle' || s.phase === 'complete') return []
  if (s.kind === 'pickup') return s.returning || s.phase === 'unloading' ? s.cargo : []
  return s.returning || s.phase === 'unloading' ? [] : s.cargo
}
function replan(net: Network, s: Mission, blocked: string[]) {
  const active = s.elapsed > 0 ? s.route[0] : undefined
  const path = net.path(active?.to ?? s.node, s.goal, blocked)
  const next: Mission = { ...s, blocked, route: [...(active ? [active] : []), ...(path ?? [])], phase: 'travel' }
  return { next, possible: path !== null }
}
export function blockCandidate(net: Network, s: Mission) {
  if (s.phase !== 'travel') return undefined
  const active = s.elapsed > 0 ? s.route[0] : undefined
  const upcoming = s.route.slice(active ? 1 : 0).filter((leg) => leg.edge.kind === 'hall')
  return upcoming.find((leg) => net.path(active?.to ?? s.node, s.goal, [...s.blocked, leg.edge.id])) ?? upcoming[0]
}
export function isCargoValid(cargo: readonly Cargo[]) {
  return cargo.length > 0 && new Set(cargo.map((line) => line.id)).size === cargo.length &&
    cargo.every((line) => catalog.some((item) => item.id === line.id) && Number.isSafeInteger(line.quantity) && line.quantity > 0)
}
export function transition(net: Network, s: Mission, action: Action): Mission {
  switch (action.type) {
    case 'reset': return initialMission(net)
    case 'dispatch': {
      if ((s.phase !== 'idle' && s.phase !== 'complete') || !isCargoValid(action.cargo)) return s
      const goal = net.stations.get(action.destination)
      if (!goal) return s
      const route = net.path(net.pharmacy, goal.id)
      if (!route) return s
      const kind = action.kind ?? 'delivery'
      return event({ ...initialMission(net), cargo: action.cargo.map((line) => ({ ...line })),
        goal: goal.id, destination: action.destination, kind, route, phase: 'travel' },
      'dispatch', kind === 'pickup' ? 'Salida de Farmacia Central sin carga para recoger el pedido.'
        : 'Salida de Farmacia Central. Compartimento bloqueado.')
    }
    case 'tick': {
      if (action.ms <= 0) return s
      if (s.phase === 'unloading') {
        const step = Math.min(action.ms, 1500 - s.elapsed)
        const next = { ...s, time: s.time + step, elapsed: s.elapsed + step }
        if (next.elapsed < 1500) return next
        const route = net.path(s.node, net.pharmacy, s.blocked)
        const ready: Mission = { ...next, returning: true, goal: net.pharmacy, elapsed: 0, route: route ?? [], phase: route ? 'travel' : 'waiting' }
        return route ? transition(net, ready, { type: 'tick', ms: action.ms - step })
          : event(ready, 'warning', 'No hay paso de regreso. Robot detenido en el destino.')
      }
      if (s.phase !== 'travel') return s
      let remaining = action.ms
      let next = s
      while (next.phase === 'travel') {
        const leg = next.route[0]
        if (!leg) return arrive(next)
        const step = Math.min(remaining, leg.duration - next.elapsed)
        next = { ...next, time: next.time + step, elapsed: next.elapsed + step }
        remaining -= step
        if (next.elapsed < leg.duration) return next
        next = { ...next, node: leg.to, elapsed: 0, route: next.route.slice(1) }
        if (leg.edge.kind === 'lift') {
          const floor = net.map.floors.find((entry) => entry.id === net.nodes.get(leg.to)?.floor)!
          next = event(next, 'floor', 'Ascensor: llegó a ' + floor.label + '.')
        }
        if (!next.route.length) return arrive(next)
        if (remaining === 0) return next
      }
      return next
    }
    case 'block': {
      const leg = blockCandidate(net, s)
      if (!leg) return s
      const { next, possible } = replan(net, s, [...s.blocked, leg.edge.id])
      const changed = event(next, possible ? 'reroute' : 'warning', possible
        ? 'Pasillo bloqueado. Ruta alternativa calculada.'
        : 'Pasillo bloqueado. No hay ruta alternativa.')
      return changed.route.length ? changed : arrive(changed)
    }
    case 'clear': {
      if (!s.blocked.length) return s
      if (s.phase !== 'travel' && s.phase !== 'waiting') return { ...s, blocked: [] }
      const { next } = replan(net, s, [])
      return event(next, 'reroute', 'Pasillo liberado. Ruta actualizada.')
    }
    case 'pin': {
      if (s.phase !== 'handoff') return s
      if (action.value !== DEMO_PIN) return { ...s, pinError: true }
      return event({ ...s, phase: 'unloading', pinError: false }, s.kind,
        s.kind === 'pickup' ? 'PIN validado. Medicamentos recogidos; regreso a Farmacia.'
          : 'PIN validado. Compartimento abierto y pedido entregado.')
    }
  }
}
export function pose(net: Network, s: Mission) {
  const from = net.at(s.node)
  const leg = s.route[0]
  if (!leg) return { position: from, heading: Math.PI / 2, lift: false }
  const to = net.at(leg.to)
  const t = s.elapsed / leg.duration
  return { position: from.map((v, i) => v + (to[i] - v) * t) as XYZ,
    heading: Math.atan2(to[0] - from[0], to[2] - from[2]), lift: leg.edge.kind === 'lift' }
}

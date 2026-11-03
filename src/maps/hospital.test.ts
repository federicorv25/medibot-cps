import { describe, expect, it } from 'vitest'
import type { Corridor, Point, Room } from './contract'
import hospital from './hospital'

const nodes = new Map(hospital.nodes.map((n) => [n.id, n]))
const floors = new Map(hospital.floors.map((f) => [f.id, f]))
const EPS = 0.05
const DOOR_HALF = 1.1 // mitad de la abertura mínima que dibuja la escena (2.25 m)

function bounds(room: Room) {
  const [x, z] = room.center, [w, d] = room.size
  return { x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 }
}
function inside(room: Room, [x, z]: Point, margin = EPS) {
  const b = bounds(room)
  return x > b.x0 + margin && x < b.x1 - margin && z > b.z0 + margin && z < b.z1 - margin
}
function adjacency(skip: Set<string> = new Set()) {
  const adj = new Map<string, { to: string; edge: Corridor }[]>([...nodes.keys()].map((id) => [id, []]))
  for (const edge of hospital.edges) {
    if (skip.has(edge.id)) continue
    adj.get(edge.from)!.push({ to: edge.to, edge })
    adj.get(edge.to)!.push({ to: edge.from, edge })
  }
  return adj
}
function route(from: string, to: string, skip: Set<string> = new Set()) {
  const adj = adjacency(skip)
  const prev = new Map<string, Corridor>([[from, undefined as unknown as Corridor]])
  const queue = [from]
  while (queue.length) {
    const current = queue.shift()!
    if (current === to) break
    for (const { to: next, edge } of adj.get(current)!) {
      if (!prev.has(next)) { prev.set(next, edge); queue.push(next) }
    }
  }
  if (!prev.has(to)) return null
  const edges: string[] = []
  for (let cursor = to; cursor !== from;) {
    const edge = prev.get(cursor)!
    edges.push(edge.id)
    cursor = edge.from === cursor ? edge.to : edge.from
  }
  return edges.reverse()
}
const station = (name: string) => hospital.nodes.find((n) => n.station === name)!.id

describe('mapa recreado del hospital', () => {
  it('conserva el rótulo y tiene cinco plantas con identificadores y niveles únicos', () => {
    expect(hospital.label).toBe('Mapa recreado para la simulación')
    for (const list of [hospital.floors, hospital.rooms, hospital.nodes, hospital.edges]) {
      expect(new Set(list.map((item) => item.id)).size).toBe(list.length)
    }
    expect(hospital.floors.map((f) => f.level).sort()).toEqual([0, 1, 2, 3, 4])
    expect(hospital.floors.map((f) => f.label)).toEqual(['Planta baja', 'Piso 1', 'Piso 2', 'Piso 3', 'Piso 4'])
  })

  it('ubica una vez cada estación, dentro de su sala, con un destino por planta', () => {
    for (const name of ['pharmacy', 'emergency', 'surgery', 'inpatient', 'diagnostics', 'care'] as const) {
      const found = hospital.nodes.filter((n) => n.station === name)
      expect(found, name).toHaveLength(1)
      const rooms = hospital.rooms.filter((r) => r.kind === name)
      expect(rooms, name).toHaveLength(1)
      expect(rooms[0].floor).toBe(found[0].floor)
      expect(inside(rooms[0], found[0].at)).toBe(true)
    }
    const destinationFloors = hospital.nodes.filter((n) => n.station && n.station !== 'pharmacy').map((n) => n.floor)
    expect(new Set(destinationFloors)).toEqual(new Set(hospital.floors.map((f) => f.id)))
  })

  it('mantiene salas dentro de la planta y sin superposiciones', () => {
    for (const room of hospital.rooms) {
      const [w, d] = floors.get(room.floor)!.size
      const b = bounds(room)
      expect(b.x0 >= -w / 2 && b.x1 <= w / 2 && b.z0 >= -d / 2 && b.z1 <= d / 2, room.id).toBe(true)
      for (const other of hospital.rooms) {
        if (other === room || other.floor !== room.floor) continue
        const o = bounds(other)
        const overlap = b.x0 < o.x1 - EPS && o.x0 < b.x1 - EPS && b.z0 < o.z1 - EPS && o.z0 < b.z1 - EPS
        expect(overlap, `${room.id} / ${other.id}`).toBe(false)
      }
    }
  })

  it('alinea el ascensor y solo lo usa entre niveles contiguos', () => {
    for (const edge of hospital.edges) {
      const a = nodes.get(edge.from)!, b = nodes.get(edge.to)!
      expect(a && b, edge.id).toBeTruthy()
      expect(edge.kind === 'lift', edge.id).toBe(a.floor !== b.floor)
      if (edge.kind === 'lift') {
        expect(a.at).toEqual(b.at)
        expect(Math.abs(floors.get(a.floor)!.level - floors.get(b.floor)!.level), edge.id).toBe(1)
        const shaft = hospital.rooms.find((r) => r.kind === 'lift' && r.floor === a.floor)!
        expect(inside(shaft, a.at), edge.id).toBe(true)
      }
    }
    expect(hospital.edges.filter((e) => e.kind === 'lift')).toHaveLength(hospital.floors.length - 1)
    const liftRooms = hospital.rooms.filter((r) => r.kind === 'lift')
    expect(liftRooms).toHaveLength(hospital.floors.length)
    expect(new Set(liftRooms.map((r) => r.center.join()))).toHaveProperty('size', 1)
  })

  it('traza tramos rectos que solo entran a una sala por su puerta', () => {
    for (const edge of hospital.edges.filter((e) => e.kind === 'hall')) {
      const a = nodes.get(edge.from)!.at, b = nodes.get(edge.to)!.at
      expect(a[0] === b[0] || a[1] === b[1], `${edge.id} no es ortogonal`).toBe(true)
      for (const room of hospital.rooms.filter((r) => r.floor === nodes.get(edge.from)!.floor)) {
        const crosses = Array.from({ length: 101 }, (_, i) => [a[0] + (b[0] - a[0]) * i / 100, a[1] + (b[1] - a[1]) * i / 100] as const)
          .some((p) => inside(room, p))
        if (!crosses) continue
        // Solo se permite si el tramo termina en la sala y cruza el muro por la abertura de la puerta.
        const endsHere = inside(room, a) || inside(room, b)
        const vertical = a[0] === b[0]
        const doorOk = vertical
          ? (room.door === 'north' || room.door === 'south') && Math.abs(a[0] - room.center[0]) < DOOR_HALF
          : (room.door === 'east' || room.door === 'west') && Math.abs(a[1] - room.center[1]) < DOOR_HALF
        expect(endsHere && doorOk, `${edge.id} atraviesa ${room.id}`).toBe(true)
      }
    }
  })

  it('conecta Farmacia con los destinos de las cinco plantas', () => {
    const pharmacy = station('pharmacy')
    for (const name of ['emergency', 'diagnostics', 'surgery', 'care', 'inpatient']) expect(route(pharmacy, station(name)), name).not.toBeNull()
    const toTop = route(pharmacy, station('inpatient'))!
    expect(toTop).toEqual(expect.arrayContaining(['lift-pb-p1', 'lift-p1-p2', 'lift-p2-p3', 'lift-p3-p4']))
  })

  it('ofrece dos recorridos a Urgencias y se recupera al liberar el paso', () => {
    const pharmacy = station('pharmacy'), emergency = station('emergency')
    const first = route(pharmacy, emergency)!
    const shared = new Set(['pharmacy-exit', 'emergency-entry'])
    const firstOwn = first.filter((id) => !shared.has(id))
    const second = route(pharmacy, emergency, new Set(firstOwn))
    expect(second).not.toBeNull()
    expect(second!.filter((id) => !shared.has(id)).some((id) => first.includes(id))).toBe(false)
    // Un bloqueo a mitad del pasillo principal deja un desvío.
    expect(route('main-hall-mid', emergency, new Set(['main-hall-east']))).not.toBeNull()
    // Con ambos recorridos cortados no hay paso; al liberar, vuelve a haberlo.
    expect(route(pharmacy, emergency, new Set(['main-hall-west', 'north-west-pb']))).toBeNull()
    expect(route(pharmacy, emergency)).toEqual(first)
  })

  it('da dos accesos a la estación de cada planta superior desde el ascensor', () => {
    for (const [floor, name] of [['p1', 'diagnostics'], ['p2', 'surgery'], ['p3', 'care'], ['p4', 'inpatient']] as const) {
      const entry = `${name}-entry`
      const first = route(`lift-${floor}`, station(name))!
      const own = first.filter((id) => id !== entry && id !== `lift-door-${floor}`)
      expect(route(`lift-${floor}`, station(name), new Set(own)), name).not.toBeNull()
    }
  })
})

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
  it('conserva el rótulo y tiene identificadores y niveles únicos', () => {
    expect(hospital.label).toBe('Mapa recreado para la simulación')
    for (const list of [hospital.floors, hospital.rooms, hospital.nodes, hospital.edges]) {
      expect(new Set(list.map((item) => item.id)).size).toBe(list.length)
    }
    expect(new Set(hospital.floors.map((f) => Math.trunc(f.level))).size).toBe(hospital.floors.length)
    expect(hospital.floors.every((f) => Number.isInteger(f.level))).toBe(true)
  })

  it('ubica una vez cada estación, dentro de su sala', () => {
    for (const name of ['pharmacy', 'emergency', 'surgery', 'inpatient'] as const) {
      const found = hospital.nodes.filter((n) => n.station === name)
      expect(found, name).toHaveLength(1)
      const rooms = hospital.rooms.filter((r) => r.kind === name)
      expect(rooms, name).toHaveLength(1)
      expect(rooms[0].floor).toBe(found[0].floor)
      expect(inside(rooms[0], found[0].at)).toBe(true)
    }
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

  it('alinea el ascensor y solo los tramos lift cambian de planta', () => {
    for (const edge of hospital.edges) {
      const a = nodes.get(edge.from)!, b = nodes.get(edge.to)!
      expect(a && b, edge.id).toBeTruthy()
      expect(edge.kind === 'lift', edge.id).toBe(a.floor !== b.floor)
      if (edge.kind === 'lift') expect(a.at).toEqual(b.at)
    }
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

  it('conecta Farmacia con todos los destinos y ofrece dos recorridos a Urgencias', () => {
    const pharmacy = station('pharmacy')
    for (const name of ['emergency', 'surgery', 'inpatient']) expect(route(pharmacy, station(name)), name).not.toBeNull()
    const first = route(pharmacy, station('emergency'))!
    const shared = new Set(['pharmacy-exit', 'emergency-entry'])
    const second = route(pharmacy, station('emergency'), new Set(first.filter((id) => !shared.has(id))))
    expect(second).not.toBeNull()
    expect(second!.filter((id) => !shared.has(id)).some((id) => first.includes(id))).toBe(false)
  })

  it('llega a otra planta a través del ascensor', () => {
    const toInpatient = route(station('pharmacy'), station('inpatient'))!
    expect(toInpatient).toEqual(expect.arrayContaining(['lift-pb-p1', 'lift-p1-p2']))
  })
})

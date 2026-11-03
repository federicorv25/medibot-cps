import { describe, expect, it } from 'vitest'
import demoMap from '../maps/demo-map'
import hospital from '../maps/hospital'
import { buildNetwork, DEMO_PIN, initialMission, onboard, pose, transition, type Destination } from './model'

const net = buildNetwork(demoMap)
const cargo = [{ id: 'paracetamol', quantity: 4 }, { id: 'salina', quantity: 2 }] as const
const start = (destination: Destination = 'emergency') =>
  transition(net, initialMission(net), { type: 'dispatch', cargo: [...cargo], destination })

describe('mapa transitable', () => {
  it('conecta todas las estaciones y conserva una alternativa a Urgencias', () => {
    const candidate = buildNetwork(hospital)
    const emergency = candidate.stations.get('emergency')!
    const direct = candidate.path(candidate.pharmacy, emergency.id)!
    expect(direct.length).toBeGreaterThan(0)
    expect(direct.some((leg) => {
      const alternate = candidate.path(candidate.pharmacy, emergency.id, [leg.edge.id])
      return alternate?.length
    })).toBe(true)
    for (const destination of ['surgery', 'inpatient'] as const) {
      const stop = candidate.stations.get(destination)!
      const route = candidate.path(candidate.pharmacy, stop.id)!
      expect(route.at(-1)?.to).toBe(stop.id)
      if (candidate.nodes.get(candidate.pharmacy)?.floor !== stop.floor) {
        expect(route.some((leg) => leg.edge.kind === 'lift')).toBe(true)
      }
    }
  })
  it('permite llegar a un destino de cada una de las cinco plantas ilustrativas', () => {
    const reachableFloors = [...net.stations.values()]
      .filter((station) => station.station !== 'pharmacy' && net.path(net.pharmacy, station.id)?.length)
      .map((station) => station.floor)
    expect(new Set(reachableFloors)).toEqual(new Set(demoMap.floors.map((floor) => floor.id)))
    expect(demoMap.floors).toHaveLength(5)
  })
})

describe('traslado simulado', () => {
  it('no despacha sin carga ni con cantidades fraccionarias', () => {
    const idle = initialMission(net)
    expect(transition(net, idle, { type: 'dispatch', cargo: [], destination: 'emergency' })).toBe(idle)
    expect(transition(net, idle, {
      type: 'dispatch', cargo: [{ id: 'salina', quantity: 1.5 }], destination: 'emergency',
    })).toBe(idle)
  })
  it('recalcula desde el punto seguro sin saltar la posición actual', () => {
    const moving = transition(net, start(), { type: 'tick', ms: 100 })
    const detour = transition(net, moving, { type: 'block' })
    expect(pose(net, detour).position).toEqual(pose(net, moving).position)
    expect(detour.blocked).toEqual(['main-hall'])
    expect(detour.route.map(({ edge }) => edge.id)).toContain('south-hall')
    expect(detour.route.map(({ edge }) => edge.id)).not.toContain('main-hall')
    const arrived = transition(net, detour, { type: 'tick', ms: 60_000 })
    expect(arrived.phase).toBe('handoff')
    expect(arrived.cargo).toEqual(cargo)
    expect(arrived.events.map(({ kind }) => kind)).toEqual(['dispatch', 'reroute', 'arrive'])
  })
  it('espera en un punto seguro si todos los caminos quedan bloqueados y luego sigue', () => {
    const moving = transition(net, start(), { type: 'tick', ms: 100 })
    const first = transition(net, moving, { type: 'block' })
    const second = transition(net, first, { type: 'block' })
    const waiting = transition(net, second, { type: 'tick', ms: 30_000 })
    expect(waiting.phase).toBe('waiting')
    expect(waiting.node).toBe('west')
    expect(transition(net, waiting, { type: 'tick', ms: 2_000 })).toBe(waiting)
    const resumed = transition(net, waiting, { type: 'clear' })
    expect(transition(net, resumed, { type: 'tick', ms: 30_000 }).phase).toBe('handoff')
  })
  it('llega al piso 4, rechaza un PIN incorrecto, entrega y vuelve a Farmacia', () => {
    const moving = start('inpatient')
    expect(moving.route.some(({ edge }) => edge.kind === 'lift')).toBe(true)
    const arrived = transition(net, moving, { type: 'tick', ms: 60_000 })
    expect(arrived.node).toBe('inpatient')
    expect(net.nodes.get(arrived.node)?.floor).toBe('p4')
    expect(pose(net, arrived).position[1]).toBeGreaterThan(0)
    const wrong = transition(net, arrived, { type: 'pin', value: '1111' })
    expect(wrong.phase).toBe('handoff')
    expect(wrong.pinError).toBe(true)
    expect(wrong.events.some(({ kind }) => kind === 'delivery')).toBe(false)
    const correct = transition(net, wrong, { type: 'pin', value: DEMO_PIN })
    const home = transition(net, correct, { type: 'tick', ms: 60_000 })
    expect(home.phase).toBe('complete')
    expect(home.node).toBe(net.pharmacy)
    expect(home.events.filter(({ kind }) => kind !== 'floor').map(({ kind }) => kind)).toEqual(['dispatch', 'arrive', 'delivery', 'return'])
    expect(arrived.events.filter(({ kind }) => kind === 'floor').map(({ text }) => text)).toEqual(
      [1,2,3,4].map((level) => 'Ascensor: llegó a Piso ' + level + '.'),
    )
    expect(transition(net, home, { type: 'reset' })).toEqual(initialMission(net))
  })
  it('sale sin carga en una recogida y vuelve con el pedido tras validar el PIN', () => {
    const outbound = transition(net, initialMission(net), { type: 'dispatch', cargo: [...cargo], destination: 'care', kind: 'pickup' })
    expect(onboard(outbound)).toEqual([])
    const arrived = transition(net, outbound, { type: 'tick', ms: 60_000 })
    expect(net.nodes.get(arrived.node)?.floor).toBe('p3')
    expect(onboard(transition(net, arrived, { type: 'pin', value: '9999' }))).toEqual([])
    const loaded = transition(net, arrived, { type: 'pin', value: DEMO_PIN })
    const returning = transition(net, loaded, { type: 'tick', ms: 1800 })
    expect(returning.returning).toBe(true)
    expect(onboard(returning)).toEqual(cargo)
    const home = transition(net, returning, { type: 'tick', ms: 60_000 })
    expect(home.phase).toBe('complete')
    expect(onboard(home)).toEqual([])
    expect(home.events.filter(({ kind }) => kind !== 'floor').map(({ kind }) => kind)).toEqual(['dispatch','arrive','pickup','return'])
  })
})

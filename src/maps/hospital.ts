import type { Corridor, HospitalMap, Room, RoomKind, Station, Waypoint } from './contract'

/*
 * Mapa recreado de TAJIX para la simulación de MediBot CPS.
 * Edificio ilustrativo inspirado en un hospital de la seguridad social de Santa Cruz.
 * No es una réplica de ningún plano autorizado.
 *
 * Coordenadas en metros, origen al centro de cada planta; X hacia el este, Z hacia el sur.
 * Las tres plantas comparten la misma retícula:
 *   z -13 … -5    franja norte de salas (puerta al sur)
 *   z  -5 … -1.5  pasillo norte (eje z = -3.2)
 *   z -1.5 … 3.5  franja central con el ascensor (x -1 … 3)
 *   z 3.5 … 7     pasillo sur (eje z = 5.2)
 *   z   7 … 13    franja sur de salas (puerta al norte)
 * Los pasos de servicio en x = ±20.5 unen ambos pasillos y cierran el anillo
 * que da dos recorridos posibles hacia cada estación.
 */

const FLOOR_SIZE = [46, 28] as const
const NORTH_HALL = -3.2
const SOUTH_HALL = 5.2
const WEST_LINK = -20.5
const EAST_LINK = 20.5
const LIFT_X = 1
const LIFT_STOP = 2.4

type Band = 'north' | 'middle-north' | 'middle-south' | 'south'
const bands: Record<Band, { z: number; depth: number; door: Room['door'] }> = {
  north: { z: -9, depth: 8, door: 'south' },
  'middle-north': { z: 1, depth: 5, door: 'north' },
  'middle-south': { z: 1, depth: 5, door: 'south' },
  south: { z: 10, depth: 6, door: 'north' },
}

/** Sala definida por su borde oeste y este dentro de una franja. */
function room(id: string, label: string, floor: string, band: Band, west: number, east: number, kind: RoomKind = 'support'): Room {
  const { z, depth, door } = bands[band]
  return { id, label, floor, kind, center: [(west + east) / 2, z], size: [east - west, depth], door }
}
function node(id: string, floor: string, x: number, z: number, station?: Station): Waypoint {
  return station ? { id, floor, at: [x, z], station } : { id, floor, at: [x, z] }
}
function hall(id: string, from: string, to: string): Corridor {
  return { id, from, to, kind: 'hall' }
}

/**
 * Nodos y tramos comunes a una planta: anillo de pasillos, pasos de servicio
 * y acceso al ascensor. `stationHall` es el punto del pasillo norte frente a la
 * estación de la planta, que divide el pasillo norte en dos tramos.
 */
function ring(floor: string, stationHall: { id: string; x: number }) {
  const p = (name: string) => `${name}-${floor}`
  const nodes: Waypoint[] = [
    node(p('nw'), floor, WEST_LINK, NORTH_HALL),
    node(stationHall.id, floor, stationHall.x, NORTH_HALL),
    node(p('ne'), floor, EAST_LINK, NORTH_HALL),
    node(p('sw'), floor, WEST_LINK, SOUTH_HALL),
    node(p('lift-hall'), floor, LIFT_X, SOUTH_HALL),
    node(p('se'), floor, EAST_LINK, SOUTH_HALL),
    node(p('lift'), floor, LIFT_X, LIFT_STOP),
  ]
  const edges: Corridor[] = [
    hall(p('west-link'), p('nw'), p('sw')),
    hall(p('east-link'), p('ne'), p('se')),
    hall(p('south-west'), p('sw'), p('lift-hall')),
    hall(p('south-east'), p('lift-hall'), p('se')),
    hall(p('lift-door'), p('lift-hall'), p('lift')),
  ]
  return { nodes, edges }
}

/* ---------- Planta baja: Farmacia y Urgencias ---------- */
const pb = ring('pb', { id: 'pharmacy-hall', x: -13.5 })
pb.nodes.push(
  node('pharmacy', 'pb', -13.5, -0.4, 'pharmacy'),
  node('main-hall-mid', 'pb', LIFT_X, NORTH_HALL),
  node('emergency-hall', 'pb', 16.5, NORTH_HALL),
  node('emergency', 'pb', 16.5, -6.1, 'emergency'),
)
pb.edges.push(
  hall('pharmacy-exit', 'pharmacy', 'pharmacy-hall'),
  hall('north-west-pb', 'nw-pb', 'pharmacy-hall'),
  // El pasillo principal se parte en dos tramos para que un bloqueo a mitad de
  // camino todavía deje un tramo por delante con desvío por el anillo sur.
  hall('main-hall-west', 'pharmacy-hall', 'main-hall-mid'),
  hall('main-hall-east', 'main-hall-mid', 'emergency-hall'),
  hall('north-east-pb', 'emergency-hall', 'ne-pb'),
  hall('emergency-entry', 'emergency-hall', 'emergency'),
)

/* ---------- Piso 1: Quirófanos y cuidados críticos ---------- */
const p1 = ring('p1', { id: 'surgery-hall', x: -16 })
p1.nodes.push(node('surgery', 'p1', -16, -6.1, 'surgery'))
p1.edges.push(
  hall('north-west-p1', 'nw-p1', 'surgery-hall'),
  hall('north-main-p1', 'surgery-hall', 'ne-p1'),
  hall('surgery-entry', 'surgery-hall', 'surgery'),
)

/* ---------- Piso 2: Internación ---------- */
const p2 = ring('p2', { id: 'inpatient-hall', x: -15 })
p2.nodes.push(node('inpatient', 'p2', -15, -6.1, 'inpatient'))
p2.edges.push(
  hall('north-west-p2', 'nw-p2', 'inpatient-hall'),
  hall('north-main-p2', 'inpatient-hall', 'ne-p2'),
  hall('inpatient-entry', 'inpatient-hall', 'inpatient'),
)

const hospital: HospitalMap = {
  label: 'Mapa recreado para la simulación',
  floors: [
    { id: 'pb', label: 'Planta baja', level: 0, size: FLOOR_SIZE },
    { id: 'p1', label: 'Piso 1', level: 1, size: FLOOR_SIZE },
    { id: 'p2', label: 'Piso 2', level: 2, size: FLOOR_SIZE },
  ],
  rooms: [
    // Planta baja · emergencias, farmacia y admisión
    room('lab', 'Laboratorio', 'pb', 'north', -22, -13),
    room('imaging', 'Imagenología', 'pb', 'north', -13, -5),
    room('observation', 'Observación', 'pb', 'north', -5, 3),
    room('triage', 'Triaje', 'pb', 'north', 3, 11),
    room('urg', 'Urgencias', 'pb', 'north', 11, 22, 'emergency'),
    room('farm', 'Farmacia Central', 'pb', 'middle-north', -19, -8, 'pharmacy'),
    room('supply', 'Suministros', 'pb', 'middle-south', -8, -1),
    room('lift-room-pb', 'Ascensor', 'pb', 'middle-south', -1, 3, 'lift'),
    room('admission', 'Admisión', 'pb', 'middle-south', 3, 11),
    room('affiliation', 'Afiliación', 'pb', 'middle-south', 11, 19),
    room('records', 'Archivo clínico', 'pb', 'south', -22, -13),
    room('outpatient', 'Consulta externa', 'pb', 'south', -13, -3),
    room('vaccines', 'Vacunas', 'pb', 'south', -3, 5),
    room('social', 'Trabajo social', 'pb', 'south', 5, 13),
    room('cafeteria', 'Cafetería', 'pb', 'south', 13, 22),

    // Piso 1 · quirófanos y cuidados críticos
    room('surg', 'Quirófanos', 'p1', 'north', -22, -10, 'surgery'),
    room('recovery', 'Recuperación', 'p1', 'north', -10, -1),
    room('sterile', 'Esterilización', 'p1', 'north', -1, 7),
    room('icu', 'Terapia intensiva', 'p1', 'north', 7, 15),
    room('neonatal', 'Neonatología', 'p1', 'north', 15, 22),
    room('scrub', 'Prelavado', 'p1', 'middle-north', -19, -8),
    room('lockers', 'Vestuarios', 'p1', 'middle-south', -8, -1),
    room('lift-room-p1', 'Ascensor', 'p1', 'middle-south', -1, 3, 'lift'),
    room('nursing-p1', 'Enfermería', 'p1', 'middle-south', 3, 11),
    room('clinical-store', 'Depósito clínico', 'p1', 'middle-south', 11, 19),
    room('intermediate', 'Terapia intermedia', 'p1', 'south', -22, -11),
    room('family', 'Espera familiares', 'p1', 'south', -11, -2),
    room('delivery', 'Sala de partos', 'p1', 'south', -2, 8),
    room('dialysis', 'Hemodiálisis', 'p1', 'south', 8, 22),

    // Piso 2 · internación
    room('patients', 'Internación', 'p2', 'north', -22, -8, 'inpatient'),
    room('rooms-201', 'Hab. 201–204', 'p2', 'north', -8, 4),
    room('rooms-205', 'Hab. 205–208', 'p2', 'north', 4, 14),
    room('isolation', 'Aislamiento', 'p2', 'north', 14, 22),
    room('doctors', 'Sala de médicos', 'p2', 'middle-north', -19, -8),
    room('nursing-p2', 'Enfermería', 'p2', 'middle-south', -8, -1),
    room('lift-room-p2', 'Ascensor', 'p2', 'middle-south', -1, 3, 'lift'),
    room('linen', 'Ropería', 'p2', 'middle-south', 3, 11),
    room('utility', 'Utilería', 'p2', 'middle-south', 11, 19),
    room('rooms-209', 'Hab. 209–212', 'p2', 'south', -22, -10),
    room('rooms-213', 'Hab. 213–216', 'p2', 'south', -10, 2),
    room('pediatrics', 'Pediatría', 'p2', 'south', 2, 12),
    room('lactation', 'Lactario', 'p2', 'south', 12, 22),
  ],
  nodes: [...pb.nodes, ...p1.nodes, ...p2.nodes],
  edges: [
    ...pb.edges, ...p1.edges, ...p2.edges,
    { id: 'lift-pb-p1', from: 'lift-pb', to: 'lift-p1', kind: 'lift' },
    { id: 'lift-p1-p2', from: 'lift-p1', to: 'lift-p2', kind: 'lift' },
  ],
}

export default hospital

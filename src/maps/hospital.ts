import type { Corridor, HospitalMap, Room, RoomKind, Station, Waypoint } from './contract'

/*
 * Mapa recreado de TAJIX para la simulación de MediBot CPS.
 * Edificio ilustrativo de cinco plantas inspirado en un hospital de la seguridad
 * social de Santa Cruz. No es una réplica de ningún plano autorizado.
 *
 * Coordenadas en metros, origen al centro de cada planta; X hacia el este, Z hacia el sur.
 * Las cinco plantas comparten la misma retícula:
 *   z -13 … -5    franja norte de salas (puerta al sur)
 *   z  -5 … -1.5  pasillo norte (eje z = -3.2)
 *   z -1.5 … 3.5  franja central con el ascensor (x -1 … 3)
 *   z 3.5 … 7     pasillo sur (eje z = 5.2)
 *   z   7 … 13    franja sur de salas (puerta al norte)
 * Los pasos de servicio en x = ±20.5 unen ambos pasillos y cierran un anillo,
 * así que cada estación tiene dos recorridos posibles desde el ascensor.
 *
 *   Planta baja  Farmacia Central (pharmacy) y Urgencias (emergency)
 *   Piso 1       Diagnóstico (diagnostics) y consulta externa
 *   Piso 2       Quirófanos (surgery)
 *   Piso 3       Cuidados intensivos (care)
 *   Piso 4       Internación (inpatient)
 */

const FLOOR_SIZE = [46, 28] as const
const NORTH_HALL = -3.2
const SOUTH_HALL = 5.2
const WEST_LINK = -20.5
const EAST_LINK = 20.5
const LIFT_X = 1
const LIFT_STOP = 2.4
/** Profundidad del nodo de estación dentro de su sala, medida desde la puerta. */
const STATION_Z = -6.1

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
/** Ascensor, en la misma posición en todas las plantas. */
function lift(floor: string): Room {
  return room(`lift-room-${floor}`, 'Ascensor', floor, 'middle-south', -1, 3, 'lift')
}

/**
 * Nodos y tramos comunes a una planta: anillo de pasillos, pasos de servicio
 * y acceso al ascensor. `stationHall` es el punto del pasillo norte frente a
 * la estación principal de la planta.
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

/** Planta superior con una estación en la franja norte, frente al pasillo norte. */
function upperFloor(floor: string, station: Station, x: number) {
  const plan = ring(floor, { id: `${station}-hall`, x })
  plan.nodes.push(node(station, floor, x, STATION_Z, station))
  plan.edges.push(
    hall(`north-west-${floor}`, `nw-${floor}`, `${station}-hall`),
    hall(`north-main-${floor}`, `${station}-hall`, `ne-${floor}`),
    hall(`${station}-entry`, `${station}-hall`, station),
  )
  return plan
}

/* ---------- Planta baja: Farmacia y Urgencias ---------- */
const pb = ring('pb', { id: 'pharmacy-hall', x: -13.5 })
pb.nodes.push(
  node('pharmacy', 'pb', -13.5, -0.4, 'pharmacy'),
  node('main-hall-mid', 'pb', LIFT_X, NORTH_HALL),
  node('emergency-hall', 'pb', 16.5, NORTH_HALL),
  node('emergency', 'pb', 16.5, STATION_Z, 'emergency'),
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

/* ---------- Plantas superiores ---------- */
const p1 = upperFloor('p1', 'diagnostics', -15)
const p2 = upperFloor('p2', 'surgery', -16)
const p3 = upperFloor('p3', 'care', -15)
const p4 = upperFloor('p4', 'inpatient', -15)

const levels = ['pb', 'p1', 'p2', 'p3', 'p4'] as const
const plans = [pb, p1, p2, p3, p4]

const hospital: HospitalMap = {
  label: 'Mapa recreado para la simulación',
  floors: levels.map((id, level) => ({ id, label: level === 0 ? 'Planta baja' : `Piso ${level}`, level, size: FLOOR_SIZE })),
  rooms: [
    // Planta baja · emergencias, farmacia y admisión
    room('lab-pb', 'Laboratorio', 'pb', 'north', -22, -13),
    room('imaging-pb', 'Rayos X', 'pb', 'north', -13, -5),
    room('observation', 'Observación', 'pb', 'north', -5, 3),
    room('triage', 'Triaje', 'pb', 'north', 3, 11),
    room('urg', 'Urgencias', 'pb', 'north', 11, 22, 'emergency'),
    room('farm', 'Farmacia Central', 'pb', 'middle-north', -19, -8, 'pharmacy'),
    room('supply', 'Suministros', 'pb', 'middle-south', -8, -1),
    lift('pb'),
    room('admission', 'Admisión', 'pb', 'middle-south', 3, 11),
    room('affiliation', 'Afiliación', 'pb', 'middle-south', 11, 19),
    room('records', 'Archivo clínico', 'pb', 'south', -22, -13),
    room('information', 'Informaciones', 'pb', 'south', -13, -3),
    room('vaccines', 'Vacunas', 'pb', 'south', -3, 5),
    room('social', 'Trabajo social', 'pb', 'south', 5, 13),
    room('cafeteria', 'Cafetería', 'pb', 'south', 13, 22),

    // Piso 1 · diagnóstico y consulta externa
    room('diag', 'Diagnóstico', 'p1', 'north', -22, -8, 'diagnostics'),
    room('tomography', 'Tomografía', 'p1', 'north', -8, 0),
    room('ultrasound', 'Ecografía', 'p1', 'north', 0, 8),
    room('endoscopy', 'Endoscopía', 'p1', 'north', 8, 15),
    room('blood-bank', 'Banco de sangre', 'p1', 'north', 15, 22),
    room('sampling', 'Toma de muestras', 'p1', 'middle-north', -19, -8),
    room('waiting-p1', 'Sala de espera', 'p1', 'middle-south', -8, -1),
    lift('p1'),
    room('nursing-p1', 'Enfermería', 'p1', 'middle-south', 3, 11),
    room('reports', 'Informes', 'p1', 'middle-south', 11, 19),
    room('offices-1', 'Consultorios 1–4', 'p1', 'south', -22, -11),
    room('offices-5', 'Consultorios 5–8', 'p1', 'south', -11, 0),
    room('dental', 'Odontología', 'p1', 'south', 0, 10),
    room('physio', 'Fisioterapia', 'p1', 'south', 10, 22),

    // Piso 2 · quirófanos
    room('surg', 'Quirófanos', 'p2', 'north', -22, -10, 'surgery'),
    room('recovery', 'Recuperación', 'p2', 'north', -10, -1),
    room('sterile', 'Esterilización', 'p2', 'north', -1, 7),
    room('delivery', 'Sala de partos', 'p2', 'north', 7, 15),
    room('anesthesia', 'Anestesia', 'p2', 'north', 15, 22),
    room('scrub', 'Prelavado', 'p2', 'middle-north', -19, -8),
    room('lockers', 'Vestuarios', 'p2', 'middle-south', -8, -1),
    lift('p2'),
    room('nursing-p2', 'Enfermería', 'p2', 'middle-south', 3, 11),
    room('surgical-store', 'Depósito quirúrgico', 'p2', 'middle-south', 11, 19),
    room('pre-op', 'Preoperatorio', 'p2', 'south', -22, -11),
    room('family-p2', 'Espera familiares', 'p2', 'south', -11, -2),
    room('day-surgery', 'Cirugía ambulatoria', 'p2', 'south', -2, 8),
    room('endoscopy-or', 'Sala de procedimientos', 'p2', 'south', 8, 22),

    // Piso 3 · cuidados intensivos
    room('icu', 'Cuidados intensivos', 'p3', 'north', -22, -8, 'care'),
    room('intermediate', 'Terapia intermedia', 'p3', 'north', -8, 4),
    room('neonatal', 'Neonatología', 'p3', 'north', 4, 14),
    room('isolation-p3', 'Aislamiento', 'p3', 'north', 14, 22),
    room('doctors-p3', 'Sala de médicos', 'p3', 'middle-north', -19, -8),
    room('nursing-p3', 'Enfermería', 'p3', 'middle-south', -8, -1),
    lift('p3'),
    room('clinical-store', 'Depósito clínico', 'p3', 'middle-south', 3, 11),
    room('utility-p3', 'Utilería', 'p3', 'middle-south', 11, 19),
    room('dialysis', 'Hemodiálisis', 'p3', 'south', -22, -10),
    room('family-p3', 'Espera familiares', 'p3', 'south', -10, 2),
    room('rehab', 'Rehabilitación', 'p3', 'south', 2, 12),
    room('lockers-p3', 'Vestuarios', 'p3', 'south', 12, 22),

    // Piso 4 · internación
    room('patients', 'Internación', 'p4', 'north', -22, -8, 'inpatient'),
    room('rooms-401', 'Hab. 401–404', 'p4', 'north', -8, 4),
    room('rooms-405', 'Hab. 405–408', 'p4', 'north', 4, 14),
    room('isolation-p4', 'Aislamiento', 'p4', 'north', 14, 22),
    room('doctors-p4', 'Sala de médicos', 'p4', 'middle-north', -19, -8),
    room('nursing-p4', 'Enfermería', 'p4', 'middle-south', -8, -1),
    lift('p4'),
    room('linen', 'Ropería', 'p4', 'middle-south', 3, 11),
    room('utility-p4', 'Utilería', 'p4', 'middle-south', 11, 19),
    room('rooms-409', 'Hab. 409–412', 'p4', 'south', -22, -10),
    room('rooms-413', 'Hab. 413–416', 'p4', 'south', -10, 2),
    room('pediatrics', 'Pediatría', 'p4', 'south', 2, 12),
    room('lactation', 'Lactario', 'p4', 'south', 12, 22),
  ],
  nodes: plans.flatMap((plan) => plan.nodes),
  edges: [
    ...plans.flatMap((plan) => plan.edges),
    // El ascensor une solo niveles contiguos.
    ...levels.slice(1).map((floor, i): Corridor => ({
      id: `lift-${levels[i]}-${floor}`, from: `lift-${levels[i]}`, to: `lift-${floor}`, kind: 'lift',
    })),
  ],
}

export default hospital

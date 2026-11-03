import type { HospitalMap, Room, RoomKind, Station } from './contract'

function room(id: string, label: string, floor: string, x: number, z: number, w: number, kind: RoomKind = 'support'): Room {
  return { id, label, floor, kind, center: [x, z], size: [w, 5.8], door: z < 0 ? 'south' : 'north' }
}
function node(id: string, floor: string, x: number, z: number, station?: Station) {
  return { id, floor, at: [x, z] as const, station }
}
const hospital: HospitalMap = {
  label: 'Mapa recreado para la simulación',
  floors: [
    { id: 'pb', label: 'Planta baja', level: 0, size: [34, 23] },
    { id: 'p1', label: 'Piso 1', level: 1, size: [34, 23] },
  ],
  rooms: [
    room('farm','Farmacia Central','pb',-12.4,-7.3,7.2,'pharmacy'),
    room('supply','Suministros','pb',-4,-7.3,8.4),
    room('triage','Triaje','pb',4.1,-7.3,7.4),
    room('urg','Urgencias','pb',12.1,-7.3,7.7,'emergency'),
    room('adm','Admisión','pb',-11.8,7.2,8.4),
    room('lab','Laboratorio','pb',-2.7,7.2,8.4),
    room('obs','Observación','pb',6.5,7.2,8.5),
    room('lift0','Ascensor','pb',13,7.2,4.1,'lift'),
    room('surg','Quirófanos','p1',-10.8,-7.3,10.4,'surgery'),
    room('recovery','Recuperación','p1',0,-7.3,10.4),
    room('nursing','Enfermería','p1',10.8,-7.3,10.4),
    room('patients','Internación','p1',-8,7.2,15.5,'inpatient'),
    room('support','Apoyo clínico','p1',5.5,7.2,11),
    room('lift1','Ascensor','p1',13,7.2,4.1,'lift'),
  ],
  nodes: [
    node('pharmacy','pb',-12.4,-5.5,'pharmacy'), node('west','pb',-12.4,-2),
    node('east','pb',12.1,-2), node('emergency','pb',12.1,-5.5,'emergency'),
    node('south-west','pb',-12.4,2.5), node('south-east','pb',12.1,2.5),
    node('lift-entry-0','pb',13,2.5), node('lift-0','pb',13,6.6), node('lift-1','p1',13,6.6),
    node('lift-entry-1','p1',13,2.5), node('upper-east','p1',13,-2),
    node('upper-west','p1',-10.8,-2), node('surgery','p1',-10.8,-5.5,'surgery'),
    node('upper-south','p1',-8,2.5), node('inpatient','p1',-8,5.6,'inpatient'),
  ],
  edges: ([
    ['pharmacy-exit','pharmacy','west'], ['main-hall','west','east'],
    ['emergency-entry','east','emergency'], ['west-turn','west','south-west'],
    ['south-hall','south-west','south-east'], ['east-turn','south-east','east'],
    ['lift-approach','south-east','lift-entry-0'], ['lift-entry-pb','lift-entry-0','lift-0'],
    ['lift-transfer','lift-0','lift-1','lift'], ['lift-exit-p1','lift-1','lift-entry-1'],
    ['surgery-approach','lift-entry-1','upper-east'], ['upper-main','upper-east','upper-west'],
    ['surgery-entry','upper-west','surgery'], ['upper-south-hall','lift-entry-1','upper-south'],
    ['inpatient-entry','upper-south','inpatient'],
  ] as const).map(([id,from,to,kind]) => ({ id, from, to, kind: kind ?? 'hall' })),
}
export default hospital

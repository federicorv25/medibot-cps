export type Point = readonly [x: number, z: number]
export type Station = 'pharmacy' | 'emergency' | 'surgery' | 'inpatient'
export type RoomKind = Station | 'support' | 'lift'
export interface Floor { id: string; label: string; level: number; size: Point }
export interface Room {
  id: string; label: string; floor: string; kind: RoomKind; center: Point; size: Point
  /** Lado de la abertura hacia el pasillo. Norte = -Z. */
  door: 'north' | 'south' | 'east' | 'west'
}
export interface Waypoint { id: string; floor: string; at: Point; station?: Station }
export interface Corridor { id: string; from: string; to: string; kind: 'hall' | 'lift' }
export interface HospitalMap {
  label: string
  floors: readonly Floor[]
  rooms: readonly Room[]
  nodes: readonly Waypoint[]
  /** Conexiones bidireccionales. Solo las de tipo lift pueden cambiar de planta. */
  edges: readonly Corridor[]
}

import * as T from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { Floor, HospitalMap } from '../maps/contract'

/*
 * Fachada exterior del edificio para la vista «Edificio».
 * Envuelve cada planta con antepecho, banda de ventanas, parteluces y pilares
 * de esquina; la azotea cierra el volumen. Se desvanece para ver el interior.
 * Es una piel ilustrativa generada a partir de las dimensiones del mapa.
 */

export type PanelKind = 'spandrel' | 'glass' | 'mullion' | 'corner' | 'plinth'
export interface Panel {
  kind: PanelKind
  /** Ancho (X), alto (Y) y fondo (Z) en metros. */
  size: readonly [number, number, number]
  /** Centro relativo a la base de la planta. */
  at: readonly [number, number, number]
}

/** Separación entre el borde de la planta y la piel exterior. */
export const FACADE_OFFSET = 0.6
const SPANDREL = 1.25
const MULLION_STEP = 3.6

/** Despiece de la piel de una planta. Puro: no depende de WebGL. */
export function facadePanels(floor: Floor, height: number, ground = false): Panel[] {
  const [w, d] = floor.size
  const hx = w / 2 + FACADE_OFFSET, hz = d / 2 + FACADE_OFFSET
  const glass = height - SPANDREL - 0.12
  const panels: Panel[] = []
  const sides = [
    { along: 'x', length: 2 * hx, x: 0, z: -hz },
    { along: 'x', length: 2 * hx, x: 0, z: hz },
    { along: 'z', length: 2 * hz, x: -hx, z: 0 },
    { along: 'z', length: 2 * hz, x: hx, z: 0 },
  ] as const
  for (const side of sides) {
    const x = side.along === 'x'
    const span = (len: number, thick: number) => (x ? [len, 0, thick] : [thick, 0, len]) as [number, number, number]
    const sized = (len: number, h: number, thick: number) => { const s = span(len, thick); s[1] = h; return s }
    panels.push({ kind: 'spandrel', size: sized(side.length, SPANDREL, 0.34), at: [side.x, SPANDREL / 2, side.z] })
    panels.push({ kind: 'glass', size: sized(side.length - 0.2, glass, 0.12), at: [side.x, SPANDREL + glass / 2, side.z] })
    const count = Math.max(1, Math.round(side.length / MULLION_STEP))
    for (let i = 0; i <= count; i++) {
      const offset = -side.length / 2 + i * side.length / count
      panels.push({ kind: 'mullion', size: sized(0.3, glass + 0.12, 0.42),
        at: [x ? side.x + offset : side.x, SPANDREL + (glass + 0.12) / 2, x ? side.z : side.z + offset] })
    }
    if (ground) panels.push({ kind: 'plinth', size: sized(side.length + 0.2, 0.5, 0.48), at: [side.x, 0.25, side.z] })
  }
  for (const [cx, cz] of [[-hx, -hz], [hx, -hz], [-hx, hz], [hx, hz]]) {
    panels.push({ kind: 'corner', size: [0.9, height, 0.9], at: [cx, height / 2, cz] })
  }
  return panels
}

function material(color: number, extra: T.MeshStandardMaterialParameters = {}) {
  const m = new T.MeshStandardMaterial({ color, roughness: 0.7, transparent: true, ...extra })
  m.userData.opacity = m.opacity
  return m
}
function geometry(w: number, h: number, d: number, x: number, y: number, z: number) {
  const g = new T.BoxGeometry(w, h, d)
  g.translate(x, y, z)
  return g
}
function mesh(parts: T.BufferGeometry[], m: T.Material) {
  const merged = new T.Mesh(mergeGeometries(parts), m)
  for (const part of parts) part.dispose()
  return merged
}

export function buildFacade(map: HospitalMap, floorHeight: number) {
  const mats = {
    spandrel: material(0xc9d8d3), glass: material(0x2f5d6b, { roughness: 0.18, metalness: 0.35, opacity: 0.9 }),
    mullion: material(0x9fb6b0, { roughness: 0.5 }), corner: material(0xe7efec), plinth: material(0x12a487, { roughness: 0.5 }),
    roof: material(0xb9c9c4), canopy: material(0xf3f7f6), emergency: material(0xc86a5b, { roughness: 0.5 }),
  }
  const materials = Object.values(mats)
  const group = new T.Group()
  const floors = [...map.floors].sort((a, b) => a.level - b.level)
  const lowest = floors[0], highest = floors[floors.length - 1]
  const layers = floors.map((floor) => {
    const layer = new T.Group()
    const byKind = new Map<PanelKind, T.BufferGeometry[]>()
    for (const p of facadePanels(floor, floorHeight, floor === lowest)) {
      if (!byKind.has(p.kind)) byKind.set(p.kind, [])
      byKind.get(p.kind)!.push(geometry(...p.size, ...p.at))
    }
    for (const [kind, parts] of byKind) {
      const m = mesh(parts, mats[kind])
      m.renderOrder = kind === 'glass' ? 2 : 1
      layer.add(m)
    }
    group.add(layer)
    return { layer, level: floor.level }
  })

  // Accesos en planta baja: principal al sur y de ambulancias frente a Urgencias.
  const [w, d] = lowest.size
  const entry = new T.Group()
  const hz = d / 2 + FACADE_OFFSET
  entry.add(new T.Mesh(new T.BoxGeometry(12, 0.4, 4.4), mats.canopy).translateX(0).translateY(3.4).translateZ(hz + 2.2))
  for (const dx of [-5.4, 5.4]) entry.add(new T.Mesh(new T.BoxGeometry(0.32, 3.2, 0.32), mats.mullion).translateX(dx).translateY(1.6).translateZ(hz + 4.1))
  const urgencias = map.rooms.find((room) => room.kind === 'emergency' && room.floor === lowest.id)
  if (urgencias) {
    const side = urgencias.center[1] < 0 ? -1 : 1
    entry.add(new T.Mesh(new T.BoxGeometry(9, 0.4, 4), mats.emergency)
      .translateX(urgencias.center[0]).translateY(3.4).translateZ(side * (hz + 2)))
  }
  group.add(entry)

  // Azotea con pretil, salas de máquinas y rótulo.
  const roof = new T.Group()
  const rx = w / 2 + FACADE_OFFSET + 0.4, rz = hz + 0.4
  roof.add(new T.Mesh(new T.BoxGeometry(2 * rx, 0.5, 2 * rz), mats.roof).translateY(0.25))
  for (const [sw, sd, x, z] of [[2 * rx, 0.4, 0, -rz], [2 * rx, 0.4, 0, rz], [0.4, 2 * rz, -rx, 0], [0.4, 2 * rz, rx, 0]]) {
    roof.add(new T.Mesh(new T.BoxGeometry(sw, 1, sd), mats.corner).translateX(x).translateY(1).translateZ(z))
  }
  roof.add(new T.Mesh(new T.BoxGeometry(9, 2.4, 6), mats.spandrel).translateX(-w * 0.18).translateY(1.7))
  roof.add(new T.Mesh(new T.BoxGeometry(5, 1.6, 4), mats.spandrel).translateX(w * 0.22).translateY(1.3).translateZ(-2))
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas')
    canvas.width = 1024; canvas.height = 160
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#12a487'; ctx.font = '700 112px system-ui'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('HOSPITAL', 512, 86)
      const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace
      const sign = new T.MeshBasicMaterial({ map: texture, transparent: true, side: T.DoubleSide })
      sign.userData.opacity = 1; materials.push(sign as unknown as T.MeshStandardMaterial)
      roof.add(new T.Mesh(new T.PlaneGeometry(16, 2.5), sign).translateY(3.3).translateZ(rz + 0.05))
    }
  }
  group.add(roof)

  let shown = -1
  /** Coloca la piel según la separación de plantas y la desvanece (0 = oculta, 1 = visible). */
  const layout = (separation: number, opacity: number) => {
    group.visible = opacity > 0.01
    if (!group.visible) return
    for (const { layer, level } of layers) layer.position.y = level * floorHeight * separation
    // La azotea se apoya sobre la última planta; la piel solo cierra el volumen si las plantas están juntas.
    roof.position.y = highest.level * floorHeight * separation + floorHeight
    if (opacity !== shown) {
      shown = opacity
      for (const m of materials) {
        m.opacity = (m.userData.opacity as number) * opacity
        m.depthWrite = opacity > 0.98
      }
    }
  }
  return { group, layout }
}

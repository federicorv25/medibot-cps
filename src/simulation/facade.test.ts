import { describe, expect, it } from 'vitest'
import hospital from '../maps/hospital'
import { buildFacade, FACADE_OFFSET, facadePanels } from './facade'
import { FLOOR_HEIGHT } from './model'

const floor = hospital.floors[0]
const [w, d] = floor.size

describe('fachada del edificio', () => {
  it('envuelve la planta por fuera, sin invadir el interior', () => {
    for (const panel of facadePanels(floor, FLOOR_HEIGHT, true)) {
      const [sx, sy, sz] = panel.size, [x, y, z] = panel.at
      const outsideX = Math.abs(x) - sx / 2 >= w / 2
      const outsideZ = Math.abs(z) - sz / 2 >= d / 2
      expect(outsideX || outsideZ, panel.kind).toBe(true)
      expect(y - sy / 2).toBeGreaterThanOrEqual(-1e-9)
      expect(y + sy / 2).toBeLessThanOrEqual(FLOOR_HEIGHT + 1e-9)
    }
  })

  it('cubre los cuatro lados con antepecho, vidrio y parteluces a menos de 4 m', () => {
    const panels = facadePanels(floor, FLOOR_HEIGHT)
    const perimeter = 2 * (w + d + 4 * FACADE_OFFSET)
    const spandrel = panels.filter((p) => p.kind === 'spandrel')
    expect(spandrel).toHaveLength(4)
    expect(spandrel.reduce((sum, p) => sum + Math.max(p.size[0], p.size[2]), 0)).toBeCloseTo(perimeter)
    expect(panels.filter((p) => p.kind === 'glass')).toHaveLength(4)
    expect(panels.filter((p) => p.kind === 'corner')).toHaveLength(4)
    const mullions = panels.filter((p) => p.kind === 'mullion').length
    expect(perimeter / (mullions - 4)).toBeLessThan(4)
  })

  it('solo pone zócalo en la planta baja', () => {
    expect(facadePanels(floor, FLOOR_HEIGHT, true).some((p) => p.kind === 'plinth')).toBe(true)
    expect(facadePanels(hospital.floors[1], FLOOR_HEIGHT).some((p) => p.kind === 'plinth')).toBe(false)
  })

  it('arma una capa por planta, cierra con la azotea y se desvanece', () => {
    const shell = buildFacade(hospital, FLOOR_HEIGHT)
    shell.layout(1, 1)
    expect(shell.group.visible).toBe(true)
    const layers = shell.group.children.slice(0, hospital.floors.length)
    expect(layers.map((layer) => layer.position.y)).toEqual(hospital.floors.map((f) => f.level * FLOOR_HEIGHT))
    const roof = shell.group.children.at(-1)!
    expect(roof.position.y).toBeCloseTo((hospital.floors.length - 1) * FLOOR_HEIGHT + FLOOR_HEIGHT)
    shell.layout(1.95, 0)
    expect(shell.group.visible).toBe(false)
  })
})

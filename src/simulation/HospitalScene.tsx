import { useEffect, useRef, useState } from 'react'
import * as T from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { HospitalMap, Room, RoomKind } from '../maps/contract'
import { FLOOR_HEIGHT, pose, type Mission, type Network } from './model'

export type CameraView = 'orbit' | 'top' | 'follow'
const palette: Record<RoomKind, [number, number]> = {
  pharmacy: [0x83cab1, 0x24785f], emergency: [0xf4bcb1, 0xc86a5b],
  surgery: [0xa5b9e2, 0x637bb0], inpatient: [0xa7cdde, 0x5287a4],
  support: [0xd0ded9, 0x708e85], lift: [0xc4c4da, 0x7b789e],
}
function mat(color: number) { return new T.MeshStandardMaterial({ color, roughness: 0.8 }) }
function box(parent: T.Object3D, width: number, height: number, depth: number, x: number, y: number, z: number, material: T.Material) {
  const mesh = new T.Mesh(new T.BoxGeometry(width, height, depth), material)
  mesh.position.set(x, y, z)
  parent.add(mesh)
  return mesh
}
function label(text: string, accent: number) {
  const canvas = document.createElement('canvas')
  canvas.width = 512; canvas.height = 104
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#f8fcfa'
  ctx.beginPath(); ctx.roundRect(5, 5, 502, 94, 20); ctx.fill()
  ctx.strokeStyle = '#cbddd6'; ctx.lineWidth = 4; ctx.stroke()
  ctx.fillStyle = '#' + accent.toString(16).padStart(6, '0')
  ctx.beginPath(); ctx.roundRect(25, 38, 25, 25, 7); ctx.fill()
  ctx.fillStyle = '#203d35'; ctx.font = 'bold 35px system-ui'
  ctx.textBaseline = 'middle'; ctx.fillText(text, 65, 53, 420)
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace
  const sprite = new T.Sprite(new T.SpriteMaterial({ map: texture, depthTest: false, transparent: true }))
  sprite.scale.set(5.7, 1.16, 1); sprite.renderOrder = 6
  return sprite
}
function renderRoom(parent: T.Group, room: Room) {
  const [x, z] = room.center, [w, d] = room.size
  const [fill, accent] = palette[room.kind]
  const floor = mat(fill), wall = mat(0xe9f0eb), border = mat(accent)
  const furniture = mat(0xeaf4ef), steel = mat(0x87a59e)
  const block = new T.Group()
  block.position.set(x, 0, z); parent.add(block)
  box(block, w, .13, d, 0, .04, 0, floor)
  for (const side of ['north', 'south', 'west', 'east'] as const) {
    const horizontal = side === 'north' || side === 'south'
    const length = horizontal ? w : d
    const fixed = (side === 'north' || side === 'west' ? -1 : 1) * (horizontal ? d : w) / 2
    const opening = side === room.door ? Math.min(2.25, length / 2) : 0
    const segment = (size: number, shift: number) => {
      box(block, horizontal ? size : .15, .96, horizontal ? .15 : size,
        horizontal ? shift : fixed, .54, horizontal ? fixed : shift, wall)
      box(block, horizontal ? size : .21, .09, horizontal ? .21 : size,
        horizontal ? shift : fixed, 1.06, horizontal ? fixed : shift, border)
    }
    if (opening) {
      const sideLength = (length - opening) / 2
      segment(sideLength, -(opening + sideLength) / 2)
      segment(sideLength, (opening + sideLength) / 2)
      box(block, horizontal ? opening : .5, .055, horizontal ? .5 : opening,
        horizontal ? 0 : fixed, .126, horizontal ? fixed : 0, border)
    } else segment(length, 0)
  }
  if (room.kind !== 'lift') {
    const back = room.door === 'north' ? d * .28 : -d * .28
    for (const offset of [-1, 1]) {
      const fx = w * .28 * offset
      if (['inpatient', 'emergency', 'surgery'].includes(room.kind)) {
        box(block, 1.2, .35, 1.55, fx, .32, back, steel)
        box(block, 1.24, .24, 1.52, fx, .59, back, furniture)
        box(block, .85, .16, .45, fx, .76, back + .38, floor)
      } else {
        box(block, Math.min(2.25,w/3), .75, .85, fx, .48, back, furniture)
        box(block, .52, .3, .46, fx + .17, 1.0, back, border)
      }
    }
  } else {
    box(block, w * .73, .14, d * .72, 0, .21, 0, border)
  }
  const tag = label(room.label, accent)
  tag.position.set(0, 1.72, room.door === 'north' ? .75 : -.55); block.add(tag)
}
function buildFloor(model: HospitalMap, id: string) {
  const floor = model.floors.find((entry) => entry.id === id)!
  const group = new T.Group()
  group.position.y = floor.level * FLOOR_HEIGHT
  const [w,d] = floor.size
  box(group, w + .7, .58, d + .7, 0, -.37, 0, mat(0x5f8478))
  box(group, w, .14, d, 0, -.06, 0, mat(0xf1f6f1))
  const grid = new T.GridHelper(Math.max(w,d), Math.round(Math.max(w,d)), 0xbacdc3, 0xbacdc3)
  grid.scale.set(w/Math.max(w,d), 1, d/Math.max(w,d))
  grid.material.transparent = true; grid.material.opacity = .37
  grid.position.y = .025; group.add(grid)
  for (const room of model.rooms) if (room.floor === id) renderRoom(group, room)
  return group
}
function buildRobot() {
  const r = new T.Group()
  const black = mat(0x202a2a), yellow = mat(0xf2b946), pale = mat(0xffdb7b), steel = mat(0x72827e)
  const glass = new T.MeshStandardMaterial({ color: 0x163b36, emissive: 0x10463a, emissiveIntensity: .5 })
  const light = new T.MeshStandardMaterial({ color: 0x64f1bd, emissive: 0x39e4a7, emissiveIntensity: .8 })
  for (const x of [-.65, .65]) {
    box(r, .29, .41, 1.44, x, .26, 0, black)
    for (const z of [-.47, 0, .47]) {
      const wheel = new T.Mesh(new T.CylinderGeometry(.13, .13, .025, 14), steel)
      wheel.rotation.z = Math.PI/2; wheel.position.set(x + Math.sign(x)*.15,.27,z); r.add(wheel)
    }
  }
  box(r, 1.18, .7, 1.17, 0, .64, 0, yellow)
  box(r, 1.14, .13, 1.13, 0, 1.055, 0, pale)
  box(r, .65, .41, .06, 0, .64, .589, black)
  const door = new T.Group()
  door.position.set(0, .83, .627); r.add(door)
  box(door, .62, .38, .055, 0, -.19, 0, glass)
  box(door, .26, .055, .025, 0, -.14, .041, light)
  box(r, .21, .29, .21, 0, 1.21, -.09, steel)
  box(r, .83, .32, .41, 0, 1.47, -.02, black)
  for (const x of [-.2,.2]) box(r, .19, .135, .05, x, 1.47, .21, light)
  const ring = new T.Mesh(new T.RingGeometry(.91, 1.01, 48),
    new T.MeshBasicMaterial({ color: 0x188a68, transparent: true, opacity: .74, side: T.DoubleSide }))
  ring.rotation.x = -Math.PI/2; ring.position.y = .16; r.add(ring)
  return { group: r, door }
}
function dispose(group: T.Object3D) {
  const geometries = new Set<T.BufferGeometry>()
  const materials = new Set<T.Material>()
  group.traverse((object) => {
    const item = object as T.Mesh
    if (item.geometry) geometries.add(item.geometry)
    if (item.material) for (const m of Array.isArray(item.material) ? item.material : [item.material]) materials.add(m)
  })
  for (const g of geometries) g.dispose()
  for (const m of materials) {
    if (m instanceof T.SpriteMaterial) m.map?.dispose()
    m.dispose()
  }
}

interface Props { net: Network; mission: Mission; view: CameraView; shownFloor: string }
export default function HospitalScene(props: Props) {
  const host = useRef<HTMLDivElement>(null)
  const latest = useRef(props)
  const [failure, setFailure] = useState(false)
  const { net } = props
  useEffect(() => { latest.current = props }, [props])
  useEffect(() => {
    const root = host.current!
    let renderer: T.WebGLRenderer
    try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true }) }
    catch { const report = window.setTimeout(() => setFailure(true)); return () => window.clearTimeout(report) }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
    renderer.setClearColor(0x000000, 0)
    root.appendChild(renderer.domElement)
    const scene = new T.Scene()
    scene.add(new T.HemisphereLight(0xfafffb, 0x8aa39b, 2.5))
    const key = new T.DirectionalLight(0xffffff, 2.1)
    key.position.set(-14, 32, 16); scene.add(key)
    const fill = new T.DirectionalLight(0xc3e9e7, .75)
    fill.position.set(17, 12, -17); scene.add(fill)
    const camera = new T.OrthographicCamera(-24,24,16,-16,.1,240)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true; controls.enablePan = false; controls.minZoom = .7; controls.maxZoom = 2.8
    controls.maxPolarAngle = Math.PI * .49
    const groups = new Map(net.map.floors.map((floor) => [floor.id, buildFloor(net.map, floor.id)]))
    for (const group of groups.values()) scene.add(group)
    const { group: robot, door } = buildRobot(); scene.add(robot)
    const paths = new T.Group(); scene.add(paths)
    let frame = 0
    let viewKey = ''
    let activeRoute: Mission['route'] | undefined
    let activeBlocks: Mission['blocked'] | undefined
    let activeFloor = ''
    let frustumSpan = 45
    const measure = () => {
      const width = Math.max(root.clientWidth, 1), height = Math.max(root.clientHeight, 1)
      const aspect = width / height
      camera.left = -frustumSpan / 2 * Math.max(aspect, 1)
      camera.right = -camera.left; camera.top = frustumSpan / 2 * Math.max(1/aspect, 1)
      camera.bottom = -camera.top
      camera.updateProjectionMatrix()
      renderer.setSize(width,height,false)
    }
    const resize = new ResizeObserver(measure); resize.observe(root); measure()
    const animate = () => {
      const { mission, view, shownFloor } = latest.current
      const p = pose(net,mission)
      const floor = net.map.floors.find((entry) => entry.id === shownFloor) ?? net.map.floors[0]
      const elevation = floor.level * FLOOR_HEIGHT
      for (const [id,g] of groups) g.visible = id === floor.id
      robot.visible = net.nodes.get(mission.node)?.floor === floor.id || p.lift
      robot.position.set(...p.position)
      robot.rotation.y = p.heading
      door.rotation.x += ((mission.phase === 'unloading' ? -1.1 : 0) - door.rotation.x) * .15
      if (viewKey !== view + floor.id) {
        viewKey = view + floor.id
        const maxSize = Math.max(...floor.size)
        frustumSpan = view === 'follow' ? Math.max(maxSize * .56, 14) : maxSize * .89
        controls.target.set(0,elevation,0)
        if (view === 'top') camera.position.set(0,elevation + 55,.015)
        else camera.position.set(24,elevation + 31,28)
        camera.zoom = 1
        controls.enabled = view === 'orbit'
        camera.lookAt(controls.target); controls.update(); measure()
      }
      if (view === 'follow') {
        const [x,y,z] = p.position
        camera.position.lerp(new T.Vector3(x + 13,y + 18,z + 15),.07)
        controls.target.lerp(new T.Vector3(x,y,z),.09)
        camera.lookAt(controls.target)
      } else if (view === 'orbit') controls.update()
      if (activeRoute !== mission.route || activeBlocks !== mission.blocked || activeFloor !== floor.id) {
        activeRoute = mission.route; activeBlocks = mission.blocked; activeFloor = floor.id
        dispose(paths); paths.clear()
        const line = new T.MeshBasicMaterial({ color: 0x299c77 })
        const shownLegs = mission.route.filter((leg) => net.nodes.get(leg.from)?.floor === floor.id && leg.edge.kind === 'hall')
        if (!shownLegs.length) line.dispose()
        for (const leg of shownLegs) {
          const a = new T.Vector3(...net.at(leg.from)); a.y += .22
          const b = new T.Vector3(...net.at(leg.to)); b.y += .22
          paths.add(new T.Mesh(new T.TubeGeometry(new T.LineCurve3(a,b), 1, .09, 6, false),line))
        }
        for (const id of mission.blocked) {
          const edge = net.edges.get(id)
          if (!edge || net.nodes.get(edge.from)?.floor !== floor.id) continue
          const [x,y,z] = net.at(edge.from), [xx,,zz] = net.at(edge.to)
          const barrier = box(paths,2.0,.68,.37,(x+xx)/2,y+.46,(z+zz)/2,mat(0xe67f44))
          barrier.rotation.y = Math.atan2(xx-x,zz-z)
          box(barrier,.2,.73,.4,-.81,0,0,mat(0xf7d699))
          box(barrier,.2,.73,.4,.81,0,0,mat(0xf7d699))
        }
      }
      renderer.render(scene,camera)
      frame = requestAnimationFrame(animate)
    }
    animate()
    return () => {
      cancelAnimationFrame(frame); resize.disconnect(); controls.dispose()
      dispose(scene); renderer.dispose(); renderer.domElement.remove()
    }
  },[net])
  return <div className="scene-host" ref={host} role="img" aria-label="Mapa 3D del hospital con la posición y ruta del robot">
    {failure && <div className="scene-fallback">El visor necesita WebGL 2. El despacho y la bitácora siguen disponibles.</div>}
  </div>
}

# MediBot CPS · TAJIX

Prototipo **GovHealth** para la simulación, supervisión y despacho autónomo del transporte interno de medicamentos y muestras hospitalarias. El entorno recrea un hospital de cinco plantas inspirado en la distribución funcional de la **Caja Petrolera de Salud (CPS) de Santa Cruz, Bolivia**. Opera de forma local y utiliza datos simulados con propósitos de validación técnica.

---

## Inicio Rápido y Ejecución Local

Requiere **Node.js 24 o superior** (`node -v`).

```sh
# 1. Instalar dependencias exactas
npm ci

# 2. Ejecutar entorno de desarrollo local
npm run dev
```

Abre en tu navegador la URL indicada por Vite (por defecto: `http://localhost:5173`).

### Verificación de Calidad y Pruebas
```sh
npm run lint
npm test -- --passWithNoTests
npm run build
```

---

## Funcionalidades y Demostración

El visor interactivo 3D integra todas las capacidades de la logística interna intrahospitalaria:

* **Centro de control en Pantalla Completa:** Visor 3D con cámaras orbitales, vista en plano, seguimiento cenital y perspectiva del edificio completo de cinco plantas.
* **Operaciones de Entregar y Recoger:** Despacho de insumos de Farmacia a Urgencias/Internación, y recolección de muestras desde pisos superiores hacia Farmacia.
* **Etiqueta flotante en el robot:** Información visible en tiempo real sobre la carga a bordo, estado operativo y estación de destino.
* **Tránsito vertical por Ascensor:** Recorridos autónomos a través de la Planta Baja y los Pisos 1, 2, 3 y 4.
* **Detección de obstáculos y Desvío:** Capacidad de re-enrutamiento dinámico ante pasillos bloqueados mediante pasos de servicio (anillo sur).
* **Validación de custodia por PIN:** Acceso al compartimento mediante el **PIN de demostración: `0426`**.

---

## Presentación ante el Jurado y Documentación

La entrega cuenta con documentación completa diseñada para que cualquier evaluador pueda seguir el proyecto sin conocimientos previos de programación:

* 📄 **[Guía de Presentación, Guion de 3 Minutos y Demo (Jorge)](docs/presentacion-jorge.md)**
  * **0:00 – 0:35:** Contexto y problemática del transporte intrahospitalario (planteado formalmente como hipótesis de optimización).
  * **0:35 – 2:15:** Demostración en vivo (despacho, pantalla completa, bloqueo de pasillo, desvío, ascensor, validación por PIN `0426` y retorno).
  * **2:15 – 3:00:** Trazabilidad en bitácora, límites éticos/técnicos del prototipo y métricas para un piloto real en la CPS.

---

## Organización del Proyecto y Frentes de Trabajo (TAJIX)

El proyecto se coordina bajo el flujo `#1` $\rightarrow$ `#3` $\rightarrow$ `#2`:

1. **Asael ([PR #1](https://github.com/federicorv25/medibot-cps/pull/1)):** Recreación arquitectónica de las 5 plantas, grafo ortogonal transitable, pasillos, salas y alineación de ascensor en `src/maps/hospital.ts`. Guía: [`docs/mapa-asael.md`](docs/mapa-asael.md).
2. **Federico ([PR #3](https://github.com/federicorv25/medibot-cps/pull/3)):** Motor de simulación 3D, visor de cámaras, misiones de entregar/recoger, tránsito por ascensor, desvíos y control por PIN.
3. **Jorge ([PR #2](https://github.com/federicorv25/medibot-cps/pull/2)):** Guion oficial de 3 minutos para el jurado, guía reproducible de la demo, límites del prototipo y métricas de evaluación. Guía: [`docs/presentacion-jorge.md`](docs/presentacion-jorge.md).

---

## Declaración de Alcance y Responsabilidad (GovHealth)

1. **Entorno Simulado:** El hospital es una recreación tridimensional con fines de investigación y prueba de concepto; no constituye un plano técnico oficial ni una réplica autorizada de las instalaciones de la CPS.
2. **Datos Ficticios:** Los medicamentos, prescripciones, volúmenes y personal son estrictamente ilustrativos.
3. **Controles Lógicos:** La cerradura por PIN, la llamada de ascensores y la navegación son simulaciones de software y no deben considerarse sistemas de seguridad física certificados para entornos de producción médica.

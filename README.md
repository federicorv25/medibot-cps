# MediBot CPS · TAJIX

Prototipo **GovHealth** para la simulación y gestión autónoma del transporte interno de medicamentos y suministros críticos. El entorno representa un hospital ilustrativo inspirado en la distribución funcional de la **Caja Petrolera de Salud de Santa Cruz (Bolivia)**. Utiliza datos ficticios y opera íntegramente de manera local.

---

## Inicio Rápido

Requiere **Node.js 24 o superior**.

```sh
# 1. Instalar dependencias exactas
npm ci

# 2. Ejecutar entorno de desarrollo local
npm run dev
```

Abre en tu navegador la URL local que muestre Vite (por defecto `http://localhost:5173`).

Para verificar la integridad del código:
```sh
npm run lint
npm test -- --passWithNoTests
npm run build
```

---

## Demostración y Presentación ante el Jurado

La entrega incluye una guía paso a paso y el guion oficial para evaluar el prototipo sin necesidad de conocer el código:

*  **[Guía de Presentación, Guion de 3 Minutos y Demo (Jorge)](docs/presentacion-jorge.md)**
  * **0:00 – 0:35:** Contexto y problema del transporte intrahospitalario (planteado como hipótesis de optimización).
  * **0:35 – 2:15:** Despacho de Farmacia a Urgencias, bloqueo de pasillo, recálculo de ruta (desvío), custodia por PIN y retorno.
  * **2:15 – 3:00:** Bitácora de trazabilidad, límites del prototipo y métricas para un piloto real.
* **PIN de prueba:** `0426` (desbloqueo de compartimento de entrega).

---

## Organización del Proyecto y Frentes de Trabajo

El desarrollo parte de `main` y se estructura en tres frentes integrados:

- **Asael ([PR #1](https://github.com/federicorv25/medibot-cps/pull/1)):** Recreación del plano 3D del hospital, plantas, salas, conexiones transitables y estaciones. Entrada: `src/maps/hospital.ts`. Documentación: [`docs/mapa-asael.md`](docs/mapa-asael.md).
- **Federico ([PR #3](https://github.com/federicorv25/medibot-cps/pull/3)):** Motor de simulación 3D, despacho de medicamentos, animación de traslados, seguimiento de cámaras y control de misiones.
- **Jorge ([PR #2](https://github.com/federicorv25/medibot-cps/pull/2)):** Guion oficial para jurado, guía reproducible de la demo, límites y métricas de evaluación. Documentación: [`docs/presentacion-jorge.md`](docs/presentacion-jorge.md).

---

## Nota de Alcance y Responsabilidad (GovHealth)

Este software es un prototipo con fines de investigación, validación algorítmica y demostración de concepto para el sector de salud pública:
1. **Entorno Hospitalario:** El hospital modelado es recreado sintéticamente con propósitos de simulación; no constituye un plano técnico oficial ni una réplica autorizada de ninguna instalación sanitaria.
2. **Medicamentos y Pacientes:** Toda la información de recetas, principios activos y cantidades es estrictamente ficticia.
3. **Control de Acceso:** El PIN numérico es un mecanismo pedagógico de simulación y no sustituye controles de ciberseguridad, trazabilidad física certificada o estándares de producción.

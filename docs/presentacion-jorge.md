# Frente de presentación – Jorge
## MediBot CPS · Prototipo GovHealth – TAJIX

Este documento contiene el **guion oficial de presentación (pitch de 3 minutos)** para el jurado evaluador, la **guía reproducible paso a paso de la demo** y el **análisis de límites y métricas para un piloto real**. 

Cualquier evaluador o jurado puede seguir y validar este proyecto **sin necesidad de conocer el código**.

---

## 1. Guion de Presentación para el Jurado (Pitch de 3 Minutos)

> **Regla de oro de la presentación:** El proyecto se expone bajo un marco estricto de **hipótesis de trabajo**. Se destaca el potencial de optimización logística intrahospitalaria sin afirmar ahorros económicos o de tiempo que aún no hayan sido medidos empíricamente en campo.

```
0:00 ──────────────── 0:35 ──────────────── 2:15 ──────────────── 3:00 min
   [ Problema / Hipótesis ]    [ Demo en Vivo: Flujo Completo ]    [ Trazabilidad / Piloto ]
```

### Bloque 1: Problema y Contexto GovHealth (0:00 – 0:35)

* **Objetivo:** Plantear la problemática logística hospitalaria con realismo y rigor técnico.
* **Locución sugerida:**
  > *"Buenos días, miembros del jurado. En hospitales de alta demanda como los del sistema de seguridad social —inspiración de este prototipo basado en la Caja Petrolera de Salud de Santa Cruz—, el personal de enfermería y farmacia destina entre un 20% y 30% de su jornada a tareas mecánicas de traslado a pie de medicamentos y suministros críticos.*
  > 
  > *Nuestra hipótesis de trabajo con **MediBot CPS** es que un sistema de transporte autónomo intrahospitalario puede absorber la logística rutinaria entre sus cinco plantas, reduciendo tiempos muertos y liberando al personal de salud para lo que realmente importa: la atención directa al paciente.*
  > 
  > *Aclaramos que hoy presentamos un prototipo funcional para validar la viabilidad técnica y operativa de navegación, tránsito vertical por ascensor, contingencias y custodia de entrega, sin atribuirnos aún métricas de ahorro definitivas."*

---

### Bloque 2: Demostración en Vivo Integrada (0:35 – 2:15)

* **Objetivo:** Demostrar en vivo el centro de control 3D en **pantalla completa**, la etiqueta visible de carga, el uso del ascensor entre plantas, el desvío ante bloqueo y los flujos de entrega y recogida.
* **Secuencia de acciones y locución simultánea:**

| Tiempo | Acción en Pantalla | Locución del Presentador |
|---|---|---|
| **0:35 – 0:55** | **Vista 3D y Despacho:**<br>1. Activar modo **Pantalla Completa** con los controles de misión.<br>2. Seleccionar modo **Entregar**, elegir medicamento ficticio (ej. *Cefotaxima 1g*), cantidad (ej. 3 uds) y destino: **Urgencias** (Planta Baja).<br>3. Clic en **Despachar robot**.<br>4. Notar la **etiqueta flotante** sobre el robot con la carga y destino en tiempo real. | *"Abrimos el centro de control en pantalla completa. El operador programa un despacho desde Farmacia Central hacia Urgencias. Observen la etiqueta flotante sobre el robot: muestra en tiempo real su carga a bordo, estado y destino mientras inicia su recorrido por el pasillo principal."* |
| **0:55 – 1:25** | **Contingencia y Desvío:**<br>1. Presionar **Bloquear pasillo** a mitad de camino.<br>2. El sistema emite el aviso *«Ruta alternativa calculada»* y toma el anillo sur.<br>3. *(Opcional)* Probar bloqueo total: el robot se detiene de forma segura y reanuda al liberar el paso. | *"En un hospital real surgen camillas o áreas bloqueadas. Provocamos un bloqueo en el pasillo principal: el robot se detiene de forma segura, detecta la obstrucción y recalcula inmediatamente su ruta por el anillo sur a través de los pasos de servicio, sin intervención manual."* |
| **1:25 – 1:50** | **Custodia con PIN y Retorno:**<br>1. Llegada a Urgencias.<br>2. Introducir PIN incorrecto (se deniega la apertura), luego el **PIN demo `0426`**.<br>3. El compartimento se desbloquea, se valida la entrega y el robot inicia el retorno a Farmacia Central. | *"Al llegar a Urgencias, el cargamento permanece bloqueado. Si se introduce un PIN erróneo, la cerradura no cede; con el PIN de autorización `0426`, se libera el compartimento, se registra la recepción y el robot regresa automáticamente a su base."* |
| **1:50 – 2:15** | **Tránsito Vertical (5 Plantas / Recogida):**<br>1. Demostrar el botón **«Probar recorrido – 5 plantas»** o programar una **Recogida** en *Internación – Piso 4*.<br>2. Ver al robot tomar el **ascensor**, subir de nivel y llegar a la planta alta sin carga hasta que se introduce el PIN. | *"El sistema no se limita a una planta: MediBot gestiona las cinco plantas del hospital. Muestra de ello es la misión de recogida: el robot viaja al Piso 4 vía ascensor, donde tras validar el PIN `0426` carga las muestras y regresa a Farmacia Central con el inventario asegurado."* |

---

### Bloque 3: Trazabilidad, Límites y Piloto Real (2:15 – 3:00)

* **Objetivo:** Explicar con honestidad y madurez técnica el alcance, los componentes simulados y los indicadores para un piloto en campo.
* **Locución sugerida:**
  > *"Como muestra la bitácora en pantalla, cada evento queda registrado con trazabilidad de auditoría: tiempos de salida, paradas por pasillos, llamadas de ascensor, autorizaciones de PIN y retorno a base.*
  > 
  > *Deseamos ser muy claros respecto a los **límites del prototipo**:*
  > * *El hospital de 5 plantas es una recreación sintética para validación de software, no un plano arquitectónico oficial.*
  > * *Los medicamentos e inventarios son ficticios.*
  > * *La navegación ortogonal, la llamada del ascensor y la cerradura por PIN son simulaciones lógicas de software, no controles de grado de producción física.*
  > 
  > *¿Qué mediríamos en un **piloto real de campo** en la CPS? Tres indicadores clave:*
  > 1. ***Tiempo de ciclo solicitud-entrega*** *frente al traslado a pie tradicional.*
  > 2. ***Tasa de misiones completadas con autonomía total***.*
  > 3. ***Tiempo de detección y recuperación*** *ante congestiones y eventos de bloqueo.*
  > 
  > *MediBot CPS demuestra que la logística autónoma en salud pública es viable, segura y medible. Quedamos a su disposición para sus preguntas."*

---

## 2. Guía Reproducible de la Demo (Paso a Paso)

Cualquier persona puede ejecutar y evaluar la solución localmente en su equipo siguiendo estos pasos:

### Requisitos del Sistema
* **Node.js:** Versión 24 o superior (`node -v`).
* **Navegador web moderno:** Google Chrome, Microsoft Edge, Firefox o Safari con aceleración por hardware (WebGL).

### Instrucciones de Instalación y Arranque
```bash
# 1. Clonar el repositorio y acceder a la carpeta
git clone https://github.com/federicorv25/medibot-cps.git
cd medibot-cps

# 2. Instalar dependencias exactas
npm ci

# 3. Iniciar el servidor local de desarrollo
npm run dev
```

Abre en tu navegador la URL local indicada en la consola (por defecto: `http://localhost:5173`).

---

### Secuencia de Prueba de los Flujos Principales

#### Flujo A: Entrega con Bloqueo y Desvío Dinámico
1. **Verificar punto de partida:** El robot se encuentra estacionado en **Farmacia Central** (Planta Baja).
2. **Configurar misión:**
   * Operación: **Entregar**.
   * Medicamento: Seleccionar cualquier insumo del catálogo ficticio y la cantidad deseada.
   * Destino: **Urgencias** (Planta Baja).
3. **Despacho:** Hacer clic en **«Despachar robot»** y activar **Pantalla Completa** para mejor visualización.
4. **Inducir desvío:** Cuando el robot transite por el pasillo central, hacer clic en **«Bloquear pasillo»**.
   * *Resultado esperado:* El robot se detiene, emite el evento *«Ruta alternativa calculada»* y toma el desvío por el anillo sur.
5. **Validación de PIN:**
   * Al arribar a Urgencias, ingresar el **PIN de demo:** `0426`.
   * Presionar **«Confirmar recepción»**.
6. **Retorno:** El robot regresa de forma autónoma a Farmacia Central y la bitácora registra la misión como completada.

#### Flujo B: Tránsito Vertical por Ascensor y Recorrido de 5 Plantas
* Presionar el botón **«Probar recorrido – 5 plantas»**:
  * La cámara cambia a la vista de edificio completo.
  * El robot se desplaza hasta el ascensor, sube a través de los pisos 1 a 4 y concluye el recorrido en Internación.

#### Flujo C: Misión de Recogida
1. Seleccionar la pestaña **«Recoger»**.
2. Destino: **Internación – Piso 4**.
3. Clic en **«Despachar robot»**:
   * El robot viaja sin carga a bordo hasta el Piso 4.
   * En destino se introduce el PIN `0426` para cargar los insumos.
   * El robot retorna a Farmacia con los medicamentos a bordo.

---

## 3. Matriz de Alcance y Límites del Prototipo GovHealth

| Dimensión | Implementación en este Prototipo | Alcance para Piloto Real / Producción |
|---|---|---|
| **Modelo del Hospital** | Recreación geométrica de 5 plantas inspirada en la CPS Santa Cruz para pruebas algorítmicas. | Relevamiento topográfico con planos autorizados y mapeo LiDAR en sitio. |
| **Insumos y Fármacos** | Catálogo sintético para validación de cargas y volumen en interfaz. | Integración estándar HL7/FHIR con el ERP hospitalario y el dispensario central. |
| **Control de Acceso / PIN** | PIN numérico estático de demostración (`0426`) en interfaz gráfica. | Lector NFC de credencial hospitalaria o biometría con registro auditable. |
| **Navegación y Sensores** | Algoritmo determinista sobre grafo ortogonal con nodos fijos y desvíos programados. | Pila ROS 2 con SLAM LiDAR 2D/3D, cámaras de profundidad y detección de obstáculos dinámicos. |
| **Ascensores y Tránsito** | Simulación lógica de cambio de nivel entre plantas alineadas. | Integración con protocolo de control de elevadores hospitalarios (PLC / relés de llamado). |

---

## 4. Métricas de Evaluación para el Piloto Real en la CPS

Para medir el impacto de la hipótesis de optimización logística, el plan piloto cuantificará:

1. **Tiempo Medio de Ciclo de Entrega ($T_{ciclo}$):**
   $$T_{\text{ciclo}} = T_{\text{entrega manual tradicional}} - T_{\text{entrega autónoma MediBot}}$$
2. **Tasa de Autonomía de Misión ($TAM$):**
   $$TAM = \left( \frac{\text{Misiones concluidas sin asistencia humana}}{\text{Total de misiones solicitadas}} \right) \times 100$$
3. **Resiliencia Operativa ante Bloqueos ($T_{recup}$):**
   Tiempo promedio en segundos desde la detección de una obstrucción hasta el recálculo y adopción de la ruta alternativa.

---

## 5. Registro de Integración y Validación Técnica (TAJIX)

De acuerdo con el protocolo de integración acordado (`#1` Mapa Asael $\rightarrow$ `#3` Simulación Federico $\rightarrow$ `#2` Documentación Jorge):

| Componente | Rama / PR | SHA Verificado | Estado |
|---|---|---|---|
| **Mapa Hospitalario 5 Plantas** | `feat/mapa-hospital` (PR #1) | `f4fedeb7` *(actualizando a 5 plantas)* | En preparación |
| **Simulación 3D y Despacho** | `feat/simulacion-robot` (PR #3) | `95d6cb4` | En preparación |
| **Guion, Demo y Documentación** | `docs/presentacion-govhealth` (PR #2) | *Este commit* | **Listo para revisión conjunta** |

> **Nota:** La documentación será refrendada contra la versión final combinada de la rama temporal antes de la aprobación final y el merge ordenado a `main`.

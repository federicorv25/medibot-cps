# MediBot CPS · TAJIX

Simulación **GovHealth** de entrega y recogida de medicamentos dentro de un hospital recreado de cinco plantas, inspirado en la Caja Petrolera de Salud de Santa Cruz. El robot recorre pasillos, usa un ascensor simulado, busca un desvío ante un bloqueo y registra cada evento.

## Ejecutar la demo

Requiere Node.js 24 o superior y Chrome o Edge con WebGL 2. El repositorio es público y se puede clonar sin invitación.

```sh
git clone https://github.com/federicorv25/medibot-cps.git
cd medibot-cps
npm ci
npm run dev
```

Abre la URL que muestre Vite, normalmente [http://localhost:5173](http://localhost:5173). No se necesitan claves, cuentas clínicas ni servicios externos. En esta sesión de presentación también está disponible [http://127.0.0.1:5176](http://127.0.0.1:5176).

## Presentación rápida

Al abrir la demo se ve la **fachada** ilustrativa. Pulsa **Ver por dentro** para abrir las cinco plantas. Puedes volver a **Fachada** en cualquier momento; las vistas **3D**, **Plano** y **Seguir robot** muestran siempre el interior.

1. Pulsa **Probar recorrido · 5 plantas**. Inicia una **entrega** de cuatro cajas de Paracetamol y dos bolsas de Solución salina a Internación · Piso 4.
2. El despacho abre el interior automáticamente. Pulsa **Pantalla completa**. La vista **Edificio** muestra los niveles separados y el robot subiendo por el ascensor. La etiqueta sobre él indica su carga y destino.
3. Al llegar, introduce **0426** y pulsa **Confirmar entrega**. El robot deja la carga y regresa vacío a Farmacia. Puedes salir del visor ampliado con **Salir de pantalla completa** o Escape.
4. Para probar una **recogida**, termina la misión o pulsa **Reiniciar demo** antes de ampliar. Elige **Recoger**, Internación · Piso 4 y las cantidades; luego **Despachar robot**. Viaja vacío, carga al validar el PIN con **Confirmar recogida** y vuelve con los medicamentos.
5. Para mostrar un desvío, despacha a **Urgencias · Planta baja** y pulsa **Bloquear pasillo** al inicio del trayecto. Comprueba «Ruta alternativa calculada» en la bitácora. Si bloqueas todas las alternativas, espera en un punto seguro; **Liberar paso** permite continuar.

Configura tipo de misión, destino y cantidades antes de entrar en pantalla completa. El visor ampliado conserva los controles de bloqueo y PIN; el formulario de nuevos pedidos está en el centro de control. El PIN es estático y solo sirve para esta demo. El catálogo contiene Paracetamol, Solución salina y Amoxicilina; no gestiona muestras de laboratorio ni dosis clínicas.

| Planta | Destino operativo |
|---|---|
| Planta baja | Farmacia Central y Urgencias |
| Piso 1 | Diagnóstico |
| Piso 2 | Quirófanos |
| Piso 3 | Cuidados intensivos |
| Piso 4 | Internación |

## Complejo hospitalario 3D

Desde el centro de control, **Complejo 3D · 3 torres** abre `complejo.html`: tres torres en U alrededor de un patio con jardín (Torre Oeste, Torre Central y Torre Este, 13 plantas en total).

- Elige una o varias torres con los botones o con clic sobre el edificio (Ctrl/Shift + clic suma otra). Las demás quedan transparentes.
- **Fachada exterior** muestra u oculta la piel de las torres elegidas; **Separar plantas** abre los pisos para ver las salas.
- **Circuito de MediBot** marca en verde los pasillos, el ascensor y el camino del patio.
- **Iniciar recorrido** hace que MediBot salga de su **Estación MediBot** (Torre Oeste, planta baja), recorra todas las plantas de las torres elegidas, entregue en la sala principal de cada piso y vuelva a la estación. Permite pausar, detener y elegir la velocidad.

Es un complejo ficticio con fines ilustrativos; el simulador del centro de control sigue usando el mapa de cinco plantas.

El complejo muestra un recorrido visual automático por las torres. Los medicamentos, las cantidades, los desvíos y el PIN `0426` se demuestran desde el **centro de control**. El pedido del centro de control no se transfiere a esta vista independiente.

Para presentar, prepara dos pestañas: el centro de control y `complejo.html`. Muestra la fachada del complejo, inicia el recorrido y elige velocidad ×4. Puedes pausarlo para explicar las plantas y continuar después. El circuito completo visita 13 plantas y vuelve a la estación; no es necesario esperar todo el circuito durante el pitch.

Para dejar una versión estable en la laptop de presentación:

```sh
npm ci
npm run build
npm run preview -- --host 127.0.0.1 --port 5176 --strictPort
```

Abre `http://127.0.0.1:5176/` y `http://127.0.0.1:5176/complejo.html`. Mantén el servidor encendido. Si el puerto está ocupado, elige otro puerto libre sin cerrar procesos ajenos.

## Evidencia y guion

- [PowerPoint final de la presentación](docs/TAJIX-MediBot-CPS.pptx)
- [Guion de tres minutos y pruebas paso a paso](docs/presentacion-jorge.md)
- [Vista final del centro de control](docs/capturas-finales/centro-control.jpg)
- [Edificio de cinco plantas](docs/capturas-finales/edificio.jpg)
- [Fachada ilustrativa del hospital](docs/capturas-finales/hospital-fachada.jpg)

Las capturas finales corresponden al modelo de Asael combinado con el visor de Federico. Las capturas históricas de `docs/capturas-mapa/` se conservan como evidencia de desarrollo.

## Verificación

```sh
npm run lint
npm test
npm run build
```

La combinación final tiene 24 pruebas de mapa, fachada y simulación: acceso a los destinos, puertas, ascensores, desvío, parada sin ruta, recuperación, PIN y conservación de la carga en entrega/recogida. Las pruebas automáticas se complementan con recorridos visibles en Chrome.

## Equipo

- **Asael:** modelo de cinco plantas y grafo transitable — [PR #1](https://github.com/federicorv25/medibot-cps/pull/1).
- **Asael:** fachada exterior activable — [PR #4](https://github.com/federicorv25/medibot-cps/pull/4).
- **Ruben Asael Rojas Mansilla:** complejo hospitalario de tres torres — [PR #5](https://github.com/federicorv25/medibot-cps/pull/5).
- **Federico:** centro de control y simulación del robot — [PR #3](https://github.com/federicorv25/medibot-cps/pull/3).
- **Jorge:** guion, documentación y guía de demostración — [PR #2](https://github.com/federicorv25/medibot-cps/pull/2).

Integrantes del equipo: **Ruben Asael Rojas Mansilla**, **Jorge Luis Arteaga Cortez** y **Luis Federico Rojas Villarrubia**.

## Alcance del prototipo

El hospital y su fachada son recreados, sin plano oficial ni mediciones verificadas de las instalaciones. La fachada no representa el exterior real de la CPS. Los medicamentos y cantidades son ficticios. El movimiento, el bloqueo de pasillos, el ascensor y la cerradura se simulan en el navegador; no hay SLAM real, sensores físicos ni un sistema de custodia certificado. La bitácora vive en memoria y se borra al reiniciar o recargar.

El transporte de muestras, RFID, integración clínica y un robot físico son posibles líneas futuras, pendientes de diseño y validación. No se han medido ahorros de tiempo, costos ni resultados clínicos. [El guion](docs/presentacion-jorge.md#indicadores-para-un-piloto) define qué medir en un piloto.

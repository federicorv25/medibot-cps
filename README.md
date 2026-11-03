# MediBot CPS · TAJIX

Prototipo GovHealth para el transporte interno de medicamentos. Representa un hospital ilustrativo inspirado en la Caja Petrolera de Salud de Santa Cruz. Usa datos ficticios y funciona localmente.

```sh
npm ci
npm run dev
```

Requiere Node.js 24 o superior. Abre la URL local que muestre Vite.

- **Asael:** mapa y conexiones. Entrada: `src/maps/hospital.ts`.
- **Federico:** despacho, movimiento 3D y seguimiento.
- **Jorge:** documentación de la demo y guion para el jurado.

El mapa de prueba y el contrato viven en `src/maps`. Las tres contribuciones parten de `main` y se prueban juntas antes de integrar.

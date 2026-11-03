# Frente de mapa · Asael

Usa la rama `feat/mapa-hospital`. Lee el contrato en `src/maps/contract.ts` y el ejemplo en `src/maps/demo-map.ts`. Sustituye la exportación por defecto de `src/maps/hospital.ts` con tu mapa; puedes agregar módulos nuevos en ese directorio sin editar el mapa de prueba ni el simulador.

- Coordenadas en metros: X hacia la derecha y Z hacia el sur. Cada planta tiene un nivel entero, dimensiones y un ID único.
- Define las plantas, salas y puertas, nodos y tramos que el robot puede recorrer. Ubica las cuatro estaciones únicas: `pharmacy`, `emergency`, `surgery`, `inpatient`. Alinea el ascensor entre plantas; solo un tramo `lift` puede cambiar de nivel.
- Dibuja dos recorridos válidos hacia Urgencias y conecta Farmacia con los otros destinos. Traza los segmentos rectos por puertas y pasillos sin atravesar muros. Conserva el rótulo «Mapa recreado para la simulación».
- Verifica con `npm ci`, `npm run lint`, `npm run build`. Tras combinar con la simulación, demuestra un recorrido normal, un desvío y un viaje entre pisos.

Para Claude Code: «Lee este documento y el contrato del mapa, confirma qué rama y archivos tienes, implementa exclusivamente el mapa recreado de TAJIX y entrega capturas y validación. Sin plano autorizado, no lo presentes como réplica exacta. No toques el motor ni fusiones el PR».

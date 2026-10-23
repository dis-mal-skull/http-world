# HTTP World

Una guía interactiva en 3D para aprender los conceptos básicos de HTTP. Conduces un
coche low-poly por una isla de red, visitas ocho estaciones y desbloqueas una ficha
por concepto: cliente/servidor, mensajes, métodos, códigos de estado, cabeceras,
conexiones, caché/cookies y CORS.

El proyecto está inspirado en la idea de los mundos 3D navegables de
[Bruno Simon](https://bruno-simon.com/), pero todo el contenido, los modelos y el
código son propios.

**Estudiantes:** Camilo Osorio y Oscar Gómez  
**Profesor:** Julián Salazar Pineda

## Cómo ejecutarlo

```bash
npm install
npm run dev
```

Abre la URL que imprime Vite (por defecto `http://localhost:5173`).

Para generar la versión estática:

```bash
npm run build
npm run preview
```

La carpeta `dist/` se puede publicar en cualquier hosting estático.

## Controles

| Acción | Teclado | Táctil |
| --- | --- | --- |
| Acelerar / retroceder | `W` / `S` o flechas | joystick |
| Girar | `A` / `D` o flechas | joystick |
| Freno | `Espacio` | — |
| Turbo | `Shift` | botón TURBO |
| Leer estación | `E` | acercarse o tocar la etiqueta |
| Índice / viajar | `Tab` | botón Índice |
| Reiniciar coche | `R` | — |
| Sonido | `M` | botón de sonido |
| Cerrar panel | `Esc` | botón ✕ |

También puedes arrastrar con el mouse para orbitar la cámara y usar la rueda para
acercar o alejar.

## Cómo está organizado

```
index.html            Estructura del HUD, el panel y la portada
src/main.js           Bootstrap, cámara, entrada, bucle de render
src/world.js          Isla, estaciones, servidor, decoración y optimizaciones
src/car.js            Coche low-poly y física arcade
src/content.js        Los ocho conceptos y sus fuentes de MDN
src/ui.js             Etiquetas 3D, panel, índice, minimapa y progreso
src/style.css         Sistema visual completo
src/audio.js          Motor y sonidos sintetizados con Web Audio
```

El contenido educativo vive en `src/content.js`. Cada estación tiene un `angle` y
un `radius` que determinan su posición en la isla; si añades una estación, la
etiqueta, el minimapa y la progresión se actualizan solos. Los iconos disponibles
son `hub`, `mail`, `methods`, `status`, `headers`, `connections`, `cache` y
`shield`.

## Decisiones técnicas

- **Three.js + Vite**, sin frameworks de UI. El HUD es HTML/CSS para que el texto
  sea nítido y accesible.
- **Geometría procedural**: no hay modelos ni texturas externas. Los árboles,
  rocas, nubes, coche e iconos se construyen con primitivas de Three.js.
- **InstancedMesh** para árboles, rocas, arbustos, flores, hierba, piedras y las
  líneas discontinuas de la carretera. La escena queda en ~290 draw calls.
- **Física arcade propia**: aceleración, arrastre, giro proporcional a la
  velocidad, colisiones circulares y límite de isla. No usa un motor de físicas.
- **Cámara chase** con órbita temporal, zoom y recentrado automático.
- **Audio sintetizado** con Web Audio API: motor, pad ambiental y blips de la
  interfaz. Se activa con el primer clic y se puede silenciar.
- **Sin dependencias de red en runtime** salvo las fuentes de Google Fonts; si no
  cargan, el sitio usa la tipografía del sistema.

## Contenido y créditos

Los resúmenes, ejemplos y enlaces están basados en la documentación de
[MDN Web Docs sobre HTTP](https://developer.mozilla.org/es/docs/Web/HTTP), publicada
bajo licencia [CC BY-SA 2.5](https://creativecommons.org/licenses/by-sa/2.5/).
Este proyecto es material educativo y no está afiliado a MDN ni a Bruno Simon.

Código: MIT.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Contexto del proyecto

Web profesional de Daniel Navarro Delgado (finanzas, tecnología empresarial e IA aplicada), desplegada en GitHub Pages: https://danielnavarro1600.github.io.

**Sobre el propietario**: tiene conocimientos básicos de programación (HTML, Git, GitHub Pages, Firebase a nivel de fundamentos, no experiencia avanzada). Todas las explicaciones deben ser claras, breves y paso a paso, en lenguaje sencillo — sin dar por hecho experiencia avanzada.

**Objetivo del trabajo actual**: mejorar visualmente la web manteniendo su funcionamiento actual.

## Comandos

No hay build, gestor de paquetes ni tests automatizados. La web ejecutable está contenida en index.html; el repositorio también incluye documentación y configuración de GitHub Pages.

- **Ejecutar en local**: abrir `index.html` directamente en el navegador (en PowerShell: `Start-Process .\index.html`), o servir la carpeta con cualquier servidor estático.
- **Despliegue**: automático vía `.github/workflows/static.yml` — cualquier push a `main` sube el repositorio completo como artefacto de Pages. No hay paso de build en CI.
- No existen comandos de lint, formateo o test en este repo.

## Arquitectura

- `index.html` contiene todo: HTML, un único bloque `<style>` y un único bloque `<script>` al final de `<body>`. No hay pipeline de CSS/JS — los cambios de estilo y comportamiento se editan directamente en este archivo.
- **Sistema de diseño**: tokens CSS en `:root` (color, tipografía, espaciado `--s1`…`--s10`, forma, movimiento). Tipografías: `Instrument Serif` (display), `Manrope` (interfaz y texto), `JetBrains Mono` (rótulos, fechas y cifras). Acento verde jade; el contraste AA está verificado en los dos temas.
- **Tema claro/oscuro**: `:root` define el tema claro y `[data-theme="dark"]` solo redefine lo que cambia. `toggleTheme()` cambia el atributo `data-theme` de `<html>` y guarda la elección en `localStorage`. Si el visitante nunca ha elegido manualmente, se sigue `prefers-color-scheme` del sistema (incluso en vivo si cambia con la página abierta). Un script diminuto al principio del `<head>` aplica el tema antes de pintar la página, para evitar un destello del tema incorrecto al recargar.
- **Banda de cierre**: `.band` (Método + Contacto + pie) es oscura en los dos temas a propósito, con su propio juego de tokens `--band-*`.
- **Secciones** (anclas de navegación): `#hero`, `#skills` (Capacidades), `#projects` (Trabajo), `#experience` (Trayectoria), `#education` (Formación), `#certifications`, `#approach` (Método) y `#contact`. La barra `<nav class="nav" id="navbar">` enlaza cinco de ellas; el resto se alcanzan al desplazarse.
- **Interactividad** (JS nativo, sin dependencias): estado y barra de progreso del navbar (un solo listener de scroll con `requestAnimationFrame`), medida real de `--nav-h`, menú móvil con trampa de foco, Escape y bloqueo del scroll de fondo, marcado de la sección activa (`aria-current`), aparición al hacer scroll con `IntersectionObserver` (`.reveal`) e índice de certificaciones filtrable.
- **Índice de certificaciones**: cada certificación aparece una sola vez en `#certIndex`, etiquetada con `data-track` (`ia`, `oracle`, `gestion`; admite varios itinerarios). Los recuentos de los filtros, el total por emisor y la cifra del hero se calculan desde el DOM, así que añadir o quitar una entrada en el HTML actualiza todas las cifras sin tocar ningún número a mano. La barra de filtros nace con `hidden` y solo la muestra el JS.
- **Dependencias externas** (CDN, en `<head>`): Google Fonts y Font Awesome. Todas las imágenes (retrato, favicon y og:image) se sirven desde `img/` en el propio repositorio.
- Idioma del contenido: español (`<html lang="es">`), con `lang="en"` en los términos y títulos que están en inglés.

## Reglas de trabajo

- Trabajar únicamente con los archivos locales del repositorio actual.
- No utilizar herramientas MCP.
- No acceder a Canva, Gmail, Google Calendar ni Google Drive.
- Antes de modificar archivos, presentar un plan breve: archivos afectados, resultado esperado y riesgos.
- No realizar ningún cambio hasta que el usuario apruebe expresamente el plan.
- Realizar una sola tarea aprobada cada vez. Una tarea puede incluir varios cambios estrechamente relacionados si se detallan previamente en el plan.
- No hacer cambios adicionales no solicitados.
- Explicar cada cambio con lenguaje sencillo.
- Después de cada cambio, indicar cómo comprobarlo y cómo deshacerlo.

## Protecciones

- No modificar persistencia, autenticación, repositorio remoto ni configuración de GitHub Pages sin autorización expresa.
- No hacer push, merge, rebase, reset, force push, publicación ni despliegue sin autorización expresa.
- No cambiar de rama.
- No instalar paquetes, dependencias, plugins ni herramientas sin autorización.
- No borrar ni renombrar archivos sin autorización.
- No incluir ni solicitar claves, tokens, contraseñas o credenciales.
- No usar información corporativa ni de clientes.
- No añadir frameworks si la web actual no los necesita.
- No reescribir por completo `index.html` salvo autorización expresa.

## Prioridades de diseño

- Imagen profesional, limpia y moderna.
- Claridad, legibilidad y navegación sencilla.
- Buena visualización en móvil y escritorio.
- Mantener la identidad y el contenido profesional existente.
- Mejorar accesibilidad, contraste y consistencia visual.
- Evitar animaciones excesivas, ruido visual y elementos innecesarios.
- Mantener el rendimiento y evitar dependencias innecesarias.

## Flujo obligatorio

1. Analizar el estado actual.
2. Explicar los hallazgos.
3. Proponer un plan pequeño.
4. Esperar aprobación expresa.
5. Aplicar únicamente lo aprobado.
6. Mostrar un resumen exacto de los cambios.
7. Indicar cómo probarlos.
8. Recomendar revisar `git diff` antes de guardar nada.

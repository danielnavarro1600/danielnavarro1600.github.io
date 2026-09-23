// Comportamiento compartido por las dos versiones de la web (index.html y
// en/index.html). Aquí no hay textos visibles: los que cambian con el idioma
// (etiquetas del tema y del menú, el contador de certificaciones) se leen de
// atributos data- del HTML de cada página.

// ---- AÑO DEL PIE ----
// El año queda escrito en el HTML como respaldo por si el JS no llega a
// ejecutarse; en el caso normal se sustituye por el año real.
const footerYear = document.getElementById('footerYear');
if (footerYear) footerYear.textContent = new Date().getFullYear();

// ---- BARRA DE NAVEGACIÓN ----
const navbar = document.getElementById('navbar');
const navProgress = document.getElementById('navProgress');
const hero = document.getElementById('hero');

// Un solo listener de scroll para las dos cosas que dependen de él, y el
// trabajo real aplazado a un frame: leer scrollY en cada evento es barato,
// escribir estilos no.
let scrollQueued = false;
function onScrollFrame() {
  scrollQueued = false;
  const y = window.scrollY;
  navbar.classList.toggle('scrolled', y > 40);
  // El hero es oscuro en los dos temas: mientras la barra flota sobre él
  // usa los colores de tinta, y vuelve a los del tema al dejarlo atrás.
  navbar.classList.toggle('over-hero', y < heroSwitchPoint);

  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = scrollable > 0 ? Math.min(y / scrollable, 1) : 0;
  navProgress.style.transform = 'scaleX(' + ratio + ')';

  // Contacto es la última sección y, al ser corta, su título nunca llega a
  // cruzar la franja de detección del observador: al llegar abajo del todo
  // se fuerza el último enlace del nav.
  if (lastSectionLink && scrollable > 0 && y >= scrollable - 2) {
    setCurrent(lastSectionLink);
  } else if (firstSection && firstSection.getBoundingClientRect().top > window.innerHeight * 0.3) {
    // Y al revés: de vuelta arriba del todo ninguna sección cruza la franja,
    // así que el observador no dispara y se quedaba marcado el último
    // enlace visitado mientras el visitante ya está en el hero.
    setCurrent(null);
  }
}
window.addEventListener('scroll', () => {
  if (scrollQueued) return;
  scrollQueued = true;
  requestAnimationFrame(onScrollFrame);
}, { passive: true });

// ---- ALTURA REAL DEL NAV ----
// La usa scroll-padding-top (CSS) para que saltar a un ancla no deje el
// título ni tapado ni con un hueco de más. Medida, no adivinada: cambia
// entre escritorio y móvil, y al terminar de cargar las fuentes.
// El punto en el que la barra deja de estar sobre el hero se mide, no se
// adivina: depende del alto real del hero, que cambia con el ancho de la
// ventana y al terminar de cargar las fuentes.
let heroSwitchPoint = 0;

function setNavHeight() {
  document.documentElement.style.setProperty('--nav-h', navbar.offsetHeight + 'px');
  heroSwitchPoint = hero ? Math.max(hero.offsetHeight - navbar.offsetHeight, 0) : 0;
  navbar.classList.toggle('over-hero', window.scrollY < heroSwitchPoint);
}
setNavHeight();
window.addEventListener('resize', setNavHeight, { passive: true });
window.addEventListener('load', setNavHeight);
if (document.fonts) document.fonts.ready.then(setNavHeight);

// ---- TEMA ----
// El estado real (claro u oscuro) ya lo decidió, sin destello, el script
// del <head>. Aquí solo se sincronizan la etiqueta y aria-pressed con ese
// estado (el icono lo cambia el CSS según data-theme) y se guarda la
// elección manual del visitante.
const THEME_KEY = 'theme';
const themeLabel = document.getElementById('themeLabel');
const themeToggle = document.getElementById('themeToggle');

function syncThemeUI(isDark) {
  themeLabel.textContent = isDark ? themeToggle.dataset.labelLight : themeToggle.dataset.labelDark;
  themeToggle.setAttribute('aria-label', themeLabel.textContent);
  themeToggle.setAttribute('aria-pressed', String(isDark));
}

syncThemeUI(document.documentElement.getAttribute('data-theme') === 'dark');

function applyTheme(isDark) {
  if (isDark) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  syncThemeUI(isDark);
}

// Al pulsar el botón, fundido corto entre un tema y otro con la View
// Transitions API. Si el navegador no la tiene, o el visitante pide menos
// movimiento, el tema cambia al instante, como antes.
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'dark';
  if (document.startViewTransition && !reduceMotion.matches) {
    document.startViewTransition(() => applyTheme(isDark));
  } else {
    applyTheme(isDark);
  }
  try { localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light'); } catch (e) {}
}

// Si el visitante nunca ha elegido manualmente, seguir en vivo los cambios
// de preferencia del sistema (por ejemplo, si el SO cambia de tema con la
// persona ya en la página).
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  let stored = null;
  try { stored = localStorage.getItem(THEME_KEY); } catch (err) {}
  if (stored) return;
  applyTheme(e.matches);
});

// ---- MENÚ MÓVIL ----
// Un único punto para abrir y cerrar: lo usan el botón, el cierre al pulsar
// un enlace y la tecla Escape.
const navLinksEl = document.getElementById('navLinks');
const hamburger = document.getElementById('hamburger');

// .closing solo dura el fundido de salida (ver el CSS del menú): se retira
// pasado un margen algo mayor que --dur-2 (0.32s). Si esa duración crece,
// hay que subir también este margen.
const CLOSING_MS = 450;
let closingTimer = 0;

function setMenuOpen(isOpen) {
  // Se mira si estaba abierto porque este cierre también se llama al
  // pulsar cualquier ancla, con el menú ya cerrado.
  const wasOpen = navLinksEl.classList.contains('open');
  const isClosing = wasOpen && !isOpen;
  clearTimeout(closingTimer);
  navLinksEl.classList.toggle('closing', isClosing);
  if (isClosing) {
    closingTimer = setTimeout(() => navLinksEl.classList.remove('closing'), CLOSING_MS);
  }
  navLinksEl.classList.toggle('open', isOpen);
  hamburger.setAttribute('aria-expanded', String(isOpen));
  hamburger.setAttribute('aria-label', isOpen ? hamburger.dataset.labelClose : hamburger.dataset.labelOpen);
  // Con el panel a pantalla completa abierto, la página no debe seguir
  // desplazándose por detrás.
  document.body.style.overflow = isOpen ? 'hidden' : '';
  // El botón va después de los enlaces en el DOM: al abrir con teclado, el
  // foco se queda en él y el siguiente Tab saltaría fuera del menú, detrás
  // del panel a pantalla completa. Moverlo al primer enlace hace que la
  // trampa de foco de abajo funcione de verdad.
  if (isOpen) {
    const firstLink = navLinksEl.querySelector('a[href]');
    if (firstLink) firstLink.focus();
  }
}

function toggleMenu() {
  setMenuOpen(!navLinksEl.classList.contains('open'));
}

// Escape cierra el menú y devuelve el foco al botón que lo abrió;
// Tab y Shift+Tab quedan atrapados dentro mientras está abierto, para que
// no se pueda tabular "detrás" del panel a pantalla completa.
document.addEventListener('keydown', (e) => {
  if (!navLinksEl.classList.contains('open')) return;

  if (e.key === 'Escape') {
    setMenuOpen(false);
    hamburger.focus();
    return;
  }

  if (e.key === 'Tab') {
    const focusables = navLinksEl.querySelectorAll('a[href], button:not([disabled])');
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});

// Cerrar el menú al saltar a cualquier ancla.
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', () => setMenuOpen(false));
});

// ---- SECCIÓN ACTIVA EN EL NAV ----
const navSectionLinks = new Map();
document.querySelectorAll('#navLinks a[href^="#"]').forEach(a => {
  const section = document.getElementById(a.getAttribute('href').slice(1));
  if (section) navSectionLinks.set(section, a);
});
const firstSection = [...navSectionLinks.keys()][0];
const lastSectionLink = [...navSectionLinks.values()].pop();

function setCurrent(link) {
  navSectionLinks.forEach(a => a.removeAttribute('aria-current'));
  if (link) link.setAttribute('aria-current', 'page');
}

const spyObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) setCurrent(navSectionLinks.get(entry.target));
  });
}, { rootMargin: '-88px 0px -70% 0px', threshold: 0 });

navSectionLinks.forEach((_, section) => spyObserver.observe(section));

// ---- APARICIÓN AL HACER SCROLL ----
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ---- BLOQUES PLEGABLES AL IMPRIMIR ----
// Un <details> cerrado no se imprime: en papel faltaría justo el detalle de
// cómo se construyó cada caso. Se abren antes de imprimir y se devuelven a
// su estado anterior después.
const collapsibles = document.querySelectorAll('.case-more');
window.addEventListener('beforeprint', () => {
  collapsibles.forEach(d => { d.dataset.wasOpen = String(d.open); d.open = true; });
});
window.addEventListener('afterprint', () => {
  collapsibles.forEach(d => { d.open = d.dataset.wasOpen === 'true'; });
});

// ---- ÍNDICE DE CERTIFICACIONES ----
// Los recuentos se derivan del propio índice: añadir o quitar una entrada
// en el HTML actualiza los filtros, la cifra del hero y el contador sin
// tocar ningún número a mano.
(function initCertIndex() {
  const index = document.getElementById('certIndex');
  const toolbar = document.getElementById('certToolbar');
  if (!index || !toolbar) return;

  const items = [...index.querySelectorAll('.cert-item')];
  const groups = [...index.querySelectorAll('.cert-group')];
  const filters = [...toolbar.querySelectorAll('.filter')];
  const counter = document.getElementById('certCount');
  const heroTotal = document.getElementById('certTotalHero');

  const tracksOf = (el) => (el.dataset.track || '').split(/\s+/).filter(Boolean);
  const matches = (el, filter) => filter === 'all' || tracksOf(el).includes(filter);

  // Recuento por filtro y total real, sin duplicar.
  filters.forEach(btn => {
    const n = items.filter(item => matches(item, btn.dataset.filter)).length;
    btn.querySelector('i').textContent = n;
  });
  if (heroTotal) heroTotal.textContent = items.length;

  function apply(filter) {
    filters.forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.filter === filter)));

    let shown = 0;
    items.forEach(item => {
      const visible = matches(item, filter);
      item.hidden = !visible;
      if (visible) shown++;
    });
    // Un grupo sin entradas visibles se oculta entero: si no, quedaría un
    // encabezado de emisor colgando sin nada debajo. El recuento del
    // encabezado cuenta solo lo visible, para que cuadre con lo listado.
    groups.forEach(group => {
      const deGrupo = [...group.querySelectorAll('.cert-item')];
      const visiblesAqui = deGrupo.filter(i => !i.hidden).length;
      group.hidden = visiblesAqui === 0;
      const badge = group.querySelector('[data-group-count]');
      if (badge) badge.textContent = visiblesAqui;
    });

    const label = filters.find(b => b.dataset.filter === filter);
    counter.textContent = shown + ' ' + (shown === 1 ? counter.dataset.one : counter.dataset.many) +
      (filter === 'all' ? '' : ' · ' + label.firstChild.textContent.trim());
  }

  filters.forEach(btn => btn.addEventListener('click', () => apply(btn.dataset.filter)));

  // Los controles solo existen si el JS ha llegado hasta aquí.
  toolbar.hidden = false;
  apply('all');
})();

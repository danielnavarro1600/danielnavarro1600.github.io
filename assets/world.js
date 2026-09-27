// Mundo 3D, "El valle del dato": la trayectoria de la web convertida en un
// paisaje que se explora con la cámara. Comparte con la web la paleta (tinta,
// papel y oro) y su regla: aquí no hay textos visibles. Los lugares y la
// interfaz se leen del JSON #worldData de cada página, en su idioma.
//
// Three.js r149 (build clásica, en assets/vendor/) se carga antes que este
// archivo: así las páginas también funcionan abiertas con doble clic.
//
// Mapa del valle (x hacia el este, z hacia el sur, y hacia arriba):
// el río nace en un portal del acantilado norte, cruza el valle hasta un lago
// con un cubo flotante y desemboca en el mar del sur, donde está el faro.
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const dataEl = $('worldData');
  if (!dataEl) return;
  const DATA = JSON.parse(dataEl.textContent);
  const UI = DATA.ui;
  const params = new URLSearchParams(location.search);
  // Modo de grabación: el tiempo y la cámara los controla un script externo.
  const CAPTURE = params.has('capture');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  // Móviles y pantallas pequeñas: menos árboles, sin sombras, menos píxeles.
  const LITE = coarse || Math.min(window.innerWidth, window.innerHeight) < 600;

  // ---- ENLACES EN LOCAL ----
  // Abierto con doble clic (file://) no hay servidor que añada index.html a
  // las carpetas: se completa la ruta, igual que hace site.js.
  function localHref(href) {
    if (location.protocol !== 'file:' || /^[a-z]+:/i.test(href)) return href;
    const [path, hash] = href.split('#');
    return (path.endsWith('/') ? path + 'index.html' : path) + (hash ? '#' + hash : '');
  }
  document.querySelectorAll('a[data-folder]').forEach(a => a.setAttribute('href', localHref(a.getAttribute('href'))));

  // ---- SIN 3D ----
  function hasWebGL() {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) { return false; }
  }
  if (!window.THREE || !hasWebGL()) {
    $('fallback').hidden = false;
    $('intro').hidden = true;
    document.body.classList.add('no-webgl');
    return;
  }

  document.body.classList.add('loading');
  const T = window.THREE;
  // Colores en sRGB (los de la web) convertidos a lineal para la luz.
  T.ColorManagement.legacyMode = false;

  // Sol bajo, al suroeste: luz dorada rasante y siluetas a contraluz.
  const SUN_DIR = new T.Vector3(-0.62, 0.2, 0.76).normalize();

  // Colores del cielo del atardecer (sRGB, como en la web).
  const SKY = {
    zenith: new T.Color(0x07070f), upper: new T.Color(0x2a2140),
    toward: new T.Color(0xeea468), away: new T.Color(0x86708a), sun: new T.Color(0xffd79a),
  };
  // La bruma del horizonte, en GLSL: la usan el cielo y la niebla, así un
  // objeto lejano se funde exactamente con el cielo que tiene detrás y el
  // borde del mundo no se ve nunca. Ámbar hacia el sol, violeta al lado contrario.
  const glv = (v) => 'vec3(' + [v.x ?? v.r, v.y ?? v.g, v.z ?? v.b].map((n) => n.toFixed(5)).join(', ') + ')';
  // La niebla usa la bruma más oscura (FOG_K) y con menos resplandor del sol
  // (FOG_GLOW), para que a contraluz el valle no se vea lavado.
  const FOG_K = '0.5', FOG_GLOW = '0.25';
  const HAZE_GLSL = `
    vec3 hazeBase(vec3 d) {
      vec2 hd = normalize(d.xz + 0.0001), hs = normalize(${glv(SUN_DIR)}.xz);
      return mix(${glv(SKY.away)}, ${glv(SKY.toward)}, pow(max(dot(hd, hs) * 0.5 + 0.5, 0.0), 2.2));
    }
    vec3 hazeGlow(vec3 d) {
      float s = max(dot(d, ${glv(SUN_DIR)}), 0.0);
      return ${glv(SKY.sun)} * (pow(s, 5.0) * 0.5 + pow(s, 48.0) * 0.8 * smoothstep(-0.2, 0.08, d.y));
    }
    vec3 worldHaze(vec3 d) { return hazeBase(d) + hazeGlow(d); }
    vec3 fogHaze(vec3 d) { return hazeBase(d) * ${FOG_K} + hazeGlow(d) * ${FOG_GLOW}; }`;

  // Niebla atmosférica: más densa en el fondo del valle que en las cumbres, y
  // del color de la bruma en esa dirección. Se mezcla antes del ajuste de tono,
  // en luz lineal, exactamente como el cielo, para que a lo lejos todo acabe
  // siendo "cielo bajo el horizonte". Sustituye a la niebla estándar en todos
  // los materiales.
  // vFogDir: de la cámara al punto, en ejes del mundo (sin traslación).
  T.ShaderChunk.fog_pars_vertex = '#ifdef USE_FOG\n varying vec3 vFogDir;\n#endif';
  T.ShaderChunk.fog_vertex = '#ifdef USE_FOG\n vFogDir = vec3(dot(viewMatrix[0].xyz, mvPosition.xyz), dot(viewMatrix[1].xyz, mvPosition.xyz), dot(viewMatrix[2].xyz, mvPosition.xyz));\n#endif';
  T.ShaderChunk.fog_pars_fragment = '#ifdef USE_FOG\n uniform float fogDensity;\n varying vec3 vFogDir;\n' + HAZE_GLSL + '\n#endif';
  T.ShaderChunk.tonemapping_fragment = [
    '#ifdef USE_FOG',
    ' float fDist = length(vFogDir);',
    ' float fK = 0.3 + 0.7 * exp(-max(cameraPosition.y + vFogDir.y, 0.0) / 110.0);',
    ' float fogFactor = 1.0 - exp(-fogDensity * fogDensity * fDist * fDist * fK);',
    ' gl_FragColor.rgb = mix(gl_FragColor.rgb, fogHaze(vFogDir / max(fDist, 0.0001)), fogFactor);',
    '#endif',
    T.ShaderChunk.tonemapping_fragment,
  ].join('\n');
  T.ShaderChunk.fog_fragment = '';

  // =========================================================
  //  UTILIDADES
  // =========================================================
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const easeInOut = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const V = (x, y, z) => new T.Vector3(x, y, z);

  // Azar con semilla: el valle es siempre el mismo.
  let seed = 20260927;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const rrange = (a, b) => a + (b - a) * rnd();

  // Ruido simplex 2D (algoritmo de Stefan Gustavson, dominio público).
  const perm = new Uint8Array(512);
  (function () {
    const p = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  })();
  const GRAD = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
  const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
  function corner(h, x, y) {
    let t = 0.5 - x * x - y * y;
    if (t < 0) return 0;
    const g = GRAD[h & 7]; t *= t;
    return t * t * (g[0] * x + g[1] * y);
  }
  function simplex(x, y) {
    const s = (x + y) * F2, i = Math.floor(x + s), j = Math.floor(y + s);
    const t = (i + j) * G2, x0 = x - i + t, y0 = y - j + t;
    const i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    return 70 * (corner(perm[ii + perm[jj]], x0, y0) + corner(perm[ii + i1 + perm[jj + j1]], x1, y1) + corner(perm[ii + 1 + perm[jj + 1]], x2, y2));
  }
  function fbm(x, y, oct) {
    let a = 0.5, f = 1, s = 0, n = 0;
    for (let o = 0; o < oct; o++) { s += a * simplex(x * f, y * f); n += a; a *= 0.5; f *= 2.03; }
    return s / n;
  }
  function ridged(x, y) {
    let a = 0.5, f = 1, s = 0, n = 0;
    for (let o = 0; o < 4; o++) { const r = 1 - Math.abs(simplex(x * f, y * f)); s += a * r * r; n += a; a *= 0.5; f *= 2.1; }
    return s / n;
  }

  // =========================================================
  //  EL TERRENO
  // =========================================================
  // El cauce del río (de norte a sur). El terreno se hunde bajo el agua a lo
  // largo de esta línea y sube hacia los acantilados.
  const RIVER = [[0, -300], [8, -250], [2, -200], [-12, -150], [-30, -95], [-40, -30], [-18, 35], [12, 95], [14, 160], [2, 225], [-6, 290], [0, 350], [0, 460]];
  function riverDist(x, z) {
    let best = 1e9;
    for (let k = 0; k < RIVER.length - 1; k++) {
      const [ax, az] = RIVER[k], [bx, bz] = RIVER[k + 1];
      const dx = bx - ax, dz = bz - az, len2 = dx * dx + dz * dz;
      const t = clamp(((x - ax) * dx + (z - az) * dz) / len2, 0, 1);
      const px = ax + dx * t - x, pz = az + dz * t - z;
      best = Math.min(best, px * px + pz * pz);
    }
    return Math.sqrt(best);
  }
  function riverX(z) { // x del cauce a una z dada
    for (let k = 0; k < RIVER.length - 1; k++) {
      const [ax, az] = RIVER[k], [bx, bz] = RIVER[k + 1];
      if (z >= az && z <= bz) return lerp(ax, bx, (z - az) / (bz - az));
    }
    return 0;
  }

  function baseHeight(x, z) {
    const d = riverDist(x, z);
    let h = -8 + 10.5 * sstep(4, 20, d) + 20 * sstep(18, 140, d) + 64 * sstep(160, 420, d);
    // Lago bajo el cubo flotante
    const dl = Math.hypot(x + 40, z + 30);
    h -= 28 * (1 - sstep(38, 92, dl));
    // Relieve: suave en el valle, crestas en las montañas
    h += fbm(x * 0.0065, z * 0.0065, 5) * 13 * sstep(24, 70, d);
    h += ridged(x * 0.0032 + 7.1, z * 0.0032 - 3.3) * 70 * sstep(130, 380, d);
    // Acantilado norte, donde nace el río
    h += 105 * sstep(-285, -345, z) * (1 - 0.35 * sstep(40, 160, Math.abs(x)));
    // El mar del sur
    h = lerp(h, -14, sstep(335, 430, z));
    return h;
  }

  // Explanadas bajo cada construcción (x, z, radio, transición).
  const PADS = [
    { id: 'inicio', x: 150, z: -262, r: 18, b: 26 },
    { id: 'obs', x: 58, z: 128, r: 17, b: 26 },
    { id: 't1', x: -168, z: -128, r: 15, b: 20 },
    { id: 't2', x: -190, z: -62, r: 15, b: 20 },
    { id: 't3', x: -172, z: 4, r: 15, b: 20 },
    { id: 't4', x: -140, z: 62, r: 15, b: 20 },
    { id: 'caso1', x: 168, z: -58, r: 38, b: 30 },
    { id: 'caso2', x: 150, z: 58, r: 42, b: 30 },
    { id: 'certificaciones', x: 108, z: 258, r: 48, b: 30 },
    { id: 'metodo', x: -96, z: 276, r: 28, b: 24 },
    { id: 'faro', x: 78, z: 382, r: 22, b: 30, h: 36 },
  ];
  PADS.forEach(p => { if (p.h === undefined) p.h = Math.max(4, baseHeight(p.x, p.z)); });
  // La escalinata de la trayectoria sube de A a B (sin explanada: sigue la ladera).
  const STAIR_A = [-150, 150], STAIR_B = [-222, 218];
  const pad = (id) => PADS.find(p => p.id === id);

  function height(x, z) {
    let h = baseHeight(x, z);
    for (const p of PADS) {
      const d = Math.hypot(x - p.x, z - p.z);
      if (d < p.r + p.b) h = lerp(h, p.h, 1 - sstep(p.r, p.r + p.b, d));
    }
    return h;
  }

  // =========================================================
  //  ESCENA, CÁMARA Y LUZ
  // =========================================================
  const canvas = $('world');
  const renderer = new T.WebGLRenderer({ canvas, antialias: !LITE, powerPreference: 'high-performance', preserveDrawingBuffer: CAPTURE });
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  const SHADOWS = !LITE;
  renderer.shadowMap.enabled = SHADOWS;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  let pixelRatio = Math.min(window.devicePixelRatio || 1, LITE ? 1.25 : 1.75);
  renderer.setPixelRatio(pixelRatio);

  const scene = new T.Scene();
  // Solo cuenta la densidad: el color lo pone worldHaze().
  scene.fog = new T.FogExp2(SKY.away, 0.0023);
  const camera = new T.PerspectiveCamera(55, 1, 0.5, 4000);

  const sun = new T.DirectionalLight(0xffc98c, 3.1);
  sun.position.copy(SUN_DIR).multiplyScalar(600).add(V(0, 0, 40));
  sun.target.position.set(0, 0, 40);
  scene.add(sun, sun.target);
  if (SHADOWS) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -470; sc.right = 470; sc.top = 470; sc.bottom = -470; sc.near = 50; sc.far = 1400;
    sun.shadow.bias = -0.0008;
    sun.shadow.normalBias = 1.6;
  }
  scene.add(new T.HemisphereLight(0x9097cc, 0x4a3626, 0.9));

  // ---- CIELO ----
  const skyMat = new T.ShaderMaterial({
    side: T.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }`,
    fragmentShader: `
      varying vec3 vDir;
      ${HAZE_GLSL}
      float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      void main() {
        vec3 d = normalize(vDir);
        float e = d.y;
        vec3 haze = worldHaze(d);
        // Bajo el horizonte, la misma bruma que la niebla; hacia arriba, de la
        // bruma al violeta y al azul noche.
        vec3 col = mix(fogHaze(d), haze, smoothstep(-0.06, 0.01, e));
        col = mix(col, ${glv(SKY.upper)} + max(haze - ${glv(SKY.away)}, 0.0) * 0.5, smoothstep(-0.02, 0.3, e));
        col = mix(col, ${glv(SKY.zenith)}, smoothstep(0.28, 0.9, e));
        float s = max(dot(d, ${glv(SUN_DIR)}), 0.0);
        col += ${glv(SKY.sun)} * smoothstep(0.99955, 0.9998, s) * 3.0;
        float st = hash(floor(d * 420.0));
        col += vec3(1.0, 0.94, 0.82) * step(0.9978, st) * smoothstep(0.3, 0.75, e) * 0.9;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <encodings_fragment>
      }`,
  });
  const sky = new T.Mesh(new T.SphereGeometry(3000, 48, 24), skyMat);
  sky.renderOrder = -1;
  sky.frustumCulled = false;
  scene.add(sky);

  // El mismo cielo ilumina y se refleja en los materiales (sin él, el oro
  // metálico se vería negro).
  (function () {
    const envScene = new T.Scene();
    envScene.add(new T.Mesh(new T.SphereGeometry(100, 48, 24), skyMat));
    const pmrem = new T.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(envScene, 0.03, 0.1, 500).texture;
    pmrem.dispose();
  })();

  // ---- MATERIALES ----
  const std = (o) => new T.MeshStandardMaterial(o);
  const MAT = {
    terrain: std({ vertexColors: true, flatShading: true, roughness: 0.96, envMapIntensity: 0.55 }),
    stone: std({ color: 0xb3a288, roughness: 0.86, envMapIntensity: 0.7 }),
    stoneLight: std({ color: 0xd9ccb3, roughness: 0.8, envMapIntensity: 0.7 }),
    stoneDark: std({ color: 0x2d2824, roughness: 0.9, envMapIntensity: 0.6 }),
    gold: std({ color: 0xd4a017, metalness: 1, roughness: 0.3, envMapIntensity: 1.5 }),
    copper: std({ color: 0xb8683c, metalness: 1, roughness: 0.34, envMapIntensity: 1.3 }),
    glow: new T.MeshBasicMaterial({ color: 0xffe0a0, toneMapped: false }),
    glowSoft: new T.MeshBasicMaterial({ color: 0xffc766, toneMapped: false, transparent: true, opacity: 0.5, blending: T.AdditiveBlending, depthWrite: false }),
  };

  // Brillo falso ("bloom") con sprites aditivos: barato y muy eficaz.
  const glowTex = (function () {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.18, 'rgba(255,255,255,0.55)');
    gr.addColorStop(0.5, 'rgba(255,255,255,0.12)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t;
  })();
  function glow(parent, x, y, z, size, color, opacity) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color, transparent: true, opacity: opacity ?? 0.8, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
    s.position.set(x, y, z); s.scale.setScalar(size);
    parent.add(s);
    return s;
  }

  const UNIT = new T.BoxGeometry(1, 1, 1);
  function block(parent, mat, w, h, d, x, y, z, ry) {
    const m = new T.Mesh(UNIT, mat);
    m.scale.set(w, h, d); m.position.set(x, y, z);
    if (ry) m.rotation.y = ry;
    m.castShadow = m.receiveShadow = SHADOWS;
    parent.add(m);
    return m;
  }
  function mesh(parent, geo, mat, x, y, z) {
    const m = new T.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = SHADOWS;
    parent.add(m);
    return m;
  }
  // Muchas piezas iguales en una sola llamada de dibujo.
  function instanced(parent, geo, mat, items, withColor) {
    const im = new T.InstancedMesh(geo, mat, items.length);
    const o = new T.Object3D(), col = new T.Color();
    items.forEach((it, i) => {
      o.position.set(it.p[0], it.p[1], it.p[2]);
      o.rotation.set(it.rx || 0, it.ry || 0, it.rz || 0);
      o.scale.set(it.s[0], it.s[1], it.s[2]);
      o.updateMatrix();
      im.setMatrixAt(i, o.matrix);
      if (withColor) im.setColorAt(i, col.set(it.c));
    });
    im.instanceMatrix.needsUpdate = true;
    if (withColor) im.instanceColor.needsUpdate = true;
    im.castShadow = im.receiveShadow = SHADOWS;
    parent.add(im);
    return im;
  }

  // Lo que se anima cada fotograma: funciones (t, dt).
  const animated = [];

  // =========================================================
  //  PAISAJE
  // =========================================================
  (function buildTerrain() {
    const SIZE = 1700, SEG = LITE ? 220 : 300;
    const geo = new T.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    // Más allá de ±700 las celdas crecen hasta ±3000: el borde del mundo queda
    // siempre dentro de la bruma, se mire desde donde se mire.
    const warp = (v) => { const t = Math.max(0, (Math.abs(v) - 700) / 150); return v + Math.sign(v) * 2150 * t * t * t; };
    for (let i = 0; i < pos.count; i++) {
      const x = warp(pos.getX(i)), z = warp(pos.getZ(i));
      pos.setXYZ(i, x, height(x, z), z);
    }
    geo.computeVertexNormals();
    const nor = geo.attributes.normal, colors = new Float32Array(pos.count * 3);
    const cWet = new T.Color(0x453c2b), cGrass = new T.Color(0x5b5a35), cMoss = new T.Color(0x726a3e);
    const cRock = new T.Color(0x806b56), cRockHi = new T.Color(0xb49c78), cSand = new T.Color(0xae9464), c = new T.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const slope = 1 - nor.getY(i);
      const n = fbm(x * 0.02, z * 0.02, 3);
      c.copy(cGrass).lerp(cMoss, clamp(0.5 + n, 0, 1));
      c.lerp(cWet, sstep(6, -2, y));
      c.lerp(cSand, sstep(-2, 0.5, y) * sstep(4.5, 2, y));
      c.lerp(cRock, sstep(0.22, 0.42, slope));
      c.lerp(cRockHi, sstep(60, 140, y) * 0.8);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(colors, 3));
    const m = new T.Mesh(geo, MAT.terrain);
    m.receiveShadow = SHADOWS;
    scene.add(m);
  })();

  // Agua: un solo plano; aparece allí donde el terreno queda por debajo.
  (function buildWater() {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'), img = g.createImageData(256, 256);
    // Mapa de normales de ondas: ruido periódico (se repite sin costuras),
    // irregular para que no se vean franjas.
    const P = 16, grid = Array.from({ length: P * P }, () => rnd());
    const vn = (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      const g = (i, j) => grid[((j % P + P) % P) * P + ((i % P + P) % P)];
      const sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf);
      return lerp(lerp(g(xi, yi), g(xi + 1, yi), sx), lerp(g(xi, yi + 1), g(xi + 1, yi + 1), sx), sy);
    };
    const hgt = (u, v) => vn(u * P, v * P) * 0.6 + vn(u * P * 2 + 3.1, v * P * 2 + 1.7) * 0.3 + vn(u * P * 4 + 5.3, v * P * 4 + 2.9) * 0.1;
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      const u = x / 256, v = y / 256, e = 1 / 256;
      const dx = (hgt(u + e, v) - hgt(u - e, v)) * 9, dy = (hgt(u, v + e) - hgt(u, v - e)) * 9;
      const n = V(-dx, -dy, 1).normalize(), k = (y * 256 + x) * 4;
      img.data[k] = (n.x * 0.5 + 0.5) * 255; img.data[k + 1] = (n.y * 0.5 + 0.5) * 255; img.data[k + 2] = (n.z * 0.5 + 0.5) * 255; img.data[k + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const nt = new T.CanvasTexture(c);
    nt.wrapS = nt.wrapT = T.RepeatWrapping; nt.repeat.set(260, 260);
    const mat = std({ color: 0x10202a, metalness: 0.65, roughness: 0.22, normalMap: nt, normalScale: new T.Vector2(0.35, 0.35), envMapIntensity: 1.15 });
    const water = new T.Mesh(new T.PlaneGeometry(7000, 7000), mat);
    water.rotation.x = -Math.PI / 2; water.position.y = -0.3;
    water.receiveShadow = SHADOWS;
    scene.add(water);
    animated.push((t) => { nt.offset.set(t * 0.004, t * 0.0025); });
  })();

  // Bosques y rocas, repartidos con reglas: ni en el agua, ni en pendientes
  // fuertes, ni encima de ninguna construcción.
  (function buildNature() {
    const canopy = [], trunks = [], rocks = [];
    const greens = [0x1f2a1c, 0x28331f, 0x303a24, 0x3a3f26];
    const nTrees = LITE ? 900 : 1900;
    let tries = 0;
    while (canopy.length < nTrees && tries++ < 40000) {
      const x = rrange(-640, 640), z = rrange(-560, 420);
      const h = height(x, z);
      if (h < 2.5 || h > 95) continue;
      if (riverDist(x, z) < 22) continue;
      if (PADS.some(p => Math.hypot(x - p.x, z - p.z) < p.r + 14)) continue;
      if (fbm(x * 0.012 + 40, z * 0.012, 3) < -0.05) continue; // claros entre bosques
      const e = 0.8, sl = Math.abs(height(x + e, z) - height(x - e, z)) + Math.abs(height(x, z + e) - height(x, z - e));
      if (sl > 1.6) continue;
      const s = rrange(0.75, 1.45), ch = 9 * s, cr = 2.7 * s * rrange(0.85, 1.15);
      canopy.push({ p: [x, h + 2.4 * s + ch / 2, z], s: [cr, ch, cr], ry: rrange(0, 6.28), c: greens[Math.floor(rnd() * greens.length)] });
      trunks.push({ p: [x, h + 1.3 * s, z], s: [0.5 * s, 2.8 * s, 0.5 * s] });
    }
    tries = 0;
    while (rocks.length < (LITE ? 160 : 340) && tries++ < 20000) {
      const x = rrange(-600, 600), z = rrange(-560, 420);
      const h = height(x, z);
      if (h < 0.5) continue;
      if (PADS.some(p => Math.hypot(x - p.x, z - p.z) < p.r + 6)) continue;
      const s = rrange(1.2, 6.5);
      rocks.push({ p: [x, h + s * 0.25, z], s: [s * rrange(0.8, 1.6), s * rrange(0.5, 1.1), s], ry: rrange(0, 6.28), rx: rrange(-0.3, 0.3) });
    }
    // Nada dentro de la escalinata (se quita al final para no alterar el azar
    // con semilla: el resto del valle queda exactamente igual).
    const [ax, az] = STAIR_A, [bx, bz] = STAIR_B, ul = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / ul, uz = (bz - az) / ul;
    const clear = (it) => {
      const t = clamp((it.p[0] - ax) * ux + (it.p[2] - az) * uz, -22, ul + 12);
      return Math.hypot(it.p[0] - (ax + ux * t), it.p[2] - (az + uz * t)) > 26;
    };
    const keep = canopy.map(clear);
    instanced(scene, new T.ConeGeometry(1, 1, 6), std({ roughness: 0.9, flatShading: true, envMapIntensity: 0.5 }), canopy.filter((_, i) => keep[i]), true);
    instanced(scene, new T.CylinderGeometry(0.5, 0.7, 1, 5), std({ color: 0x3a2a1e, roughness: 0.95 }), trunks.filter((_, i) => keep[i]));
    instanced(scene, new T.IcosahedronGeometry(1, 0), std({ color: 0x7b6a56, roughness: 0.92, flatShading: true, envMapIntensity: 0.6 }), rocks.filter(clear));
  })();

  // Losas gigantes que flotan sobre el valle: el toque surrealista.
  (function buildFloaters() {
    // Sobre las cumbres, lejos de los lugares: se ven en la bruma, sin tapar nada.
    const spots = [[-430, 250, -300], [430, 285, -330], [-540, 240, 60], [520, 265, 130], [-400, 300, 430], [330, 270, 560]];
    spots.forEach(([x, y, z], i) => {
      const g = new T.Group();
      g.position.set(x, y, z);
      g.rotation.z = (i % 2 ? 1 : -1) * rrange(0.04, 0.12);
      block(g, MAT.stoneDark, rrange(14, 22), rrange(60, 90), rrange(5, 8), 0, 0, 0);
      block(g, MAT.gold, 0.8, 26, 8.6, 0, -10, 0);
      scene.add(g);
      const r0 = rrange(0, 6.28), sp = rrange(0.015, 0.035) * (i % 2 ? 1 : -1);
      animated.push((t) => { g.rotation.y = r0 + t * sp; g.position.y = y + Math.sin(t * 0.25 + i) * 3; });
    });
  })();

  // Polvo dorado suspendido en el aire, siempre alrededor de la cámara.
  const dust = (function () {
    const N = LITE ? 500 : 1100, R = 170;
    const geo = new T.BufferGeometry(), arr = new Float32Array(N * 3), base = new Float32Array(N * 3);
    for (let i = 0; i < N * 3; i++) base[i] = rrange(-R, R);
    geo.setAttribute('position', new T.BufferAttribute(arr, 3));
    const pts = new T.Points(geo, new T.PointsMaterial({ size: 1.1, map: glowTex, color: 0xffd08a, transparent: true, opacity: 0.55, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
    pts.frustumCulled = false;
    scene.add(pts);
    return { N, R, base, geo, arr };
  })();

  // =========================================================
  //  EL RÍO DE LUZ: del dato de origen a la decisión
  // =========================================================
  const SPRING = V(0, 12, -300);
  const AQ_A = V(30, 0, -212), AQ_B = V(-26, 0, -86);   // extremos del acueducto
  const AQ_TOP = 36;
  const CUBE = V(-40, 52, -30);
  const OBS = V(pad('obs').x, pad('obs').h, pad('obs').z);

  (function buildDataFlow() {
    const g = new T.Group(); scene.add(g);

    // Manantial: un portal monumental en el acantilado norte
    const px = SPRING.x, pz = SPRING.z - 8, ph = Math.max(height(px, pz), 2);
    block(g, MAT.stoneDark, 12, 64, 14, px - 22, ph + 30, pz);
    block(g, MAT.stoneDark, 12, 64, 14, px + 22, ph + 30, pz);
    block(g, MAT.stoneDark, 60, 12, 16, px, ph + 66, pz);
    block(g, MAT.gold, 62, 1.2, 16.4, px, ph + 59.4, pz);
    const portal = block(g, MAT.glow, 32, 56, 1, px, ph + 28, pz + 2);
    portal.castShadow = false;
    glow(g, px, ph + 26, pz + 8, 90, 0xffc870, 0.55);

    // Acueducto: arcos sobre el valle con un canal de luz encima
    const dir = AQ_B.clone().sub(AQ_A), len = dir.length(), ry = Math.atan2(dir.x, dir.z);
    const n = 12, pillars = [];
    for (let i = 0; i <= n; i++) {
      const p = AQ_A.clone().lerp(AQ_B, i / n), base = Math.min(height(p.x, p.z), 0) - 6, top = AQ_TOP;
      pillars.push({ p: [p.x, (base + top) / 2, p.z], s: [4.5, top - base, 6], ry });
      if (i < n) {
        const q = AQ_A.clone().lerp(AQ_B, (i + 0.5) / n);
        pillars.push({ p: [q.x, top - 3, q.z], s: [4.5, 4, len / n], ry });
      }
    }
    instanced(g, UNIT, MAT.stone, pillars);
    const mid = AQ_A.clone().lerp(AQ_B, 0.5);
    block(g, MAT.stoneLight, 6.5, 2.4, len + 6, mid.x, AQ_TOP + 1.2, mid.z, ry);
    // Tres esclusas: ODI, Data Exchange y EPM Automate
    [0.22, 0.5, 0.78].forEach((f) => {
      const p = AQ_A.clone().lerp(AQ_B, f), b = Math.min(height(p.x, p.z), 0) - 4;
      const side = V(Math.cos(ry), 0, -Math.sin(ry)).multiplyScalar(8);
      block(g, MAT.stoneDark, 5, 88 - b, 5, p.x + side.x, (b + 88) / 2, p.z + side.z, ry);
      mesh(g, new T.ConeGeometry(4.2, 12, 4), MAT.gold, p.x + side.x, 94, p.z + side.z).rotation.y = ry + Math.PI / 4;
      glow(g, p.x + side.x, 100, p.z + side.z, 26, 0xffcf7a, 0.7);
    });

    // El cubo flotante: Oracle EPM Cloud (cubos, dimensiones, jerarquías)
    const cube = new T.Group(); cube.position.copy(CUBE); g.add(cube);
    const S = 34, h = S / 2, edges = [];
    for (const a of [-h, h]) for (const b of [-h, h]) {
      edges.push({ p: [0, a, b], s: [S + 2, 2, 2] }, { p: [a, 0, b], s: [2, S + 2, 2] }, { p: [a, b, 0], s: [2, 2, S + 2] });
    }
    instanced(cube, UNIT, MAT.gold, edges);
    const cells = [], lit = [];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) {
      const p = [(i - 1.5) * 7.4, (j - 1.5) * 7.4, (k - 1.5) * 7.4];
      (rnd() < 0.28 ? lit : cells).push({ p, s: [4.6, 4.6, 4.6] });
    }
    instanced(cube, UNIT, MAT.stoneDark, cells);
    instanced(cube, UNIT, MAT.glow, lit).castShadow = false;
    glow(cube, 0, 0, 0, 70, 0xffc466, 0.45);
    // Haz de luz entre el lago y el cubo
    const beam = new T.Mesh(new T.CylinderGeometry(2.6, 5, CUBE.y - h, 20, 1, true), MAT.glowSoft);
    beam.position.set(CUBE.x, (CUBE.y - h) / 2, CUBE.z);
    g.add(beam);
    animated.push((t) => { cube.rotation.y = t * 0.06; cube.position.y = CUBE.y + Math.sin(t * 0.4) * 1.5; });

    // El observatorio: forecast y reporting, donde el dato se convierte en decisión
    const obs = new T.Group(); obs.position.copy(OBS); g.add(obs);
    const tiers = [[7.5, 18], [6.2, 16], [5, 14], [4, 10]];
    let y = 0;
    tiers.forEach(([r, hh], i) => { mesh(obs, new T.CylinderGeometry(r * 0.92, r, hh, 20), i % 2 ? MAT.stoneLight : MAT.stone, 0, y + hh / 2, 0); y += hh; mesh(obs, new T.CylinderGeometry(r + 0.4, r + 0.4, 0.8, 20), MAT.gold, 0, y, 0); });
    const ring = new T.Mesh(new T.TorusGeometry(15, 0.9, 10, 64), MAT.gold);
    ring.position.y = y + 10; ring.castShadow = SHADOWS; obs.add(ring);
    const ring2 = new T.Mesh(new T.TorusGeometry(10.5, 0.6, 10, 48), MAT.gold);
    ring2.position.y = y + 10; ring2.castShadow = SHADOWS; obs.add(ring2);
    const lens = mesh(obs, new T.SphereGeometry(3.2, 20, 16), MAT.glow, 0, y + 10, 0); lens.castShadow = false;
    glow(obs, 0, y + 10, 0, 46, 0xffd27a, 0.8);
    const scope = mesh(obs, new T.CylinderGeometry(1.8, 2.6, 22, 12), MAT.stoneDark, -6, y + 4, 4);
    scope.rotation.set(0.9, 0, 0.6);
    const OBS_TOP = y + 10;
    animated.push((t) => { ring.rotation.set(1.1 + Math.sin(t * 0.2) * 0.2, t * 0.3, 0); ring2.rotation.set(t * 0.4, 0.5, 0.9); });

    // La corriente de luz que lo une todo
    const lakeIn = V(CUBE.x + 8, 1.2, CUBE.z - 26);
    const pts = [
      V(SPRING.x, ph + 16, pz + 3), V(SPRING.x, 1.2, pz + 26), V(6, 1.2, -252),
      AQ_A.clone().setY(1.2).lerp(V(6, 1.2, -252), 0.35), V(AQ_A.x, AQ_TOP + 4, AQ_A.z),
      AQ_A.clone().lerp(AQ_B, 0.5).setY(AQ_TOP + 4), V(AQ_B.x, AQ_TOP + 4, AQ_B.z),
      V(AQ_B.x - 4, 14, AQ_B.z + 10), lakeIn, V(CUBE.x, CUBE.y - 18, CUBE.z),
      V(CUBE.x, CUBE.y, CUBE.z), V(CUBE.x + 18, CUBE.y - 4, CUBE.z + 22), V(-8, 1.4, 48),
      V(10, 1.4, 90), V(OBS.x - 22, OBS.y + 4, OBS.z - 12),
    ];
    // Espiral alrededor de la torre hasta el anillo del observatorio
    for (let k = 1; k <= 14; k++) {
      const a = -1.2 + k * 0.62, rr = 13 - k * 0.45;
      pts.push(V(OBS.x + Math.cos(a) * rr, OBS.y + 4 + k * (OBS_TOP - 8) / 14, OBS.z + Math.sin(a) * rr));
    }
    pts.push(V(OBS.x, OBS.y + OBS_TOP, OBS.z));
    const curve = new T.CatmullRomCurve3(pts, false, 'catmullrom', 0.35);
    const flowTex = (function () {
      const c = document.createElement('canvas'); c.width = 512; c.height = 8;
      const gg = c.getContext('2d'), gr = gg.createLinearGradient(0, 0, 512, 0);
      for (let i = 0; i <= 8; i++) { const o = i / 8; gr.addColorStop(o, i % 2 ? 'rgba(255,236,190,1)' : 'rgba(255,190,90,0.35)'); }
      gg.fillStyle = gr; gg.fillRect(0, 0, 512, 8);
      const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(18, 1); t.encoding = T.sRGBEncoding; return t;
    })();
    const core = new T.Mesh(new T.TubeGeometry(curve, 900, 0.75, 8, false), new T.MeshBasicMaterial({ map: flowTex, color: 0xffe2a8, toneMapped: false }));
    const halo = new T.Mesh(new T.TubeGeometry(curve, 450, 2.4, 8, false), new T.MeshBasicMaterial({ color: 0xffb54a, transparent: true, opacity: 0.22, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
    g.add(core, halo);
    // Paquetes de datos que viajan por la corriente
    const NP = LITE ? 60 : 120, pg = new T.BufferGeometry(), parr = new Float32Array(NP * 3), phase = Array.from({ length: NP }, () => rnd());
    pg.setAttribute('position', new T.BufferAttribute(parr, 3));
    const packets = new T.Points(pg, new T.PointsMaterial({ size: 5, map: glowTex, color: 0xfff0c8, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
    packets.frustumCulled = false; g.add(packets);
    const tmp = V(0, 0, 0);
    animated.push((t) => {
      flowTex.offset.x = -t * 0.35;
      for (let i = 0; i < NP; i++) {
        curve.getPointAt((phase[i] + t * 0.018) % 1, tmp);
        parr[i * 3] = tmp.x; parr[i * 3 + 1] = tmp.y; parr[i * 3 + 2] = tmp.z;
      }
      pg.attributes.position.needsUpdate = true;
    });
  })();

  // =========================================================
  //  LOS LUGARES
  // =========================================================
  // El monolito del mirador lleva tu nombre, con las tipografías de la web.
  function nameTexture() {
    const c = document.createElement('canvas'); c.width = 512; c.height = 1900;
    const g = c.getContext('2d');
    g.fillStyle = '#17140f'; g.fillRect(0, 0, 512, 1900);
    for (let i = 0; i < 2200; i++) { g.fillStyle = `rgba(255,240,210,${Math.random() * 0.035})`; g.fillRect(Math.random() * 512, Math.random() * 1900, 2, 2); }
    g.strokeStyle = '#d4a017'; g.lineWidth = 4; g.strokeRect(28, 28, 456, 1844);
    g.textAlign = 'center';
    g.fillStyle = '#f0ede8'; g.font = '400 132px "Instrument Serif", Georgia, serif';
    g.fillText('Daniel', 256, 800);
    g.fillStyle = '#e8b820'; g.font = 'italic 400 132px "Instrument Serif", Georgia, serif';
    g.fillText('Navarro', 256, 930);
    g.fillStyle = '#f0ede8'; g.font = '400 132px "Instrument Serif", Georgia, serif';
    g.fillText('Delgado', 256, 1060);
    g.fillStyle = '#d4a017'; g.font = '500 25px "JetBrains Mono", monospace';
    g.fillText('FINANCE & TECHNOLOGY', 256, 1170);
    g.fillText('CONSULTANT', 256, 1210);
    g.fillRect(226, 1260, 60, 2);
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t;
  }
  function plateTexture(label) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#1b1814'; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#d4a017'; g.lineWidth = 6; g.strokeRect(14, 14, 228, 228);
    g.fillStyle = '#e8b820'; g.font = '500 96px "JetBrains Mono", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(label, 128, 134);
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t;
  }

  let monolithMat = null;
  function buildPlaces() {
    // --- Inicio: el mirador ---
    {
      const p = pad('inicio'), g = new T.Group(); g.position.set(p.x, p.h, p.z); scene.add(g);
      mesh(g, new T.CylinderGeometry(16, 17.5, 3, 40), MAT.stone, 0, 1.5, 0);
      mesh(g, new T.TorusGeometry(15.2, 0.35, 8, 64), MAT.gold, 0, 3.1, 0).rotation.x = Math.PI / 2;
      const nameTex = nameTexture();
      // El nombre brilla un poco por sí mismo: la cara queda a contraluz del sol.
      monolithMat = std({ map: nameTex, emissive: 0xffffff, emissiveMap: nameTex, emissiveIntensity: 0.6, roughness: 0.6, metalness: 0.1 });
      const side = MAT.stoneDark;
      const mono = new T.Mesh(UNIT, [side, side, side, side, side, monolithMat]);
      // La cara con el nombre (−z) mira hacia la cámara del mirador.
      mono.scale.set(7, 26, 1.6); mono.position.set(0, 20, 0);
      mono.rotation.y = Math.atan2(-(SHOTS.inicio.cam[0] - p.x), -(SHOTS.inicio.cam[2] - p.z));
      mono.castShadow = SHADOWS; g.add(mono);
      glow(g, 0, 20, -3, 40, 0xffcf7a, 0.25);
      animated.push((t) => { mono.position.y = 20 + Math.sin(t * 0.6) * 0.6; });
    }

    // --- Capacidades: cuatro torres extrañas ---
    {
      // T1 · Entender: una pila de losas que gira como un libro de cuentas
      const p1 = pad('t1'), g1 = new T.Group(); g1.position.set(p1.x, p1.h, p1.z); scene.add(g1);
      const slabs = [];
      for (let i = 0; i < 38; i++) slabs.push({ p: [0, 2 + i * 2.3, 0], s: [15 - i * 0.12, 1.7, 7.5 - i * 0.05], ry: i * 0.13 });
      instanced(g1, UNIT, MAT.stoneLight, slabs.filter((_, i) => i % 7));
      instanced(g1, UNIT, MAT.gold, slabs.filter((_, i) => !(i % 7)));
      // T2 · Modelar: cubos dimensionales apilados, cada vez más pequeños
      const p2 = pad('t2'), g2 = new T.Group(); g2.position.set(p2.x, p2.h, p2.z); scene.add(g2);
      let y = 0;
      for (let i = 0; i < 7; i++) {
        const s = 13 - i * 1.2, e = [], hh = s / 2;
        for (const a of [-hh, hh]) for (const b of [-hh, hh]) e.push({ p: [0, a, b], s: [s + 1, 1, 1] }, { p: [a, 0, b], s: [1, s + 1, 1] }, { p: [a, b, 0], s: [1, 1, s + 1] });
        const lvl = new T.Group(); lvl.position.y = y + hh; lvl.rotation.y = i * 0.35; g2.add(lvl);
        instanced(lvl, UNIT, i % 2 ? MAT.stone : MAT.gold, e);
        if (i % 2 === 0) { const c = block(lvl, MAT.glow, s * 0.32, s * 0.32, s * 0.32, 0, 0, 0); c.castShadow = false; }
        y += s + 1.2;
      }
      // T3 · Construir: bloques en voladizo, audaces
      const p3 = pad('t3'), g3 = new T.Group(); g3.position.set(p3.x, p3.h, p3.z); scene.add(g3);
      for (let i = 0; i < 10; i++) {
        const off = (i % 2 ? 1 : -1) * (3 + (i % 3) * 1.6);
        block(g3, i === 9 ? MAT.gold : (i % 3 ? MAT.stone : MAT.stoneDark), 17, 6.5, 8, i % 2 ? off : 0, 3.3 + i * 7, i % 2 ? 0 : off, i % 2 ? Math.PI / 2 : 0);
      }
      block(g3, MAT.stoneDark, 5, 70, 5, 0, 35, 0);
      // T4 · Explicar: una torre con rampa en espiral y un libro abierto arriba
      const p4 = pad('t4'), g4 = new T.Group(); g4.position.set(p4.x, p4.h, p4.z); scene.add(g4);
      mesh(g4, new T.CylinderGeometry(2.6, 3.6, 72, 16), MAT.stoneLight, 0, 36, 0);
      const steps = [];
      for (let i = 0; i < 64; i++) { const a = i * 0.36; steps.push({ p: [Math.cos(a) * 6.2, 2 + i * 1.05, Math.sin(a) * 6.2], s: [4.2, 0.8, 2.2], ry: -a }); }
      instanced(g4, UNIT, MAT.stone, steps);
      const book = new T.Group(); book.position.y = 76; g4.add(book);
      block(book, MAT.stoneLight, 12, 0.9, 16, -6.2, 2.6, 0).rotation.z = 0.42;
      block(book, MAT.stoneLight, 12, 0.9, 16, 6.2, 2.6, 0).rotation.z = -0.42;
      block(book, MAT.gold, 0.8, 1.4, 16.6, 0, 0.2, 0);
      glow(book, 0, 5, 0, 30, 0xffd27a, 0.6);
    }

    // --- Caso 01: nueve agujas y un radar ---
    {
      const p = pad('caso1'), g = new T.Group(); g.position.set(p.x, p.h, p.z); scene.add(g);
      mesh(g, new T.CylinderGeometry(36, 38, 3, 9), MAT.stone, 0, 1.5, 0);
      const H = [54, 72, 46, 84, 62, 50, 92, 66, 58];
      const radar = new T.Shape();
      H.forEach((hh, i) => {
        const a = (i / 9) * Math.PI * 2, x = Math.cos(a) * 27, z = Math.sin(a) * 27;
        const sp = mesh(g, new T.ConeGeometry(3.6, hh, 4), MAT.stoneLight, x, 3 + hh / 2, z); sp.rotation.y = a;
        mesh(g, new T.ConeGeometry(1.4, 7, 4), MAT.gold, x, 3 + hh + 1.5, z);
        const rr = 7 + (hh / 92) * 15, rx = Math.cos(a) * rr, rz = Math.sin(a) * rr;
        if (i === 0) radar.moveTo(rx, rz); else radar.lineTo(rx, rz);
        block(g, MAT.gold, 0.35, 0.35, 27, Math.cos(a) * 13.5, 3.4, Math.sin(a) * 13.5, Math.PI / 2 - a);
      });
      const rm = new T.Mesh(new T.ShapeGeometry(radar), new T.MeshBasicMaterial({ color: 0xffc860, transparent: true, opacity: 0.55, side: T.DoubleSide, toneMapped: false, depthWrite: false }));
      rm.rotation.x = -Math.PI / 2; rm.position.y = 3.6; g.add(rm);
      glow(g, 0, 8, 0, 60, 0xffc860, 0.35);
      animated.push((t) => { rm.material.opacity = 0.42 + Math.sin(t * 1.3) * 0.12; });
    }

    // --- Caso 02: la bóveda de las reglas ---
    {
      const p = pad('caso2'), g = new T.Group(); g.position.set(p.x, p.h, p.z); scene.add(g);
      g.rotation.y = Math.PI / 2; // la fachada de las reglas mira al oeste, al sol del atardecer
      block(g, MAT.stoneDark, 52, 52, 52, 0, 26, 8);
      const slots = [], bright = [];
      for (let i = 0; i < 10; i++) for (let j = 0; j < 10; j++) {
        (rnd() < 0.3 ? bright : slots).push({ p: [-19.8 + i * 4.4, 6.2 + j * 4.4, -18.2], s: [3.1, 3.1, 0.8] });
      }
      instanced(g, UNIT, std({ color: 0x8a6a2a, emissive: 0xd99a2b, emissiveIntensity: 0.55, roughness: 0.5 }), slots);
      instanced(g, UNIT, MAT.glow, bright).castShadow = false;
      block(g, MAT.stone, 8, 74, 8, -34, 37, -30); block(g, MAT.stone, 8, 74, 8, 34, 37, -30);
      block(g, MAT.stoneLight, 80, 8, 10, 0, 76, -30);
      block(g, MAT.gold, 81, 1, 10.4, 0, 71.5, -30);
      const r1 = new T.Mesh(new T.TorusGeometry(9, 0.8, 8, 48), MAT.gold); r1.position.set(-14, 62, -30); g.add(r1);
      const r2 = new T.Mesh(new T.TorusGeometry(10, 0.8, 8, 48), MAT.gold); r2.position.set(14, 60, -30); g.add(r2);
      glow(g, 0, 26, -22, 70, 0xffb84a, 0.3);
      animated.push((t) => { r1.rotation.y = t * 0.5; r2.rotation.y = -t * 0.45; r2.rotation.x = 0.3; });
    }

    // --- Trayectoria: una escalinata de cuatro terrazas ---
    // Cada terraza es un puesto; la escalera que las une, el paso de uno a otro.
    {
      const g = new T.Group(); scene.add(g);
      const A = V(STAIR_A[0], 0, STAIR_A[1]), B = V(STAIR_B[0], 0, STAIR_B[1]);
      const U = B.clone().sub(A).normalize(), W = V(U.z, 0, -U.x);   // subida y anchura
      const ry = Math.atan2(U.x, U.z), gap = A.distanceTo(B) / 3;
      const at = (u, w) => A.clone().addScaledVector(U, u).addScaledVector(W, w);
      const baseH = Math.max(height(A.x, A.z), 4), S = (i) => baseH + 10 + i * 17;
      const floor = (p, top) => Math.min(height(p.x, p.z), top) - 6;
      const put = (mat, w, h, d, u, wv, y) => { const p = at(u, wv); return block(g, mat, w, h, d, p.x, y, p.z, ry); };
      // Un tramo de escalera maciza (una sola pieza, de y0 a y1 entre u0 y u1)
      const stairs = (u0, u1, y0, y1, n) => {
        const du = (u1 - u0) / n, dy = (y1 - y0) / n;
        const bottom = Math.min(floor(at(u0, 0), y0), floor(at((u0 + u1) / 2, 0), y0), floor(at(u1, 0), y0)) - 4;
        const sh = new T.Shape();
        sh.moveTo(u0, bottom);
        for (let k = 0; k < n; k++) { sh.lineTo(u0 + k * du, y0 + (k + 1) * dy); sh.lineTo(u0 + (k + 1) * du, y0 + (k + 1) * dy); }
        sh.lineTo(u1, bottom);
        const geo = new T.ExtrudeGeometry(sh, { depth: 12, bevelEnabled: false });
        geo.translate(0, 0, -6);
        const m = mesh(g, geo, MAT.stoneLight, A.x, 0, A.z);
        m.rotation.y = Math.atan2(-U.z, U.x); // el eje x de la forma sigue la subida
      };
      stairs(-9 - 5 * 1.9, -9, baseH, S(0), 5);
      for (let i = 0; i < 4; i++) {
        const u = i * gap, top = S(i), gr = floor(at(u, 0), top);
        put(MAT.stone, 30, top - 4 - gr, 12, u, 0, (top - 4 + gr) / 2);                 // pilar
        put(i === 3 ? MAT.stoneLight : MAT.stone, 40, 4, 18, u, 0, top - 2);             // terraza
        put(MAT.gold, 40.5, 0.8, 18.5, u, 0, top - 3.3);                                 // filo dorado
        put(MAT.stoneDark, 1.4, 16 + i * 2.5, 5, u, 13, top + 8 + i * 1.25);             // estela del puesto
        if (i < 3) stairs(u + 9, u + gap - 9, top, S(i + 1), 8);
        if (i === 3) {
          const p = at(u, 13), y = top + 20 + i * 2.5;
          mesh(g, new T.SphereGeometry(2.4, 16, 12), MAT.glow, p.x, y, p.z).castShadow = false;
          glow(g, p.x, y, p.z, 34, 0xffd27a, 0.8);
        }
      }
    }

    // --- Formación: tres puertas sobre el río ---
    {
      const g = new T.Group(); scene.add(g);
      [196, 222, 248].forEach((z, i) => {
        const x = riverX(z), hh = 44 + i * 5;
        block(g, MAT.stoneLight, 6, hh + 10, 6, x - 19, hh / 2 - 5, z);
        block(g, MAT.stoneLight, 6, hh + 10, 6, x + 19, hh / 2 - 5, z);
        if (i === 0) { block(g, MAT.stone, 48, 6, 8, x, hh + 3, z); block(g, MAT.gold, 48.4, 1, 8.4, x, hh - 0.2, z); }
        if (i === 1) { const c = mesh(g, new T.ConeGeometry(26, 14, 4), MAT.stone, x, hh + 7, z); c.rotation.y = Math.PI / 4; c.scale.z = 0.3; block(g, MAT.gold, 44, 1, 3, x, hh + 0.5, z); }
        if (i === 2) { const b = block(g, MAT.stone, 50, 5, 8, x, hh + 3, z); b.rotation.z = 0.12; mesh(g, new T.TorusGeometry(5, 0.7, 8, 40), MAT.gold, x, hh + 12, z); }
      });
    }

    // --- Certificaciones: un bosque de 34 cristales ---
    {
      const p = pad('certificaciones'), g = new T.Group(); g.position.set(p.x, p.h, p.z); scene.add(g);
      mesh(g, new T.CylinderGeometry(6, 7, 3, 24), MAT.stone, 0, 1.5, 0);
      glow(g, 0, 5, 0, 30, 0xffd27a, 0.5);
      // 14 solo IA, 6 IA y Oracle, 4 solo Oracle, 10 de gestión: 34 en total
      const kinds = [...Array(14).fill('ia'), ...Array(6).fill('both'), ...Array(4).fill('oracle'), ...Array(10).fill('gestion')];
      const matFor = {
        ia: std({ color: 0xd4a017, metalness: 0.6, roughness: 0.2, emissive: 0xc88f14, emissiveIntensity: 0.5, envMapIntensity: 1.4 }),
        both: std({ color: 0xc9853a, metalness: 0.7, roughness: 0.22, emissive: 0xd4a017, emissiveIntensity: 0.45, envMapIntensity: 1.4 }),
        oracle: std({ color: 0xb8683c, metalness: 0.8, roughness: 0.25, emissive: 0x8a3f1c, emissiveIntensity: 0.4, envMapIntensity: 1.3 }),
        gestion: std({ color: 0xf0ede8, metalness: 0.1, roughness: 0.25, emissive: 0xfff4dc, emissiveIntensity: 0.25, envMapIntensity: 1.2 }),
      };
      const geo = new T.OctahedronGeometry(1, 0);
      const crystals = kinds.map((k, i) => {
        const a = i * 2.39996, r = 9 + Math.sqrt(i) * 5.6, y = 10 + (i % 5) * 4.5 + rnd() * 6;
        const m = new T.Mesh(geo, matFor[k]);
        m.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
        m.scale.set(2.3, 6.5 + rnd() * 3, 2.3);
        m.castShadow = SHADOWS;
        g.add(m);
        return { m, y, ph: rnd() * 6.28 };
      });
      animated.push((t) => { crystals.forEach(({ m, y, ph }) => { m.position.y = y + Math.sin(t * 0.7 + ph) * 1.6; m.rotation.y = t * 0.25 + ph; }); });
    }

    // --- Método: un círculo de cuatro piedras ---
    {
      const p = pad('metodo'), g = new T.Group(); g.position.set(p.x, p.h, p.z); scene.add(g);
      mesh(g, new T.TorusGeometry(19, 0.5, 8, 80), MAT.gold, 0, 0.6, 0).rotation.x = Math.PI / 2;
      ['01', '02', '03', '04'].forEach((label, i) => {
        const a = i * Math.PI / 2 + Math.PI / 4, x = Math.cos(a) * 19, z = Math.sin(a) * 19;
        const face = std({ map: plateTexture(label), emissive: 0xffffff, emissiveIntensity: 0.12, roughness: 0.7 });
        const stone = new T.Mesh(UNIT, [MAT.stoneDark, MAT.stoneDark, MAT.stoneDark, MAT.stoneDark, face, MAT.stoneDark]);
        stone.scale.set(9, 30 + i * 3, 3); stone.position.set(x, (30 + i * 3) / 2, z);
        stone.lookAt(0, stone.position.y, 0);
        stone.castShadow = SHADOWS; g.add(stone);
      });
      const orb = mesh(g, new T.SphereGeometry(3.4, 24, 16), MAT.glow, 0, 12, 0); orb.castShadow = false;
      const og = glow(g, 0, 12, 0, 44, 0xffd27a, 0.85);
      animated.push((t) => { orb.position.y = og.position.y = 12 + Math.sin(t * 0.8) * 1.2; });
    }

    // --- Contacto: el faro sobre el mar ---
    {
      const p = pad('faro'), g = new T.Group(); g.position.set(p.x, p.h, p.z); scene.add(g);
      mesh(g, new T.CylinderGeometry(9, 11, 5, 24), MAT.stone, 0, 2.5, 0);
      mesh(g, new T.CylinderGeometry(3.6, 5.2, 44, 24), MAT.stoneLight, 0, 27, 0);
      [16, 30].forEach(y => mesh(g, new T.CylinderGeometry(4.9 - y * 0.03, 5 - y * 0.03, 1.4, 24), MAT.gold, 0, y, 0));
      mesh(g, new T.CylinderGeometry(4.6, 4.6, 1.2, 24), MAT.stoneDark, 0, 49.6, 0);
      const lantern = mesh(g, new T.CylinderGeometry(3, 3, 6, 16), MAT.glow, 0, 53.4, 0); lantern.castShadow = false;
      mesh(g, new T.ConeGeometry(4.2, 5, 16), MAT.gold, 0, 58.9, 0);
      glow(g, 0, 53.4, 0, 60, 0xffe0a0, 0.9);
      const beamMat = new T.MeshBasicMaterial({ color: 0xffdca0, transparent: true, opacity: 0.16, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false });
      const beams = new T.Group(); beams.position.y = 53.4; g.add(beams);
      [0, Math.PI].forEach(a => {
        const b = new T.Mesh(new T.ConeGeometry(9, 150, 24, 1, true), beamMat);
        b.rotation.z = Math.PI / 2; b.position.x = 75; const w = new T.Group(); w.rotation.y = a; w.add(b); beams.add(w);
      });
      animated.push((t) => { beams.rotation.y = t * 0.55; });
    }
  }

  // =========================================================
  //  LUGARES, CÁMARA Y RECORRIDO
  // =========================================================
  // Dónde está cada lugar (ancla) y desde dónde se mira (cámara). Los textos
  // vienen del JSON, en el mismo orden.
  const H = (id) => pad(id).h;
  const SHOTS = {
    inicio: { anchor: [150, H('inicio') + 34, -262], cam: [196, H('inicio') + 32, -282], look: [146, H('inicio') + 17, -258], r: 70 },
    flujo: { anchor: [0, 70, -150], cam: [-190, 150, -250], look: [0, 30, -90], r: 110 },
    capacidades: { anchor: [-168, 80, -30], cam: [-62, 64, 128], look: [-168, 44, -36], r: 95 },
    caso1: { anchor: [168, H('caso1') + 90, -58], cam: [236, H('caso1') + 44, 24], look: [168, H('caso1') + 36, -58], r: 90 },
    caso2: { anchor: [150, H('caso2') + 80, 58], cam: [27, H('caso2') + 54, -29], look: [150, H('caso2') + 38, 58], r: 90 },
    trayectoria: { anchor: [-186, 80, 184], cam: [-288, 122, 78], look: [-186, 54, 184], r: 90 },
    formacion: { anchor: [0, 66, 222], cam: [84, 44, 146], look: [2, 28, 224], r: 80 },
    certificaciones: { anchor: [108, H('certificaciones') + 46, 258], cam: [42, H('certificaciones') + 34, 190], look: [108, H('certificaciones') + 18, 258], r: 85 },
    metodo: { anchor: [-96, H('metodo') + 44, 276], cam: [-34, H('metodo') + 26, 226], look: [-96, H('metodo') + 13, 276], r: 75 },
    contacto: { anchor: [78, 36 + 70, 382], cam: [14, 60, 316], look: [78, 68, 382], r: 90 },
  };
  const PLACES = DATA.places.map(p => Object.assign({}, p, SHOTS[p.id], {
    anchorV: V(...SHOTS[p.id].anchor), camV: V(...SHOTS[p.id].cam), lookV: V(...SHOTS[p.id].look),
  }));

  // ---- Estado de la cámara ----
  const cam = { pos: V(0, 0, 0), yaw: 0, pitch: 0 };
  function setLook(pos, look) {
    cam.pos.copy(pos);
    const d = look.clone().sub(pos).normalize();
    cam.yaw = Math.atan2(-d.x, -d.z);
    cam.pitch = Math.asin(clamp(d.y, -1, 1));
  }
  const euler = new T.Euler(0, 0, 0, 'YXZ');
  function applyCamera() {
    camera.position.copy(cam.pos);
    euler.set(cam.pitch, cam.yaw, 0);
    camera.quaternion.setFromEuler(euler);
    camera.updateMatrixWorld(); // las etiquetas se proyectan antes de dibujar
  }
  const quatFor = (pos, look) => { const m = new T.Matrix4().lookAt(pos, look, V(0, 1, 0)); return new T.Quaternion().setFromRotationMatrix(m); };

  // Vuelo entre dos puntos: curva de Bézier que se eleva sobre el terreno.
  let flight = null;
  function flyTo(pos, look, dur, done) {
    const from = cam.pos.clone(), to = pos.clone();
    const q0 = camera.quaternion.clone(), q1 = quatFor(to, look);
    const dist = from.distanceTo(to), lift = Math.max(20, dist * 0.22);
    const top = Math.max(from.y, to.y) + lift;
    const dir = to.clone().sub(from);
    const c1 = from.clone().addScaledVector(dir, 0.3).setY(top), c2 = to.clone().addScaledVector(dir, -0.3).setY(top);
    if (dur <= 0 || reduceMotion.matches) {
      // Movimiento reducido: corte con un fundido corto, sin vuelo.
      fade(() => { setLook(to, look); applyCamera(); if (done) done(); });
      return;
    }
    flight = { t: 0, dur: dur || clamp(2.2 + dist / 160, 2.6, 5.5), from, to, c1, c2, q0, q1, look: look.clone(), done };
  }
  const bez = (a, b, c, d, t) => { const u = 1 - t; return a.clone().multiplyScalar(u * u * u).addScaledVector(b, 3 * u * u * t).addScaledVector(c, 3 * u * t * t).addScaledVector(d, t * t * t); };
  const qTmp = new T.Quaternion();
  function updateFlight(dt) {
    if (!flight) return;
    flight.t = Math.min(1, flight.t + dt / flight.dur);
    const k = easeInOut(flight.t);
    const p = bez(flight.from, flight.c1, flight.c2, flight.to, k);
    p.y = Math.max(p.y, height(p.x, p.z) + 8);
    cam.pos.copy(p);
    qTmp.copy(flight.q0).slerp(flight.q1, easeInOut(clamp(flight.t * 1.15 - 0.05, 0, 1)));
    euler.setFromQuaternion(qTmp, 'YXZ');
    cam.pitch = euler.x; cam.yaw = euler.y;
    if (flight.t >= 1) {
      const f = flight; flight = null;
      setLook(f.to, f.look);
      if (f.done) f.done();
    }
  }
  const fadeEl = $('fade');
  function fade(mid) {
    fadeEl.classList.add('on');
    setTimeout(() => { mid(); fadeEl.classList.remove('on'); }, 220);
  }

  // ---- Controles libres: arrastrar para mirar, teclado para moverse ----
  const keys = new Set();
  const vel = V(0, 0, 0);
  let lastInput = -1e9, mode = 'intro'; // intro | tour | free
  function userMoved() {
    lastInput = clock.elapsed;
    if (started) setTimeout(() => document.body.classList.add('hint-done'), 5000);
    if (flight) flight = null;
    if (mode === 'tour') mode = 'free';
  }
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (!placesMenu.hidden) togglePlaces(false); else hidePanel(); return; }
    if (e.target.closest && e.target.closest('button, a, input')) {
      if (e.key === ' ' || e.key === 'Enter') return;
    }
    // Dentro del panel o de la lista, las flechas desplazan el texto
    if (e.target.closest && e.target.closest('#panel, #placesMenu')) return;
    const k = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'q', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k)) {
      if (mode === 'intro') return;
      keys.add(k); userMoved();
      if (k.startsWith('arrow')) e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => keys.clear());

  const pointers = new Map();
  let pinch0 = 0;
  canvas.addEventListener('pointerdown', (e) => {
    if (mode === 'intro') return;
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); }
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    if (pointers.size === 1) {
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      if (Math.abs(dx) + Math.abs(dy) > 0) userMoved();
      cam.yaw -= dx * 0.0032; cam.pitch = clamp(cam.pitch - dy * 0.0032, -1.35, 1.35);
    }
    p.x = e.clientX; p.y = e.clientY;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      push += (d - pinch0) * 0.9; pinch0 = d; userMoved();
    }
  });
  const endPointer = (e) => pointers.delete(e.pointerId);
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  let push = 0;
  canvas.addEventListener('wheel', (e) => { if (mode === 'intro') return; e.preventDefault(); push -= e.deltaY * 0.5; userMoved(); }, { passive: false });

  const fwd = V(0, 0, 0), right = V(0, 0, 0), want = V(0, 0, 0);
  function updateFree(dt) {
    fwd.set(-Math.sin(cam.yaw) * Math.cos(cam.pitch), Math.sin(cam.pitch), -Math.cos(cam.yaw) * Math.cos(cam.pitch));
    right.set(Math.cos(cam.yaw), 0, -Math.sin(cam.yaw));
    want.set(0, 0, 0);
    const k = (a, b) => (keys.has(a) || keys.has(b)) ? 1 : 0;
    want.addScaledVector(fwd, k('w', 'arrowup') - k('s', 'arrowdown'));
    want.addScaledVector(right, k('d', 'arrowright') - k('a', 'arrowleft'));
    want.y += k('e', 'e') - k('q', 'q');
    const speed = keys.has('shift') ? 150 : 55;
    if (want.lengthSq() > 0) want.normalize().multiplyScalar(speed);
    want.addScaledVector(fwd, push); push *= Math.exp(-dt * 5);
    vel.lerp(want, 1 - Math.exp(-dt * 5));
    cam.pos.addScaledVector(vel, dt);
    // Nunca bajo tierra ni fuera del valle
    cam.pos.y = clamp(cam.pos.y, Math.max(height(cam.pos.x, cam.pos.z), 0) + 4, 520);
    const r = Math.hypot(cam.pos.x, cam.pos.z - 20);
    if (r > 720) { cam.pos.x *= 720 / r; cam.pos.z = 20 + (cam.pos.z - 20) * 720 / r; }
  }

  // =========================================================
  //  INTERFAZ
  // =========================================================
  const panel = $('panel'), panelBody = $('panelBody');
  const tourNav = $('tourNav'), tourCount = $('tourCount');
  const placesMenu = $('placesMenu'), placesList = $('placesList');
  const markersEl = $('markers');
  let current = -1, panelPinned = false;

  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function renderPanel(i) {
    const p = PLACES[i];
    panelBody.textContent = '';
    if (p.kicker) panelBody.append(el('p', 'p-kicker', p.kicker));
    const h = el('h2', 'p-title', p.title); if (p.titleLang) h.lang = p.titleLang; panelBody.append(h);
    if (p.subtitle) { const s = el('p', 'p-sub', p.subtitle); if (p.subtitleLang) s.lang = p.subtitleLang; panelBody.append(s); }
    (p.body || []).forEach(t => panelBody.append(el('p', 'p-text', t)));
    if (p.facts) {
      const dl = el('dl', 'p-facts');
      p.facts.forEach(f => { const d = el('div'); d.append(el('dt', null, f.value), el('dd', null, f.label)); dl.append(d); });
      panelBody.append(dl);
    }
    if (p.items) {
      const ul = el('ul', 'p-items');
      p.items.forEach(it => {
        const li = el('li');
        const t = el('p', 'p-item-title', it.title); if (it.lang) t.lang = it.lang; li.append(t);
        if (it.meta) li.append(el('p', 'p-item-meta', it.meta));
        if (it.text) li.append(el('p', 'p-item-text', it.text));
        ul.append(li);
      });
      panelBody.append(ul);
    }
    if (p.body2) panelBody.append(el('p', 'p-text', p.body2));
    if (p.links) {
      const ul = el('ul', 'p-links');
      p.links.forEach(l => { const li = el('li'), a = el('a', null, l.label); a.href = localHref(l.href); if (/^https?:/.test(l.href)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; } li.append(a); ul.append(li); });
      panelBody.append(ul);
    }
    if (p.link) { const a = el('a', 'p-more', UI.more); a.href = localHref(p.link); panelBody.append(a); }
    tourCount.textContent = (i + 1) + ' ' + UI.of + ' ' + PLACES.length;
  }
  // Cada apertura o cierre anula lo que quedara pendiente del anterior: en un
  // equipo lento, el cierre retardado no puede ocultar un panel recién abierto.
  let panelToken = 0;
  function showPanel(i, pinned) {
    if (current !== i) { renderPanel(i); current = i; panelBody.scrollTop = 0; }
    panelPinned = !!pinned;
    panel.hidden = false;
    document.body.classList.add('panel-open');
    const token = ++panelToken;
    if (CAPTURE) panel.classList.add('open'); else requestAnimationFrame(() => { if (token === panelToken) panel.classList.add('open'); });
    markers.forEach((m, k) => m.el.classList.toggle('current', k === i));
  }
  function hidePanel() {
    // Si el foco estaba dentro, no se pierde: pasa al botón del recorrido.
    if (panel.contains(document.activeElement)) $('tourBtn').focus();
    panel.classList.remove('open');
    document.body.classList.remove('panel-open');
    panelPinned = false;
    current = -1;
    markers.forEach(m => m.el.classList.remove('current'));
    const token = ++panelToken;
    setTimeout(() => { if (token === panelToken) panel.hidden = true; }, 320);
  }
  $('panelClose').addEventListener('click', () => hidePanel());
  panel.tabIndex = -1; // para poder llevar el foco al panel al llegar a un lugar

  // Ir a un lugar: vuelo de cámara y panel al llegar. En el recorrido, si el
  // panel ya está abierto, sigue abierto y muestra ya el siguiente lugar: así
  // el foco se queda en «Siguiente» y se puede avanzar solo con el teclado.
  // focusPanel: la navegación empezó en algo que desaparece (la entrada, la
  // lista de lugares o una etiqueta), así que al llegar el foco pasa al panel.
  let tourIndex = 0;
  function goTo(i, asTour, focusPanel) {
    tourIndex = i;
    mode = asTour ? 'tour' : 'free';
    tourNav.hidden = !asTour;
    const keep = asTour && !panel.hidden && document.body.classList.contains('panel-open');
    if (keep) { showPanel(i, true); if (focusPanel) panel.focus({ preventScroll: true }); }
    else hidePanel();
    const p = PLACES[i];
    flyTo(p.camV, p.lookV, undefined, () => {
      showPanel(i, true);
      if (!asTour) mode = 'free';
      if (focusPanel && !keep) panel.focus({ preventScroll: true });
    });
  }
  $('tourPrev').addEventListener('click', () => goTo((tourIndex - 1 + PLACES.length) % PLACES.length, true));
  $('tourNext').addEventListener('click', () => goTo((tourIndex + 1) % PLACES.length, true));
  $('tourBtn').addEventListener('click', () => { startWorld(); goTo(mode === 'tour' ? tourIndex : 0, true); });

  // Lista de lugares
  PLACES.forEach((p, i) => {
    const li = el('li'), b = el('button', null);
    b.type = 'button';
    b.append(el('span', 'pl-num', String(i + 1).padStart(2, '0')), el('span', 'pl-name', p.marker));
    b.addEventListener('click', () => { togglePlaces(false); startWorld(); goTo(i, mode === 'tour', true); });
    li.append(b); placesList.append(li);
  });
  const placesBtn = $('placesBtn');
  function togglePlaces(open) {
    if (!open && placesMenu.contains(document.activeElement)) placesBtn.focus(); // el foco vuelve al botón
    placesMenu.hidden = !open;
    placesBtn.setAttribute('aria-expanded', String(open));
    if (open) { const f = placesList.querySelector('button'); if (f) f.focus(); }
  }
  placesBtn.addEventListener('click', () => togglePlaces(placesMenu.hidden));

  // Marcadores flotantes sobre cada lugar
  const markers = PLACES.map((p, i) => {
    const b = el('button', 'w-marker');
    b.type = 'button';
    b.append(el('span', 'm-dot'), el('span', 'm-label', p.marker));
    b.addEventListener('click', () => goTo(i, mode === 'tour', true));
    markersEl.append(b);
    // Ancho aproximado (tipografía monoespaciada) para evitar solapes
    return { el: b, p, w: 38 + p.marker.length * 8.1 };
  });
  const proj = V(0, 0, 0);
  function updateMarkers() {
    const { w, h, pw, ph } = freeArea();
    // Como mucho cinco a la vez, las más cercanas; la del lugar abierto no hace falta.
    // Si dos etiquetas se pisan, queda la del lugar más cercano.
    const order = markers.map((m, i) => ({ m, i, d: cam.pos.distanceTo(m.p.anchorV) })).sort((a, b) => a.d - b.d);
    const boxes = [];
    order.forEach(({ m, i, d }) => {
      proj.copy(m.p.anchorV).project(camera);
      const x = (proj.x + 1) / 2 * w, y = (1 - proj.y) / 2 * h, bw = m.w / 2 + 6;
      // Enteras dentro de la parte visible: ni cortadas, ni bajo la barra o el panel
      let visible = mode !== 'intro' && i !== current && boxes.length < 5 && proj.z < 1 && d < 560 && d > 24 &&
        x - bw > 4 && x + bw < w - pw - 4 && y > 100 && y < h - ph - 8;
      if (visible && boxes.some(b => Math.abs(b.x - x) < b.bw + bw && Math.abs(b.y - y) < 36)) visible = false;
      if (visible) boxes.push({ x, y, bw });
      m.el.classList.toggle('show', visible);
      if (visible) {
        m.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
        m.el.style.opacity = String(clamp(1.3 - d / 520, 0.4, 1));
      }
      m.el.tabIndex = visible ? 0 : -1;
    });
  }

  // En exploración libre, acercarse a un lugar abre su panel; alejarse lo cierra.
  function updateProximity() {
    if (mode !== 'free' || flight) return;
    let best = -1, bd = 1e9;
    PLACES.forEach((p, i) => { const d = cam.pos.distanceTo(p.anchorV); if (d < p.r && d < bd) { bd = d; best = i; } });
    if (best >= 0 && best !== current) showPanel(best, false);
    else if (best < 0 && current >= 0 && !panelPinned) hidePanel();
    else if (best < 0 && panelPinned && current >= 0 && cam.pos.distanceTo(PLACES[current].anchorV) > PLACES[current].r * 2.2) hidePanel();
  }

  // ---- Inicio: la pantalla de entrada ----
  const intro = $('intro');
  const hint = $('hint');
  hint.textContent = coarse ? UI.hintTouch : UI.hintMouse;
  let started = false;
  function startWorld() {
    if (started) return;
    started = true;
    intro.classList.add('gone');
    document.body.classList.add('started');
    setTimeout(() => document.body.classList.add('hint-done'), 16000);
    setTimeout(() => { intro.hidden = true; }, 700);
  }
  $('startTour').addEventListener('click', () => { startWorld(); goTo(0, true, true); });
  $('startFree').addEventListener('click', () => {
    startWorld(); mode = 'free'; tourNav.hidden = true;
    const p = PLACES[0];
    flyTo(p.camV, p.lookV, undefined, () => { mode = 'free'; });
  });

  // =========================================================
  //  BUCLE
  // =========================================================
  const clock = { elapsed: 0 };
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; // el campo de visión lo ajusta updateLens()
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  // Cámara de la pantalla de entrada: un giro lento y alto sobre el valle.
  function introCamera(t) {
    const a = -0.9 + t * 0.03;
    cam.pos.set(Math.sin(a) * 430, 210, -60 + Math.cos(a) * 430);
    const d = V(0, 30, 20).sub(cam.pos).normalize();
    cam.yaw = Math.atan2(-d.x, -d.z); cam.pitch = Math.asin(d.y);
  }

  function updateDust() {
    const { N, R, base, arr, geo } = dust;
    for (let i = 0; i < N; i++) {
      for (let a = 0; a < 3; a++) {
        const c = a === 0 ? cam.pos.x : a === 1 ? cam.pos.y : cam.pos.z;
        const drift = a === 1 ? clock.elapsed * 0.6 : clock.elapsed * (a === 0 ? 1.2 : 0.8);
        let v = base[i * 3 + a] + drift - c;
        v = ((v % (2 * R)) + 2 * R) % (2 * R) - R;
        arr[i * 3 + a] = c + v;
      }
    }
    geo.attributes.position.needsUpdate = true;
  }

  // Parte de la pantalla que no tapa el panel: a su izquierda en escritorio,
  // por encima de la hoja en móvil y en tabletas en vertical (la misma
  // condición que en world.css).
  const SHEET = window.matchMedia('(max-width: 720px), (orientation: portrait) and (max-width: 1100px)');
  function freeArea() {
    const w = window.innerWidth, h = window.innerHeight, wide = !SHEET.matches;
    const open = document.body.classList.contains('panel-open') && !panel.hidden;
    return { w, h, wide, open, pw: open && wide ? panel.offsetWidth + 24 : 0, ph: open && !wide ? panel.offsetHeight : 0 };
  }
  // Con el panel abierto, la imagen se desplaza (como el objetivo descentrable
  // de una cámara de arquitectura) para que el lugar quede centrado en la parte
  // visible, y el campo de visión se ajusta para que esa parte encuadre lo mismo
  // en cualquier pantalla: al menos ±30° de ancho y ±24° de alto.
  let lens = 0, fovT = Math.tan(27.5 * Math.PI / 180);
  function updateLens(dt) {
    const { w, h, wide, open, pw, ph } = freeArea();
    const tWant = clamp(Math.max(0.52, 0.58 * h / Math.max(w - pw, 1), 0.45 * h / Math.max(h - ph, 1)), 0.52, open ? 1.3 : 1);
    const k = CAPTURE || reduceMotion.matches ? 1 : 1 - Math.exp(-dt * 4);
    lens = lerp(lens, wide ? pw / 2 : ph / 2, k);
    fovT = lerp(fovT, tWant, k);
    camera.fov = 2 * Math.atan(fovT) * 180 / Math.PI;
    if (lens < 0.5) camera.clearViewOffset(); // (las dos actualizan la proyección)
    else camera.setViewOffset(w, h, wide ? lens : 0, wide ? 0 : lens, w, h);
  }

  function tick(t, dt) {
    clock.elapsed = t;
    const still = reduceMotion.matches ? 0.15 : 1; // con movimiento reducido, casi quieto
    animated.forEach(f => f(t * still, dt));
    if (mode === 'intro' && !flight) introCamera(t * still);
    updateFlight(dt);
    if (mode !== 'intro' && !flight) {
      updateFree(dt);
      // En el recorrido, una deriva lentísima mientras se lee
      if (mode === 'tour' && current >= 0 && !reduceMotion.matches && clock.elapsed - lastInput > 1.5) {
        const p = PLACES[current], a = dt * 0.018;
        const off = cam.pos.clone().sub(p.lookV), c = Math.cos(a), s = Math.sin(a);
        cam.pos.set(p.lookV.x + off.x * c - off.z * s, cam.pos.y, p.lookV.z + off.x * s + off.z * c);
        cam.yaw -= a;
      }
    }
    applyCamera();
    updateLens(dt);
    sky.position.copy(camera.position);
    updateDust();
    updateProximity();
    updateMarkers();
    renderer.render(scene, camera);
  }

  // Calidad adaptativa: si los primeros segundos van lentos, menos píxeles.
  let frames = 0, slow = 0;
  function adapt(dt) {
    if (CAPTURE || frames++ < 30 || frames > 400) return;
    if (dt > 1 / 38) slow++; else slow = Math.max(0, slow - 1);
    if (slow > 20 && pixelRatio > 0.7) { pixelRatio = Math.max(0.7, pixelRatio * 0.8); renderer.setPixelRatio(pixelRatio); resize(); slow = 0; }
  }

  // ---- Arranque ----
  const loadBar = $('loadBar');
  function build() {
    buildPlaces();
    resize();
    introCamera(0); applyCamera();
    loadBar.style.transform = 'scaleX(1)';
    document.body.classList.add('ready');
    $('startTour').disabled = false; $('startFree').disabled = false;
  }
  const fontsReady = document.fonts ? Promise.race([document.fonts.load('400 132px "Instrument Serif"').then(() => document.fonts.load('500 25px "JetBrains Mono"')), new Promise(r => setTimeout(r, 2500))]) : Promise.resolve();

  if (CAPTURE) {
    // El grabador pide fotogramas concretos: window.__world.renderAt(t, estado)
    window.__world = {
      ready: fontsReady.then(() => { build(); return true; }),
      places: PLACES.map(p => ({ id: p.id, cam: p.cam, look: p.look })),
      heightAt: (x, z) => height(x, z),
      renderAt(t, s) {
        if (s) {
          mode = s.mode || mode;
          if (s.cam) { setLook(V(...s.cam), V(...s.look)); }
          if (s.panel !== undefined) { if (s.panel === null) { panel.classList.remove('open'); panel.hidden = true; current = -1; } else if (current !== s.panel) { showPanel(s.panel, true); tourNav.hidden = false; } }
          if (s.intro === false && !started) { started = true; intro.hidden = true; document.body.classList.add('started', 'hint-done'); }
        }
        clock.elapsed = t;
        animated.forEach(f => f(t, 1 / 30));
        applyCamera(); updateLens(0); sky.position.copy(camera.position); updateDust(); updateMarkers();
        renderer.render(scene, camera);
      },
    };
    return;
  }

  fontsReady.then(() => {
    setTimeout(() => {
      build();
      let last = performance.now(), t = 0;
      function loop(now) {
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        if (!document.hidden) { t += dt; adapt(dt); tick(t, dt); }
        requestAnimationFrame(loop);
      }
      requestAnimationFrame(loop);
    }, 30);
  });
})();

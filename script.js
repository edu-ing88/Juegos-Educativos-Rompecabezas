'use strict';
const $ = id => document.getElementById(id);
const E = { imgURL: null, ratio: 1, n: 0, placed: 0, tries: 0, fails: 0, t0: 0, done: false };
const C = { url: null, ratio: 1, n: 0, canvas: null, tpl: null };   // actividad guardada por el docente
const P = { url: null, ratio: 1, canvas: null };         // imagen pendiente de guardar
const NOMBRES = { 2: 'Fácil', 3: 'Normal', 4: 'Difícil', 5: 'Experto' };
const OK = ['¡Muy bien!', '¡Excelente!', '¡Genial!', '¡Fantástico!', '¡Maravilloso!', '¡Lo lograste!'];
const MAL = ['¡Inténtalo otra vez!', '¡Tú puedes!', '¡Casi lo logras!'];
const dos = a => { const i = Math.floor(Math.random() * a.length); let j = Math.floor(Math.random() * (a.length - 1)); if (j >= i) j++; return a[i] + ' ' + a[j]; };

/* ---------- Pantallas ---------- */
function mostrar(id) {
  document.querySelectorAll('.pantalla').forEach(p => p.classList.toggle('activa', p.id === id));
  document.documentElement.classList.toggle('jugando', id === 'juego');
  window.scrollTo(0, 0);
}

/* ---------- Audio (Web Audio API) ---------- */
let ac;
function tono(f, ini, dur, tipo = 'sine', vol = 0.15) {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + ini;
    o.type = tipo; o.frequency.value = f;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + dur);
  } catch (e) { /* sin audio */ }
}
const sonidoOk = () => { tono(660, 0, .15); tono(880, .1, .2); tono(1175, .2, .25); };
const sonidoMal = () => { tono(220, 0, .25, 'triangle', .12); tono(180, .15, .3, 'triangle', .1); };
/* ---------- Voz (SpeechSynthesis) ---------- */
let voz = null, tv = 0;
const hayVoz = 'speechSynthesis' in window;
function cargarVoz() {
  const v = speechSynthesis.getVoices();
  voz = v.find(x => /^es/i.test(x.lang) && /google|microsoft|natural/i.test(x.name)) || v.find(x => /^es/i.test(x.lang)) || null;
}
if (hayVoz) { cargarVoz(); speechSynthesis.onvoiceschanged = cargarVoz; }
function hablar(txt) {
  if (!hayVoz) return;
  try {
    clearTimeout(tv); speechSynthesis.cancel(); // evita voces superpuestas
    tv = setTimeout(() => {
      const u = new SpeechSynthesisUtterance(txt);
      u.lang = voz ? voz.lang : 'es-ES'; if (voz) u.voice = voz;
      u.rate = .95; u.pitch = 1.15; u.volume = 1;
      speechSynthesis.resume(); speechSynthesis.speak(u);
    }, 80);
  } catch (e) { /* sin voz */ }
}
function desbloquear() { // se llama desde un clic del usuario
  tono(440, 0, .01, 'sine', .001);
  if (hayVoz) { try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch (e) {} }
}
document.addEventListener('pointerdown', desbloquear, { once: true });
const sonidoFin = () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tono(f, i * .14, .3, 'square', .08));

/* ---------- Estrellas y confeti ---------- */
const cv = $('fx'), cx = cv.getContext('2d');
let parts = [], anim = false;
function ajustarCanvas() { cv.width = innerWidth; cv.height = innerHeight; }
function lluvia(x, y, cant, grande) {
  const col = ['#ffd23f', '#ef476f', '#2f7df6', '#2bb673', '#ff9f1c', '#b388ff'];
  for (let i = 0; i < cant; i++) {
    const a = Math.random() * Math.PI * 2, v = (grande ? 4 : 2) + Math.random() * (grande ? 9 : 5);
    parts.push({ x: grande ? Math.random() * cv.width : x, y: grande ? -20 : y,
      vx: grande ? (Math.random() - .5) * 4 : Math.cos(a) * v, vy: grande ? 2 + Math.random() * 4 : Math.sin(a) * v - 2,
      s: 10 + Math.random() * 14, c: col[i % col.length], estrella: Math.random() < .5, r: Math.random() * 6, vida: 90 + Math.random() * 60 });
  }
  if (!anim) { anim = true; requestAnimationFrame(frame); }
}
function lluviaEstrellas(x, y) {
  const col = ['#ffd23f', '#ffb703', '#ff9f1c', '#fff176', '#ffe08a'];
  for (let i = 0; i < 14; i++) { // destello en la casilla
    const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 5;
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, s: 16 + Math.random() * 14, c: col[i % col.length], estrella: true, r: 0, vida: 80 + Math.random() * 40 });
  }
  for (let i = 0; i < 45; i++) { // lluvia desde arriba
    parts.push({ x: Math.random() * cv.width, y: -20 - Math.random() * cv.height * .35, vx: (Math.random() - .5) * 1.6, vy: 1.5 + Math.random() * 3,
      g: .03, s: 14 + Math.random() * 20, c: col[i % col.length], estrella: true, r: 0, vida: 150 + Math.random() * 60 });
  }
  if (!anim) { anim = true; requestAnimationFrame(frame); }
}
function frame() {
  cx.clearRect(0, 0, cv.width, cv.height);
  parts = parts.filter(p => p.vida-- > 0 && p.y < cv.height + 30);
  for (const p of parts) {
    p.x += p.vx; p.y += p.vy; p.vy += p.g || .12; p.r += .1;
    cx.globalAlpha = Math.min(1, p.vida / 30); cx.fillStyle = p.c; cx.font = p.s + 'px serif';
    if (p.estrella) cx.fillText('★', p.x, p.y);
    else { cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r); cx.fillRect(-p.s / 4, -p.s / 2, p.s / 2, p.s); cx.restore(); }
  }
  cx.globalAlpha = 1;
  if (parts.length) requestAnimationFrame(frame); else { anim = false; cx.clearRect(0, 0, cv.width, cv.height); }
}
addEventListener('resize', ajustarCanvas);
if ('ResizeObserver' in window) new ResizeObserver(() => { if ($('juego').classList.contains('activa')) medir(); }).observe(document.querySelector('#juego .cols'));
else addEventListener('resize', () => { if ($('juego').classList.contains('activa')) medir(); });
ajustarCanvas();

/* ---------- Generación y validación de piezas ---------- */
const MAXLADO = 1400, MINLADO = 50;
function normalizar(im) { // imagen -> canvas sobre fondo blanco (sin transparencias)
  const k = Math.min(1, MAXLADO / Math.max(im.naturalWidth, im.naturalHeight));
  const w = Math.max(1, Math.round(im.naturalWidth * k)), h = Math.max(1, Math.round(im.naturalHeight * k));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(im, 0, 0, w, h);
  return c;
}
const bordes = (total, n) => Array.from({ length: n + 1 }, (_, i) => Math.round(i * total / n)); // cortes enteros contiguos
function generarPiezas(src, n) {
  const W = src.width, H = src.height, bx = bordes(W, n), by = bordes(H, n), sx = src.getContext('2d');
  const piezas = [], cuenta = new Map();
  for (let id = 0; id < n * n; id++) {
    const col = id % n, fila = Math.floor(id / n);
    const x0 = bx[col], x1 = bx[col + 1], y0 = by[fila], y1 = by[fila + 1], w = x1 - x0, h = y1 - y0;
    const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h);
    if (w > 0 && h > 0) c.getContext('2d').drawImage(src, x0, y0, w, h, 0, 0, w, h);
    // ¿tiene contenido distintivo? (fracción de píxeles distintos del tono medio)
    let plano = true;
    if (w > 0 && h > 0) {
      const d = sx.getImageData(x0, y0, w, h).data, np = w * h; let m = 0;
      for (let i = 0; i < d.length; i += 4) m += d[i] * .299 + d[i + 1] * .587 + d[i + 2] * .114;
      m /= np; let dif = 0;
      for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] * .299 + d[i + 1] * .587 + d[i + 2] * .114 - m) > 30) dif++;
      plano = dif / np < 0.04;
    }
    const url = c.toDataURL('image/png');
    cuenta.set(url, (cuenta.get(url) || 0) + 1);
    piezas.push({ id, col, fila, x0, y0, w, h, url, plano, canvas: c });
  }
  // Toda pieza plana (fondo liso) o repetida recibe número de referencia en la pieza y en su casilla
  piezas.forEach(p => { p.rotular = p.plano || cuenta.get(p.url) > 1; });
  return piezas;
}
function validarPiezas(piezas, n, src) { // devuelve null si todo es correcto, o el motivo del fallo
  const W = src.width, H = src.height, tot = n * n;
  if (W < MINLADO || H < MINLADO) return 'La imagen es demasiado pequeña. Usa una de al menos ' + MINLADO + ' px por lado.';
  if (piezas.length !== tot) return `Se generaron ${piezas.length} piezas y deberían ser ${tot}.`;
  const vistos = new Set(); let area = 0;
  for (const p of piezas) {
    if (!(p.id >= 0 && p.id < tot) || vistos.has(p.id)) return 'Hay piezas duplicadas o sin posición de destino.';
    vistos.add(p.id);
    if (p.col !== p.id % n || p.fila !== Math.floor(p.id / n)) return 'Una pieza tiene una posición de destino incorrecta.';
    if (p.w < 1 || p.h < 1 || !p.url || p.url.length < 100) return 'Hay una pieza vacía.';
    area += p.w * p.h;
  }
  if (area !== W * H) return 'Las piezas no cubren exactamente la imagen.';
  // reconstrucción: al juntar todas las piezas debe resultar la imagen original, píxel por píxel
  const rc = document.createElement('canvas'); rc.width = W; rc.height = H;
  const rx = rc.getContext('2d'); piezas.forEach(p => rx.drawImage(p.canvas, p.x0, p.y0));
  const a = rx.getImageData(0, 0, W, H).data, b = src.getContext('2d').getImageData(0, 0, W, H).data;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return 'Las piezas no reconstruyen la imagen original.';
  return null;
}

/* ---------- Panel del docente ---------- */
function renderForm() { // muestra lo último guardado
  if (P.url && P.url !== C.url) URL.revokeObjectURL(P.url);
  P.url = C.url; P.ratio = C.ratio; P.canvas = C.canvas;
  const v = $('vista'); v.innerHTML = '';
  if (C.url) { const im = new Image(); im.alt = 'Vista previa'; im.src = C.url; v.appendChild(im); $('btnSubir').textContent = 'CAMBIAR IMAGEN'; }
  else { v.innerHTML = '<span>Aún no hay imagen</span>'; $('btnSubir').textContent = 'SUBIR IMAGEN'; }
  document.querySelectorAll('input[name=nivel]').forEach(r => r.checked = +r.value === C.n);
  $('errImg').textContent = ''; $('errNivel').textContent = ''; $('archivo').value = '';
}
function actualizarEstado() {
  const e = $('estado'); e.classList.remove('error');
  e.textContent = C.url ? `Actividad lista: nivel ${NOMBRES[C.n]} · ${C.n * C.n} piezas` : 'Primero configura la actividad para poder iniciar.';
}
$('btnSubir').onclick = () => $('archivo').click();
$('archivo').onchange = e => {
  const f = e.target.files[0], err = $('errImg');
  err.textContent = '';
  if (!f) return;
  if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { err.textContent = 'Elige una imagen JPG, JPEG, PNG o WEBP.'; e.target.value = ''; return; }
  const url = URL.createObjectURL(f), im = new Image();
  im.onload = () => {
    if (P.url && P.url !== C.url) URL.revokeObjectURL(P.url);
    if (Math.min(im.naturalWidth, im.naturalHeight) < MINLADO) { URL.revokeObjectURL(url); err.textContent = 'La imagen es demasiado pequeña. Usa una de al menos ' + MINLADO + ' px por lado.'; return; }
    P.url = url; P.canvas = normalizar(im); P.ratio = P.canvas.width / P.canvas.height;
    $('vista').innerHTML = ''; $('vista').appendChild(im);
    $('btnSubir').textContent = 'CAMBIAR IMAGEN';
  };
  im.onerror = () => { URL.revokeObjectURL(url); err.textContent = 'No se pudo leer la imagen. Prueba con otra.'; };
  im.alt = 'Vista previa'; im.src = url;
};
$('btnGuardar').onclick = () => {
  const sel = document.querySelector('input[name=nivel]:checked');
  $('errImg').textContent = P.url ? '' : 'Primero sube una imagen.';
  $('errNivel').textContent = sel ? '' : 'Selecciona un nivel de dificultad.';
  if (!P.url || !sel) return;
  const prueba = generarPiezas(P.canvas, +sel.value), fallo = validarPiezas(prueba, +sel.value, P.canvas);
  if (fallo) { $('errImg').textContent = fallo; return; }
  if (P.canvas !== C.canvas) C.tpl = P.canvas.toDataURL('image/png');
  C.canvas = P.canvas;
  if (C.url && C.url !== P.url) URL.revokeObjectURL(C.url);
  C.url = P.url; C.ratio = P.ratio; C.n = +sel.value;
  actualizarEstado();
  modal('<h2>¡Actividad guardada!</h2><p>Ya puedes presionar <b>Iniciar</b> en la pantalla de inicio.</p>', [['Aceptar', 'verde', () => mostrar('inicio')]]);
};
$('btnVolver').onclick = () => mostrar('inicio');

/* ---------- Juego ---------- */
function medir() { // ajusta tablero y bandeja al espacio disponible (sin scroll)
  const n = E.n, tot = n * n, r = E.ratio;
  const ar = $('tablero').parentElement, W = ar.clientWidth, H = ar.clientHeight;
  if (!W || !H) return;
  const iw = Math.max(60, Math.floor(Math.min(W - 8, (H - 8) * r))), ih = Math.floor(iw / r);
  $('tablero').style.width = (iw + 8) + 'px'; $('tablero').style.height = (ih + 8) + 'px';
  const bj = $('bandeja'), gap = 6, pad = 6, BW = bj.clientWidth - pad * 2, BH = bj.clientHeight - pad * 2;
  let best = 0, bc = 1;
  for (let c = 1; c <= tot; c++) {
    const filas = Math.ceil(tot / c);
    const pw = Math.min((BW - gap * (c - 1)) / c, (BH - gap * (filas - 1)) / filas * r);
    if (pw > best) { best = pw; bc = c; }
  }
  $('tablero').style.setProperty('--fs', Math.max(9, Math.min(30, iw / n * .3)) + 'px'); bj.style.setProperty('--fs', Math.max(8, best * .32) + 'px');
  bj.style.gridTemplateColumns = `repeat(${bc},${Math.max(20, Math.floor(best))}px)`;
}
function armar() {
  const n = E.n, tot = n * n, tb = $('tablero'), bj = $('bandeja');
  Object.assign(E, { placed: 0, tries: 0, fails: 0, done: false, t0: Date.now() });
  tb.querySelectorAll('.cell').forEach(c => c.remove()); bj.innerHTML = '';
  tb.style.gridTemplateColumns = `repeat(${n},1fr)`; tb.style.gridTemplateRows = `repeat(${n},1fr)`;
  for (let i = 0; i < tot; i++) { const c = document.createElement('div'); c.className = 'cell'; c.dataset.pos = i; if (E.piezas[i].rotular) { c.classList.add('rotulada'); c.dataset.num = i + 1; } tb.appendChild(c); }
  const ids = [...Array(tot).keys()];
  for (let i = tot - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  if (ids.every((v, i) => v === i)) ids.reverse();
  for (const id of ids) {
    const s = document.createElement('div'), p = document.createElement('div');
    s.className = 'slot'; s.style.aspectRatio = E.ratio;
    p.className = 'pieza'; p.dataset.id = id; // posición original del fragmento
    const pz = E.piezas[id];
    p.style.backgroundImage = `url("${pz.url}")`; p.style.backgroundSize = '100% 100%';
    if (pz.rotular) { p.classList.add('rotulada'); p.dataset.num = id + 1; }
    p.addEventListener('pointerdown', arrastrar);
    s.appendChild(p); bj.appendChild(s);
  }
  $('mensaje').textContent = ''; medir(); requestAnimationFrame(medir); progreso();
}
function progreso() {
  const t = E.n * E.n, pct = Math.round(E.placed / t * 100);
  $('pTotal').textContent = t; $('pOk').textContent = E.placed; $('pPend').textContent = t - E.placed;
  $('pPct').textContent = pct + ' %'; $('barra').style.width = pct + '%';
  $('textoP').textContent = `Piezas colocadas: ${E.placed} de ${t}.`;
}
function msg(txt, tipo) {
  const m = $('mensaje'); m.textContent = txt; m.className = tipo; void m.offsetWidth; m.classList.add('pop');
}
function arrastrar(e) {
  const p = e.currentTarget;
  if (E.done || p.classList.contains('fija') || (e.pointerType === 'mouse' && e.button !== 0)) return;
  e.preventDefault();
  const r = p.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
  p.classList.add('arrastra');
  Object.assign(p.style, { width: r.width + 'px', height: r.height + 'px', left: r.left + 'px', top: r.top + 'px' });
  p.setPointerCapture(e.pointerId);
  const mover = ev => { p.style.left = ev.clientX - dx + 'px'; p.style.top = ev.clientY - dy + 'px'; };
  const soltar = ev => {
    p.removeEventListener('pointermove', mover); p.removeEventListener('pointerup', soltar); p.removeEventListener('pointercancel', soltar);
    p.style.pointerEvents = 'none';
    const el = document.elementFromPoint(ev.clientX, ev.clientY);
    p.style.pointerEvents = '';
    const celda = el && el.closest ? el.closest('.cell') : null;
    if (celda && ev.type !== 'pointercancel') evaluar(p, celda); else volver(p, false);
  };
  p.addEventListener('pointermove', mover); p.addEventListener('pointerup', soltar); p.addEventListener('pointercancel', soltar);
}
function volver(p, error) {
  p.classList.remove('arrastra');
  ['width', 'height', 'left', 'top'].forEach(k => p.style[k] = '');
  if (error) { p.classList.add('mal'); setTimeout(() => p.classList.remove('mal'), 450); }
}
function evaluar(p, celda) {
  E.tries++;
  if (+p.dataset.id === +celda.dataset.pos) { // validación por posición original
    const slot = p.parentElement, r = p.getBoundingClientRect();
    p.classList.remove('arrastra'); ['width', 'height', 'left', 'top'].forEach(k => p.style[k] = '');
    p.classList.add('fija'); p.removeEventListener('pointerdown', arrastrar);
    celda.appendChild(p); celda.classList.add('llena'); slot.remove(); E.placed++;
    const fe = dos(OK); msg(fe, 'ok'); sonidoOk(); hablar(fe);
    const c = celda.getBoundingClientRect(); lluviaEstrellas(c.left + c.width / 2, c.top + c.height / 2);
    progreso();
    if (E.placed === E.n * E.n) setTimeout(terminar, 700);
  } else {
    E.fails++; volver(p, true); const fm = dos(MAL.slice(0, 2)); msg(fm, 'mal'); sonidoMal(); hablar(fm);
  }
}

/* ---------- Modales ---------- */
function modal(html, botones) {
  const c = $('caja'); c.innerHTML = html;
  const f = document.createElement('div'); f.className = 'fila';
  botones.forEach(([t, cls, fn]) => { const b = document.createElement('button'); b.className = 'btn ' + cls; b.textContent = t; b.onclick = () => { cerrar(); fn && fn(); }; f.appendChild(b); });
  c.appendChild(f); $('modal').classList.add('abierto'); f.firstChild.focus();
}
const cerrar = () => $('modal').classList.remove('abierto');
$('btnReiniciar').onclick = () => modal('<h2>¿Deseas reiniciar el rompecabezas?</h2>', [['Sí, reiniciar', 'naranja', armar], ['Cancelar', 'gris']]);
$('btnSalir').onclick = () => modal('<h2>¿Estás seguro de que deseas salir de la actividad?</h2>', [['Sí, salir', 'rojo', () => mostrar('inicio')], ['Continuar jugando', 'verde']]);
function terminar() {
  E.done = true; sonidoFin(); hablar('¡Felicitaciones! ¡Has completado el rompecabezas!'); lluvia(0, 0, 160, true);
  setTimeout(() => lluvia(0, 0, 120, true), 900);
  const s = Math.round((Date.now() - E.t0) / 1000), t = E.n * E.n;
  const tiempo = `${Math.floor(s / 60)} min ${s % 60} s`;
  modal(`<h2>¡FELICITACIONES! ¡HAS COMPLETADO EL ROMPECABEZAS!</h2><img src="${E.imgURL}" alt="Rompecabezas completo">
    <table><tr><td>Actividad</td><td>Rompecabezas</td></tr><tr><td>Nivel</td><td>${NOMBRES[E.n]}</td></tr>
    <tr><td>Total de piezas</td><td>${t}</td></tr><tr><td>Piezas colocadas</td><td>${E.placed}</td></tr>
    <tr><td>Intentos realizados</td><td>${E.tries}</td></tr><tr><td>Intentos incorrectos</td><td>${E.fails}</td></tr>
    <tr><td>Avance final</td><td>${Math.round(E.placed / t * 100)} %</td></tr><tr><td>Tiempo empleado</td><td>${tiempo}</td></tr></table>`,
    [['VOLVER A JUGAR', 'verde', armar], ['NUEVA ACTIVIDAD', 'azul', () => mostrar('docente')], ['SALIR', 'rojo', () => mostrar('inicio')]]);
}

/* ---------- Inicio y cuenta regresiva ---------- */
$('btnConfig').onclick = () => { renderForm(); mostrar('docente'); };
$('btnIniciar').onclick = () => {
  if (!C.url) {
    const e = $('estado'); e.classList.add('error');
    e.textContent = 'Primero configura la actividad: sube una imagen y elige la dificultad.';
    return;
  }
  desbloquear(); // habilita audio y voz desde el clic
  const c = $('cuenta'); let k = 3;
  const poner = () => { c.textContent = k; c.classList.remove('tic'); void c.offsetWidth; c.classList.add('tic'); tono(520 + (3 - k) * 160, 0, .2, 'sine', .15); };
  c.classList.add('abierto'); poner();
  const t = setInterval(() => {
    k--;
    if (k > 0) poner();
    else {
      clearInterval(t); c.classList.remove('abierto', 'tic');
      E.imgURL = C.tpl; E.ratio = C.ratio; E.n = C.n;
      E.piezas = generarPiezas(C.canvas, C.n);
      const fallo = validarPiezas(E.piezas, C.n, C.canvas);
      if (fallo) { modal('<h2>No se pudo preparar el rompecabezas</h2><p>' + fallo + '</p>', [['Configurar', 'azul', () => { renderForm(); mostrar('docente'); }]]); return; }
      mostrar('juego'); $('bn').src = E.imgURL; armar();
    }
  }, 1000);
};

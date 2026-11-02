/* Escenario de punta a punta del apartado 11.2 (R-37) sobre Prototipo_completo_v2.html
   Uso: node prototipo_v2/test_e2e_v2.js            (requiere Playwright)
        E2E_SHOTS=/ruta/capturas node prototipo_v2/test_e2e_v2.js   (además guarda capturas en 1360x860, 820x1180 y 400x820 de las pantallas nuevas del lite) */
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const SHOTS = process.env.E2E_SHOTS || '';
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1360, height: 860 }, acceptDownloads: true }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/^✗/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 300)); });
  await p.goto('file://' + path.resolve(__dirname, '..') + '/Prototipo_completo_v2.html'); await p.waitForTimeout(2500);
  const ev = f => p.evaluate(f); let ok = 0, ko = 0;
  const chk = (n, c, x) => { if (c) ok++; else ko++; console.log((c ? '  ✓ ' : '  ✗ ') + n + (c ? '' : '  → ' + JSON.stringify(x))); };
  const tick = async () => { await ev(() => Proto.tick(true)); await p.waitForTimeout(250); };
  const lite = () => p.frames().find(f => f.name() === '') || null; // no se usa: se opera con FR.lite.contentWindow
  const IMG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const shot = async (nombre, tabNombre) => {
    if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true });
    for (const [w, h, tag] of [[1360, 860, 'escritorio'], [820, 1180, 'tablet'], [400, 820, 'movil']]) {
      await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(350);
      const r = await ev(() => { const d = FR.lite.contentWindow.document; const sh = d.getElementById('ov').classList.contains('on') ? d.getElementById('sheet') : null; return { sw: d.documentElement.scrollWidth, cw: d.documentElement.clientWidth, sheetW: sh ? sh.scrollWidth - sh.clientWidth : 0 }; });
      if (r.sw > r.cw + 1 || r.sheetW > 1) console.log('  ⚠ desborde horizontal en ' + nombre + ' (' + tag + '): ' + JSON.stringify(r));
      await p.screenshot({ path: path.join(SHOTS, nombre + '_' + tag + '.png') });
    }
    await p.setViewportSize({ width: 1360, height: 860 });
  };
  const verTab = async k => { await p.evaluate(k => { document.getElementById('tb-' + k).click(); }, k); await p.waitForTimeout(250); };

  /* ───── 1. Configurador: sin CP no avanza; V1 en rango ±5 % ───── */
  console.log('1) Configurador');
  await ev(() => { const w = FR.cfg.contentWindow; w.eval(`S.inmueble={tipo:'piso',planta:'1_2',superficie:85,cp:null}`); w.document.getElementById('sup-total').value = '85'; w.document.getElementById('cp').value = ''; w.irPaso2(); });
  let s = await ev(() => { const w = FR.cfg.contentWindow; return { paso: w.eval('S.paso'), err: w.document.getElementById('err-cp').textContent }; });
  chk('sin código postal no se puede continuar', s.paso === 1 && /código postal/i.test(s.err), s);
  await ev(() => {
    const w = FR.cfg.contentWindow; const ids = ['bano_1', 'cocina', 'salon', 'habitacion_1'];
    w.eval(`S.inmueble={tipo:'piso',planta:'1_2',superficie:85,cp:'28027'};S.espacios=${JSON.stringify(ids)};`);
    const cfgE = {
      bano_1: { m2: 6, trabajos: ['cambiar_suelo', 'cambiar_baldosas', 'instalar_ducha', 'pintar_paredes', 'renovar_electricidad'], cantUd: { renovar_electricidad: 5 }, mlOvr: {}, demolicionEstados: [], tabiquesConfig: [], ventanasConfig: [], pinturaConMuebles: false, notas: 'Baño pequeño' },
      cocina: { m2: 12, trabajos: ['instalar_muebles', 'encimera', 'alicatar_paredes', 'redistribucion_tabiques', 'puntos_de_luz'], cantUd: { redistribucion_tabiques: 1, puntos_de_luz: 6 }, mlOvr: { instalar_muebles: 4.5, encimera: 3 }, tabiquesConfig: [{ accion: 'demoler_levantar', material: 'pladur', ml: 3 }], ventanasConfig: [], demolicionEstados: [], notas: '' },
      salon: { m2: 25, trabajos: ['cambiar_suelo', 'pintar_paredes', 'cambiar_ventana'], cantUd: {}, mlOvr: {}, ventanasConfig: [{ apertura: 'corredera', vidrio: 'doble', ancho: 1.8 }], tabiquesConfig: [], demolicionEstados: [], pinturaConMuebles: true, notas: '' },
      habitacion_1: { m2: 12, trabajos: ['falso_techo', 'radiadores'], cantUd: { radiadores: 2 }, mlOvr: {}, tabiquesConfig: [], ventanasConfig: [], demolicionEstados: [], notas: '' }
    };
    for (const id of ids) w.eval(`S.cfgEspacios['${id}']=${JSON.stringify(cfgE[id])}`);
    w.eval(`S.resultado=calcularLocal()`); w.calcularYMostrar(); w.document.getElementById('c-nom').value = 'Laura Martín'; w.document.getElementById('c-email').value = 'laura@ejemplo.es'; w.document.getElementById('c-tel').value = '612 345 678';
    return w.enviarSolicitud();
  });
  await tick();
  s = await ev(() => { const c = casoActivo(); const a = FR.adm.contentWindow; const g = a.rangoVersion(c.versiones[0]); return { est: c.estado, rango: !g.exacto, lo: g.lo, hi: g.hi, tot: c.versiones[0].totales.total, cfgTxt: FR.cfg.contentWindow.document.getElementById('exito-detalle').innerText }; });
  chk('la V1 llega al admin como rango ±5 % (y el configurador lo muestra como «Entre X € y Y €»)', s.est === 'recibida' && s.rango && Math.abs(s.lo - s.tot * 0.95) <= 1 && Math.abs(s.hi - s.tot * 1.05) <= 1 && /entre/i.test(s.cfgTxt), s);

  /* ───── 2. Admin propone visita ───── */
  console.log('2) Admin: proponer visita');
  await ev(() => { const a = FR.adm.contentWindow; const id = Proto.ref; a.exitProponerVisita(id); a.toggleFranja(0); a.toggleFranja(1); a.confirmarProponer(id); });
  await tick();
  s = await ev(() => { const c = casoActivo(); return { est: c.estado, msg: c.mensajes.map(m => m.texto).some(t => /completes los datos de tu vivienda/.test(t) && /anatoliyreformas\.es\/c\//.test(t)) }; });
  chk('visita propuesta y mensaje «Completa tus datos» con el enlace al panel', s.est === 'visita_propuesta' && s.msg, s);

  /* ───── 3. Cliente: datos de la vivienda ───── */
  console.log('3) Cliente: datos y elegir fecha');
  s = await ev(() => { const S = FR.cli.contentWindow.__P.S(); return { ok: S.req.elegir_franja.ok, faltan: S.req.elegir_franja.faltan.length }; });
  chk('elegir fecha sin datos de la vivienda está bloqueado, con motivo', s.ok === false && s.faltan >= 4, s);
  await ev(() => { FR.cli.contentWindow.ir('visita'); }); await p.waitForTimeout(250);
  await ev(() => {
    const w = FR.cli.contentWindow; const set = (id, v) => { w.document.getElementById(id).value = v; };
    set('dv-calle', 'Calle de Alcalá'); set('dv-numero', '245'); set('dv-piso', '4º'); set('dv-puerta', 'B'); set('dv-cp', '28027'); set('dv-loc', 'Madrid');
    w.document.querySelector('input[name=dv-reg][value=inquilino]').checked = true; set('dv-anio', '1978'); set('dv-inicio', FR.adm.contentWindow.rel(25));
    w.document.querySelector('input[name=dv-hab][value=no]').checked = true; w.dvUpd(); w.guardarDatos();
  });
  await tick();
  s = await ev(() => { const S = FR.cli.contentWindow.__P.S(); return { ok: S.req.elegir_franja.ok, faltan: S.req.elegir_franja.faltan.map(f => f.id) }; });
  chk('ubicación exacta + inquilino: sigue bloqueado hasta confirmar el permiso del propietario', s.ok === false && s.faltan.join() === 'permiso', s);
  await ev(() => { const w = FR.cli.contentWindow; w.abrirDatos(); w.document.querySelector('#sheet #dv-permiso').checked = true; w.dvUpd(); w.guardarDatos(); });
  await tick();
  await ev(() => { const w = FR.cli.contentWindow; w.eval('UI.slot=0'); w.confirmarVisita(); });
  await tick();
  s = await ev(() => { const c = casoActivo(); const a = FR.adm.contentWindow; return { est: c.estado, cobro: c.visita.cobro.estado, res: a.estadoReserva(c, a.ahoraMs()).activa }; });
  chk('fecha elegida: la visita queda confirmada con el hueco reservado a la espera del pago', s.est === 'visita_confirmada' && s.cobro === 'pendiente_pago' && s.res, s);

  /* ───── 4. Pago de la visita con justificante ───── */
  console.log('4) Pago de la visita');
  await ev(async () => { const w = FR.cli.contentWindow; w.ir('visita'); const id = await Proto.adjuntos.put('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', { nombre: 'justificante.png', tipo: 'image/png', casoId: Proto.ref, origen: 'cliente' }); w.eval('UI.pagoV.adjuntoId=' + JSON.stringify(id)); w.pvActualiza(); w.pagarVisita(); });
  await tick();
  s = await ev(() => { const c = casoActivo(); const db = FR.adm.contentWindow.__P.db(); return { cobro: c.visita.cobro.estado, cola: db.avisosPago.filter(a => a.casoId === c.id && a.estado === 'pendiente').length }; });
  chk('justificante enviado: aparece en la cola «Cobros por confirmar» del admin', s.cobro === 'justificante_enviado' && s.cola === 1, s);
  await ev(() => { const a = FR.adm.contentWindow; const db = a.__P.db(); const av = db.avisosPago.find(x => x.casoId === Proto.ref && x.estado === 'pendiente'); a.avisoConfirmarModal(av.id); a.avisoConfirmarOk(av.id); });
  await tick();
  s = await ev(() => { const c = casoActivo(); const db = FR.adm.contentWindow.__P.db(); const m = db.cobros.find(x => x.casoId === c.id && x.tipo === 'visita'); return { cobro: c.visita.cobro.estado, just: !!(m && m.justificanteId) }; });
  chk('el reformista ve el justificante y confirma el cobro (movimiento con justificante)', s.cobro === 'cobrada' && s.just, s);

  /* ───── 5. Lite: histórico, lo que pidió el cliente, medidas y tabique ───── */
  console.log('5) Lite: visita técnica');
  await verTab('lite'); await p.waitForTimeout(300);
  s = await ev(() => { const d = FR.lite.contentWindow.document; return { txt: d.getElementById('card-versiones') ? d.getElementById('card-versiones').innerText : '', datos: !!d.getElementById('card-datos'), modo: !!d.getElementById('modo-visita') && !!d.getElementById('modo-obra') }; });
  chk('primera pantalla: selector Visita/Obra y bloque «Versiones» con V1 (rango), V2 y el borrador V3', s.modo && /V1/.test(s.txt) && /entre/.test(s.txt) && /V2/.test(s.txt) && /V3/.test(s.txt) && /borrador/i.test(s.txt), s);
  chk('R-25 el lite enseña el estado de los datos del cliente (sin pedir datos fiscales)', s.datos, s);
  await shot('lite_01_inicio');
  const L = f => ev(f);
  await ev(() => { const L = FR.lite.contentWindow; const S = L.__P.S(); const e = S.est.find(x => x.nombre.toLowerCase().includes('baño')) || S.est[0]; L.ir('room', e.id); });
  await p.waitForTimeout(250);
  s = await ev(() => { const L = FR.lite.contentWindow; const d = L.document; return { pidio: [...d.querySelectorAll('.pidio')].map(x => x.innerText).join('\n'), sup: !!d.getElementById('card-sup'), par: !!d.getElementById('card-paredes') }; });
  chk('«Lo que pidió el cliente»: puntos de luz/enchufes de la instalación eléctrica (5)', /Puntos de luz, enchufes y mecanismos[\s\S]*5/.test(s.pidio), s.pidio);
  await shot('lite_02_estancia_bano');
  // medir ancho × largo, alto, huecos y reparto
  await ev(() => { const L = FR.lite.contentWindow; const d = L.document; const e = L.curRoom();
    d.getElementById('med-ancho').value = '1,60'; d.getElementById('med-largo').value = '2,40'; L.medirSup(e.id);
    d.getElementById('par-alto').value = '2,50'; L.setAlto(e.id, '2,50');
    d.getElementById('hu-a').value = '0,80'; d.getElementById('hu-h').value = '2'; L.addHueco(e.id, 'puerta');
    L.setReparto(e.id, 'hAlic', '1.5'); });
  s = await ev(() => { const L = FR.lite.contentWindow; const e = L.curRoom(); const P = L.paredesDe(e); const g = (bk) => { const t = e.trabajos.find(x => x.bk === bk && !x.quitado); return t ? t.cant : null; }; return { m2: e.m2, alic: P.alic, pint: P.pint, netas: P.netas, tAlic: g('m2_pared_alicatado'), tPint: g('m2_pared_pintura'), suelo: g('m2_suelo') }; });
  chk('ancho × largo = 3,84 m² y se recalculan las partidas de suelo', s.m2 === 3.84 && s.suelo === 3.84, s);
  chk('paredes (caso A del apéndice): netas 18,40, alicatado 11,04 m² y pintura 7,36 m² en las partidas', s.netas === 18.4 && s.alic === 11.04 && s.pint === 7.36 && s.tAlic === 11.04 && s.tPint === 7.36, s);
  await shot('lite_03_medidas_paredes');
  // tabique con estancia contigua
  await ev(() => { const L = FR.lite.contentWindow; const S = L.__P.S(); const e = S.est.find(x => x.nombre.toLowerCase().includes('cocina')); L.ir('room', e.id); });
  await p.waitForTimeout(250);
  s = await ev(() => { const d = FR.lite.contentWindow.document; return { btn: [...d.querySelectorAll('button')].some(b => /Medir tabique/.test(b.innerText)), pidio: [...d.querySelectorAll('.pidio')].map(x => x.innerText).join('\n') }; });
  chk('la cocina enseña lo que pidió el cliente sobre el tabique y el botón «Medir tabique»', s.btn && /Derribar y levantar/.test(s.pidio) && /Pladur/.test(s.pidio), s);
  await ev(() => { const L = FR.lite.contentWindow; const e = L.curRoom(); const t = e.trabajos.find(x => x.key === 'redistribucion_tabiques'); L.abrirTabique(e.id, t.id); });
  await p.waitForTimeout(200); await shot('lite_04_tabique');
  await ev(() => { const L = FR.lite.contentWindow; const d = L.document; const S = L.__P.S(); const sal = S.est.find(x => x.nombre.toLowerCase().includes('salón') || x.nombre.toLowerCase().includes('salon')); d.getElementById('tb-l').value = '3'; d.getElementById('tb-h').value = '2,5'; d.getElementById('tb-c').value = sal.id; L.tbContigua(sal.id); L.guardarTabique(); L.confirmarTabique(true); });
  s = await ev(() => { const L = FR.lite.contentWindow; const S = L.__P.S(); const co = S.est.find(x => x.nombre.toLowerCase().includes('cocina')); const sa = S.est.find(x => x.nombre.toLowerCase().includes('sal')); const tb = S.tabiques[0]; const t = co.trabajos.find(x => x.key === 'redistribucion_tabiques'); const rep = sa.trabajos.find(x => /Reponer/.test(x.nota)); return { n: S.tabiques.length, m2: tb && tb.m2, contigua: tb && tb.contiguaId === sa.id, linea: t.cant + ' ' + t.u, repone: !!rep, visSala: L.cardTabiques(sa).includes('Tabique compartido con') && L.cardTabiques(co).includes('Tabique compartido con') }; });
  chk('tabique medido 3 × 2,5 = 7,5 m², compartido y visible en ambas estancias; su línea usa los m² medidos', s.n === 1 && s.m2 === 7.5 && s.contigua && s.linea === '7.5 m²' && s.visSala, s);
  chk('al tirar el tabique se añade la reposición del acabado en la estancia contigua', s.repone, s);

  console.log('PARTE1 ok=' + ok + ' ko=' + ko); console.log('Errores de consola:', errs.slice(0, 8));
  await b.close(); process.exit(ko ? 1 : 0);
})();

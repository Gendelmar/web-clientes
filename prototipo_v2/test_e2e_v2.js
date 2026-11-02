/* Escenario de punta a punta del apartado 11.2 (R-37) sobre Prototipo_completo_v2.html
   Uso: node prototipo_v2/test_e2e_v2.js            (requiere Playwright)
        E2E_SHOTS=/ruta/capturas node prototipo_v2/test_e2e_v2.js   (además guarda capturas en 1360x860, 820x1180 y 400x820 de las pantallas nuevas del lite) */
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const SHOTS = process.env.E2E_SHOTS || '';
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1360, height: 860 }, acceptDownloads: true }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/^✗/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 300)); });
  await p.goto('file://' + path.resolve(__dirname, '..') + '/Prototipo_completo_v2.html'); await p.waitForTimeout(2500);
  const ev = (f, a) => p.evaluate(f, a); let ok = 0, ko = 0;
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

  /* ───── 6. Borrador de la V3 sincronizado con el admin ───── */
  console.log('6) Borrador V3');
  await ev(() => { const L = FR.lite.contentWindow; L.guardarYSalir(); });
  await tick();
  s = await ev(() => { const c = casoActivo(); const b = c.borrador; const a = FR.adm.contentWindow; return { b: !!b, origen: b && b.origen, v3: b && b.v3id, nl: b && b.lineas.length, tab: b && b.tabiques.length, med: b && Object.keys(b.medidas || {}).length, plan: b && b.planCobros.length, hitos: b && b.hitosPlan.length, rev: b && b.rev, urg: a.urgenteHoy(a.__P.db(), a.__P.db().cfg, a.hoy()).some(x => x.tipo === 'borrador' && x.casoId === c.id) }; });
  chk('«Guardar borrador» envía el borrador completo al admin (caso.borrador: líneas, tabiques, medidas, plan e hitos)', s.b && s.origen === 'lite' && s.v3 === 'V3' && s.nl >= 12 && s.tab === 1 && s.med >= 1 && s.plan === 3 && s.hitos >= 3, s);
  chk('el borrador aparece en el Resumen («Urgente hoy»)', s.urg, s);
  await ev(() => { const a = FR.adm.contentWindow; const c = casoActivo(); a.abrirCaso(c.id); a.eval("_fichaTab='presupuesto'"); a.renderFicha(); });
  s = await ev(() => { const a = FR.adm.contentWindow; const t = a.document.getElementById('main-modal-body').textContent; return { t: /Borrador V3 \(desde la visita\)/.test(t), pend: /Pendiente de enviar/.test(t), btn: !!a.document.getElementById('bor-reabrir'), plan: /Plan de cobros del caso/.test(t), tab: /Tabiques medidos/.test(t) }; });
  chk('la ficha del caso (pestaña Presupuesto) muestra «Borrador V3 (desde la visita)» pendiente de enviar', s.t && s.pend && s.btn && s.plan && s.tab, s);
  s = await ev(() => { const a = FR.adm.contentWindow; a.closeAllModals(); const c = casoActivo(); return a.casoCardHtml(c).includes('Borrador V3') && a.filaBandeja(c).includes('Borrador V3'); });
  chk('y en las listas de Presupuestos (chip «Borrador V3»)', s === true, s);
  // reabrir desde el admin y seguir: el estado de la visita se conserva
  await ev(() => { const L = FR.lite.contentWindow; L.eval("S.est.forEach(e=>{e.revisada=true;})"); L.__P.S().general = 'Cliente muy amable'; });
  await ev(() => { const a = FR.adm.contentWindow; a.reabrirBorradorEnLite(Proto.ref); });
  await p.waitForTimeout(300);
  s = await ev(() => { const S = FR.lite.contentWindow.__P.S(); const co = S.est.find(x => /cocina/i.test(x.nombre)); const ba = S.est.find(x => /baño/i.test(x.nombre)); return { tab: S.tabiques.length, med: !!(ba.med && ba.med.activa), m2: ba.m2, linea: co.trabajos.find(x => x.key === 'redistribucion_tabiques').cant, rev: S.borradorRev, tabActiva: Proto.tab }; });
  chk('«Reabrir en el lite» recupera el borrador (medidas, tabique, m² del baño) y sigue en el mismo punto', s.tab === 1 && s.med && s.m2 === 3.84 && s.linea === 7.5 && s.rev >= 1 && s.tabActiva === 'lite', s);
  // la última modificación prevalece: el admin edita; el lite avisa antes de sobrescribir
  await ev(() => { const a = FR.adm.contentWindow; const c = casoActivo(); a.tocarBorrador(c, 'admin'); });
  s = await ev(() => { const L = FR.lite.contentWindow; const rs = L.guardarBorrador(true); return { conflicto: !!(rs && rs.conflicto), sheet: L.document.getElementById('sheet').innerText }; });
  chk('si el admin modificó el borrador después, el lite avisa con la fecha y no sobrescribe sin confirmar', s.conflicto && /Sobrescribir/.test(s.sheet) && /\d{4}-\d{2}-\d{2}/.test(s.sheet), s);
  s = await ev(() => { const L = FR.lite.contentWindow; L.cerrarSheet(); const rs = L.guardarBorrador(true, true); return { ok: !!(rs && rs.ok), rev: rs && rs.rev }; });
  chk('al confirmar, prevalece la última modificación (la del lite)', s.ok && s.rev >= 3, s);

  /* ───── 7. Pantalla final: desglose, plan de cobros, negociación; enviar V3 ───── */
  console.log('7) Pantalla final y envío de la V3');
  await ev(() => { FR.lite.contentWindow.ir('send'); }); await p.waitForTimeout(250);
  s = await ev(() => { const d = FR.lite.contentWindow.document; return { arbol: d.querySelectorAll('#card-desglose details.tree').length, txt: d.getElementById('card-desglose').textContent, plan: !!d.getElementById('card-plan'), neg: !!d.getElementById('card-neg'), ben: /Tu beneficio/i.test(d.getElementById('box-ben').textContent) }; });
  chk('desglose desplegable estancia → trabajo → partidas con cantidad, unidad, precio y subtotal', s.arbol >= 8 && /Mano de obra/.test(s.txt) && /Materiales|Mano de obra/.test(s.txt) && /×/.test(s.txt) && s.plan && s.neg, s);
  chk('vista «Tu beneficio» solo para el reformista', s.ben, s);
  await shot('lite_05_pantalla_final');
  // hitos y plan: renombrar hito, cambiar días y porcentajes (suma 100, último = resto)
  const antes = await ev(() => { const L = FR.lite.contentWindow; const S = L.__P.S(); return { total: L.eval('TOT()').total, v2: S.v2.total }; });
  await ev(() => { const L = FR.lite.contentWindow; const S = L.__P.S(); const h = S.hitosPlan[1]; L.hitoPlanSet(h.id, 'nombre', 'Instalaciones eléctricas'); L.hitoPlanSet(h.id, 'dias', '4'); L.tramoSet(S.planCobros[0].id, 'pct', '40'); L.tramoSet(S.planCobros[1].id, 'pct', '20'); });
  s = await ev(() => { const L = FR.lite.contentWindow; const S = L.__P.S(); const pl = L.importesPlan(S.planCobros, L.eval('TOT()').total); return { cuando: S.planCobros[1].cuando, pcts: pl.map(t => t.pct).join('/'), suma: Math.round(pl.reduce((a, t) => a + t.importe, 0) * 100) / 100, total: L.eval('TOT()').total, resto: pl[2].resto, ok: L.validarPlanL(S.planCobros, S.hitosPlan).ok }; });
  chk('plan editable: al renombrar el hito se actualiza el disparador; 40/20 y el último tramo es el resto (40 %)', s.cuando === 'hito:Instalaciones eléctricas' && s.pcts === '40/20/40' && s.suma === s.total && s.resto && s.ok, s);
  // eliminar un hito que dispara un cobro obliga a reasignarlo
  await ev(() => { const L = FR.lite.contentWindow; const S = L.__P.S(); L.hitoPlanDel(S.hitosPlan[1].id); });
  s = await ev(() => { const d = FR.lite.contentWindow.document; return { sheet: d.getElementById('sheet').innerText, sel: !!d.getElementById('re-cuando'), n: FR.lite.contentWindow.__P.S().hitosPlan.length }; });
  chk('eliminar un hito que dispara un tramo pide reasignarlo antes (no se elimina todavía)', s.sel && /dispara un cobro/.test(s.sheet) && s.n === 8, s);
  await ev(() => { const L = FR.lite.contentWindow; L.cerrarSheet(); });
  // margen, descuento, imprevistos y redondeo en vivo
  await ev(() => { const L = FR.lite.contentWindow; L.negVivo('margen', '25'); L.negVivo('descuento', '5'); L.negVivo('imprevistosPct', '2'); L.negConfirma('redondeo', '10'); });
  s = await ev(() => { const L = FR.lite.contentWindow; const S = L.__P.S(); const t = L.eval('TOT()'); const d = L.document; return { total: t.total, desc: t.descuento, imp: t.imprevistos, red: t.total % 10, tot: d.getElementById('box-tot').innerText, ben: d.getElementById('box-ben').innerText, v2: S.v2.total }; });
  chk('margen 25 %, descuento 5 %, imprevistos 2 % y redondeo a 10 €: se recalcula en vivo (línea Descuento e Imprevistos)', s.desc > 0 && s.imp > 0 && s.red === 0 && /Descuento/i.test(s.tot) && /Imprevistos/i.test(s.tot) && s.v2 === antes.v2, s);
  await shot('lite_06_negociacion');
  // A10: aviso (no bloqueo) por estancias sin medir; enviar
  await ev(() => { const L = FR.lite.contentWindow; const S = L.__P.S(); S.est.forEach(e => { e.revisada = true; e.trabajos.forEach(t => { if (!t.quitado) t.confirmado = true; }); }); L.abrirEnvio(); });
  s = await ev(() => FR.lite.contentWindow.document.getElementById('sheet').innerText);
  chk('al enviar avisa de las estancias sin medir (A10: aviso, no bloqueo)', /sin medir/.test(s), s);
  await ev(() => { FR.lite.contentWindow.confirmarEnvio(); });
  await tick();
  s = await ev(() => { const c = casoActivo(); const v = c.versiones.find(x => x.estado === 'vigente'); const S = FR.cli.contentWindow.__P.S(); const v3 = S.versiones.find(x => x.id === 'V3'); return { est: c.estado, vig: v && v.id, tipo: v && v.tipo, dto: v && v.totales.descuento, plan: v && v.planCobros && v.planCobros.map(t => t.pct).join('/'), hitos: v && v.hitosPlan && v.hitosPlan.map(h => h.nombre).join(','), casoPlan: c.planCobros && c.planCobros.length, casoHitos: c.obra.hitosPlan && c.obra.hitosPlan.length, borrador: c.borrador, cliPlan: S.plan.map(t => t.pct + ':' + Math.round(t.importe)).join('/'), cliAj: v3 && v3.aj && v3.aj.descuento > 0, cliTot: FR.cli.contentWindow.eval("totalV(S.versiones.find(v=>v.id==='V3'))"), admTot: v && v.totales.total, tabs: v && (v.tabiques || []).length }; });
  chk('V3 enviada: viaja con negociación, plan de cobros (40/20/40) y hitos; pasan a ser los del caso; el borrador desaparece', s.est === 'propuesta_enviada' && s.vig === 'V3' && s.dto > 0 && s.plan === '40/20/40' && /Instalaciones eléctricas/.test(s.hitos) && s.casoPlan === 3 && s.casoHitos === 8 && s.borrador === null && s.tabs === 1, s);
  chk('el cliente ve el plan de cobros ANTES de aceptar y el descuento en la V3; su total coincide con el del admin', /^40:\d+\/20:\d+\/40:\d+$/.test(s.cliPlan) && s.cliAj && Math.abs(s.cliTot - s.admTot) < 0.05, s);

  /* ───── 8. Cliente: ve el plan y acepta (facturación) ───── */
  console.log('8) Cliente: aceptar con datos de facturación');
  await ev(() => { FR.cli.contentWindow.ir('presupuesto'); }); await p.waitForTimeout(250);
  s = await ev(() => { const t = FR.cli.contentWindow.document.getElementById('main').textContent; return { plan: !!FR.cli.contentWindow.document.getElementById('plan-pre'), dto: /Descuento/.test(t), imp: /Imprevistos/.test(t), validez: /Validez/.test(t), nav: [...FR.cli.contentWindow.document.querySelectorAll('nav.side .tab')].map(x => x.textContent.replace(/\d+$/, '').trim()) }; });
  chk('antes de aceptar el cliente ve plan de pagos, descuento, imprevistos y validez; sus pestañas: Inicio · Presupuesto · Visita · Mensajes', s.plan && s.dto && s.imp && s.validez && s.nav.length === 4 && /Inicio/.test(s.nav[0]) && /Visita/.test(s.nav[2]) && /Mensajes/.test(s.nav[3]), s);
  await ev(() => { const w = FR.cli.contentWindow; w.abrirAceptar(); w.document.getElementById('ac-p').checked = true; w.document.getElementById('ac-1').checked = true; w.document.getElementById('ac-2').checked = true; w.document.getElementById('ac-c').value = '482913'; w.acCheck(); });
  s = await ev(() => { const w = FR.cli.contentWindow; return { dis: w.document.getElementById('ac-b').disabled, falta: w.document.getElementById('ac-falta').innerText }; });
  chk('aceptar sin facturación: botón bloqueado con la lista de lo que falta', s.dis === true && /nombre/.test(s.falta) && /DNI/.test(s.falta), s);
  await ev(() => { const w = FR.cli.contentWindow; const set = (id, v) => { w.document.getElementById(id).value = v; }; set('fx-nombre', 'Laura Martín'); set('fx-doc', '12345678A'); w.document.getElementById('fx-same').checked = true; w.fxSame(); w.document.querySelector('input[name=fx-uso][value=si]').checked = true; w.acCheck(); });
  s = await ev(() => { const w = FR.cli.contentWindow; return { dis: w.document.getElementById('ac-b').disabled, msg: w.document.getElementById('fx-doc-m').textContent }; });
  chk('DNI con letra de control incorrecta (12345678A): rechazado', s.dis === true && /⚠/.test(s.msg), s);
  await ev(() => { const w = FR.cli.contentWindow; w.document.getElementById('fx-doc').value = '12345678Z'; w.acCheck(); });
  s = await ev(() => { const w = FR.cli.contentWindow; return { dis: w.document.getElementById('ac-b').disabled }; });
  chk('DNI válido (12345678Z): se habilita «Aceptar y firmar»', s.dis === false, s);
  await ev(() => { FR.cli.contentWindow.aceptarOk(); }); await tick();
  s = await ev(() => { const c = casoActivo(); const S = FR.cli.contentWindow.__P.S(); return { est: c.estado, fis: c.fiscal.completos, nif: c.fiscal.nif, nav: [...FR.cli.contentWindow.document.querySelectorAll('nav.side .tab')].map(x => x.textContent.replace(/\d+$/, '').trim()) }; });
  chk('aceptada con facturación completa; ahora las pestañas son Inicio · Presupuesto · Obra · Cuenta · Mensajes', s.est === 'aceptada' && s.fis && s.nif === '12345678Z' && s.nav.length === 5 && /Obra/.test(s.nav[2]) && /Cuenta/.test(s.nav[3]), s);

  /* ───── 9. Señal con justificante e inicio de obra ───── */
  console.log('9) Señal e inicio de obra');
  s = await ev(() => { const a = FR.adm.contentWindow; const c = casoActivo(); const rq = a.requisitos('iniciar_obra', c, {}); return { ok: rq.ok, f: rq.faltan.map(x => x.id) }; });
  chk('A5: iniciar la obra exige la señal confirmada', s.ok === false && s.f.join() === 'senal', s);
  await ev(async () => { const w = FR.cli.contentWindow; const c = casoActivo(); const S = w.__P.S(); const id = await Proto.adjuntos.put('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', { nombre: 'senal.png', tipo: 'image/png', casoId: c.id }); w.abrirAvisoPago(); w.document.getElementById('ap-i').value = String(S.planTramos[0].falta); w.eval('UI.pago.adjuntoId=' + JSON.stringify(id)); w.apCheck(); w.avisoPagoOk(); });
  await tick();
  await ev(() => { const a = FR.adm.contentWindow; const db = a.__P.db(); const av = db.avisosPago.find(x => x.casoId === Proto.ref && x.estado === 'pendiente' && x.tipo === 'plan'); a.avisoConfirmarModal(av.id); a.avisoConfirmarOk(av.id); });
  await tick();
  await ev(() => { const a = FR.adm.contentWindow; const c = casoActivo(); a.abrirCaso(c.id); a.eval("_fichaTab='obra'"); a.renderFicha(); a.obraIniciar(); });
  await tick();
  s = await ev(() => { const c = casoActivo(); const a = FR.adm.contentWindow; return { est: c.estado, hitos: c.obra.hitos.map(h => h.nombre + ':' + h.diasEstimados).join('|'), tr: a.planCobros(c, a.__P.db().cfg, a.__P.db().cobros).map(t => t.estado).join() }; });
  chk('con la señal confirmada la obra arranca, con los hitos y días personalizados del caso (no los de la configuración)', s.est === 'en_obra' && /Instalaciones eléctricas:4/.test(s.hitos) && s.tr.startsWith('cobrado'), s);

  /* ───── 10. Lite modo Obra: hito con foto, incidencia, cambio ───── */
  console.log('10) Lite: modo Obra');
  const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  await verTab('lite');
  await ev(() => { FR.lite.contentWindow.cambiarModo('obra'); }); await p.waitForTimeout(250);
  s = await ev(() => { const d = FR.lite.contentWindow.document; return { sel: d.getElementById('modo-obra').getAttribute('aria-selected'), obra: !!d.getElementById('obra-' + Proto.ref), ov: FR.lite.contentWindow.document.getElementById('proto-vacio').style.display }; });
  chk('el selector Visita/Obra lista las obras activas (incluida la nueva)', s.sel === 'true' && s.obra, s);
  await shot('lite_07_obras');
  await ev(() => { FR.lite.contentWindow.abrirObra(Proto.ref); }); await p.waitForTimeout(250);
  // sin foto no se puede marcar un hito como hecho (ni desde el puente)
  s = await ev(() => { const w = FR.lite.contentWindow; const rs = Proto.liteObra('hito', { casoId: Proto.ref, id: 'H1', estado: 'hecho', adjuntos: [] }); return { ok: rs.ok, err: rs.error, est: casoActivo().obra.hitos[0].estado }; });
  chk('el puente revalida: un hito no se marca como hecho sin foto (configurable)', s.ok === false && /foto/i.test(s.err) && s.est === 'pendiente', s);
  s = await ev(async (PNG) => { const w = FR.lite.contentWindow; w.hitoHechoSheet('H1'); w.eval("_fx.files=[new File([Uint8Array.from(atob('" + PNG + "'), c => c.charCodeAt(0))], 'hito1.png', { type: 'image/png' })]"); w.document.getElementById('hh-nota').value = 'Demolición terminada y escombros retirados'; await w.hitoHechoOk('H1'); const h = casoActivo().obra.hitos[0]; return { est: h.estado, fotos: h.fotos.filter(f => f.adjuntoId).length, nota: h.nota, url: !!Proto.adjuntos.url((h.fotos.find(f => f.adjuntoId) || {}).adjuntoId) }; }, PNG);
  chk('hito marcado como hecho con foto y nota desde el lite', s.est === 'hecho' && s.fotos === 1 && /Demolición/.test(s.nota) && s.url, s);
  await tick();
  s = await ev(() => { const S = FR.cli.contentWindow.__P.S(); const a = FR.adm.contentWindow; const c = casoActivo(); return { cli: S.obra.hitos[0].estado + ':' + S.obra.hitos[0].fotos.length + ':' + /^data:/.test(S.obra.hitos[0].fotos[0].src), admin: a.obraHitos(c, false).includes('mv-thumb') }; });
  chk('el avance llega al admin (miniatura) y al cliente (foto real del hito)', /^hecho:1:true$/.test(s.cli) && s.admin, s);
  await ev(async (PNG) => { const w = FR.lite.contentWindow; w.obraTab('incid'); w.incSheet(); w.eval("_inc.tipo='dano';_inc.gravedad='alta';_inc.bloquea=true;_inc.plazo=true;_inc.coste=false;_inc.visible=true"); w.incPinta(); w.document.getElementById('inc-txt').value = 'Aparece una tubería de plomo oculta en la pared del baño'; w.document.getElementById('inc-dias').value = '2'; w.eval("_fx.files.push(new File([Uint8Array.from(atob('" + PNG + "'), c => c.charCodeAt(0))], 'inc.png', { type: 'image/png' }))"); await w.incGuardar(); }, PNG);
  await tick();
  s = await ev(() => { const c = casoActivo(); const a = FR.adm.contentWindow; const i = (c.obra.incidencias || [])[0]; const S = FR.cli.contentWindow.__P.S(); const h = c.obra.hitos.find(x => x.estado !== 'hecho'); return { i: i && [i.tipo, i.gravedad, i.bloquea, i.diasRetraso, i.visibleCliente, i.estado, (i.fotos || []).length].join(), salud: a.saludObra(c, a.__P.db().cfg, a.hoy()), admin: a.obraIncidencias(c, false).includes('bloquea'), notif: a.__P.db().notificaciones.some(n => n.tipo === 'incidencia' && !n.resuelta), cli: S.obra.incidencias.length, dias: h && h.diasEstimados }; });
  chk('incidencia (tipo, gravedad alta, bloquea, +2 días, foto) en el admin: salud «bloqueada», notificación, plazo replanificado', s.i === 'dano,alta,true,2,true,abierta,1' && s.salud === 'bloqueada' && s.admin && s.notif && s.dias >= 5, s);
  chk('y visible para el cliente en su pestaña Obra', s.cli === 1, s);
  await shot('lite_08_incidencias');
  await ev(() => { const a = FR.adm.contentWindow; const c = casoActivo(); a.abrirCaso(c.id); a.resolverIncidencia(c, 'I1', 'Se ha cortado y sustituido la tubería'); });
  await ev(async () => { const w = FR.lite.contentWindow; w.obraTab('cambios'); w.cambioSheet(); w.cmModo('coste_margen'); w.document.getElementById('cm-con').value = 'Sustitución de tubería de plomo por multicapa'; w.document.getElementById('cm-cos').value = '1000'; w.cmRes(); await w.cmGuardar(); });
  await tick();
  s = await ev(() => { const c = casoActivo(); const ch = c.obra.cambios[0]; const S = FR.cli.contentWindow.__P.S(); const w = FR.lite.contentWindow; return { ch: ch && [ch.id, ch.importe, ch.modoImporte, ch.coste, ch.estado].join(), cli: S.obra.cambios.map(x => x.id + ':' + x.estado).join(), sheet: w.document.getElementById('sheet').textContent }; });
  chk('cambio con importe «coste + margen» (1.000 € + 22 % = 1.220 €) creado desde el lite; llega al admin y al cliente', s.ch === 'C1,1220,coste_margen,1000,registrado' && /C1:pendiente_cliente/.test(s.cli) && /Umbral de adenda/.test(s.sheet) && /Disparador de adenda/.test(s.sheet), s);
  await shot('lite_09_cambio_ok');
  await ev(() => { FR.lite.contentWindow.cerrarSheet(); FR.lite.contentWindow.obraTab('cuenta'); }); await p.waitForTimeout(200);
  s = await ev(() => { const w = FR.lite.contentWindow; const d = w.document; const a = FR.adm.contentWindow; const c = casoActivo(); return { cuenta: /Total vigente/.test(d.getElementById('cuenta-obra').textContent), btn: !!d.getElementById('gen-adenda'), umbral: d.body.textContent.includes(a.textoUmbral(c, a.__P.db().cfg)) }; });
  chk('cuenta de la obra: total vigente, pendiente de firma frente al umbral (mismo texto que el admin) y atajo «Generar adenda»', s.cuenta && s.btn && s.umbral, s);
  await shot('lite_10_cuenta');

  /* ───── 11. Umbral único, adenda y duda resuelta con «retirar» ───── */
  console.log('11) Umbral, adenda y resolver una duda');
  s = await ev(() => { const a = FR.adm.contentWindow; const c = casoActivo(); const cfg = a.__P.db().cfg; const u = a.umbralAdenda(c, cfg); const pend = a.cambiosPendientes(c).reduce((x, y) => x + y.importe, 0); const iva = a.ivaAceptado(c); return { sin: u.sinIva, con: u.conIva, coh: Math.abs(u.conIva - u.sinIva * (1 + iva / 100)) < 0.011, base: Math.abs(u.sinIva - c.aceptacion.importe / (1 + iva / 100) * cfg.adendaUmbral / 100) < 0.011, trig: a.debeGenerarAdenda(c, cfg, {}).includes('umbral'), pend, igual: (pend >= u.sinIva) === a.debeGenerarAdenda(c, cfg, {}).includes('umbral') }; });
  chk('el aviso (umbral sin IVA y con IVA) y el disparo usan la misma base: dispara si y solo si lo pendiente ≥ umbral sin IVA', s.coh && s.base && s.igual && s.trig, s);
  await ev(() => { const a = FR.adm.contentWindow; const c = casoActivo(); a.altaCambioRapido(c, { modo: 'final', concepto: 'Cambio de grifería del baño', tipo: 'material', importe: 500 }, a.__P.db().cfg); });
  await tick();
  await ev(() => { const w = FR.cli.contentWindow; w.abrirDesacuerdo('C2'); w.document.getElementById('ds-t').value = 'Yo no pedí cambiar la grifería'; w.desacuerdoOk('C2'); });
  await tick();
  s = await ev(() => { const c = casoActivo(); const a = FR.adm.contentWindow; const rq = a.requisitos('resolver_duda', c, { datos: { opcion: 'mantener', nota: '' } }); return { est: c.obra.cambios.find(x => x.id === 'C2').estado, mantenerSinNota: rq.ok, adenda: a.requisitos('generar_adenda', c, {}).ok }; });
  chk('duda del cliente: «mantener» sin nota no se permite (A11) y mientras hay duda no se puede generar la adenda con ese cambio', s.est === 'en_desacuerdo' && s.mantenerSinNota === false, s);
  await ev(() => { const a = FR.adm.contentWindow; const c = casoActivo(); a.abrirCaso(c.id); a.desacuerdoModal('C2'); a.document.querySelector('input[name=da-op][value=retirar]').checked = true; a.daOp('retirar'); a.document.getElementById('da-nota').value = 'Se retira: el cliente prefiere mantener su grifería'; a.desacuerdoOk('C2'); });
  await tick();
  s = await ev(() => { const c = casoActivo(); const a = FR.adm.contentWindow; const ch = c.obra.cambios.find(x => x.id === 'C2'); const S = FR.cli.contentWindow.__P.S(); const tv = a.totalVigente(c); return { est: ch.estado, motivo: ch.motivoRetiro, suma: a.cambiosPendientes(c).map(x => x.id).join(), prov: tv.provisional, esperado: Math.round(1220 * (1 + a.ivaAceptado(c) / 100) * 100) / 100, msg: c.mensajes.some(m => /sobre el cambio «Cambio de grifería del baño»/.test(m.texto) && /retir/.test(m.texto)), cli: S.obra.cambios.find(x => x.id === 'C2').estado, cliRes: !!S.obra.cambios.find(x => x.id === 'C2').resolucion }; });
  chk('resolver con «retirar»: el cambio queda retirado (con motivo), no suma en el total vigente ni en el umbral y se avisa al cliente con la plantilla', s.est === 'retirado' && /Se retira/.test(s.motivo) && s.suma === 'C1' && Math.abs(s.prov - s.esperado) < 0.02 && s.msg && s.cli === 'retirado' && s.cliRes, s);
  // antes de firmar la adenda: se cobran los tramos 1 y 2 para comprobar que el último tramo (el resto) absorbe el cambio firmado
  await ev(() => { const a = FR.adm.contentWindow; const c = casoActivo(); const db = a.__P.db(); const id = Proto.adjuntos.putSync('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', { nombre: 'pago2.png', tipo: 'image/png', casoId: c.id }); const pl = a.planCobros(c, db.cfg, db.cobros); a.marcarHito(c, 'H2', 'hecho', { fotos: 1 }); db.cobros.push({ id: a.uid('cob'), casoId: c.id, fecha: a.hoy(), tipo: 'hito', concepto: pl[1].label, importe: pl[1].falta, medio: 'transferencia', estado: 'cobrado', registradoPor: 'reformista', referencia: 'TR-2', justificanteId: id }); db.cobros.push({ id: a.uid('cob'), casoId: c.id, fecha: a.hoy(), tipo: 'hito', concepto: 'Pago en efectivo de materiales', importe: 100, medio: 'efectivo', estado: 'cobrado', registradoPor: 'reformista', referencia: '' }); });
  await ev(() => { const w = FR.lite.contentWindow; w.obraTab('cuenta'); });
  await ev(() => { FR.lite.contentWindow.generarAdendaL(); }); await tick();
  s = await ev(() => { const c = casoActivo(); return { ad: c.obra.adendas.map(x => x.id + ':' + x.estado + ':' + x.cambios.join('+')).join() }; });
  chk('«Generar adenda» desde la cuenta del lite reutiliza la función del admin (A1 con el cambio C1)', s.ad === 'A1:enviada:C1', s);
  await ev(() => { const w = FR.cli.contentWindow; w.abrirFirmaAdenda('A1'); w.document.getElementById('fa-c').checked = true; w.document.getElementById('fa-n').value = 'Laura Martín'; w.firmarAdendaOk('A1'); });
  await tick();

  /* ───── 12. Plan de cobros: el último tramo es el resto y absorbe el cambio firmado ───── */
  console.log('12) Plan de cobros');
  s = await ev(() => { const c = casoActivo(); const a = FR.adm.contentWindow; const db = a.__P.db(); const pl = a.planCobros(c, db.cfg, db.cobros); const tv = a.totalVigente(c); const S = FR.cli.contentWindow.__P.S(); const base40 = Math.round(c.aceptacion.importe * 0.40 * 100) / 100; return { ad: c.obra.adendas[0].estado, estados: pl.map(t => t.estado).join(), ultimo: pl[2].importe, esperado: Math.round((base40 + tv.adendasFirmadas) * 100) / 100, resto: pl[2].resto, inc: pl[2].incluyeCambios, adIva: tv.adendasFirmadas, suma: Math.round(pl.reduce((x, t) => x + t.importe, 0) * 100) / 100, firmado: tv.firmado, cli: S.planTramos.map(t => Math.round(t.importe)).join('/'), cliInc: S.planTramos[2].incluyeCambios }; });
  chk('adenda firmada tras cobrar los tramos 1 y 2: el último tramo (el resto) = 40 % + el cambio firmado; la suma de tramos = lo firmado', s.ad === 'firmada' && s.estados === 'cobrado,cobrado,pendiente' && Math.abs(s.ultimo - s.esperado) < 0.02 && s.resto && Math.abs(s.inc - s.adIva) < 0.02 && Math.abs(s.suma - s.firmado) < 0.02, s);
  chk('el cliente ve el mismo plan, con «incluye cambios firmados» en el último tramo', s.cliInc > 0 && Math.abs(s.cliInc - s.adIva) < 0.02, s);

  /* ───── 13. Terminar, remates y conformidad (solo el cliente) ───── */
  console.log('13) Terminar y conformidad');
  await ev(() => { const a = FR.adm.contentWindow; const c = casoActivo(); c.obra.hitos.forEach(h => { if (h.estado !== 'hecho') a.marcarHito(c, h.id, 'hecho', { fotos: 1 }); }); a.abrirCaso(c.id); a.obraTerminar(); });
  await tick();
  s = await ev(() => { const c = casoActivo(); return { est: c.estado }; });
  chk('obra terminada (sin cambios sin consolidar; el retirado no cuenta)', s.est === 'terminada', s);
  await ev(() => { const a = FR.adm.contentWindow; a.obraAbrirRemates(); }); await tick();
  s = await ev(() => { const a = FR.adm.contentWindow; const c = casoActivo(); let err = null; try { a.transitar(c, 'cerrada', { autor: 'reformista', texto: 'x' }); } catch (e) { err = e.message; } const html = a.obraCierre(c); return { est: c.estado, err, rq: a.requisitos('cerrar_obra', c, {}).ok, botones: /Registrar conformidad|Cerrar por plazo/.test(html), recl: /Reclamar conformidad/.test(html) }; });
  chk('el admin no puede registrar la conformidad ni cerrar la obra; solo reclamarla', s.est === 'en_remates' && /conformidad expresa del cliente/.test(s.err || '') && s.rq === false && s.botones === false && s.recl, s);
  await ev(() => { const a = FR.adm.contentWindow; const c = casoActivo(); a.abrirCaso(c.id); a.reclamarConformidad(c.id); a.reclamarConformidadOk(c.id); }); await tick();
  s = await ev(() => { const c = casoActivo(); const S = FR.cli.contentWindow.__P.S(); return { est: c.estado, msg: S.chat.some(m => /conformidad/.test(m.t) && m.autor === 'reformista'), entrega: (() => { FR.cli.contentWindow.ir('obra'); return !!FR.cli.contentWindow.document.getElementById('entrega-bloque'); })() }; });
  chk('«Reclamar conformidad» deja el mensaje (plantilla) y sigue en remates; en el cliente la entrega vive dentro de la pestaña Obra', s.est === 'en_remates' && s.msg && s.entrega, s);
  await ev(() => { const w = FR.cli.contentWindow; const S = w.__P.S(); S.obra.cierre.items.forEach(i => w.itemOk(i.id)); w.cerrarObra('Laura Martín', w.eval('SIG_DEMO')); }); await tick();
  s = await ev(() => { const c = casoActivo(); return { est: c.estado, conf: c.obra.cierre.conformidad && c.obra.cierre.conformidad.tipo }; });
  chk('el cliente da la conformidad desde su panel y la obra se cierra', s.est === 'cerrada' && s.conf === 'expresa', s);

  /* ───── 14. Paquete para la gestoría (ZIP) ───── */
  console.log('14) Paquete para la gestoría');
  await ev(() => { const a = FR.adm.contentWindow; const c = casoActivo(); a.abrirCaso(c.id); a.paqueteGestoria(c.id); });
  s = await ev(() => { const a = FR.adm.contentWindow; const t = a.document.getElementById('main-modal-body').textContent; return { aviso: /movimiento\(s\) sin justificante/.test(t), btn: !!a.document.getElementById('paq-zip'), lista: t }; });
  chk('el paquete avisa de los movimientos sin justificante y ofrece el ZIP', s.aviso && s.btn, s.lista.slice(0, 300));
  const [dl] = await Promise.all([p.waitForEvent('download'), ev(() => { FR.adm.contentWindow.document.getElementById('paq-zip').click(); })]);
  const zpath = path.join(SHOTS || require('os').tmpdir(), 'paquete_gestoria.zip'); fs.mkdirSync(path.dirname(zpath), { recursive: true }); await dl.saveAs(zpath);
  const buf = fs.readFileSync(zpath);
  s = await ev((arr) => { const a = FR.adm.contentWindow; const r = a.leerZip(new Uint8Array(arr)); return r.map(x => [x.nombre, x.datos.length, x.crcOk]); }, Array.from(buf));
  chk('ZIP «store» generado a mano: firma PK, CRC32 correctos en todos los archivos', buf.slice(0, 4).toString('hex') === '504b0304' && s.length >= 5 && s.every(x => x[2] === true), s);
  chk('contiene movimientos.csv, resumen_obra.json, la proforma y los justificantes AAAA-MM-DD_REF_importe.ext', ['movimientos.csv', 'resumen_obra.json'].every(n => s.some(x => x[0] === n)) && s.some(x => /^proforma_PF-\d+\.html$/.test(x[0])) && s.filter(x => /^justificantes\/\d{4}-\d{2}-\d{2}_REF-[\w-]+_\d+\.\d{2}\.(png|svg|pdf|jpg)$/.test(x[0])).length >= 3, s.map(x => x[0]));
  s = await ev((arr) => { const a = FR.adm.contentWindow; const r = a.leerZip(new Uint8Array(arr)); const csv = new TextDecoder().decode(r.find(x => x.nombre === 'movimientos.csv').datos); return { sin: (csv.match(/sin justificante/g) || []).length, cab: csv.includes('justificante') }; }, Array.from(buf));
  chk('el CSV lleva la columna «justificante» y marca «sin justificante» el cobro en efectivo', s.cab && s.sin === 1, s);
  s = await ev(() => { const a = FR.adm.contentWindow; const c = casoActivo(); const f0 = c.fiscal; c.fiscal = null; a.closeAllModals(); a.paqueteGestoria(c.id); const t = a.document.getElementById('main-modal-body').textContent; const bloqueado = /Faltan los datos de facturación/.test(t) && !a.document.getElementById('paq-zip'); c.fiscal = f0; a.closeAllModals(); return bloqueado; });
  chk('sin facturación completa el paquete se bloquea (A9)', s === true, s);

  /* ───── 15. Mensajes y notificaciones ───── */
  console.log('15) Mensajes y notificaciones');
  await ev(() => { Proto.cli('mensaje', { t: 'Muchas gracias por todo, ha quedado genial' }); }); await tick();
  s = await ev(() => { const a = FR.adm.contentWindow; const db = a.__P.db(); const c = casoActivo(); const cv = a.conversaciones(db).find(x => x.caso.id === c.id); return { noLeidos: cv && cv.noLeidos, tipos: [...new Set(db.notificaciones.filter(n => n.casoId === c.id).map(n => n.tipo))].sort().join(), cont: a.contadoresMensajes(db).noLeidos }; });
  chk('Mensajes: la conversación del caso tiene no leídos y las notificaciones recogen justificante, incidencia, duda y conformidad', s.noLeidos >= 1 && s.cont >= 1 && ['conformidad', 'duda_cambio', 'incidencia', 'justificante'].every(t => s.tipos.includes(t)), s);
  await ev(() => { const a = FR.adm.contentWindow; const c = casoActivo(); a.escribirMensaje(c, { autor: 'reformista', texto: 'Gracias a ti, Laura. Te dejo el acta en tu panel.' }); a.marcarMensajesLeidos(c, 'adm'); }); await tick();
  s = await ev(() => { const S = FR.cli.contentWindow.__P.S(); const a = FR.adm.contentWindow; return { cli: S.chat.some(m => /Te dejo el acta/.test(m.t) && m.autor === 'reformista'), noLeidos: a.mensajesNoLeidos(casoActivo(), 'adm') }; });
  chk('la respuesta del admin llega a la conversación del cliente y al abrirla se marca como leída', s.cli && s.noLeidos === 0, s);

  /* ───── 16. Configuración: esencial/avanzado y efecto en vivo ───── */
  console.log('16) Configuración');
  await ev(() => { const a = FR.adm.contentWindow; a.eval("cfgModo='esencial'"); a.navegarA('configuracion'); });
  s = await ev(() => { const a = FR.adm.contentWindow; const d = a.document; return { sec: d.querySelectorAll('[id^=cfg-es-]').length, modo: !!d.getElementById('cfg-modo-esencial') && !!d.getElementById('cfg-modo-avanzado'), txt: d.getElementById('pg-configuracion').textContent, nav: [...d.querySelectorAll('.nav-btn')].map(b => b.id).join() }; });
  chk('Configuración «Esencial»: diez parámetros en una página (negocio, presupuesto con horquilla, visita, agenda, plazo, umbral, plan e hitos, medios, mensajes, tipos de obra)', s.sec === 10 && s.modo && /Horquilla de la V1/.test(s.txt) && /Umbral expresado/.test(s.txt), s.sec);
  chk('el admin tiene 7 apartados', s.nav === 'nb-resumen,nb-presupuestos,nb-obras,nb-agenda,nb-mensajes,nb-catalogo,nb-configuracion', s.nav);
  await ev(() => { const a = FR.adm.contentWindow; a.cfgSet('horquillaV1Pct', '10', 'num'); a.cfgSet('adendaUmbral', '10', 'num'); a.navegarA('configuracion'); });
  s = await ev(() => { const a = FR.adm.contentWindow; const db = a.__P.db(); const v1 = db.casos.find(x => x.id === 'REF-0003').versiones[0]; const g = a.rangoVersion(v1); return { pct: Math.round((g.hi - v1.totales.total) / v1.totales.total * 100), um: a.document.getElementById('cfg-umbral-demo').textContent, tm: a.textoUmbral(casoActivo(), db.cfg) }; });
  chk('cambiar la horquilla (5 → 10 %) y el umbral (5 → 10 %) tiene efecto en vivo en V1 y en el texto del umbral', s.pct === 10 && /991,74\s*€ sin IVA \(1\.?200,00\s*€ con IVA\)/.test(s.um), s);
  await ev(() => { const a = FR.adm.contentWindow; a.eval("cfgModo='avanzado'"); a.navegarA('configuracion'); });
  s = await ev(() => FR.adm.contentWindow.document.getElementById('pg-configuracion').textContent);
  chk('«Avanzado» agrupa el resto y los ajustes nuevos', /Restablecer valores por defecto de este grupo/.test(s), s.slice(0, 120));

  console.log('RESULT ok=' + ok + ' ko=' + ko); console.log('Errores de consola:', errs.slice(0, 8));
  await b.close(); process.exit(ko ? 1 : 0);
})();

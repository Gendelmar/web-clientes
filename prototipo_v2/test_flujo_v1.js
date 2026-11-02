const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1360, height: 860 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0, 300)); });
  await p.goto('file://' + require('path').resolve(__dirname,'..') + '/Prototipo_completo_v2.html'); await p.waitForTimeout(2500);
  const ev = (f) => p.evaluate(f);
  let ok = 0, ko = 0; const chk = (n, c, x) => { if (c) ok++; else ko++; console.log((c ? '  ✓ ' : '  ✗ ') + n + (c ? '' : '  → ' + JSON.stringify(x))); };
  const tick = async () => { await ev(() => Proto.tick(true)); await p.waitForTimeout(250); };
  // 1 solicitud
  await ev(() => {
    const w = FR.cfg.contentWindow; const t = { bano_1: 'bano', bano_2: 'bano', cocina: 'cocina', salon: 'salon', habitacion_1: 'habitacion', habitacion_2: 'habitacion' };
    w.eval(`S.inmueble={tipo:'piso',planta:'1_2',superficie:85,cp:'28027'};S.espacios=${JSON.stringify(Object.keys(t))};`);
    for (const [id, tp] of Object.entries(t)) { const keys = w.eval(`Object.keys(TRABAJOS['${tp}']).filter(k=>!/demol|tirar|redistrib|abrir/.test(k)).slice(0,4)`); w.eval(`S.cfgEspacios['${id}']={m2:${tp === 'bano' ? 6 : 12},trabajos:${JSON.stringify(keys)},notas:''}`); }
    w.eval(`S.resultado=calcularLocal()`); w.document.getElementById('c-nom').value = 'Laura Martín'; w.document.getElementById('c-email').value = 'laura@ejemplo.es'; w.document.getElementById('c-tel').value = '612 345 678';
    return w.enviarSolicitud();
  });
  await tick();
  console.log('1) Solicitud');
  let s = await ev(() => { const c = casoActivo(); return { est: c.estado, cli: FR.cli.contentWindow.__P.S().fase, avisos: FR.cli.contentWindow.__P.S().avisos.length, hash: FR.cli.contentWindow.location.hash }; });
  chk('admin recibida', s.est === 'recibida', s); chk('cliente fase recibida + aviso', s.cli === 'recibida' && s.avisos === 1, s);
  // 2 admin triaje + proponer visita
  console.log('2) Admin propone visita');
  await ev(() => { const a = FR.adm.contentWindow; const id = Proto.ref; a.exitProponerVisita(id); a.toggleFranja(0); a.toggleFranja(1); a.confirmarProponer(id); });
  await tick();
  s = await ev(() => { const c = casoActivo(); const S = FR.cli.contentWindow.__P.S(); return { est: c.estado, fr: S.visita.franjas.length, fase: S.fase, vers: S.versiones.map(v => v.id + ':' + v.estado), avisos: S.avisos.map(a => a.tipo) }; });
  chk('admin visita_propuesta', s.est === 'visita_propuesta', s); chk('cliente ve 2 franjas', s.fr === 2 && s.fase === 'visita_propuesta', s); chk('aviso visita', s.avisos.includes('visita'), s);
  // 3 cliente elige
  console.log('3) Cliente elige franja');
  await ev(() => { const w = FR.cli.contentWindow; w.eval('UI.slot=0'); w.confirmarVisita(); });
  await tick();
  s = await ev(() => { const c = casoActivo(); const L = FR.lite.contentWindow.__P; return { est: c.estado, vis: c.visita.estado, lite: L.clave(), badge: document.getElementById('bd-lite').style.display, vac: FR.lite.contentWindow.document.getElementById('proto-vacio').style.display }; });
  chk('admin visita_confirmada', s.est === 'visita_confirmada' && s.vis === 'confirmada', s); chk('Lite cargado', !!s.lite && s.vac === 'none', s);
  // 4 Lite revisa y envía V3
  console.log('4) Lite: visita y V3');
  await ev(() => {
    const L = FR.lite.contentWindow; const S = L.__P.S(); tabLiteHack = null;
    const e0 = S.est[0]; const t0 = e0.trabajos[0]; L.quitar(e0.id, t0.id);
    const e1 = S.est[1]; L.qtySet(e1.id, e1.trabajos[0].id, e1.trabajos[0].cant + 2);
    S.est.forEach(e => { e.revisada = true; e.trabajos.forEach(t => t.confirmado = true); });
    e1.comentarios.push({ id: 'c1', t: 'Humedad en la esquina', f: Date.now() }); e1.fotos.push({ id: 'f1', src: 'data:image/png;base64,iVBORw0KGgo=', cap: '', f: Date.now() });
    L.guardarYa(); L.abrirEnvio(); L.confirmarEnvio();
  });
  await tick();
  s = await ev(() => { const c = casoActivo(); const S = FR.cli.contentWindow.__P.S(); const v = c.versiones.find(x => x.estado === 'vigente'); return { est: c.estado, vig: v && v.id, vtot: v && v.totales.total, fase: S.fase, cv: S.versiones.map(x => x.id + ':' + x.estado), avisos: S.avisos.map(a => a.tipo), cobros: S.cobros.length, notas: c.visita.notas.length, fotos: c.visita.fotos.length }; });
  chk('admin propuesta_enviada V3', s.est === 'propuesta_enviada' && s.vig === 'V3', s); chk('cliente fase propuesta con V3', s.fase === 'propuesta' && s.cv.some(x => x === 'V3:vigente'), s);
  chk('aviso v3 + cobro visita', s.avisos.includes('v3') && s.cobros === 1, s); chk('notas y fotos de visita en admin', s.notas === 1 && s.fotos === 1, s);
  // total consistente cliente vs admin
  const tt = await ev(() => { const S = FR.cli.contentWindow.__P.S(); const w = FR.cli.contentWindow; return { cli: w.eval('totalV(vigente(S))'), adm: casoActivo().versiones.find(x => x.estado === 'vigente').totales.total }; });
  chk('total V3 coincide cliente/admin', Math.abs(tt.cli - tt.adm) < 0.05, tt);
  // 5 cliente acepta
  console.log('5) Cliente acepta');
  await ev(() => { const w = FR.cli.contentWindow; w.abrirAceptar(); w.document.getElementById('ac-1').checked = true; w.document.getElementById('ac-2').checked = true; w.document.getElementById('ac-c').value = '482913'; w.acCheck(); w.aceptarOk(); });
  await tick();
  s = await ev(() => { const c = casoActivo(); const S = FR.cli.contentWindow.__P.S(); return { est: c.estado, ac: c.aceptacion && c.aceptacion.importe, fase: S.fase, acC: S.aceptacion && S.aceptacion.total }; });
  chk('admin aceptada', s.est === 'aceptada' && s.ac > 0, s); chk('cliente aceptada', s.fase === 'aceptada', s);
  // 6 obra
  console.log('6) Obra: hitos, cambios, adenda, cobros');
  await ev(() => { const a = FR.adm.contentWindow; const c = casoActivo(); a.iniciarObra(c, a.__P.db().cfg, a.hoy()); a.marcarHito(c, 'H1', 'hecho', { fotos: 2 }); a.marcarHito(c, 'H2', 'hecho', { fotos: 2 }); a.registrarCambio(c, { concepto: 'Punto de luz extra', importe: 120, tipo: 'alcance' }); a.registrarCambio(c, { concepto: 'Refuerzo de vigueta', importe: 450, tipo: 'imprevisto', bloqueaObra: true }); });
  await tick();
  s = await ev(() => { const S = FR.cli.contentWindow.__P.S(); return { fase: S.fase, h: S.obra.hitos.filter(h => h.estado === 'hecho').length, camb: S.obra.cambios.map(c => c.estado), avisos: S.avisos.map(a => a.tipo), pagos: FR.cli.contentWindow.planPagos(S).map(t => t.estado) }; });
  chk('cliente en obra con 2 hitos hechos', s.fase === 'obra' && s.h === 2, s); chk('2 cambios pendientes del cliente', s.camb.join() === 'pendiente_cliente,pendiente_cliente', s);
  chk('avisos inicio/hito/cambio', ['inicio', 'hito', 'cambio'].every(t => s.avisos.includes(t)), s);
  await ev(() => { const w = FR.cli.contentWindow; const S = w.__P.S(); w.aceptarCambio(S.obra.cambios[0].id); w.abrirDesacuerdo(S.obra.cambios[1].id); w.document.getElementById('ds-t').value = 'Me parece caro'; w.desacuerdoOk(S.obra.cambios[1].id); });
  await tick();
  s = await ev(() => { const c = casoActivo(); return { ch: c.obra.cambios.map(x => x.id + ':' + x.estado + ':' + (x.avisoCliente && x.avisoCliente.aceptadoAt ? 'acept' : '-')) }; });
  chk('admin ve aceptado y desacuerdo', /C1:registrado:acept/.test(s.ch.join()) && /C2:en_desacuerdo/.test(s.ch.join()), s);
  await ev(() => { const a = FR.adm.contentWindow; const c = casoActivo(); a.crearAdenda(c, ['C1'], 'manual'); });
  await tick();
  s = await ev(() => { const S = FR.cli.contentWindow.__P.S(); return { ad: S.obra.adendas.map(x => x.id + ':' + x.estado), av: S.avisos.map(a => a.tipo) }; });
  chk('cliente ve adenda por firmar', s.ad.join() === 'A1:por_firmar' && s.av.includes('adenda'), s);
  await ev(() => { const w = FR.cli.contentWindow; w.abrirFirmaAdenda('A1'); w.document.getElementById('fa-c').checked = true; w.document.getElementById('fa-n').value = 'Laura Martín'; w.firmarAdendaOk('A1'); });
  await tick();
  s = await ev(() => { const c = casoActivo(); const S = FR.cli.contentWindow.__P.S(); const a = FR.adm.contentWindow; return { ad: c.obra.adendas[0].estado, cs: c.obra.cambios.map(x => x.estado), cliAd: S.obra.adendas[0].estado, tv: a.totalVigente(c).total, tvc: FR.cli.contentWindow.totalVigente(S).total }; });
  chk('adenda firmada en admin y cliente', s.ad === 'firmada' && s.cliAd === 'firmada' && s.cs[0] === 'consolidado', s);
  chk('total vigente coincide', Math.abs(s.tv - s.tvc) < 0.5, s);
  // cobro de aceptación
  await ev(() => { const a = FR.adm.contentWindow; const db = a.__P.db(); const c = casoActivo(); db.cobros.push({ id: 'cobT1', casoId: c.id, importe: 3000, concepto: 'Señal al aceptar', fecha: a.hoy(), estado: 'cobrado', metodo: 'transferencia', tipo: 'plan' }); });
  await tick();
  s = await ev(() => { const S = FR.cli.contentWindow.__P.S(); return { cob: S.cobros.length, tot: FR.cli.contentWindow.cobrado(S) }; });
  chk('cliente ve cobros', s.cob === 2, s);
  // solicitud de cambio del cliente en obra
  await ev(() => { const w = FR.cli.contentWindow; w.abrirPedirCambioObra(); w.document.getElementById('po-t').value = 'Un enchufe más en cocina'; w.enviarCambioObra(); });
  await tick();
  s = await ev(() => ({ sol: casoActivo().obra.solicitudesCambio.map(x => x.texto) }));
  chk('solicitud del cliente llega al admin', s.sol.length === 1, s);
  // 7 terminar obra
  console.log('7) Terminar obra y remates');
  await ev(() => { const a = FR.adm.contentWindow; const c = casoActivo(); a.marcarHito(c, 'H1', 'hecho'); c.obra.hitos.forEach(h => a.marcarHito(c, h.id, 'hecho', { fotos: 1 })); a.resolverDesacuerdo(c, 'C2', 'ajustar', 300); a.crearAdenda(c, ['C2'], 'cierre'); });
  await tick();
  await ev(() => { const w = FR.cli.contentWindow; w.abrirFirmaAdenda('A2'); w.document.getElementById('fa-c').checked = true; w.document.getElementById('fa-n').value = 'Laura Martín'; w.firmarAdendaOk('A2'); });
  await tick();
  s = await ev(() => { const a = FR.adm.contentWindow; const c = casoActivo(); const pt = a.puedeTerminarObra(c); if (pt.ok) { c.obra.cierre = Object.assign({ conformidad: null, actaId: null }, c.obra.cierre, { terminadaAt: a.hoy() }); a.transitar(c, 'terminada', { autor: 'reformista', texto: 'Obra terminada' }); a.transitar(c, 'en_remates', { autor: 'reformista', texto: 'Fase de remates abierta' }); } return { pt, est: c.estado }; });
  await tick();
  chk('admin en remates', s.est === 'en_remates', s);
  s = await ev(() => { const S = FR.cli.contentWindow.__P.S(); return { fase: S.fase, items: S.obra.cierre && S.obra.cierre.items.length, av: S.avisos.map(a => a.tipo).includes('terminada') }; });
  chk('cliente en remates con checklist', s.fase === 'remates' && s.items > 5 && s.av, s);
  // cliente marca un problema
  await ev(() => { const w = FR.cli.contentWindow; const S = w.__P.S(); const it = S.obra.cierre.items[0]; w.abrirProblema(it.id); w.document.getElementById('pr-t').value = 'Rozadura en la pared'; w.problemaOk(it.id); });
  await tick();
  s = await ev(() => { const c = casoActivo(); return { rem: c.obra.remates.map(r => r.estado + ':' + (r.itemId ? 'item' : '-')) }; });
  chk('remate del cliente en admin', s.rem.length === 1 && /abierto:item/.test(s.rem[0]), s);
  // conformidad bloqueada con remate abierto
  await ev(() => { const w = FR.cli.contentWindow; w.cerrarObra('Laura Martín', 'x'); });
  await tick();
  s = await ev(() => ({ est: casoActivo().estado, fase: FR.cli.contentWindow.__P.S().fase }));
  chk('conformidad bloqueada con remates abiertos (admin sigue en remates, cliente vuelve a remates)', s.est === 'en_remates' && s.fase === 'remates', s);
  await ev(() => { const c = casoActivo(); c.obra.remates.forEach(r => r.estado = 'resuelto'); });
  await tick();
  s = await ev(() => { const S = FR.cli.contentWindow.__P.S(); return { it: S.obra.cierre.items[0].estado }; });
  chk('ítem vuelve a revisión tras resolver', s.it === 'pendiente', s);
  await ev(() => { const w = FR.cli.contentWindow; const S = w.__P.S(); S.obra.cierre.items.forEach(i => w.itemOk(i.id)); w.cerrarObra('Laura Martín', w.eval('SIG_DEMO')); });
  await tick();
  s = await ev(() => { const c = casoActivo(); const S = FR.cli.contentWindow.__P.S(); return { est: c.estado, conf: c.obra.cierre.conformidad && c.obra.cierre.conformidad.tipo, fase: S.fase, firma: !!(S.obra.cierre.conformidad && S.obra.cierre.conformidad.firma), g: document.getElementById('gtxt').innerText }; });
  chk('admin cerrada con conformidad expresa', s.est === 'cerrada' && s.conf === 'expresa', s); chk('cliente cerrada con firma', s.fase === 'cerrada' && s.firma, s);
  console.log('guía final:', s.g);
  await p.screenshot({ path: 'p_final.png' });
  console.log('RESULT ok=' + ok + ' ko=' + ko); console.log('errs', errs.slice(0, 8));
  await b.close();
})();

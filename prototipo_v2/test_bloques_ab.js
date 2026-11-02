/* Pruebas de integración de los bloques A y B (R-01…R-15) sobre Prototipo_completo_v2.html
   Uso: node prototipo_v2/test_bloques_ab.js   (requiere Playwright) */
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1360, height: 860 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/^✗/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 300)); });
  await p.goto('file://' + path.resolve(__dirname, '..') + '/Prototipo_completo_v2.html'); await p.waitForTimeout(2500);
  const ev = f => p.evaluate(f); let ok = 0, ko = 0;
  const chk = (n, c, x) => { if (c) ok++; else ko++; console.log((c ? '  ✓ ' : '  ✗ ') + n + (c ? '' : '  → ' + JSON.stringify(x))); };
  const tick = async () => { await ev(() => Proto.tick(true)); await p.waitForTimeout(250); };
  const IMG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  console.log('R-13 · servicio de adjuntos');
  let s;
  s = await p.evaluate(`(async()=>{ const A=Proto.adjuntos; await A.listo(); const id=A.putSync(${JSON.stringify(IMG)},{nombre:'a.png',tipo:'image/png',casoId:'REF-T'}); const l=A.lista('REF-T').length; const g=await A.get(id); A.del(id); return {id, url:!!A.url(id), l, g:!!g, despues:A.lista('REF-T').length, modo:A.modo()}; })()`);
  chk('put/get/del/lista con meta {nombre,tipo,tam,casoId,origen,fecha}', s.l === 1 && s.g && s.despues === 0 && s.url === false, s);
  chk('IndexedDB disponible (si no, respaldo en memoria con aviso)', ['indexeddb', 'memoria'].includes(s.modo), s);
  s = await p.evaluate(`(async()=>{ const A=Proto.adjuntos; const r={}; try{ await A.put(new File(['x'],'a.exe',{type:'application/x-msdownload'}),{}); }catch(e){ r.tipo=e.message; } try{ await A.put(new File([new Uint8Array(5*1024*1024+10)],'g.pdf',{type:'application/pdf'}),{}); }catch(e){ r.tam=e.message; }
    const c=document.createElement('canvas'); c.width=3200; c.height=2400; c.getContext('2d').fillRect(0,0,3200,2400); const blob=await new Promise(res=>c.toBlob(res,'image/png')); const f=new File([blob],'foto.png',{type:'image/png'}); const id=await A.put(f,{casoId:'REF-T'}); const im=new Image(); await new Promise(res=>{ im.onload=res; im.src=A.url(id); }); r.w=im.naturalWidth; r.h=im.naturalHeight; r.meta=A.meta(id); return r; })()`);
  chk('rechaza formatos no admitidos y archivos de más de 5 MB', /Formato no admitido/.test(s.tipo) && /5 MB/.test(s.tam), s);
  chk('las imágenes se comprimen a un máximo de 1600 px', s.w === 1600 && s.h === 1200 && s.meta.tipo === 'image/png', s);
  s = await ev(() => { const db = FR.adm.contentWindow.__P.db(); const j = JSON.stringify(db); return { dataEnDB: /data:(image|application)/.test(j), svg: FR.adm.contentWindow.adjuntosDemo().length, lista: Proto.adjuntos.lista('REF-0009').length, urlD1: !!Proto.adjuntos.url('ADJ-D1') }; });
  chk('los adjuntos de ejemplo están en el servicio y la base de datos solo guarda identificadores', s.dataEnDB === false && s.lista >= 3 && s.urlD1, s);

  console.log('R-02 · detalle completo de la solicitud y bases reales');
  await ev(() => {
    const w = FR.cfg.contentWindow; const ids = ['bano_1', 'cocina', 'salon', 'habitacion_1'];
    w.eval(`S.inmueble={tipo:'chalet',planta:'baja',superficie:140,cp:'28224',numPlantasChalet:2};S.espacios=${JSON.stringify(ids)};S.extras=new Set(['sin_ascensor']);S.obraHabitada=true;`);
    const cfgE = {
      bano_1: { m2: 6, trabajos: ['demolicion_completa', 'cambiar_suelo', 'cambiar_baldosas', 'instalar_ducha', 'pintar_paredes', 'renovar_electricidad'], cantUd: { renovar_electricidad: 5 }, mlOvr: {}, demolicionEstado: 'vacia', demolicionEstados: ['vacia'], tabiquesConfig: [], ventanasConfig: [], pinturaConMuebles: false, plantaEspacio: '1', notas: 'Baño pequeño' },
      cocina: { m2: 12, trabajos: ['instalar_muebles', 'encimera', 'alicatar_paredes', 'redistribucion_tabiques'], cantUd: { redistribucion_tabiques: 2 }, mlOvr: { instalar_muebles: 4.5, encimera: 3 }, tabiquesConfig: [{ accion: 'tirar', material: 'ladrillo', ml: 3 }, { accion: 'levantar', material: 'pladur', ml: 2 }], ventanasConfig: [], demolicionEstados: [], notas: '' },
      salon: { m2: 25, trabajos: ['cambiar_suelo', 'pintar_paredes', 'cambiar_ventana', 'puntos_de_luz'], cantUd: { puntos_de_luz: 6 }, mlOvr: {}, ventanasConfig: [{ apertura: 'corredera', vidrio: 'doble', ancho: 1.8 }], tabiquesConfig: [], demolicionEstados: [], pinturaConMuebles: true, notas: '' },
      habitacion_1: { m2: 12, trabajos: ['suelo_radiante', 'falso_techo', 'radiadores', 'ac_split'], cantUd: { radiadores: 2 }, mlOvr: {}, tabiquesConfig: [], ventanasConfig: [], demolicionEstados: [], notas: '' }
    };
    for (const id of ids) w.eval(`S.cfgEspacios['${id}']=${JSON.stringify(cfgE[id])}`);
    w.eval(`S.materialesPorEspacio={salon:{suelo:{prodId:'${w.eval('PRODUCTOS.find(p=>p.cat===\'suelo\'||true).id')}',cantidad:25}}};S.matCompartidos={x:true};`);
    w.calcularYMostrar(); w.document.getElementById('c-nom').value = 'Marta Gil'; w.document.getElementById('c-email').value = 'marta@ejemplo.es'; w.document.getElementById('c-tel').value = '611222333';
    return w.enviarSolicitud();
  });
  await tick();
  s = await ev(() => { const c = casoActivo(); const so = c.solicitud; const tr = k => so.espacios.flatMap(e => e.trabajos).find(t => t.key === k); const li = (k, e) => c.versiones[0].lineas.find(l => l.key === k && l.espacioId === e);
    return { det: Object.keys(so.detalle.espacios), cantUd: so.detalle.espacios.bano_1.cfg.cantUd, tab: so.detalle.espacios.cocina.cfg.tabiquesConfig.length, ml: so.detalle.espacios.cocina.cfg.mlOvr, hab: so.detalle.obraHabitada, tipo: so.detalle.inmueble.tipo, mat: Object.keys(so.detalle.espacios.salon.materiales),
      bases: { suelo: tr('cambiar_suelo').base, pint: tr('pintar_paredes').base, tech: tr('falso_techo').base, ud: tr('instalar_ducha').base, ml: tr('encimera').base, alic: tr('cambiar_baldosas').base, fijo: tr('puntos_de_luz').base },
      detTab: tr('redistribucion_tabiques').detalles, detEl: tr('renovar_electricidad').detalles, detVen: tr('cambiar_ventana').detalles, detPint: tr('pintar_paredes').detalles, detDem: tr('demolicion_completa').detalles,
      linea: li('cambiar_suelo', 'salon'), nTrab: so.espacios.reduce((n, e) => n + e.trabajos.length, 0), todasKeys: c.versiones[0].lineas.filter(l => l.tipo !== 'mat').every(l => !/^cfg_/.test(l.key) || /^cfg_extra_/.test(l.key)), baseFijo: c.versiones[0].lineas.filter(l => l.base === 'fijo' && !/^cfg_extra_/.test(l.key)).length };
  });
  chk('R-02 caso.solicitud.detalle guarda inmueble, extras, obra habitada y el cfg completo de cada estancia', s.det.length === 4 && s.cantUd.renovar_electricidad === 5 && s.tab === 2 && s.ml.instalar_muebles === 4.5 && s.hab === true && s.tipo === 'chalet' && s.mat.length === 1, s);
  chk('R-02 cada trabajo lleva { key, label, base, detalles } con la base real (BASE_POR_TRABAJO)', s.bases.suelo === 'm2_suelo' && s.bases.pint === 'm2_pared_pintura' && s.bases.tech === 'm2_techo' && s.bases.ud === 'ud' && s.bases.ml === 'ml' && s.bases.alic === 'm2_pared_alicatado', s);
  chk('R-02 los detalles son los del trabajo (tabiques, puntos de luz/enchufes, ventanas, pintura, demolición)', s.detTab.cantUd === 2 && s.detTab.tabiquesConfig.length === 2 && s.detEl.cantUd === 5 && s.detVen.ventanasConfig[0].apertura === 'corredera' && s.detPint === undefined ? true : (s.detPint && s.detPint.pinturaConMuebles === false) && s.detDem.demolicionEstado === 'vacia', s);
  chk('R-02 las líneas conservan la key del trabajo, la base real y el precio unitario (ya no todo «fijo»)', s.linea && s.linea.key === 'cambiar_suelo' && s.linea.base === 'm2_suelo' && s.linea.precio > 0 && Math.abs(s.linea.precio * s.linea.cantidad - s.linea.subtotal) < 0.05 && s.todasKeys, s);
  s = await ev(() => { const c = casoActivo(); const a = FR.adm.contentWindow; const v = c.versiones[0]; const S = FR.cli.contentWindow.__P.S(); const w = FR.cfg.contentWindow; return { hq: a.rangoVersion(v), cfgTxt: w.document.getElementById('res-num').textContent, cliRango: S.versiones[0].rango, adm: a.fmtImporteVersion(v), tot: v.totales.total, lo: v.totales.lo, hi: v.totales.hi, aviso: S.avisos[0].parrafos.join(' ') }; });
  chk('R-03 la V1 se ve como rango ±5 % en el configurador, el admin y el cliente (redondeo hacia fuera)', /Entre/.test(s.cfgTxt) && s.hq.exacto === false && s.cliRango && s.cliRango.lo === s.hq.lo && s.cliRango.hi === s.hq.hi && Math.abs(s.hi / s.tot - 1.05) < 0.001 && /–/.test(s.adm) && /entre|a /.test(s.aviso), s);

  console.log('R-03 · V2 exacta y horquilla configurable en vivo');
  await ev(() => { const a = FR.adm.contentWindow; const id = Proto.ref; a.exitProponerVisita(id); a.toggleFranja(0); a.confirmarProponer(id); });
  await tick();
  s = await ev(() => { const S = FR.cli.contentWindow.__P.S(); const v2 = S.versiones.find(v => v.id === 'V2'); return { v2: v2 && { rango: v2.rango, et: v2.etiqueta }, msgs: casoActivo().mensajes.map(m => m.autor + ':' + m.texto.slice(0, 22)) }; });
  chk('R-03 la V2 es un importe exacto etiquetado «Estimación revisada · sujeta a visita»', s.v2 && s.v2.rango === null && s.v2.et === 'Estimación revisada · sujeta a visita', s);
  chk('R-06 al proponer visita queda en la conversación el mensaje «Completa tus datos y elige fecha» y el de las franjas', s.msgs.some(m => /Para preparar la visita técnica/.test(m) || /necesito que completes/.test(m)) || s.msgs.length >= 2, s);
  await ev(() => { FR.adm.contentWindow.cfgSet('horquillaV1Pct', '10', 'num'); });
  await tick(); await p.waitForTimeout(700);
  s = await ev(() => { const a = FR.adm.contentWindow; const c = casoActivo(); const v1 = c.versiones.find(v => v.id === 'V1'); return { pct: FR.cfg.contentWindow.eval('CFG.HORQUILLA_PCT'), ancho: Math.round((v1.totales.hi / v1.totales.total - 1) * 100), cli: FR.cli.contentWindow.__P.S().horquillaPct }; });
  chk('R-03 cambiar la horquilla en Configuración se refleja en vivo (admin, configurador y cliente)', s.pct === 10 && s.ancho === 10 && s.cli === 10, s);
  await ev(() => { FR.adm.contentWindow.cfgSet('horquillaV1Pct', '5', 'num'); });

  console.log('R-06 · «Pedir más info» con campos de la vivienda');
  s = await ev(() => { const a = FR.adm.contentWindow; const id = Proto.ref; const c = casoActivo(); a.exitPedirInfo(id); a.eval("_pedir.campos.regimen=true;_pedir.campos.ubicacion=true;"); a.eval("renderPedir(DB.casos.find(x=>x.id==='" + id + "'))"); const html = a.document.getElementById('main-modal-body').innerText; return { campos: /Ubicación exacta/.test(html) && /Propietario o inquilino/.test(html), msg: /ubicación exacta/.test(a.document.getElementById('msg-preview').textContent) }; });
  chk('R-06 el reformista elige qué campos del R-04 pide y el mensaje los menciona', s.campos && s.msg, s);
  await ev(() => FR.adm.contentWindow.closeAllModals());

  console.log('R-10 · mensajes: el cliente escribe con adjunto, el reformista responde y el cliente lo lee');
  await ev(async () => { const w = FR.cli.contentWindow; const id = await Proto.adjuntos.put('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', { nombre: 'plano.png', tipo: 'image/png', casoId: Proto.ref }); w.ir('mensajes'); w.document.getElementById('chat-t').value = 'Os mando el plano del baño'; w.eval('UI.chatAdj=[' + JSON.stringify(id) + ']'); w.enviarChat(); });
  await tick();
  s = await ev(() => { const a = FR.adm.contentWindow; const c = casoActivo(); const ms = c.mensajes; const u = ms[ms.length - 1]; return { texto: u.texto, autor: u.autor, adj: u.adjuntos.length, noLeidos: a.mensajesNoLeidos(c, 'adm'), notif: a.__P.db().notificaciones.some(n => n.casoId === c.id && n.tipo === 'mensaje'), bub: a.document.getElementById('nbb-mensajes').textContent }; });
  chk('R-10 el mensaje del cliente (con adjunto) llega al caso como no leído por el admin, con notificación y burbuja', s.autor === 'cliente' && s.adj === 1 && s.noLeidos >= 1 && s.notif && +s.bub > 0, s);
  await ev(() => { const a = FR.adm.contentWindow; a.navegarA('mensajes', a.document.getElementById('nb-mensajes')); a.msgAbrir(Proto.ref); });
  s = await ev(() => { const a = FR.adm.contentWindow; const c = casoActivo(); return { leidos: a.mensajesNoLeidos(c, 'adm'), adjVisible: !!a.document.querySelector('#pg-mensajes .bub-adj .adj-chip img') }; });
  chk('R-10 al abrir la conversación se marcan leídos y se ve el adjunto', s.leidos === 0 && s.adjVisible, s);
  await ev(() => { const a = FR.adm.contentWindow; a.document.getElementById('msg-t').value = 'Recibido, gracias. Lo reviso.'; a.eval('_msgBorrador="Recibido, gracias. Lo reviso."'); a.msgEnviar(Proto.ref); });
  await tick();
  s = await ev(() => { const S = FR.cli.contentWindow.__P.S(); const w = FR.cli.contentWindow; return { ult: S.chat[S.chat.length - 1], sin: w.mensajesSinLeer(), cliTab: FR.cli.contentWindow.__P.sinLeer() }; });
  chk('R-10 la respuesta del admin llega al cliente (sin leer) con autor «reformista»', s.ult.autor === 'reformista' && /Recibido/.test(s.ult.t) && s.ult.leido === false && s.sin >= 1, s);
  await ev(() => { FR.cli.contentWindow.ir('mensajes'); }); await p.waitForTimeout(1300); await tick();
  s = await ev(() => ({ sin: FR.cli.contentWindow.mensajesSinLeer(), adm: casoActivo().mensajes.filter(m => m.autor === 'reformista').every(m => m.leido.cli) }));
  chk('R-10 al entrar en Mensajes el cliente los marca como leídos (lo ve el admin)', s.sin === 0 && s.adm, s);

  console.log('R-07 · la reserva vence, se libera el hueco y vuelve a visita propuesta');
  await ev(() => { const w = FR.cli.contentWindow; const set = (id, v) => { const e = w.document.getElementById(id); if (e) e.value = v; }; w.ir('visita');
    set('dv-calle', 'Calle Mayor'); set('dv-numero', '3'); set('dv-cp', '28224'); set('dv-loc', 'Pozuelo'); w.document.querySelector('input[name=dv-reg][value=propietario]').checked = true; set('dv-anio', '1999'); w.document.getElementById('dv-inicio-sf').checked = true; w.document.querySelector('input[name=dv-hab][value=si]').checked = true; w.dvUpd(); w.guardarDatos(); });
  await tick();
  s = await ev(() => { const c = casoActivo(); return { dv: c.datosVivienda.completos, disc: Proto.ref && FR.adm.contentWindow.__P.db().notificaciones.some(n => n.casoId === c.id && n.tipo === 'discrepancia'), puede: FR.cli.contentWindow.__P.S().req.elegir_franja.ok }; });
  chk('R-04 datos completos desbloquean la elección de fecha; sin discrepancia cuando el configurador ya incluía «obra habitada»', s.dv && s.disc === false && s.puede, s);
  await ev(() => { const w = FR.cli.contentWindow; w.eval('UI.slot=0'); w.confirmarVisita(); }); await tick();
  await ev(() => FR.adm.contentWindow.avanzarTiempo(1)); await tick();
  s = await ev(() => { const a = FR.adm.contentWindow; const c = casoActivo(); return { est: c.estado, cobro: c.visita.cobro.estado, rec: c.mensajes.some(m => m.autor === 'sistema' && /Recordatorio: tu hueco/.test(m.texto)) }; });
  chk('R-07 pasadas 24 h (mitad de la reserva) el sistema recuerda primero', s.est === 'visita_confirmada' && s.cobro === 'pendiente_pago' && s.rec, s);
  await ev(() => FR.adm.contentWindow.avanzarTiempo(2)); await tick();
  s = await ev(() => { const a = FR.adm.contentWindow; const c = casoActivo(); const S = FR.cli.contentWindow.__P.S(); return { est: c.estado, vis: c.visita.estado, el: c.visita.elegida, ev: c.eventos.some(e => /Hueco liberado/.test(e.texto)), fases: S.fase, franjas: c.visita.franjasOfrecidas.length }; });
  chk('R-07 al vencer la reserva se libera el hueco: vuelve a visita_propuesta con evento, sin descartar nada', s.est === 'visita_propuesta' && s.vis === 'propuesta' && s.el === null && s.ev && s.fases === 'visita_propuesta' && s.franjas === 1, s);
  await ev(() => FR.adm.contentWindow.volverHoy()); await tick();

  console.log('R-11 · rechazar un justificante avisa al cliente, que sube otro');
  s = await ev(() => { Proto.ref = 'REF-0009'; Proto.sigCaso = ''; Proto.tick(true); const a = FR.adm.contentWindow; const db = a.__P.db(); const av = db.avisosPago.find(x => x.casoId === 'REF-0009' && x.estado === 'pendiente'); a.avisoRechazarModal(av.id); a.document.getElementById('ar-motivo').value = 'El PDF está en blanco'; a.avisoRechazarOk(av.id); return { est: av.estado, msg: db.casos.find(c => c.id === 'REF-0009').mensajes.slice(-1)[0].texto }; });
  await tick();
  s.cli = await ev(() => { const S = FR.cli.contentWindow.__P.S(); return { rech: S.avisosPago.filter(a => a.estado === 'rechazado').length, pend: FR.cli.contentWindow.pendientes(S).some(x => /otro justificante/.test(x.t)) }; });
  chk('R-11 el aviso queda rechazado con motivo, el cliente recibe la plantilla y ve «Sube otro justificante»', s.est === 'rechazado' && /no he podido confirmar/.test(s.msg) && /PDF está en blanco/.test(s.msg) && s.cli.rech >= 1 && s.cli.pend, s);
  s = await ev(() => { const a = FR.adm.contentWindow; const db = a.__P.db(); const c = db.casos.find(x => x.id === 'REF-0010'); const av = db.avisosPago.find(x => x.casoId === 'REF-0010' && x.estado === 'pendiente'); const n0 = db.cobros.length; a.avisoConfirmarModal(av.id); a.document.getElementById('ac-imp').value = String(av.importe - 10); a.avisoConfirmarOk(av.id); const sinNota = av.estado; a.avisoConfirmarModal(av.id); a.document.getElementById('ac-imp').value = String(av.importe - 10); a.document.getElementById('ac-nota').value = 'Comisión bancaria'; a.avisoConfirmarOk(av.id); const m = db.cobros[db.cobros.length - 1]; return { sinNota, est: av.estado, mov: m.importe, jf: m.justificanteId === 'ADJ-D1', n: db.cobros.length - n0, saldo: a.estadoEconomico(c, db.cobros).cobrado }; });
  chk('R-11 confirmar con importe distinto exige nota; crea el movimiento con el justificante asociado', s.sinNota === 'pendiente' && s.est === 'confirmado' && s.jf && s.n === 1, s);

  console.log('R-14 · ninguna vía del admin ni de los simuladores cierra la obra o registra la conformidad');
  const dir = path.resolve(__dirname, 'src'); const adm = fs.readFileSync(dir + '/adm.html', 'utf8'), cli = fs.readFileSync(dir + '/cli.html', 'utf8'), br = fs.readFileSync(dir + '/bridge.js', 'utf8'), lite = fs.readFileSync(dir + '/lite.html', 'utf8');
  const cuenta = (t, re) => (t.match(re) || []).length;
  chk('R-14 admin: una sola escritura a cierre.conformidad en el código (registrarConformidadCliente) y una sola transición a «cerrada»', cuenta(adm, /cierre\.conformidad\s*=[^=]/g) === 1 && cuenta(adm, /transitar\([^)]*'cerrada'/g) === 1 && cuenta(br, /conformidad\s*=[^=]/g) === 0 && cuenta(lite, /conformidad\s*=[^=]/g) === 0, { adm: cuenta(adm, /cierre\.conformidad\s*=[^=]/g), tr: cuenta(adm, /transitar\([^)]*'cerrada'/g) });
  chk('R-14 no queda ningún «Cerrar por plazo», «Registrar conformidad» ni «Dar mi conformidad» en el admin', !/Cerrar por plazo|Registrar conformidad del cliente|Dar mi conformidad|obraConformidad/.test(adm), {});
  chk('R-14 cliente: las dos únicas escrituras son su firma (cerrarObra) y la proyección del estado del admin; el atajo de la fase 7 no cierra', cuenta(cli.replace(/cierre\.conformidad\s*=\s*null/g, ''), /cierre\.conformidad\s*=[^=]/g) === 2 && !/cerrarObra\('Laura Martín', SIG_DEMO\)\s*;\s*\}\s*\n\s*guardar/.test(cli) && /R-14: el atajo/.test(cli), { cli: cuenta(cli.replace(/cierre\.conformidad\s*=\s*null/g, ''), /cierre\.conformidad\s*=[^=]/g) });
  s = await ev(() => { const a = FR.adm.contentWindow; const out = {}; const c = a.__P.db().casos.find(x => x.id === 'REF-0011'); c.obra.remates.forEach(r => r.estado = 'resuelto'); try { a.accCliente('REF-0011', 'conformidad'); } catch (e) {} out.est = c.estado; out.rq = a.requisitos('cerrar_obra', c, {}).ok; out.vc = (a.vistaCliente('REF-0011'), a.document.getElementById('main-modal-body').innerText); return out; });
  chk('R-14 «Vista del cliente» del admin no tiene botón de conformidad y accCliente(conformidad) no cierra', s.est === 'en_remates' && s.rq === false && !/Dar mi conformidad/.test(s.vc), s);

  console.log('R-09 · ficha del caso con chips de vivienda y facturación; proforma y paquete exigen facturación');
  s = await ev(() => { const a = FR.adm.contentWindow; a.abrirCaso('REF-0010'); const html = a.document.getElementById('main-modal-body').innerText; const html4 = (a.abrirCaso('REF-0004'), a.document.getElementById('main-modal-body').innerText);
    a.closeAllModals(); a.generarProforma('REF-0010'); const t = a.document.getElementById('main-modal-body').innerText; a.closeAllModals(); a.paqueteGestoria('REF-0010'); const t2 = a.document.getElementById('main-modal-body').innerText; return { v10: /DATOS DE LA VIVIENDA\s*COMPLETOS/i.test(html), f10: /DATOS DE FACTURACIÓN\s*PENDIENTES/i.test(html), v4: /DATOS DE LA VIVIENDA\s*PENDIENTES/i.test(html4), faltan: /Faltan los datos de facturación/.test(t) && /Faltan los datos de facturación/.test(t2), pedir: /Pedir al cliente/.test(t) }; });
  chk('R-09 chips completos/pendientes en la ficha y bloqueo de proforma y paquete sin facturación (A9)', s.v10 && s.f10 && s.v4 && s.faltan && s.pedir, s);

  console.log('Errores de consola:', errs.slice(0, 8));
  console.log('RESULT ok=' + ok + ' ko=' + ko);
  await b.close(); process.exit(ko ? 1 : 0);
})();

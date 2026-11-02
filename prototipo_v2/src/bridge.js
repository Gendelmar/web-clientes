/* ===================== PUENTE DEL PROTOTIPO ===================== */
const FR = {};
const TABS = ['cfg', 'adm', 'lite', 'cli'];
const Proto = {
  ref: null, sigCaso: '', adminNuevo: false, liteNuevo: false, vistoCli: 0, tab: 'cfg', liteKey: null,
  toast(m) { toast(m); }
};
window.Proto = Proto;
const $ = (s, r) => (r || document).querySelector(s);
const W = k => FR[k] && FR[k].contentWindow;
const A = () => W('adm'), AP = () => A().__P, DBA = () => AP().db();
const casoActivo = () => Proto.ref ? DBA().casos.find(c => c.id === Proto.ref) : null;
const r2 = v => Math.round((Number(v) || 0) * 100) / 100;
const ms = (fecha, h) => new Date(fecha + 'T' + (h || '12:00') + ':00').getTime();
const hoyMs = () => ms(A().hoy());

/* ---------- utilidades ---------- */
function toast(m) {
  const t = $('#ptoast'); t.textContent = m; t.classList.add('on');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), 3800);
}
function hash(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return h + ':' + s.length; }
const TIPO_ADM = { bano: 'bano', aseo: 'bano', habitacion: 'hab', cocina: 'cocina', salon: 'salon', pasillo: 'pasillo', terraza: 'terraza', toda_la_obra: 'salon' };
const TIPO_CLI = { bano: 'bano', cocina: 'cocina', salon: 'salon', hab: 'habitacion', pasillo: 'pasillo', terraza: 'pasillo' };
const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);

/* ---------- 1. Configurador → Admin ---------- */
function lineasDesdeCalc(calc, espacios) {
  const id = Object.fromEntries(espacios.map(e => [e.nombre, e.id]));
  const mapa = new Map(); const A_ = A();
  const add = (grupos, esMat) => Object.values(grupos || {}).forEach(g => (g.items || []).forEach(it => {
    const esp = id[it.espLabel] || espacios[0].id; const k = esp + '|' + it.concepto;
    let l = mapa.get(k);
    if (!l) { l = { esp, concepto: it.concepto, unidad: it.unidad || 'ud', cant: it.cant || 1, sub: 0, mats: 0 }; mapa.set(k, l); }
    l.sub += it.sub || 0;
  }));
  add(calc.gruposMO); add(calc.gruposMat, true);
  const lineas = [];
  mapa.forEach(l => {
    const cant = l.cant || 1; const precio = r2(l.sub / cant);
    lineas.push({ id: A_.uid('L'), key: 'cfg_' + slug(l.concepto), concepto: l.concepto, espacioId: l.esp, unidad: l.unidad, base: 'fijo', cantidad: cant, precio, subtotal: r2(precio * cant), tipo: 'mo', origen: 'calculo', bloqueada: false });
  });
  (calc.desgloseExtras || []).forEach(x => lineas.push({ id: A_.uid('L'), key: 'cfg_extra_' + slug(x.concepto), concepto: x.concepto, espacioId: 'gen', unidad: 'ud', base: 'fijo', cantidad: 1, precio: r2(x.importe), subtotal: r2(x.importe), tipo: 'mo', origen: 'calculo', bloqueada: false }));
  return lineas;
}

Proto.solicitud = function (payload, ref, calc) {
  const a = A(), db = DBA(), hoy = a.hoy(), cl = payload.cliente || {}, inm = payload.inmueble || {};
  const cid = 'CL-P' + (db.clientes.length + 1);
  db.clientes.push({ id: cid, nombre: cl.nombre, email: cl.email, tel: cl.tel || '', canal: cl.canal || 'email', cp: inm.cp || '', zona: '', horario: cl.horario || 'cualquiera', rgpd: { aceptadoAt: hoy }, whatsappOk: cl.canal === 'whatsapp', notas: '' });
  const espacios = payload.espacios.map(e => ({ id: e.id, nombre: e.label, tipo: TIPO_ADM[e.tipo] || e.tipo, m2: e.m2, trabajos: [] }));
  espacios.push({ id: 'gen', nombre: 'General', tipo: 'general', m2: 0, trabajos: [] });
  const lineas = lineasDesdeCalc(calc, espacios);
  espacios.forEach(e => e.trabajos = lineas.filter(l => l.espacioId === e.id).map(l => l.key));
  const usados = espacios.filter(e => e.id !== 'gen' || e.trabajos.length);
  const tot = a.calcularTotales(lineas, 21, 22, 500); const hq = a.calcularHorquilla(tot.total, 'media'); tot.lo = hq.lo; tot.hi = hq.hi;
  const ver = { id: 'V1', tipo: 'estimacion', creadaAt: hoy, enviadaAt: hoy, ivaPct: 21, lineas, totales: tot, estado: 'vigente', cambiosRespectoAnterior: null };
  const m2tot = usados.reduce((s, e) => s + (e.m2 || 0), 0);
  const caso = {
    id: ref, clienteId: cid, creadaAt: hoy, estado: 'recibida', estadoPrevio: null,
    interno: { etiquetas: ['configurador'], nota: '', proximaAccion: 'Revisar la solicitud y pasarla a triaje', motivoDescarte: null },
    versiones: [ver], aceptacion: null,
    visita: { estado: 'pendiente', franjasOfrecidas: [], elegida: null, cobro: { estado: 'no_aplica' }, checks: {}, medidas: {}, fotos: [], notas: [] },
    obra: { inicio: null, hitos: [], cambios: [], adendas: [], fotos: [], solicitudesCambio: [], remates: [], cierre: null },
    recordatorios: [], enlace: { token: a.uid('tok') },
    eventos: [{ fecha: hoy, tipo: 'sistema', texto: 'Pedido recibido desde el configurador web', autor: 'sistema' }, { fecha: hoy, tipo: 'sistema', texto: 'Enviado al cliente el mensaje automático con su estimación y el enlace a su panel', autor: 'sistema' }],
    vivienda: { cp: inm.cp || '', tipo: inm.tipo || 'piso', m2: inm.superficie || m2tot, plantas: 1, antiguedad: 'desconocida', humedades: false, propietario: true, comunidad: 'no_aplica', topePresupuesto: null, fechaInicioDeseada: null },
    solicitud: { calidad: payload.calidad || 'media', tipoObra: usados.filter(e => e.id !== 'gen').length >= 4 ? 'reforma_integral' : 'reforma_parcial', notasCliente: payload.notas || '', fotosCliente: [], urgencia: payload.urgencia, espacios: usados }
  };
  db.casos.unshift(caso);
  Proto.ref = ref; Proto.adminNuevo = true; Proto.sigCaso = '';
  AP().refresh();
  Proto.tick(true);
  banner('✅ <b>Solicitud enviada.</b> Ha entrado en <b>Admin</b> (estado «Recibida») y el cliente ya tiene su correo/WhatsApp con el enlace a su panel.', [['Ver en Admin', () => { tab('adm'); AP().abrir(ref); }], ['Ver mensaje al cliente', () => tab('cli')]]);
};

/* ---------- 2. Admin → Cliente (proyección) ---------- */
function franjaCli(f) { return { t: ms(f.fecha), h: String(f.franja).replace('-', ' – ') }; }
function estCliente(caso, v) {
  const esps = caso.solicitud.espacios; const out = [];
  const byEsp = {}; v.lineas.forEach(l => { (byEsp[l.espacioId] = byEsp[l.espacioId] || []).push(l); });
  const orden = esps.map(e => e.id).concat(Object.keys(byEsp).filter(id => !esps.some(e => e.id === id)));
  orden.forEach(id => {
    const ls = byEsp[id]; if (!ls || !ls.length) return;
    const e = esps.find(x => x.id === id) || { id, nombre: 'General', tipo: 'general', m2: 0 };
    const usadas = {};
    out.push({
      id, tipo: TIPO_CLI[e.tipo] || 'pasillo', nombre: e.nombre || e.tipo, m2: e.m2 || 0,
      quitados: (v.quitados && v.quitados[id]) || undefined,
      lineas: ls.map(l => { let k = l.key + (l.tipo === 'mat' ? '~m' : ''); if (usadas[k]) k += '#' + usadas[k]; usadas[k] = (usadas[k] || 0) + 1; return { k, l: l.concepto, u: l.unidad || 'ud', cant: l.cantidad, precio: l.precio, nota: l.nota || '' }; })
    });
  });
  return out;
}
const FASE_CLI = { recibida: 'recibida', en_triaje: 'recibida', esperando_info: 'recibida', visita_propuesta: 'visita_propuesta', visita_confirmada: 'visita_confirmada', en_visita: 'visita_confirmada', propuesta_enviada: 'propuesta', aceptada: 'aceptada', en_obra: 'obra', terminada: 'obra', en_remates: 'remates', cerrada: 'cerrada', archivada: 'cerrada' };
function buildV(caso) {
  const a = A(), db = DBA(), cl = db.clientes.find(c => c.id === caso.clienteId) || {};
  const cfg = db.cfg, emp = cfg.empresa || {};
  let estado = caso.estado; if (estado === 'en_pausa') estado = caso.estadoPrevio || 'recibida';
  const fase = FASE_CLI[estado] || 'recibida';
  const vers = caso.versiones.filter(v => v.estado !== 'borrador').map(v => ({
    id: v.id, tipo: v.tipo === 'propuesta' ? 'propuesta' : 'estimacion', fecha: ms(v.enviadaAt || v.creadaAt || a.hoy()),
    estado: v.estado === 'vigente' ? 'vigente' : v.estado === 'aceptada' ? 'aceptada' : 'sustituida', est: estCliente(caso, v)
  }));
  const vi = caso.visita || {};
  const imp = (() => { try { return a.importeVisita(caso, cfg) || 60; } catch (e) { return 60; } })();
  const visita = { estado: ({ propuesta: 'propuesta', confirmada: 'confirmada', realizada: 'realizada' })[vi.estado] || 'no', franjas: (vi.franjasOfrecidas || []).map(franjaCli), elegida: vi.elegida ? franjaCli(vi.elegida) : null, importe: imp };
  if (fase === 'visita_propuesta' && !visita.franjas.length) visita.estado = 'no';
  const ac = caso.aceptacion;
  const aceptacion = ac ? { versionId: ac.versionId, total: ac.importe, f: ms(ac.fecha), nombre: cl.nombre } : null;
  const ob = caso.obra || {};
  const hitos = (ob.hitos || []).map(h => ({ id: h.id, nombre: h.nombre, dias: h.diasEstimados || 3, estado: h.estado === 'hecho' ? 'hecho' : h.estado === 'en_curso' ? 'en_curso' : 'pendiente', previsto: ms(h.fechaPrevista || a.hoy()), real: h.fechaReal ? ms(h.fechaReal) : null }));
  const cambios = (ob.cambios || []).map(c => ({ id: c.id, concepto: c.concepto, importe: c.importe, motivo: c.nota || c.tipo || 'Cambio en obra', bloquea: !!c.bloqueaObra, f: ms(c.fecha), comentario: c.comentarioCliente,
    estado: c.estado === 'consolidado' ? 'consolidado' : c.estado === 'en_desacuerdo' ? 'en_desacuerdo' : (c.avisoCliente && c.avisoCliente.aceptadoAt ? 'aceptado' : 'pendiente_cliente') }));
  const adendas = (ob.adendas || []).map(x => ({ id: x.id, cambios: x.cambios, delta: x.delta, estado: x.estado === 'firmada' ? 'firmada' : 'por_firmar', f: ms(x.fecha), firma: x.estado === 'firmada' ? { nombre: cl.nombre, f: ms(x.firmadaAt || x.fecha) } : undefined }));
  const solicitudes = (ob.solicitudesCambio || []).map(s => ({ id: s.id, texto: s.texto, estado: s.estado === 'abierta' ? 'abierta' : 'valorada', respuesta: s.respuesta || 'Valorada por tu reformista', f: ms(s.fecha) }));
  const remates = (ob.remates || []).map(r => ({ id: r.id, texto: r.texto, estado: r.estado === 'abierto' ? 'abierto' : 'resuelto', foto: !!r.foto, autor: r.autor || 'reformista', itemId: r.itemId || null, localId: r.localId || null }));
  const cierre = ob.cierre ? { terminadaAt: ms(ob.cierre.terminadaAt || a.hoy()), conformidad: ob.cierre.conformidad ? { f: ms(ob.cierre.conformidad.fecha || a.hoy()) } : null } : (['terminada', 'en_remates', 'cerrada'].includes(caso.estado) ? { terminadaAt: hoyMs(), conformidad: null } : null);
  const plan = (cfg.planCobros || []).map(t => ({ label: t.label, pct: t.pct, cuando: String(t.cuando).startsWith('hito:') ? 'hito2' : t.cuando }));
  const cobros = db.cobros.filter(c => c.casoId === caso.id && c.estado !== 'anulado').map(c => ({ id: c.id, f: ms(c.fecha), concepto: c.concepto, importe: c.importe, medio: c.metodo || c.medio || 'Transferencia', tipo: c.tipo === 'visita' ? 'visita' : 'plan' }));
  const mensajes = (caso.eventos || []).map((e, i) => ({ e, i })).filter(x => x.e.tipo === 'mensaje' && x.e.autor === 'reformista').map(x => ({ f: ms(x.e.fecha) + x.i, t: x.e.texto }));
  return {
    ref: caso.id, token: caso.enlace.token, dias: AP().off(), fase,
    cliente: { nombre: cl.nombre, email: cl.email, tel: cl.tel, direccion: (cl.zona ? cl.zona + ' · ' : '') + (caso.vivienda.cp || '') },
    reformista: { empresa: emp.nombre || 'Anatoliy Reformas', contacto: emp.contacto || 'Anatoliy', tel: emp.tel || '600 000 000', email: emp.email || 'hola@anatoliyreformas.es', iban: emp.iban || 'ES00 0000 0000 0000 0000 0000' },
    versiones: vers, visita, aceptacion, plan, cobros, mensajes,
    obra: { inicio: ob.inicio ? ms(ob.inicio) : null, hitos, cambios, adendas, solicitudes, remates, cierre }
  };
}
Proto.proyectarCliente = function (force) {
  const c = casoActivo(); if (!c || !W('cli') || !W('cli').__P) return;
  try { W('cli').__P.aplicar(buildV(c), force); } catch (e) { console.error('proyectarCliente', e); }
};

/* ---------- 3. Admin → Lite ---------- */
Proto.proyectarLite = function () {
  const c = casoActivo(); const L = W('lite'); if (!L || !L.__P) return;
  if (!c) return;
  const activo = ['visita_confirmada', 'en_visita'].includes(c.estado);
  const vig = c.versiones.find(v => v.estado === 'vigente') || c.versiones[c.versiones.length - 1];
  const clave = c.id + ':' + vig.id;
  if (activo && L.__P.clave() !== clave) {
    const ests = estCliente(c, vig);
    const cl = DBA().clientes.find(x => x.id === c.clienteId) || {};
    const nums = c.versiones.map(v => parseInt(String(v.id).replace(/\D/g, ''), 10) || 0);
    const sig = 'V' + (Math.max.apply(null, nums) + 1);
    L.__P.cargar({
      clave, ref: c.id, cliente: { nombre: cl.nombre, tel: cl.tel || '', email: cl.email || '' }, direccion: (cl.zona ? cl.zona + ' · ' : '') + (c.vivienda.cp || ''), m2Total: c.vivienda.m2,
      tipoTxt: (c.solicitud.tipoObra === 'reforma_integral' ? 'Reforma integral' : 'Reforma') + ' · ' + (c.vivienda.m2 || '') + ' m²', ajustes: { margen: DBA().cfg.margen != null ? DBA().cfg.margen : 22, iva: DBA().cfg.iva != null ? DBA().cfg.iva : 21 },
      v2id: vig.id, v3id: sig, est: ests.map((e, i) => ({ id: e.id, tipo: e.tipo, nombre: e.nombre, m2: e.m2, lineas: e.lineas }))
    });
    Proto.liteNuevo = true; refreshBadges();
  } else if (!activo && L.__P.clave() && !L.__P.clave().startsWith(c.id + ':')) { /* otro caso: se mantiene */ }
  else if (!activo && L.__P.clave() === clave && c.estado !== 'propuesta_enviada') { /* sin cambios */ }
};

/* ---------- 4. Lite → Admin ---------- */
Proto.lite = function (kind, d) {
  const c = casoActivo(); if (!c) return; const a = A(), hoy = a.hoy();
  if (kind === 'borrador') {
    c.eventos.push({ fecha: hoy, tipo: 'version', texto: 'Borrador ' + d.v3id + ' guardado desde la visita (pendiente de enviar)', autor: 'reformista' });
    c.interno.proximaAccion = 'Terminar y enviar el borrador ' + d.v3id + ' al cliente'; toast('Borrador guardado · queda anotado en el caso (Admin)');
  }
  if (kind === 'enviar') {
    const lineas = []; const esps = c.solicitud.espacios; const quitados = {};
    d.est.forEach(e => {
      if (!esps.find(x => x.id === e.id)) esps.splice(esps.length - (esps.some(x => x.id === 'gen') ? 1 : 0), 0, { id: e.id, nombre: e.nombre, tipo: Object.keys(TIPO_CLI).find(k => TIPO_CLI[k] === e.tipo) || 'salon', m2: e.m2, trabajos: [] });
      const ex = esps.find(x => x.id === e.id); ex.m2 = e.m2; ex.nombre = e.nombre;
      e.trabajos.forEach(t => {
        if (t.quitado) { if (t.origen !== 'visita') { (quitados[e.id] = quitados[e.id] || {})[t.k] = t.nota || 'Quitado en la visita'; } return; }
        const precio = r2(t.precio), cant = r2(t.cant);
        lineas.push({ id: a.uid('L'), key: t.k, concepto: t.l, espacioId: e.id, unidad: t.u || 'ud', base: 'fijo', cantidad: cant, precio, subtotal: r2(precio * cant), tipo: 'mo', origen: t.origen === 'visita' ? 'visita' : 'calculo', bloqueada: false, nota: t.nota || '' });
      });
      e.comentarios.forEach(t => c.visita.notas.push({ id: a.uid('n'), espacioId: e.id, texto: e.nombre + ': ' + t, fecha: hoy }));
      for (let i = 0; i < e.nFotos; i++) c.visita.fotos.push({ id: a.uid('foto'), url: 'foto-lite.jpg', espacioId: e.id, espacioNombre: e.nombre, etiqueta: 'Visita (Lite)', fecha: hoy });
    });
    const tot = a.calcularTotales(lineas, d.ajustes.iva, d.ajustes.margen, 500); const hq = a.calcularHorquilla(tot.total, 'baja'); tot.lo = hq.lo; tot.hi = hq.hi;
    const ver = { id: d.v3id, tipo: 'propuesta', creadaAt: hoy, enviadaAt: hoy, ivaPct: d.ajustes.iva, lineas, totales: tot, estado: 'borrador', cambiosRespectoAnterior: null, quitados };
    if (c.estado === 'visita_confirmada' && a.puedeTransitar(c, 'en_visita')) a.transitar(c, 'en_visita', { autor: 'reformista', texto: 'Visita técnica realizada (panel Lite)' });
    c.visita.estado = 'realizada';
    // cobro de la visita (a cuenta del presupuesto) si no estaba cobrada
    try {
      const imp = a.importeVisita(c, DBA().cfg);
      if (imp > 0 && !['cobrada', 'eximida'].includes(c.visita.cobro && c.visita.cobro.estado)) {
        c.visita.cobro = Object.assign({}, c.visita.cobro, { importe: imp, estado: 'cobrada', fecha: hoy });
        const vd = a.visitaDescuento(DBA().cfg);
        DBA().cobros.push({ id: a.uid('cob'), casoId: c.id, importe: imp, concepto: 'Visita técnica', fecha: hoy, estado: 'cobrado', metodo: 'efectivo', tipo: 'visita', descontable: vd.descontable, descontablePct: vd.pct });
        c.eventos.push({ fecha: hoy, tipo: 'cobro', texto: 'Cobrada la visita técnica (' + a.fmtEur(imp) + ')', autor: 'reformista' });
      }
    } catch (e) { console.warn(e); }
    a.enviarVersion(c, ver, d.canal || 'WhatsApp');
    if (a.puedeTransitar(c, 'propuesta_enviada')) a.transitar(c, 'propuesta_enviada', { autor: 'reformista', texto: 'Presupuesto ' + ver.id + ' enviado tras la visita (' + a.fmtEur(tot.total) + ')' });
    c.interno.proximaAccion = 'Hacer seguimiento de la propuesta ' + ver.id;
    toast('✅ ' + ver.id + ' enviada: ya está en Admin y el cliente la ve en su panel');
    AP().refresh(); Proto.tick(true);
    banner('📤 <b>' + ver.id + '</b> enviada al cliente. El siguiente paso es del cliente: revisar y aceptar.', [['Ir al panel del cliente', () => { tab('cli'); W('cli').__P.irPanel('presupuesto'); }]]);
  }
};

/* ---------- 5. Cliente → Admin ---------- */
Proto.cli = function (kind, d) {
  const c = casoActivo(); if (!c) return; const a = A(), hoy = a.hoy();
  const ev = (texto, tipo) => c.eventos.push({ fecha: hoy, tipo: tipo || 'cliente', texto, autor: 'cliente' });
  try {
    switch (kind) {
      case 'elegirFranja': a.aplicarAccionCliente(c, 'elegir_franja', { franja: c.visita.franjasOfrecidas[d.idx] }); break;
      case 'reprogramar': a.aplicarAccionCliente(c, 'reprogramar', { franja: c.visita.franjasOfrecidas[d.idx] }); break;
      case 'aceptar': a.aplicarAccionCliente(c, 'aceptar', {}); break;
      case 'pedirCambios': a.aplicarAccionCliente(c, 'pedir_cambios', { texto: d.t }); break;
      case 'rechazar': a.aplicarAccionCliente(c, 'rechazar', { motivo: d.motivo }); break;
      case 'solicitudObra': (c.obra.solicitudesCambio = c.obra.solicitudesCambio || []).push({ id: a.nuevoIdSeq(c.obra.solicitudesCambio, 'S'), fecha: hoy, texto: d.texto, estado: 'abierta' }); ev('El cliente pide un cambio en la obra: ' + d.texto); break;
      case 'aceptarCambio': { const ch = c.obra.cambios.find(x => x.id === d.id); if (ch) { ch.avisoCliente = Object.assign({}, ch.avisoCliente, { aceptadoAt: hoy, desacuerdo: false }); ev('El cliente ha aceptado el cambio ' + ch.id + ': ' + ch.concepto); } break; }
      case 'desacuerdo': { a.aplicarAccionCliente(c, 'desacuerdo', { id: d.id }); const ch = c.obra.cambios.find(x => x.id === d.id); if (ch && d.comentario) ch.comentarioCliente = d.comentario; break; }
      case 'firmarAdenda': a.aplicarAccionCliente(c, 'firmar_adenda', { id: d.id }); break;
      case 'remate': { a.aplicarAccionCliente(c, 'listar_remate', { texto: d.texto }); const r = c.obra.remates[c.obra.remates.length - 1]; if (r) { r.itemId = d.itemId || null; r.localId = d.localId || null; } break; }
      case 'conformidad': {
        const ok = a.puedeCerrarObra(c, DBA().cfg, 'expresa');
        if (!ok.ok) { toast('⚠ La conformidad no se ha podido registrar: ' + ok.motivo); break; }
        a.aplicarAccionCliente(c, 'conformidad', {}); break;
      }
      case 'mensaje': ev('El cliente escribe: «' + d.t + '»' + (d.kind === 'aviso_pago' ? ' (aviso de pago)' : d.kind === 'otra_fecha' ? ' (pide otras fechas de visita)' : ''), 'mensaje'); break;
      case 'datos': {
        const ok = d.datos.every(x => x.valor); c.datosCliente = d.datos;
        const nif = d.datos.find(x => x.id === 'nif'); if (nif && nif.valor) { c.fiscal = Object.assign({}, c.fiscal, { nif: nif.valor }); }
        const ini = d.datos.find(x => x.id === 'inicio'); if (ini && ini.valor) c.vivienda.fechaInicioDeseada = ini.valor;
        const fo = d.datos.find(x => x.id === 'fotos'); if (fo && fo.valor) { c.solicitud.fotosCliente = []; for (let i = 0; i < fo.valor; i++) c.solicitud.fotosCliente.push('foto_cliente_' + (i + 1) + '.jpg'); }
        ev(ok ? 'El cliente ha completado todos sus datos' : 'El cliente ha actualizado sus datos');
        if (c.estado === 'esperando_info' && a.puedeTransitar(c, 'en_triaje')) a.transitar(c, 'en_triaje', { autor: 'cliente', texto: 'El cliente respondió con la información pedida' });
        break;
      }
      case 'valoracion': ev('El cliente valora el servicio con ' + d.n + ' estrellas' + (d.t ? ': «' + d.t + '»' : '')); c.valoracion = { n: d.n, t: d.t }; break;
    }
  } catch (e) { console.error('Proto.cli', kind, e); toast('⚠ ' + e.message); }
  AP().refresh(); Proto.tick(true); Proto.proyectarCliente(true);
};

/* ---------- 6. Vigilancia de cambios ---------- */
const GUIA = {
  null: ['Rellena el configurador como cliente y envía la solicitud.', 'cfg', 'Ir al Configurador'],
  recibida: ['<b>Admin:</b> abre la nueva solicitud, revísala y pásala a triaje.', 'adm', 'Ir a Admin'],
  en_triaje: ['<b>Admin:</b> propón al cliente franjas para la visita técnica (o pídele más información).', 'adm', 'Ir a Admin'],
  esperando_info: ['El caso espera información del cliente. <b>Cliente:</b> completa tus datos / responde.', 'cli', 'Ir a Cliente'],
  visita_propuesta: ['<b>Cliente:</b> elige uno de los huecos propuestos para la visita (sección «Visita»).', 'cli', 'Ir a Cliente'],
  visita_confirmada: ['<b>Lite:</b> haz la visita técnica estancia por estancia, ajusta los trabajos y envía la V3.', 'lite', 'Ir a Lite'],
  en_visita: ['<b>Lite:</b> termina la revisión y envía (o guarda) la nueva versión del presupuesto.', 'lite', 'Ir a Lite'],
  propuesta_enviada: ['<b>Cliente:</b> revisa el presupuesto actualizado y acéptalo (o pide cambios).', 'cli', 'Ir a Cliente'],
  aceptada: ['<b>Admin:</b> inicia la obra desde la ficha del caso.', 'adm', 'Ir a Admin'],
  en_obra: ['<b>Admin:</b> marca hitos, registra cambios y cobros; <b>Cliente:</b> responde cambios y firma adendas. Cuando esté todo, termina la obra.', 'adm', 'Ir a Admin'],
  terminada: ['<b>Admin:</b> abre la fase de remates para que el cliente haga la revisión final.', 'adm', 'Ir a Admin'],
  en_remates: ['<b>Cliente:</b> completa el checklist final y firma tu conformidad (Admin resuelve los remates que indique).', 'cli', 'Ir a Cliente'],
  cerrada: ['🎉 <b>Reforma completada.</b> Revisa el acta, los cobros y la valoración del cliente.', 'adm', 'Ver en Admin'],
  en_pausa: ['El caso está en pausa. <b>Admin:</b> reactívalo.', 'adm', 'Ir a Admin'],
  rechazada: ['El cliente rechazó la propuesta. <b>Admin:</b> renegocia o archiva.', 'adm', 'Ir a Admin'],
  caducada: ['La propuesta caducó. <b>Admin:</b> renueva o archiva.', 'adm', 'Ir a Admin'],
  descartada: ['El caso está descartado. <b>Admin:</b> reábrelo o archívalo.', 'adm', 'Ir a Admin']
};
const ESTADO_TXT = { recibida: 'Recibida', en_triaje: 'En triaje', esperando_info: 'Esperando info', visita_propuesta: 'Visita propuesta', visita_confirmada: 'Visita confirmada', en_visita: 'En visita', propuesta_enviada: 'Propuesta enviada', aceptada: 'Aceptada', en_obra: 'En obra', terminada: 'Obra terminada', en_remates: 'En remates', cerrada: 'Cerrada', en_pausa: 'En pausa', rechazada: 'Rechazada', caducada: 'Caducada', descartada: 'Descartada', archivada: 'Archivada' };
const PASOS = [['Solicitud', ['recibida']], ['Triaje', ['en_triaje', 'esperando_info']], ['Visita', ['visita_propuesta', 'visita_confirmada', 'en_visita']], ['Propuesta', ['propuesta_enviada']], ['Aceptada', ['aceptada']], ['Obra', ['en_obra', 'terminada']], ['Remates', ['en_remates']], ['Cerrada', ['cerrada', 'archivada']]];
function pintarGuia() {
  const c = casoActivo(); const est = c ? c.estado : null; const g = GUIA[est] || GUIA[null];
  $('#gtxt').innerHTML = g[0]; const b = $('#gbtn'); b.textContent = g[2]; b.onclick = () => tab(g[1]);
  $('#gcaso').innerHTML = c ? '<b>' + c.id + '</b> · ' + (ESTADO_TXT[est] || est) : 'Sin solicitud todavía';
  let idx = c ? PASOS.findIndex(p => p[1].includes(est)) : -1;
  if (c && idx < 0 && c.estadoPrevio) idx = PASOS.findIndex(p => p[1].includes(c.estadoPrevio));
  $('#gpasos').innerHTML = PASOS.map((p, i) => '<span class="gp ' + (i < idx ? 'ok' : i === idx ? 'now' : '') + '">' + p[0] + '</span>').join('');
}
function refreshBadges() {
  const cl = W('cli') && W('cli').__P ? W('cli').__P.sinLeer() : 0;
  const set = (k, n) => { const e = $('#bd-' + k); e.textContent = n > 99 ? '99+' : n; e.style.display = n ? '' : 'none'; };
  set('adm', Proto.adminNuevo && Proto.tab !== 'adm' ? 1 : 0);
  set('lite', Proto.liteNuevo && Proto.tab !== 'lite' ? 1 : 0);
  set('cli', Proto.tab !== 'cli' ? cl : 0);
}
Proto.tick = function (force) {
  if (!W('adm') || !W('adm').__P || !W('cli') || !W('lite')) return;
  const c = casoActivo();
  const sig = c ? hash(JSON.stringify(c) + JSON.stringify(DBA().cobros.filter(x => x.casoId === c.id)) + AP().off()) : '';
  if (force || sig !== Proto.sigCaso) {
    Proto.sigCaso = sig;
    if (c) { Proto.proyectarCliente(); Proto.proyectarLite(); }
    pintarGuia();
  }
  refreshBadges();
};
function banner(html, acciones) {
  const b = $('#pbanner'); b.innerHTML = '<span>' + html + '</span>'; (acciones || []).forEach(([t, fn]) => { const x = document.createElement('button'); x.textContent = t; x.onclick = () => { fn(); b.classList.remove('on'); }; b.appendChild(x); });
  const cl = document.createElement('button'); cl.className = 'x'; cl.textContent = '✕'; cl.onclick = () => b.classList.remove('on'); b.appendChild(cl);
  b.style.top = (Math.round($('#guia').getBoundingClientRect().bottom) + 8) + 'px';
  b.classList.add('on'); clearTimeout(banner._t); banner._t = setTimeout(() => b.classList.remove('on'), 12000);
}

/* ---------- 7. Pestañas y controles ---------- */
function tab(k) {
  Proto.tab = k; $('#pbanner').classList.remove('on');
  TABS.forEach(t => { FR[t].classList.toggle('on', t === k); $('#tb-' + t).classList.toggle('on', t === k); $('#tb-' + t).setAttribute('aria-selected', t === k); });
  if (k === 'adm') { Proto.adminNuevo = false; try { AP().refresh(); } catch (e) {} }
  if (k === 'lite') Proto.liteNuevo = false;
  if (k === 'cli') { try { W('cli').__P.tieneCaso() && /^#\/correo/.test(W('cli').location.hash) === false && 0; } catch (e) {} }
  refreshBadges(); try { sessionStorage.setItem('protoTab', k); } catch (e) {}
}
function avanzar(d) { try { A().avanzarTiempo(d); Proto.tick(true); } catch (e) { console.error(e); } }
function reiniciarTodo() {
  if (!confirm('¿Reiniciar el prototipo? Se borrará la solicitud en curso y todos los cambios.')) return;
  try { localStorage.removeItem('panelClienteV1'); localStorage.removeItem('panelLiteV1'); sessionStorage.removeItem('protoTab'); } catch (e) {}
  location.reload();
}
function arrancar() {
  try { localStorage.removeItem('panelClienteV1'); localStorage.removeItem('panelLiteV1'); } catch (e) {}
  let pend = TABS.length;
  TABS.forEach(k => {
    const f = document.createElement('iframe'); f.id = 'fr-' + k; f.title = ({ cfg: 'Configurador', adm: 'Panel administrador', lite: 'Panel Lite', cli: 'Panel del cliente' })[k];
    f.setAttribute('allow', 'clipboard-write; camera; microphone'); FR[k] = f; $('#frames').appendChild(f);
    f.addEventListener('load', () => { if (!--pend) listo(); }, { once: true });
    f.srcdoc = SRC[k];
  });
}
function listo() {
  try {
    const w = W('adm'); w.document.getElementById('l-email').value = w.__P.db().cfg.empresa.email; w.document.getElementById('l-pass').value = 'admin1234'; w.doLogin();
  } catch (e) { console.error('login admin', e); }
  setInterval(() => Proto.tick(false), 600);
  let k = 'cfg'; try { k = sessionStorage.getItem('protoTab') || 'cfg'; } catch (e) {}
  tab('cfg'); Proto.tick(true);
  document.documentElement.classList.add('ready');
}
window.addEventListener('load', arrancar);
document.addEventListener('keydown', e => { if (e.altKey && /^[1-4]$/.test(e.key)) { e.preventDefault(); tab(TABS[+e.key - 1]); } });


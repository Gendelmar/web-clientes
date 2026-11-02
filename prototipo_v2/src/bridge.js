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


/* ---------- 0. Servicio compartido de adjuntos (R-13) ----------
   Fotos y justificantes viven en IndexedDB (con respaldo en memoria); en los JSON solo viajan sus identificadores y metadatos.
   Las cuatro apps lo usan con window.parent.Proto.adjuntos. */
Proto.adjuntos = (function () {
  const DBN = 'protoAdjuntosV2', ST = 'adj', MAX = 5 * 1024 * 1024, PERMITIDOS = /^(image\/(jpeg|png|webp|gif|svg\+xml|heic|heif)|application\/pdf)$/;
  const mem = new Map(); let idb = null, modo = 'memoria', avisado = false, n = 0;
  const abierto = new Promise(res => {
    try {
      if (!window.indexedDB) { res(false); return; }
      const rq = indexedDB.open(DBN, 1);
      rq.onupgradeneeded = () => { rq.result.createObjectStore(ST, { keyPath: 'id' }); };
      rq.onsuccess = () => { idb = rq.result; modo = 'indexeddb'; res(true); };
      rq.onerror = () => res(false); rq.onblocked = () => res(false);
    } catch (e) { res(false); }
  }).then(ok => { if (!ok && !avisado) { avisado = true; setTimeout(() => toast('Aviso: IndexedDB no está disponible; los adjuntos se guardan solo en memoria durante esta sesión.'), 0); } return ok; });
  const tx = (modoTx, fn) => abierto.then(ok => ok && idb ? new Promise(res => { try { const t = idb.transaction(ST, modoTx); const rq = fn(t.objectStore(ST)); t.oncomplete = () => res(rq && rq.result !== undefined ? rq.result : true); t.onerror = () => res(null); t.onabort = () => res(null); } catch (e) { res(null); } }) : null);
  function leer(file) { return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => rej(new Error('No se pudo leer el archivo')); fr.readAsDataURL(file); }); }
  function comprimir(file, max) {
    max = max || 1600;
    return new Promise((res, rej) => { const u = URL.createObjectURL(file), im = new Image();
      im.onload = () => { const k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight)); const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k)); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); res(c.toDataURL('image/jpeg', 0.8)); };
      im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('formato no legible')); }; im.src = u; });
  }
  function putSync(data, meta, idFijo) {
    meta = meta || {}; const id = idFijo || ('ADJ-' + (++n) + Math.random().toString(36).slice(2, 6));
    const m = { nombre: meta.nombre || 'archivo', tipo: meta.tipo || (/^data:([^;,]+)/.exec(data) || [])[1] || 'application/octet-stream', tam: meta.tam != null ? meta.tam : Math.round(String(data).length * 0.75), casoId: meta.casoId || null, origen: meta.origen || 'cliente', fecha: meta.fecha || new Date().toISOString() };
    const rec = { id, meta: m, data }; mem.set(id, rec); tx('readwrite', st => st.put(rec)); return id;
  }
  async function put(src, meta) {
    meta = Object.assign({}, meta);
    if (typeof src === 'string') return putSync(src, meta);
    const f = src; if (!f) throw new Error('No hay archivo');
    const tipo = f.type || meta.tipo || '';
    if (!PERMITIDOS.test(tipo)) throw new Error('Formato no admitido: sube una imagen (JPG, PNG, HEIC) o un PDF.');
    if (f.size > (meta.maxBytes || MAX)) throw new Error('El archivo supera los 5 MB.');
    let data; if (/^image\/(jpeg|png|webp|gif)$/.test(tipo)) { try { data = await comprimir(f, meta.maxPx || 1600); } catch (e) { data = await leer(f); } } else data = await leer(f);
    return putSync(data, Object.assign({ nombre: f.name, tipo, tam: f.size }, meta));
  }
  return {
    put, putSync, comprimir, MAX,
    get: async id => mem.get(id) || (await tx('readonly', st => st.get(id))) || null,
    url: id => (mem.get(id) || {}).data || null,
    meta: id => (mem.get(id) || {}).meta || null,
    del: id => { mem.delete(id); return tx('readwrite', st => st.delete(id)); },
    lista: casoId => [...mem.values()].filter(r => !casoId || r.meta.casoId === casoId).map(r => Object.assign({ id: r.id }, r.meta)).sort((a, b) => String(a.fecha).localeCompare(String(b.fecha))),
    setMeta: (id, patch) => { const r = mem.get(id); if (r) { Object.assign(r.meta, patch); tx('readwrite', st => st.put(r)); } return !!r; },
    sembrar: lista => (lista || []).forEach(x => { if (!mem.has(x.id)) putSync(x.data, { nombre: x.nombre, tipo: x.tipo, casoId: x.casoId, origen: x.origen || 'demo' }, x.id); }),
    limpiar: () => { mem.clear(); return tx('readwrite', st => st.clear()); },
    modo: () => modo, listo: () => abierto
  };
})();

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
/* R-02: cada línea conserva la key del trabajo del configurador, su base real (BASE_POR_TRABAJO de cfg) y el precio unitario */
function lineasDesdeCalc(calc, espacios) {
  const id = Object.fromEntries(espacios.map(e => [e.nombre, e.id]));
  const mapa = new Map(); const A_ = A();
  const add = grupos => Object.values(grupos || {}).forEach(g => (g.items || []).forEach(it => {
    const esp = it.espId || id[it.espLabel] || espacios[0].id; const key = it.key || ('cfg_' + slug(it.concepto)); const k = esp + '|' + key;
    let l = mapa.get(k);
    if (!l) { l = { esp, key, concepto: it.concepto, unidad: it.unidad || 'ud', cant: it.cant || 1, base: it.base || 'fijo', esMat: !!it.esMat, prodId: it.prodId, sub: 0 }; mapa.set(k, l); }
    l.sub += it.sub || 0;
  }));
  add(calc.gruposMO); add(calc.gruposMat);
  const lineas = [];
  mapa.forEach(l => {
    const cant = l.cant || 1; const precio = r2(l.sub / cant);
    lineas.push({ id: A_.uid('L'), key: l.key, concepto: l.concepto, espacioId: l.esp, unidad: l.unidad, base: l.base, cantidad: cant, precio, subtotal: r2(precio * cant), tipo: l.esMat ? 'mat' : 'mo', origen: 'calculo', bloqueada: false });
  });
  (calc.desgloseExtras || []).forEach(x => lineas.push({ id: A_.uid('L'), key: 'cfg_extra_' + slug(x.concepto), concepto: x.concepto, espacioId: 'gen', unidad: 'ud', base: 'fijo', cantidad: 1, precio: r2(x.importe), subtotal: r2(x.importe), tipo: 'mo', origen: 'calculo', bloqueada: false }));
  return lineas;
}

Proto.solicitud = function (payload, ref, calc) {
  const a = A(), db = DBA(), hoy = a.hoy(), cl = payload.cliente || {}, inm = payload.inmueble || {};
  if (!a.cpValido(inm.cp) || !(Number(inm.superficie) > 0) || !inm.tipo) { toast('⚠ La solicitud necesita tipo de vivienda, superficie y código postal válidos (R-01).'); return; }
  const cid = 'CL-P' + (db.clientes.length + 1);
  db.clientes.push({ id: cid, nombre: cl.nombre, email: cl.email, tel: cl.tel || '', canal: cl.canal || 'email', cp: inm.cp || '', zona: '', horario: cl.horario || 'cualquiera', rgpd: { aceptadoAt: hoy }, whatsappOk: cl.canal === 'whatsapp', notas: '' });
  const espacios = payload.espacios.map(e => ({ id: e.id, nombre: e.label, tipo: TIPO_ADM[e.tipo] || e.tipo, m2: e.m2, trabajos: [] }));
  espacios.push({ id: 'gen', nombre: 'General', tipo: 'general', m2: 0, trabajos: [] });
  const lineas = lineasDesdeCalc(calc, espacios);
  const cfgDe = Object.fromEntries(payload.espacios.map(e => [e.id, e]));
  espacios.forEach(e => {
    const pe = cfgDe[e.id] || {}; const vistos = new Set(); e.trabajos = [];
    lineas.filter(l => l.espacioId === e.id && l.tipo !== 'mat').forEach(l => { if (vistos.has(l.key)) return; vistos.add(l.key); e.trabajos.push({ key: l.key, label: l.concepto, base: l.base, detalles: a.detallesDeTrabajo(l.key, pe.cfg, pe.materiales) }); });
  });
  const usados = espacios.filter(e => e.id !== 'gen' || e.trabajos.length);
  const tot = a.calcularTotales(lineas, 21, 22, 500); const hq = a.calcularHorquilla(tot.total, null); tot.lo = hq.lo; tot.hi = hq.hi;
  const ver = { id: 'V1', tipo: 'estimacion', creadaAt: hoy, enviadaAt: hoy, ivaPct: 21, lineas, totales: tot, estado: 'vigente', cambiosRespectoAnterior: null };
  const m2tot = usados.reduce((s, e) => s + (e.m2 || 0), 0);
  const detalle = { inmueble: JSON.parse(JSON.stringify(inm)), extras: (payload.extras || []).slice(), calidad: payload.calidad, urgencia: payload.urgencia, obraHabitada: !!payload.obraHabitada, elegiMateriales: payload.elegiMateriales || null, materiales: JSON.parse(JSON.stringify(payload.materiales || {})), notas: payload.notas || '',
    espacios: Object.fromEntries(payload.espacios.map(e => [e.id, { cfg: JSON.parse(JSON.stringify(e.cfg || {})), materiales: JSON.parse(JSON.stringify(e.materiales || {})), notas: e.notas || '' }])), resultado: payload.resultado_calculo || null };
  const caso = {
    id: ref, clienteId: cid, creadoAt: hoy, creadaAt: hoy, estado: 'recibida', estadoPrevio: null,
    interno: { etiquetas: ['configurador'], nota: '', proximaAccion: 'Revisar la solicitud y pasarla a triaje', motivoDescarte: null },
    versiones: [ver], aceptacion: null,
    visita: { estado: 'pendiente', franjasOfrecidas: [], elegida: null, cobro: { estado: 'no_aplica' }, checks: {}, medidas: {}, fotos: [], notas: [] },
    obra: { inicio: null, hitos: [], cambios: [], adendas: [], fotos: [], solicitudesCambio: [], remates: [], cierre: null },
    recordatorios: [], enlace: { token: a.uid('tok') }, mensajes: [],
    eventos: [{ fecha: hoy, tipo: 'sistema', texto: 'Pedido recibido desde el configurador web', autor: 'sistema' }, { fecha: hoy, tipo: 'sistema', texto: 'Enviado al cliente el mensaje automático con su estimación y el enlace a su panel', autor: 'sistema' }],
    vivienda: { cp: inm.cp || '', tipo: inm.tipo || 'piso', m2: inm.superficie || m2tot, plantas: inm.numPlantasChalet || 1, antiguedad: 'desconocida', humedades: false, propietario: true, comunidad: 'no_aplica', topePresupuesto: null, fechaInicioDeseada: null },
    solicitud: { calidad: payload.calidad || 'media', tipoObra: usados.filter(e => e.id !== 'gen').length >= 4 ? 'reforma_integral' : 'reforma_parcial', notasCliente: payload.notas || '', fotosCliente: (payload.adjuntosIds || []).slice(), urgencia: payload.urgencia, obraHabitada: !!payload.obraHabitada || (payload.extras || []).includes('obra_habitada'), espacios: usados, detalle }
  };
  caso.datosVivienda = a.nuevoDatosVivienda(caso);
  (payload.adjuntosIds || []).forEach(i => Proto.adjuntos.setMeta(i, { casoId: ref }));
  db.casos.unshift(caso);
  a.notificar(db, ref, 'sistema', 'Nueva solicitud recibida desde el configurador (' + a.fmtImporteVersion(ver) + ')');
  Proto.ref = ref; Proto.adminNuevo = true; Proto.sigCaso = '';
  AP().refresh();
  Proto.tick(true);
  banner('✅ <b>Solicitud enviada.</b> Ha entrado en <b>Admin</b> (estado «Recibida») y el cliente ya tiene su correo/WhatsApp con el enlace a su panel.', [['Ver en Admin', () => { tab('adm'); AP().abrir(ref); }], ['Ver mensaje al cliente', () => tab('cli')]]);
};

/* ---------- 2. Admin → Cliente (proyección) ---------- */
function franjaCli(f) { return { t: ms(f.fecha), h: String(f.franja).replace('-', ' – ') }; }
/* El panel del cliente calcula con margen 22 % e IVA 21 %: se escalan sus precios para que, con SU fórmula, coincida con el total del admin
   (el descuento, los imprevistos y el redondeo viajan aparte, en `aj`, para enseñarlos como líneas propias) */
function factorCliente(v) { const t = v.totales || {}; const m = t.subtotal > 0 ? (t.margen || 0) / t.subtotal : 0.22; return (1 + m) * (1 + (v.ivaPct != null ? v.ivaPct : 21) / 100) / (1.22 * 1.21); }
function estCliente(caso, v) {
  const esps = caso.solicitud.espacios; const out = []; const kf = factorCliente(v);
  const byEsp = {}; v.lineas.forEach(l => { (byEsp[l.espacioId] = byEsp[l.espacioId] || []).push(l); });
  const orden = esps.map(e => e.id).concat(Object.keys(byEsp).filter(id => !esps.some(e => e.id === id)));
  orden.forEach(id => {
    const ls = byEsp[id]; if (!ls || !ls.length) return;
    const e = esps.find(x => x.id === id) || { id, nombre: 'General', tipo: 'general', m2: 0 };
    const usadas = {};
    out.push({
      id, tipo: TIPO_CLI[e.tipo] || 'pasillo', nombre: e.nombre || e.tipo, m2: e.m2 || 0,
      quitados: (v.quitados && v.quitados[id]) || undefined,
      lineas: ls.map(l => { let k = l.key + (l.tipo === 'mat' ? '~m' : ''); if (usadas[k]) k += '#' + usadas[k]; usadas[k] = (usadas[k] || 0) + 1; return { k, l: l.concepto, u: l.unidad || 'ud', cant: l.cantidad, precio: Math.abs(kf - 1) < 1e-6 ? l.precio : Math.round(l.precio * kf * 10000) / 10000, nota: l.nota || '' }; })
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
  const vers = caso.versiones.filter(v => v.estado !== 'borrador').map(v => {
    const g = a.rangoVersion(v);
    return { id: v.id, tipo: v.tipo === 'propuesta' ? 'propuesta' : 'estimacion', fecha: ms(v.enviadaAt || v.creadaAt || a.hoy()), total: v.totales.total, rango: g.exacto ? null : { lo: g.lo, hi: g.hi }, etiqueta: a.etiquetaVersion(v, caso), avisosVisita: (v.avisosVisita || v.avisos || []).slice(),
      estado: v.estado === 'vigente' ? 'vigente' : v.estado === 'aceptada' ? 'aceptada' : 'sustituida', est: estCliente(caso, v),
      aj: v.negociacion ? { descuento: r2((v.totales.descuento || 0) * (1 + (v.ivaPct != null ? v.ivaPct : 21) / 100)), imprevistos: r2((v.totales.imprevistos || 0) * (1 + (v.ivaPct != null ? v.ivaPct : 21) / 100)), imprevistosPct: v.negociacion.imprevistosPct || 0, redondeo: v.totales.ajusteRedondeo || 0, validezDias: v.negociacion.validezDias || null, plazoSemanas: v.negociacion.plazoSemanas || null, condiciones: v.negociacion.condiciones || '' } : null,
      plan: v.planCobros ? a.importesPlanPrevio(v.planCobros, v.totales.total).map(t => ({ label: t.label, pct: t.pct, cuando: t.cuando, importe: t.importe, resto: t.resto })) : null, hitosPlan: (v.hitosPlan || []).map(h => ({ nombre: h.nombre, dias: h.diasEstimados })) };
  });
  const vi = caso.visita || {};
  const imp = (() => { try { return a.importeVisita(caso, cfg) || 60; } catch (e) { return 60; } })();
  const cb = vi.cobro || {};
  const visita = { estado: ({ propuesta: 'propuesta', confirmada: 'confirmada', realizada: 'realizada' })[vi.estado] || 'no', franjas: (vi.franjasOfrecidas || []).map(franjaCli), elegida: vi.elegida ? franjaCli(vi.elegida) : null, importe: imp,
    cobro: { estado: cb.estado || 'no_aplica', importe: cb.importe != null ? cb.importe : imp, reservaExpiraAt: cb.reservaExpiraAt || null, avisoPagoId: cb.avisoPagoId || null, requierePago: a.visitaRequierePago(caso, cfg), horas: a.reservaHoras(cfg), cuando: (cfg.visita || {}).cobroCuando || 'al_confirmar' } };
  if (fase === 'visita_propuesta' && !visita.franjas.length) visita.estado = 'no';
  const ac = caso.aceptacion;
  const aceptacion = ac ? { versionId: ac.versionId, total: ac.importe, f: ms(ac.fecha), nombre: ac.nombre || cl.nombre } : null;
  const ob = caso.obra || {};
  const hitos = (ob.hitos || []).map(h => ({ id: h.id, nombre: h.nombre, dias: h.diasEstimados || 3, fotosAdj: (h.fotos || []).map(f => f.adjuntoId).filter(Boolean), nota: h.nota || '', estado: h.estado === 'hecho' ? 'hecho' : h.estado === 'en_curso' ? 'en_curso' : 'pendiente', previsto: ms(h.fechaPrevista || a.hoy()), real: h.fechaReal ? ms(h.fechaReal) : null }));
  const cambios = (ob.cambios || []).map(c => ({ id: c.id, concepto: c.concepto, importe: c.importe, motivo: c.nota || c.tipo || 'Cambio en obra', bloquea: !!c.bloqueaObra, f: ms(c.fecha), comentario: c.comentarioCliente,
    estado: c.estado === 'consolidado' ? 'consolidado' : c.estado === 'retirado' ? 'retirado' : c.estado === 'en_desacuerdo' ? 'en_desacuerdo' : (c.avisoCliente && c.avisoCliente.aceptadoAt ? 'aceptado' : 'pendiente_cliente'), resolucion: c.resolucion ? { accion: c.resolucion.accion, nota: c.resolucion.nota } : null, cortesia: !!c.cortesia, motivoRetiro: c.motivoRetiro || '' }));
  const adendas = (ob.adendas || []).map(x => ({ id: x.id, cambios: x.cambios, delta: x.delta, estado: x.estado === 'firmada' ? 'firmada' : 'por_firmar', f: ms(x.fecha), firma: x.estado === 'firmada' ? { nombre: cl.nombre, f: ms(x.firmadaAt || x.fecha) } : undefined }));
  const solicitudes = (ob.solicitudesCambio || []).map(s => ({ id: s.id, texto: s.texto, estado: s.estado === 'abierta' ? 'abierta' : 'valorada', respuesta: s.respuesta || 'Valorada por tu reformista', f: ms(s.fecha) }));
  const remates = (ob.remates || []).map(r => ({ id: r.id, texto: r.texto, estado: r.estado === 'abierto' ? 'abierto' : 'resuelto', foto: !!r.foto, autor: r.autor || 'reformista', itemId: r.itemId || null, localId: r.localId || null }));
  const cierre = ob.cierre ? { terminadaAt: ms(ob.cierre.terminadaAt || a.hoy()), conformidad: ob.cierre.conformidad ? { f: ms(ob.cierre.conformidad.fecha || a.hoy()) } : null } : (['terminada', 'en_remates', 'cerrada'].includes(caso.estado) ? { terminadaAt: hoyMs(), conformidad: null } : null);
  const verVig = caso.versiones.find(v => v.estado === 'vigente') || caso.versiones.find(v => v.id === (caso.aceptacion && caso.aceptacion.versionId));
  const planBase = (verVig && verVig.planCobros) || (caso.planCobros && caso.planCobros.length ? caso.planCobros : cfg.planCobros); const totalPlan = caso.aceptacion ? caso.aceptacion.importe : (verVig ? verVig.totales.total : 0);
  const plan = a.importesPlanPrevio(planBase, totalPlan).map(t => ({ label: t.label, pct: t.pct, cuando: t.cuando, importe: t.importe, resto: t.resto }));
  const planTramos = caso.aceptacion ? a.planCobros(caso, cfg, db.cobros).map(t => ({ label: t.label, pct: t.pct, cuando: t.cuando, importe: t.importe, estado: t.estado, falta: t.falta, resto: !!t.resto, incluyeCambios: t.incluyeCambios || 0 })) : null;
  const cobros = db.cobros.filter(c => c.casoId === caso.id && c.estado !== 'anulado').map(c => ({ id: c.id, f: ms(c.fecha), concepto: c.concepto, importe: c.importe, medio: c.metodo || c.medio || 'Transferencia', tipo: c.tipo === 'visita' ? 'visita' : 'plan', justificanteId: c.justificanteId || null }));
  const avisosPago = (db.avisosPago || []).filter(x => x.casoId === caso.id).map(x => ({ id: x.id, importe: x.importe, medio: x.medio, f: ms(x.fecha), tramo: x.tramo, tipo: x.tipo, adjuntoId: x.adjuntoId, estado: x.estado, motivo: x.motivo || '', concepto: x.concepto }));
  const mensajes = (caso.mensajes || []).slice().sort((p, q) => String(p.fecha).localeCompare(String(q.fecha))).map(m => ({ id: m.id, f: Date.parse(m.fecha) || ms(String(m.fecha).slice(0, 10)), autor: m.autor, t: m.texto, adjuntos: (m.adjuntos || []).slice(), tipo: m.tipo, leido: !!(m.leido && m.leido.cli) }));
  const incidencias = (ob.incidencias || []).filter(i => i.visibleCliente).map(i => ({ id: i.id, f: ms(i.fecha), tipo: i.tipo, texto: i.texto, gravedad: i.gravedad, estado: i.estado, diasRetraso: i.diasRetraso || 0, bloquea: !!i.bloquea, fotos: (i.fotos || []).slice(), resolucion: i.resolucion || '' }));
  const fotosObra = (ob.fotos || []).filter(f => f.adjuntoId).map(f => ({ id: f.id, adjuntoId: f.adjuntoId, momento: f.momento, espacioId: f.espacioId, f: ms(f.fecha) }));
  const dvEval = a.evaluarDatosVivienda(caso, cfg);
  const dv = Object.assign(a.nuevoDatosVivienda(caso), caso.datosVivienda || {});
  const fiscal = caso.fiscal ? Object.assign({}, caso.fiscal) : a.nuevoFiscal();
  const fiscalEval = a.evaluarFiscal(fiscal, caso);
  const rqCtx = { db, cfg, cobros: db.cobros };
  return {
    ref: caso.id, token: caso.enlace.token, dias: AP().off(), fase,
    cliente: { nombre: cl.nombre, email: cl.email, tel: cl.tel, direccion: caso.vivienda.direccion || ((cl.zona ? cl.zona + ' · ' : '') + (caso.vivienda.cp || '')) },
    reformista: { empresa: emp.nombre || 'Anatoliy Reformas', contacto: emp.contacto || 'Anatoliy', tel: emp.tel || '600 000 000', email: emp.email || 'hola@anatoliyreformas.es', iban: (cfg.cobros && cfg.cobros.iban) || emp.iban || 'ES00 0000 0000 0000 0000 0000', titular: (cfg.cobros && cfg.cobros.titular) || emp.nombre, bizum: (cfg.cobros && cfg.cobros.bizum) || emp.tel },
    pago: { medios: MEDIOS_PAGO_CLI.filter(m => ((cfg.cobros || {}).medios || []).includes(m) || m === 'transferencia'), justificanteObligatorio: Object.fromEntries(['transferencia', 'bizum', 'efectivo'].map(m => [m, a.justificanteObligatorio(cfg, m)])) },
    versiones: vers, visita, aceptacion, plan, planTramos, cobros, avisosPago, mensajes, horquillaPct: a.horquillaPct(cfg),
    datosVivienda: Object.assign({}, dv, { eval: dvEval }), fiscal, fiscalEval, tipoVivienda: caso.vivienda.tipo || 'piso', habitadaConfigurador: !!(caso.solicitud && caso.solicitud.obraHabitada),
    requisitos: a.mapaRequisitosCliente(caso, rqCtx),
    hitosPlan: (a.hitosDeCaso(caso, cfg) || []).map(h => ({ nombre: h.nombre, dias: h.diasEstimados })),
    obra: { inicio: ob.inicio ? ms(ob.inicio) : null, hitos, cambios, adendas, solicitudes, remates, cierre, incidencias, fotosObra }
  };
}
const MEDIOS_PAGO_CLI = ['transferencia', 'bizum', 'efectivo'];
Proto.proyectarCliente = function (force) {
  const c = casoActivo(); if (!c || !W('cli') || !W('cli').__P) return;
  try { W('cli').__P.aplicar(buildV(c), force); } catch (e) { console.error('proyectarCliente', e); }
};

/* ---------- 3. Admin → Lite ---------- */
/* R-16/R-17: el lite recibe TODAS las versiones con sus líneas y, por cada trabajo, la key, la base real y lo que marcó el cliente */
function estLite(caso, v) {
  const esps = caso.solicitud.espacios; const det = (caso.solicitud.detalle && caso.solicitud.detalle.espacios) || {};
  const byEsp = {}; v.lineas.forEach(l => { (byEsp[l.espacioId] = byEsp[l.espacioId] || []).push(l); });
  const orden = esps.map(e => e.id).concat(Object.keys(byEsp).filter(id => !esps.some(e => e.id === id)));
  const out = [];
  orden.forEach(id => {
    const ls = byEsp[id]; if (!ls || !ls.length) return;
    const e = esps.find(x => x.id === id) || { id, nombre: 'General', tipo: 'general', m2: 0 };
    const usadas = {}; const trab = (e.trabajos || []).filter(t => typeof t === 'object');
    out.push({
      id, tipo: TIPO_CLI[e.tipo] || 'pasillo', tipoAdm: e.tipo, nombre: e.nombre || e.tipo, m2: e.m2 || 0, detalle: (det[id] || null),
      lineas: ls.map(l => { let k = l.key + (l.tipo === 'mat' ? '~m' : ''); if (usadas[k]) k += '#' + usadas[k]; usadas[k] = (usadas[k] || 0) + 1; const tr = trab.find(t => t.key === l.key);
        return { k, key: l.key, l: l.concepto, u: l.unidad || 'ud', cant: l.cantidad, precio: l.precio, nota: l.nota || '', bk: l.base || 'fijo', tl: l.tipo || 'mo', det: l.tipo === 'mat' ? null : ((tr && tr.detalles) || null), liteId: l.liteId || null, lineaId: l.id, manual: !!l.bloqueada, origen: l.origen || 'calculo', tab: l.tabiqueId || null }; })
    });
  });
  return out;
}
function versionesLite(c) {
  const a = A();
  return c.versiones.filter(v => v.estado !== 'borrador').map(v => { const g = a.rangoVersion(v);
    return { id: v.id, etiqueta: a.etiquetaVersion(v, c), fecha: ms(v.enviadaAt || v.creadaAt || a.hoy()), autor: v.tipo === 'estimacion' ? 'Cliente (configurador)' : 'Reformista', tipo: v.tipo, total: v.totales.total, rango: g.exacto ? null : { lo: g.lo, hi: g.hi },
      estado: v.estado === 'vigente' ? 'vigente' : v.estado === 'aceptada' ? 'aceptada' : 'sustituida',
      lineas: v.lineas.map(l => ({ k: l.key + (l.tipo === 'mat' ? '~m' : ''), key: l.key, l: l.concepto, u: l.unidad || 'ud', cant: l.cantidad, precio: l.precio, esp: l.espacioId, tl: l.tipo || 'mo' })) }; });
}
function datosLite(c) {
  const a = A(), db = DBA(), cfg = db.cfg;
  const vig = c.versiones.find(v => v.estado === 'vigente') || c.versiones[c.versiones.length - 1];
  const cl = db.clientes.find(x => x.id === c.clienteId) || {};
  const nums = c.versiones.map(v => parseInt(String(v.id).replace(/\D/g, ''), 10) || 0);
  const sig = (c.borrador && c.borrador.v3id) || ('V' + (Math.max.apply(null, nums) + 1));
  const bo = c.borrador && c.borrador.origen === 'lite' ? { snap: c.borrador.snap, lineas: c.borrador.lineas, rev: c.borrador.rev || 0, por: c.borrador.por, actualizadoAt: c.borrador.actualizadoAt, v3id: c.borrador.v3id, neg: c.borrador.negociacion, ajustes: c.borrador.ajustes, hitosPlan: c.borrador.hitosPlan, planCobros: c.borrador.planCobros, tabiques: c.borrador.tabiques, medidas: c.borrador.medidas, general: c.borrador.general } : null;
  const dir = a.direccionDe ? a.direccionDe(c) : ((cl.zona ? cl.zona + ' · ' : '') + (c.vivienda.cp || ''));
  return {
    clave: c.id + ':' + vig.id, casoId: c.id, ref: c.id, cliente: { nombre: cl.nombre, tel: cl.tel || '', email: cl.email || '' }, direccion: dir || ((cl.zona ? cl.zona + ' · ' : '') + (c.vivienda.cp || '')), m2Total: c.vivienda.m2,
    tipoTxt: (c.solicitud.tipoObra === 'reforma_integral' ? 'Reforma integral' : 'Reforma') + ' · ' + (c.vivienda.m2 || '') + ' m²', ajustes: { margen: cfg.margen != null ? cfg.margen : 22, iva: cfg.iva != null ? cfg.iva : 21 },
    v2id: vig.id, v3id: sig, est: estLite(c, vig), versiones: versionesLite(c), medidas: c.visita.medidas || {}, estadoDatos: a.estadoDatosCliente(c, cfg), borrador: bo,
    cfg: { hitos: a.hitosDeCaso(c, cfg), planCobros: a.normalizarPlan(a.planDeCaso(c, cfg)), negociacionDef: Object.assign({ validezDias: cfg.validezDias || 30 }, cfg.negociacionDef || {}), fotoObligatoriaHito: cfg.fotoObligatoriaHito !== false, margen: cfg.margen },
    solicitud: { notas: c.solicitud.notasCliente || '', calidad: c.solicitud.calidad, materiales: ((c.solicitud.detalle || {}).materiales) || null }
  };
}
Proto.proyectarLite = function () {
  const c = casoActivo(); const L = W('lite'); if (!L || !L.__P) return;
  if (!c) return;
  const activo = ['visita_confirmada', 'en_visita'].includes(c.estado);
  const vig = c.versiones.find(v => v.estado === 'vigente') || c.versiones[c.versiones.length - 1];
  const clave = c.id + ':' + vig.id;
  if (activo && L.__P.clave() !== clave) {
    L.__P.cargar(datosLite(c));
    Proto.liteNuevo = true; refreshBadges();
  } else if (L.__P.clave() === clave) { try { L.__P.estadoDatos(DBA() && A().estadoDatosCliente(c, DBA().cfg)); } catch (e) {} }
};
/* R-21: el reformista reabre en el lite el borrador guardado (desde el admin) */
Proto.reabrirEnLite = function (id) {
  const db = DBA(); const c = db.casos.find(x => x.id === id); const L = W('lite'); if (!c || !L || !L.__P) return false;
  Proto.ref = id; L.__P.cargar(datosLite(c), true); tab('lite'); toast('Borrador reabierto en el Lite'); return true;
};

/* ---------- 4. Lite → Admin ---------- */
Proto.lite = function (kind, d) {
  const c = casoActivo(); if (!c) return { ok: false }; const a = A(), hoy = a.hoy();
  if (kind === 'borrador') {
    const rs = a.guardarBorradorLite(c, d, { forzar: !!d.forzar });
    if (rs.ok) { if (!d.silencioso) toast('Borrador ' + d.v3id + ' guardado · ya aparece en la ficha del caso (pestaña Presupuesto)'); AP().refresh(); Proto.sigCaso = ''; }
    return rs;
  }
  if (kind === 'recordar') {
    const rs = a.recordarDatosCliente(c, d.que); toast('Recordatorio dejado en la conversación con el cliente'); AP().refresh(); Proto.tick(true); return { ok: true, texto: rs.texto };
  }
  if (kind === 'enviar') {
    const { lineas, quitados } = a.lineasDeLite(c, d, (c.borrador && c.borrador.lineas) || []);
    const cfg = DBA().cfg; const tot = a.calcularTotalesNeg(lineas, d.ajustes.iva, d.ajustes.margen, 500, d.neg); const hq = a.calcularHorquilla(tot.total, null); tot.lo = hq.lo; tot.hi = hq.hi;
    const ver = { id: d.v3id, tipo: 'propuesta', creadaAt: hoy, enviadaAt: hoy, ivaPct: d.ajustes.iva, lineas, totales: tot, estado: 'borrador', cambiosRespectoAnterior: null, quitados };
    // R-15 (A10 y A1): se revalida antes de aplicar nada; al cerrar la visita desde el lite se da por realizada
    const cSim = Object.assign({}, c, { estado: 'en_visita', visita: Object.assign({}, c.visita, { estado: 'realizada' }) });
    const rq10 = a.requisitos('cerrar_visita', c, { total: tot.total }), rq1 = a.requisitos('enviar_version', cSim, { version: ver });
    if (!rq10.ok || !rq1.ok) { toast('⚠ No se puede enviar todavía. Te falta: ' + a.textoFaltan({ faltan: rq10.faltan.concat(rq1.faltan) }) + '.'); return { ok: false }; }
    const vp = a.validarPlan(d.planCobros, d.hitosPlan);
    if (!vp.ok) { toast('⚠ Plan de cobros: ' + vp.errores[0]); return { ok: false }; }
    a.aplicarVisitaLite(c, d);
    if (c.estado === 'visita_confirmada' && a.puedeTransitar(c, 'en_visita')) a.transitar(c, 'en_visita', { autor: 'reformista', texto: 'Visita técnica realizada (panel Lite)' });
    c.visita.estado = 'realizada';
    // cobro de la visita (a cuenta del presupuesto) si no estaba cobrada
    try {
      const imp = a.importeVisita(c, cfg);
      if (imp > 0 && !['cobrada', 'eximida', 'pendiente_pago', 'justificante_enviado'].includes(c.visita.cobro && c.visita.cobro.estado) && (cfg.visita.cobroCuando || 'en_visita') === 'en_visita') {
        c.visita.cobro = Object.assign({}, c.visita.cobro, { importe: imp, estado: 'cobrada', fecha: hoy });
        const vd = a.visitaDescuento(cfg);
        DBA().cobros.push({ id: a.uid('cob'), casoId: c.id, importe: imp, concepto: 'Visita técnica', fecha: hoy, estado: 'cobrado', metodo: 'efectivo', tipo: 'visita', descontable: vd.descontable, descontablePct: vd.pct });
        c.eventos.push({ fecha: hoy, tipo: 'cobro', texto: 'Cobrada la visita técnica (' + a.fmtEur(imp) + ')', autor: 'reformista' });
      }
    } catch (e) { console.warn(e); }
    a.adjuntarCondicionesVersion(c, ver, { negociacion: d.neg, planCobros: d.planCobros, hitosPlan: d.hitosPlan, quitados });
    ver.tabiques = (d.tabiques || []).map(t => Object.assign({}, t));
    a.enviarVersion(c, ver, d.canal || 'WhatsApp'); c.borrador = null;
    if (a.puedeTransitar(c, 'propuesta_enviada')) a.transitar(c, 'propuesta_enviada', { autor: 'reformista', texto: 'Presupuesto ' + ver.id + ' enviado tras la visita (' + a.fmtEur(tot.total) + ')' });
    c.interno.proximaAccion = 'Hacer seguimiento de la propuesta ' + ver.id;
    toast('✅ ' + ver.id + ' enviada: ya está en Admin y el cliente la ve en su panel');
    AP().refresh(); Proto.tick(true);
    banner('📤 <b>' + ver.id + '</b> enviada al cliente. El siguiente paso es del cliente: revisar y aceptar.', [['Ir al panel del cliente', () => { tab('cli'); W('cli').__P.irPanel('presupuesto'); }]]);
    return { ok: true, id: ver.id };
  }
  return { ok: false };
};
/* Cálculos del admin que el lite reutiliza (una sola regla): importe de un cambio rápido y catálogo para «Por partidas» */
Proto.calc = {
  cambio: (modo, datos, margen) => A().importeCambioRapido(modo, datos, margen),
  catalogo: () => A().catalogoCambios(DBA()),
  umbralTexto: id => { const c = DBA().casos.find(x => x.id === id); return c ? A().textoUmbral(c, DBA().cfg) : ''; }
};

/* ---------- 4b. Lite: modo Obra (R-26 a R-31) ---------- */
const TRIG = () => A().eval('TRIGGER_TXT');
const adminListo = () => { try { return !!(W('adm') && W('adm').__P && W('adm').__P.db()); } catch (e) { return false; } };
Proto.obrasLite = function () {
  if (!adminListo()) return [];
  const a = A(), db = DBA();
  return db.casos.filter(c => ['en_obra', 'terminada', 'en_remates'].includes(c.estado)).map(c => { const cl = db.clientes.find(x => x.id === c.clienteId) || {};
    return { id: c.id, cliente: cl.nombre, direccion: a.direccionDe(c), estado: c.estado, progreso: a.calcularProgreso(c), salud: (c.obra.hitos || []).length ? a.saludObra(c, db.cfg, a.hoy()) : null,
      incidenciasAbiertas: (c.obra.incidencias || []).filter(i => i.estado === 'abierta').length, hitos: (c.obra.hitos || []).length, pendienteConformidad: a.pendienteConformidad(c) }; });
};
Proto.obraVista = function (id) {
  if (!adminListo()) return null;
  const a = A(), db = DBA(), cfg = db.cfg, c = db.casos.find(x => x.id === id); if (!c || !c.obra) return null;
  const cl = db.clientes.find(x => x.id === c.clienteId) || {}; const tv = a.totalVigente(c), eco = a.estadoEconomico(c, db.cobros), um = a.umbralAdenda(c, cfg), pend = a.cambiosPendientes(c), plan = a.planCobros(c, cfg, db.cobros), trig = a.debeGenerarAdenda(c, cfg, {});
  const iva = a.ivaDe(c); const pendSin = r2(pend.reduce((s, x) => s + x.importe, 0)); const prox = plan.find(t => t.estado !== 'cobrado') || null;
  const regs = (c.obra.cambios || []).filter(x => x.estado === 'registrado' && !x.adendaId);
  return {
    id: c.id, cliente: cl.nombre, tel: cl.tel || '', direccion: a.direccionDe(c), estado: c.estado, progreso: a.calcularProgreso(c), salud: (c.obra.hitos || []).length ? a.saludObra(c, cfg, a.hoy()) : null, inicio: c.obra.inicio,
    pendienteConformidad: a.pendienteConformidad(c), margen: cfg.margen, ivaPct: iva, fotoObligatoriaHito: cfg.fotoObligatoriaHito !== false, espacios: (c.solicitud.espacios || []).filter(e => e.id !== 'gen').map(e => ({ id: e.id, nombre: e.nombre || e.tipo })),
    hitos: (c.obra.hitos || []).map(h => ({ id: h.id, nombre: h.nombre, dias: h.diasEstimados, estado: h.estado, fechaReal: h.fechaReal || null, fechaPrevista: h.fechaFinPrevista || h.fechaPrevista || null, nota: h.nota || '', fotos: (h.fotos || []).map(f => f.adjuntoId).filter(Boolean), nFotos: (h.fotos || []).length,
      desbloquea: (plan.find(t => t.cuando === 'hito:' + h.nombre && t.estado !== 'cobrado') || null) && { label: plan.find(t => t.cuando === 'hito:' + h.nombre && t.estado !== 'cobrado').label, importe: plan.find(t => t.cuando === 'hito:' + h.nombre && t.estado !== 'cobrado').importe } })),
    incidencias: (c.obra.incidencias || []).map(i => Object.assign({}, i, { fotos: (i.fotos || []).slice() })),
    cambios: (c.obra.cambios || []).map(x => ({ id: x.id, concepto: x.concepto, importe: x.importe, importeIva: r2(x.importe * (1 + iva / 100)), estado: x.estado, fecha: x.fecha, tipo: x.tipo, bloquea: !!x.bloqueaObra, adendaId: x.adendaId || null })),
    adendas: (c.obra.adendas || []).map(x => ({ id: x.id, delta: x.delta, estado: x.estado })),
    cuenta: { aceptada: tv.aceptada, adendasFirmadas: tv.adendasFirmadas, firmado: tv.firmado, provisional: tv.provisional, total: tv.total, cobrado: eco.cobrado, saldo: eco.saldo, pendienteSinIva: pendSin, umbralSinIva: um.sinIva, umbralConIva: um.conIva, umbralTexto: a.textoUmbral(c, cfg), pctUmbral: um.sinIva > 0 ? Math.min(100, Math.round(pendSin / um.sinIva * 100)) : 0, proximo: prox && { label: prox.label, importe: prox.importe, falta: prox.falta, estado: prox.estado }, disparadores: trig.map(t => TRIG()[t] || t), puedeAdenda: trig.length > 0 && regs.length > 0, nRegistrados: regs.length },
    fotos: (c.obra.fotos || []).map(f => ({ id: f.id, adjuntoId: f.adjuntoId || null, momento: f.momento, espacioId: f.espacioId, fecha: f.fecha })).concat((c.obra.hitos || []).flatMap(h => (h.fotos || []).filter(f => f.adjuntoId).map(f => ({ id: f.id, adjuntoId: f.adjuntoId, momento: f.momento || 'durante', espacioId: null, hito: h.nombre, fecha: f.fecha })))),
    catalogo: a.catalogoCambios(db)
  };
};
Proto.liteObra = function (kind, d) {
  d = d || {}; const a = A(), db = DBA(), cfg = db.cfg, c = db.casos.find(x => x.id === d.casoId); if (!c || !c.obra) return { ok: false, error: 'No se encuentra la obra' };
  const fin = res => { AP().refresh(); Proto.tick(true); return res; };
  try {
    if (!['en_obra', 'terminada', 'en_remates'].includes(c.estado)) return { ok: false, error: 'La obra no está en curso' };
    if (kind === 'hito') {
      const h = (c.obra.hitos || []).find(x => x.id === d.id); if (!h) return { ok: false, error: 'No se encuentra el hito' };
      if (d.estado === 'hecho' && cfg.fotoObligatoriaHito !== false && !(d.adjuntos || []).length) return { ok: false, error: 'Para marcar el hito como hecho hace falta al menos una foto' };
      a.marcarHito(c, d.id, d.estado, { adjuntos: d.adjuntos || [], nota: d.nota, momento: 'durante' });
      const avisos = []; const tr = d.estado === 'hecho' ? a.planCobros(c, cfg, db.cobros).find(t => t.cuando === 'hito:' + h.nombre && t.estado === 'debido') : null;
      if (tr) avisos.push('Este hito desbloquea el cobro del tramo «' + tr.label + '» (' + a.fmtEur(tr.falta) + ').');
      if (d.estado === 'hecho' && a.debeGenerarAdenda(c, cfg, { contexto: 'hito' }).includes('hito')) avisos.push('Hay cambios sin consolidar: conviene generar una adenda.');
      return fin({ ok: true, avisos });
    }
    if (kind === 'incidencia') { const inc = a.registrarIncidencia(c, d); return fin({ ok: true, incidencia: inc }); }
    if (kind === 'cambio') { const rs = a.altaCambioRapido(c, d, cfg); return fin({ ok: true, id: rs.ch.id, msg: rs.msg, disparadores: rs.trig.map(t => TRIG()[t] || t), tope: rs.trig.includes('tope'), umbralTexto: a.textoUmbral(c, cfg), puedeAdenda: rs.trig.length > 0 }); }
    if (kind === 'foto') { (d.adjuntos || []).forEach(aid => { c.obra.fotos.push({ id: a.uid('of'), fecha: a.hoy(), url: 'foto-lite.jpg', adjuntoId: aid, momento: d.momento || 'durante', espacioId: d.espacioId || null, origen: 'lite' }); Proto.adjuntos.setMeta(aid, { casoId: c.id }); }); c.eventos.push({ fecha: a.hoy(), tipo: 'obra', texto: (d.adjuntos || []).length + ' foto(s) de obra subidas desde el lite (' + (d.momento || 'durante') + ')', autor: 'reformista' }); return fin({ ok: true }); }
    if (kind === 'adenda') {
      const rq = a.requisitos('generar_adenda', c, {}); if (!rq.ok) return { ok: false, error: 'Te falta: ' + a.textoFaltan(rq) };
      const trig = a.debeGenerarAdenda(c, cfg, {}); const ids = (c.obra.cambios || []).filter(x => x.estado === 'registrado' && !x.adendaId).map(x => x.id);
      const ad = a.crearAdenda(c, ids, trig.includes('tope') ? 'tope' : trig.includes('umbral') ? 'umbral' : 'manual');
      return fin({ ok: true, id: ad.id, delta: ad.delta });
    }
  } catch (e) { return { ok: false, error: e.message }; }
  return { ok: false, error: 'Acción desconocida' };
};

/* ---------- 5. Cliente → Admin ---------- */
/* Cada acción se REVALIDA aquí con requisitos() antes de aplicar nada (R-15): aunque la interfaz falle, el estado no se corrompe. */
const ACCION_REQ = { elegirFranja: 'elegir_franja', pagarVisita: 'confirmar_visita', reprogramar: 'reprogramar', aceptar: 'aceptar', pedirCambios: 'pedir_cambios', rechazar: 'rechazar', solicitudObra: 'solicitud_obra', desacuerdo: 'desacuerdo', firmarAdenda: 'firmar_adenda', remate: 'listar_remate', conformidad: 'conformidad', valoracion: 'valorar', mensaje: 'mensaje', avisoPago: 'avisar_pago' };
function datosReq(kind, c, d) {
  switch (kind) {
    case 'elegirFranja': return { franja: c.visita.franjasOfrecidas[d.idx] };
    case 'pagarVisita': return { adjuntoId: d.adjuntoId, franja: c.visita.elegida };
    case 'reprogramar': return { franja: c.visita.franjasOfrecidas[d.idx], aceptaRetencion: !!d.aceptaRetencion };
    case 'aceptar': return { condiciones: !!d.condiciones, planRevisado: !!d.planRevisado, avisosLeidos: !!d.avisosLeidos, codigo: d.codigo };
    case 'pedirCambios': return { texto: d.t };
    case 'rechazar': return { motivo: d.motivo };
    case 'solicitudObra': return { texto: d.texto };
    case 'desacuerdo': return { id: d.id, comentario: d.comentario };
    case 'firmarAdenda': return { id: d.id, acepto: d.acepto !== false, nombre: d.nombre };
    case 'remate': return { texto: d.texto };
    case 'conformidad': return { checklistCompleto: !!d.checklistCompleto, firma: !!d.firma };
    case 'mensaje': return { texto: d.t, adjuntos: d.adjuntos || [] };
    case 'avisoPago': return { importe: d.importe, medio: d.medio, fecha: d.fecha, adjuntoId: d.adjuntoId };
    default: return {};
  }
}
Proto.cli = function (kind, d) {
  d = d || {};
  const c = casoActivo(); if (!c) return; const a = A(), hoy = a.hoy(), db = DBA(), cfg = db.cfg;
  const ev = (texto, tipo) => c.eventos.push({ fecha: hoy, tipo: tipo || 'cliente', texto, autor: 'cliente' });
  const nt = (tipo, texto, o) => a.notificar(db, c.id, tipo, texto, o);
  const nCli = db.clientes.find(x => x.id === c.clienteId) || {};
  const rechazar = rq => { toast('⚠ No se puede hacer todavía. Te falta: ' + a.textoFaltan(rq) + '.'); Proto.proyectarCliente(true); };
  try {
    // datos previos que el panel envía junto a la acción
    if (kind === 'aceptar' && d.fiscal) a.aplicarFiscal(c, d.fiscal);
    const accion = ACCION_REQ[kind];
    if (accion) {
      const rq = a.requisitos(accion, c, { db, cfg, cobros: db.cobros, datos: datosReq(kind, c, d) });
      if (!rq.ok) { rechazar(rq); return; }
    }
    switch (kind) {
      case 'elegirFranja': a.aplicarAccionCliente(c, 'elegir_franja', { franja: c.visita.franjasOfrecidas[d.idx] }); nt('franja', 'El cliente ha elegido franja de visita: ' + a.fmtFechaCorta(c.visita.elegida.fecha) + ' ' + c.visita.elegida.franja + (c.visita.cobro && c.visita.cobro.estado === 'pendiente_pago' ? ' · hueco reservado a la espera del pago' : '')); break;
      case 'pagarVisita': {
        a.aplicarAccionCliente(c, 'pagar_visita', { adjuntoId: d.adjuntoId, medio: d.medio || 'transferencia', fecha: d.fecha || hoy });
        const av = db.avisosPago.find(x => x.id === c.visita.cobro.avisoPagoId);
        a.escribirMensaje(c, { autor: 'cliente', texto: 'He pagado la visita (' + a.fmtEur(av.importe) + ' por ' + av.medio + '). Adjunto el justificante.', tipo: 'aviso_pago', adjuntos: [d.adjuntoId], sinEvento: true });
        nt('justificante', 'Justificante por confirmar: pago de la visita (' + a.fmtEur(av.importe) + ')', { clave: 'jf:' + av.id }); break; }
      case 'avisoPago': {
        a.aplicarAccionCliente(c, 'avisar_pago', { importe: d.importe, medio: d.medio, fecha: d.fecha, tramo: d.tramo, adjuntoId: d.adjuntoId, nota: d.nota });
        const av = db.avisosPago[db.avisosPago.length - 1];
        a.escribirMensaje(c, { autor: 'cliente', texto: 'He realizado un pago de ' + a.fmtEur(av.importe) + ' por ' + av.medio + ' (' + av.fecha + ')' + (av.tramo ? ' · ' + av.tramo : '') + '.' + (av.adjuntoId ? ' Adjunto el justificante.' : ''), tipo: 'aviso_pago', adjuntos: av.adjuntoId ? [av.adjuntoId] : [], sinEvento: true });
        nt('justificante', 'Justificante por confirmar: ' + (av.tramo || 'pago') + ' (' + a.fmtEur(av.importe) + ')', { clave: 'jf:' + av.id }); break; }
      case 'reprogramar': a.aplicarAccionCliente(c, 'reprogramar', { franja: c.visita.franjasOfrecidas[d.idx] }); break;
      case 'aceptar': {
        a.aplicarAccionCliente(c, 'aceptar', {}); if (c.aceptacion) { c.aceptacion.nombre = d.nombre || nCli.nombre; c.aceptacion.condiciones = true; }
        nt('aceptacion', 'El cliente ha aceptado la propuesta ' + (c.aceptacion ? c.aceptacion.versionId : '') + ' (' + a.fmtEur(c.aceptacion ? c.aceptacion.importe : 0) + ')'); break; }
      case 'pedirCambios': a.aplicarAccionCliente(c, 'pedir_cambios', { texto: d.t }); a.escribirMensaje(c, { autor: 'cliente', texto: 'Quiero pedir cambios en el presupuesto: ' + d.t, sinEvento: true }); nt('solicitud_cambio', 'El cliente pide cambios en el presupuesto: «' + d.t + '»'); break;
      case 'rechazar': a.aplicarAccionCliente(c, 'rechazar', { motivo: d.motivo }); break;
      case 'solicitudObra': (c.obra.solicitudesCambio = c.obra.solicitudesCambio || []).push({ id: a.nuevoIdSeq(c.obra.solicitudesCambio, 'S'), fecha: hoy, texto: d.texto, estado: 'abierta' }); ev('El cliente pide un cambio en la obra: ' + d.texto); nt('solicitud_cambio', 'Solicitud de cambio del cliente: «' + d.texto + '»'); break;
      case 'aceptarCambio': { const ch = c.obra.cambios.find(x => x.id === d.id); if (ch) { ch.avisoCliente = Object.assign({}, ch.avisoCliente, { aceptadoAt: hoy, desacuerdo: false }); ev('El cliente ha aceptado el cambio ' + ch.id + ': ' + ch.concepto); } break; }
      case 'desacuerdo': { a.aplicarAccionCliente(c, 'desacuerdo', { id: d.id }); const ch = c.obra.cambios.find(x => x.id === d.id); if (ch && d.comentario) ch.comentarioCliente = d.comentario; nt('duda_cambio', 'El cliente tiene dudas sobre el cambio ' + d.id + (ch ? ' («' + ch.concepto + '»)' : '') + (d.comentario ? ': ' + d.comentario : '')); break; }
      case 'firmarAdenda': a.aplicarAccionCliente(c, 'firmar_adenda', { id: d.id }); nt('firma_adenda', 'El cliente ha firmado la adenda ' + d.id); break;
      case 'remate': { a.aplicarAccionCliente(c, 'listar_remate', { texto: d.texto }); const r = c.obra.remates[c.obra.remates.length - 1]; if (r) { r.itemId = d.itemId || null; r.localId = d.localId || null; } nt('remate', 'El cliente ha listado un remate: «' + d.texto + '»'); break; }
      case 'conformidad': { a.registrarConformidadCliente(c, cfg, { nombre: d.nombre }); nt('conformidad', 'El cliente ha dado su conformidad: obra cerrada'); break; }
      case 'mensaje': {
        const tipo = d.kind === 'aviso_pago' ? 'aviso_pago' : d.kind === 'otra_fecha' ? 'otra_fecha' : 'mensaje';
        const m = a.escribirMensaje(c, { autor: 'cliente', texto: d.t || '', tipo, adjuntos: d.adjuntos || [] });
        nt(tipo === 'otra_fecha' ? 'franja' : 'mensaje', (tipo === 'otra_fecha' ? 'El cliente pide otras fechas de visita: «' : 'Mensaje del cliente: «') + String(d.t || '').slice(0, 100) + '»', { clave: 'msg:' + c.id + ':' + m.id }); break; }
      case 'leerMensajes': a.marcarMensajesLeidos(c, 'cli'); break;
      case 'datosVivienda': {
        const antes = !!(c.datosVivienda && c.datosVivienda.completos);
        const rs = a.aplicarDatosVivienda(c, d.campos, cfg);
        if (!rs.ok) { toast('⚠ ' + Object.values(rs.errores).join(' ')); break; }
        (c.datosVivienda.fotosExtra || []).forEach(fid => { if (!c.solicitud.fotosCliente.includes(fid)) c.solicitud.fotosCliente.push(fid); });
        const e2 = rs.evaluacion; ev(e2.completos ? 'El cliente ha completado los datos de su vivienda' : 'El cliente ha actualizado los datos de su vivienda (' + e2.hechos + ' de ' + e2.total + ' obligatorios)');
        if (e2.completos && !antes) nt('datos_vivienda', 'El cliente ha completado los datos de su vivienda', { clave: 'dv:' + c.id + ':ok' });
        e2.discrepancias.forEach(x => nt('discrepancia', x.texto, { clave: 'disc:' + c.id + ':' + x.id }));
        if (c.estado === 'esperando_info' && e2.completos && a.puedeTransitar(c, 'en_triaje')) a.transitar(c, 'en_triaje', { autor: 'cliente', texto: 'El cliente respondió con la información pedida' });
        break; }
      case 'fiscal': { const f = a.aplicarFiscal(c, d.fiscal); ev(f.completos ? 'El cliente ha completado sus datos de facturación' : 'El cliente ha actualizado sus datos de facturación'); nt('fiscal', f.completos ? 'Datos de facturación completos' : 'Datos de facturación actualizados (incompletos)', { clave: 'fis:' + c.id + ':' + (f.completos ? 'ok' : 'parcial') }); break; }
      case 'valoracion': ev('El cliente valora el servicio con ' + d.n + ' estrellas' + (d.t ? ': «' + d.t + '»' : '')); c.valoracion = { n: d.n, t: d.t }; nt('valoracion', 'Valoración del cliente: ' + d.n + ' estrellas'); break;
    }
  } catch (e) { console.error('Proto.cli', kind, e); toast('⚠ ' + e.message); }
  AP().refresh(); Proto.tick(true); Proto.proyectarCliente(true);
};

/* Evaluación en vivo de formularios del cliente con las MISMAS reglas del admin (no se duplican en el panel del cliente) */
Proto.evalVivienda = dv => { const c = casoActivo(); const fake = Object.assign({}, c || { vivienda: { tipo: 'piso' }, solicitud: {} }, { datosVivienda: dv }); return A().evaluarDatosVivienda(fake, DBA().cfg); };
Proto.evalFiscal = f => A().evaluarFiscal(f, casoActivo());

/* ---------- 6. Vigilancia de cambios ---------- */
const GUIA = {
  null: ['Rellena el configurador como cliente y envía la solicitud.', 'cfg', 'Ir al Configurador'],
  recibida: ['<b>Admin:</b> abre la nueva solicitud, revísala y pásala a triaje.', 'adm', 'Ir a Admin'],
  en_triaje: ['<b>Admin:</b> propón al cliente franjas para la visita técnica (o pídele más información).', 'adm', 'Ir a Admin'],
  esperando_info: ['El caso espera información del cliente. <b>Cliente:</b> completa los datos de tu vivienda / responde.', 'cli', 'Ir a Cliente'],
  visita_propuesta: ['<b>Cliente:</b> completa los datos de tu vivienda (sección «Visita») y elige uno de los huecos propuestos.', 'cli', 'Ir a Cliente'],
  visita_confirmada: ['<b>Cliente:</b> paga la visita y sube el justificante (el hueco está reservado) · <b>Admin:</b> confirma el cobro · <b>Lite:</b> haz la visita técnica y envía la V3.', 'lite', 'Ir a Lite'],
  en_visita: ['<b>Lite:</b> termina la revisión y envía (o guarda) la nueva versión del presupuesto.', 'lite', 'Ir a Lite'],
  propuesta_enviada: ['<b>Cliente:</b> revisa el presupuesto actualizado y acéptalo (o pide cambios).', 'cli', 'Ir a Cliente'],
  aceptada: ['<b>Cliente:</b> avisa del pago de la señal con su justificante · <b>Admin:</b> confírmala e inicia la obra desde la ficha del caso.', 'adm', 'Ir a Admin'],
  en_obra: ['<b>Admin:</b> marca hitos, registra cambios y cobros; <b>Cliente:</b> responde cambios y firma adendas. Cuando esté todo, termina la obra.', 'adm', 'Ir a Admin'],
  terminada: ['<b>Admin:</b> abre la fase de remates para que el cliente haga la revisión final.', 'adm', 'Ir a Admin'],
  en_remates: ['<b>Cliente:</b> completa el checklist final y firma tu conformidad. <b>Admin:</b> resuelve los remates y, si hace falta, reclama la conformidad (solo el cliente puede cerrar la obra).', 'cli', 'Ir a Cliente'],
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
  try { const p = A().horquillaPct(DBA().cfg), wc = W('cfg'); if (wc && wc.eval('CFG.HORQUILLA_PCT') !== p) wc.eval('CFG.HORQUILLA_PCT=' + p); } catch (e) {}
  const sig = c ? hash(JSON.stringify(c) + JSON.stringify(DBA().cobros.filter(x => x.casoId === c.id)) + JSON.stringify((DBA().avisosPago || []).filter(x => x.casoId === c.id)) + AP().off()) : '';
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
  if (k === 'lite'){ Proto.liteNuevo = false; try { W('lite').__P.refrescar(); } catch (e) {} }
  if (k === 'cli') { try { W('cli').__P.tieneCaso() && /^#\/correo/.test(W('cli').location.hash) === false && 0; } catch (e) {} }
  refreshBadges(); try { sessionStorage.setItem('protoTab', k); } catch (e) {}
}
function avanzar(d) { try { A().avanzarTiempo(d); Proto.tick(true); } catch (e) { console.error(e); } }
function reiniciarTodo() {
  if (!confirm('¿Reiniciar el prototipo? Se borrará la solicitud en curso y todos los cambios.')) return;
  try { localStorage.removeItem('panelClienteV1'); localStorage.removeItem('panelLiteV1'); localStorage.removeItem('panelClienteV2'); localStorage.removeItem('panelLiteV2'); sessionStorage.removeItem('protoTab'); } catch (e) {}
  try { Proto.adjuntos.limpiar(); } catch (e) {}
  location.reload();
}
function arrancar() {
  try { localStorage.removeItem('panelClienteV1'); localStorage.removeItem('panelLiteV1'); localStorage.removeItem('panelClienteV2'); localStorage.removeItem('panelLiteV2'); } catch (e) {}
  try { Proto.adjuntos.limpiar(); } catch (e) {} // cada carga parte de los datos de ejemplo
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


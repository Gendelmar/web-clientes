# Prototipo completo v2 — LEEME

> **Estado: todos los requisitos R-01 a R-37 implementados** (bloques A y B por el primer agente; bloques C, D y E, R-12 y R-37 por el segundo). Las decisiones tomadas y las limitaciones están en los apartados 6 y 7.

## 1. Qué es y cómo usarlo

`Prototipo_completo_v2.html` es la carcasa que une cuatro aplicaciones en pestañas: **Configurador** (cliente), **Admin** (reformista, base de datos maestra), **Lite** (visita técnica **y modo Obra**, en móvil/tablet) y **Cliente** (su panel). Se genera y se prueba con:

```bash
python3 prototipo_v2/build_prototipo.py      # incrusta src/{cfg,adm,lite,cli}.html en src/host.html (+ src/bridge.js)
node prototipo_v2/test_flujo_v1.js            # flujo completo de v1 + bloques A y B (51 comprobaciones)
node prototipo_v2/test_bloques_ab.js          # integración de los bloques A y B (28 comprobaciones)
node prototipo_v2/test_e2e_v2.js              # escenario del apartado 11.2, los 16 pasos (68 comprobaciones)
E2E_SHOTS=/ruta node prototipo_v2/test_e2e_v2.js   # lo mismo, con capturas del lite en 1360×860, 820×1180 y 400×820 y aviso si hay desbordes
# Dentro de los iframes: FR.adm.contentWindow.__tests() → 404/404 · FR.lite.contentWindow.__tests() → 49/49 · FR.cli.contentWindow.__tests() → 37/37
```

Estructura: `src/cfg.html`, `src/adm.html`, `src/lite.html`, `src/cli.html` (apps), `src/host.html` (carcasa) y `src/bridge.js` (puente `Proto`: `solicitud`, `buildV`, `proyectarCliente`, `proyectarLite`, `reabrirEnLite`, `lite`, `cli`, `adjuntos`, `calc`, `obrasLite`, `obraVista`, `liteObra`). Los cuatro archivos originales standalone de la raíz no se tocan. El admin guarda la base de datos maestra (`__P.db()`); el cliente y el lite reciben proyecciones; **el modo Obra del lite lee y escribe directamente sobre la obra del admin** a través del puente (no tiene copia propia).

Recorrido rápido con los datos de ejemplo: REF-0006 tiene un borrador de la V3 guardado desde el lite (pestaña Presupuesto de su ficha → «Reabrir en el lite»); REF-0010 es una obra bloqueada con plan, hitos e incidencias propios y una duda por resolver; REF-0009 tiene un cambio retirado y uno de cortesía; REF-0011 está en remates sin conformidad. O bien envía una solicitud desde el Configurador y recorre el flujo (es el escenario de `test_e2e_v2.js`).

Reglas heredadas: JS plano sin librerías ni CDN, HTML de usuario escapado, sin repintar un contenedor mientras se escribe en un input (los campos del lite escriben con `oninput` solo en los totales y con `onchange` el resto; las hojas y formularios se pintan una vez), reglas de negocio en funciones puras con pruebas, textos en es-ES, sin restos de Cloudflare (comprobado).

**Esquema de datos:** `db.meta.version = '3.0'` (admin, en memoria); localStorage del cliente `panelClienteV2` (`ver: 2`) y del lite `panelLiteV2` (`ver: 2`); la carcasa borra también las claves antiguas.

## 2. Trazabilidad requisito → dónde → cómo se comprueba

Estado: ✅ completo. Las funciones citadas existen con ese nombre en el código real. «e2e» = `test_e2e_v2.js` (el número de paso es el del apartado 11.2 del prompt); «adm / lite / cli» = `__tests()` de cada app.

| ID | Estado | Implementado en | Cómo se comprueba |
|---|---|---|---|
| R-01 | ✅ | `cfg.html`: `validarInmueble`, `cpValido`, `irPaso2` (mensajes junto a cada campo); el puente revalida en `Proto.solicitud` | e2e paso 1 (CP vacío bloquea); `test_flujo_v1` (CP 99999); adm «código postal» y apéndice B |
| R-02 | ✅ | `cfg.html`: payload con `cfg` y `materiales` por espacio, extras, calidad, urgencia, `BASE_POR_TRABAJO`/`baseTrabajo`; `bridge.js`: `lineasDesdeCalc` y `Proto.solicitud` (`caso.solicitud.detalle`, `espacios[].trabajos[] = {key,label,base,detalles}`); `adm.html`: `detallesDeTrabajo` | `test_bloques_ab` (detalle, bases, detalles, líneas); adm `detallesDeTrabajo`; e2e paso 5 (el lite muestra los detalles) |
| R-03 | ✅ | `adm.html`: `calcularHorquilla(total,nivel,pct)`, `horquillaPct`, `rangoVersion`, `fmtImporteVersion`, `recalcularHorquillas`; `cfg.html`: «Entre X € y Y €»; `cli.html`: `rangoV`; `lite.html`: `etiquetaTramo` (V1 en rango) | adm (A.5, V2 exacta, recálculo); `test_bloques_ab`; e2e paso 1 y paso 16 (5 → 10 % en vivo); lite R-16 |
| R-04 | ✅ | `cli.html`: `abrirDatos`, `dvFormHtml`, `dvUpd`, `guardarDatos`; `adm.html`: `evaluarDatosVivienda`, `aplicarDatosVivienda`, `fusionarDatosVivienda`, `caso.datosVivienda` | adm (REF-0004 inquilino sin permiso, ≥3 completos y ≥3 incompletos); e2e paso 3 |
| R-05 | ✅ | `cli.html` `vVisita` (franjas bloqueadas con motivo, formulario en pantalla, «Completar ahora»); `Proto.cli("elegirFranja")` revalida G1 | `test_flujo_v1` paso 3; e2e paso 3 |
| R-06 | ✅ | `adm.html`: plantillas del apéndice D (`PLANTILLAS_MSG`), mensaje previo, «Pedir más info» con campos, `pedirDatosModal`, `recordarDatosCliente` | `test_bloques_ab`; e2e paso 2 (mensaje «Completa tus datos» con enlace); adm plantillas |
| R-07 | ✅ | `adm.html`: `visitaRequierePago`, `iniciarReservaVisita`, `estadoReserva`, `liberarReserva`, reloj `reserva_pago`/`reserva_vencida`; `cli.html` `vPagoVisita`/`pagarVisita` | adm (reserva, recordatorio, liberación); `test_bloques_ab` (+24 h / +72 h); e2e pasos 3 y 4 |
| R-08 | ✅ | `cli.html` `abrirAceptar`/`fxHtml`/`acCheck`; `adm.html` `validarDNI/NIE/CIF/NIF`, `evaluarFiscal`, `aplicarFiscal`; `caso.fiscal` | adm (apéndice B); `test_flujo_v1` paso 5; e2e paso 8 (bloqueado sin facturación, DNI inválido y válido) |
| R-09 | ✅ | `adm.html` `fichaVivienda`/`fichaFacturacion` (chips), `generarProforma` y `paqueteGestoria` con `exigirFacturacion` (A9) | `test_bloques_ab` (chips y bloqueo); adm A9; e2e paso 14 (el paquete se bloquea sin facturación) |
| R-10 | ✅ | `adm.html`: `caso.mensajes[]`, `escribirMensaje`, `migrarMensajes`, `notificar`, apartado Mensajes; `bridge.js` `buildV.mensajes`; `cli.html` `vMensajes` | adm (migración idempotente, no leídos, notificaciones, ≥4 hilos); `test_bloques_ab`; e2e paso 15 |
| R-11 | ✅ | `cli.html` `abrirAvisoPago`/`avisoPagoOk`; `adm.html` `db.avisosPago`, `confirmarAvisoPago`, `rechazarAvisoPago`, cola «Cobros por confirmar», visor | adm (A3, confirmar/rechazar); `test_bloques_ab`; e2e pasos 4 y 9 |
| R-12 | ✅ | `adm.html`: `crc32`, `crearZip` (almacenado «store»: cabeceras locales, directorio central y registro final escritos a mano), `leerZip`, `dataUrlABytes`, `nombreJustificante`, `paqueteGestoriaDatos`, `paqueteGestoria` (modal con aviso de movimientos sin justificante, «Descargar ZIP» y «por separado» si falla), exige A9 | adm: CRC32 de «123456789» = CBF43926, ida y vuelta con UTF-8 y binario, directorio central, paquete de REF-0009 (2 justificantes) y REF-0008 (aviso), A9; e2e paso 14 (descarga real, firma PK, CRC de todos los archivos, CSV con columna «justificante»); validado también con `zipfile` de Python |
| R-13 | ✅ | `bridge.js` `Proto.adjuntos` (IndexedDB con respaldo en memoria); cfg, admin, cliente **y lite** lo usan; las fotos del lite guardan solo `adj` (id) | `test_bloques_ab` (put/get/del/lista, formatos, 5 MB, 1600 px, ids en la DB); e2e paso 10 (fotos de hito, incidencia y obra por id) |
| R-14 | ✅ | `adm.html`: `puedeCerrarObra("plazo")` siempre false, `transitar` a «cerrada» solo con `autor:"cliente"`, única escritura `registrarConformidadCliente`; chip y «Reclamar conformidad» | `test_flujo_v1`; `test_bloques_ab` (búsqueda en código); adm; e2e paso 13 |
| R-15 | ✅ | `adm.html` `requisitos(accion, caso, ctx)` (matrices 5.2 y 5.3), `mapaRequisitosCliente`, `exigir`; el puente revalida en `Proto.cli`, `Proto.lite("enviar")` y `Proto.liteObra` (hito sin foto, adenda sin cambios); UI «Te falta: …» | adm: una aserción por fila G1–G18 y A1–A11 + cobertura de las 30 acciones; `test_flujo_v1`; e2e paso 10 (el puente rechaza un hito sin foto) |
| R-16 | ✅ | `lite.html`: `cardVersiones`, `verCambios`, `diffLineas`, `etiquetaTramo`; `bridge.js`: `versionesLite` y `datosLite` (pasan **todas** las versiones con sus líneas) | lite (diff entre versiones, V1 en rango); e2e paso 5 (V1 en rango, V2 y el borrador V3 en la primera pantalla) |
| R-17 | ✅ | `lite.html`: `describirTrabajo(key, detalles, tipoEspacio)` (electricidad, tabiques, ventanas, demolición, pintura, calefacción, aire, ventilación, cocina, planta, notas), `panelPidioCliente` («Lo que pidió el cliente» + «Verificado en la visita», con la diferencia resaltada), `cardClienteSala` (materiales elegidos); `bridge.js` `estLite` | lite (6 pruebas de `describirTrabajo`); e2e paso 5 (puntos de luz = 5 y tabique «Derribar y levantar · Pladur») |
| R-18 | ✅ | `lite.html`: `crearTabique`, `cantidadTabiques`, `abrirTabique`/`sheetTabique`/`guardarTabique`/`confirmarTabique`, `cardTabiques` (visible en ambas estancias), «Añadir estancia» reutiliza `crearEst`, pregunta por reponer el acabado; `adm.html` `aplicarVisitaLite` guarda `caso.visita.tabiques` | lite (m², línea con m² medidos); e2e paso 5 (tabique 3 × 2,5 compartido cocina–salón y reposición en la contigua) |
| R-19 | ✅ | `lite.html`: `superficie`, `difPct`, `cardSuperficie` (ancho × largo, comparación y aviso > 15 %), `medirSup`, `recalcM2` (por base); `adm.html` `superficieAnchoLargo` | adm y lite (A.1: 2,40 × 1,60 = 3,84); e2e paso 5 |
| R-20 | ✅ | `lite.html`: `calcularParedes`, `paredesDe`, `cantidadPorBase`, `cardParedes` (alto, huecos, reparto por altura de alicatado con atajos y ml hasta el techo, o por %), `setAlto`/`addHueco`/`setReparto`; `adm.html` `calcularParedes` | adm y lite: caso A (11,04 / 7,36) y caso B (10,75 / 7,65), % y un solo acabado; e2e paso 5 (las partidas toman 11,04 y 7,36) |
| R-21 | ✅ | `lite.html`: `guardarBorrador` (autoguardado con retardo si cambia el contenido + botón), `pack`, `snapshot`, `sheetConflicto`, `mezclarAdminLineas`, restauración con o sin instantánea; `bridge.js` `Proto.lite("borrador")`, `reabrirEnLite`; `adm.html` `guardarBorradorLite`, `lineasDeLite`, `aplicarVisitaLite`, `tocarBorrador` (rev/por/fecha), sección «Borrador V3 (desde la visita)» en la ficha, chip en listas, Resumen y notificación, «Reabrir en el lite» | adm (modelo, ids estables, conflicto con fecha, forzar); lite (`mezclarAdminLineas`); e2e paso 6 (guardar, ficha, Resumen, listas, reabrir, conflicto) |
| R-22 | ✅ | `lite.html`: `desgloseArbol`, `cardDesglose` (árbol estancia → trabajo → partidas con cantidad, unidad, precio, subtotal y diferencia) y resumen compacto | lite (sumas y diferencia); e2e paso 7 |
| R-23 | ✅ | `lite.html`: `cardPlan`, `normalizarPlanL`, `importesPlan`, `validarPlanL`, reasignar al eliminar un hito, renombrar actualiza disparadores; `adm.html`: `adjuntarCondicionesVersion` (`caso.planCobros`, `caso.obra.hitosPlan`), `hitosDeCaso`, `importesPlanPrevio`; `cli.html` `planPreHtml` + casilla G6 | adm/lite/cli; e2e pasos 7, 8 y 9 (plan 40/20/40, hito renombrado, el cliente lo ve antes de aceptar, la obra arranca con esos hitos) |
| R-24 | ✅ | `lite.html`: `cardNegociacion` (margen, IVA, descuento € o %, validez, plazo calculado y editable, imprevistos, redondeo, condiciones; recálculo en vivo sin repintar los campos), `totalesDe(est, aj, neg)`, `boxBeneficio` («Tu beneficio»); `adm.html` `calcularTotalesNeg`; `cli.html` `ajHtml` | adm y lite (totales y beneficio); e2e paso 7 (los totales del cliente y del admin coinciden) |
| R-25 | ✅ | `lite.html`: `cardDatosCliente`, `recordarCliente` (sin formulario fiscal); `adm.html` `estadoDatosCliente`, `recordarDatosCliente`; el Modo visita del admin ya mostraba solo el estado | adm; e2e paso 5 |
| R-26 | ✅ | `lite.html`: `selectorModo`, `cambiarModo`, `vObraLista`, `abrirObra`; `bridge.js` `Proto.obrasLite` (en_obra, terminada, en_remates). Cambiar de modo no pierde el estado de la visita | e2e paso 10 |
| R-27 | ✅ | `lite.html` `obraHitos`, `hitoHechoSheet`/`hitoHechoOk` (foto obligatoria por `cfg.fotoObligatoriaHito`, nota, aviso del tramo que desbloquea); `bridge.js` `Proto.liteObra("hito")` → `marcarHito` con adjuntos; salud recalculada | e2e paso 10 (sin foto el puente lo rechaza; con foto llega al admin —miniatura— y al cliente) |
| R-28 | ✅ | `lite.html` `obraIncid`, `incSheet`/`incGuardar` (tipos, descripción con nota de voz simulada, fotos, gravedad, bloquea, plazo, coste → abre el cambio precargado, visible); `adm.html` `registrarIncidencia`, `resolverIncidencia`, `obraIncidencias` (subapartado con filtro y resolución), salud y notificación; `cli.html` `incidenciasHtml` | adm (modelo, replanificación, salud); e2e paso 10 |
| R-29 | ✅ | `adm.html` `importeCambioRapido` (3 modos), `catalogoCambios`, `altaCambioRapido`, nuevo `registrarCambioModal` (sustituye al de ocho campos); `lite.html` `cambioSheet`/`cmGuardar` con el mismo cálculo vía `Proto.calc`, aviso WhatsApp/copiar y disparadores | adm (3 modos, errores); e2e paso 10 (coste 1.000 + 22 % = 1.220 desde el lite) |
| R-30 | ✅ | `lite.html` `obraCuenta` (total vigente, barra frente al umbral, cobrado, saldo, próximo cobro, cambios y adendas, atajo «Generar adenda» → `Proto.liteObra("adenda")`) | e2e pasos 10 y 11 |
| R-31 | ✅ | `lite.html` `obraFotos`/`fotoObraSheet` (por estancia y momento); `adm.html` `fotoThumbHtml` en la galería; `cli.html` galería con las fotos reales | e2e paso 10 |
| R-32 | ✅ | `adm.html`: `planCobros` (intermedios = pct × aceptada; cambios firmados al siguiente tramo sin cobrar; último = resto; lo provisional nunca se cobra), `normalizarPlan`, `validarPlan`, `cfg.cobrarCambiosFirmados` (siguiente / al firmar / al entregar); cliente: `planPagos` desde `planTramos` | adm: los 5 casos del apéndice A.3 y los modos; cli; e2e paso 12 |
| R-33 | ✅ | `adm.html`: `umbralAdenda` (única función: sin IVA y con IVA), `umbralAdendaEur`, `textoUmbral`, `debeGenerarAdenda`; usada por avisos, constructor de adendas, lite y configuración | adm: A.4 (495,87 / 600,00; dispara a esa cifra); e2e pasos 10, 11 y 16 |
| R-34 | ✅ | `adm.html`: `resolverDesacuerdo(caso,id,accion,importe,nota)` (ajustar / retirar / mantener con nota), `desacuerdoModal`, aviso con plantilla; estado `retirado`; cliente: etiqueta y resolución | adm (3 opciones, mensaje, no suma); cli; e2e paso 11 |
| R-35 | ✅ | `adm.html`: 7 apartados (`REDIR_NAV`, pestaña «Cobros y movimientos» en Obras, «Clientes» en Presupuestos, pestaña «Cuenta» de la ficha); `cli.html`: `navActual`, `vCuenta`, Entrega dentro de Obra, barra inferior ≤ 5 | adm; cli; e2e pasos 8 y 16 (pestañas antes y después de aceptar) |
| R-36 | ✅ | `adm.html`: `CFG_ESENCIAL` (10 secciones), `CFG_AVANZADO`, interruptor `cfgModo`, `cfgPlanDefecto`, nuevos ajustes (`negociacionDef`, `fotoObligatoriaHito`, `cobrarCambiosFirmados`…) y «Restablecer valores por defecto» por grupo | adm; e2e paso 16 |
| R-37 | ✅ | Este LEEME; `__tests()` de las cuatro apps; `test_flujo_v1.js`, `test_bloques_ab.js`, `test_e2e_v2.js` | Ver apartado 8 |

## 3. Lógicas de dependencia añadidas (R-15)

Una sola función pura, `requisitos(accion, caso, ctx)` → `{ ok, faltan:[{id,texto,accion}], avisos:[] }`. Sin `ctx.datos` evalúa la parte **estructural** (la que se proyecta al cliente en `V.requisitos`); con `ctx.datos` añade las comprobaciones de formulario (casillas, texto, código…), que es lo que revalida el puente.

| Acción | Requisito | Dónde se valida |
|---|---|---|
| G1 elegir franja | Datos de vivienda obligatorios completos | `requisitos` · UI `vVisita` · `Proto.cli('elegirFranja')` |
| G2 confirmar visita (pago) | Reserva pendiente de pago + justificante antes de «He pagado» | `requisitos` · `pagarVisita` · `Proto.cli('pagarVisita')` |
| G3 reprogramar | Visita confirmada, franja libre, aceptar retención si faltan <24 h | `requisitos` · `abrirReprogramar` · puente |
| G4 otra fecha | Solo en `visita_propuesta`, con texto | `requisitos` |
| G5 pedir cambios / rechazar | Versión vigente, texto o motivo | `requisitos` · puente |
| G6 aceptar | Vigente y no caducado, vivienda completa (inquilino con permiso), facturación completa con NIF válido, casillas (condiciones, plan, avisos de la visita) y código | `requisitos` · `abrirAceptar`/`acCheck` · puente |
| G7 avisar de un pago | Aceptado, importe > 0 (aviso si supera lo pendiente), fecha no futura, justificante salvo efectivo, **y no duplicado** | `requisitos` · `abrirAvisoPago` · puente |
| G8 cambio en obra | Obra en curso, ≥10 caracteres | `requisitos` · puente |
| G9 «No estoy de acuerdo» | Cambio pendiente, comentario | `requisitos` · puente |
| G10 firmar adenda | Adenda por firmar, casilla, nombre = nombre de facturación (sin tildes ni mayúsculas), sin cambios en duda | `requisitos` · `faCheck` · puente |
| G11 listar remate | Obra terminada o en remates, texto | `requisitos` · puente |
| G12 conformidad | Fase `en_remates`, sin remates abiertos, checklist completo, sin cambios pendientes ni en duda, firma; el saldo se avisa pero no bloquea | `requisitos` · puente · `registrarConformidadCliente` |
| G13 valorar | Obra cerrada | `requisitos` · puente |
| G14 mensaje | Texto o adjunto | `requisitos` · puente |
| G15 descargar | Solo documentos existentes | `requisitos` |
| G16 fotos extra | Antes de aceptar | `requisitos` |
| G17 fecha deseada | No anterior a hoy | `requisitos` · `validarCamposVivienda` |
| G18 pagar tramo | Solo tramos «debidos» | `requisitos` |
| A1 enviar V2/V3 | ≥1 línea, total > 0, IVA definido, V3 solo con visita realizada | `exigir` en `c_enviarVersion`, `mvConfirmarEnvio`, `confirmarPresupuestoSinVisita`; `Proto.lite('enviar')` |
| A2 proponer visita | 1–3 franjas libres, contacto del cliente | `confirmarProponer` |
| A3 confirmar cobro | Justificante (transferencia/Bizum) o nota «sin justificante» | `avisoConfirmarOk`, `confirmarAvisoPago` |
| A4 cobro manual | Importe > 0; aviso si supera el saldo | `cobroConfirmar` |
| A5 iniciar obra | Presupuesto aceptado y señal confirmada (`exigirSenalParaIniciar`), o «iniciar igualmente» con nota | `obraIniciar` y `fichaObra` |
| A6 generar adenda | ≥1 cambio registrado, sin cambios en duda | `adendaEnviar` |
| A7 terminar obra | Sin cambios sin consolidar; hitos sin hacer → confirmación expresa | `obraTerminar` |
| A8 cerrar obra | **No existe** para el reformista | `requisitos`, `transitar`, UI sin botón |
| A9 proforma / paquete | Nombre, NIF válido y domicilio fiscal | `generarProforma`, `paqueteGestoria` (`exigirFacturacion`) |
| A10 cerrar visita | Total > 0; aviso (no bloqueo) si hay estancias sin medir | `mvConfirmarEnvio`, `mvDejarBorrador`, `Proto.lite('enviar')` |
| A11 resolver duda | «Mantener» exige nota; «retirar» motivo; «ajustar» importe | `desacuerdoOk` (tres opciones, R-34) |

**Huecos encontrados en la auditoría 5.4 y cerrados con el mismo patrón** (acción → requisito → dónde):

| Hueco | Requisito añadido | Dónde |
|---|---|---|
| Las simulaciones del cliente desde el admin («Simular: acepta», firma de adenda, elegir franja…) se saltaban todo | Pasan por `requisitos` con datos de formulario simulados | `accCliente` |
| Doble confirmación de un mismo aviso de pago | El aviso debe estar `pendiente` (A3) | `requisitos('confirmar_cobro')`, `confirmarAvisoPago` |
| Enviar dos veces el justificante de la visita | Solo con la reserva en `pendiente_pago` (G2) | `requisitos('confirmar_visita')` |
| Avisos de pago duplicados (mismo importe, medio y fecha) | `duplicado` (G7) | `requisitos('avisar_pago')` |
| Cerrar la obra sin conformidad del cliente (transición directa) | `transitar` a `cerrada` solo con `autor:'cliente'` | `transitar` |
| Registrar un cobro con importe distinto del avisado sin explicarlo | Nota obligatoria | `avisoConfirmarOk` |
| Valorar sin obra cerrada; aceptar versión caducada; actuar sobre versión sustituida | G13 / G6 / G5 | `requisitos` |
| Iniciar la obra sin señal | A5 | `obraIniciar` |
| Terminar la obra con hitos pendientes sin darse cuenta | Confirmación expresa (A7) | `obraTerminar` |
| Proforma/gestoría con datos fiscales vacíos | A9 | `exigirFacturacion` |

**Lógicas de dependencia añadidas en el segundo tramo** (acción → requisito → dónde):

| Acción | Requisito | Dónde se valida |
|---|---|---|
| Marcar un hito como hecho (lite) | Al menos una foto (`cfg.fotoObligatoriaHito`, por defecto sí) | `Proto.liteObra("hito")` y la hoja del lite |
| Registrar un cambio con el formulario rápido | Concepto e importe distinto de 0 | `altaCambioRapido` (lite y admin) |
| Registrar una incidencia | Descripción obligatoria | `registrarIncidencia` |
| Resolver una duda | «Mantener» exige nota; «retirar» exige motivo | `requisitos("resolver_duda")`, `resolverDesacuerdo` |
| Generar una adenda desde el lite | A6 (≥ 1 cambio registrado, sin cambios en duda) | `Proto.liteObra("adenda")` |
| Enviar la V3 desde el lite | A1 y A10 + **plan de cobros válido** (intermedios ≤ 100 %, hitos existentes) | `Proto.lite("enviar")` |
| Guardar el borrador desde el lite | Si el admin lo modificó después, aviso con fecha (la última modificación prevalece) | `guardarBorradorLite` (`baseRev` frente a `rev`) |
| Eliminar un hito que dispara un cobro | Reasignar antes el disparador | `hitoPlanDel` (lite) |
| Paquete para la gestoría | A9 (facturación completa) y aviso de movimientos sin justificante | `paqueteGestoria` |
| Operar la obra desde el lite | Obra en `en_obra`, `terminada` o `en_remates` | `Proto.liteObra` |

## 4. `BASE_POR_TRABAJO` (cfg.html)

La base indica de qué medida depende la cantidad de cada trabajo; las líneas la heredan (`linea.base`) para que el lite recalcule al medir. Si el trabajo se declara por unidades en una estancia (`unidad:'ud'`) la base es `ud`; si por metros lineales, `ml` (**extensión** a la lista de la spec: son metros declarados por el cliente, no se derivan de las medidas de la estancia). Los materiales elegidos (`mat_<categoría>_<prodId>`, línea `tipo:'mat'`) usan `BASE_POR_MATERIAL`: azulejo → `m2_pared_alicatado`, suelo → `m2_suelo`, pintura → `m2_pared_pintura`. Extras y recargos: `fijo`. Nota: en el configurador `pintar_paredes` ya suma el techo a las paredes al calcular la cantidad.

| key | Trabajo | Grupo | Unidad en el configurador | Base |
|---|---|---|---|---|
| `demolicion_completa` | Demolición y vaciado | Demolición | m2 / ud | `m2_suelo / ud` |
| `solo_revestimientos` | Solo retirada de revestimientos | Demolición | m2 | `m2_pared` |
| `redistribucion_tabiques` | Redistribución de tabiques | Tabiquería y distribución | ud | `ud` |
| `renovar_fontaneria` | Renovar fontanería completa | Fontanería | ud | `ud` |
| `renovar_electricidad` | Renovación eléctrica completa | Instalación eléctrica | ud | `ud` |
| `suelo_radiante` | Suelo radiante | Fontanería | m2 | `m2_suelo` |
| `cambiar_baldosas` | Cambiar baldosas (zona húmeda/ducha) | Revestimientos | m2_pared | `m2_pared_alicatado` |
| `cambiar_suelo` | Cambiar suelo del baño | Suelos y pavimentos | m2 | `m2_suelo` |
| `pintar_paredes` | Pintura de paredes y techo | Pintura | m2_pared | `m2_pared_pintura` |
| `falso_techo` | Techo / Falso techo | Techos | m2 | `m2_techo` |
| `instalar_ducha` | Instalación de ducha/plato | Sanitarios | ud | `ud` |
| `instalar_banera` | Instalación de bañera | Sanitarios | ud | `ud` |
| `instalar_inodoro` | Instalar inodoro | Sanitarios | ud | `ud` |
| `instalar_lavabo` | Instalar lavabo | Sanitarios | ud | `ud` |
| `instalar_mueble` | Montaje de mueble de baño | Mobiliario de baño | ud | `ud` |
| `instalar_espejo` | Instalar espejo | Mobiliario de baño | ud | `ud` |
| `radiador_toallero` | Radiador toallero | Mobiliario de baño | ud | `ud` |
| `cambiar_puerta` | Cambiar puerta | Carpintería | ud | `ud` |
| `cambiar_ventana` | Cambiar ventana | Carpintería | ud | `ud` |
| `extractor_ventilacion` | Extractor / Ventilación | — | ud | `ud` |
| `ac_pared` | Aire acondicionado de pared | — | ud | `ud` |
| `ac_split` | Split (cassette/conductos) | — | ud | `ud` |
| `ventilador_techo` | Ventilador de techo | — | ud | `ud` |
| `radiadores` | Instalar radiador | Climatización | ud | `ud` |
| `alicatar_paredes` | Cambiar azulejos / revestimiento | Revestimientos | m2_pared | `m2_pared_alicatado` |
| `instalar_muebles` | Muebles de cocina | Mobiliario de cocina | ml | `ml` |
| `encimera` | Encimera | Mobiliario de cocina | ml | `ml` |
| `instalar_campana` | Campana extractora | Mobiliario de cocina | ud | `ud` |
| `instalar_fregadero` | Fregadero | Mobiliario de cocina | ud | `ud` |
| `instalar_caldera` | Instalar caldera | — | ud | `ud` |
| `tirar_pared` | Demolición de pared | Demolición | ud | `ud` |
| `abrir_hueco` | Abrir o tapiar un hueco | Tabiquería y distribución | ud | `ud` |
| `papel_pintado` | Papel pintado | Pintura | m2_pared | `m2_pared_pintura` |
| `pulir_parquet` | Pulir y barnizar parquet | Suelos y pavimentos | m2 | `m2_suelo` |
| `armario_empotrado` | Armario empotrado | Carpintería | ml | `ml` |
| `puntos_de_luz` | Añadir puntos de luz / enchufes | Instalación eléctrica | ud | `ud` |
| `montaje_muebles` | Montaje de muebles — estanterías y mobiliario | Mobiliario | ud | `ud` |
| `pintura_integral` | Pintura integral vivienda | Pintura | m2 | `m2_pared_pintura` |
| `suelos_integral` | Cambio de suelos completo | Suelos y pavimentos | m2 | `m2_suelo` |
| `electricidad_integral` | Renovación eléctrica completa | Instalación eléctrica | m2 | `m2_suelo` |
| `fontaneria_integral` | Fontanería completa | Fontanería | m2 | `m2_suelo` |
| `demolicion_integral` | Demolición y redistribución | Demolición | m2 | `m2_suelo` |
| `limpiar_rejuntar` | Limpiar y rejuntar baldosas | Suelos y pavimentos | m2 | `m2_suelo` |
| `impermeabilizar` | Impermeabilización de terraza | Impermeabilizaciones | m2 | `m2_suelo` |
| `cerrar_terraza` | Cerramiento de terraza | Cerramientos | m2 | `m2_suelo` |
| `pergola_toldo` | Pérgola o toldo | Equipamiento exterior | ud | `ud` |
| `cambiar_barandilla` | Cambiar barandilla | Carpintería | ml | `ml` |

## 5. Modelo de datos añadido

```js
caso.solicitud.detalle = { inmueble, extras, calidad, urgencia, obraHabitada, elegiMateriales, materiales, notas, resultado,
                           espacios: { [espId]: { cfg, materiales, notas } } };
caso.solicitud.espacios[].trabajos[] = { key, label, base, detalles };
caso.datosVivienda = { ubicacion:{…}, regimen, permisoPropietario, permisoDocId, contactoPropietario, anioConstruccion, anioDesconocido, inicio, inicioSinFecha, habitada, fotosExtra:[adjId], comentarios, comunidad, completos, pedidos };
caso.fiscal    = { tipo, nombre, nif, razonSocial, cif, domicilio:{…}, mismaDireccion, usoVivienda, completos };
caso.mensajes[] = { id, fecha, autor, texto, adjuntos:[adjId], tipo, leido:{adm,cli} };
caso.visita.cobro = { importe, politica, estado, avisoPagoId, reservaIniciadaAt, reservaExpiraAt, recordadaAt };
caso.visita.medidas[espId] = { largo, ancho, alto, huecos:[{tipo,ancho,alto}], reparto:{modo:'altura'|'pct',hAlic,Lt,pct}, aplicada, origen:'lite' };   // R-19, R-20
caso.visita.tabiques[] = { id, espacioId, contiguaId, longitud, alto, m2, accion, material, trabajoId, reponer };                                      // R-18
caso.borrador = { origen:'lite', v3id, basadoEn, lineas:[…{liteId,tabiqueId}], ivaPct, margenPct, ajustes, negociacion, medidas, tabiques, hitosPlan, planCobros,
                  notas, general, fotos:[adjId], respuestas, quitados, totales, pendienteEnvio, snap, rev, por:'lite'|'admin', actualizadoAt } | null;       // R-21
negociacion = { descuentoModo:'pct'|'eur', descuento, validezDias, plazoSemanas, imprevistosPct, redondeo:0|10|50|100, condiciones };                    // R-24
version = { …, negociacion, planCobros:[{label,pct,cuando}], hitosPlan:[{nombre,diasEstimados}], tabiques, totales:{…, imprevistos, descuento, ajusteRedondeo, beneficio} };
caso.planCobros = [{ label, pct, cuando:'aceptacion'|'hito:<nombre>'|'entrega'|'firma' }] | null;     // por caso; si es null, el de configuración. El último tramo es siempre «el resto»
caso.obra = { …, hitosPlan:[{nombre,diasEstimados}], incidencias:[{ id, fecha, tipo, texto, fotos:[adjId], gravedad, bloquea, diasRetraso, visibleCliente, estado:'abierta'|'resuelta', cambioId, resolucion, voz }],
              fotos:[{ id, fecha, momento:'antes'|'durante'|'despues', espacioId, adjuntoId }], hitos[].{ fotos:[{adjuntoId,momento}], nota } };
cambio = { …, estado:'registrado'|'en_desacuerdo'|'consolidado'|'retirado', modoImporte:'final'|'coste_margen'|'partidas', coste, partidas, cortesia, motivoRetiro, notaMantener, resolucion:{accion,nota,fecha}, origen:'lite'|'admin', incidenciaId };
db.avisosPago[], db.notificaciones[]     // tipos de notificación nuevos: 'incidencia', 'borrador'
movimiento = { …existente, justificanteId, avisoId, sinJustificante, nota };
cfg = { …, horquillaV1Pct:5, exigirSenalParaIniciar:true, cobrarCambiosFirmados:'siguiente'|'al_firmar'|'entrega', fotoObligatoriaHito:true, negociacionDef:{…}, empresa:{…, firma},
        viviendaObligatorios:[…], cobros:{…, justificanteObligatorio:{…}}, visita:{…, cobroCuando, reservaPagoHoras} };
```

`buildV(caso)` proyecta al cliente, además de lo ya descrito: `versiones[].{aj, plan, hitosPlan}`, `plan` (con importes; vista previa antes de aceptar), `planTramos` (después de aceptar, tal cual `planCobros`), `hitosPlan`, `obra.{incidencias, fotosObra, hitos[].fotosAdj}` y `cambios[].{resolucion, cortesia, motivoRetiro}`. `datosLite(caso)` proyecta al lite: todas las versiones con líneas, `est[].{detalle, lineas[].{key,bk,tl,det}}`, `estadoDatos`, `medidas`, `borrador` y `cfg` (hitos, plan, negociación por defecto, foto obligatoria).

## 6. Decisiones tomadas (ambigüedades menores)

1. **Mensajes:** `caso.mensajes[]` es la fuente de la conversación; los eventos `tipo:'mensaje'` se **conservan** en el historial (la prioridad y `clienteActuoDesde` dependen de ellos) y `escribirMensaje` escribe en ambos sitios (`sinEvento:true` para omitir el evento).
2. **Reserva de visita:** al elegir franja el caso pasa a `visita_confirmada` con `cobro.estado='pendiente_pago'` y el hueco ocupa la agenda; al vencer vuelve a `visita_propuesta`. El Lite **sí carga** una visita reservada y sin pagar (no se bloquea); la Agenda la marca «reservada, pendiente de pago». Si la política es `en_visita` o no cobra, se omite el pago.
3. **Atajos del año de construcción** («antes de 1980», «1980–2000», «después de 2000»): rellenan 1970 / 1990 / 2010 como año aproximado editable.
4. **Horquilla:** se guarda `lo`/`hi` exactos (±pct %) y se muestran redondeados hacia fuera. Solo `V1` de tipo `estimacion` es rango; `rangoVersion` es la única fuente para mostrar y para las reglas (`accionSugerida`, calidad del lead). El configurador usa `CFG.HORQUILLA_PCT`, que la carcasa mantiene igual que `horquillaV1Pct` del admin.
5. **`fiscal.nombre` en empresas** es la persona que firma (G10 compara con `razonSocial` si no hay). La declaración «uso particular» se guarda como `'si'|'no'`.
6. **Obligatorios del R-04:** cinco (`ubicacion`, `regimen` —que incluye el permiso si es inquilino—, `anioConstruccion`, `inicio`, `habitada`); piso y puerta se exigen solo si la vivienda es un piso. La fecha «no anterior a hoy» se valida al guardar, no al evaluar la completitud (para que un caso no «pierda» sus datos con el paso del tiempo).
7. **Configuración:** los ajustes nuevos están en los grupos correspondientes; la separación esencial/avanzado (R-36) ya está hecha: ver la decisión 25.
8. **Cobros por confirmar:** `cfg.cobros.justificanteObligatorio` es por medio. «Confirmar sin justificante» exige nota y marca el movimiento `sinJustificante`.
9. **Datos de ejemplo (punto 10, parte mía):** 7 casos con vivienda completa y 10 incompletos (REF-0004 inquilino sin permiso); V1 en horquilla y V2/V3 exactas; 2 avisos pendientes (imagen SVG y PDF simulado) y 1 rechazado; movimientos con justificante y uno «sin justificante»; 10 conversaciones (4 con mensajes sin leer por el admin y 3 sin leer por el cliente); 10 notificaciones; REF-0011 `en_remates` sin conformidad. Los marcadores se generan en código (`svgMarcador`, `pdfSimulado`) y se siembran en `Proto.adjuntos` (los datos solo guardan ids). Las fotos de hitos del panel del cliente siguen siendo marcadores SVG generados en el propio panel (no son adjuntos del usuario).
10. **Simuladores (R-14):** la «Vista del cliente» del admin sigue permitiendo simular aceptar/pedir cambios/etc. pero ya respetando `requisitos`, y no tiene conformidad. En el panel del cliente `abrirSim` ya estaba oculto; se retiró además el cierre del atajo «7 · Obra cerrada» (solo prepara el checklist). Las funciones `sim*` del cliente no se invocan desde la carcasa.
11. **Cliente:** `S.datos` (nif, acceso, fotos…) se retira; `pendientes()` y el aviso de bienvenida piden los datos de la vivienda. La aceptación escribe `aceptacion.nombre` con el nombre de la firma.
12. **Pantallas:** el botón «Completar ahora» de la visita desplaza al formulario insertado; en otros contextos abre la hoja «Datos de tu vivienda» (los ids se resuelven dentro de la hoja si está abierta).
13. **Formulario rápido de cambios (R-29):** la regla (los tres modos de importe, el margen y el catálogo de partidas) vive en el admin (`importeCambioRapido`, `catalogoCambios`, `altaCambioRapido`); el lite la consulta con `Proto.calc`. El modal del admin y la hoja del lite son dos interfaces sobre la misma función. El catálogo de «Por partidas» mezcla los trabajos del admin (mano de obra + material por unidad) y los productos del catálogo.
14. **Lite v2:** nueva clave `panelLiteV2`. El lite mantiene su catálogo simplificado para «Añadir trabajo»; los trabajos que vienen del admin llevan su `key`, su base real (`bk`) y lo que marcó el cliente (`det`). Los trabajos nuevos del catálogo del lite reciben una base equivalente (`BK_CAT`).
15. **Tabique medido (R-18):** la línea del trabajo pasa a m² con precio = precio por unidad del cliente ÷ 7,5 (tabique tipo de 3 m × 2,5 m); los tabiques pedidos y aún sin medir cuentan 7,5 m² cada uno. La línea vive solo en la estancia principal (no se duplica); la contigua lo muestra como «Tabique compartido con …». Si se derriba y hay estancia contigua se pregunta por reponer el acabado y se añade la pintura de esa pared.
16. **Paredes sin medir (R-20):** sin ancho × largo medidos se usa un cuadrado equivalente a los m²; el reparto por defecto es «alicatado hasta 2,10 m» en baños, «hasta 1,20 m» en cocinas y 0 en el resto. Las partidas de pared sin medidas se escalan con √(m²) cuando cambian los m². Las partidas editadas a mano nunca se tocan.
17. **Sincronización del borrador (R-21):** autoguardado 2,2 s después del último cambio y solo si el contenido cambió (hash). El conflicto se detecta con la revisión (`rev`): cada guardado del lite envía `baseRev`; si el admin modificó el borrador desde entonces (`por:"admin"`), el lite recibe fecha y autor y debe confirmar para sobrescribir. Al reabrir, si no hay instantánea (borradores de ejemplo) el estado se reconstruye desde las líneas del borrador, las medidas, los tabiques, el plan y los ajustes.
18. **Descuento, imprevistos y redondeo (R-24)** no son líneas del presupuesto (no llevan margen): viajan en `version.negociacion` y `totales`. El panel del cliente usa su propia fórmula (22 % y 21 %): el puente escala los precios de las líneas (`factorCliente`) para que su total coincida con el del admin, y enseña imprevistos, descuento y redondeo como líneas propias (`ajHtml`). `totalV(v)` usa el total del admin cuando existe.
19. **Plazo de ejecución:** semanas = ⌈días de los hitos ÷ 5⌉ (mínimo 1), editable; si se edita, prevalece el valor manual.
20. **Plan de cobros del lite:** los porcentajes se aplican sobre el total (IVA incluido) de la V3 enviada; el último tramo es el resto. Al enviar pasa a `caso.planCobros` y `caso.obra.hitosPlan`; al iniciar la obra se crean los hitos del caso y los tramos «al terminar X» dependen de su nombre (renombrar un hito actualiza sus disparadores; eliminar uno que dispara un cobro obliga a reasignarlo).
21. **Resolver una duda (R-34):** «ajustar a 0 €» es una cortesía registrada (`cortesia:true`, estado `consolidado`: no cobra y no pasa por adenda). El cambio retirado deja `motivoRetiro` y `resolucion`. En el panel del cliente (y en el admin) un cambio en duda sigue contando como provisional.
22. **Umbral de adenda (R-33):** el modo «importe fijo» se interpreta **sin IVA**; el equivalente con IVA se calcula sobre el importe exacto (12.000 € al 5 % da 495,87 € y 600,00 €, sin redondear dos veces).
23. **Incidencias (R-28):** una incidencia abierta que bloquea pone la salud en «bloqueada»; una de gravedad alta, en «en riesgo». Los días de retraso se suman al primer hito no terminado y se replanifican las fechas con `replanificarHitos`.
24. **Navegación (R-35):** `navegarA("cobros")` y `navegarA("clientes")` redirigen a sus nuevas ubicaciones (los enlaces antiguos siguen funcionando); las funciones de Cobros y Clientes escriben en contenedores internos (`#sub-cobros`, `#sub-clientes`). En el cliente, `ir("cambios"|"pagos"|"docs"|"entrega")` lleva a la pestaña nueva (alias `SEC_ALIAS`); con 5 pestañas la barra inferior no necesita «Más».
25. **Configuración (R-36):** los diez parámetros esenciales se editan en una página; el modo Avanzado conserva el resto de grupos sin duplicar los campos esenciales (desaparece el grupo «Negocio»). La firma de los mensajes es `empresa.firma` (variable `{{firma}}`). El «Restablecer» de cada sección esencial restaura el grupo del que depende.
26. **Paquete de la gestoría (R-12):** justificante `AAAA-MM-DD_REF_importe.ext` con punto decimal (sufijo `_2` si se repite); la proforma va como HTML (`proforma_PF-nnnn.html`), copia congelada si existe o calculada al momento si no. Los movimientos sin justificante se avisan y se marcan en el CSV.
27. **Pruebas preexistentes que se corrigen:** del cliente, `el enlace privado lleva el token` (el enlace público es `https://panel…/c/TOKEN`; el hash es interno) y `un cambio en desacuerdo no suma al total` (en el prototipo integrado un cambio en duda sigue siendo provisional, igual que en el admin; lo que no suma es uno **retirado**, que ahora se prueba). Del admin se adaptan `caso 10: provisional` (ahora con la duda C2 de ejemplo) y `resolverDesacuerdo` (nota obligatoria al mantener).
28. **Datos de ejemplo (punto 10, segundo tramo):** REF-0006 pasa a tener V1 (sustituida) y V2 (vigente) y un borrador V3 del lite con tabique compartido cocina–salón, baño medido (3,84 m², alicatado 11,04 / pintura 7,36), humedad, descuento del 3 % y plan 35/25/resto; REF-0010 tiene hitos y plan propios (40 / 20 / resto), 2 incidencias (una bloqueante abierta y una resuelta) y una duda (C2); REF-0009 suma un cambio retirado (C4) y uno de cortesía (C5). Los marcadores son SVG generados en código.
29. **Escenario e2e:** se recorre con las funciones reales de cada app (no con un clic en cada botón), salvo la descarga del ZIP, que se hace con el botón real y se valida byte a byte; las capturas se generan con `E2E_SHOTS`.

## 7. Limitaciones conocidas

* `Proto.adjuntos` se vacía en cada carga/reinicio (los datos de ejemplo se reinician igual); en los navegadores sin IndexedDB funciona solo en memoria y avisa. HEIC se acepta pero no se comprime ni se previsualiza si el navegador no lo decodifica.
* La nota de voz del lite (incidencias y cambios) es una **transcripción simulada**: no se graba audio. Los envíos de correo y WhatsApp son simulados (enlaces `wa.me` y copiar).
* La visita del lite es la del **caso activo** de la carcasa (un caso a la vez); el modo Obra lista todas las obras activas del admin. Fuera de la carcasa el lite no funciona.
* El lite conserva su catálogo simplificado para añadir trabajos nuevos; sus precios no salen del catálogo del admin.
* El Modo visita del admin (`mv*`) y el lite comparten `caso.borrador`; el modo visita del admin no entiende `negociacion`, `tabiques` ni el plan (los conserva al guardar).
* El panel del cliente calcula con constantes (22 % / 21 %) y recibe los precios escalados por el puente; si se cambia el margen o el IVA en Configuración pueden aparecer diferencias de céntimos en la suma por estancias (el total siempre es el del admin).
* La estimación de la V1 que ve el configurador usa su propio margen (22 %) e IVA (21 %); el admin no los reajusta en una V1 ya enviada (comportamiento previo).
* El ZIP no se comprime (tipo «store»), sin cifrado ni soporte de archivos de más de 4 GB.
* Las capturas en tres anchos (sin desbordes horizontales) cubren las pantallas nuevas del **lite**; las del admin y del cliente se revisaron en escritorio y móvil de forma manual.

## 8. Salida de las pruebas (última ejecución)

```
admin  __tests()            404/404 pruebas correctas ✓   (346 previas + 58 de los bloques C–E: apéndices A y B, plan de cobros, umbral, dudas, incidencias, ZIP, borrador, navegación, configuración y datos de ejemplo)
lite   __tests()            49/49 pruebas correctas ✓     (25 previas + 24 nuevas: superficie, paredes casos A y B, describirTrabajo, tabiques, versiones, desglose, negociación, plan, borrador)
cli    __tests()            37/37 pruebas correctas ✓     (30 previas, ya sin los 2 fallos antiguos, + 7 nuevas: pestañas, plan con resto, vista previa del plan, líneas de la propuesta, retirado)
test_flujo_v1.js            RESULT ok=51 ko=0
test_bloques_ab.js          RESULT ok=28 ko=0
test_e2e_v2.js              RESULT ok=68 ko=0               (escenario completo del apartado 11.2, pasos 1 a 16)
Consola de errores: ninguna en ninguna de las ejecuciones
```

Pruebas de v1 y del primer tramo adaptadas de forma justificada: horquilla (±5 %), «cerrar por plazo» (ya no existe), reloj `remates_plazo` → `reclamar_conformidad`, número de plantillas (16), `resolverDesacuerdo` (nota obligatoria al mantener), `caso 10: provisional` (con la duda de ejemplo C2) y las dos del cliente descritas en la decisión 27.

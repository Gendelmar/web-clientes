# Prototipo completo v2 — LEEME

> Documento vivo. **Bloques A y B (R-01 a R-11, R-13, R-14, R-15) hechos por el primer agente**; el siguiente continúa en este mismo archivo (R-12, R-16 a R-31, R-32 a R-36 y la parte restante de R-37).

## 1. Qué es y cómo usarlo

`Prototipo_completo_v2.html` es la carcasa que une cuatro aplicaciones en pestañas: **Configurador** (cliente), **Admin** (reformista, base de datos maestra), **Lite** (visita técnica en móvil) y **Cliente** (su panel). Se genera con:

```bash
python3 prototipo_v2/build_prototipo.py      # incrusta src/{cfg,adm,lite,cli}.html en src/host.html (+ src/bridge.js)
node prototipo_v2/test_flujo_v1.js            # flujo completo de punta a punta (51 comprobaciones)
node prototipo_v2/test_bloques_ab.js          # integración de los bloques A y B (28 comprobaciones)
# Dentro del admin (iframe): FR.adm.contentWindow.__tests()   → 346/346
```

Estructura: `src/cfg.html`, `src/adm.html`, `src/lite.html`, `src/cli.html` (apps), `src/host.html` (carcasa) y `src/bridge.js` (puente `Proto`: `solicitud`, `buildV`, `proyectarCliente`, `proyectarLite`, `lite`, `cli`, `adjuntos`). Los cuatro archivos originales standalone de la raíz no se tocan. El admin guarda la base de datos maestra (`__P.db()`); el cliente y el lite reciben proyecciones.

Reglas heredadas: JS plano sin librerías, sin CDN, HTML de usuario escapado, sin repintar un contenedor mientras se escribe en un input de su interior (los formularios nuevos actualizan progreso/marcas por DOM), reglas de negocio en funciones puras con pruebas en `__tests()`, textos en es-ES.

**Esquema de datos:** `db.meta.version = '3.0'` (admin, en memoria); localStorage del cliente `panelClienteV2` con `ver: 2` (la carcasa borra también las claves `…V1`). El lite sigue en `panelLiteV1` (no ha cambiado todavía).

## 2. Trazabilidad requisito → dónde → cómo se comprueba

Estado: ✅ completo · 🟡 parcial · ⏳ pendiente (siguiente agente).

| ID | Estado | Implementado en | Cómo se comprueba |
|---|---|---|---|
| R-01 | ✅ | `cfg.html`: `validarInmueble`, `cpValido`, `irPaso2` (mensajes junto a cada campo); el puente revalida en `Proto.solicitud` | `test_flujo_v1` (CP vacío y CP 99999 bloquean el paso 1); `__tests` «código postal» |
| R-02 | ✅ | `cfg.html`: payload con `cfg` y `materiales` por espacio, extras, calidad, urgencia, `obraHabitada`, materiales; `BASE_POR_TRABAJO`/`baseTrabajo`; `calcularLocal` añade `key`, `espId`, `base` a cada item. `bridge.js`: `lineasDesdeCalc` (base real, key del trabajo, precio unitario) y `Proto.solicitud` (`caso.solicitud.detalle` + `espacios[].trabajos[] = {key,label,base,detalles}`); `adm.html`: `detallesDeTrabajo` | `test_bloques_ab` (detalle, bases, detalles por trabajo, líneas); `__tests` «detallesDeTrabajo» |
| R-03 | ✅ | `adm.html`: `calcularHorquilla(total,nivel,pct)` con `cfg.horquillaV1Pct` (5 %), `rangoVersion`, `fmtImporteVersion`, `etiquetaVersion`, `recalcularHorquillas`, ajuste en Presupuesto (config); bandeja, ficha, histórico de versiones, vista del cliente y `accionSugerida` usan el rango solo en la V1. `cfg.html`: «Entre X € y Y €, IVA incluido» (floor/ceil al euro). `cli.html`: `rangoV`; el configurador sincroniza la horquilla del admin en vivo (`Proto.tick`) | `__tests` (A.5: 11.728,39/12.962,95; V2 exacta; recálculo); `test_bloques_ab` (rango en cfg/admin/cliente, V2 exacta, cambio en vivo 5→10 %) |
| R-04 | ✅ | `cli.html`: `abrirDatos`, `dvFormHtml`, `dvUpd`, `guardarDatos` (siete campos, progreso «N de 5 obligatorios», inquilino + permiso, atajos de año, «Abrir en el mapa»); `adm.html`: `evaluarDatosVivienda`, `aplicarDatosVivienda`, `fusionarDatosVivienda`, `caso.datosVivienda` (+ `vivienda.antiguedad/propietario/comunidad/fechaInicioDeseada/direccion`), discrepancia de «obra habitada», obligatorios configurables (`cfg.viviendaObligatorios`); `esperando_info → en_triaje` al completar | `__tests` (REF-0004 inquilino sin permiso, ≥3 completos y ≥3 incompletos, fechas pasadas, actualización de vivienda); `test_flujo_v1` paso 3 |
| R-05 | ✅ | `cli.html` `vVisita`: franjas bloqueadas con motivo, formulario dentro de la pantalla, «Completar ahora»; el puente revalida G1 en `Proto.cli('elegirFranja')` | `test_flujo_v1` (bloqueo, formulario en pantalla, rechazo del puente) |
| R-06 | ✅ | `adm.html`: plantillas del apéndice D (`completa_datos`…), mensaje previo en «Proponer visita» y «Presupuesto sin visita», «Pedir más info» con casillas de campos del R-04, «Pedir al cliente» (`pedirDatosModal`) y «Recordar al cliente» (Modo visita); todo queda en `caso.mensajes` | `test_bloques_ab` (campos en «Pedir info» y mensajes al proponer); `__tests` (plantillas) |
| R-07 | ✅ | `adm.html`: `visitaRequierePago`, `iniciarReservaVisita`, `estadoReserva`, `liberarReserva`, reloj `reserva_pago`/`reserva_vencida`, `cfg.visita.cobroCuando='al_confirmar'` y `reservaPagoHoras=48`; Agenda distingue «reservada, pendiente de pago»; `cli.html` `vPagoVisita`/`pagarVisita` | `__tests` (reserva, recordatorio a mitad, liberación); `test_bloques_ab` (+24 h recordatorio, +72 h libera y vuelve a `visita_propuesta`); `test_flujo_v1` (pago + confirmación) |
| R-08 | ✅ | `cli.html` `abrirAceptar`/`fxHtml`/`acCheck` («Datos para tu factura»); `adm.html` validadores `validarDNI/NIE/CIF/NIF`, `evaluarFiscal`, `aplicarFiscal`, `nombreFacturacion`; `caso.fiscal = {tipo,nombre,nif,razonSocial,cif,domicilio,mismaDireccion,usoVivienda,completos}`; sin fecha de nacimiento ni IBAN | `__tests` (apéndice B, normalización, empresa, misma dirección); `test_flujo_v1` paso 5 (bloqueo, NIF inválido, NIF válido) |
| R-09 | ✅ | `adm.html` `fichaVivienda`/`fichaFacturacion` (chips completos/pendientes, edición, «Pedir al cliente»); `generarProforma` y `paqueteGestoria` exigen facturación (A9, `exigirFacturacion`) | `test_bloques_ab` (chips y bloqueo de proforma/paquete); `__tests` (A9) |
| R-10 | ✅ | `adm.html`: `caso.mensajes[]` (`escribirMensaje`, `migrarMensajes`, `mensajesNoLeidos`, `conversaciones`), `db.notificaciones` (`notificar`, `sincronizarNotificaciones`, `contadoresMensajes`), apartado **Mensajes** (Conversaciones + Notificaciones, filtros, búsqueda, plantillas, adjuntos, marcar leído, burbuja en la barra lateral y chips en «Urgente hoy»); `bridge.js` `buildV.mensajes`/`Proto.cli('mensaje'|'leerMensajes')`; `cli.html` `vMensajes` (hilo de ambos lados con adjuntos) | `__tests` (migración idempotente, lectura por lado, notificaciones, contadores, ≥4 hilos); `test_bloques_ab` (ida y vuelta admin ↔ cliente con adjunto) |
| R-11 | ✅ | `cli.html` `abrirAvisoPago`/`avisoPagoOk` (importe, medio, fecha no futura, tramo, justificante obligatorio salvo efectivo, vista previa, aviso si supera lo pendiente); `adm.html` `db.avisosPago`, `crearAvisoPago`, `confirmarAvisoPago`, `rechazarAvisoPago`, cola «Cobros por confirmar» (Obras, Notificaciones, Resumen, ficha Cobros), visor de imagen/PDF, movimientos con 📎 o «sin justificante», `movimiento.justificanteId`; también para el pago de la visita | `__tests` (A3, confirmar/rechazar, efectivo, repetidos); `test_bloques_ab` (rechazo con plantilla, importe distinto con nota); `test_flujo_v1` |
| R-12 | ⏳ | — (el ZIP «store» con CSV, resumen y justificantes lo hará el siguiente agente; **solo** se ha añadido la exigencia A9 y `movimiento.justificanteId`/`sinJustificante`) | — |
| R-13 | ✅ | `bridge.js` `Proto.adjuntos` (`put`, `putSync`, `get`, `url`, `meta`, `del`, `lista`, `setMeta`, `sembrar`, `limpiar`, `modo`): IndexedDB con respaldo en memoria y aviso; imágenes a ≤1600 px, máx. 5 MB, JPG/PNG/WebP/HEIC/PDF; el cfg, el admin y el cliente lo usan vía `window.parent.Proto.adjuntos`; en los JSON solo viajan identificadores; se borra al reiniciar/restablecer | `test_bloques_ab` (put/get/del/lista, formatos, 5 MB, compresión a 1600 px, ids en la DB) |
| R-14 | ✅ | `adm.html`: `puedeCerrarObra('plazo')` siempre `ok:false`; `transitar(...,'cerrada')` solo con `autor:'cliente'`; única vía `registrarConformidadCliente` (llamada solo desde `Proto.cli('conformidad')`); eliminados «Cerrar por plazo», «Registrar conformidad», el botón de la vista del cliente y `obraConformidad`; reloj `reclamar_conformidad` (nunca cierra); chip «Entregada, pendiente de conformidad del cliente» en Obras/Resumen y botón «Reclamar conformidad» (`reclamarConformidad`); `cli.html`: el atajo de la fase 7 del simulador ya no cierra | `test_flujo_v1` (el admin no puede cerrar, reclama, el cliente cierra); `test_bloques_ab` (búsqueda en código de las escrituras a `cierre.conformidad` y a `'cerrada'`); `__tests` |
| R-15 | ✅ | `adm.html` `requisitos(accion, caso, ctx)` (matrices 5.2 y 5.3 completas), `mapaRequisitosCliente`, `exigir`; `bridge.js` revalida en `Proto.cli` (`ACCION_REQ`, `datosReq`) y en `Proto.lite('enviar')` (A10 + A1); `buildV.requisitos` proyecta el mapa; la UI del cliente y del admin muestran «Te falta: …» y «Completar ahora»; auditoría 5.4 en la sección 3 | `__tests` (una aserción por fila G1–G18 y A1–A11, y las filas añadidas); `test_flujo_v1` (el puente rechaza acciones sin requisitos) |
| R-16 a R-31 | ⏳ | Lite (visita y obra): siguiente agente. Ya disponibles para él: `caso.solicitud.detalle` y `trabajos[].detalles/base` (R-17, R-19, R-20), `BASE_POR_TRABAJO`, `requisitos('cerrar_visita'\|'enviar_version')`, `Proto.adjuntos` | — |
| R-32 a R-34 | ⏳ | Plan de cobros con «resto», umbral único y resolver duda en 3 opciones: siguiente agente. (`requisitos('resolver_duda')` ya exige la nota al «mantener» y `desacuerdoOk` la pide) | — |
| R-35, R-36 | ⏳ | Navegación y configuración esencial/avanzado: siguiente agente. Nota: el admin tiene ahora **9 apartados** (se añadió «Mensajes»; «Cobros» y «Clientes» siguen hasta R-35) | — |
| R-37 | 🟡 | `__tests()` del admin ampliado (250 → 346), `test_flujo_v1` adaptado (30 → 51) y `test_bloques_ab` (28); este LEEME. Falta completar filas, pruebas y datos de los requisitos pendientes | `node` + `FR.adm.contentWindow.__tests()` |

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
| A11 resolver duda | «Mantener» exige nota; «retirar» motivo; «ajustar» importe | `desacuerdoOk` (R-34 completará las tres opciones) |

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
caso.solicitud.espacios[].trabajos[] = { key, label, base, detalles };   // antes: lista de claves (el código admite ambas)
caso.datosVivienda = { ubicacion:{calle,numero,piso,puerta,cp,localidad}, regimen, permisoPropietario, permisoDocId, contactoPropietario,
                       anioConstruccion, anioDesconocido, inicio, inicioSinFecha, habitada, fotosExtra:[adjId], comentarios, comunidad, completos, pedidos };
caso.fiscal    = { tipo, nombre, nif, razonSocial, cif, domicilio:{calle,numero,cp,localidad}, mismaDireccion, usoVivienda, completos };
caso.mensajes[] = { id, fecha, autor:'cliente'|'reformista'|'sistema', texto, adjuntos:[adjId], tipo:'mensaje'|'aviso_pago'|'otra_fecha'|'sistema', leido:{adm,cli} };
caso.visita.cobro = { importe, politica, estado:'no_aplica'|'pendiente'|'pendiente_pago'|'justificante_enviado'|'cobrada'|'eximida',
                      avisoPagoId, reservaIniciadaAt, reservaExpiraAt, recordadaAt };
db.avisosPago[]    = { id, casoId, tipo:'visita'|'plan', importe, medio, fecha, tramo, concepto, adjuntoId, estado:'pendiente'|'confirmado'|'rechazado', creadoAt, nota, motivo };
db.notificaciones[] = { id, fecha, casoId, tipo, texto, resuelta, clave, destino };
movimiento = { …existente, justificanteId, avisoId, sinJustificante, nota };
cfg = { …, horquillaV1Pct:5, exigirSenalParaIniciar:true, viviendaObligatorios:[…5 ids…],
        cobros:{ …, bizum, justificanteObligatorio:{transferencia,bizum,efectivo} }, visita:{ …, cobroCuando:'al_confirmar', reservaPagoHoras:48 } };
```

`buildV(caso)` proyecta además: `versiones[].{total,rango,etiqueta,avisosVisita}`, `visita.cobro`, `datosVivienda(+eval)`, `fiscal(+Eval)`, `requisitos`, `avisosPago`, `pago`, `mensajes` (completos), `horquillaPct`, `tipoVivienda`. El cliente evalúa sus formularios en vivo con las mismas reglas del admin (`Proto.evalVivienda`, `Proto.evalFiscal`).

## 6. Decisiones tomadas (ambigüedades menores)

1. **Mensajes:** `caso.mensajes[]` es la fuente de la conversación; los eventos `tipo:'mensaje'` se **conservan** en el historial (la prioridad y `clienteActuoDesde` dependen de ellos) y `escribirMensaje` escribe en ambos sitios (`sinEvento:true` para omitir el evento).
2. **Reserva de visita:** al elegir franja el caso pasa a `visita_confirmada` con `cobro.estado='pendiente_pago'` y el hueco ocupa la agenda; al vencer vuelve a `visita_propuesta`. El Lite **sí carga** una visita reservada y sin pagar (no se bloquea); la Agenda la marca «reservada, pendiente de pago». Si la política es `en_visita` o no cobra, se omite el pago.
3. **Atajos del año de construcción** («antes de 1980», «1980–2000», «después de 2000»): rellenan 1970 / 1990 / 2010 como año aproximado editable.
4. **Horquilla:** se guarda `lo`/`hi` exactos (±pct %) y se muestran redondeados hacia fuera. Solo `V1` de tipo `estimacion` es rango; `rangoVersion` es la única fuente para mostrar y para las reglas (`accionSugerida`, calidad del lead). El configurador usa `CFG.HORQUILLA_PCT`, que la carcasa mantiene igual que `horquillaV1Pct` del admin.
5. **`fiscal.nombre` en empresas** es la persona que firma (G10 compara con `razonSocial` si no hay). La declaración «uso particular» se guarda como `'si'|'no'`.
6. **Obligatorios del R-04:** cinco (`ubicacion`, `regimen` —que incluye el permiso si es inquilino—, `anioConstruccion`, `inicio`, `habitada`); piso y puerta se exigen solo si la vivienda es un piso. La fecha «no anterior a hoy» se valida al guardar, no al evaluar la completitud (para que un caso no «pierda» sus datos con el paso del tiempo).
7. **Configuración:** los ajustes nuevos están en los grupos actuales (Presupuesto, Visita, Obra, Cobros); la separación esencial/avanzado es R-36.
8. **Cobros por confirmar:** `cfg.cobros.justificanteObligatorio` es por medio. «Confirmar sin justificante» exige nota y marca el movimiento `sinJustificante`.
9. **Datos de ejemplo (punto 10, parte mía):** 7 casos con vivienda completa y 10 incompletos (REF-0004 inquilino sin permiso); V1 en horquilla y V2/V3 exactas; 2 avisos pendientes (imagen SVG y PDF simulado) y 1 rechazado; movimientos con justificante y uno «sin justificante»; 10 conversaciones (4 con mensajes sin leer por el admin y 3 sin leer por el cliente); 10 notificaciones; REF-0011 `en_remates` sin conformidad. Los marcadores se generan en código (`svgMarcador`, `pdfSimulado`) y se siembran en `Proto.adjuntos` (los datos solo guardan ids). Las fotos de hitos del panel del cliente siguen siendo marcadores SVG generados en el propio panel (no son adjuntos del usuario).
10. **Simuladores (R-14):** la «Vista del cliente» del admin sigue permitiendo simular aceptar/pedir cambios/etc. pero ya respetando `requisitos`, y no tiene conformidad. En el panel del cliente `abrirSim` ya estaba oculto; se retiró además el cierre del atajo «7 · Obra cerrada» (solo prepara el checklist). Las funciones `sim*` del cliente no se invocan desde la carcasa.
11. **Cliente:** `S.datos` (nif, acceso, fotos…) se retira; `pendientes()` y el aviso de bienvenida piden los datos de la vivienda. La aceptación escribe `aceptacion.nombre` con el nombre de la firma.
12. **Pantallas:** el botón «Completar ahora» de la visita desplaza al formulario insertado; en otros contextos abre la hoja «Datos de tu vivienda» (los ids se resuelven dentro de la hoja si está abierta).

## 7. Limitaciones conocidas y notas para el siguiente agente

* `Proto.adjuntos` se vacía en cada carga/reinicio (los datos de ejemplo se reinician igual); en los navegadores sin IndexedDB funciona solo en memoria y avisa.
* HEIC: se acepta el archivo, pero si el navegador no lo decodifica no se comprime ni se previsualiza (se guarda tal cual).
* La estimación de la V1 que ve el configurador usa su propio margen (22 %) e IVA (21 %); el admin no los reajusta al cambiar `margen`/`iva` en una V1 ya enviada (comportamiento previo).
* El cliente calcula los totales con constantes (margen 22 %, IVA 21 %) y el admin con su configuración; si se cambian en Configuración pueden divergir en céntimos (comportamiento previo).
* `cli.__tests()` falla en 2 pruebas dentro de la carcasa (`el enlace privado lleva el token`, `un cambio en desacuerdo no suma al total`): **ya fallaban antes** de estos cambios (el adaptador sobrescribe `linkPanel`). El lite pasa 25/25.
* `Proto.lite('borrador')` sigue solo anotando un evento (R-21 pendiente). `Proto.lite('enviar')` ahora revalida A10 y A1 y crea V3 con importe exacto.
* Para los apartados de R-35: el cliente tiene pestañas Visita/Pagos/Mensajes con la lógica nueva; al reordenar, conservar `data-keep` en los formularios (evita repintar mientras se escribe) y los ids `dv-*`, `fx-*`, `ap-*`, `pv-*`.
* Pruebas útiles al continuar: `test_flujo_v1.js` (recorre ya R-01…R-14) y `test_bloques_ab.js`.

## 8. Salida de las pruebas (última ejecución)

```
admin  __tests()            346/346 pruebas correctas ✓   (250 de v1 + 96 nuevas; 7 de v1 adaptadas por R-03, R-14 y las plantillas nuevas)
test_flujo_v1.js            RESULT ok=51 ko=0              (30 de v1 + 21 nuevas; los pasos 3 y 5 adaptados por R-04, R-05, R-07, R-08)
test_bloques_ab.js          RESULT ok=28 ko=0
lite   __tests()            25/25
cli    __tests()            28/30 (las 2 fallidas ya fallaban en la base)
Consola de errores: ninguna
```
Pruebas de v1 adaptadas de forma justificada: horquilla (15 % → ±5 %, ya no depende de la incertidumbre), «cerrar por plazo» (ya no existe), reloj `remates_plazo` → `reclamar_conformidad`, número de plantillas (9 → 16).

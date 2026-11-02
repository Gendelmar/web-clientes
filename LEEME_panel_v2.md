# Panel del reformista v2 — LEEME

Prototipo de **un único archivo HTML** (`panel_administrador_v2.html`, ~4.500 líneas, sin frameworks ni build). Solo carga las fuentes de Google Fonts; todo lo demás es local. Parte de la identidad visual del panel v1.

## Qué hace

Gestiona el ciclo completo de un pedido de reforma, de la solicitud al cierre de obra y al cobro:

1. **Triaje** de solicitudes con puntuación de calidad (0–100) y de prioridad (0–100), acción sugerida y «Por qué».
2. **Visita técnica**: franjas libres desde la agenda, política de reprogramación, cobro de visita y Modo visita (móvil/iPad).
3. **Presupuesto** con versiones, borrador, líneas bloqueables, comparador y vista del cliente simulada.
4. **Obra**: hitos con fotos, cambios, adendas, solicitudes del cliente, remates, cierre y acta.
5. **Cobros**: plan, movimientos, proformas y exportaciones.
6. **Clientes, Resumen, Catálogo y Configuración** conectados a la misma lógica.

## Cómo usarlo

- Abre el archivo en el navegador. Acceso de demostración: `admin@anatoliyreformas.es` / `admin1234`.
- Barra lateral en escritorio; barra inferior en móvil (< 820 px).
- **Panel «🧪 Demo»** (abajo a la derecha, plegable): `+1 día`, `+1 semana`, `↩ Hoy` y `⟳ Restablecer`. Avanzar el tiempo ejecuta los relojes sobre todos los casos (recordatorios debidos, pausa y caducidad automáticas, partidas pausadas).
- Consola: `__tests()` ejecuta las pruebas (hermético: usa datos recién creados y restaura el estado real).
- Recorrido sugerido: el escenario de punta a punta del apartado 11 del documento de requisitos funciona completo (ver «Verificación»).

## Estructura del código

El script está ordenado por secciones numeradas:

| Sección | Contenido |
|---|---|
| 1–3 | Utilidades (`r`, `hoy`, `rel`, formatos), configuración por defecto (`CFG_DEFAULT`), catálogos (partidas, checklist, estados) |
| 4 | **Reglas de negocio (funciones puras)**: zona, totales, incertidumbre, calidad, prioridad, acción sugerida, transiciones, versiones, total vigente, medidas, borrador, adendas, progreso, salud, cobros, relojes |
| 4B | Agenda: franjas libres, política de reprogramación |
| 4C | Obras, cobros y catálogo: hitos, cambios, adendas, plan de cobros, proformas, actas, CSV/JSON, impacto de precio, lista de compra |
| 5 | Datos de ejemplo (`crearDBInicial`) |
| 6 | `__tests()` |
| 7–12 | Interfaz: componentes, Resumen, Presupuestos, ficha del caso, vista del cliente, Clientes, Cobros, Agenda, Modo visita, Obras, Catálogo, Configuración |
| 14–15 | Login, simulador de tiempo y arranque; accesibilidad |

Estado global: `DB` (`casos`, `clientes`, `cfg`, `cobros`, `proformas`, `actas`, `catalogo`, `meta`). Las funciones de lógica no tocan el DOM; la interfaz las llama y vuelve a pintar.

## Datos de ejemplo

17 casos en Madrid (fechas relativas a hoy, importes calculados con las reglas) y 17 clientes:

| Caso | Situación |
|---|---|
| REF-0001 | recibida, sin fotos, humedades declaradas |
| REF-0002 | en triaje, calidad alta, con fotos, propietario |
| REF-0003 | esperando info **con respuesta** del cliente |
| REF-0004 | esperando info sin respuesta, recordatorio debido |
| REF-0005 | visita propuesta con franjas |
| REF-0006 | visita confirmada **para hoy** (probar el Modo visita) |
| REF-0007 | propuesta enviada (V3), próxima a caducar; cliente con 2 casos (CL-07) |
| REF-0008 | aceptada sin iniciar; visita descontable cobrada (pago a cuenta) |
| REF-0009 | en obra ≈ 61 %, hitos con fotos, A1 firmada, A2 enviada, cambios pendientes |
| REF-0010 | en obra con cambio bloqueante (salud **bloqueada**, partida pausada) |
| REF-0011 | en remates (plazo de 7 días: se puede cerrar por plazo con `+1 semana`) |
| REF-0012 | **cerrada con saldo pendiente**, con acta |
| REF-0013 / 0014 / 0015 | descartada (fuera de zona) / caducada / en pausa |
| REF-0016 | obra sencilla (suelo flotante): sugiere «presupuesto sin visita», prioridad baja |
| REF-0017 | prioridad alta con calidad baja (fuera de zona, el cliente insiste) |

Además: un duplicado de cliente (CL-17 comparte email con CL-01), cobros con varios medios, una proforma (PF-0001), un acta (ACTA-0001) y 14 productos del catálogo v1 enlazados a líneas de presupuesto.

## Qué se simula

- Envío de WhatsApp/correo (se abre `wa.me` con el mensaje o se copia; el correo es un aviso).
- Acciones del cliente (aceptar, elegir franja, firmar adenda, conformidad…): botones de la **Vista del cliente**.
- Fotos, notas de voz y transcripción; actualización de precios del catálogo; scraping.
- Pasarela de pago, facturas oficiales (solo proformas «no es una factura») y firma electrónica.
- No hay servidor ni persistencia: al recargar vuelven los datos de ejemplo.

## Decisiones tomadas ante ambigüedades

- **Zona** siempre derivada del código postal y de los tramos configurados (no se guarda en el caso).
- **Prioridad** = espera (50) + calidad × 0,30 + actividad (20 si el cliente actuó tras la última acción del reformista). Niveles: «Atender hoy» ≥ 60, «Pronto» ≥ 40, «Sin prisa».
- `recibida → en_triaje` ocurre **automáticamente al abrir** el caso.
- **Proponer visita** crea y envía la **V2** (V1 pasa a sustituida); hay una casilla para revisarla antes. El Modo visita crea la V3, de modo que el comparador muestra V2 → V3.
- Los cambios `en_desacuerdo` cuentan como **provisionales** en el total vigente, pero no se pueden consolidar ni terminar la obra con ellos.
- El **umbral de adenda** se compara con ≥ y sobre el importe sin IVA de la aceptada (configurable en % o en €).
- Un cambio ya incluido en una adenda enviada no se puede incluir en otra.
- **Visita descontable**: según configuración (no / total / parcial) cuenta como pago a cuenta del saldo; se muestra la nota «criterio contable pendiente de confirmar con el gestor».
- El plan de cobros se calcula sobre el importe **aceptado**; adendas y cambios se muestran aparte como «fuera del plan».
- **Estimaciones** (V1 del sistema) y borradores se recalculan al cambiar margen o IVA; las versiones **ya enviadas** quedan congeladas.
- Las imágenes del catálogo se sustituyen por iconos para no depender de recursos externos.
- `__tests()` es hermético: usa datos nuevos para que el resultado no dependa del estado de la demo.

## Verificación

- `__tests()`: **250/250** pruebas correctas.
- Se verificó en Chromium (Playwright) cada fase por separado y el **escenario completo del apartado 11 (13 pasos)** sin errores de consola.
- Sin desbordes horizontales a 390, 768, 820, 1024 y 1280 px en todas las pantallas y diálogos.
- Modo visita en 390 px: todos los controles miden al menos 44 × 44 px.
- Rendimiento: cada pantalla se pinta en menos de 20 ms; las pruebas tardan ~12 ms.
- Accesibilidad básica: roles de diálogo con foco gestionado y `Esc`, nombres accesibles en controles, filas clicables operables con teclado, `aria-current`, contraste del botón primario 5,5:1, `prefers-reduced-motion`.

## Limitaciones conocidas

- Sin persistencia ni multiusuario; los usuarios y roles son solo un formulario («próximamente»).
- La accesibilidad es básica (no se ha probado con lectores de pantalla reales).
- El criterio de IVA, la contabilidad de la visita descontable y el formato del paquete para la gestoría están pendientes de confirmar con el gestor.
- Las franjas libres consideran las visitas **confirmadas**; las propuestas pendientes de elegir no bloquean hueco.
- El plan de cobros no reparte automáticamente las adendas en tramos.
- El editor de checklist cubre los cinco tipos de efecto pero sin validaciones avanzadas de las condiciones.

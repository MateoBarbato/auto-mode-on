# Halketon — Notas de trabajo

Hackathon social del 6 de junio de 2026 organizada por Paisanos y Crecimiento Build (con Querido Lunes y Fardo). Tres tracks posibles centrados en problemas reales de ONGs argentinas. Ver brief completo en [`hackathon-brief.md`](hackathon-brief.md).

## Tracks elegidos

Vamos a trabajar sobre **Track 1 (coordinación y memoria interna)** y **Track 3 (registro de beneficiarios e impacto)**. Track 2 (donantes) queda fuera de scope para nosotros.

## Tesis de trabajo

Los tres tracks comparten un mismo cuello de botella: **las organizaciones no logran adoptar herramientas ni metodologías de forma sostenida**. El brief lo muestra una y otra vez — Slack y Asana abandonados, Notion y Trello sin uso, mosaicos de herramientas que generan más caos que orden. Cualquier cosa que desarrollemos tiene que sostenerse por *cómo van a hacer las ONGs para usarlo consistentemente*, no por la tecnología en sí.

Ahora bien, T1 y T3 fallan por razones distintas, y eso cambia la estrategia:

- **T1 falla por fragmentación + resistencia cultural.** Ya tienen demasiadas herramientas y abandonan las nuevas. La adopción pasa por *reemplazar o absorber* canales existentes (sobre todo WhatsApp), no por sumar uno más.
- **T3 falla porque el registro está desacoplado de la actividad.** Nadie va a abrir una app después de una mamografía o de un taller. La adopción pasa por *capturar en el momento*, en el canal donde el trabajo ya ocurre.

El hilo común no es tanto "no adoptan tecnología" sino **"no adoptan nada que les agregue un paso"**. Cualquier cosa que diseñemos tiene que *quitar* fricción de un flujo existente, no crear uno nuevo paralelo.

## Posibilidades de desarrollo

### Track 1 — Coordinación

1. **Bot de WhatsApp que captura compromisos del chat.** La gente sigue hablando en WhatsApp; el bot escucha (o se le menciona / reacciona con emoji) y convierte "yo me encargo del reporte para el viernes" en una tarea con dueño y deadline. Dirección abre una vista web con la carga real del equipo. Resuelve directamente "responsabilidades bien asignadas en reunión, plazos perdidos" y "dirección no ve la carga real".
2. **Reuniones → tareas accionables.** Sube la grabación o transcripción de Meet/Zoom, el LLM extrae compromisos (quién, qué, cuándo), manda a cada persona por WhatsApp un mensaje individual con sus tareas y plazos. Memoria queda en un doc compartido.
3. **Recordatorios proactivos por WhatsApp.** En vez de pedirles abrir una app, el sistema manda "hace 3 días dijiste que ibas a mandar X, ¿cómo va? ✅/⏳/🚫". Una palabra de respuesta actualiza estado.
4. **Detector de deadlines invisibles.** Vencimientos de certificados web, renovaciones de software, fechas estatutarias. Más nicho, pero resuelve un dolor concreto y costoso.

### Track 3 — Beneficiarios e impacto

1. **Captura por WhatsApp en territorio.** Mensaje al bot: "atendí a María hoy, le di kit nutricional, próximo control en 2 semanas" + foto. El bot estructura el registro, marca recordatorio, lo asocia al legajo si existe o crea uno mínimo. Ya sacan el celular en territorio — el flujo es ese.
2. **Notas de voz → datos estructurados.** Audio → Whisper → LLM extrae campos. Crítico cuando hay baja alfabetización digital o cuando manejar las dos manos es más rápido (talleristas, trabajadoras territoriales).
3. **Foto del cuaderno físico → entrada estructurada.** OCR + LLM. No les pedís cambiar el flujo: siguen anotando como siempre, al final del día sacan una foto. Resuelve directamente lo de "cuadernos físicos y planillas impresas".
4. **Generador de reportes por financiador.** Dado el dataset capturado, generar reporte en el formato/idioma/plantilla específica del financiador. La parte aburrida pero crítica. Reusa la misma base para múltiples salidas.
5. **Modo offline + sync.** PWA simple que guarda local y sincroniza después. Necesario para territorio sin internet.

## El patrón que une los dos tracks

**WhatsApp como input layer + LLM como estructurador silencioso.**

Mismo core técnico para T1 y T3:

- la gente escribe o habla normal en el canal donde ya están
- un LLM convierte texto / audio / foto en estructura
- la estructura alimenta un dashboard simple (web)
- el sistema devuelve algo útil de inmediato (confirmación, resumen, recordatorio) — no es solo data entry para que otro lo lea

Eso permite que un solo proyecto base pueda configurarse como *tracker de tareas* (T1) o *tracker de actividades/beneficiarios* (T3), e incluso correr los dos modos en la misma organización.

## Principios de diseño para que se adopte

- **Onboarding cero.** Agregar un contacto de WhatsApp y escribirle. Nada de descarga, registro, login complejo.
- **Reward inmediato.** Cuando alguien registra algo, el sistema le devuelve valor (confirmación, resumen, recordatorio). No es solo cargar datos para otros.
- **Una persona campeona interna.** Alguien en la ONG que recibe el dashboard agregado y muestra el valor al resto. Sin esa persona, fracasa.
- **Empezar chico.** Un equipo o programa, no toda la organización.
- **Convivir con WhatsApp, no competirle.** Cualquier intento de reemplazarlo cae.
- **Privacidad por defecto.** Separación nativa entre dato individual sensible y métrica agregada para reportes (especialmente en T3).

## Scope realista para la jornada

Una hackathon de un día. Apuntar a:

- bot de WhatsApp (Twilio o WhatsApp Cloud API) con detección de intent vía LLM
- backend mínimo (Supabase / Postgres) que guarda estructurado
- dashboard web simple (Next.js) para que la dirección vea el agregado
- un generador de reporte (PDF / plantilla) que demuestre el valor de tener los datos ordenados

Con eso podemos demostrar T1 (vista de carga del equipo) o T3 (reporte para financiador) sobre el mismo motor, y elegir cuál mostrar según la organización que termine usándolo.

## Pendientes / a definir

- ¿Cuál de los dos tracks priorizamos para el demo del día? (mismo core, dos demos posibles)
- Decidir stack concreto (WhatsApp Cloud API vs. Twilio; modelo de LLM; hosting)
- ¿Conseguir una ONG "piloto" para validar antes del 6/6?
- Privacidad: cómo manejar datos sensibles en T3 desde el día 1

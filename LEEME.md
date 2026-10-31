# Morse Luz 2.0 — Aplicación completa

## Entrega

- `web/`: PWA completa, sin servicios remotos. Para instalarla como PWA, se debe publicar por HTTPS (por ejemplo, GitHub Pages), o usar localhost en un equipo de desarrollo.
- `android/`: proyecto Android Studio en Java, minSdk 26 (Android 8.0), diseñado para funcionar sin conexión. El contenedor WebView sirve la interfaz mediante un origen HTTPS local interno (usa el permiso INTERNET para el motor WebView, pero no requiere conectarse a servidores) y utiliza la API Android `CameraManager.setTorchMode()` para la linterna. Solicita permisos de cámara y micrófono cuando son necesarios. El selector de archivos y la función Guardar utilizan la interfaz de documentos de Android.
- `tests/`: tests de códec, decodificación, protocolo, síntesis y pruebas de interfaz.
- `ejemplos/`: grabación WAV de prueba.

## FUNCIONES

1. Emisión de Morse por sonido (300–1500 Hz, frecuencia, volumen y forma de onda ajustables), linterna, pantalla o combinaciones.
2. Duración del punto 25–3000 ms, espaciamiento de letras y palabras ajustable (Farnsworth).
3. Lectura de cámara, centrado seleccionable, ajuste de umbral y estimación de velocidad por pulsos.
4. Lectura de micrófono, detección de frecuencia por espectro FFT, filtrado, histéresis y estimación dinámica del ritmo.
5. Monitor gráfico de nivel y pulso.
6. Envío de mensajes fiables ML1, UTF-8/base32, secuencia por bloques, CRC-16/CCITT-FALSE, ACK y reintentos; módulo experimental para intercambio automático en canales de audio.
7. Manipulador Morse manual con pulsador / barra espaciadora, emisión simultánea y traducción; traductor escrito Morse ↔ texto.
8. Historial local y exportación TXT/CSV/JSON.
9. Grabación de audio e importación de archivos WAV/MP3/WebM/M4A según soporte del dispositivo, análisis offline con Goertzel, ajuste de umbral y edición posterior.
10. Ejercicios de aprendizaje con evaluación del resultado y WPM.

## CÓMO INSTALAR EN ANDROID SIN SERVIDOR

1. Descomprimir el ZIP del proyecto Android en el ordenador.
2. Abrir la carpeta raíz `MorseLuzAndroid` en Android Studio.
3. Instalar Android SDK Platform 35 si se solicita, y sincronizar Gradle (Android Gradle Plugin 8.7.3, Java 17).
4. Menú **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
5. Copiar `app/build/outputs/apk/debug/app-debug.apk` al móvil e instalarlo (puede requerir autorización de origen desconocido).

Alternativa sin Android Studio: crea un repositorio GitHub con el contenido de `android/` en la raíz, abre **Actions > Compilar APK Morse Luz 2.0 > Run workflow** y descarga el artefacto `Morse-Luz-2-APK`. GitHub Actions necesita conexión; la app compilada no.

**No se incluye un APK compilado**. Este entorno no incluye SDK Android ni se ha realizado una compilación Android ni prueba de hardware real.

## PWA

Publicar los archivos de `web/` en GitHub Pages o cualquier servidor HTTPS estático, abrir la URL en Chrome móvil y usar «Instalar aplicación» o «Añadir a pantalla de inicio». Abrir `index.html` mediante `file://` impide la instalación PWA y puede bloquear la cámara y el micrófono. El HTML suelto sirve para traducción y emisión sonora en navegadores compatibles.

## DOS MÓVILES

A = Emisión (modo Altavoz, 750 Hz, 240 ms). B = Recepción > Micrófono > Frecuencia automática > Iniciar. Subir volumen y ajustar umbral si hay ruido. Para luz, A = Linterna y B = Cámara; evita puntos menores de 120–160 ms en cámaras convencionales.

## Modo mensajes fiables (experimental)

- En ambos móviles, activar Recepción > Micrófono y seleccionar Altavoz en Emisión.
- En B, activar «Confirmar paquetes automáticamente». En A, preparar el texto por bloques y activar «Envío automático».
- La aplicación transmite bloques `ML1 ID SECUENCIA TOTAL CRC16 DATOS`; cada bloque aceptado genera `ACK ID SECUENCIA`. Sin ACK dentro del tiempo calculado se reintenta.
- Si el otro móvil no decodifica el paquete o el ruido impide recibir ACK, el intercambio puede fallar. Es un protocolo experimental de media-duplex, no una garantía de entrega. El CRC detecta errores de paquete, no corrige señales perdidas.
- Para pruebas manuales, usa «Enviar siguiente / reintentar», «Procesar texto recibido» y «Transmitir ACK».

## PRUEBAS

`node tests/test-core.js` y `node tests/test-audio.js`. Se han probado señales sintetizadas y flujos del navegador en Chromium sin acceso real a hardware. Es imprescindible probar el acceso a cámara, micrófono y linterna en dispositivos concretos.

## LIMITACIONES CONOCIDAS

- Cronometría de la linterna y cámara depende del móvil y frecuencia de refresco; no se garantiza transmisión fiable a 25 ms.
- Hay ambigüedad inicial si solo hay rayas o puntos; se corrige cuando aparecen suficientes signos y pausas.
- La detección acústica automática puede seguir un ruido más fuerte que el tono. Selecciona frecuencia fija para mejorarla.
- En Android WebView, los permisos se gestionan a través de la interfaz Android del sistema. La compatibilidad exacta depende de la versión WebView instalada.
- El sonido captado en el micrófono del mismo dispositivo durante transmisión puede generar autointerferencia. Evita que el receptor esté demasiado próximo al altavoz propio.
- El modo automático de mensajes no ha sido probado entre dispositivos físicos; la recepción y el ACK son operaciones independientes y pueden precisar ajustes de latencia/ruido.

Licencia: Puedes usar, modificar y adaptar el código generado para tu proyecto.

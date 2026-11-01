# Morse Luz 2.0

**Aplicación Android de comunicaciones en código Morse**. Convierte texto y Morse, transmite por luz o sonido y puede recibir señales desde cámara y micrófono. Proyecto experimental, sin garantía de recepción perfecta en todos los teléfonos.

## Descargar e instalar

**[Ir a las versiones disponibles (Releases)](https://github.com/ruiggi/MorseLuz/releases)**

Descarga el APK de la última versión de pruebas (`Morse-Luz-2.0.0-debug.apk`) y ábrelo en un teléfono Android 8.0 o superior. Si Android lo solicita, autoriza la instalación desde la aplicación que utilizas para abrir el archivo. El archivo de descarga de GitHub Actions (Artifacts) es otra opción, pero puede caducar.

El APK se genera con la **firma de depuración automática de GitHub Actions**: es para **pruebas**, no para distribuir en Google Play. Si reinstalas desde otra compilación, puede ser necesario desinstalar antes debido al cambio de firma (haz copia del historial si quieres conservarlo).

## Funciones

- Texto ↔ código Morse, incluyendo la letra Ñ y signos habituales.
- Emisión de señales con linterna, pantalla y pitidos. Pulsador manual.
- Duración de punto 25–3000 ms; ajuste de pausas entre letras y palabras.
- Recepción de pitidos por micrófono (estimación de frecuencia, velocidad, ruido y monitor de señal).
- Recepción luminosa por cámara (umbral y calibración).
- Mensajes divididos en bloques con CRC-16, confirmación y reintentos **experimentales**.
- Historial local, exportación, ejercicios y análisis de grabaciones.

### Permisos y privacidad

- **Cámara**: lectura de señales luminosas y acceso a la linterna.
- **Micrófono**: lectura y grabación de pitidos Morse.
- El diseño funciona localmente; la aplicación no requiere cuenta ni un servidor para comunicarse mediante luz o sonido.
- Las grabaciones y las lecturas dependen de los permisos del sistema y de las capacidades del dispositivo. No se ha verificado la recepción en todos los modelos.

## Compilación automática

Cada cambio en `main` y cada ejecución manual de [GitHub Actions](https://github.com/ruiggi/MorseLuz/actions) compila un APK Android y lo adjunta como **Artifact**. La primera compilación correcta de cada nueva `versionName` crea además una *prerelease* pública para descargar el APK sin caducidad de Artifacts. Para publicar una versión nueva, actualiza `versionName` y `versionCode` en `app/build.gradle`.

El APK es una compilación `assembleDebug`, no una compilación `release` firmada para distribución.

## Estructura del código

- `app/src/main/java/es/morseluz/app/MainActivity.java`: contenedor Android, permisos y linterna.
- `app/src/main/assets/`: interfaz y lógica de Morse.
- `.github/workflows/build-apk.yml`: validación, compilación y publicación de la versión de pruebas.

Para detalles del funcionamiento consulta [LEEME.md](LEEME.md).

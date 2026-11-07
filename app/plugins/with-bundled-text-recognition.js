// Plugin de Expo: el lector de texto de fotos (ML Kit) va DENTRO de la APK.
//
// expo-text-extractor usa la versión "no incluida" de ML Kit (play-services-mlkit-text-recognition):
// el modelo lo descarga Google Play Services la primera vez, con internet. Este plugin la cambia por la
// versión incluida (com.google.mlkit:text-recognition), que trae el modelo latino dentro de la app
// (unos 4 MB más) y lee fotos sin internet desde el primer uso. Las dos versiones exponen las mismas
// clases (TextRecognition, latin.TextRecognizerOptions), así que la librería funciona sin cambios.
// iOS no lo necesita: expo-text-extractor usa Apple Vision, que ya está en el sistema.
//
// Se aplica al generar el proyecto nativo (EAS build / npx expo prebuild). Registrado en app.json.

const { withAppBuildGradle } = require("expo/config-plugins");

const MARK = "// sonny: ML Kit incluido en la APK (plugins/with-bundled-text-recognition.js)";
const BUNDLED = "com.google.mlkit:text-recognition:16.0.1";

module.exports = function withBundledTextRecognition(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== "groovy") {
      throw new Error("with-bundled-text-recognition: se esperaba android/app/build.gradle en Groovy");
    }
    const gradle = cfg.modResults.contents;
    if (gradle.includes(MARK)) return cfg;
    cfg.modResults.contents = `${gradle}
${MARK}
configurations.all {
    exclude group: "com.google.android.gms", module: "play-services-mlkit-text-recognition"
    exclude group: "com.google.android.gms", module: "play-services-mlkit-text-recognition-common"
}
dependencies {
    implementation "${BUNDLED}"
}
`;
    return cfg;
  });
};

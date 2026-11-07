// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Los modelos de Sonny (.sonny = JSON) se tratan como recursos, no como código,
// para que no engorden el bundle de JavaScript y la app arranque rápido.
config.resolver.assetExts.push('sonny');

module.exports = config;

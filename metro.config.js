const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure we're using the correct resolver and transformer
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = config; 
// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// Drizzle migrations are .sql files imported by src/data/db/migrations/migrations.js.
config.resolver.sourceExts.push('sql');

module.exports = config;

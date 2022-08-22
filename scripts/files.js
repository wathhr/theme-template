const fg = require('fast-glob');

const root = require('path').join(__dirname, '..');

exports.metaFiles = fg.sync([
  'package.json',
  'manifest.json',
  'powercord_manifest.json',
  'src/clients/*',
], { cwd: root });

exports.rmFiles = fg.sync([
  './scripts/setup',
  './setup*',
  'README.md'
], { cwd: root, onlyFiles: false });

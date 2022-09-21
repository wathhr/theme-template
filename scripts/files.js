const fg = require('fast-glob');

const root = require('path').join(__dirname, '..');

exports.metaFiles = fg.sync([
  'package.json',
  'manifest.json',
  'powercord_manifest.json',
  'src/clients/*',
  'src/*custom-props.scss',
], { cwd: root });

exports.rmFiles = fg.sync([
  'scripts/setup',
  'setup*',
  'README.md',
  'dist/*.css',
], { cwd: root, onlyFiles: false });

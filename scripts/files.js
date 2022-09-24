const fg = require('fast-glob');

const root = require('path').join(__dirname, '..');

exports.metaFiles = fg.sync([
  '*.json',
  '.github/**/*',
  'src/clients/*',
  'src/*custom-props.scss',
], { cwd: root });

exports.rmFiles = fg.sync([
  'scripts/setup',
  'setup*',
  'README.md',
  'dist/*.css',
], { cwd: root, onlyFiles: false });

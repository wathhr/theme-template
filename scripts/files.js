const fg = require('fast-glob');

const root = require('path').join(__dirname, '..');

exports.metaFiles = [
  ...fg.sync(['*.json', '.github/**/*', 'src/clients/*'], { cwd: root }),
  ...['README.md', 'src/custom-props.scss'],
];

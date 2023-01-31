#!/usr/bin/env node

//* This should be SemVer (https://semver.org/) compliant

const fs = require('fs');
const { join } = require('path');

const { metaFiles } = require('../files.js');
const root = join(__dirname, '../..');
const meta = require(join(root, 'theme.meta.json'));
const args = process.argv.slice(2);
const bumpType = (args[0] || 'patch').toLowerCase();
const bumpAmount = isNaN(parseInt(args[1])) ? 1 : parseInt(args[1]);

const validTypes = ['major', 'minor', 'patch', 'alpha'];
if (!validTypes.includes(bumpType.toLowerCase())) {
  console.log('Invalid argument. Must provide one of the following:');
  validTypes.forEach((type, i) => {
    console.log(`${i + 1}. ${type.charAt(0).toUpperCase() + type.slice(1)}`);
  });
  console.log(`\nYou can find more info over at https://semver.org.`);
  process.exit(1);
}
if (bumpAmount <= 0) {
  console.log('Bump amount must be greater than 0.');
  process.exit(1);
}

const alphaRegex = /(?<=\.\d+-.*?[^\d])\d{3}$/im;
const version = {
  major: parseInt(meta.version.split('.')[0]),
  minor: parseInt(meta.version.split('.')[1]),
  patch: parseInt(meta.version.split('.')[2]),
  alpha: meta.version.match(alphaRegex)
    ? parseInt(meta.version.match(alphaRegex)[0])
    : 0,
};
const versionString = meta.version;

if (version[bumpType] <= 0 && bumpAmount < 0) {
  console.log("The version can't be negative.");
  process.exit(1);
}

const newVersion = { ...version };
newVersion[bumpType] += bumpAmount;
const newVersionString =
  `${newVersion.major}.${newVersion.minor}.${newVersion.patch}` +
  (newVersion.alpha && bumpType === 'alpha'
    ? `-Alpha.${newVersion.alpha.toString().padStart(3, '0')}`
    : '');

for (const file of metaFiles) {
  const actualFile = join(root, file);
  const fileData = fs.readFileSync(actualFile);
  const newFileData = fileData
    .toString()
    .replaceAll(versionString, newVersionString);

  try {
    fs.writeFileSync(file, newFileData);
    console.log(`Bumped ${actualFile}!`);
  } catch (e) {
    console.error(`Failed to bump ${actualFile}`, e);
  }
}

console.log(`Bumped to version ${newVersionString}!`);

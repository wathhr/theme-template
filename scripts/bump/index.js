#!/usr/bin/env node

//* This should be SemVer (https://semver.org/) compliant

const fs = require('fs');
const { join } = require('path');

const args = process.argv.slice(2);
const { metaFiles } = require('../files.js');
const root = join(__dirname, '../..');
const bumpType = args[0].charAt(0).toUpperCase() + args[0].slice(1) || null;
const bumpAmount = parseInt(args[1]) || 1;

const validTypes = ['Major', 'Minor', 'Patch', 'Alpha'];
if (!validTypes.includes(bumpType)) {
  // I wanted to make something with readline but wasn't able to figure it out
  console.log('Invalid argument. Must provide one of the following:');
  validTypes.forEach((type, i) => {
    console.log(`${i + 1}. ${type}`);
  });
  console.log(`\nYou can find more info over at https://semver.org.`);
  process.exit(1);
}

if (bumpAmount <= 0) {
  console.log('The Bump amount must be greater than 0.');
  process.exit(1);
}

let version;
let newVersion;
metaFiles.forEach((file) => {
  const actualFile = join(root, file);
  const fileData = fs.readFileSync(actualFile).toString();
  var isJson;
  try {
    isJson = Boolean(JSON.parse(fileData));
  } catch (e) {
    isJson = false;
  }

  let newFileData;
  if (isJson) {
    // TODO: Fix changing formatting
    const json = JSON.parse(fileData);
    if (isJson && !version) {
      const alphaRegex = /(?<=\.\d+-.*?[^\d])\d{3}$/im;
      version = {
        Major: parseInt(json.version.split('.')[0]),
        Minor: parseInt(json.version.split('.')[1]),
        Patch: parseInt(json.version.split('.')[2]),
        Alpha: json.version.match(alphaRegex)
          ? parseInt(json.version.match(alphaRegex)[0])
          : 0,
      };

      version[bumpType] = version[bumpType] + bumpAmount;
      newVersion =
        `${version.Major}.${version.Minor}.${version.Patch}` +
        (version.Alpha && bumpType == 'Alpha'
          ? `-Alpha.${version.Alpha.toString().padStart(3, '0')}`
          : '');
    }

    // prettier-ignore
    newFileData = JSON.stringify(json, (key, value) => {
      if (key === 'version') return '__versionNumber__';
      return value;
    }, 2);
  } else {
    const regex = /(?<=version\s).*/gim;
    newFileData = fileData.replace(regex, '__versionNumber__');
  }

  newFileData = newFileData.replace('__versionNumber__', newVersion);

  fs.writeFile(actualFile, newFileData, (err) => {
    if (err) throw err;
  });
});
console.log(`Bumped to version ${newVersion}!`);

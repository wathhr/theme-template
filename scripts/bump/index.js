const fs = require('fs');
const { join } = require('path');
const fg = require('fast-glob');

const args = process.argv.slice(2);
const root = join(__dirname, '../..');
const bumpType = args[0].charAt(0).toUpperCase() + args[0].slice(1) || null;
const bumpAmount = parseInt(args[1]) || `${parseInt(args[1]) === 0 ? 0 : 1}`; // lovely

const validTypes = [
  'Major',
  'Minor',
  'Patch',
  'Alpha',
];
if (!validTypes.includes(bumpType)) {
  // Wanted to make something with readline but wasn't able to figure it out.
  console.log('Invalid argument. Must provide one of the following:');
  validTypes.forEach((type, i) => {
    console.log(`${i + 1}. ${type}`);
  });
  console.log(`\nYou can find more info over at https://semver.org.`)
  process.exit(1);
}

if (bumpAmount <= 0) {
  console.log('The Bump amount must be greater than 0.');
  process.exit(1);
}

// all versions are based on the first file's version
// must be a json file
const files = fg.sync([
  'package.json',
  'manifest.json',
  'powercord_manifest.json',
  'src/clients/*',
]);

var version;
var newVersion;
files.forEach((file, i) => {
  const actualFile = join(root, file);
  const fileData = fs.readFileSync(actualFile).toString();
  var isJson;
  try { // TODO: only use try for detection and not for the actual fucking logic
    isJson = Boolean(JSON.parse(fileData));
  } catch(e) {
    isJson = false;
  }
  var newFileData;
  if (isJson) {
    const json = JSON.parse(fileData);
    if (i === 0) {
      const alphaRegex = /(?<=\.\d+-.*?[^\d])\d{3}$/mi;
      version = {
        'Major': parseInt(json.version.split('.')[0]),
        'Minor': parseInt(json.version.split('.')[1]),
        'Patch': parseInt(json.version.split('.')[2]),
        'Alpha': json.version.match(alphaRegex) ? parseInt(json.version.match(alphaRegex)[0]) : 0, // lovely
      };

      version[bumpType] = version[bumpType] + bumpAmount;
      newVersion =
        `${version.Major}.${version.Minor}.${version.Patch}` +
        `${version.Alpha && bumpType == 'Alpha' ? `-Alpha+${version.Alpha.toString().padStart(3, '0')}` : ''}`;

      console.log(newVersion);
    }
    newFileData = JSON.stringify(json, (key, value) => {
      if (key === 'version') {
        return '__versionNumber__';
      }
      return value;
    }, 2);
  } else {
    const regex = /(?<=version\s).*/gmi;
    newFileData = fileData.replace(regex, '__versionNumber__');
  }

  newFileData = newFileData.replace('__versionNumber__', newVersion);

  console.log(newFileData);
  fs.writeFile(actualFile, newFileData, (err) => {
    if (err) {
      console.error(err);
      return;
    };
  });
});

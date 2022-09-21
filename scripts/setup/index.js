#!/usr/bin/env node

const fs = require('fs');
const { cwd } = require('process');
const { join, relative } = require('path');
const { exec } = require('child_process');
const readlineSync = require('readline-sync');

const { metaFiles, rmFiles } = require('../files');
const root = join(__dirname, '../..');

const gitUrl = execSync('git remote get-url origin', { cwd: root })
  .toString()
  .replace(/\n$/, '');
const gitRepo = gitUrl
  .split('/')
  .splice(3);
const gitAuthor = gitRepo[0];
const gitName = gitRepo[1].replace(/.git$/, '');

let themeName;
if (readlineSync.keyInYN(`Is "${gitName}" the correct theme name? `)) {
  themeName = gitName;
} else {
  themeName = readlineSync.question('What should the name of the theme be? ');
}

let authorName;
if (readlineSync.keyInYN(`Is "${gitAuthor}" your GitHub username? `)) {
  authorName = gitAuthor;
} else {
  authorName = readlineSync.question('What is your GitHub username? ');
}

const themeDesc = readlineSync.question('What should the theme\'s description be?\n');

function makeShortName() {
  const vowels = 'aeiouy';
  const regex = new RegExp(`[^a-z]|[${vowels}]`, 'gi');
  const stripped = themeName.replace(regex, '');
  const slice = Math.min(Math.max(themeName.length, 3), 5);
  if (stripped.length <= 4) return themeName.slice(0, slice);
  return stripped.slice(0, slice);
}
let shortName;
if (readlineSync.keyInYN(`Is ${makeShortName()} a good custom prop prefix (var(--${makeShortName()}-custom-prop))? `)) {
  shortName = makeShortName();
} else {
  shortName = readlineSync.question('What should the custom prop prefix be? ');
}

metaFiles.forEach(file => {
  const actualFile = join(root, file);
  const fileData = fs.readFileSync(actualFile).toString();
  const newFileData = fileData
    .replace(/__authorName__/g, authorName)
    .replace(/__themeName__/g, themeName)
    .replace(/__shortName__/g, shortName())
    .replace(/__themeDesc__/g, themeDesc);
  fs.writeFile(actualFile, newFileData, (err) => {
    if (err) {
      throw err;
    }
    console.log(`Replaced metadata on ${actualFile} successfully!`);
  });
});

exec('npm prune --production', { cwd: root }, (err) => {
  if (err) throw err;
  console.log('Removed unnecessary dependency successfully!');
});

rmFiles.forEach(file => {
  const actualFile = join(root, file);
  if (fs.lstatSync(file).isDirectory()) {
    try {
      fs.rmSync(actualFile, { recursive: true, force: true });
    } catch(e) {
      console.error(e);
    }
  } else {
    try {
      fs.unlinkSync(actualFile);
    } catch(e) {
      console.error(e);
    }
  }
});

console.log('Done setting up the template!');
console.log(`Take a look at ${relative(cwd(), join(root, './src/example'))} to see how this template works!`);
console.log(`When you're done with that you can take a look at all of the pre-made scripts in ${relative(cwd(), join(root, './package.json'))},\naccessible by running "npm run [script name]".`);

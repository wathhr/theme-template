#!/usr/bin/env node

const fs = require('fs');
const { join } = require('path');
const { exec } = require('child_process');
const readlineSync = require('readline-sync');

const { metaFiles, rmFiles } = require('../files');
const root = join(__dirname, '../..');

const themeName = readlineSync.question('What should the name of the theme be? ');
const authorName = readlineSync.question('What should the author name be? ');
const themeDesc = readlineSync.question('What should the theme\'s description be?\n');

metaFiles.forEach(file => {
  const actualFile = join(root, file);
  const fileData = fs.readFileSync(actualFile).toString();
  const newFileData = fileData
    .replace('__authorName__', authorName)
    .replace('__themeName__', themeName)
    .replace('__themeDesc__', themeDesc);
  fs.writeFile(actualFile, newFileData, (err) => {
    if (err) {
      throw err;
    };
    console.log(`Replaced metadata on ${actualFile} successfully!`)
  });
});

exec(`npm --version && pwd`, { cwd: root }, (err) => {
  if (err) throw err;
  console.log('Removed readline-sync dependency successfully!');
});

rmFiles.forEach(file => {
  const actualFile = join(root, file);
  if (fs.lstatSync(file).isDirectory()) {
    try {
      fs.rmSync(actualFile, { recursive: true, force: true });
      console.log(`Deleted ${actualFile} successfully!`);
    } catch(e) {
      console.error(e);
    }
  } else {
    try {
      fs.unlinkSync(actualFile);
      console.log(`Deleted ${actualFile} successfully!`);
    } catch(e) {
      console.error(e);
    }
  }
});

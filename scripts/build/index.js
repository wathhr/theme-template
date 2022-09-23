#!/usr/bin/env node

//* The flag parser for this is absolutely horrendous,
//* it works for this project but a rewrite would be nice

const fs = require('fs');
const { cwd } = require('process');
const { join, relative } = require('path');
const { pathToFileURL } = require('url');
const chokidar = require('chokidar');
const fg = require('fast-glob');
const sass = require('sass');
const tinycolor = require('tinycolor2');

const args = process.argv.slice(2);
const flags = require('./flags.json').flags;
const root = join(__dirname, '../..');
const manifest = require(join(root, 'manifest.json'));

let actions = [];

let skipNext;
args.forEach((arg, i) => {
  if (skipNext) {
    skipNext = false;
    return;
  }

  if (arg.startsWith('-')) {
    const type = arg.startsWith('--') ? 'long' : 'short';
    const flag = type == 'long' ?
      flags.find(v => v.name == arg.slice(2)) :
      flags.find(v => v.short == arg.slice(1));
    if (!flag) throw `Argument "${arg}" doesn't exist.`;
    const flagArg = flag.switch ? null : args[i + 1];

    if (!flagArg && !flag.switch) throw `No argument provided on the "${arg}" flag.`

    if (flag.valid) {
      let match;
      flag.valid.forEach(regex => {
        if (flagArg.match(regex)) {
          match = true;
          flag.valid.length = 0;
          return;
        }
      });
      if (!match) throw `Argument ${flagArg} must match ${flag.valid}`;
    }

    actions.push({
      name: flag.name,
      arg: flagArg
    });
    skipNext = Boolean(flagArg);
    return;
  } else if (i < 1) {
    actions.push({
      name: 'filePath',
      arg: arg
    });

    return;
  }
});

const printHelp = () => {
  console.log('Builds your Discord theme.\n');
  console.log('Usage: node', relative(cwd(), __dirname), 'example/ -c all --watch');
  flags.forEach(flag => {
    const short = flag.short ? `-${flag.short}` : '  ';
    const long = `--${flag.name.padEnd(10)}`; // TODO: automatically find best padding value
    const desc = flag.description;
    const string = `  ${short} ${long} | ${desc}`;
    console.log(string);
  });
}

if (actions < 1) {
  printHelp();
  process.exit(1);
}

var setFlags = {};
flags.forEach(flag => {
  setFlags[flag.name] = flag.default;
});

actions.forEach(action => {
  switch (action.name) {
    case 'help':
      printHelp();
      process.exit(0);
      break;

    case 'filePath':
      // In case provided path is folder, find index file
      const indexFiles = ['./index.scss', './_index.scss'];
      indexFiles.forEach(file => {
        const actualFile = join(action.arg, file);
        if (fs.existsSync(actualFile)) {
          setFlags[action.name] = actualFile;
          indexFiles.length = 0;
        }
        return;
      });

      // If no index file is found, use provided path
      if (!setFlags[action.name]) setFlags[action.name] = action.arg;
      break;

    case 'client':
      setFlags[action.name].splice(0, setFlags[action.name].length);
      if (action.arg == 'bd') {
        setFlags[action.name].push('betterDiscord');
        break;
      }
      if (action.arg == 'all') {
        setFlags[action.name].push('betterDiscord', 'stylus', 'all');
        break;
      }
      setFlags[action.name].push(action.arg);
      break;

    default:
      setFlags[action.name] = action.arg || true;
      break;
  }

  return;
});

let compileError;
const compile = (file) => {
  try {
    const compiled = sass.compile(file, {
      style: setFlags.compressed ? 'compressed' : 'expanded',
      functions: {
        'saturation-factor($col)': (args) => {
          const arg = args[0]
            .toString()
            .replace('deg', ''); // remove the 'deg' sass adds on hsl because tinycolor is dumb
          if (!tinycolor(arg).isValid()) {
            throw `Invalid input "${arg}", learn more at https://github.com/bgrins/TinyColor#accepted-string-input.`;
          }
          const col = tinycolor(arg).toHslString();
          const result = col
            .replace(/, /, ', calc(var(--saturation-factor, 1) * ')
            .replace(/%/, '%)');
          return sass.SassString(result, { quotes: false });
        },
        // TODO: remove duplicate code
        // TODO: maybe create a function for this?
        'regex-match($string, $regex)': (args) => {
          for (let i = 0; i < args.length; i++) {
            args[i] = args[i].toString().replace(/['"]/g, '');
          }
          const string = args[0];
          const flagRegex = /(?<=\/)[gmiyusd]*$/;
          const expression = args[1]
            .replace(flagRegex, '')
            .slice(1)
            .slice(0, -1);
          const flags = args[1].match(flagRegex)[0];
          const regex = new RegExp(expression, flags);
          const match = string.match(regex);
          return match ? sass.sassTrue : sass.sassFalse;
        },
        'regex-replace($string, $regex, $replace)': (args) => {
          for (let i = 0; i < args.length; i++) {
            args[i] = args[i].toString().replace(/['"]/g, '');
          }
          const flagRegex = /(?<=\/)[gmiyusd]*$/;
          const string = args[0];
          const expression = args[1]
            .replace(flagRegex, '')
            .slice(1)
            .slice(0, -1);
          const flags = args[1].match(flagRegex)[0];
          const regex = new RegExp(expression, flags);
          const replace = args[2];
          const replaced = string.replace(regex, replace);
          return sass.SassString(replaced, { quotes: false });
        },
      },
      importers: [
        {
          findFileUrl(url) {
            if (!url.startsWith('shared')) return null;
            return new URL(url, pathToFileURL(join(root, 'src/shared')));
          }
        },
        {
          findFileUrl(url) {
            if (!url.startsWith('~')) return null;
            return new URL(pathToFileURL(join(root, 'src', url.substring(1))));
          }
        },
      ]
    });

    if (!fs.existsSync(setFlags.output)) fs.mkdirSync(setFlags.output, { recursive: true });
    setFlags.client.forEach(client => {
      const clientFile = join(root, 'src/clients/', client) + '.css';
      const clientSuffix = {
        'betterDiscord': '.theme',
        'stylus': '.user',
      };

      fs.writeFileSync(
        // Output file name
        join(setFlags.output, manifest.name) +
        `${clientSuffix[client] || ''}.css`,

        `${fs.existsSync(clientFile) ?
          // Add client css
          fs.readFileSync(clientFile).toString().replace(/[^\S\r\n]*@css;?/gi, compiled.css) :
          compiled.css
        }`
      );
    });
    compileError = false;
  } catch(e) {
    console.error(e);
    compileError = true;
  }
}

if (!setFlags.watch) {
  compile(setFlags.filePath);
  if (!compileError) {
    console.log('Compilation Succeeded!');
  }
} else {
  let i = 0;
  const start = setInterval(() => {
    process.stdout.write(`\rStarting Chokidar${'.'.repeat(i++)}`);
  }, 350);

  const watcher = chokidar.watch(join(setFlags.filePath, '../**/*.scss'), { persistent: true });

  watcher
    .on('ready', () => {
      clearInterval(start);
      console.log('\n');
      compile(setFlags.filePath);
      console.log(`[${new Date().toLocaleTimeString()}]`, `Compilation ${compileError ? 'Failed.' : 'Succeeded!'}`, setFlags.filePath);
    })
    .on('change', (path) => {
      compile(setFlags.filePath);
      console.log(`[${new Date().toLocaleTimeString()}]`, `Compilation ${compileError ? 'Failed.' : 'Succeeded!'}`, path);
    });

  process.on('SIGINT', () => {
    console.log(`\nStopping Chokidar${'.'.repeat(i - 1)}`);
    watcher.close().then(() => {
      process.exit();
    });
  });
}

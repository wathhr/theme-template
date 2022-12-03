#!/usr/bin/env node

const fs = require('fs');
const { cwd } = require('process');
const { join, relative } = require('path');
const { pathToFileURL } = require('url');
const chokidar = require('chokidar');
const postcss = require('postcss');
const sass = require('sass');
const tinycolor = require('tinycolor2');

const args = process.argv.slice(2);
const flags = require('./flags.json').flags;
const root = join(__dirname, '../..');
const manifest = require(join(root, 'manifest.json'));

let actions = [];
flags.forEach((flag) => {
  if (Object.hasOwn(flag, 'default'))
    actions.push({
      name: flag.name,
      arg: flag.default,
    });
});

let skipNext;
args.forEach((arg, i) => {
  if (skipNext) {
    skipNext = false;
    return;
  }

  if (arg.startsWith('-')) {
    const type = arg.startsWith('--') ? 'long' : 'short';
    const flag =
      type == 'long'
        ? flags.find((v) => v.name == arg.slice(2))
        : flags.find((v) => v.short == arg.slice(1));
    if (!flag) throw `Argument "${arg}" doesn't exist.`;
    const flagArg = flag.switch ? null : args[i + 1];

    if (!flagArg && !flag.switch)
      throw `No argument provided on the "${arg}" flag.`;

    if (flag.valid) {
      let match;
      flag.valid.forEach((regex) => {
        if (flagArg.match(regex)) {
          match = true;
          flag.valid.length = 0;
          return;
        }
      });
      if (!match)
        throw `Argument ${flagArg} must match /${flag.valid.join('/ or /')}/`, flag.valid;
    }

    actions.push({
      name: flag.name,
      arg: flagArg ? flagArg : true,
    });
    skipNext = Boolean(flagArg);
    return;
  } else if (i < 1) {
    actions.push({
      name: 'filePath',
      arg: arg,
    });

    return;
  }
});

const printHelp = () => {
  console.log('Builds your Discord theme.\n');
  console.log('Usage: node', relative(cwd(), __dirname), 'example/ -c all');
  flags.forEach((flag) => {
    const short = flag.short ? `-${flag.short}` : '  ';
    const long = `--${flag.name.padEnd(10)}`; // TODO: automatically find best padding value
    const desc = flag.description;
    const string = `  ${short} ${long} | ${desc}`;
    console.log(string);
  });
};

if (actions < 1) {
  printHelp();
  process.exit(1);
}

var setFlags = {};
actions.forEach((action) => {
  switch (action.name) {
    case 'help':
      if (action.arg) {
        printHelp();
        process.exit(0);
      }
      break;

    case 'filePath':
      // In case provided path is folder, find index file
      const indexFiles = ['./index.scss', './_index.scss'];
      indexFiles.forEach((file) => {
        const actualFile = join(action.arg, file);
        if (fs.existsSync(actualFile)) {
          setFlags[action.name] = actualFile;
          indexFiles.length = 0;
        }
      });

      // If no index file is found, use provided path
      if (!setFlags[action.name]) setFlags[action.name] = action.arg;
      break;

    case 'client':
      if (action.arg == 'bd') {
        setFlags[action.name] = ['betterDiscord'];
        break;
      }
      if (action.arg == 'all') {
        setFlags[action.name] = ['betterDiscord', 'stylus', 'all'];
        break;
      }
      setFlags[action.name] = [action.arg];
      break;

    case 'plugins':
      const plugins = setFlags[action.name] = [];
      const pluginArray = JSON.parse(action.arg.replace(/'/g, '"'));

      pluginArray.forEach((p) => {
        const plugin = {
          dir: p.replace(/([\w/-]+).*/, '$1'),
          opts: p.replace(/[\w/-]+\((.*)\)/, '$1'),
        };

        const possibleDir = join(root, plugin.dir);
        if (fs.existsSync(possibleDir)) {
          plugins.push(require(possibleDir)(plugin.opts));
        } else if (fs.existsSync(possibleDir + '.js')) {
          plugins.push(require(possibleDir + '.js')(plugin.opts));
        } else {
          plugins.push(require(plugin.dir)(plugin.opts));
        }
      });
      break;

    default:
      setFlags[action.name] = Object.hasOwn(action, 'arg') ? action.arg : true;
      break;
  }

  return;
});

const stringToRegex = (regexString) => {
  const flagRegex = /(?<=\/)[gmiyusd]*$/;
  const expression = regexString.replace(flagRegex, '').slice(1).slice(0, -1);
  const flags = regexString.match(flagRegex)[0];
  return new RegExp(expression, flags);
};

let compileError;
const compile = (file) => {
  try {
    const compiled = sass.compile(file, {
      style: 'expanded',
      functions: {
        'saturation-factor($col)': (args) => {
          const arg = args[0].toString().replace('deg', ''); // remove the 'deg' sass adds on hsl because tinycolor is dumb
          if (!tinycolor(arg).isValid()) {
            throw `Invalid input "${arg}", learn more at https://github.com/bgrins/TinyColor#accepted-string-input.`;
          }
          const col = tinycolor(arg).toHslString();
          const result = col
            .replace(/, /, ', calc(var(--saturation-factor, 1) * ')
            .replace(/%/, '%)');
          return new sass.SassString(result, { quotes: false });
        },

        //? Regex functions
        'regex-match($string, $regex)': (args) => {
          args = args.map((a) => a.toString().replace(/(?:^['"]|['"]$)/g, ''));
          const string = args[0];
          const regex = stringToRegex(args[1]);
          const match = string.match(regex);
          return match ? sass.sassTrue : sass.sassFalse;
        },
        'regex-replace($string, $regex, $replace)': (args) => {
          args = args.map((a) => a.toString().replace(/(?:^['"]|['"]$)/g, ''));
          const string = args[0];
          const regex = stringToRegex(args[1]);
          const replace = args[2];
          const replaced = string.replace(regex, replace);
          return new sass.SassString(replaced, { quotes: false });
        },
      },
      importers: [
        {
          findFileUrl(url) {
            if (!url.startsWith('shared')) return null;
            return new URL(pathToFileURL(join(root, 'src/shared')));
          },
        },
        {
          findFileUrl(url) {
            if (!url.startsWith('~')) return null;
            return new URL(pathToFileURL(join(root, 'src', url.slice(0, 1))));
          },
        },
      ],
    });

    if (!fs.existsSync(setFlags.output))
      fs.mkdirSync(setFlags.output, { recursive: true });
    setFlags.client.forEach((client) => {
      const clientFile = join(root, 'src/clients/', client) + '.css';
      const clientSuffix = {
        betterDiscord: '.theme',
        stylus: '.user',
      };

      // prettier-ignore
      postcss(setFlags.plugins)
        .process(compiled.css, { from: file, to: setFlags.output })
        .then((result) => {
          if (!setFlags.test) {
            const fileName =
              join(setFlags.output, manifest.name) + `${clientSuffix[client] || ''}.css`

            const fileContent =
              `${fs.existsSync(clientFile)
                ? fs.readFileSync(clientFile).toString().replace(/[^\S\r\n]*@css;?/gi, result.css)
                : result.css
              }`;

            fs.writeFileSync(fileName, fileContent);
          }
        });
    });
    compileError = false;
  } catch (e) {
    console.error(e);
    compileError = true;
  }
};

if (!setFlags.watch) {
  compile(setFlags.filePath);
  if (!compileError) {
    console.log('Compilation Succeeded!');
  }
} else {
  let i = 3;
  const start = setInterval(() => {
    try {
      process.stdout.write(`\rStarting Chokidar${'.'.repeat(i++)}`);
    } catch(e) {}
  }, 350);

  const watcher = chokidar.watch(join(setFlags.filePath, '../**/*.scss'), {
    persistent: true,
  });

  watcher
    .on('ready', () => {
      clearInterval(start);
      console.log('\n');
      compile(setFlags.filePath);
      console.log(
        `[${new Date().toLocaleTimeString()}]`,
        `Compilation ${compileError ? 'Failed.' : 'Succeeded!'}`,
        setFlags.filePath
      );
    })
    .on('change', (path) => {
      compile(setFlags.filePath);
      console.log(
        `[${new Date().toLocaleTimeString()}]`,
        `Compilation ${compileError ? 'Failed.' : 'Succeeded!'}`,
        path
      );
    });

  process.on('SIGINT', () => {
    console.log(`\nStopping Chokidar${'.'.repeat(i - 1)}`);
    watcher.close().then(() => {
      process.exit();
    });
  });
}

#!/usr/bin/env node

const fs = require('fs');
const { cwd } = require('process');
const { join, relative } = require('path');
const { pathToFileURL } = require('url');
const chokidar = require('chokidar');
const parser = new (require('datauri/parser'))();
const postcss = require('postcss');
const sass = require('sass');
const tinycolor = require('tinycolor2');

const args = process.argv.slice(2);
const { flags } = require('./flags.json');
const root = join(__dirname, '../..');
const config = require(join(root, 'theme.config.json'));
const manifest = require(join(root, 'manifest.json'));

const help = (exitCode) => {
  console.log('Builds your Discord theme.\n');
  console.log('Usage: node', relative(cwd(), __dirname), 'example/ -c all');
  let longestShort = 0;
  let longestName = 0;
  for (const flag in flags) {
    const shortLength = flags[flag]?.short?.length;
    if (shortLength > longestShort) longestShort = shortLength;

    const nameLength = flags[flag]?.name?.length;
    if (nameLength > longestName) longestName = nameLength;
  }
  flags.forEach((flag) => {
    const short = (flag.short ? flag.short : ' ').padStart(longestShort);
    const long = `--${flag.name.padEnd(longestName)}`;
    const desc = flag.description;
    const string = `  ${short} ${long} | ${desc}`;
    console.log(string);
  });
  process.exit(exitCode);
};

let actions = {};
flags.forEach((flag) => {
  actions[flag.name] = Object.hasOwn(flag, 'default') ? flag.default : null;
});

if (args.length <= 0) help(1);
let skipNext;
args.forEach((arg, i) => {
  if (skipNext) {
    skipNext = false;
    return;
  }

  if (i < 1 && !arg.startsWith('-')) {
    actions.filePath = arg;
    return;
  }

  const actualArg = arg.split('=')[0];
  const isLong = actualArg.startsWith('--');
  const flag = isLong
    ? flags.find((v) => v.name == actualArg.slice(2))
    : flags.find((v) => v.short == actualArg.slice(1));

  if (!flag) throw `Argument "${actualArg}" doesn't exist.`;

  const getFlagArg = () => {
    const equalsArg = arg.split('=')[1];
    const sameArg = Boolean(equalsArg);
    skipNext = !sameArg;

    return equalsArg || args[i + 1];
  };
  const flagArg = flag.switch ? null : getFlagArg();

  if (!flagArg && !flag.switch)
    throw `No argument provided on the "${actualArg}" flag.`;

  if (flag.valid) {
    const regex = new RegExp(flag.valid.join('|'));
    if (!regex.test(flagArg))
      throw `Argument ${flagArg} must match /${flag.valid.join('/ or /')}/`;
  }

  actions[flag.name] = flagArg ? flagArg : true;
});
if (actions.help) help(0);

const clientFiles = fs.readdirSync(join(root, 'src/clients'));

let setFlags = {};
Object.keys(actions).forEach((action) => {
  action = {
    name: action,
    arg: actions[action],
  };

  switch (action.name) {
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
      if (action.arg === 'all') {
        const allClients = clientFiles.map((f) => f.replace(/\..*$/, ''));

        setFlags[action.name] = ['none', ...allClients];
        break;
      }
      setFlags[action.name] = [action.arg];
      break;

    case 'plugins':
      const plugins = (setFlags[action.name] = []);
      const pluginArray = JSON.parse(action.arg.replace(/'/g, '"'));

      pluginArray.forEach((p) => {
        const plugin = {
          dir: p.match(/([\w/.-]+).*/)[1],
          opts: p.match(/[\w/.-]+\((.*)\)/)?.[1],
        };

        const possibleDir = join(root, plugin.dir);
        if (fs.existsSync(possibleDir))
          plugins.push(require(possibleDir)(plugin.opts));
        else if (fs.existsSync(possibleDir + '.js'))
          plugins.push(require(possibleDir + '.js')(plugin.opts));
        else plugins.push(require(plugin.dir)(plugin.opts));
      });
      break;

    default:
      setFlags[action.name] = 'arg' in action ? action.arg : true;
      break;
  }
});

const stringToRegex = (regexString) => {
  const flagRegex = /(?<=\/)[gmiyusd]*$/;
  const expression = regexString.replace(flagRegex, '').slice(1).slice(0, -1);
  const flags = regexString.match(flagRegex)[0];
  return new RegExp(expression, flags);
};

// prettier-ignore
const selectorRegex = {
  all: /[#.][-_]?[_a-zA-Z]+(?:\w|\\.)*|(?<=\s+|^)(?:\w+|\*)|\[[^\s"'=<>`]+?(?<![~|^$*])([~|^$*]?=(?:['"].*['"]|[^\s"'=<>`]+))?\]|:[\w-]+(?:\(.*\))?/gm,
  grouped: /(?:[#.][-_]?[_a-zA-Z]+(?:\w|\\.)*|(?<=\s+|^)(?:\w+|\*)|\[[^\s"'=<>`]+?(?<![~|^$*])([~|^$*]?=(?:['"].*['"]|[^\s"'=<>`]+))?\]|:[\w-]+(?:\(.*\))?)+/gm,
}

let compileError;
const compile = (file) => {
  try {
    const compiled = sass.compile(file, {
      style: 'expanded',
      functions: {
        //? Saturation factor functions
        'sf($col)': (args) => {
          const arg = args[0].toString().replace('deg', ''); // Remove the 'deg' sass adds on hsl because tinycolor is dumb
          if (!tinycolor(arg).isValid()) {
            throw `Invalid input "${arg}", learn more at https://github.com/bgrins/TinyColor#accepted-string-input.`;
          }
          const col = tinycolor(arg).toHslString();
          const result = col
            .replace(/, /, ', calc(var(--saturation-factor, 1) * ')
            .replace(/%/, '%)');
          return sass.SassString(result, { quotes: false });
        },
        'sf-parse($col)': (args) => {
          const arg = args[0].toString();
          const result = arg.replace(
            /(?<=,\s*)calc\(var\(--saturation-factor,\s*1\)\s*\*\s*(\d+%)\)/i,
            '$1'
          );
          const nums = result.match(/[0-9.]+/g);
          return sass.SassColor({
            hue: nums[0],
            saturation: nums[2],
            lightness: nums[1],
            alpha: nums?.[3],
          });
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
          return sass.SassString(replaced);
        },

        //? Misc
        'uri($input, $type: svg, $url: true)': (args) => {
          args = args.map((a) => a.toString().replace(/(?:^['"]|['"]$)/g, ''));
          // TODO: Get the file directory using errors somehow
          const path = join(root, config.assets, args[0]);
          const data = fs.existsSync(path) ? fs.readFileSync(path) : args[0];

          const typeInput = args[1];
          const isFile = typeof data === 'object';
          // TODO: make this not override the typeInput if its user set in a not dumb way
          const type = isFile ? path.match(/(?<=\.)\w+$/)[0] : typeInput;

          const meta = parser.format(type, data);
          return sass.SassString(
            args[2] === 'true' ? `url("${meta.content}")` : `"${meta.content}"`,
            { quotes: false }
          );
        },
        'boost($selector: &, $amount: 1)': (args) => {
          // prettier-ignore
          args = args.map((a) => a.toString().replace(/^\(|\,\)$/g, '').replace(/(?:^['"]|['"]$)/g, ''));
          const selector = args[0];
          const amount = parseInt(args[1]);

          const regex = selectorRegex.all;
          const lastSelector = selector.match(regex)[0];
          // TODO: Add warning if the selector is '*'
          const isTag = /^[^.#:\[]/m.test(lastSelector);
          // prettier-ignore
          const result = isTag
            ? selector + `:is(${Array(amount).fill(lastSelector).join('):is(')})`
            : selector + lastSelector.repeat(amount);

          return sass.SassString(result, { quotes: false });
        },
        'on($platform, $selector: &, $root: false)': (args) => {
          // TODO: remove $root and suggest users to use :root instead
          // prettier-ignore
          args = args.map((a) => a.toString().replace(/^\(|\,\)$/g, '').replace(/(?:^['"]|['"]$)/g, ''));
          const platform = args[0].replace(/\.?platform-/, '');
          // TODO: Add warning for invalid platforms
          const selector = args[1];
          const regex = selectorRegex.grouped;

          const matchedSelectors = selector.match(regex);
          const isRoot =
            args[2] === 'true' ||
            /:root|^html|\[lang|\.platform/i.test(matchedSelectors[0]);

          const result = `.platform-${platform}${isRoot ? '' : ' '}${selector}`;
          return sass.SassString(result, { quotes: false });
        },
      },
      importers: [
        {
          findFileUrl(url) {
            // TODO: Rewrite because yeah
            const aliases = config.aliases;
            let aliasedDir = '';

            // prettier-ignore
            if (!Object.keys(aliases).find((dir) => {
              const result = aliases[dir].includes(
                url.replace(/\/(?:[^/]+)?(?:\/$|$)/, '')
              );
              if (result) aliasedDir = dir;
              return result
            })) return null;
            const structure = url.replace(new RegExp(`^${url}[\\\/]?`), '');
            return new URL(pathToFileURL(join(root, aliasedDir, structure)));
          },
        },
      ],
    });

    if (!fs.existsSync(setFlags.output))
      fs.mkdirSync(setFlags.output, { recursive: true });
    setFlags.client.forEach(async (client) => {
      const regex = {
        atCss: /[^\S\r\n]*@css;?/gi,
        suffix: /\.\w+(?=\.css)/i,
      };

      const clientFile =
        clientFiles.find((f) => client === f.replace(/\..*$/, '')) || '';
      const actualClientFile = join(root, 'src/clients', clientFile);
      const clientSuffix = clientFile.match(regex.suffix)?.[0] || '';

      const postcssRes = await postcss(setFlags.plugins).process(compiled.css, {
        from: file,
        to: setFlags.output,
      });

      if (!setFlags.test) {
        const fileName =
          join(setFlags.output, manifest.name) + `${clientSuffix}.css`;

        const fileContent = Boolean(clientFile)
          ? fs
              .readFileSync(actualClientFile)
              .toString()
              .replace(regex.atCss, postcssRes.css) // Add the CSS wherever @css is used
          : postcssRes.css;

        fs.writeFileSync(fileName, fileContent);
      }
    });
    compileError = false;
  } catch (e) {
    console.error(e);
    compileError = true;
  }
};

if (!setFlags.watch) {
  compile(setFlags.filePath);
  if (!compileError) console.log('Compilation Succeeded!');
} else {
  let i = 3;
  const start = setInterval(() => {
    try {
      process.stdout.write(`\rStarting Chokidar${'.'.repeat(i++)}`);
    } catch (e) {}
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
    console.log(`\nStopping Chokidar${'.'.repeat(i)}`);
    watcher.close().then(() => process.exit());
  });
}

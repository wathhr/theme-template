const { execSync } = require('child_process');
const { join } = require('path');
const { platform } = require('process');

const root = join(__dirname, '../..');
const prompt = () => {
  switch (platform) {
    case 'win32':
      return '>';
    case 'darwin':
      return '%';
    default:
      return '$';
  }
}

const gitCommand = (args, verbose = false) => {
  const command = execSync(`git ${args}`, { cwd: root });
  if (verbose) {
    console.log(prompt(), `git ${args}`);
    console.log(command.toString());
  }
  return command.toString();
};

if (!gitCommand('remote').match('template')) {
  gitCommand('remote add template https://github.com/wathhr/theme-template', true);
}
gitCommand('stash', true);
gitCommand('fetch --all', true);
gitCommand('pull template main --allow-unrelated-histories --force', true);
gitCommand('checkout stash -- .', true); // TODO: Add a diff for picking changing from the template or local code

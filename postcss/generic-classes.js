module.exports = (opts = { wordIgnores: ['platform'] }) => {
  return {
    postcssPlugin: 'Generic Classes',

    Once(Root) {
      const regexWordIgnore = Array.isArray(opts.wordIgnores)
        ? opts.wordIgnores.join('|')
        : opts.wordIgnores;

      const regex = new RegExp(
        // the only capture group should be the generic class
        `\\.(\\w+(?<!${regexWordIgnore})[-_])(?:[\\w-]{4,}|(?=[\\s_-]|$))`
      );

      for (const i in Root.nodes) {
        const node = Root.nodes[i];
        const previous = Root.nodes[i - 1];
        const ignore = previous?.text === 'non-generic';
        if (node.type === 'rule' && !ignore) {
          const newSelector = node.selector
            .split(/\s*(?<!\\)[,>]\s*/gm)
            .map((s) => s.replace(regex, '[class*="$1"]'))
            .join(', ');

          node.selector = newSelector;
        }
      }
    },

    OnceExit(css) {
      let addBefore = '';
      css.walk((node) => {
        if (addBefore) {
          node.raws.before = node.raws.before + addBefore;
          addBefore = '';
        }
        if (node?.text === 'non-generic') {
          addBefore = node.raws.before.replace(/\n$/, '');
          node.remove();
        }
      });
    },
  };
};

module.exports.postcss = true;

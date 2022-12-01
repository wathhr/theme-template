module.exports = (opts = { keepOriginal: false }) => {
  return {
    postcssPlugin: 'Generic Classes',

    Once(Root) {
      for (let i = 0; i < Root.nodes.length; i++) {
        const node = Root.nodes[i];
        const previous = Root.nodes[i - 1];
        const ignore = previous?.text === 'non-generic';
        if (node.type === 'rule' && !ignore) {
          const newSelector = node.selector
            .split(/\s*(?<!\\)[,>]\s*/gm)
            .map((s) => s.replace(
              /\.(\w+(?<!platform))[-_](?:\w{4,7}|(?=[\s_-]|$))/,
              '[class*="$1"]'
            ))
            .join(', ');

          node.selector =
            opts.keepOriginal && newSelector !== node.selector
              ? node.selector + ', ' + newSelector
              : newSelector;
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

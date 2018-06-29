import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import builtins from 'rollup-plugin-node-builtins';
import json from 'rollup-plugin-json';
import replace from 'rollup-plugin-re';
import pkg from './package.json';

const external = Object.keys(pkg.dependencies || {});

export default [
  // browser-friendly build
  {
    input: 'src/main.js',
    output: {
      name: 'perkeep',
      file: pkg.browser,
      format: 'iife',
    },
    plugins: [
      resolve({
        preferBuiltins: false,
      }),
      replace({
        // ... do replace before commonjs
        patterns: [
          {
            match: /formidable(\/|\\)lib/,
            test: 'if (global.GENTLY) require = GENTLY.hijack(require);',
            replace: '',
          },
        ],
      }),
      commonjs({
        namedExports: {
          'node_modules/process/index.js': ['nextTick'],
          'node_modules/events/events.js': ['EventEmitter'],
          'node_modules/buffer/index.js': ['isBuffer'],
        },
      }),
      json(),
      builtins(),
    ],
    watch: {
      include: 'src/**',
      exclude: 'node_modules/**',
      clearScreen: true,
    },
  },

  // CommonJS (for Node) and ES module (for bundlers) build.
  // (We could have three entries in the configuration array
  // instead of two, but it's quicker to generate multiple
  // builds from a single configuration where possible, using
  // an array for the `output` option, where we can specify
  // `file` and `format` for each target)
  {
    input: 'src/main.js',
    external,
    plugins: [
      resolve({
        only: [/^\.{0,2}\//],
      }),
    ],
    output: [
      { file: pkg.main, format: 'cjs' },
      { file: pkg.module, format: 'es' },
    ],
    watch: {
      include: 'src/**',
      exclude: 'node_modules/**',
      clearScreen: true,
    },
  },
];

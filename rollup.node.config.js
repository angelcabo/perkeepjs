import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';
import babel from 'rollup-plugin-babel';

export default {
  input: 'src/main.js',
  output: {
    name: 'Perkeep',
    file: 'dist/perkeep.cjs.js',
    format: 'cjs'
  },
  external: ['fs', 'util', 'url', 'path', 'http', 'https', 'fs', 'stream'],
  plugins: [
    json(),
    resolve({
      jsnext: true,
      preferBuiltins: true
    }),
    commonjs(),
    babel({
      exclude: 'node_modules/**'
    })
  ]
};

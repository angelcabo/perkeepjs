import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

export default [
  {
    input: 'src/main.js',
    output: {
      name: 'Perkeep',
      file: 'dist/perkeep.iife.js',
      format: 'iife'
    },
    plugins: [
      resolve({
        browser: true
      }),
      commonjs()
    ]
  },
  {
    input: 'src/main.js',
    output: {
      name: 'Perkeep',
      file: 'dist/perkeep.cjs.js',
      format: 'cjs'
    },
    plugins: [
      resolve(),
      commonjs()
    ]
  }
];

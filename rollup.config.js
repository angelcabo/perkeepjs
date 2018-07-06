import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

export default [
  {
    input: 'src/main.js',
    output: {
      name: 'Perkeep',
      file: 'dist/perkeep.js',
      format: 'iife'
    },
    plugins: [
      resolve(),
      commonjs()
    ]
  }
];

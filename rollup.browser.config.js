import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import inject from 'rollup-plugin-inject';
import babel from 'rollup-plugin-babel';

export default {
  input: 'src/main.js',
  output: {
    name: 'Perkeep',
    file: 'dist/perkeep.iife.js',
    format: 'iife'
  },
  plugins: [
    resolve({
      browser: true,
      jsnext: true
    }),
    commonjs(),
    inject({
      include: 'node_modules/**',
      modules: {
        Buffer: ['buffer/', 'Buffer']
      }
    }),
    babel({
      exclude: 'node_modules/**'
    })
  ]
};

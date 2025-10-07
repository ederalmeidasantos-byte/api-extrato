import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
import { babel } from '@rollup/plugin-babel';

export default {
  input: 'index.js',
  output: [
    {
      file: 'dist/kentro-api-integration.js',
      format: 'cjs',
      sourcemap: true
    },
    {
      file: 'dist/kentro-api-integration.esm.js',
      format: 'esm',
      sourcemap: true
    },
    {
      file: 'dist/kentro-api-integration.umd.js',
      format: 'umd',
      name: 'KentroAPI',
      sourcemap: true
    },
    {
      file: 'dist/kentro-api-integration.min.js',
      format: 'umd',
      name: 'KentroAPI',
      sourcemap: true,
      plugins: [terser()]
    }
  ],
  plugins: [
    nodeResolve({
      preferBuiltins: true
    }),
    commonjs(),
    babel({
      babelHelpers: 'bundled',
      exclude: 'node_modules/**'
    })
  ],
  external: [
    'axios',
    'dotenv'
  ]
};




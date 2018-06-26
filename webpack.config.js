/* eslint-disable no-var */
var webpack = require('webpack');

var production = process.env.NODE_ENV === 'production';

module.exports = {
  entry: {
    perkeep: './build/perkeep.js',
  },
  module: {
    loaders: [{
      test: /\.js$/,
      exclude: /node_modules/,
      loader: 'babel-loader',
    }],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    }),
  ].concat(production ? [
    new webpack.optimize.UglifyJsPlugin(),
    new webpack.optimize.DedupePlugin(),
  ] : []),
  output: {
    path: './dist',
    filename: production ? '[name].min.js' : '[name].js',
    library: 'perkeep',
    libraryTarget: 'umd',
  },
};
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  entry: {
    "mahad-core": "./mahad.js",
    "mahad-dom": './mahad-dom.js',
    "mahad": ["./mahad.js", './mahad-dom.js'],
  },
  output: {
    filename: '[name].min.js',
    path: path.resolve(__dirname, 'dist'),
  },
  mode: 'production',
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
  },
};

const path = require('path');
const merge = require('webpack-merge');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin');

const commonConfig = require('./webpack.config.common');
const parts = require('./webpack.parts');

const nodeEnvStr = process.env.NODE_ENV || 'production';
const isProd = nodeEnvStr === 'production';

const cssExtractPlugin = new MiniCssExtractPlugin({
  filename: '[contenthash].css',
  chunkFilename: '[contenthash].css',
});

const source = (file) => path.join('timetable-export', file);

const productionConfig = merge([
  parts.setFreeVariable('process.env.NODE_ENV', nodeEnvStr),
  commonConfig,
  {
    // Override common's entry point
    entry: source('main.tsx'),
    // Don't attempt to continue if there are any errors.
    bail: true,
    mode: 'production',
    // We generate sourcemaps in production. This is slow but gives good results.
    // You can exclude the *.map files from the build during deployment.
    devtool: 'source-map',
    output: {
      // The build folder.
      path: parts.PATHS.buildTimetable,
      filename: isProd ? '[chunkhash].js' : '[hash].js',
      // This is used for require.ensure. The setup
      // will work without but this is useful to set.
      chunkFilename: '[chunkhash].js',
    },
    module: {
      rules: [
        {
          test: /\.(css|scss)$/,
          include: parts.PATHS.styles,
          use: [MiniCssExtractPlugin.loader, ...parts.getCSSConfig()],
        },
        {
          test: /\.(css|scss)$/,
          include: parts.PATHS.src,
          exclude: parts.PATHS.styles,
          use: [
            MiniCssExtractPlugin.loader,
            ...parts.getCSSConfig({
              options: {
                modules: true,
                localIdentName: '[hash:base64:8]',
              },
            }),
          ],
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.join(parts.PATHS.src, source('index.html')),
        inlineSource: '\\.(js|css)$',
      }),
      new HtmlWebpackInlineSourcePlugin(),
      cssExtractPlugin,
    ],
  },
  parts.loadImages({
    include: parts.PATHS.images,
    options: {
      name: 'img/[name].[hash].[ext]',
    },
  }),
  parts.clean(parts.PATHS.buildTimetable),
]);

module.exports = productionConfig;

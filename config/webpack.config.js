const fs = require('fs');
const path = require('path');
const glob = require('glob');
const webpack = require('webpack');
const StatsWriterPlugin = require('webpack-stats-plugin').StatsWriterPlugin;
const CopyWebpackPlugin = require('copy-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const ROOT_PATH = path.resolve(__dirname, '..');
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_DEV_SERVER = process.argv.join(' ').indexOf('webpack-dev-server') !== -1;
const DEV_SERVER_HOST = process.env.DEV_SERVER_HOST || 'localhost';
const DEV_SERVER_PORT = parseInt(process.env.DEV_SERVER_PORT, 10) || 3808;
const DEV_SERVER_LIVERELOAD = process.env.DEV_SERVER_LIVERELOAD !== 'false';
const WEBPACK_REPORT = process.env.WEBPACK_REPORT;
const NO_COMPRESSION = process.env.NO_COMPRESSION;

let autoEntriesCount = 0;
let watchAutoEntries = [];
const defaultEntries = ['./main'];

function generateEntries() {
  // generate automatic entry points
  const autoEntries = {};
  const autoEntriesMap = {};
  const pageEntries = glob.sync('pages/**/index.js', {
    cwd: path.join(ROOT_PATH, 'app/assets/javascripts'),
  });
  watchAutoEntries = [path.join(ROOT_PATH, 'app/assets/javascripts/pages/')];

  function generateAutoEntries(path, prefix = '.') {
    const chunkPath = path.replace(/\/index\.js$/, '');
    const chunkName = chunkPath.replace(/\//g, '.');
    autoEntriesMap[chunkName] = `${prefix}/${path}`;
  }

  pageEntries.forEach(path => generateAutoEntries(path));

<<<<<<< HEAD
  // EE-specific auto entries
  const eePageEntries = glob.sync('pages/**/index.js', {
    cwd: path.join(ROOT_PATH, 'ee/app/assets/javascripts'),
  });
  eePageEntries.forEach(path => generateAutoEntries(path, 'ee'));
  watchAutoEntries.push(path.join(ROOT_PATH, 'ee/app/assets/javascripts/pages/'));

=======
>>>>>>> upstream/master
  const autoEntryKeys = Object.keys(autoEntriesMap);
  autoEntriesCount = autoEntryKeys.length;

  // import ancestor entrypoints within their children
  autoEntryKeys.forEach(entry => {
    const entryPaths = [autoEntriesMap[entry]];
    const segments = entry.split('.');
    while (segments.pop()) {
      const ancestor = segments.join('.');
      if (autoEntryKeys.includes(ancestor)) {
        entryPaths.unshift(autoEntriesMap[ancestor]);
      }
    }
    autoEntries[entry] = defaultEntries.concat(entryPaths);
  });

  const manualEntries = {
    default: defaultEntries,
    raven: './raven/index.js',
  };

  return Object.assign(manualEntries, autoEntries);
}

const config = {
  mode: IS_PRODUCTION ? 'production' : 'development',

  context: path.join(ROOT_PATH, 'app/assets/javascripts'),

  entry: generateEntries,

  output: {
    path: path.join(ROOT_PATH, 'public/assets/webpack'),
    publicPath: '/assets/webpack/',
    filename: IS_PRODUCTION ? '[name].[chunkhash:8].bundle.js' : '[name].bundle.js',
    chunkFilename: IS_PRODUCTION ? '[name].[chunkhash:8].chunk.js' : '[name].chunk.js',
    globalObject: 'this', // allow HMR and web workers to play nice
  },

  optimization: {
    nodeEnv: false,
    runtimeChunk: 'single',
    splitChunks: {
      maxInitialRequests: 4,
      cacheGroups: {
        default: false,
        common: () => ({
          priority: 20,
          name: 'main',
          chunks: 'initial',
          minChunks: autoEntriesCount * 0.9,
        }),
        vendors: {
          priority: 10,
          chunks: 'async',
          test: /[\\/](node_modules|vendor[\\/]assets[\\/]javascripts)[\\/]/,
        },
        commons: {
          chunks: 'all',
          minChunks: 2,
          reuseExistingChunk: true,
        },
      },
    },
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules|vendor\/assets)/,
        loader: 'babel-loader',
        options: {
          cacheDirectory: path.join(ROOT_PATH, 'tmp/cache/babel-loader'),
        },
      },
      {
        test: /\.vue$/,
        loader: 'vue-loader',
      },
      {
        test: /\.svg$/,
        loader: 'raw-loader',
      },
      {
        test: /\.(gif|png)$/,
        loader: 'url-loader',
        options: { limit: 2048 },
      },
      {
        test: /\_worker\.js$/,
        use: [
          {
            loader: 'worker-loader',
            options: {
              name: '[name].[hash:8].worker.js',
            },
          },
          'babel-loader',
        ],
      },
      {
        test: /\.(worker(\.min)?\.js|pdf|bmpr)$/,
        exclude: /node_modules/,
        loader: 'file-loader',
        options: {
          name: '[name].[hash:8].[ext]',
        },
      },
      {
        test: /katex.min.css$/,
        include: /node_modules\/katex\/dist/,
        use: [
          { loader: 'style-loader' },
          {
            loader: 'css-loader',
            options: {
              name: '[name].[hash:8].[ext]',
            },
          },
        ],
      },
      {
        test: /\.(eot|ttf|woff|woff2)$/,
        include: /node_modules\/katex\/dist\/fonts/,
        loader: 'file-loader',
        options: {
          name: '[name].[hash:8].[ext]',
        },
      },
      {
        test: /monaco-editor\/\w+\/vs\/loader\.js$/,
        use: [
          { loader: 'exports-loader', options: 'l.global' },
          { loader: 'imports-loader', options: 'l=>{},this=>l,AMDLoader=>this,module=>undefined' },
        ],
      },
    ],

    noParse: [/monaco-editor\/\w+\/vs\//],
    strictExportPresence: true,
  },

  plugins: [
    // manifest filename must match config.webpack.manifest_filename
    // webpack-rails only needs assetsByChunkName to function properly
    new StatsWriterPlugin({
      filename: 'manifest.json',
      transform: function(data, opts) {
        const stats = opts.compiler.getStats().toJson({
          chunkModules: false,
          source: false,
          chunks: false,
          modules: false,
          assets: true,
        });
        return JSON.stringify(stats, null, 2);
      },
    }),

    // prevent pikaday from including moment.js
    new webpack.IgnorePlugin(/moment/, /pikaday/),

    // fix legacy jQuery plugins which depend on globals
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
    }),

    // copy pre-compiled vendor libraries verbatim
    new CopyWebpackPlugin([
      {
        from: path.join(
          ROOT_PATH,
          `node_modules/monaco-editor/${IS_PRODUCTION ? 'min' : 'dev'}/vs`
        ),
        to: 'monaco-editor/vs',
        transform: function(content, path) {
          if (/\.js$/.test(path) && !/worker/i.test(path) && !/typescript/i.test(path)) {
            return (
              '(function(){\n' +
              'var define = this.define, require = this.require;\n' +
              'window.define = define; window.require = require;\n' +
              content +
              '\n}.call(window.__monaco_context__ || (window.__monaco_context__ = {})));'
            );
          }
          return content;
        },
      },
    ]),
  ],

  resolve: {
    extensions: ['.js'],
    alias: {
      '~': path.join(ROOT_PATH, 'app/assets/javascripts'),
      emojis: path.join(ROOT_PATH, 'fixtures/emojis'),
      empty_states: path.join(ROOT_PATH, 'app/views/shared/empty_states'),
      icons: path.join(ROOT_PATH, 'app/views/shared/icons'),
      images: path.join(ROOT_PATH, 'app/assets/images'),
      vendor: path.join(ROOT_PATH, 'vendor/assets/javascripts'),
      vue$: 'vue/dist/vue.esm.js',
      spec: path.join(ROOT_PATH, 'spec/javascripts'),

      // EE-only
      ee: path.join(ROOT_PATH, 'ee/app/assets/javascripts'),
      ee_empty_states: path.join(ROOT_PATH, 'ee/app/views/shared/empty_states'),
      ee_icons: path.join(ROOT_PATH, 'ee/app/views/shared/icons'),
      ee_images: path.join(ROOT_PATH, 'ee/app/assets/images'),
    },
  },

  // sqljs requires fs
  node: {
    fs: 'empty',
  },
};

if (IS_PRODUCTION) {
  config.devtool = 'source-map';

  // compression can require a lot of compute time and is disabled in CI
  if (!NO_COMPRESSION) {
    config.plugins.push(new CompressionPlugin());
  }
}

if (IS_DEV_SERVER) {
  config.devtool = 'cheap-module-eval-source-map';
  config.devServer = {
    host: DEV_SERVER_HOST,
    port: DEV_SERVER_PORT,
    disableHostCheck: true,
    headers: { 'Access-Control-Allow-Origin': '*' },
    stats: 'errors-only',
    hot: DEV_SERVER_LIVERELOAD,
    inline: DEV_SERVER_LIVERELOAD,
  };
  config.plugins.push({
    apply(compiler) {
      compiler.hooks.emit.tapAsync('WatchForChangesPlugin', (compilation, callback) => {
        const missingDeps = Array.from(compilation.missingDependencies);
        const nodeModulesPath = path.join(ROOT_PATH, 'node_modules');
        const hasMissingNodeModules = missingDeps.some(
          file => file.indexOf(nodeModulesPath) !== -1
        );

        // watch for changes to missing node_modules
        if (hasMissingNodeModules) compilation.contextDependencies.add(nodeModulesPath);

        // watch for changes to automatic entrypoints
        watchAutoEntries.forEach(watchPath => compilation.contextDependencies.add(watchPath));

        // report our auto-generated bundle count
        console.log(
          `${autoEntriesCount} entries from '/pages' automatically added to webpack output.`
        );

        callback();
      });
    },
  });
  if (DEV_SERVER_LIVERELOAD) {
    config.plugins.push(new webpack.HotModuleReplacementPlugin());
  }
}

if (WEBPACK_REPORT) {
  config.plugins.push(
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      generateStatsFile: true,
      openAnalyzer: false,
      reportFilename: path.join(ROOT_PATH, 'webpack-report/index.html'),
      statsFilename: path.join(ROOT_PATH, 'webpack-report/stats.json'),
    })
  );
}

module.exports = config;

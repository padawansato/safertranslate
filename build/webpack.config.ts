/**
 * Webpack Configuration for SaferTranslate
 * Clean Architecture + Browser Extension optimized build
 */

import path from 'path';
import webpack from 'webpack';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = !isProduction;

const baseConfig: webpack.Configuration = {
  mode: isProduction ? 'production' : 'development',
  devtool: isDevelopment ? 'inline-source-map' : 'source-map',
  
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    alias: {
      '@domain': path.resolve(__dirname, '../src/domain'),
      '@application': path.resolve(__dirname, '../src/application'),
      '@infrastructure': path.resolve(__dirname, '../src/infrastructure'),
      '@presentation': path.resolve(__dirname, '../src/presentation'),
      '@tests': path.resolve(__dirname, '../tests'),
      '@automation': path.resolve(__dirname, '../automation'),
      '@build': path.resolve(__dirname, '../build')
    }
  },
  
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: path.resolve(__dirname, '../tsconfig.json'),
              transpileOnly: isDevelopment
            }
          }
        ],
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        type: 'asset/resource',
        generator: {
          filename: 'assets/images/[name][ext]'
        }
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        type: 'asset/resource',
        generator: {
          filename: 'assets/fonts/[name][ext]'
        }
      }
    ]
  },
  
  plugins: [
    new CleanWebpackPlugin(),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'process.env.BUILD_TARGET': JSON.stringify(process.env.BUILD_TARGET || 'chrome')
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser'
    })
  ],
  
  optimization: {
    minimize: isProduction,
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10
        },
        domain: {
          test: /[\\/]src[\\/]domain[\\/]/,
          name: 'domain',
          chunks: 'all',
          priority: 20
        },
        application: {
          test: /[\\/]src[\\/]application[\\/]/,
          name: 'application',
          chunks: 'all',
          priority: 20
        },
        infrastructure: {
          test: /[\\/]src[\\/]infrastructure[\\/]/,
          name: 'infrastructure',
          chunks: 'all',
          priority: 20
        }
      }
    }
  },
  
  performance: {
    hints: isProduction ? 'warning' : false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000
  },
  
  stats: {
    colors: true,
    modules: false,
    chunks: false,
    chunkModules: false
  }
};

// Chrome Extension Configuration
export const chromeConfig: webpack.Configuration = {
  ...baseConfig,
  name: 'chrome',
  target: 'web',
  
  entry: {
    'background/service-worker': path.resolve(__dirname, '../src/presentation/chrome-extension/background/service-worker.ts'),
    'content/content-script': path.resolve(__dirname, '../src/presentation/chrome-extension/content/content-script.ts'),
    'popup/popup': path.resolve(__dirname, '../src/presentation/chrome-extension/popup/popup.ts')
  },
  
  output: {
    path: path.resolve(__dirname, '../dist/chrome'),
    filename: '[name].js',
    clean: true
  },
  
  plugins: [
    ...(baseConfig.plugins || []),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, '../src/presentation/chrome-extension/manifest.json'),
          to: 'manifest.json'
        },
        {
          from: path.resolve(__dirname, '../src/presentation/chrome-extension/popup/popup.html'),
          to: 'popup/popup.html'
        },
        {
          from: path.resolve(__dirname, '../src/presentation/chrome-extension/popup/popup.css'),
          to: 'popup/popup.css'
        },
        {
          from: path.resolve(__dirname, '../assets/icons'),
          to: 'icons'
        }
      ]
    })
  ]
};

// Safari Extension Configuration
export const safariConfig: webpack.Configuration = {
  ...baseConfig,
  name: 'safari',
  target: 'web',
  
  entry: {
    'content-script': path.resolve(__dirname, '../src/presentation/content-scripts/BilingualRenderer.ts'),
    'translation-ui': path.resolve(__dirname, '../src/presentation/content-scripts/TranslationUI.ts')
  },
  
  output: {
    path: path.resolve(__dirname, '../dist/safari'),
    filename: '[name].js',
    library: {
      type: 'window'
    },
    clean: true
  },
  
  plugins: [
    ...(baseConfig.plugins || []),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, '../src/presentation/content-scripts/styles'),
          to: 'styles'
        },
        {
          from: path.resolve(__dirname, '../assets/icons'),
          to: 'icons'
        }
      ]
    })
  ]
};

// Development Server Configuration
export const devServerConfig = {
  static: {
    directory: path.join(__dirname, '../dist')
  },
  compress: true,
  port: 9000,
  hot: true,
  open: false,
  client: {
    overlay: true
  },
  devMiddleware: {
    writeToDisk: true // Important for extension development
  }
};

// Export configurations based on build target
const buildTarget = process.env.BUILD_TARGET;

if (buildTarget === 'chrome') {
  export default chromeConfig;
} else if (buildTarget === 'safari') {
  export default safariConfig;
} else {
  // Default: build both
  export default [chromeConfig, safariConfig];
}
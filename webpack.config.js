const slsw = require("serverless-webpack")
const nodeExternals = require("webpack-node-externals")
// import path = require('path');

module.exports = {
  // stats: 'verbose',

  mode: slsw.lib.webpack.isLocal ? "development" : "production",

  entry: slsw.lib.entries, // automatize creating of entries using serverless-webpack plugin

  devtool: "source-map", // create source maps for each packed js file

  resolve: {
    extensions: [".mjs", ".js", ".jsx", ".json", ".ts", ".tsx"],
  },

  target: "node",

  /*
   * External files
   */

  externals: [nodeExternals()],

  module: {
    rules: [
      /*
       * All files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
       */

      {
        test: /\.tsx?$/,
        use: [
          {
            loader: "ts-loader",
            options: {
              configFile: "tsconfig.webpack.json",
            },
          },
        ],
        exclude: /node_modules|tests|visual-check/,
      },

      /*
       * Handlebar templates should be loaded without any transpilling
       */

      {
        test: /\.hbs/,
        exclude: /node_modules/,
        type: "asset/source",
      },
    ],
  },
}

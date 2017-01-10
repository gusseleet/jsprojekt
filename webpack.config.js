var debug = process.env.NODE_ENV !== 'production';

var webpack = require('webpack');



module.exports = {
    context: __dirname + "/app",
    devtool: debug ? "inline-sourcemap" : null,
    entry: "./js/main.js",


    output: {
        path: __dirname + "/public",
        filename: "gchat.min.js",
        publicPath: "asset"
    },


    module: {
        loaders: [
            {
                test: __dirname + "app/js",
                loader:"babel-loader",
                query:
                {
                    presets: ["es2015"]
                }
            },
        ]
    },

    resolve: {
        modulesDirectories: [
            "node_modules/"
        ],
    },

    externals: {

    },

    plugins: debug ? [

    ] : [
        new webpack.optimize.DedupePlugin(),
        new webpack.optimize.OccurenceOrderPlugin(),
        new webpack.optimize.UglifyJsPlugin(),
    ],
};
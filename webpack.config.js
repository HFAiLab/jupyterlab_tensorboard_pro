// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

console.info('use custom webpack config...');

module.exports = {
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.svg'],
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  optimization: {
    usedExports: true
  },
  plugins: [],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.s[ac]ss$/i,
        use: [
          // 将 JS 字符串生成为 style 节点
          'style-loader',
          // 将 CSS 转化成 CommonJS 模块
          'css-loader',
          // 将 Sass 编译成 CSS
          {
            loader: 'sass-loader'
          }
        ]
      }
    ]
  }
};

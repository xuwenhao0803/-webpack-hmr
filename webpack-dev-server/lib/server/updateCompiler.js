
/**
 * 为了实现客户端跟服务器通信，需要往入口多注入两个文件
 * webpack-dev-server/client/
 * webpack/hot/dev-server.js
 * ./src/index.js
 * @param {*} compiler 
 */
const path = require('path')
function updateCompiler(compiler) {
    const config = compiler.options;
    config.entry = {
        main: [
            path.resolve(__dirname,'../client/index.js'),
            path.resolve(__dirname,'../client/hot/dev-server.js'),
            config.entry
        ]
    }
}
module.exports=updateCompiler
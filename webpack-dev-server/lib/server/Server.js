const express = require('express')
const http = require('http');
const MemoryFS = require('memory-fs');
const path = require('path');
const updateCompiler = require('./updateCompiler')
const mime = require('mime');
const socketIO = require('socket.io')

class Server {
    constructor(compiler) {
        this.compiler = compiler//保存编译对象
        updateCompiler(compiler);
        this.setupApp()//创建APP
        this.currentHash;//当前的hash值
        this.clientSocketList = [];//存放着所有通过websocket连接到服务器的客户端
        this.setupHooks();//建立钩子
        this.setupDevMiddleware()
        this.routes();//配置路由钩子
        this.createServer();//创建HTTP服务器，以app作为路由
        this.createSocketServer();//创建socket服务器
    }
    createSocketServer() {
        //websocket协议握手 需要依赖http服务器
        const io = socketIO(this.server)
        //服务器要监听客户端的连接
        io.on('connection', (socket) => {
            console.log('一个新的客户端连接上了');
            this.clientSocketList.push(socket);
            socket.emit('hash', this.currentHash);
            socket.emit('ok'); 
            socket.on('disconnect', () => {
                let index = this.clientSocketList.indexOf(socket)
                this.clientSocketList.splice(index, 1)
            })

        })
    }

    routes() {
        let { compiler } = this;
        let config = compiler.options;
        this.app.use(this.middleware(config.output.path))
    }


    setupDevMiddleware() {
        this.middleware = this.webpackDevMiddleware()
    }

    webpackDevMiddleware() {
        let { compiler } = this;
        compiler.watch({}, () => {
            console.log('监听模式编译成功');
        })
        let fs = new MemoryFS();//内存文件系统实例
        this.fs = compiler.outputFileSystem = fs
        //返回一个中间件，用来响应客户端对于产出文件的请求
        return (staticDir) => {//静态文件跟目录，它其就是输出目录 
            return (req, res, next) => {
                let { url } = req;
                if (url === '/favicon.ico') {
                    return res.sendStatus(404)
                }
                url === '/' ? url = '/index.html' : null
                let filepath = path.join(staticDir, url)
                try {
                    //返回此路径上的文件描述对象,如果文件不存在，会抛异常
                    let statobj = this.fs.statSync(filepath);
                    if (statobj.isFile()) {
                        let content = this.fs.readFileSync(filepath);//读取文件内容

                        res.setHeader('Content-Type', mime.getType(filepath))//设置响应头 告诉浏览器此文件内容是什么

                        res.send(content)
                    } else {

                        return res.sendStatus(404)
                    }
                } catch (error) {
                    console.log(error);
                    return res.sendStatus(404)
                }

            }


        }
    }


    setupHooks() {
        let { compiler } = this;
        //监听编译完成事件，当完成编译完成会调用此钩子函数
        compiler.hooks.done.tap('webpack-dev-server', (stats) => {
            this.currentHash = stats.hash
            //会向客户端广播，告诉客户端已经编译成功了，新的代码已经生成
            this.clientSocketList.forEach(socket => {
                socket.emit('hash', this.currentHash);
                socket.emit('ok')
            })
        })
    }



    setupApp() {
        this.app = express()
    }

    createServer() {
        this.server = http.createServer(this.app)
    }
    listen(port, host, callback) {
        this.server.listen(port, host, callback)

    }
}
module.exports = Server
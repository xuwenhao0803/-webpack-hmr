let socket = io('/')
class Emitter {
    constructor() {
        this.listeners = {}
    }
    on(type, listener) {
        this.listeners[type] = listener
    }

    emit(type) {
        this.listeners[type] && this.listeners[type]()
    }

}
let hotEmitter = new Emitter()
const onConnected = () => {
    console.log('客户端连接成功');
}
let hotCurrentHash;//lastHash 上一次 hash值
let currentHash;
socket.on('hash', (hash) => {
    currentHash = hash
})
socket.on('ok', () => {
    reloadApp(true)
})

hotEmitter.on('webpackHotUpdate', () => {
    if (!hotCurrentHash || hotCurrentHash == currentHash) {
        return hotCurrentHash = currentHash

    }
    hotCheck()
})

function hotDownloadUpdateChunk(chunkId) {
    let script = document.createElement('script');
    script.charset = 'utf-8';
    script.src =`${chunkId}.${hotCurrentHash}.hot-update.js`
    document.head.appendChild(script)

}


function hotCheck() {
    hotDownloadMainfest().then(update => {
        let chunkIds = update.c;
        chunkIds.forEach(chunkId => {
            hotDownloadUpdateChunk(chunkId)
        })
    });
}

//此方法询问服务器这一次编译到底改变了哪些chunk，哪些模块
function hotDownloadMainfest() {
    return new Promise(function (resolve) {
        let request = new XMLHttpRequest();
        let requestPath =`main.${hotCurrentHash}.hot-update.json`;
        request.open('GET', requestPath, true);
        request.onreadystatechange = function () {
            if (request.readyState === 4) {
                let update = JSON.parse(request.responseText);
                resolve(update)
            }
        }
        request.send()

    })
}
window.hotCreateModule = function () {
    let hot = {
        _acceptedDependencies: {},
        accept: function (deps, callback) {
            for (let i = 0; i < deps.length; i++) {
                hot._acceptedDependencies[deps[i]] = callback
            }

        }
    }
    return hot
}

//当接收到OK事件之后，会重新刷新APP
function reloadApp(hot) {
    if (hot) {//如果hot为true 走热更新的逻辑
        hotEmitter.emit('webpackHotUpdate', currentHash)
    } else {//如果不支持热更新，则直接重新加载
        window.location.reload()
    }
}
window.webpackHotUpdatehrm=function(chunkId, moreModules) {
    for (let moduleId in moreModules) {
        //从模块缓存中取到老的定义
        let oldModule = __webpack_require__.c[moduleId];
        let { parents, children } = oldModule;
        let module = __webpack_require__.c[moduleId] = {
            i: moduleId,
            l: false,
            exports: {},
            parents,
            children,
            hot: window.hotCreateModule(moduleId)
        }
        moreModules[moduleId].call(module.exports, module, module.exports, __webpack_require__)
        module.l = true;
        parents.forEach(parent => {
            let parentModule = __webpack_require__.c[parent]
            parentModule && parentModule.hot && parentModule.hot._acceptedDependencies[moduleId]()
        })
        hotCurrentHash = currentHash
    }
}

socket.on('connect', onConnected)
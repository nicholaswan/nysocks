// TODO: throw when create socket without starting loops
import EventEmitter from 'events'
import binding from '../../build/Release/addon.node'
import { createBaseSuite } from './utils'
// import { record, get } from './monitor'

binding.useDefaultLoop(true)

const suite = createBaseSuite('_sess')
const { wrap } = suite

const CLOSE_TIMEOUT = 10000

const DEFAULT_KCP_OPTIONS = {
  // TODO:
  sndwnd: 2048,
  rcvwnd: 2048,
  nodelay: 1,
  interval: 10,
  resend: 2,
  nc: 1,
}

export function create() {
  const sess = binding.create()
  sess.event = new EventEmitter()
  sess._sess = true
  sess.isClosed = false

  binding.bindClose(sess, errorMsg => {
    sess.isClosed = true
    sess.event.emit('close', errorMsg)
  })

  return sess
}

export const initCryptor = wrap((sess, key) => {
  if (typeof key !== 'string' || key.length === 0) {
    throw new Error('expect a string "key"')
  }

  binding.initCryptor(sess, key, key.length)
})

export const setWndSize = wrap((sess, sndWns, rcvWnd) => {
  binding.setWndSize(sess, sndWns, rcvWnd)
})

export const setNoDelay = wrap((sess, nodelay, interval, resend, nc) => {
  binding.setNoDelay(sess, nodelay, interval, resend, nc)
})

// Accept kcp options.
export function createWithOptions(_options) {
  const sess = create()
  const options = Object.assign({}, DEFAULT_KCP_OPTIONS, _options)
  const {
    sndwnd,
    rcvwnd,
    nodelay,
    interval,
    resend,
    nc,
  } = options

  setWndSize(sess, sndwnd, rcvwnd)
  setNoDelay(sess, nodelay, interval, resend, nc)

  return sess
}

// NOTE: Do not use this for the transforming of proxy data.
export const input = wrap((sess, buffer, address, port) =>
  binding.input(sess, buffer, buffer.length, address, port))

// NOTE: Do not use this for the transforming of proxy data.
export const bindUdpSend = wrap((sess, next) => {
  binding.bindUdpSend(sess, next)
})

export const destroy = wrap((sess) => {
  if (sess.isClosed) {
    return
  }

  sess.isClosed = true

  // TODO:
  setTimeout(() => {
    binding.free(sess)
  })
  // process.nextTick(() => {
  //   binding.free(sess)
  // })
})

export const close = wrap((sess) => {
  if (sess.isClosed) {
    return
  }

  binding.close(sess)

  // NOTE: Force destroying the sess if it takes too many seconds.
  setTimeout(() => {
    if (!sess.isClosed) {
      destroy(sess)
    }
  }, CLOSE_TIMEOUT)
})

export const listen = wrap((sess, port = 0, onMessage) => {
  const errMsg = binding.listen(sess, port, onMessage)

  if (errMsg) {
    throw new Error(`${errMsg} (port: ${port})`)
  }
})

export const bindListener = wrap((sess, onMessage) => {
  if (typeof onMessage !== 'function') {
    throw new Error('expect "onMessage" to be a function')
  }

  binding.bindListen(sess, onMessage)
})

export const getPort = wrap((sess) => binding.getPort(sess))

export const stopListen = wrap((sess) => {
  binding.stopListen(sess)
})

export const send = wrap((sess, buf) => {
  binding.send(sess, buf, buf.length)
})

export const setAddr = wrap((sess, address, port) => {
  binding.initSend(sess, address, port)
})

export function createConnection(targetAddress, targetPort, onMsg) {
  const sess = create()

  listen(sess, 0, onMsg)
  setAddr(sess, targetAddress, targetPort)

  return sess
}

export function startKcpuv() {
  binding.initialize()
  binding.startLoop()
}

export function _stopLoop() {
  binding.stopLoop()
}

// TODO:
export function stopKcpuv() {
  _stopLoop()
  binding.destruct()
}

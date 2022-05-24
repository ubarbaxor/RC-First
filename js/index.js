const express = require('express')
const { SerialPort } = require('serialport')
const app = express()

const http = require('http')
const server = http.createServer(app)

const { Server } = require("socket.io")
const io = new Server(server)

const PORT = 8000
const HOST = 'localhost'

app.use(express.static('public'))

const BAUDRATE = 115200
const ports = {}
const updateHandlers = {
  throttle: ({ value }, {id}) => {
    if (!ports[id]) { return }
    // Value can be -1 to 1
    // We want it on 0-255
    // Scale linear
    let throttle

    if (value > 0) {
      throttle = Math.round(255 * value)
      ports[id].serial.write(`M A 0 ${throttle}\n`)// Axis Zero Value
    } else {
      // Not implemented
    }
  }
}
io.on('connection', socket => {
  console.log(`Socket ${socket.id} connected.`)

  // socket.onAny(console.log)

  socket.on('disconnect', reason => {
    console.log(`Socket ${socket.id} disconnected (${reason})`)
    if (ports[socket.id]) {
      console.log(`Cleanup port ${ports[socket.id].serial.settings.path}`)
      ports[socket.id].serial.write('rx') // We're disconnecting, no more tx
      delete ports[socket.id].serial
      delete ports[socket.id]
    }
  })

  socket.on('listPorts', _ => {
    SerialPort.list()
      .then(serialPorts => socket.emit('serialPorts', serialPorts))
  })

  socket.on('selectPort', path => {
    if (!path) { return }

    // Todo : mult socks / ports ?
    if (!ports[socket.id]) {
      const serial = new SerialPort({ path, baudRate: BAUDRATE })
      ports[socket.id] = {
        path,
        serial,
        socket: socket.id,
      }
      socket.emit('portSelected', path)
      serial.pipe(process.stdout)
      serial.on('ready', _ => {
        console.log('POTATO')
        serial.write('tx')
      })
    } else if (ports[socket.id] && ports[socket.id].path === path) {
      socket.emit('portRecover', path)
    }
  })

  socket.on('padUpdates', updates => {
    updates.forEach(u => updateHandlers[u.action]
      && updateHandlers[u.action.toLowerCase()](u, socket))
  })

})

server.listen(PORT, HOST, () => {
  console.log(`listening on ${HOST}:${PORT}`);
});

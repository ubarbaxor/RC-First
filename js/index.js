const express = require('express')
const { SerialPort } = require('serialport')
const app = express()

const http = require('http')
const readline = require('readline')
const rl = readline.createInterface({
  input: process.stdin
})

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
    let throttle

    throttle = Math.round(255 * value)
    const msg = `M ${value > 0 ? "A" : "a"} 0 ${throttle}`
    // console.log(msg)
    ports[id].serial.write(`${msg}`)
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
      const serial = new SerialPort({ path, baudRate: BAUDRATE }, _ => {
        serial.write('tx')
        rl.on('line', input => {
          console.log(`User input: [${input}]`)
          serial.write(input)
        })
        ports[socket.id] = {
          path,
          serial,
          socket: socket.id,
        }
        socket.emit('portSelected', path)
        serial.pipe(process.stdout)
      })
    } else if (ports[socket.id] && ports[socket.id].path === path) {
      socket.emit('portRecover', path)
    }
  })

  socket.on('padUpdates', updates => {
    updates.forEach(u => {
      const actionHandler = updateHandlers[u.action.toLowerCase()]

      actionHandler
        ? actionHandler(u, socket)
        : console.log(`Action not implemented: ${u.action}`)
    })
  })

})

server.listen(PORT, HOST, () => {
  console.log(`listening on ${HOST}:${PORT}`);
});

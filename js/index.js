const express = require('express')
const { SerialPort } = require('serialport')
const app = express()

const http = require('http')
const readline = require('readline')
const rl = readline.createInterface({
  input: process.stdin,
})

const server = http.createServer(app)

const { Server } = require('socket.io')
const io = new Server(server)

const PORT = 8000
const HOST = 'localhost'

app.use(express.static('public'))

const BAUDRATE = 115200
const ports = {}
const updateHandlers = {
  throttle: ({ value }, { id }) => {
    if (!ports[id]) return
    const throttle = Math.round(255 * value)
    const msg = `M ${value > 0 ? 'A' : 'a'} 0 ${throttle};`
    // console.log(msg)
    ports[id].serial.write(`${msg}`)
  },
}
io.on('connection', socket => {
  const listPorts = _ => {
    console.log(`Send ports to ${socket.id}`)
    SerialPort.list()
      .then(serialPorts => socket.emit('serialPorts', serialPorts))
  }

  console.log(`Socket ${socket.id} connected.`)
  listPorts()

  // socket.onAny(console.log)

  socket.on('disconnect', reason => {
    console.log(`Socket ${socket.id} disconnected (${reason})`)
    const serialPath = ports[socket.id]?.path
    // TODO
    // if (ports[socket.id]) {
    // }
    const sharingIDs = Object.keys(ports).filter(id => {
      if (id === socket.id) return false

      if (ports[id].path === serialPath) {
        console.log(`Socket ${socket.id} shares ${serialPath} with ${id}`)
        return true
      } else return false
    })
    if (ports[socket.id] && !sharingIDs.length) {
      console.log(`Cleanup port ${ports[socket.id].serial.settings.path}`)
      ports[socket.id].serial.write('rx') // We're disconnecting, no more tx
      ports[socket.id].serial.close()
    }
    delete ports[socket.id]
  })

  socket.on('listPorts', listPorts)

  socket.on('selectPort', path => {
    if (!path) {
      if (ports[socket.id]) {
        const sharingIDs = Object.keys(ports).filter(id => {
          if (ports[id].path === path && id !== socket.id) {
            console.log(ports[id])
            return true
          }
          return false
        })
        if (!sharingIDs.length) {
          console.log(`Port ${ports[socket.id].serial.path} is now free.`)
          ports[socket.id].serial && ports[socket.id].serial.close()
        }
        delete (ports[socket.id])
        return
      }
    } else if (ports[socket.id] && ports[socket.id].path !== path) {
      const sharingIDs = Object.keys(ports).filter(id => {
        if (id === socket.id) return false
        if (ports[id].path === path) return true
        return false
      })
      if (!sharingIDs.length) {
        ports[socket.id].serial.close()
        delete (ports[socket.id])
      }
    }
    console.log(`Port selected: ${path}`)

    // Todo : mult socks / ports ?
    if (!ports[socket.id]) {
      const sharingIDs = Object.keys(ports).filter(id => {
        if (ports[id].path === path && id !== socket.id) {
          console.log(`${ports[id].path} shared with ${id}`)
          return true
        }
        return false
      })
      const serial = sharingIDs.length
        ? sharingIDs[0].serial
        : new SerialPort({ path, baudRate: BAUDRATE }, _ => {
          serial.write('tx')
          rl.on('line', input => {
            console.log(`User input: [${input}]`)
            serial.write(input)
          })
        })
      ports[socket.id] = {
        path,
        serial,
        socket: socket.id,
      }
      if (sharingIDs.length)
        socket.emit('portResume', path)
      else {
        socket.emit('portSelected', path)
        serial.pipe(process.stdout)
      }
    } else if (ports[socket.id] && ports[socket.id].path === path)
      socket.emit('portResume', path)
  })

  socket.on('padUpdates', updates => {
    console.log('padUpdates: ', updates)
    updates.forEach(u => {
      const actionHandler = updateHandlers[u.action.toLowerCase()]

      actionHandler
        ? actionHandler(u, socket)
        : console.log(`Action not implemented: ${u.action}`)
    })
  })
})

server.listen(PORT, HOST, () => {
  console.log(`listening on ${HOST}:${PORT}`)
})

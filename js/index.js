const express = require('express')
const app = express()

const http = require('http')
const server = http.createServer(app)

const { Server } = require("socket.io")
const io = new Server(server)

const PORT = 8000
const HOST = 'localhost'

app.use(express.static('public'))

io.on('connection', socket => {
    console.log('User connected.')
})

server.listen(PORT, HOST, () => {
  console.log(`listening on ${HOST}:${PORT}`);
});

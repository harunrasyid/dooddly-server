const express = require('express');
const app = express();

const server = require('http').createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

// Routes
app.get('/', (req, res) => {
    res.send('This is dooddly server');
})

// Socket.io
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
})

const port  = process.env.PORT || 3000;

server.listen(port, () => {
    console.log(`Listening on port ${port}`);
});

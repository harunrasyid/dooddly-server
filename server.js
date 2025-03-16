const express = require("express");
const cors = require("cors");

const app = express();
const server = require("http").createServer(app);
const { Server } = require("socket.io");

app.use(
  cors({
    origin: "http://localhost:5173", // Change this based on your frontend port
    methods: ["GET", "POST"],
  }),
);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Must match frontend
    methods: ["GET", "POST"],
  },
});
const rooms = {};

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("userJoinRoom", (data) => {
    const { name, roomCode: code, userId, host, presenter } = data;

    socket.join(code);
    if (!rooms[code]) rooms[code] = { history: [], redoStack: [] };

    socket.emit("userIsJoined", { success: true });
    // Send existing drawing history
    socket.emit("loadHistory", rooms[code].history);
  });

  // socket.on("joinRoom", (room) => {
  //   socket.join(room);
  //   if (!rooms[room]) rooms[room] = { history: [], redoStack: [] };
  //
  //   // Send existing drawing history
  //   socket.emit("loadHistory", rooms[room].history);
  // });

  socket.on("draw", ({ room, drawData }) => {
    rooms[room].history.push(drawData);
    rooms[room].redoStack = []; // Clear redo on new draw
    socket.to(room).emit("draw", drawData);
  });

  socket.on("undo", (room) => {
    if (rooms[room]?.history.length > 0) {
      const lastAction = rooms[room].history.pop();
      rooms[room].redoStack.push(lastAction);
      io.to(room).emit("loadHistory", rooms[room].history);
    }
  });

  socket.on("redo", (room) => {
    if (rooms[room]?.redoStack.length > 0) {
      const redoAction = rooms[room].redoStack.pop();
      rooms[room].history.push(redoAction);
      io.to(room).emit("loadHistory", rooms[room].history);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

server.listen(4000, () => console.log("Server running on port 4000"));

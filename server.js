const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  }),
);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

/**
 * @typedef {Object} Room
 * @property {Array<Object>} history - Stores the drawing history.
 * @property {Array<Object>} redoStack - Stores redo actions.
 */
const rooms = {};

/**
 * Handles all socket events when a user connects.
 * @param {import("socket.io").Socket} socket - The connected socket instance.
 */
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  /**
   * Handles room creation or joining.
   * @event userCreateRoom
   * @param {Object} data
   * @param {string} data.roomCode - The room code to join.
   */
  socket.on("userCreateRoom", ({ roomCode }) => {
    if (!roomCode) return;

    socket.join(roomCode);
    rooms[roomCode] = rooms[roomCode] || { history: [], redoStack: [] };

    socket.emit("userIsJoined", { success: true });
    console.log(`Room created/joined: ${roomCode} by ${socket.id}`);
  });

  /**
   * Handles user joining an existing room.
   * @event userJoinRoom
   * @param {Object} data
   * @param {string} data.roomCode - The room code to join.
   */
  socket.on("userJoinRoom", ({ roomCode }) => {
    if (!roomCode) return;

    socket.join(roomCode);
    socket.emit("userIsJoined", { success: true });
    console.log(`User ${socket.id} joined room: ${roomCode}`);
  });

  /**
   * Sends drawing history and redo stack for a room.
   * @event loadHistory
   * @param {string} roomCode - The room code.
   */
  socket.on("loadHistory", (roomCode) => {
    if (!rooms[roomCode]) return;

    socket.emit("loadHistory", {
      history: rooms[roomCode]?.history || [],
      redoStack: rooms[roomCode]?.redoStack || [],
    });
  });

  /**
   * Handles drawing action.
   * @event draw
   * @param {Object} data
   * @param {string} data.room - The room code.
   * @param {Object} data.drawData - Drawing data.
   */
  socket.on("draw", ({ room, drawData }) => {
    if (!rooms[room]) return;

    rooms[room].history.push(drawData);
    rooms[room].redoStack = []; // Clear redo stack on new draw

    socket.to(room).emit("draw", drawData);
    console.log(`Draw event in room: ${room} by ${socket.id}`);
  });

  /**
   * Handles undo action.
   * @event undo
   * @param {string} room - The room code.
   */
  socket.on("undo", (room) => {
    if (!rooms[room]?.history.length) return;

    const lastAction = rooms[room].history.pop();
    rooms[room].redoStack.push(lastAction);

    io.to(room).emit("loadHistory", {
      history: rooms[room].history,
      redoStack: rooms[room].redoStack,
    });

    console.log(`Undo in room: ${room} by ${socket.id}`);
  });

  /**
   * Handles redo action.
   * @event redo
   * @param {string} room - The room code.
   */
  socket.on("redo", (room) => {
    if (!rooms[room]?.redoStack.length) return;

    const redoAction = rooms[room].redoStack.pop();
    rooms[room].history.push(redoAction);

    io.to(room).emit("loadHistory", {
      history: rooms[room].history,
      redoStack: rooms[room].redoStack,
    });

    console.log(`Redo in room: ${room} by ${socket.id}`);
  });

  /**
   * Handles clearing all drawing history and redo stack for a room.
   * @event clear
   * @param {string} room - The room code.
   */
  socket.on("clear", (room) => {
    if (!rooms[room]) return;

    rooms[room].history = [];
    rooms[room].redoStack = [];

    io.to(room).emit("loadHistory", {
      history: [],
      redoStack: [],
    });

    console.log(`Clear history in room: ${room} by ${socket.id}`);
  });

  /**
   * Handles user disconnection.
   * @event disconnect
   */
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

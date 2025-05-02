// server.js
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', socket => {
  console.log('Usuari connectat');

  socket.on('joinRoom', ({ username, room }) => {
    socket.username = username;
    socket.room = room;
    socket.join(room);

    // Confirmació al client perquè s'activi "joined"
    socket.emit('joined', room);

    // Notificar als altres usuaris
    socket.to(room).emit('chatMessage', {
      user: 'Sistema',
      text: `${username} s'ha unit a la sala ${room}`,
    });

    // Missatge de benvinguda
    socket.emit('chatMessage', {
      user: 'Sistema',
      text: `Benvingut a la sala ${room}`,
    });
  });

  socket.on('chatMessage', msg => {
    if (socket.room && socket.username) {
      io.to(socket.room).emit('chatMessage', {
        user: socket.username,
        text: msg,
      });
    }
  });

  socket.on('leaveRoom', () => {
    if (socket.room) {
      socket.leave(socket.room);
      socket.to(socket.room).emit('chatMessage', {
        user: 'Sistema',
        text: `${socket.username} ha sortit de la sala`,
      });
      socket.room = null;
    }
  });

  socket.on('disconnect', () => {
    if (socket.room) {
      socket.to(socket.room).emit('chatMessage', {
        user: 'Sistema',
        text: `${socket.username} ha sortit de la sala`,
      });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Escoltant al port ${PORT}`));

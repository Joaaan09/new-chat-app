const express = require("express")
const http = require("http")
const path = require("path")
const { Server } = require("socket.io")
const fs = require("fs")

const app = express()
const server = http.createServer(app)
const io = new Server(server)

app.use(express.static(path.join(__dirname, "public")))
app.use(express.json())

// Base de datos simple usando archivos JSON
const DB_PATH = path.join(__dirname, "db.json")

// Inicializar la base de datos si no existe
if (!fs.existsSync(DB_PATH)) {
  const initialData = {
    users: [],
    channels: [
      {
        id: "general",
        name: "General",
        createdBy: "sistema",
        admins: ["sistema"],
        isPublic: true,
        messages: [
          {
            id: "msg1",
            user: "Sistema",
            text: "¡Bienvenido al canal general!",
            timestamp: new Date().toISOString(),
          },
        ],
      },
    ],
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2))
}

// Funciones para manejar la base de datos
function readDB() {
  const data = fs.readFileSync(DB_PATH, "utf8")
  return JSON.parse(data)
}

// También necesitamos actualizar la estructura de los canales existentes
// Añadir después de la función readDB() (alrededor de la línea 30):

// Migrar canales antiguos para añadir admins y reactions si no existen
function migrateChannels() {
  const db = readDB()
  let needsUpdate = false

  db.channels.forEach((channel, index) => {
    if (!channel.admins) {
      db.channels[index].admins = [channel.createdBy]
      needsUpdate = true
    }

    // Asegurarse de que cada mensaje tenga un ID y un objeto de reacciones
    if (channel.messages) {
      channel.messages.forEach((msg, msgIndex) => {
        if (!msg.id) {
          db.channels[index].messages[msgIndex].id = `legacy-${Date.now()}-${msgIndex}`
          needsUpdate = true
        }
        if (!msg.reactions) {
          db.channels[index].messages[msgIndex].reactions = {}
          needsUpdate = true
        }
      })
    }
  })

  if (needsUpdate) {
    writeDB(db)
    console.log("Base de datos migrada: se añadieron administradores y reacciones a canales antiguos")
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
}

// Rutas API
app.post("/api/register", (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: "Se requieren nombre de usuario y contraseña" })
  }

  const db = readDB()

  // Verificar si el usuario ya existe
  if (db.users.some((user) => user.username === username)) {
    return res.status(400).json({ error: "El nombre de usuario ya está en uso" })
  }

  // Crear nuevo usuario (en una aplicación real, deberías hashear la contraseña)
  db.users.push({
    username,
    password, // En producción: usar bcrypt para hashear la contraseña
    channels: ["general"],
    createdAt: new Date().toISOString(),
  })

  writeDB(db)

  res.status(201).json({ success: true, username })
})

app.post("/api/login", (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: "Se requieren nombre de usuario y contraseña" })
  }

  const db = readDB()
  const user = db.users.find((u) => u.username === username && u.password === password)

  if (!user) {
    return res.status(401).json({ error: "Credenciales incorrectas" })
  }

  res.json({
    success: true,
    username: user.username,
    channels: user.channels,
  })
})

app.get("/api/channels", (req, res) => {
  const db = readDB()
  // Solo enviar información básica de los canales, no los mensajes
  const channels = db.channels.map((channel) => ({
    id: channel.id,
    name: channel.name,
    createdBy: channel.createdBy,
    admins: channel.admins || [channel.createdBy],
    isPublic: channel.isPublic !== false,
  }))

  res.json(channels)
})

app.post("/api/channels", (req, res) => {
  const { name, username } = req.body

  if (!name || !username) {
    return res.status(400).json({ error: "Se requieren nombre del canal y usuario" })
  }

  const db = readDB()

  // Verificar si el usuario existe y no es invitado
  const user = db.users.find((u) => u.username === username)
  if (!user) {
    return res.status(403).json({ error: "No autorizado para crear canales" })
  }

  // Crear ID único para el canal
  const channelId = name.toLowerCase().replace(/\s+/g, "-")

  // Verificar si el canal ya existe
  if (db.channels.some((channel) => channel.id === channelId)) {
    return res.status(400).json({ error: "Ya existe un canal con ese nombre" })
  }

  // Crear nuevo canal
  const newChannel = {
    id: channelId,
    name,
    createdBy: username,
    admins: [username], // El creador es automáticamente administrador
    isPublic: true,
    messages: [
      {
        id: Date.now().toString(),
        user: "Sistema",
        text: `Canal "${name}" creado por ${username}`,
        timestamp: new Date().toISOString(),
      },
    ],
  }

  db.channels.push(newChannel)

  // Añadir canal a la lista de canales del usuario
  const userIndex = db.users.findIndex((u) => u.username === username)
  db.users[userIndex].channels.push(channelId)

  writeDB(db)

  res.status(201).json({
    success: true,
    channel: {
      id: newChannel.id,
      name: newChannel.name,
      createdBy: newChannel.createdBy,
      admins: newChannel.admins,
      isPublic: newChannel.isPublic,
    },
  })
})

// Nuevas rutas para administración de canales

// Añadir administrador
app.post("/api/channels/:channelId/admins", (req, res) => {
  const { channelId } = req.params
  const { username, newAdmin } = req.body

  if (!username || !newAdmin) {
    return res.status(400).json({ error: "Faltan datos requeridos" })
  }

  const db = readDB()

  // Verificar si el canal existe
  const channelIndex = db.channels.findIndex((c) => c.id === channelId)
  if (channelIndex === -1) {
    return res.status(404).json({ error: "Canal no encontrado" })
  }

  const channel = db.channels[channelIndex]

  // Verificar si el usuario es administrador
  if (!channel.admins.includes(username)) {
    return res.status(403).json({ error: "No tienes permisos de administrador" })
  }

  // Verificar si el usuario a promover existe
  const userExists = db.users.some((u) => u.username === newAdmin)
  if (!userExists) {
    return res.status(404).json({ error: "Usuario no encontrado" })
  }

  // Añadir como administrador si no lo es ya
  if (!channel.admins.includes(newAdmin)) {
    channel.admins.push(newAdmin)
    db.channels[channelIndex] = channel
    writeDB(db)
  }

  res.json({
    success: true,
    admins: channel.admins,
  })
})

// Eliminar administrador
app.delete("/api/channels/:channelId/admins/:adminUsername", (req, res) => {
  const { channelId, adminUsername } = req.params
  const { username } = req.body

  if (!username) {
    return res.status(400).json({ error: "Faltan datos requeridos" })
  }

  const db = readDB()

  // Verificar si el canal existe
  const channelIndex = db.channels.findIndex((c) => c.id === channelId)
  if (channelIndex === -1) {
    return res.status(404).json({ error: "Canal no encontrado" })
  }

  const channel = db.channels[channelIndex]

  // Verificar si el usuario es administrador
  if (!channel.admins.includes(username)) {
    return res.status(403).json({ error: "No tienes permisos de administrador" })
  }

  // No permitir eliminar al creador del canal
  if (adminUsername === channel.createdBy) {
    return res.status(403).json({ error: "No se puede eliminar al creador del canal como administrador" })
  }

  // Eliminar administrador
  const adminIndex = channel.admins.indexOf(adminUsername)
  if (adminIndex !== -1) {
    channel.admins.splice(adminIndex, 1)
    db.channels[channelIndex] = channel
    writeDB(db)
  }

  res.json({
    success: true,
    admins: channel.admins,
  })
})

// Borrar mensaje
app.delete("/api/channels/:channelId/messages/:messageId", (req, res) => {
  const { channelId, messageId } = req.params
  const { username } = req.body

  if (!username) {
    return res.status(400).json({ error: "Faltan datos requeridos" })
  }

  const db = readDB()

  // Verificar si el canal existe
  const channelIndex = db.channels.findIndex((c) => c.id === channelId)
  if (channelIndex === -1) {
    return res.status(404).json({ error: "Canal no encontrado" })
  }

  const channel = db.channels[channelIndex]

  // Verificar si el usuario es administrador
  if (!channel.admins.includes(username)) {
    return res.status(403).json({ error: "No tienes permisos de administrador" })
  }

  // Buscar y eliminar el mensaje
  const messageIndex = channel.messages.findIndex((m) => m.id === messageId)
  if (messageIndex !== -1) {
    channel.messages.splice(messageIndex, 1)
    db.channels[channelIndex] = channel
    writeDB(db)
  }

  res.json({
    success: true,
  })
})

// Add this new route after the "Borrar mensaje" route (around line 250):

// Añadir o quitar reacción a un mensaje
app.post("/api/channels/:channelId/messages/:messageId/reactions", (req, res) => {
  const { channelId, messageId } = req.params
  const { username, emoji } = req.body

  if (!username || !emoji) {
    return res.status(400).json({ error: "Faltan datos requeridos" })
  }

  const db = readDB()

  // Verificar si el canal existe
  const channelIndex = db.channels.findIndex((c) => c.id === channelId)
  if (channelIndex === -1) {
    return res.status(404).json({ error: "Canal no encontrado" })
  }

  const channel = db.channels[channelIndex]

  // Buscar el mensaje
  const messageIndex = channel.messages.findIndex((m) => m.id === messageId)
  if (messageIndex === -1) {
    return res.status(404).json({ error: "Mensaje no encontrado" })
  }

  // Inicializar el objeto de reacciones si no existe
  if (!channel.messages[messageIndex].reactions) {
    channel.messages[messageIndex].reactions = {}
  }

  // Inicializar el array de usuarios para este emoji si no existe
  if (!channel.messages[messageIndex].reactions[emoji]) {
    channel.messages[messageIndex].reactions[emoji] = []
  }

  // Verificar si el usuario ya reaccionó con este emoji
  const userIndex = channel.messages[messageIndex].reactions[emoji].indexOf(username)

  if (userIndex === -1) {
    // Añadir reacción
    channel.messages[messageIndex].reactions[emoji].push(username)
  } else {
    // Quitar reacción
    channel.messages[messageIndex].reactions[emoji].splice(userIndex, 1)

    // Eliminar el emoji si no hay reacciones
    if (channel.messages[messageIndex].reactions[emoji].length === 0) {
      delete channel.messages[messageIndex].reactions[emoji]
    }
  }

  db.channels[channelIndex] = channel
  writeDB(db)

  res.json({
    success: true,
    reactions: channel.messages[messageIndex].reactions,
  })
})

// Cambiar nombre del canal
app.put("/api/channels/:channelId/name", (req, res) => {
  const { channelId } = req.params
  const { username, newName } = req.body

  if (!username || !newName) {
    return res.status(400).json({ error: "Faltan datos requeridos" })
  }

  const db = readDB()

  // Verificar si el canal existe
  const channelIndex = db.channels.findIndex((c) => c.id === channelId)
  if (channelIndex === -1) {
    return res.status(404).json({ error: "Canal no encontrado" })
  }

  const channel = db.channels[channelIndex]

  // Verificar si el usuario es administrador
  if (!channel.admins.includes(username)) {
    return res.status(403).json({ error: "No tienes permisos de administrador" })
  }

  // Cambiar nombre del canal
  channel.name = newName

  // Añadir mensaje de sistema
  channel.messages.push({
    id: Date.now().toString(),
    user: "Sistema",
    text: `El canal ha sido renombrado a "${newName}" por ${username}`,
    timestamp: new Date().toISOString(),
  })

  db.channels[channelIndex] = channel
  writeDB(db)

  res.json({
    success: true,
    name: newName,
  })
})

// Expulsar usuario del canal
app.post("/api/channels/:channelId/kick", (req, res) => {
  const { channelId } = req.params
  const { username, userToKick } = req.body

  if (!username || !userToKick) {
    return res.status(400).json({ error: "Faltan datos requeridos" })
  }

  const db = readDB()

  // Verificar si el canal existe
  const channelIndex = db.channels.findIndex((c) => c.id === channelId)
  if (channelIndex === -1) {
    return res.status(404).json({ error: "Canal no encontrado" })
  }

  const channel = db.channels[channelIndex]

  // Verificar si el usuario es administrador
  if (!channel.admins.includes(username)) {
    return res.status(403).json({ error: "No tienes permisos de administrador" })
  }

  // No permitir expulsar a un administrador (excepto si eres el creador)
  if (channel.admins.includes(userToKick) && username !== channel.createdBy) {
    return res.status(403).json({ error: "No puedes expulsar a un administrador" })
  }

  // Añadir mensaje de sistema
  channel.messages.push({
    id: Date.now().toString(),
    user: "Sistema",
    text: `${userToKick} ha sido expulsado del canal por ${username}`,
    timestamp: new Date().toISOString(),
  })

  db.channels[channelIndex] = channel
  writeDB(db)

  res.json({
    success: true,
    kicked: userToKick,
  })
})

// Socket.IO
io.on("connection", (socket) => {
  console.log("Usuario conectado")

  // Unirse a un canal
  socket.on("joinRoom", ({ username, room, isGuest }) => {
    socket.username = username
    socket.room = room
    socket.isGuest = isGuest
    socket.join(room)

    // Confirmación al cliente
    socket.emit("joined", room)

    // Verificar si el usuario es administrador
    const db = readDB()
    const channel = db.channels.find((c) => c.id === room)
    if (channel) {
      const admins = channel.admins || [channel.createdBy]
      const isAdmin = admins.includes(username)
      socket.emit("adminStatus", { isAdminStatus: isAdmin, admins, creator: channel.createdBy })

      // Cargar historial de mensajes para usuarios registrados
      if (!isGuest) {
        socket.emit("messageHistory", channel.messages)
      }
    }

    // Notificar a otros usuarios
    socket.to(room).emit("chatMessage", {
      id: Date.now().toString(),
      user: "Sistema",
      text: `${username} se ha unido al canal`,
      timestamp: new Date().toISOString(),
    })

    // Mensaje de bienvenida
    socket.emit("chatMessage", {
      id: Date.now().toString(),
      user: "Sistema",
      text: `Bienvenido al canal ${room}`,
      timestamp: new Date().toISOString(),
    })

    // Actualizar la lista de usuarios para todos en la sala
    io.to(room).emit("updateUsersList")
  })

  // Añadir después del evento "joinRoom" (alrededor de la línea 430):

  // Obtener usuarios en una sala
  socket.on("getUsersInRoom", (room) => {
    if (!room) return

    // Obtener todos los sockets en la sala
    const socketsInRoom = io.sockets.adapter.rooms.get(room)
    if (!socketsInRoom) return

    const users = []
    const db = readDB()
    const channel = db.channels.find((c) => c.id === room)
    const admins = channel ? channel.admins || [channel.createdBy] : []

    // Recopilar información de cada usuario
    for (const socketId of socketsInRoom) {
      const clientSocket = io.sockets.sockets.get(socketId)
      if (clientSocket && clientSocket.username) {
        users.push({
          username: clientSocket.username,
          isAdmin: admins.includes(clientSocket.username),
          isGuest: clientSocket.isGuest,
        })
      }
    }

    // Enviar la lista al cliente que la solicitó
    socket.emit("usersInRoom", users)
  })

  // Mensaje de chat
  socket.on("chatMessage", (msg) => {
    if (socket.room && socket.username) {
      const messageObj = {
        id: Date.now().toString(),
        user: socket.username,
        text: msg,
        timestamp: new Date().toISOString(),
        reactions: {}, // Inicializar objeto de reacciones vacío
      }

      // Enviar mensaje a todos en la sala
      io.to(socket.room).emit("chatMessage", messageObj)

      // Guardar mensaje en la base de datos (excepto para invitados)
      if (!socket.isGuest) {
        const db = readDB()
        const channelIndex = db.channels.findIndex((c) => c.id === socket.room)
        if (channelIndex !== -1) {
          db.channels[channelIndex].messages.push(messageObj)
          writeDB(db)
        }
      }
    }
  })

  // Borrar mensaje (solo administradores)
  socket.on("deleteMessage", ({ messageId }) => {
    if (!socket.room || !socket.username) return

    const db = readDB()
    const channelIndex = db.channels.findIndex((c) => c.id === socket.room)

    if (channelIndex === -1) return

    const channel = db.channels[channelIndex]

    // Verificar si el usuario es administrador
    if (!channel.admins.includes(socket.username)) return

    // Buscar y eliminar el mensaje
    const messageIndex = channel.messages.findIndex((m) => m.id === messageId)
    if (messageIndex !== -1) {
      const deletedMessage = channel.messages[messageIndex]
      channel.messages.splice(messageIndex, 1)
      db.channels[channelIndex] = channel
      writeDB(db)

      // Notificar a todos los usuarios en el canal
      io.to(socket.room).emit("messageDeleted", {
        messageId,
        systemMessage: {
          id: Date.now().toString(),
          user: "Sistema",
          text: `Un mensaje de ${deletedMessage.user} ha sido eliminado por ${socket.username}`,
          timestamp: new Date().toISOString(),
        },
      })
    }
  })

  // Add this new socket event after the "deleteMessage" event (around line 500):

  // Reaccionar a un mensaje
  socket.on("toggleReaction", ({ messageId, emoji }) => {
    if (!socket.room || !socket.username) return

    const db = readDB()
    const channelIndex = db.channels.findIndex((c) => c.id === socket.room)

    if (channelIndex === -1) return

    const channel = db.channels[channelIndex]

    // Buscar el mensaje
    const messageIndex = channel.messages.findIndex((m) => m.id === messageId)
    if (messageIndex === -1) return

    // Inicializar el objeto de reacciones si no existe
    if (!channel.messages[messageIndex].reactions) {
      channel.messages[messageIndex].reactions = {}
    }

    // Inicializar el array de usuarios para este emoji si no existe
    if (!channel.messages[messageIndex].reactions[emoji]) {
      channel.messages[messageIndex].reactions[emoji] = []
    }

    // Verificar si el usuario ya reaccionó con este emoji
    const userIndex = channel.messages[messageIndex].reactions[emoji].indexOf(socket.username)

    if (userIndex === -1) {
      // Añadir reacción
      channel.messages[messageIndex].reactions[emoji].push(socket.username)
    } else {
      // Quitar reacción
      channel.messages[messageIndex].reactions[emoji].splice(userIndex, 1)

      // Eliminar el emoji si no hay reacciones
      if (channel.messages[messageIndex].reactions[emoji].length === 0) {
        delete channel.messages[messageIndex].reactions[emoji]
      }
    }

    db.channels[channelIndex] = channel
    writeDB(db)

    // Notificar a todos los usuarios en el canal
    io.to(socket.room).emit("messageReaction", {
      messageId,
      reactions: channel.messages[messageIndex].reactions,
    })
  })

  // Añadir administrador
  socket.on("addAdmin", ({ newAdmin }) => {
    if (!socket.room || !socket.username) return

    const db = readDB()
    const channelIndex = db.channels.findIndex((c) => c.id === socket.room)

    if (channelIndex === -1) return

    const channel = db.channels[channelIndex]

    // Verificar si el usuario es administrador
    if (!channel.admins.includes(socket.username)) return

    // Verificar si el usuario a promover existe
    const userExists = db.users.some((u) => u.username === newAdmin)
    if (!userExists) return

    // Añadir como administrador si no lo es ya
    if (!channel.admins.includes(newAdmin)) {
      channel.admins.push(newAdmin)

      // Añadir mensaje de sistema
      const systemMessage = {
        id: Date.now().toString(),
        user: "Sistema",
        text: `${newAdmin} ha sido promovido a administrador por ${socket.username}`,
        timestamp: new Date().toISOString(),
      }

      channel.messages.push(systemMessage)
      db.channels[channelIndex] = channel
      writeDB(db)

      // Notificar a todos los usuarios en el canal
      io.to(socket.room).emit("adminAdded", {
        admin: newAdmin,
        admins: channel.admins,
        systemMessage,
      })
    }
  })

  // Expulsar usuario
  socket.on("kickUser", ({ userToKick }) => {
    if (!socket.room || !socket.username) return

    const db = readDB()
    const channelIndex = db.channels.findIndex((c) => c.id === socket.room)

    if (channelIndex === -1) return

    const channel = db.channels[channelIndex]

    // Verificar si el usuario es administrador
    if (!channel.admins.includes(socket.username)) return

    // No permitir expulsar a un administrador (excepto si eres el creador)
    if (channel.admins.includes(userToKick) && socket.username !== channel.createdBy) return

    // Añadir mensaje de sistema
    const systemMessage = {
      id: Date.now().toString(),
      user: "Sistema",
      text: `${userToKick} ha sido expulsado del canal por ${socket.username}`,
      timestamp: new Date().toISOString(),
    }

    channel.messages.push(systemMessage)
    db.channels[channelIndex] = channel
    writeDB(db)

    // Notificar a todos los usuarios en el canal
    io.to(socket.room).emit("userKicked", {
      user: userToKick,
      systemMessage,
    })

    // Buscar el socket del usuario expulsado y desconectarlo del canal
    const socketsInRoom = io.sockets.adapter.rooms.get(socket.room)
    if (socketsInRoom) {
      for (const socketId of socketsInRoom) {
        const clientSocket = io.sockets.sockets.get(socketId)
        if (clientSocket && clientSocket.username === userToKick) {
          clientSocket.leave(socket.room)
          clientSocket.emit("youWereKicked", {
            room: socket.room,
            by: socket.username,
          })
        }
      }
    }
  })

  // Cambiar nombre del canal
  socket.on("changeChannelName", ({ newName }) => {
    if (!socket.room || !socket.username) return

    const db = readDB()
    const channelIndex = db.channels.findIndex((c) => c.id === socket.room)

    if (channelIndex === -1) return

    const channel = db.channels[channelIndex]

    // Verificar si el usuario es administrador
    if (!channel.admins.includes(socket.username)) return

    // Cambiar nombre del canal
    const oldName = channel.name
    channel.name = newName

    // Añadir mensaje de sistema
    const systemMessage = {
      id: Date.now().toString(),
      user: "Sistema",
      text: `El canal ha sido renombrado de "${oldName}" a "${newName}" por ${socket.username}`,
      timestamp: new Date().toISOString(),
    }

    channel.messages.push(systemMessage)
    db.channels[channelIndex] = channel
    writeDB(db)

    // Notificar a todos los usuarios en el canal
    io.to(socket.room).emit("channelNameChanged", {
      newName,
      systemMessage,
    })
  })

  // Salir de un canal
  socket.on("leaveRoom", () => {
    if (socket.room) {
      socket.to(socket.room).emit("chatMessage", {
        id: Date.now().toString(),
        user: "Sistema",
        text: `${socket.username} ha salido del canal`,
        timestamp: new Date().toISOString(),
      })
      socket.leave(socket.room)
      socket.room = null
    }
  })

  // Desconexión
  socket.on("disconnect", () => {
    if (socket.room) {
      socket.to(socket.room).emit("chatMessage", {
        id: Date.now().toString(),
        user: "Sistema",
        text: `${socket.username} ha salido del canal`,
        timestamp: new Date().toISOString(),
      })
    }
  })
})

// Llamar a la función de migración al iniciar el servidor
migrateChannels()

const PORT = process.env.PORT || 3000
server.listen(PORT, () => console.log(`Escuchando en el puerto ${PORT}`))

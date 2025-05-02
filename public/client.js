// Conexión Socket.io
const socket = io()

// Variables globales
let currentUser = null
let isGuest = true
let userChannels = []
let isAdmin = false
let channelAdmins = []
let currentChannelId = null
let channelCreator = null // Added channelCreator variable

// Elementos DOM - Autenticación
const authScreen = document.getElementById("auth-screen")
const authTabs = document.querySelectorAll(".auth-tab")
const loginForm = document.getElementById("login-form")
const registerForm = document.getElementById("register-form")
const guestForm = document.getElementById("guest-form")
const loginError = document.getElementById("login-error")
const registerError = document.getElementById("register-error")
const registerSuccess = document.getElementById("register-success")

// Elementos DOM - Canales
const channelScreen = document.getElementById("channel-screen")
const welcomeMessage = document.getElementById("welcome-message")
const logoutBtn = document.getElementById("logout-btn")
const channelsList = document.getElementById("channels-list")
const createChannelContainer = document.getElementById("create-channel-container")
const createChannelForm = document.getElementById("create-channel-form")
const newChannelName = document.getElementById("new-channel-name")

// Elementos DOM - Chat
const chatBox = document.getElementById("chat-box")
const roomName = document.getElementById("room-name")
const leaveBtn = document.getElementById("leave-btn")
const form = document.getElementById("form")
const input = document.getElementById("input")
const messages = document.getElementById("messages")
const adminControls = document.getElementById("admin-controls")
const adminActions = document.getElementById("admin-actions")
const channelSettings = document.getElementById("channel-settings")
const usersList = document.getElementById("users-list")

// Emojis disponibles para reacciones
const AVAILABLE_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡"]

// Comprobar si hay una sesión guardada
function checkSession() {
  const savedUser = localStorage.getItem("chatUser")
  if (savedUser) {
    try {
      const userData = JSON.parse(savedUser)
      currentUser = userData.username
      isGuest = false
      userChannels = userData.channels || []
      showChannelScreen()
    } catch (error) {
      console.error("Error al cargar la sesión:", error)
      localStorage.removeItem("chatUser")
    }
  }
}

// Cambiar entre pestañas de autenticación
authTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    // Quitar clase activa de todas las pestañas
    authTabs.forEach((t) => t.classList.remove("active"))

    // Añadir clase activa a la pestaña seleccionada
    tab.classList.add("active")

    // Ocultar todos los formularios
    loginForm.style.display = "none"
    registerForm.style.display = "none"
    guestForm.style.display = "none"

    // Mostrar el formulario correspondiente
    const tabName = tab.getAttribute("data-tab")
    if (tabName === "login") {
      loginForm.style.display = "flex"
    } else if (tabName === "register") {
      registerForm.style.display = "flex"
    } else if (tabName === "guest") {
      guestForm.style.display = "flex"
    }
  })
})

// Iniciar sesión
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault()

  const username = document.getElementById("login-username").value.trim()
  const password = document.getElementById("login-password").value

  if (!username || !password) return

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    })

    const data = await response.json()

    if (!response.ok) {
      loginError.textContent = data.error || "Error al iniciar sesión"
      return
    }

    // Guardar sesión
    currentUser = data.username
    isGuest = false
    userChannels = data.channels || []

    localStorage.setItem(
      "chatUser",
      JSON.stringify({
        username: currentUser,
        channels: userChannels,
      }),
    )

    // Mostrar pantalla de canales
    showChannelScreen()

    // Limpiar formulario
    loginForm.reset()
    loginError.textContent = ""
  } catch (error) {
    console.error("Error:", error)
    loginError.textContent = "Error de conexión"
  }
})

// Registrarse
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault()

  const username = document.getElementById("register-username").value.trim()
  const password = document.getElementById("register-password").value
  const confirm = document.getElementById("register-confirm").value

  if (!username || !password) return

  if (password !== confirm) {
    registerError.textContent = "Las contraseñas no coinciden"
    return
  }

  try {
    const response = await fetch("/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    })

    const data = await response.json()

    if (!response.ok) {
      registerError.textContent = data.error || "Error al registrarse"
      registerSuccess.textContent = ""
      return
    }

    // Mostrar mensaje de éxito
    registerSuccess.textContent = "¡Registro exitoso! Ahora puedes iniciar sesión."
    registerError.textContent = ""

    // Limpiar formulario
    registerForm.reset()

    // Cambiar a la pestaña de inicio de sesión después de 2 segundos
    setTimeout(() => {
      document.querySelector('.auth-tab[data-tab="login"]').click()
      registerSuccess.textContent = ""
    }, 2000)
  } catch (error) {
    console.error("Error:", error)
    registerError.textContent = "Error de conexión"
    registerSuccess.textContent = ""
  }
})

// Entrar como invitado
guestForm.addEventListener("submit", (e) => {
  e.preventDefault()

  const username = document.getElementById("guest-username").value.trim()

  if (!username) return

  // Configurar como invitado
  currentUser = username
  isGuest = true

  // Mostrar pantalla de canales
  showChannelScreen()

  // Limpiar formulario
  guestForm.reset()
})

// Cerrar sesión
logoutBtn.addEventListener("click", () => {
  // Eliminar sesión
  localStorage.removeItem("chatUser")
  currentUser = null
  isGuest = true
  userChannels = []

  // Volver a la pantalla de autenticación
  authScreen.style.display = "block"
  channelScreen.style.display = "none"
  chatBox.style.display = "none"

  // Resetear a la pestaña de inicio de sesión
  document.querySelector('.auth-tab[data-tab="login"]').click()
})

// Mostrar pantalla de canales
async function showChannelScreen() {
  // Ocultar pantalla de autenticación y chat
  authScreen.style.display = "none"
  chatBox.style.display = "none"

  // Mostrar pantalla de canales
  channelScreen.style.display = "block"

  // Actualizar mensaje de bienvenida
  welcomeMessage.textContent = `Bienvenido, ${currentUser}`

  // Mostrar/ocultar creación de canales según tipo de usuario
  if (isGuest) {
    createChannelContainer.style.display = "none"
  } else {
    createChannelContainer.style.display = "block"
  }

  // Cargar lista de canales
  await loadChannels()
}

// Cargar canales disponibles
async function loadChannels() {
  try {
    const response = await fetch("/api/channels")
    const channels = await response.json()

    // Limpiar lista
    channelsList.innerHTML = ""

    // Añadir canales a la lista
    channels.forEach((channel) => {
      const li = document.createElement("li")

      const channelInfo = document.createElement("div")
      channelInfo.innerHTML = `
        <span class="channel-name">${channel.name}</span>
        <span class="channel-creator">Creado por: ${channel.createdBy}</span>
        ${channel.admins.includes(currentUser) ? '<span class="admin-badge">Admin</span>' : ""}
      `

      li.appendChild(channelInfo)
      li.addEventListener("click", () => joinChannel(channel.id))

      channelsList.appendChild(li)
    })
  } catch (error) {
    console.error("Error al cargar canales:", error)
  }
}

// Crear nuevo canal
createChannelForm.addEventListener("submit", async (e) => {
  e.preventDefault()

  const name = newChannelName.value.trim()

  if (!name || isGuest) return

  try {
    const response = await fetch("/api/channels", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, username: currentUser }),
    })

    const data = await response.json()

    if (!response.ok) {
      alert(data.error || "Error al crear el canal")
      return
    }

    // Añadir canal a la lista de canales del usuario
    userChannels.push(data.channel.id)

    // Actualizar sesión guardada
    if (!isGuest) {
      localStorage.setItem(
        "chatUser",
        JSON.stringify({
          username: currentUser,
          channels: userChannels,
        }),
      )
    }

    // Recargar lista de canales
    await loadChannels()

    // Limpiar formulario
    newChannelName.value = ""
  } catch (error) {
    console.error("Error:", error)
    alert("Error de conexión")
  }
})

// Unirse a un canal
function joinChannel(channelId) {
  currentChannelId = channelId

  // Enviar evento para unirse a la sala
  socket.emit("joinRoom", {
    username: currentUser,
    room: channelId,
    isGuest: isGuest,
  })

  // Ocultar pantalla de canales y mostrar el chat
  channelScreen.style.display = "none"
  chatBox.style.display = "block"
}

// Evento cuando se une a un canal
socket.on("joined", (room) => {
  roomName.textContent = `Canal: ${room}`

  // Actualizar la lista de usuarios
  updateUsersList()
})

// Recibir estado de administrador
socket.on("adminStatus", ({ isAdminStatus, admins, creator }) => {
  isAdmin = isAdminStatus
  channelAdmins = admins || []
  channelCreator = creator

  // Mostrar/ocultar controles de administrador
  if (isAdmin && adminControls) {
    adminControls.style.display = "block"
    updateAdminUI()
  } else if (adminControls) {
    adminControls.style.display = "none"
  }

  // Actualizar la lista de usuarios con insignias de admin
  updateUsersList()
})

// Actualizar interfaz de administrador
function updateAdminUI() {
  if (!isAdmin || !adminActions) return

  adminActions.innerHTML = `
    <button id="manage-admins-btn" class="admin-btn">Gestionar Administradores</button>
    <button id="change-name-btn" class="admin-btn">Cambiar Nombre del Canal</button>
    <button id="kick-user-btn" class="admin-btn">Expulsar Usuario</button>
  `

  // Evento para gestionar administradores
  document.getElementById("manage-admins-btn").addEventListener("click", showAdminManager)

  // Evento para cambiar nombre del canal
  document.getElementById("change-name-btn").addEventListener("click", showChannelNameChange)

  // Evento para expulsar usuario
  document.getElementById("kick-user-btn").addEventListener("click", showKickUser)
}

// Mostrar gestor de administradores
function showAdminManager() {
  // Crear modal para gestionar administradores
  const modal = document.createElement("div")
  modal.className = "modal"
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close">&times;</span>
      <h3>Gestionar Administradores</h3>
      <div class="admin-list">
        <h4>Administradores actuales:</h4>
        <ul id="admins-list"></ul>
      </div>
      <div class="add-admin">
        <h4>Añadir administrador:</h4>
        <input type="text" id="new-admin-input" placeholder="Nombre de usuario">
        <button id="add-admin-btn">Añadir</button>
      </div>
    </div>
  `

  document.body.appendChild(modal)

  // Llenar lista de administradores
  const adminsList = document.getElementById("admins-list")
  channelAdmins.forEach((admin) => {
    const li = document.createElement("li")
    li.textContent = admin

    // No permitir eliminar al creador
    if (admin !== channelCreator) {
      const removeBtn = document.createElement("button")
      removeBtn.textContent = "Eliminar"
      removeBtn.className = "remove-admin-btn"
      removeBtn.addEventListener("click", () => removeAdmin(admin))
      li.appendChild(removeBtn)
    } else {
      const creatorBadge = document.createElement("span")
      creatorBadge.textContent = "(Creador)"
      creatorBadge.className = "creator-badge"
      li.appendChild(creatorBadge)
    }

    adminsList.appendChild(li)
  })

  // Evento para añadir administrador
  document.getElementById("add-admin-btn").addEventListener("click", () => {
    const newAdmin = document.getElementById("new-admin-input").value.trim()
    if (newAdmin) {
      addAdmin(newAdmin)
      modal.remove()
    }
  })

  // Cerrar modal
  document.querySelector(".close").addEventListener("click", () => {
    modal.remove()
  })

  // Cerrar modal al hacer clic fuera
  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.remove()
    }
  })
}

// Mostrar modal para expulsar usuario
function showKickUser() {
  // Crear modal para expulsar usuario
  const modal = document.createElement("div")
  modal.className = "modal"
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close">&times;</span>
      <h3>Expulsar Usuario</h3>
      <input type="text" id="kick-user-input" placeholder="Nombre de usuario">
      <button id="kick-user-confirm">Expulsar</button>
    </div>
  `

  document.body.appendChild(modal)

  // Evento para expulsar usuario
  document.getElementById("kick-user-confirm").addEventListener("click", () => {
    const userToKick = document.getElementById("kick-user-input").value.trim()
    if (userToKick) {
      kickUser(userToKick)
      modal.remove()
    }
  })

  // Cerrar modal
  document.querySelector(".close").addEventListener("click", () => {
    modal.remove()
  })

  // Cerrar modal al hacer clic fuera
  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.remove()
    }
  })
}

// Expulsar usuario
function kickUser(userToKick) {
  if (!isAdmin || !currentChannelId) return

  socket.emit("kickUser", { userToKick })
}

// Añadir administrador
function addAdmin(newAdmin) {
  if (!isAdmin || !currentChannelId) return

  socket.emit("addAdmin", { newAdmin })
}

// Eliminar administrador
function removeAdmin(adminToRemove) {
  if (!isAdmin || !currentChannelId) return

  fetch(`/api/channels/${currentChannelId}/admins/${adminToRemove}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username: currentUser }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        channelAdmins = data.admins
        updateAdminUI()
      }
    })
    .catch((error) => console.error("Error:", error))
}

// Mostrar cambio de nombre del canal
function showChannelNameChange() {
  // Crear modal para cambiar nombre
  const modal = document.createElement("div")
  modal.className = "modal"
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close">&times;</span>
      <h3>Cambiar Nombre del Canal</h3>
      <input type="text" id="channel-name-input" placeholder="Nuevo nombre">
      <button id="change-name-confirm">Guardar</button>
    </div>
  `

  document.body.appendChild(modal)

  // Evento para cambiar nombre
  document.getElementById("change-name-confirm").addEventListener("click", () => {
    const newName = document.getElementById("channel-name-input").value.trim()
    if (newName) {
      changeChannelName(newName)
      modal.remove()
    }
  })

  // Cerrar modal
  document.querySelector(".close").addEventListener("click", () => {
    modal.remove()
  })

  // Cerrar modal al hacer clic fuera
  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.remove()
    }
  })
}

// Cambiar nombre del canal
function changeChannelName(newName) {
  if (!isAdmin || !currentChannelId) return

  socket.emit("changeChannelName", { newName })
}

// Cargar historial de mensajes (solo para usuarios registrados)
socket.on("messageHistory", (messageHistory) => {
  // Limpiar mensajes anteriores
  messages.innerHTML = ""

  // Mostrar historial
  messageHistory.forEach((msg) => {
    displayMessage(msg)
  })

  // Scroll al último mensaje
  const chatWindow = document.getElementById("chat-window")
  chatWindow.scrollTop = chatWindow.scrollHeight
})

// Volver a la pantalla de canales
leaveBtn.addEventListener("click", () => {
  socket.emit("leaveRoom")
  currentChannelId = null
  isAdmin = false

  // Ocultar chat y mostrar pantalla de canales
  chatBox.style.display = "none"
  channelScreen.style.display = "block"

  // Limpiar mensajes
  messages.innerHTML = ""

  // Actualizar la lista de usuarios para los demás
  socket.emit("updateUsersList")
})

// Enviar mensaje
form.addEventListener("submit", (e) => {
  e.preventDefault()

  const message = input.value.trim()
  if (!message) return

  socket.emit("chatMessage", message)
  input.value = ""
  input.focus()
})

// Mostrar mensaje en el chat
socket.on("chatMessage", (msg) => {
  displayMessage(msg)

  // Scroll al último mensaje
  const chatWindow = document.getElementById("chat-window")
  chatWindow.scrollTop = chatWindow.scrollHeight
})

// Función para mostrar un mensaje - ACTUALIZADA para incluir reacciones
function displayMessage(msg) {
  const item = document.createElement("li")
  item.dataset.messageId = msg.id // Guardar ID del mensaje para poder borrarlo

  // Formatear fecha si existe
  let timeString = ""
  if (msg.timestamp) {
    const msgDate = new Date(msg.timestamp)
    timeString = msgDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  // Añadir clases según tipo de mensaje
  if (msg.user === "Sistema") {
    item.classList.add("system-message")
    item.textContent = msg.text
  } else {
    if (msg.user === currentUser) {
      item.classList.add("my-message")
    } else {
      item.classList.add("other-message")
    }

    item.innerHTML = `<strong>${msg.user}:</strong> ${msg.text}`

    // Añadir botón de eliminar para administradores
    if (isAdmin && !isGuest) {
      const deleteBtn = document.createElement("button")
      deleteBtn.className = "delete-message-btn"
      deleteBtn.innerHTML = "×"
      deleteBtn.title = "Eliminar mensaje"
      deleteBtn.addEventListener("click", () => deleteMessage(msg.id))
      item.appendChild(deleteBtn)
    }
  }

  // Añadir timestamp si existe
  if (timeString) {
    const timestamp = document.createElement("div")
    timestamp.className = "message-timestamp"
    timestamp.textContent = timeString
    item.appendChild(timestamp)
  }

  // Añadir contenedor para reacciones
  if (msg.user !== "Sistema") {
    const reactionsContainer = document.createElement("div")
    reactionsContainer.className = "reactions-container"

    // Contenedor para las reacciones existentes
    const messageReactions = document.createElement("div")
    messageReactions.className = "message-reactions"
    messageReactions.dataset.messageId = msg.id

    // Mostrar reacciones existentes si hay
    if (msg.reactions) {
      updateMessageReactions(messageReactions, msg.reactions)
    }

    reactionsContainer.appendChild(messageReactions)

    // Botón para añadir reacción
    const addReactionBtn = document.createElement("button")
    addReactionBtn.className = "add-reaction-btn"
    addReactionBtn.innerHTML = "😀"
    addReactionBtn.title = "Añadir reacción"
    addReactionBtn.addEventListener("click", (e) => {
      e.stopPropagation()
      showEmojiPicker(msg.id, addReactionBtn)
    })

    reactionsContainer.appendChild(addReactionBtn)
    item.appendChild(reactionsContainer)
  }

  messages.appendChild(item)
}

// Mostrar selector de emojis
function showEmojiPicker(messageId, buttonElement) {
  // Eliminar cualquier selector existente
  const existingPicker = document.querySelector(".emoji-picker")
  if (existingPicker) {
    existingPicker.remove()
  }

  // Crear selector de emojis
  const emojiPicker = document.createElement("div")
  emojiPicker.className = "emoji-picker"

  // Añadir opciones de emojis
  AVAILABLE_EMOJIS.forEach((emoji) => {
    const emojiOption = document.createElement("div")
    emojiOption.className = "emoji-option"
    emojiOption.textContent = emoji
    emojiOption.addEventListener("click", () => {
      toggleReaction(messageId, emoji)
      emojiPicker.remove()
    })
    emojiPicker.appendChild(emojiOption)
  })

  // Posicionar el selector
  const buttonRect = buttonElement.getBoundingClientRect()
  emojiPicker.style.left = `${buttonRect.left}px`

  // Añadir al DOM
  buttonElement.parentElement.appendChild(emojiPicker)

  // Cerrar el selector al hacer clic fuera
  document.addEventListener("click", function closeEmojiPicker(e) {
    if (!emojiPicker.contains(e.target) && e.target !== buttonElement) {
      emojiPicker.remove()
      document.removeEventListener("click", closeEmojiPicker)
    }
  })
}

// Añadir o quitar reacción
function toggleReaction(messageId, emoji) {
  if (!currentUser || !currentChannelId) return

  socket.emit("toggleReaction", { messageId, emoji })
}

// Actualizar reacciones de un mensaje
function updateMessageReactions(container, reactions) {
  // Limpiar contenedor
  container.innerHTML = ""

  // Mostrar cada emoji con su contador
  Object.entries(reactions).forEach(([emoji, users]) => {
    const reactionBtn = document.createElement("div")
    reactionBtn.className = `reaction ${users.includes(currentUser) ? "reaction-active" : ""}`
    reactionBtn.innerHTML = `
      <span class="reaction-emoji">${emoji}</span>
      <span class="reaction-count">${users.length}</span>
    `
    reactionBtn.addEventListener("click", () => toggleReaction(container.dataset.messageId, emoji))
    container.appendChild(reactionBtn)
  })
}

// Eliminar mensaje
function deleteMessage(messageId) {
  if (!isAdmin || !currentChannelId) return

  socket.emit("deleteMessage", { messageId })
}

// Mensaje eliminado
socket.on("messageDeleted", ({ messageId, systemMessage }) => {
  // Eliminar mensaje de la interfaz
  const messageElement = document.querySelector(`li[data-message-id="${messageId}"]`)
  if (messageElement) {
    messageElement.remove()
  }

  // Mostrar mensaje del sistema
  displayMessage(systemMessage)
})

// Administrador añadido
socket.on("adminAdded", ({ admin, admins, systemMessage }) => {
  channelAdmins = admins

  // Mostrar mensaje del sistema
  displayMessage(systemMessage)

  // Actualizar UI si es necesario
  if (admin === currentUser) {
    isAdmin = true
    updateAdminUI()
  }
})

// Nombre del canal cambiado
socket.on("channelNameChanged", ({ newName, systemMessage }) => {
  // Actualizar nombre en la interfaz
  roomName.textContent = `Canal: ${newName}`

  // Mostrar mensaje del sistema
  displayMessage(systemMessage)
})

// Usuario expulsado
socket.on("userKicked", ({ user, systemMessage }) => {
  // Mostrar mensaje del sistema
  displayMessage(systemMessage)

  // Si el usuario actual es expulsado
  if (user === currentUser) {
    // Volver a la pantalla de canales
    leaveBtn.click()
  }
})

// Has sido expulsado
socket.on("youWereKicked", ({ room, by }) => {
  alert(`Has sido expulsado del canal por ${by}`)

  // Volver a la pantalla de canales
  leaveBtn.click()
})

// Actualizar lista de usuarios cuando se solicita
socket.on("updateUsersList", () => {
  updateUsersList()
})

// Función para actualizar la lista de usuarios
socket.on("messageReaction", ({ messageId, reactions }) => {
  const reactionContainer = document.querySelector(`.message-reactions[data-message-id="${messageId}"]`)
  if (reactionContainer) {
    updateMessageReactions(reactionContainer, reactions)
  }
})

function updateUsersList() {
  if (!currentChannelId || !usersList) return

  // Obtener la lista de usuarios del servidor
  socket.emit("getUsersInRoom", currentChannelId)
}

// Recibir la lista de usuarios
socket.on("usersInRoom", (users) => {
  // Verificar que el elemento usersList existe
  if (!usersList) return

  // Limpiar la lista de usuarios
  usersList.innerHTML = ""

  // Agregar cada usuario a la lista
  users.forEach((user) => {
    const li = document.createElement("li")
    li.textContent = user.username

    // Verificar si el usuario es administrador
    if (user.isAdmin) {
      const adminBadge = document.createElement("span")
      adminBadge.textContent = "Admin"
      adminBadge.className = "admin-badge"
      li.appendChild(adminBadge)
    }

    // Verificar si el usuario es invitado
    if (user.isGuest) {
      const guestBadge = document.createElement("span")
      guestBadge.textContent = "Invitado"
      guestBadge.className = "guest-badge"
      li.appendChild(guestBadge)
    }

    usersList.appendChild(li)
  })
})

// Comprobar sesión al cargar la página
document.addEventListener("DOMContentLoaded", () => {
  checkSession()
})

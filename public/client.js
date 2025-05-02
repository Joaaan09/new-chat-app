const socket = io()

const joinForm = document.getElementById("join-form")
const usernameInput = document.getElementById("username")
const roomInput = document.getElementById("room")
const chatBox = document.getElementById("chat-box")
const roomName = document.getElementById("room-name")
const leaveBtn = document.getElementById("leave-btn")

const form = document.getElementById("form")
const input = document.getElementById("input")
const messages = document.getElementById("messages")

let joined = false
let currentUser = ""

joinForm.addEventListener("submit", (e) => {
  e.preventDefault() // Evitar que la pàgina es rearregui
  const username = usernameInput.value.trim()
  const room = roomInput.value.trim()
  if (!username || !room) return // Comprovar que no estigui buit

  currentUser = username // Guardar el nombre de usuario actual

  // Enviar event per unir-se a la sala
  socket.emit("joinRoom", { username, room })

  // Esborrar formulari d'entrada i mostrar el xat
  joinForm.style.display = "none"
  chatBox.style.display = "block"
})

socket.on("joined", (room) => {
  joined = true
  roomName.textContent = `Sala: ${room}`
})

leaveBtn.addEventListener("click", () => {
  socket.emit("leaveRoom")
  joined = false
  roomName.textContent = ""
  joinForm.style.display = "flex"
  chatBox.style.display = "none"

  // Esborrar la llista de missatges
  messages.innerHTML = ""
})

// Enviar un missatge
form.addEventListener("submit", (e) => {
  e.preventDefault()
  if (!joined || !input.value.trim()) return

  socket.emit("chatMessage", input.value.trim())
  input.value = ""
})

// Mostrar missatges al xat
socket.on("chatMessage", (msg) => {
  const item = document.createElement("li")

  // Crear un span para el usuario
  const userSpan = document.createElement("span")
  userSpan.setAttribute("data-user", msg.user)
  userSpan.textContent = `${msg.user}: `

  // Añadir clases según si es el usuario actual o no
  if (msg.user === "Sistema") {
    item.classList.add("system-message")
  } else if (msg.user === currentUser) {
    item.classList.add("my-message")
    item.style.backgroundColor = "#dcf8c6"
    item.style.marginLeft = "auto"
  } else {
    item.classList.add("other-message")
    item.style.backgroundColor = "#e3e3e3"
    item.style.marginRight = "auto"
  }

  item.appendChild(userSpan)
  item.appendChild(document.createTextNode(msg.text))
  messages.appendChild(item)

  // Scroll al último mensaje
  const chatWindow = document.getElementById("chat-window")
  chatWindow.scrollTop = chatWindow.scrollHeight
})

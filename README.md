### Chat en Tiempo Real

## Descripción

Chat en Tiempo Real es una aplicación de mensajería instantánea que permite a los usuarios comunicarse en canales temáticos. La aplicación ofrece funcionalidades como autenticación de usuarios, creación de canales, administración de canales, reacciones con emojis y más.

## Características

### Autenticación

- **Registro de usuarios**: Crea una cuenta con nombre de usuario y contraseña
- **Inicio de sesión**: Accede con tus credenciales guardadas
- **Modo invitado**: Participa sin necesidad de registrarte


### Canales

- **Canales públicos**: Únete a conversaciones existentes
- **Creación de canales**: Los usuarios registrados pueden crear nuevos canales
- **Administración de canales**: Los creadores pueden gestionar sus canales


### Mensajería

- **Mensajes en tiempo real**: Comunicación instantánea entre usuarios
- **Historial de mensajes**: Accede al historial completo de conversaciones
- **Reacciones con emojis**: Reacciona a los mensajes con emojis
- **Eliminación de mensajes**: Los administradores pueden eliminar mensajes


### Administración

- **Gestión de administradores**: Añade o elimina administradores
- **Expulsión de usuarios**: Los administradores pueden expulsar usuarios
- **Cambio de nombre del canal**: Modifica el nombre de los canales


## Tecnologías utilizadas

- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Backend**: Node.js, Express
- **Comunicación en tiempo real**: Socket.IO
- **Almacenamiento de datos**: JSON (archivo db.json)


## Requisitos previos

- Node.js (v14 o superior)
- npm (v6 o superior)


## Instalación

1. Clona el repositorio:

```shellscript
git clone https://github.com/tu-usuario/chat-tiempo-real.git
cd chat-tiempo-real
```


2. Instala las dependencias:

```shellscript
npm install
```


3. Inicia la aplicación:

```shellscript
npm start
```


4. Abre tu navegador y accede a:

```plaintext
http://localhost:3000
```




## Estructura del proyecto

```plaintext
chat-app/
├── public/
│   ├── client.js       # Lógica del cliente
│   ├── index.html      # Estructura HTML
│   └── style.css       # Estilos CSS
├── server.js           # Servidor y lógica de backend
├── db.json             # Base de datos (se crea automáticamente)
└── package.json        # Dependencias y scripts
```

## Guía de uso

### Registro e inicio de sesión

1. Al abrir la aplicación, verás tres opciones: Iniciar Sesión, Registrarse o entrar como Invitado.
2. Para registrarte, haz clic en la pestaña "Registrarse", completa el formulario y envíalo.
3. Para iniciar sesión, introduce tus credenciales en la pestaña "Iniciar Sesión".
4. Para entrar como invitado, simplemente introduce un nombre en la pestaña "Invitado".


### Canales

1. Después de autenticarte, verás la lista de canales disponibles.
2. Haz clic en cualquier canal para unirte a la conversación.
3. Si eres un usuario registrado, puedes crear un nuevo canal usando el formulario en la parte inferior.


### Mensajería

1. Escribe tu mensaje en el campo de texto y presiona "Enviar" o la tecla Enter.
2. Para reaccionar a un mensaje, haz clic en el botón de emoji (😀) debajo del mensaje.
3. Si eres administrador, puedes eliminar mensajes haciendo clic en el botón "×" que aparece al pasar el cursor sobre un mensaje.


### Administración de canales

Si eres el creador de un canal o has sido designado como administrador:

1. Verás un botón "Opciones de Admin" en la parte superior del chat.
2. Desde allí puedes:

1. Gestionar administradores (añadir o eliminar)
2. Cambiar el nombre del canal
3. Expulsar usuarios


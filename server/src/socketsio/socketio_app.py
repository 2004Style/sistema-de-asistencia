from socketio import AsyncServer

# Crear una instancia de AsyncServer para manejar eventos de Socket.IO
#sio = AsyncServer(async_mode="asgi", cors_allowed_origins="*")
sio = AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",  # Permitir todos los orígenes
    allow_upgrades=True,       # Permitir upgrade a WebSocket
)

# Aquí puedes agregar middlewares, configuraciones o eventos globales si es necesario.
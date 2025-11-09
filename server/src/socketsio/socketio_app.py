from socketio import AsyncServer
from src.config.settings import get_settings

# Crear una instancia de AsyncServer para manejar eventos de Socket.IO
settings = get_settings()

sio = AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=settings.get_socketio_cors_origins(),  # ✅ Usar configuración de settings
    allow_upgrades=True,                                        # ✅ Permitir upgrade a WebSocket
    ping_timeout=60,                                            # ✅ Timeout del ping
    ping_interval=25,                                           # ✅ Intervalo de ping
    max_http_buffer_size=1e6,                                  # ✅ Buffer size para evitar errores de tamaño
    engineio_logger=False,                                      # ✅ Desactivar logs de engine.io en producción
    logger=False,                                               # ✅ Desactivar logs de socket.io en producción
)

# Aquí puedes agregar middlewares, configuraciones o eventos globales si es necesario.
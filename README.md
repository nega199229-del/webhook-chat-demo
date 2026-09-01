# webhook-chat-demo

Chat multiusuario en tiempo real construido con **Express** + **Socket.io**, con soporte para webhooks opcionales por usuario (integraciones externas).

## Arquitectura

Un único servidor Node.js (en vez de una instancia por usuario) mantiene:

- **Usuarios** en memoria, creados dinámicamente desde el frontend (`store.js`).
- **Mensajes** en memoria, indexados por conversación (`from`/`to`).
- **Socket.io** para push en tiempo real: cada cliente se une a una *room* con su `userId`; al enviar un mensaje el servidor lo emite solo a las rooms del emisor y el receptor. Esto escala mucho mejor que un broadcast global o que abrir un puerto por usuario.
- **Webhook opcional por usuario**: al crear un usuario puedes darle una `webhookUrl`. Cada mensaje que reciba se reenvía (POST) a esa URL, útil para conectar bots o sistemas externos sin tocar el frontend.

Al ser en memoria, los datos se pierden al reiniciar el servidor. Para producción real se reemplazaría `store.js` por una base de datos (SQLite/Postgres/Redis) sin tocar las rutas.

## Instalación

```bash
npm install
```

## Uso

```bash
npm start
```

Abre `http://localhost:3000` en el navegador. La primera vez te pedirá un nombre (y opcionalmente una webhook URL) para crear tu identidad — queda guardada en `localStorage`. Abre otra pestaña o navegador para simular un segundo usuario y chatear entre ambos en tiempo real. Cada usuario nuevo aparece automáticamente en la barra lateral (colapsable con el botón ☰) de todos los que tengan la app abierta.

## API REST

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/users` | Lista todos los usuarios |
| POST | `/api/users` | Crea un usuario `{ name, webhookUrl? }` |
| GET | `/api/messages?user1=&user2=` | Historial de conversación entre dos usuarios |
| POST | `/api/messages` | Envía un mensaje `{ from, to, message }` |

## Eventos Socket.io

| Evento | Dirección | Payload |
|---|---|---|
| `identify` | cliente → servidor | `userId` (une el socket a su room) |
| `user:new` | servidor → todos | usuario recién creado |
| `message:new` | servidor → rooms `from`/`to` | mensaje recién enviado |

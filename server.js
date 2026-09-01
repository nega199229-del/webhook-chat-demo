const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const store = require('./store');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Notifica el webhook externo del destinatario (si registro uno) sin bloquear la respuesta
function notifyWebhook(user, entry) {
  if (!user.webhookUrl) return;

  fetch(user.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  }).catch((err) => {
    console.error(`No se pudo notificar el webhook de ${user.name}:`, err.message);
  });
}

app.get('/api/users', (req, res) => {
  res.json(store.listUsers());
});

app.post('/api/users', (req, res) => {
  const { name, webhookUrl } = req.body || {};

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name es requerido' });
  }

  const existing = store.findUserByName(name.trim());
  if (existing) {
    return res.status(200).json(existing);
  }

  const user = store.createUser(name, webhookUrl);
  io.emit('user:new', user);
  res.status(201).json(user);
});

app.get('/api/messages', (req, res) => {
  const { user1, user2 } = req.query;

  if (!user1 || !user2) {
    return res.status(400).json({ error: 'user1 y user2 son requeridos' });
  }

  res.json(store.getConversation(user1, user2));
});

app.post('/api/messages', (req, res) => {
  const { from, to, message } = req.body || {};

  if (!from || !to || !message) {
    return res.status(400).json({ error: 'from, to y message son requeridos' });
  }

  const fromUser = store.findUser(from);
  const toUser = store.findUser(to);

  if (!fromUser || !toUser) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  const entry = store.createMessage(from, to, message);

  // Push en tiempo real a quien tenga la app abierta
  io.to(from).emit('message:new', entry);
  io.to(to).emit('message:new', entry);

  // Integracion externa opcional via webhook registrado
  notifyWebhook(toUser, entry);

  res.status(201).json(entry);
});

io.on('connection', (socket) => {
  socket.on('identify', (userId) => {
    if (userId) socket.join(userId);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Chat escuchando en http://localhost:${PORT}`);
});

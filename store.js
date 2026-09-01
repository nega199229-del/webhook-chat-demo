const crypto = require('crypto');

const users = [];
const messages = [];

function listUsers() {
  return users;
}

function findUser(id) {
  return users.find((u) => u.id === id);
}

function findUserByName(name) {
  return users.find((u) => u.name.toLowerCase() === name.toLowerCase());
}

function createUser(name, webhookUrl) {
  const user = {
    id: crypto.randomUUID(),
    name: name.trim(),
    webhookUrl: webhookUrl ? webhookUrl.trim() : null,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  return user;
}

function getConversation(userA, userB) {
  return messages.filter(
    (m) =>
      (m.from === userA && m.to === userB) || (m.from === userB && m.to === userA)
  );
}

function createMessage(from, to, text) {
  const entry = {
    id: crypto.randomUUID(),
    from,
    to,
    message: text,
    timestamp: new Date().toISOString(),
  };
  messages.push(entry);
  return entry;
}

module.exports = {
  listUsers,
  findUser,
  findUserByName,
  createUser,
  getConversation,
  createMessage,
};

const state = {
  me: null, // { id, name }
  users: [],
  activeChatId: null,
};

const el = {
  app: document.getElementById('app'),
  sidebar: document.getElementById('sidebar'),
  toggleSidebar: document.getElementById('toggleSidebar'),
  userList: document.getElementById('userList'),
  newUserForm: document.getElementById('newUserForm'),
  newUserName: document.getElementById('newUserName'),
  newUserWebhook: document.getElementById('newUserWebhook'),
  chatWith: document.getElementById('chatWith'),
  meLabel: document.getElementById('meLabel'),
  messages: document.getElementById('messages'),
  messageForm: document.getElementById('messageForm'),
  messageInput: document.getElementById('messageInput'),
  identityModal: document.getElementById('identityModal'),
  existingUsers: document.getElementById('existingUsers'),
  identityForm: document.getElementById('identityForm'),
  identityName: document.getElementById('identityName'),
  identityWebhook: document.getElementById('identityWebhook'),
};

let socket = null;

function initials(name) {
  return name.trim().slice(0, 2).toUpperCase();
}

async function api(path, options) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Error ${res.status}`);
  }
  return res.json();
}

async function loadUsers() {
  state.users = await api('/api/users');
  renderUserList();
}

function renderUserList() {
  el.userList.innerHTML = '';

  state.users.forEach((user) => {
    const li = document.createElement('li');
    const isSelf = user.id === state.me.id;

    li.className = [
      isSelf ? 'self' : '',
      user.id === state.activeChatId ? 'active' : '',
    ].filter(Boolean).join(' ');

    li.innerHTML = `
      <span class="avatar">${initials(user.name)}</span>
      <span class="user-name">${user.name}${isSelf ? ' (tú)' : ''}</span>
      ${user.webhookUrl ? '<span class="user-meta" title="Tiene webhook registrado">🔗</span>' : ''}
    `;

    if (!isSelf) {
      li.addEventListener('click', () => openChat(user));
    }

    el.userList.appendChild(li);
  });
}

async function openChat(user) {
  state.activeChatId = user.id;
  el.chatWith.textContent = `Chat con ${user.name}`;
  el.messageInput.disabled = false;
  el.messageForm.querySelector('button').disabled = false;
  renderUserList();

  const conversation = await api(`/api/messages?user1=${state.me.id}&user2=${user.id}`);
  el.messages.innerHTML = '';
  conversation.forEach(renderMessage);
  el.messages.scrollTop = el.messages.scrollHeight;
}

function renderMessage(entry) {
  const mine = entry.from === state.me.id;
  const div = document.createElement('div');
  div.className = `bubble ${mine ? 'mine' : 'theirs'}`;

  const time = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  div.innerHTML = `${escapeHtml(entry.message)}<span class="meta">${time}</span>`;

  el.messages.appendChild(div);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function connectSocket() {
  socket = io();

  socket.on('connect', () => {
    socket.emit('identify', state.me.id);
  });

  socket.on('user:new', (user) => {
    if (!state.users.some((u) => u.id === user.id)) {
      state.users.push(user);
      renderUserList();
    }
  });

  socket.on('message:new', (entry) => {
    const belongsToActiveChat =
      state.activeChatId &&
      ((entry.from === state.me.id && entry.to === state.activeChatId) ||
        (entry.to === state.me.id && entry.from === state.activeChatId));

    if (belongsToActiveChat) {
      renderMessage(entry);
      el.messages.scrollTop = el.messages.scrollHeight;
    }
  });
}

function enterApp(user) {
  state.me = user;
  localStorage.setItem('chatUserId', user.id);
  localStorage.setItem('chatUserName', user.name);

  el.identityModal.classList.add('hidden');
  el.app.classList.remove('hidden');
  el.meLabel.textContent = `Conectado como ${user.name}`;

  connectSocket();
  loadUsers();
}

async function tryAutoLogin() {
  const savedId = localStorage.getItem('chatUserId');
  if (!savedId) return showIdentityModal();

  try {
    const users = await api('/api/users');
    const existing = users.find((u) => u.id === savedId);
    if (existing) {
      enterApp(existing);
    } else {
      localStorage.removeItem('chatUserId');
      localStorage.removeItem('chatUserName');
      showIdentityModal();
    }
  } catch {
    showIdentityModal();
  }
}

async function showIdentityModal() {
  el.identityModal.classList.remove('hidden');
  el.app.classList.add('hidden');

  const users = await api('/api/users');
  el.existingUsers.innerHTML = '';
  users.forEach((user) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = `Continuar como ${user.name}`;
    btn.addEventListener('click', () => enterApp(user));
    el.existingUsers.appendChild(btn);
  });
}

el.identityForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = el.identityName.value.trim();
  const webhookUrl = el.identityWebhook.value.trim();
  if (!name) return;

  const user = await api('/api/users', { method: 'POST', body: JSON.stringify({ name, webhookUrl }) });
  enterApp(user);
});

el.newUserForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = el.newUserName.value.trim();
  const webhookUrl = el.newUserWebhook.value.trim();
  if (!name) return;

  await api('/api/users', { method: 'POST', body: JSON.stringify({ name, webhookUrl }) });
  el.newUserForm.reset();
});

el.messageForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const message = el.messageInput.value.trim();
  if (!message || !state.activeChatId) return;

  el.messageInput.value = '';
  await api('/api/messages', {
    method: 'POST',
    body: JSON.stringify({ from: state.me.id, to: state.activeChatId, message }),
  });
});

el.toggleSidebar.addEventListener('click', () => {
  el.sidebar.classList.toggle('collapsed');
});

tryAutoLogin();

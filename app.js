// CONFIGURACIÓN: reemplaza con tu config de Firebase (ver instrucciones)
const firebaseConfig = {
  apiKey: "AIzaSyAm-qj9NaW3L-_tlTX8kJ1FKfFg3G1UrIY",
  authDomain: "hat-temporal-ag.firebaseapp.com",
  projectId: "chat-temporal-ag",
  storageBucket: "chat-temporal-ag.firebasestorage.app",
  messagingSenderId: "995109559252",
  appId: "1:995109559252:web:ab4ce8f42d9a152e53d441",
  measurementId: "G-N7SNC1WH5B"
};

// Clave requerida (según tu requerimiento)
const APP_PASSWORD = "10E)sF@4M1$b]";

let db, storage;
let currentName = null;
let messagesCol;
let unsubscribeListener = null;

// DOM
const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const nameInput = document.getElementById('nameInput');
const passwordInput = document.getElementById('passwordInput');
const enterBtn = document.getElementById('enterBtn');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');

const messagesEl = document.getElementById('messages');
const textInput = document.getElementById('textInput');
const fileInput = document.getElementById('fileInput');
const sendBtn = document.getElementById('sendBtn');

enterBtn.addEventListener('click', tryEnter);
passwordInput.addEventListener('keydown', e => { if(e.key==='Enter') tryEnter(); });
logoutBtn.addEventListener('click', logout);
sendBtn.addEventListener('click', sendMessage);
textInput.addEventListener('keydown', e => { if(e.key==='Enter') sendMessage(); });

function tryEnter(){
  loginError.textContent = '';
  const name = nameInput.value.trim();
  const pwd = passwordInput.value;
  if(!name){ loginError.textContent = 'Ingresa tu nombre.'; return; }
  if(pwd !== APP_PASSWORD){ loginError.textContent = 'Clave incorrecta.'; return; }
  // init firebase y UI
  initFirebase();
  currentName = name;
  sessionStorage.setItem('chat_name', currentName);
  showChat();
}

function logout(){
  // limpiar
  sessionStorage.removeItem('chat_name');
  currentName = null;
  if(unsubscribeListener) unsubscribeListener();
  loginScreen.classList.remove('hidden');
  chatScreen.classList.add('hidden');
}

function showChat(){
  loginScreen.classList.add('hidden');
  chatScreen.classList.remove('hidden');
  // cargar mensajes en tiempo real
  subscribeMessages();
}

function initFirebase(){
  if(!firebase.apps.length){
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    storage = firebase.storage();
    messagesCol = db.collection('messages');
  }
}

function subscribeMessages(){
  if(!messagesCol) return;
  unsubscribeListener = messagesCol
    .orderBy('timestamp')
    .limit(5000)
    .onSnapshot(snapshot => {
      messagesEl.innerHTML = '';
      snapshot.forEach(doc => {
        const data = doc.data();
        renderMessage(data);
      });
      // mantener scroll abajo
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }, err => {
      console.error('listen error', err);
    });
}

function renderMessage(msg){
  const wrapper = document.createElement('div');
  wrapper.className = 'message ' + ((msg.name === currentName) ? 'me' : 'other');
  const meta = document.createElement('div');
  meta.className = 'meta';
  const time = msg.timestamp && msg.timestamp.toDate ? msg.timestamp.toDate() : new Date(msg.timestamp || Date.now());
  meta.textContent = `${msg.name || 'Anónimo'} · ${time.toLocaleString()}`;
  wrapper.appendChild(meta);
  if(msg.text){
    const p = document.createElement('div');
    p.textContent = msg.text;
    wrapper.appendChild(p);
  }
  if(msg.imageUrl){
    const img = document.createElement('img');
    img.src = msg.imageUrl;
    img.alt = "imagen";
    wrapper.appendChild(img);
  }
  messagesEl.appendChild(wrapper);
}

async function sendMessage(){
  const text = textInput.value.trim();
  const file = fileInput.files[0];
  if(!text && !file) return;
  sendBtn.disabled = true;

  try {
    let imageUrl = null;
    if(file){
      const path = `images/${Date.now()}_${Math.random().toString(36).slice(2)}_${file.name}`;
      const ref = storage.ref().child(path);
      await ref.put(file);
      imageUrl = await ref.getDownloadURL();
    }
    const payload = {
      name: currentName || 'Anónimo',
      text: text || null,
      imageUrl: imageUrl || null,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    await messagesCol.add(payload);
    textInput.value = '';
    fileInput.value = '';
  } catch(err){
    console.error('send error', err);
    alert('Error al enviar. Revisa la consola.');
  } finally {
    sendBtn.disabled = false;
  }
}

// Si hay nombre guardado en sesión y la contraseña fue validada anteriormente (navegador nuevo no guarda password):
document.addEventListener('DOMContentLoaded', () => {
  const savedName = sessionStorage.getItem('chat_name');
  if(savedName){
    nameInput.value = savedName;
    // De todas formas requiere volver a ingresar la clave por seguridad en esta implementación
  }
});

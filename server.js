const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.static(__dirname));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname)));

// Almacenar usuarios conectados
const users = {};
// Almacenar cargas en curso (temporal en memoria)
const uploads = {};

// Eventos de Socket.io
io.on('connection', (socket) => {
  console.log(`Nuevo usuario conectado: ${socket.id}`);

  // Registrar usuario
  socket.on('register', (userData) => {
    users[socket.id] = {
      id: socket.id,
      name: userData.name,
      email: userData.email,
      status: userData.status || 'activo',
      avatar: userData.avatar || null,
      photo: userData.photo || null
    };

    // Notificar a todos que hay un nuevo usuario
    io.emit('userList', Object.values(users));
    console.log(`Usuario registrado: ${userData.name}`);
  });

  // Enviar archivo a otro usuario
  // Legacy: recibir archivo completo (dataURL) y reenviarlo
  socket.on('sendFile', (data) => {
    const { toUserId, fileName, message, fileData } = data;
    
    // Enviar notificación al usuario destinatario
    io.to(toUserId).emit('incomingFile', {
      fromUserId: socket.id,
      fromName: users[socket.id]?.name || 'Usuario',
      fileName: fileName,
      message: message,
      fileData: fileData
    });

    console.log(`Archivo "${fileName}" enviado de ${users[socket.id]?.name} a ${users[toUserId]?.name}`);
  });

  // Nuevo flujo: soporte para envíos por chunks
  socket.on('startFile', (meta, cb) => {
    // meta: { uploadId, toUserId, fileName, totalChunks }
    if (!meta || !meta.uploadId) return cb && cb({ ok: false, error: 'missing_meta' });
    uploads[meta.uploadId] = {
      fromUserId: socket.id,
      toUserId: meta.toUserId,
      fileName: meta.fileName,
      totalChunks: meta.totalChunks,
      chunks: []
    };
    cb && cb({ ok: true });
  });

  socket.on('fileChunk', (data, cb) => {
    // data: { uploadId, chunkIndex, chunkData }
    const u = uploads[data.uploadId];
    if (!u) return cb && cb({ ok: false, error: 'unknown_upload' });
    u.chunks[data.chunkIndex] = data.chunkData;
    // Ack the chunk
    cb && cb({ ok: true, index: data.chunkIndex });
  });

  socket.on('endFile', (data, cb) => {
    // data: { uploadId }
    const u = uploads[data.uploadId];
    if (!u) return cb && cb({ ok: false, error: 'unknown_upload' });

    // Reunir chunks
    const fileData = u.chunks.join('');

    // Emitir al destinatario
    io.to(u.toUserId).emit('incomingFile', {
      fromUserId: u.fromUserId,
      fromName: users[u.fromUserId]?.name || 'Usuario',
      fileName: u.fileName,
      message: data.message || '',
      fileData: fileData
    });

    
    console.log(`Archivo "${u.fileName}" enviado por chunks de ${users[u.fromUserId]?.name} a ${users[u.toUserId]?.name}`);

    // Limpiar
    delete uploads[data.uploadId];
    cb && cb({ ok: true });
  });

  // Aceptar archivo
  socket.on('acceptFile', (data) => {
    const { fromUserId, fileName } = data;
    
    // Notificar al remitente que el archivo fue aceptado
    io.to(fromUserId).emit('fileAccepted', {
      toUserId: socket.id,
      toName: users[socket.id]?.name || 'Usuario',
      fileName: fileName
    });

    console.log(`${users[socket.id]?.name} aceptó el archivo "${fileName}"`);
  });

  // Rechazar archivo
  socket.on('rejectFile', (data) => {
    const { fromUserId, fileName } = data;
    
    // Notificar al remitente que el archivo fue rechazado
    io.to(fromUserId).emit('fileRejected', {
      toName: users[socket.id]?.name || 'Usuario',
      fileName: fileName
    });

    console.log(`${users[socket.id]?.name} rechazó el archivo "${fileName}"`);
  });

  // Desconexión
  socket.on('disconnect', () => {
    const userName = users[socket.id]?.name || 'Usuario desconocido';
    delete users[socket.id];
    
    io.emit('userList', Object.values(users));
    console.log(`Usuario desconectado: ${userName}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n========================================`);
  console.log(`✓ Servidor iniciado en puerto ${PORT}`);
  console.log(`\nAccede desde esta computadora:`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`\nO desde otra computadora en la red:`);
  console.log(`  Obtén tu IP con: ipconfig`);
  console.log(`  Luego usa: http://TU_IP:${PORT}`);
  console.log(`========================================\n`);
});

/* =========================
   REFERENCIAS
========================= */
const toggle = document.getElementById("themeToggle");
const userNodes = document.querySelectorAll(".user-node");
const menuBtn = document.getElementById("menuBtn");
const closeMenuBtn = document.getElementById("closeMenuBtn");
const sidebar = document.getElementById("sidebar");
const menuOverlay = document.getElementById("menuOverlay");

/* =========================
   CONEXION SOCKET.IO
========================= */
// Conectar al servidor
const socket = io({
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5
});

let onlineUsers = [];

socket.on('connect', () => {
    console.log('✓ Conectado al servidor');
    
    // Registrarse en el servidor
    const profile = JSON.parse(localStorage.getItem("userProfile")) || {};
    socket.emit('register', {
        name: profile.name || document.getElementById("profileNameLabel").textContent || "Usuario",
        email: profile.email || "",
        status: "activo",
        avatar: profile.avatar || null,
        photo: profile.photo || null
    });
});

socket.on('userList', (users) => {
    onlineUsers = users.filter(u => u.id !== socket.id); // Excluir al usuario actual
    console.log('Usuarios conectados:', users.length);
    updateUsersInOrbit();
});

// Actualizar usuarios en la órbita
function updateUsersInOrbit() {
    const container = document.getElementById('usersContainer');
    container.innerHTML = '';
    
    const positions = [
        { top: '10%', left: '50%' },
        { top: '40%', left: '80%' },
        { top: '35%', left: '30%' },
        { top: '70%', left: '50%' },
        { top: '20%', left: '20%' },
        { top: '80%', left: '80%' }
    ];
    
    onlineUsers.forEach((user, index) => {
        if (index < positions.length) {
            const pos = positions[index];
            const button = document.createElement('button');
            button.className = 'user-node';
            button.setAttribute('data-user-id', user.id);
            button.style.top = pos.top;
            button.style.left = pos.left;
            button.setAttribute('aria-label', user.name);
            
            // Si el usuario tiene avatar o foto, mostrarlo
            let avatarHTML = `<img src="assets/icons/profile.svg" alt="${user.name}">`;
            
            if (user.avatar) {
                avatarHTML = `<div style="font-size: 22px; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; line-height: 1; border-radius: 50%;">${user.avatar}</div>`;
            } else if (user.photo) {
                avatarHTML = `<div style="width: 100%; height: 100%; background-image: url('${user.photo}'); background-size: cover; background-position: center; border-radius: 50%; position: absolute; top: 0; left: 0;"></div>`;
            }
            
            button.innerHTML = `
                ${avatarHTML}
                <span class="status-dot active"></span>
                <span class="user-name">${user.name}</span>
            `;
            
            button.addEventListener('click', () => {
                sendFileToUser(user.id, user.name);
            });
            
            container.appendChild(button);
        }
    });
}

function sendFileToUser(userId, userName) {
    currentUserId = userId;
    userName.textContent = userName;
    document.getElementById('fileForm').reset();
    document.getElementById('fileModal').classList.add('active');
}


socket.on('incomingFile', (data) => {
    console.log('✓ Archivo entrante:', data.fileName, 'de:', data.fromName);
    showIncomingFileNotification(data.fromName, data.fileName, data.message, data.fromUserId, data.fileData);
});

socket.on('fileAccepted', (data) => {
    console.log(`✓ ${data.toName} aceptó tu archivo: ${data.fileName}`);
});

socket.on('fileRejected', (data) => {
    console.log(`✗ ${data.toName} rechazó tu archivo: ${data.fileName}`);
});

socket.on('disconnect', () => {
    console.log('✗ Desconectado del servidor');
});

/* =========================
   MENU LATERAL
========================= */
menuBtn.addEventListener("click", () => {
    sidebar.classList.add("active");
    menuOverlay.classList.add("active");
    document.body.style.overflow = "hidden";
});

closeMenuBtn.addEventListener("click", closeMenu);
menuOverlay.addEventListener("click", closeMenu);

function closeMenu() {
    sidebar.classList.remove("active");
    menuOverlay.classList.remove("active");
    document.body.style.overflow = "auto";
}

// Cerrar menu al hacer clic en un enlace
document.querySelectorAll(".menu-link").forEach(link => {
    link.addEventListener("click", (e) => {
        e.preventDefault();
        closeMenu();
    });
});

/* =========================
   TEMA (LOCAL + SISTEMA)
========================= */
const savedTheme = localStorage.getItem("theme");
const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;

if (savedTheme === "light" || (!savedTheme && prefersLight)) {
    document.body.classList.add("light");
    toggle.checked = true;
    // Actualizar theme-color inicial
    const themeColorMeta = document.getElementById("themeColor");
    if (themeColorMeta) {
        themeColorMeta.content = "#f2f3f5";
    }
}

/* =========================
   CAMBIO DE TEMA
========================= */
toggle.addEventListener("change", () => {
    const isLight = toggle.checked;

    document.body.classList.toggle("light", isLight);
    localStorage.setItem("theme", isLight ? "light" : "dark");
    
    // Actualizar theme-color para móvil
    const themeColorMeta = document.getElementById("themeColor");
    if (themeColorMeta) {
        themeColorMeta.content = isLight ? "#f2f3f5" : "#0b1d26";
    }
});

/* =========================
   USUARIOS - MODAL ENVIO ARCHIVOS
========================= */
const fileModal = document.getElementById("fileModal");
const closeFileModal = document.getElementById("closeFileModal");
const fileForm = document.getElementById("fileForm");
const userName = document.getElementById("userName");
const fileDropArea = document.getElementById("fileDropArea");
const fileInput = document.getElementById("fileInput");
const fileSelectedInfo = document.getElementById("fileSelectedInfo");
const selectedFileName = document.getElementById("selectedFileName");
let currentUserId = null;

// Cerrar modal (boton X)
closeFileModal.addEventListener("click", () => {
    fileModal.classList.remove("active");
});

// Cerrar modal (clic fuera)
window.addEventListener("click", (e) => {
    if (e.target === fileModal) {
        fileModal.classList.remove("active");
    }
});

// Click en el área de drop para abrir selector
fileDropArea.addEventListener("click", (e) => {
    if (e.target !== fileInput) {
        fileInput.click();
    }
});

// Cuando se selecciona un archivo
fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
        const file = e.target.files[0];
        selectedFileName.textContent = file.name;
        fileDropArea.style.display = "none";
        fileSelectedInfo.style.display = "block";
    }
});

// Drag and Drop
fileDropArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
    fileDropArea.classList.add("drag-over");
});

fileDropArea.addEventListener("dragleave", (e) => {
    e.preventDefault();
    e.stopPropagation();
    fileDropArea.classList.remove("drag-over");
});

fileDropArea.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    fileDropArea.classList.remove("drag-over");
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        fileInput.files = files;
        const file = files[0];
        selectedFileName.textContent = file.name;
        fileDropArea.style.display = "none";
        fileSelectedInfo.style.display = "block";
    }
});

// Enviar archivo
fileForm.addEventListener("submit", (e) => {
    e.preventDefault();
    
    const fileMessage = document.getElementById("fileMessage");
    
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        
        // Leer el archivo
        const reader = new FileReader();
        const uploadContainer = document.getElementById('uploadProgressContainer');
        const uploadBar = document.getElementById('uploadProgress');
        const sendContainer = document.getElementById('sendProgressContainer');
        const sendBar = document.getElementById('sendProgress');

        // Mostrar progreso de lectura
        uploadContainer.style.display = 'block';
        uploadBar.style.width = '0%';
        uploadBar.textContent = '0%';

        reader.onprogress = function(ev) {
            if (ev.lengthComputable) {
                const pct = Math.round((ev.loaded / ev.total) * 100);
                uploadBar.style.width = pct + '%';
                uploadBar.textContent = pct + '%';
            }
        };

        reader.onload = function(e) {
            uploadBar.style.width = '100%';
            uploadBar.textContent = '100%';

            // Empezar progreso de envío por chunks
            sendContainer.style.display = 'block';
            sendBar.style.width = '0%';
            sendBar.textContent = '0%';

            (async () => {
                const dataUrl = e.target.result; // data:*;base64,...
                const chunkSize = 256 * 1024; // 256KB chunks
                const totalChunks = Math.ceil(dataUrl.length / chunkSize);
                const uploadId = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8);

                // Intentar iniciar upload por chunks
                let startRes = null;
                try {
                    startRes = await new Promise(resolve => {
                        socket.emit('startFile', { uploadId, toUserId: currentUserId, fileName: file.name, totalChunks }, resolve);
                        // si el servidor no responde, resolve no será llamado; pero socket.emit con callback llamará cuando el server lo haga
                    });
                } catch (err) {
                    startRes = null;
                }

                // Si servidor no soporta startFile (o devolvió error), fallback a envío completo por sendFile
                if (!startRes || !startRes.ok) {
                    const payload = { toUserId: currentUserId, fileName: file.name, message: fileMessage.value, fileData: dataUrl };
                    socket.emit('sendFile', payload, (response) => {
                        sendBar.style.width = '100%';
                        sendBar.textContent = '100%';
                        console.log('Archivo enviado (fallback sendFile):', file.name, response);
                        setTimeout(() => {
                            sendContainer.style.display = 'none';
                            uploadContainer.style.display = 'none';
                            fileModal.classList.remove('active');
                            fileForm.reset();
                            fileDropArea.style.display = 'flex';
                            fileSelectedInfo.style.display = 'none';
                        }, 400);
                    });
                    return;
                }

                // Enviar chunks secuencialmente y esperar ack por cada uno
                for (let i = 0; i < totalChunks; i++) {
                    const chunk = dataUrl.slice(i * chunkSize, (i + 1) * chunkSize);
                    try {
                        // await ack
                        await new Promise(resolve => {
                            socket.emit('fileChunk', { uploadId, chunkIndex: i, chunkData: chunk }, (ack) => {
                                // actualizar progreso basado en chunks acked
                                const pct = Math.round(((i + 1) / totalChunks) * 100);
                                sendBar.style.width = pct + '%';
                                sendBar.textContent = pct + '%';
                                resolve(ack);
                            });
                        });
                    } catch (err) {
                        console.error('Error enviando chunk', i, err);
                        break;
                    }
                }

                // Señalar fin del upload
                await new Promise(resolve => {
                    socket.emit('endFile', { uploadId, message: fileMessage.value }, (res) => {
                        resolve(res);
                    });
                });

                sendBar.style.width = '100%';
                sendBar.textContent = '100%';
                setTimeout(() => {
                    sendContainer.style.display = 'none';
                    uploadContainer.style.display = 'none';
                    fileModal.classList.remove('active');
                    fileForm.reset();
                    fileDropArea.style.display = 'flex';
                    fileSelectedInfo.style.display = 'none';
                }, 400);
            })();
        };

        reader.readAsDataURL(file);
    }
});

/* =========================
   TRANSFERENCIA DE ARCHIVOS
========================= */
const incomingFileModal = document.getElementById("incomingFileModal");
const acceptFileBtn = document.getElementById("acceptFileBtn");
const rejectFileBtn = document.getElementById("rejectFileBtn");
const filesPanel = document.getElementById("filesPanel");
const filesButton = document.getElementById("filesButton");
const closeFilesPanel = document.getElementById("closeFilesPanel");
const filesList = document.getElementById("filesList");

let receivedFiles = JSON.parse(localStorage.getItem("receivedFiles")) || [];
let currentIncomingFile = null;

function showIncomingFileNotification(sender, fileName, message, fromUserId, fileData) {
    console.log('Mostrando notificación:', sender, fileName);
    
    currentIncomingFile = {
        sender: sender,
        fileName: fileName,
        message: message,
        fromUserId: fromUserId,
        timestamp: new Date().toLocaleString(),
        fileData: fileData || null
    };
    
    document.getElementById("senderName").textContent = sender;
    document.getElementById("incomingFileName").textContent = fileName;
    document.getElementById("incomingFileMessage").textContent = message || "(Sin mensaje)";
    
    incomingFileModal.classList.add("active");
    console.log('Modal visible:', incomingFileModal.classList.contains("active"));
}

acceptFileBtn.addEventListener("click", () => {
    if (currentIncomingFile) {
        receivedFiles.push({
            ...currentIncomingFile,
            status: "aceptado"
        });
        localStorage.setItem("receivedFiles", JSON.stringify(receivedFiles));
        
        // Notificar al servidor que aceptaste el archivo
        socket.emit('acceptFile', {
            fromUserId: currentIncomingFile.fromUserId,
            fileName: currentIncomingFile.fileName
        });
        
        console.log(`✓ Archivo "${currentIncomingFile.fileName}" aceptado de ${currentIncomingFile.sender}`);
        updateFilesPanel();
        incomingFileModal.classList.remove("active");
        
        // Descargar automáticamente si está habilitado
        const autoDownloadEnabled = localStorage.getItem("autoDownload") === "true";
        if (autoDownloadEnabled) {
            const fileIndex = receivedFiles.length - 1;
            // Mostrar progreso breve en el modal entrante
            const receiveContainer = document.getElementById('receiveProgressContainer');
            const receiveBar = document.getElementById('receiveProgress');
            if (receiveContainer && receiveBar) {
                receiveContainer.style.display = 'block';
                receiveBar.style.width = '0%';
                receiveBar.textContent = '0%';
                let r = 0;
                const rInterval = setInterval(() => {
                    r = Math.min(70, r + 12);
                    receiveBar.style.width = r + '%';
                    receiveBar.textContent = r + '%';
                    if (r >= 70) clearInterval(rInterval);
                }, 180);
                setTimeout(() => {
                    // Completar y ocultar el progreso del modal antes de descargar en el panel
                    clearInterval(rInterval);
                    receiveBar.style.width = '100%';
                    receiveBar.textContent = '100%';
                    setTimeout(() => {
                        receiveContainer.style.display = 'none';
                        receiveBar.style.width = '0%';
                        receiveBar.textContent = '0%';
                    }, 300);
                    downloadFile(fileIndex);
                }, 700);
            } else {
                setTimeout(() => downloadFile(fileIndex), 500);
            }
        }
    }
});

rejectFileBtn.addEventListener("click", () => {
    if (currentIncomingFile) {
        // Notificar al servidor que rechazaste el archivo
        socket.emit('rejectFile', {
            fromUserId: currentIncomingFile.fromUserId,
            fileName: currentIncomingFile.fileName
        });
        
        console.log(`✗ Rechazaste el archivo "${currentIncomingFile.fileName}" de ${currentIncomingFile.sender}`);
        incomingFileModal.classList.remove("active");
    }
});

filesButton.addEventListener("click", () => {
    filesPanel.classList.add("active");
});

closeFilesPanel.addEventListener("click", () => {
    filesPanel.classList.remove("active");
});

function updateFilesPanel() {
    if (receivedFiles.length === 0) {
        filesList.innerHTML = '<p class="empty-message">No hay archivos recibidos</p>';
        return;
    }
    
    filesList.innerHTML = receivedFiles.map((file, index) => `
        <div class="file-item">
            <div class="file-item-name">📄 ${file.fileName}</div>
            <div class="file-item-from">De: <strong>${file.sender}</strong></div>
            <div class="file-item-from">Fecha: ${file.timestamp}</div>
            ${file.message ? `<div class="file-item-from">Mensaje: ${file.message}</div>` : ''}
            <div class="file-item-actions">
                <button class="btn-download" data-index="${index}" title="Descargar">⬇️ Descargar</button>
                <button class="btn-delete" data-index="${index}" title="Eliminar">🗑️ Eliminar</button>
            </div>
            <div class="file-progress" id="fileProgress-${index}" style="display:none; margin-top:8px;">
                <div class="progress-track">
                    <div class="progress-bar" id="fileProgressBar-${index}" style="width:0%">0%</div>
                </div>
            </div>
        </div>
    `).join('');
    
    // Agregar eventos a los botones
    document.querySelectorAll('.btn-download').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            downloadFile(index);
        });
    });
    
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            deleteFile(index);
        });
    });
}

function downloadFile(index) {
    const file = receivedFiles[index];
    if (!file) return;
    // Mostrar barra de progreso para esta descarga
    const progressContainer = document.getElementById(`fileProgress-${index}`);
    const progressBar = document.getElementById(`fileProgressBar-${index}`);
    if (progressContainer && progressBar) {
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        progressBar.textContent = '0%';

        let pct = 0;
        const interval = setInterval(() => {
            pct = Math.min(100, pct + Math.floor(Math.random() * 20) + 5);
            progressBar.style.width = pct + '%';
            progressBar.textContent = pct + '%';
            if (pct >= 100) {
                    clearInterval(interval);

                    // Descargar usando el fileData real si está disponible
                    const element = document.createElement('a');
                    const href = file.fileData || ('data:application/octet-stream;base64,' + btoa(file.fileName));
                    element.setAttribute('href', href);
                    element.setAttribute('download', file.fileName);
                    element.style.display = 'none';
                    document.body.appendChild(element);
                    element.click();
                    document.body.removeChild(element);

                    console.log(`✓ Archivo "${file.fileName}" descargado`);
                    setTimeout(() => {
                        progressContainer.style.display = 'none';
                        progressBar.style.width = '0%';
                        progressBar.textContent = '0%';
                    }, 600);
                }
            }, 250);
            return;
    }
}

function deleteFile(index) {
    const file = receivedFiles[index];
    if (!file) return;
    
    if (confirm(`¿Eliminar el archivo "${file.fileName}" de forma permanente?`)) {
        receivedFiles.splice(index, 1);
        localStorage.setItem("receivedFiles", JSON.stringify(receivedFiles));
        updateFilesPanel();
        console.log(`✓ Archivo "${file.fileName}" eliminado`);
    }
}

// Cargar archivos recibidos al inicio
updateFilesPanel();

/* =========================
   PERFIL - MODAL
========================= */
const profileBtn = document.getElementById("profileBtn");
const profileModal = document.getElementById("profileModal");
const closeModal = document.getElementById("closeModal");
const profileForm = document.getElementById("profileForm");

// Cargar datos guardados al abrir la pagina
function loadProfileData() {
    const saved = localStorage.getItem("userProfile");
    if (saved) {
        const profile = JSON.parse(saved);
        document.getElementById("profileName").value = profile.name || "";
        document.getElementById("profileNameLabel").textContent = profile.name || "Mi Perfil";
        
        // Mostrar avatar/foto en el panel principal
        const profileBtn = document.getElementById("profileBtn");
        if (profile.avatar) {
            profileBtn.innerHTML = `<div style="font-size: 40px; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">${profile.avatar}</div>`;
            profileBtn.style.backgroundImage = "none";
        } else if (profile.photo) {
            profileBtn.innerHTML = "";
            profileBtn.style.backgroundImage = `url('${profile.photo}')`;
            profileBtn.style.backgroundSize = "cover";
            profileBtn.style.backgroundPosition = "center";
            profileBtn.innerHTML = "";
        }
    }
}

// Abrir modal
profileBtn.addEventListener("click", () => {
    loadProfileData();
    profileModal.classList.add("active");
});

// Cerrar modal (boton X)
closeModal.addEventListener("click", () => {
    profileModal.classList.remove("active");
});

// Cerrar modal (clic fuera)
window.addEventListener("click", (e) => {
    if (e.target === profileModal) {
        profileModal.classList.remove("active");
    }
});

// Guardar datos del formulario
profileForm.addEventListener("submit", (e) => {
    e.preventDefault();
    
    const saved = localStorage.getItem("userProfile");
    const profile = JSON.parse(saved || "{}");
    
    profile.name = document.getElementById("profileName").value;
    
    localStorage.setItem("userProfile", JSON.stringify(profile));
    document.getElementById("profileNameLabel").textContent = profile.name || "Mi Perfil";
    
    // Actualizar el avatar/foto en el panel principal
    const profileBtn = document.getElementById("profileBtn");
    if (profile.avatar) {
        profileBtn.innerHTML = `<div style="font-size: 40px; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">${profile.avatar}</div>`;
        profileBtn.style.backgroundImage = "none";
    } else if (profile.photo) {
        profileBtn.innerHTML = "";
        profileBtn.style.backgroundImage = `url('${profile.photo}')`;
        profileBtn.style.backgroundSize = "cover";
        profileBtn.style.backgroundPosition = "center";
    }
    
    // Re-registrarse con el nuevo avatar
    socket.emit('register', {
        name: profile.name,
        email: profile.email || "",
        status: "activo",
        avatar: profile.avatar || null,
        photo: profile.photo || null
    });
    
    profileModal.classList.remove("active");
});

/* =========================
   AVATAR Y FOTO DE PERFIL
========================= */
const uploadPhotoBtn = document.getElementById("uploadPhotoBtn");
const selectAvatarBtn = document.getElementById("selectAvatarBtn");
const photoInput = document.getElementById("photoInput");
const profilePhotoPreview = document.getElementById("profilePhotoPreview");
const avatarSelector = document.getElementById("avatarSelector");

let currentAvatar = null;

// Cargar perfil con foto al inicio
function loadProfileWithPhoto() {
    const saved = localStorage.getItem("userProfile");
    if (saved) {
        const profile = JSON.parse(saved);
        document.getElementById("profileName").value = profile.name || "";
        
        if (profile.avatar) {
            currentAvatar = profile.avatar;
            profilePhotoPreview.textContent = profile.avatar;
            profilePhotoPreview.style.fontSize = "60px";
            profilePhotoPreview.style.backgroundImage = "none";
        } else if (profile.photo) {
            profilePhotoPreview.style.backgroundImage = `url('${profile.photo}')`;
            profilePhotoPreview.textContent = "";
        }
    }
}

// Botón para subir foto
uploadPhotoBtn.addEventListener("click", (e) => {
    e.preventDefault();
    avatarSelector.style.display = "none";
    photoInput.click();
});

// Cuando se selecciona una foto
photoInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            profilePhotoPreview.style.backgroundImage = `url('${e.target.result}')`;
            profilePhotoPreview.textContent = "";
            profilePhotoPreview.innerHTML = "";
            currentAvatar = null;
            
            const profile = JSON.parse(localStorage.getItem("userProfile") || "{}");
            profile.photo = e.target.result;
            profile.avatar = null;
            localStorage.setItem("userProfile", JSON.stringify(profile));
            
            // Actualizar también el perfil en el panel principal
            const profileBtn = document.getElementById("profileBtn");
            profileBtn.innerHTML = "";
            profileBtn.style.backgroundImage = `url('${e.target.result}')`;
            profileBtn.style.backgroundSize = "cover";
            profileBtn.style.backgroundPosition = "center";
            
            // Re-registrarse con la nueva foto
            socket.emit('register', {
                name: profile.name || document.getElementById("profileNameLabel").textContent || "Usuario",
                email: profile.email || "",
                status: "activo",
                avatar: null,
                photo: e.target.result
            });
        };
        reader.readAsDataURL(file);
    }
});

// Botón para seleccionar avatar
selectAvatarBtn.addEventListener("click", (e) => {
    e.preventDefault();
    avatarSelector.style.display = avatarSelector.style.display === "none" ? "block" : "none";
});

// Seleccionar un avatar
document.querySelectorAll(".avatar-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
        e.preventDefault();
        const emoji = btn.dataset.emoji;
        currentAvatar = emoji;
        profilePhotoPreview.textContent = emoji;
        profilePhotoPreview.style.backgroundImage = "none";
        profilePhotoPreview.style.fontSize = "60px";
        
        const profile = JSON.parse(localStorage.getItem("userProfile") || "{}");
        profile.avatar = emoji;
        profile.photo = null;
        localStorage.setItem("userProfile", JSON.stringify(profile));
        
        // Actualizar también el perfil en el panel principal
        const profileBtn = document.getElementById("profileBtn");
        profileBtn.style.backgroundImage = "none";
        profileBtn.innerHTML = `<div style="font-size: 40px; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">${emoji}</div>`;
        
        // Re-registrarse con el nuevo avatar
        socket.emit('register', {
            name: profile.name || document.getElementById("profileNameLabel").textContent || "Usuario",
            email: profile.email || "",
            status: "activo",
            avatar: emoji,
            photo: null
        });
    });
});

// Cargar nombre del perfil al cargar la pagina
window.addEventListener("DOMContentLoaded", () => {
    loadProfileData();
    loadProfileWithPhoto();
});

/* =========================
   AJUSTES - MODAL
========================= */
const settingsModal = document.getElementById("settingsModal");
const closeSettingsModal = document.getElementById("closeSettingsModal");
const settingsMenuLink = document.querySelector('.menu-link.settings-link');

// Abrir modal de Ajustes desde el menú
settingsMenuLink.addEventListener("click", (e) => {
    e.preventDefault();
    settingsModal.classList.add("active");
    closeMenu();
    updateStorageInfo();
    updateSessionInfo();
});

// Cerrar modal de Ajustes
closeSettingsModal.addEventListener("click", () => {
    settingsModal.classList.remove("active");
});

window.addEventListener("click", (e) => {
    if (e.target === settingsModal) {
        settingsModal.classList.remove("active");
    }
});

/* =========================
   ACERCA DE - MODAL
========================= */
const aboutModal = document.getElementById("aboutModal");
const closeAboutModal = document.getElementById("closeAboutModal");
const aboutLink = document.getElementById("aboutLink");

// Abrir modal de Acerca de
aboutLink.addEventListener("click", (e) => {
    e.preventDefault();
    aboutModal.classList.add("active");
    closeMenu();
});

// Cerrar modal de Acerca de
closeAboutModal.addEventListener("click", () => {
    aboutModal.classList.remove("active");
});

window.addEventListener("click", (e) => {
    if (e.target === aboutModal) {
        aboutModal.classList.remove("active");
    }
});

// Función para actualizar información de almacenamiento
function updateStorageInfo() {
    const filesCount = receivedFiles.length;
    let storageUsed = 0;
    
    receivedFiles.forEach(file => {
        if (file.fileName) {
            storageUsed += (file.fileName.length * 2); // Aproximación
        }
    });
    
    document.getElementById("filesCount").textContent = filesCount;
    document.getElementById("storageUsed").textContent = (storageUsed / 1024).toFixed(2) + " KB";
}

// Función para actualizar información de sesión
function updateSessionInfo() {
    document.getElementById("sessionId").textContent = socket.id || "No conectado";
    document.getElementById("portInfo").textContent = "3000";
    
    // Intentar obtener IP local (esto es aproximado)
    fetch('https://api.ipify.org?format=json')
        .then(response => response.json())
        .then(data => {
            document.getElementById("localIp").textContent = data.ip;
        })
        .catch(err => {
            document.getElementById("localIp").textContent = "localhost";
        });
}

// Controles de notificaciones
const soundEnabled = document.getElementById("soundEnabled");
const desktopNotifications = document.getElementById("desktopNotifications");
const autoDownload = document.getElementById("autoDownload");

soundEnabled.addEventListener("change", () => {
    localStorage.setItem("soundNotifications", soundEnabled.checked);
});

desktopNotifications.addEventListener("change", () => {
    if (desktopNotifications.checked) {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }
    localStorage.setItem("desktopNotifications", desktopNotifications.checked);
});

autoDownload.addEventListener("change", () => {
    localStorage.setItem("autoDownload", autoDownload.checked);
});

// Cargar preferencias al inicio
if (localStorage.getItem("soundNotifications") !== null) {
    soundEnabled.checked = localStorage.getItem("soundNotifications") === "true";
}
if (localStorage.getItem("desktopNotifications") !== null) {
    desktopNotifications.checked = localStorage.getItem("desktopNotifications") === "true";
}
if (localStorage.getItem("autoDownload") !== null) {
    autoDownload.checked = localStorage.getItem("autoDownload") === "true";
} else {
    // Valor por defecto: habilitado
    localStorage.setItem("autoDownload", "true");
    autoDownload.checked = true;
}

// Botón para limpiar historial
document.getElementById("clearStorageBtn").addEventListener("click", () => {
    if (confirm("¿Eliminar TODOS los archivos recibidos?")) {
        receivedFiles = [];
        localStorage.setItem("receivedFiles", JSON.stringify(receivedFiles));
        updateFilesPanel();
        updateStorageInfo();
        console.log("✓ Historial limpiado");
    }
});
// Hauptklasse für das Spiel
class MultiplayerHarmonicWorlds {
    constructor() {
        // Speichern aller wichtigen Variablen für das Spiel
        this.scene = null;  
        this.camera = null;  
        this.renderer = null;  
        this.audioContext = null; 
        this.player = null;  
        
        this.otherPlayers = new Map();  
        this.zones = [];  
        this.activeZones = new Set();  
        this.keys = {};  
        this.isStarted = false;  
        this.position = { x: 0, z: 0 }; 
        this.masterGain = null; 
        this.oscillators = new Map();  
        this.playerOscillators = new Map();  
        
        // Multiplayer-Einstellungen
        this.socket = null;  
        this.playerId = null;  
        this.playerName = 'Player'; 
        this.roomId = null;  
        this.isConnected = false;  
        
        // Kameraeinstellungen
        this.isFirstPerson = false;  
        this.cameraRotation = { x: 0, y: 0 };  
        this.mouseSensitivity = 0.002;  
        
        this.init(); 
    }
    
    // Initialisierung des Spiels
    init() {
        this.setupThreeJS();  
        this.setupControls();  
        this.createWorld();  
        this.setupConnectionUI();  
        this.animate(); 
    }
    
    // Verbindungsmenü einrichten
    setupConnectionUI() {
        // Button zum Erstellen eines Raums
        document.getElementById('createRoomBtn').addEventListener('click', () => {
            this.createRoom();
        });
        
        // Button zum Beitreten eines Raums
        document.getElementById('joinRoomBtn').addEventListener('click', () => {
            this.joinRoom();
        });
        
        // Eingabefeld für den Spielernamen
        document.getElementById('nameInput').addEventListener('input', (e) => {
            this.playerName = e.target.value || 'Player';
        });
    }
    
    // Raum erstellen
    createRoom() {
        const roomName = document.getElementById('roomInput').value || this.generateRoomId();
        this.playerName = document.getElementById('nameInput').value || 'Player';
        this.connectToRoom(roomName, true);
    }
    
    // Raum beitreten
    joinRoom() {
        const roomName = document.getElementById('roomInput').value;
        if (!roomName) {
            alert('Bitte gib einen Raumnamen ein!');
            return;
        }
        this.playerName = document.getElementById('nameInput').value || 'Player';
        this.connectToRoom(roomName, false);
    }
    
    // Zufällige Raum-ID generieren
    generateRoomId() {
        return 'room_' + Math.random().toString(36).substr(2, 8);
    }
    
    // Mit Raum verbinden
    connectToRoom(roomId, isCreating) {
        this.updateConnectionStatus('Verbinde...', 'connecting');
        
        // WebSocket-Verbindung herstellen
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}`;
        this.socket = new WebSocket(wsUrl);
        this.playerId = 'player_' + Math.random().toString(36).substr(2, 8);
        this.roomId = roomId;
        
        // Verbindung geöffnet
        this.socket.onopen = () => {
            this.socket.send(JSON.stringify({
                type: isCreating ? 'create_room' : 'join_room',
                roomId: roomId,
                playerId: this.playerId,
                playerName: this.playerName
            }));
        };
        
        // Nachricht vom Server erhalten
        this.socket.onmessage = (event) => {
            this.handleServerMessage(JSON.parse(event.data));
        };
        
        // Verbindung geschlossen
        this.socket.onclose = () => {
            this.handleDisconnection();
        };
        
        // Fehler bei der Verbindung
        this.socket.onerror = () => {
            this.updateConnectionStatus('Verbindung fehlgeschlagen', 'disconnected');
        };
    }
    
    // Server-Nachrichten verarbeiten
    handleServerMessage(message) {
        switch (message.type) {
            case 'room_joined':
                this.handleRoomJoined(message);
                break;
            case 'player_joined':
                this.handlePlayerJoined(message);
                break;
            case 'player_left':
                this.handlePlayerLeft(message);
                break;
            case 'player_moved':
                this.handlePlayerMoved(message);
                break;
            case 'player_zone_entered':
                this.handlePlayerZoneEntered(message);
                break;
            case 'player_zone_exited':
                this.handlePlayerZoneExited(message);
                break;
            case 'players_list':
                this.updatePlayersList(message.players);
                break;
        }
    }
    
    // Raum beigetreten
    handleRoomJoined(message) {
        this.isConnected = true;
        this.updateConnectionStatus('Verbunden', 'connected');
        document.getElementById('connectionPanel').classList.add('hidden');
        document.getElementById('roomName').textContent = this.roomId;
        
        // Bestehende Spieler initialisieren
        if (message.players) {
            message.players.forEach(player => {
                if (player.id !== this.playerId) {
                    this.createOtherPlayer(player);
                }
            });
        }
        
        this.startGame();
    }
    
    // Neuer Spieler beigetreten
    handlePlayerJoined(message) {
        this.createOtherPlayer(message.player);
        this.updatePlayersList(message.players);
    }
    
    // Spieler hat den Raum verlassen
    handlePlayerLeft(message) {
        this.removeOtherPlayer(message.playerId);
        this.updatePlayersList(message.players);
    }
    
    // Spieler hat sich bewegt
    handlePlayerMoved(message) {
        const otherPlayer = this.otherPlayers.get(message.playerId);
        if (otherPlayer) {
            otherPlayer.targetPosition = {
                x: message.position.x,
                z: message.position.z
            };
        }
    }
    
    // Spieler ist in eine Zone eingetreten
    handlePlayerZoneEntered(message) {
        const zone = this.zones[message.zoneIndex];
        if (zone) {
            zone.mesh.material.emissiveIntensity = Math.max(zone.mesh.material.emissiveIntensity, 0.3);
            
            // Sound für andere Spieler erstellen
            if (message.playerId !== this.playerId) {
                this.createPlayerZoneAudio(message.playerId, zone, message.zoneIndex);
            }
        }
    }
    
    // Spieler hat eine Zone verlassen
    handlePlayerZoneExited(message) {
        const zone = this.zones[message.zoneIndex];
        if (zone) {
            zone.mesh.material.emissiveIntensity = 0.1;
            
            // Sound für andere Spieler stoppen
            if (message.playerId !== this.playerId) {
                this.stopPlayerZoneAudio(message.playerId, message.zoneIndex);
            }
        }
    }
    
    // Verbindung verloren
    handleDisconnection() {
        this.isConnected = false;
        this.updateConnectionStatus('Getrennt', 'disconnected');
        this.otherPlayers.forEach((player, id) => {
            this.removeOtherPlayer(id);
        });
    }
    
    // Anderen Spieler erstellen
    createOtherPlayer(playerData) {
        const group = new THREE.Group();
        
        // Körper mit anderer Farbe als lokaler Spieler
        const bodyGeometry = new THREE.CylinderGeometry(0.4, 0.5, 1.5, 12);
        const bodyMaterial = new THREE.MeshLambertMaterial({ 
            color: this.getPlayerColor(playerData.id),
            emissive: this.getPlayerColor(playerData.id),
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.8
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.75;
        group.add(body);
        
        // Kopf
        const headGeometry = new THREE.SphereGeometry(0.35, 12, 8);
        const head = new THREE.Mesh(headGeometry, bodyMaterial);
        head.position.y = 1.8;
        group.add(head);
        
        // Namensschild
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        context.fillStyle = 'rgba(0, 0, 0, 0.8)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = 'white';
        context.font = '24px Arial';
        context.textAlign = 'center';
        context.fillText(playerData.name, canvas.width / 2, 40);
        
        const texture = new THREE.CanvasTexture(canvas);
        const labelMaterial = new THREE.MeshBasicMaterial({ 
            map: texture, 
            transparent: true 
        });
        const labelGeometry = new THREE.PlaneGeometry(2, 0.5);
        const label = new THREE.Mesh(labelGeometry, labelMaterial);
        label.position.y = 3;
        group.add(label);
        
        group.position.set(
            playerData.position?.x || 0, 
            0, 
            playerData.position?.z || 0
        );
        
        this.scene.add(group);
        
        this.otherPlayers.set(playerData.id, {
            mesh: group,
            name: playerData.name,
            targetPosition: { x: playerData.position?.x || 0, z: playerData.position?.z || 0 },
            label: label
        });
    }
    
    // Anderen Spieler entfernen
    removeOtherPlayer(playerId) {
        const player = this.otherPlayers.get(playerId);
        if (player) {
            // Alle Sounds des Spielers stoppen
            const playerOscillators = this.playerOscillators.get(playerId);
            if (playerOscillators) {
                playerOscillators.forEach((audioNodes, zoneIndex) => {
                    this.stopPlayerZoneAudio(playerId, zoneIndex);
                });
            }
            
            this.scene.remove(player.mesh);
            this.otherPlayers.delete(playerId);
        }
    }
    
    // Spielerfarbe generieren
    getPlayerColor(playerId) {
        const colors = [0x00ff88, 0xff6b35, 0x4ecdc4, 0xf9ca24, 0x6c5ce7, 0xe17055];
        const hash = playerId.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
        return colors[Math.abs(hash) % colors.length];
    }
    
    // Verbindungsstatus aktualisieren
    updateConnectionStatus(status, type) {
        const statusEl = document.getElementById('connectionStatus');
        statusEl.textContent = status;
        statusEl.className = `connection-status status-${type}`;
    }
    
    // Spielerliste aktualisieren
    updatePlayersList(players) {
        const container = document.getElementById('playersContainer');
        container.innerHTML = '';
        
        players.forEach(player => {
            const div = document.createElement('div');
            div.className = 'player-item';
            div.textContent = player.name + (player.id === this.playerId ? ' (Du)' : '');
            container.appendChild(div);
        });
    }
    
    // Spielerbewegung senden
    sendPlayerMovement() {
        if (this.socket && this.isConnected) {
            this.socket.send(JSON.stringify({
                type: 'player_move',
                playerId: this.playerId,
                position: this.position
            }));
        }
    }
    
    // Zone betreten senden
    sendZoneEntered(zoneIndex) {
        if (this.socket && this.isConnected) {
            this.socket.send(JSON.stringify({
                type: 'zone_entered',
                playerId: this.playerId,
                zoneIndex: zoneIndex
            }));
        }
    }
    
    // Zone verlassen senden
    sendZoneExited(zoneIndex) {
        if (this.socket && this.isConnected) {
            this.socket.send(JSON.stringify({
                type: 'zone_exited',
                playerId: this.playerId,
                zoneIndex: zoneIndex
            }));
        }
    }
    
    // Spiel starten
    async startGame() {
        try {
            await this.setupAudio();
            this.createPlayer();
            this.isStarted = true;
            console.log('Spiel gestartet!');
        } catch (error) {
            console.error('Spiel konnte nicht gestartet werden:', error);
        }
    }
    
    // 3D-Umgebung einrichten
    setupThreeJS() {
        // Szene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a1e);
        this.scene.fog = new THREE.Fog(0x0a0a1e, 20, 100);
        
        // Kamera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 5, 10);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: document.getElementById('gameCanvas'),
            antialias: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        
        // Beleuchtung
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(20, 20, 10);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
    }
    
    // Audio einrichten
    async setupAudio() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
        
        this.masterGain = this.audioContext.createGain();
        this.masterGain.connect(this.audioContext.destination);
        this.masterGain.gain.value = 0.3;
        
        document.getElementById('audioStatus').textContent = 'Bereit';
    }
    
    // Steuerung einrichten
    setupControls() {
        // Tastatureingaben
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Mausbewegung
        document.addEventListener('mousemove', (event) => {
            if (this.isFirstPerson) {
                // Nur horizontale Rotation (y-Achse) erlauben
                this.cameraRotation.y -= event.movementX * this.mouseSensitivity;
                // Vertikale Rotation (x-Achse) auf 0 setzen
                this.cameraRotation.x = 0;
            }
        });

        // Kamera umschalten
        document.getElementById('toggleCameraBtn').addEventListener('click', () => {
            this.isFirstPerson = !this.isFirstPerson;
            if (this.isFirstPerson) {
                document.body.requestPointerLock();
            } else {
                document.exitPointerLock();
            }
        });
        
        // Fenstergröße anpassen
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
    
    // Spielwelt erstellen
    createWorld() {
        // Boden
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x2a2a4e,
            transparent: true,
            opacity: 0.8
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        
        this.createZones();
    }
    
    // Zonen erstellen
    createZones() {
        const zoneData = [
            { name: 'Rote Zone', color: 0xff6b6b, pos: [-15, 0, -15], freq: 261.63 },
            { name: 'Grüne Zone', color: 0x4ecdc4, pos: [15, 0, -15], freq: 329.63 },
            { name: 'Blaue Zone', color: 0x45b7d1, pos: [-15, 0, 15], freq: 392.00 },
            { name: 'Gelbe Zone', color: 0xf9ca24, pos: [15, 0, 15], freq: 523.25 },
            { name: 'Lila Zone', color: 0x6c5ce7, pos: [0, 0, 0], freq: 440.00 }
        ];
        
        zoneData.forEach((zone, index) => {
            const geometry = new THREE.CylinderGeometry(6, 6, 0.5, 32);
            const material = new THREE.MeshLambertMaterial({ 
                color: zone.color,
                transparent: true,
                opacity: 0.7,
                emissive: zone.color,
                emissiveIntensity: 0.1
            });
            const platform = new THREE.Mesh(geometry, material);
            platform.position.set(zone.pos[0], zone.pos[1], zone.pos[2]);
            platform.castShadow = true;
            this.scene.add(platform);
            
            const light = new THREE.PointLight(zone.color, 0.5, 15);
            light.position.set(zone.pos[0], zone.pos[1] + 8, zone.pos[2]);
            this.scene.add(light);
            
            this.zones.push({
                name: zone.name,
                color: zone.color,
                position: new THREE.Vector3(zone.pos[0], zone.pos[1], zone.pos[2]),
                frequency: zone.freq,
                radius: 6,
                mesh: platform,
                light: light
            });
        });
    }
    
    // Spieler erstellen
    createPlayer() {
        const group = new THREE.Group();
        
        // Körper
        const bodyGeometry = new THREE.CylinderGeometry(0.4, 0.5, 1.5, 12);
        const bodyMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xff69b4,
            emissive: 0xff69b4,
            emissiveIntensity: 0.3
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.75;
        group.add(body);
        
        // Kopf
        const headGeometry = new THREE.SphereGeometry(0.35, 12, 8);
        const head = new THREE.Mesh(headGeometry, bodyMaterial);
        head.position.y = 1.8;
        group.add(head);
        
        this.player = group;
        this.player.position.set(0, 0, 5);
        this.player.castShadow = true;
        this.scene.add(this.player);
    }
    
    // Spieler aktualisieren
    updatePlayer() {
        if (!this.isStarted) return;

        const moveSpeed = 0.15;
        const moveVector = new THREE.Vector3();

        // Bewegung basierend auf Tastatureingaben
        if (this.keys['KeyW'] || this.keys['ArrowUp']) {
            if (this.isFirstPerson) {
                moveVector.z = -Math.cos(this.cameraRotation.y);
                moveVector.x = -Math.sin(this.cameraRotation.y);
            } else {
                moveVector.z = -1;
            }
        }
        if (this.keys['KeyS'] || this.keys['ArrowDown']) {
            if (this.isFirstPerson) {
                moveVector.z = Math.cos(this.cameraRotation.y);
                moveVector.x = Math.sin(this.cameraRotation.y);
            } else {
                moveVector.z = 1;
            }
        }
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) {
            if (this.isFirstPerson) {
                moveVector.x = -Math.cos(this.cameraRotation.y);
                moveVector.z = Math.sin(this.cameraRotation.y);
            } else {
                moveVector.x = -1;
            }
        }
        if (this.keys['KeyD'] || this.keys['ArrowRight']) {
            if (this.isFirstPerson) {
                moveVector.x = Math.cos(this.cameraRotation.y);
                moveVector.z = -Math.sin(this.cameraRotation.y);
            } else {
                moveVector.x = 1;
            }
        }

        // Bewegung anwenden
        if (moveVector.length() > 0) {
            moveVector.normalize().multiplyScalar(moveSpeed);
            this.player.position.add(moveVector);
            this.position = { x: this.player.position.x, z: this.player.position.z };
            this.sendPlayerMovement();
        }

        // Spieler in First-Person-Ansicht ausblenden
        if (this.isFirstPerson) {
            this.player.visible = false;
        } else {
            this.player.visible = true;
        }

        // Kamera aktualisieren
        this.updateCamera();
        
        // Zonen-Interaktionen prüfen
        this.checkZoneInteractions();
        
        // Andere Spieler aktualisieren
        this.updateOtherPlayers();
    }
    
    // Andere Spieler aktualisieren
    updateOtherPlayers() {
        this.otherPlayers.forEach((player) => {
            if (player.targetPosition) {
                // Sanfte Bewegung
                player.mesh.position.x += (player.targetPosition.x - player.mesh.position.x) * 0.1;
                player.mesh.position.z += (player.targetPosition.z - player.mesh.position.z) * 0.1;
                
                // Namensschild zur Kamera ausrichten
                player.label.lookAt(this.camera.position);
            }
        });
    }
    
    // Kamera aktualisieren
    updateCamera() {
        if (this.isFirstPerson) {
            // First-Person-Ansicht
            const playerPosition = this.player.position.clone();
            playerPosition.y += 1.6; // Augenhöhe
            this.camera.position.copy(playerPosition);
            
            // Kamera-Rotation
            this.camera.rotation.x = this.cameraRotation.x;
            this.camera.rotation.y = this.cameraRotation.y;
        } else {
            // Third-Person-Ansicht
            const playerPosition = this.player.position.clone();
            const cameraOffset = new THREE.Vector3(0, 5, 10);
            this.camera.position.copy(playerPosition).add(cameraOffset);
            this.camera.lookAt(playerPosition);
        }
    }
    
    // Zonen-Interaktionen prüfen
    checkZoneInteractions() {
        if (!this.player) return;
        
        const playerPos = this.player.position;
        const currentActiveZones = new Set();
        
        this.zones.forEach((zone, index) => {
            const distance = playerPos.distanceTo(zone.position);
            
            if (distance < zone.radius) {
                currentActiveZones.add(index);
                
                // Zone betreten
                if (!this.activeZones.has(index)) {
                    this.enterZone(zone, index);
                }
            } else {
                // Zone verlassen
                if (this.activeZones.has(index)) {
                    this.exitZone(zone, index);
                }
            }
        });
        
        this.activeZones = currentActiveZones;
        
        // Zonen-Info anzeigen
        if (this.activeZones.size > 0) {
            const zoneIndex = Array.from(this.activeZones)[0];
            const zone = this.zones[zoneIndex];
            this.showZoneInfo(zone);
            document.getElementById('currentZone').textContent = zone.name;
        } else {
            this.hideZoneInfo();
            document.getElementById('currentZone').textContent = 'Keine';
        }
    }
    
    // Zone betreten
    enterZone(zone, index) {
        console.log('Zone betreten:', zone.name);
        
        // Sound für diese Zone erstellen
        if (this.audioContext && this.audioContext.state === 'running') {
            this.createZoneAudio(zone, index);
        }
        
        // Visuelles Feedback
        zone.mesh.material.emissiveIntensity = 0.5;
        zone.light.intensity = 1.5;
        
        // An Server senden
        this.sendZoneEntered(index);
    }
    
    // Zone verlassen
    exitZone(zone, index) {
        console.log('Zone verlassen:', zone.name);
        
        // Sound stoppen
        this.stopZoneAudio(index);
        
        // Visuelles Feedback zurücksetzen
        zone.mesh.material.emissiveIntensity = 0.1;
        zone.light.intensity = 0.5;
        
        // An Server senden
        this.sendZoneExited(index);
    }
    
    // Zonen-Sound erstellen
    createZoneAudio(zone, index) {
        if (!this.audioContext || this.oscillators.has(index)) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(zone.frequency, this.audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.5);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.masterGain);
            oscillator.start();
            
            this.oscillators.set(index, { oscillator, gainNode });
            
        } catch (error) {
            console.error('Sound konnte nicht erstellt werden:', error);
        }
    }
    
    // Zonen-Sound stoppen
    stopZoneAudio(index) {
        if (!this.audioContext) return;
        
        const audioNodes = this.oscillators.get(index);
        
        if (audioNodes) {
            const { oscillator, gainNode } = audioNodes;
            
            try {
                gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.3);
                
                setTimeout(() => {
                    try {
                        oscillator.stop();
                    } catch (e) {
                        // Oscillator könnte bereits gestoppt sein
                    }
                    this.oscillators.delete(index);
                }, 400);
                
            } catch (error) {
                console.error('Sound konnte nicht gestoppt werden:', error);
                this.oscillators.delete(index);
            }
        }
    }
    
    // Zonen-Info anzeigen
    showZoneInfo(zone) {
        const zoneInfo = document.getElementById('zoneInfo');
        const zoneName = document.getElementById('zoneName');
        const zoneDescription = document.getElementById('zoneDescription');
        
        zoneName.textContent = zone.name;
        zoneDescription.textContent = `♪ Spielt ${zone.frequency.toFixed(1)} Hz ♪`;
        
        if (!zoneInfo.classList.contains('visible')) {
            zoneInfo.classList.add('visible');
        }
    }
    
    // Zonen-Info ausblenden
    hideZoneInfo() {
        const zoneInfo = document.getElementById('zoneInfo');
        zoneInfo.classList.remove('visible');
    }
    
    // Animation
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Spieler aktualisieren
        this.updatePlayer();
        
        // Schwebende Animation für Zonen
        this.zones.forEach((zone, index) => {
            const time = Date.now() * 0.001;
            zone.mesh.position.y = Math.sin(time + index) * 0.1;
            zone.light.position.y = 8 + Math.sin(time + index) * 0.2;
        });
        
        // Rendern
        this.renderer.render(this.scene, this.camera);
    }
    
    // Spieler-Zonen-Sound erstellen
    createPlayerZoneAudio(playerId, zone, zoneIndex) {
        if (!this.audioContext) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(zone.frequency, this.audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.2, this.audioContext.currentTime + 0.5);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.masterGain);
            oscillator.start();
            
            if (!this.playerOscillators.has(playerId)) {
                this.playerOscillators.set(playerId, new Map());
            }
            this.playerOscillators.get(playerId).set(zoneIndex, { oscillator, gainNode });
            
        } catch (error) {
            console.error('Spieler-Sound konnte nicht erstellt werden:', error);
        }
    }
    
    // Spieler-Zonen-Sound stoppen
    stopPlayerZoneAudio(playerId, zoneIndex) {
        if (!this.audioContext) return;
        
        const playerOscillators = this.playerOscillators.get(playerId);
        if (!playerOscillators) return;
        
        const audioNodes = playerOscillators.get(zoneIndex);
        if (audioNodes) {
            const { oscillator, gainNode } = audioNodes;
            
            try {
                gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.3);
                
                setTimeout(() => {
                    try {
                        oscillator.stop();
                    } catch (e) {
                        // Oscillator könnte bereits gestoppt sein
                    }
                    playerOscillators.delete(zoneIndex);
                    if (playerOscillators.size === 0) {
                        this.playerOscillators.delete(playerId);
                    }
                }, 400);
                
            } catch (error) {
                console.error('Spieler-Sound konnte nicht gestoppt werden:', error);
                playerOscillators.delete(zoneIndex);
            }
        }
    }
}

// Spiel initialisieren
console.log('Harmonic Worlds - Multiplayer Edition wird initialisiert...');
const game = new MultiplayerHarmonicWorlds();

const WebSocket = require('ws');
const http = require('http');
const express = require('express');

const app = express();
const server = http.createServer(app);

// WebSocket-Server so konfigurieren, dass Verbindungen von überall erlaubt sind
const wss = new WebSocket.Server({ 
    server,
    // Verbindungen von allen Ursprüngen erlauben (z.B. für ngrok)
    verifyClient: (info, callback) => {
        callback(true);
    }
});

// Statische Dateien (wie index.html, script.js, style.css) bereitstellen
app.use(express.static('./'));

// Räume und Spieler speichern
const rooms = new Map();
const clients = new Map();

wss.on('connection', (ws, req) => {
    console.log('Neue WebSocket-Verbindung von:', req.socket.remoteAddress);
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleMessage(ws, data);
        } catch (error) {
            console.error('Fehler beim Verarbeiten der Nachricht:', error);
        }
    });

    ws.on('close', () => {
        handleDisconnect(ws);
    });
});

// Nachrichten vom Client verarbeiten
function handleMessage(ws, data) {
    switch (data.type) {
        case 'create_room':
        case 'join_room':
            handleJoinRoom(ws, data);
            break;
        case 'player_move':
            handlePlayerMove(ws, data);
            break;
        case 'zone_entered':
            handleZoneEntered(ws, data);
            break;
        case 'zone_exited':
            handleZoneExited(ws, data);
            break;
    }
}

// Spieler einem Raum hinzufügen (oder neuen Raum erstellen)
function handleJoinRoom(ws, data) {
    const { roomId, playerId, playerName } = data;
    
    if (!rooms.has(roomId)) {
        rooms.set(roomId, new Map());
    }
    
    const room = rooms.get(roomId);
    const playerData = {
        id: playerId,
        name: playerName,
        position: { x: 0, z: 5 },
        ws: ws
    };
    
    room.set(playerId, playerData);
    clients.set(ws, { playerId, roomId });
    
    // Bestätigung an den Spieler schicken, dass er im Raum ist
    ws.send(JSON.stringify({
        type: 'room_joined',
        roomId: roomId,
        players: Array.from(room.values()).map(p => ({
            id: p.id,
            name: p.name,
            position: p.position
        }))
    }));
    
    // Allen anderen Spielern im Raum mitteilen, dass ein neuer Spieler beigetreten ist
    broadcastToRoom(roomId, {
        type: 'player_joined',
        player: {
            id: playerId,
            name: playerName,
            position: { x: 0, z: 5 }
        },
        players: Array.from(room.values()).map(p => ({
            id: p.id,
            name: p.name,
            position: p.position
        }))
    }, playerId);
}

// Spielerbewegung verarbeiten und an andere weiterleiten
function handlePlayerMove(ws, data) {
    const clientInfo = clients.get(ws);
    if (!clientInfo) return;
    
    const { roomId, playerId } = clientInfo;
    const room = rooms.get(roomId);
    if (!room) return;
    
    const player = room.get(playerId);
    if (player) {
        player.position = data.position;
        
        broadcastToRoom(roomId, {
            type: 'player_moved',
            playerId: playerId,
            position: data.position
        }, playerId);
    }
}

// Wenn ein Spieler eine Zone betritt, an andere Spieler im Raum weiterleiten
function handleZoneEntered(ws, data) {
    const clientInfo = clients.get(ws);
    if (!clientInfo) return;
    
    broadcastToRoom(clientInfo.roomId, {
        type: 'player_zone_entered',
        playerId: data.playerId,
        zoneIndex: data.zoneIndex
    }, data.playerId);
}

// Wenn ein Spieler eine Zone verlässt, an andere Spieler im Raum weiterleiten
function handleZoneExited(ws, data) {
    const clientInfo = clients.get(ws);
    if (!clientInfo) return;
    
    broadcastToRoom(clientInfo.roomId, {
        type: 'player_zone_exited',
        playerId: data.playerId,
        zoneIndex: data.zoneIndex
    }, data.playerId);
}

// Nachricht an alle Spieler im Raum schicken (außer dem Sender)
function broadcastToRoom(roomId, message, excludePlayerId = null) {
    const room = rooms.get(roomId);
    if (!room) return;
    
    room.forEach((player, playerId) => {
        if (playerId !== excludePlayerId && player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(JSON.stringify(message));
        }
    });
}

// Wenn ein Spieler die Verbindung trennt
function handleDisconnect(ws) {
    const clientInfo = clients.get(ws);
    if (!clientInfo) return;
    
    const { playerId, roomId } = clientInfo;
    const room = rooms.get(roomId);
    
    if (room) {
        room.delete(playerId);
        
        // Allen anderen Spielern mitteilen, dass der Spieler gegangen ist
        broadcastToRoom(roomId, {
            type: 'player_left',
            playerId: playerId,
            players: Array.from(room.values()).map(p => ({
                id: p.id,
                name: p.name,
                position: p.position
            }))
        });
        
        // Wenn der Raum leer ist, löschen
        if (room.size === 0) {
            rooms.delete(roomId);
        }
    }
    
    clients.delete(ws);
}

const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server läuft auf Port ${PORT}`);
    console.log('Um von anderen Geräten zu verbinden, benutze die IP-Adresse deines Computers');
}); 
# Harmonic World

## Übersicht

Dieses Projekt ist ein Multiplayer-Musikspiel, das mit HTML, CSS, JavaScript und Node.js (WebSocket) entwickelt wurde.

## Nutzungsmöglichkeiten

### 1. Lokale Nutzung (mit Multiplayer)

1. **Repository klonen**
   ```
   git clone <dein-repo-link>
   cd Harmonic World
   ```
2. **Abhängigkeiten installieren**
   ```
   npm install
   ```
3. **Server starten**
   ```
   node server.js
   ```
4. **Im Browser öffnen**
   - Rufe im Browser auf: [http://localhost:8080](http://localhost:8080)
   - Jetzt kannst du Räume erstellen und dem Multiplayer-Spiel beitreten.

### 2. Nutzung über GitHub Pages (nur Einzelspieler/ohne Multiplayer)

- Lade die Dateien auf GitHub hoch und aktiviere GitHub Pages im Repository.
- **Achtung:** Multiplayer-Funktionen (Raum erstellen, beitreten) funktionieren auf GitHub Pages **nicht**, da dort kein Node.js-Server/WebSocket läuft.
- Du kannst die statische Seite (z.B. Einzelspieler-Modus oder Demo) nutzen, aber keine Mehrspieler-Features.

## Multiplayer auf einem eigenen Server deployen

Um Multiplayer im Internet zu nutzen, benötigst du einen Node.js-Server, z.B. bei Render, Railway, Glitch oder Heroku.

1. Lade das Projekt auf einen dieser Dienste hoch.
2. Passe ggf. die WebSocket-URL im `script.js` an die Adresse deines Servers an.
3. Starte den Server dort und teile die URL mit deinen Mitspielern.

---

**Hinweis:**
- Multiplayer funktioniert **nicht** auf GitHub Pages!
- Für Multiplayer muss der Server (`server.js`) laufen und erreichbar sein.


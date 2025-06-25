# Harmonic World

## Übersicht

Dieses Projekt ist ein Multiplayer-Musikspiel, das mit HTML, CSS, JavaScript und Node.js (WebSocket) entwickelt wurde. Es ist im Rahmen des zweiten Semesters im Kurs Creative Coding 2 an der Hochschule Furtwangen entstanden.

## Nutzungsmöglichkeiten

### 1. Lokale Nutzung (mit Multiplayer)

1. **Repository klonen**
   ```
   git clone https://github.com/Heutelaune/Harmonic-World/tree/main
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
  
## Anleitung zur Nutzung

So kannst du „Multiplayer Harmonic Worlds“ ausprobieren:

1. **Raum erstellen oder beitreten:**
- Gib einen Raumnamen ein und klicke auf „Raum erstellen“ oder „Raum beitreten“.
- Optional kannst du deinen Namen ändern.

2. **Navigation:**
- Bewege dich mit den Pfeiltasten oder den Tasten **W, A, S, D** durch die Welt.
- Mit einem Klick auf **„Kamera umschalten“** kannst du zwischen Ego- und Drittperson-Perspektive wechseln.

3. **Musik machen:**
- Betrete eine der farbigen Zonen, um einen Ton zu aktivieren.
- Je mehr Spieler in einer Zone sind, desto intensiver wird der Sound.

4. **Mit anderen interagieren:**
- Sieh dir die Liste der aktuellen Spieler an.
- Beobachte, wie sich die anderen bewegen und welche Zonen sie betreten.

## Multiplayer auf einem eigenen Server deployen

Um Multiplayer im Internet zu nutzen, benötigst du einen Node.js-Server, z.B. bei Render, Railway, Glitch oder Heroku.

1. Lade das Projekt auf einen dieser Dienste hoch.
2. Passe ggf. die WebSocket-URL im `script.js` an die Adresse deines Servers an.
3. Starte den Server dort und teile die URL mit deinen Mitspielern.

---

**Hinweis:**
- Multiplayer funktioniert **nicht** auf GitHub Pages!
- Für Multiplayer muss der Server (`server.js`) laufen und erreichbar sein.

1. Prerequisites
Ensure you have Node.js installed on your machine. This will provide npm (Node Package Manager) to handle dependencies and run the application.

2. Project Structure

Create a new directory for your project and organize your files as follows:
bounce-game/
├── package.json
├── main.js
├── index.html
└── game.js

3. Configuration & Code
Step 1: package.json
This file manages your project metadata and dependencies. Run npm init -y in your terminal to generate it, then update it to include the electron dependency and start script.

{
  "name": "bounce-collect",
  "version": "1.0.0",
  "description": "A standalone bouncing ball collection game.",
  "main": "main.js",
  "scripts": {
    "start": "electron ."
  },
  "devDependencies": {
    "electron": "^28.0.0"
  }
}

Step 2: main.js (Electron Main Process)
This script controls the application lifecycle and creates the native window.

javascript
 Show full code block 
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 650,
    height: 550,
    resizable: false, // Ensures game logic remains consistent with canvas size
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
Step 3: index.html (The UI Layer)
The entry point for the visual interface.

html
 Show full code block 
<!DOCTYPE html>
<html>
<head>
    <title>Bounce & Collect</title>
    <style>
        body { 
            background: #1a1a1a; 
            margin: 0; 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            font-family: 'Segoe UI', sans-serif;
            color: white;
            overflow: hidden;
        }
        .header { margin-top: 20px; margin-bottom: 10px; }
        canvas { 
            background: #2c3e50; 
            border: 5px solid #34495e; 
            border-radius: 4px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .stats { font-size: 1.2rem; font-weight: bold; }
        .hint { color: #95a5a6; font-size: 0.9rem; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <span class="stats">Level: <span id="lvl">1</span> | Coins: <span id="cnt">0</span>/3</span>
    </div>
    <canvas id="gameCanvas" width="600" height="400"></canvas>
    <p class="hint">The ball bounces automatically. Collect all coins to unlock the exit!</p>
    <script src="game.js"></script>
</body>
</html>
Step 4: game.js (The Game Engine)
Using a class-based structure for better state management.

javascript
 Show full code block 
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const lvlText = document.getElementById('lvl');
const cntText = document.getElementById('cnt');

class Game {
    constructor() {
        this.level = 1;
        this.resetLevel();
    }

    resetLevel() {
        this.player = {
            x: 50,
            y: 50,
            r: 12,
            vx: 3 + this.level,
            vy: 3 + this.level,
            color: '#1abc9c'
        };

        this.coins = [];
        this.coinsCollected = 0;
        this.exit = { x: 530, y: 330, w: 40, h: 40, open: false };

        lvlText.innerText = this.level;
        cntText.innerText = "0";

        for (let i = 0; i < 3; i++) {
            this.coins.push({
                x: 50 + Math.random() * (canvas.width - 100),
                y: 50 + Math.random() * (canvas.height - 100),
                r: 8
            });
        }
    }

    update() {
        this.player.x += this.player.vx;
        this.player.y += this.player.vy;

        // Boundary Bouncing
        if (this.player.x + this.player.r > canvas.width || this.player.x - this.player.r < 0) this.player.vx *= -1;
        if (this.player.y + this.player.r > canvas.height || this.player.y - this.player.r < 0) this.player.vy *= -1;

        // Coin Collision
        this.coins = this.coins.filter(coin => {
            const dist = Math.hypot(this.player.x - coin.x, this.player.y - coin.y);
            if (dist < this.player.r + coin.r) {
                this.coinsCollected++;
                cntText.innerText = this.coinsCollected;
                if (this.coinsCollected >= 3) this.exit.open = true;
                return false;
            }
            return true;
        });

        // Exit Collision
        if (this.exit.open) {
            if (this.player.x > this.exit.x && this.player.x < this.exit.x + this.exit.w &&
                this.player.y > this.exit.y && this.player.y < this.exit.y + this.exit.h) {
                this.level++;
                this.resetLevel();
            }
        }
    }

    draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Render Exit
        ctx.fillStyle = this.exit.open ? '#2ecc71' : '#c0392b';
        ctx.fillRect(this.exit.x, this.exit.y, this.exit.w, this.exit.h);

        // Render Coins
        this.coins.forEach(coin => {
            ctx.beginPath();
            ctx.arc(coin.x, coin.y, coin.r, 0, Math.PI * 2);
            ctx.fillStyle = '#f1c40f';
            ctx.fill();
            ctx.closePath();
        });

        // Render Player
        ctx.beginPath();
        ctx.arc(this.player.x, this.player.y, this.player.r, 0, Math.PI * 2);
        ctx.fillStyle = this.player.color;
        ctx.fill();
        ctx.stroke();
        ctx.closePath();
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }
}

const game = new Game();
game.loop();
4. Execution
Open your terminal in the bounce-game folder.
Install Electron:
bash
npm install
Launch the application:
bash
npm start
5. Engineering Insights
Encapsulation: Using a Game class allows you to maintain the "State" (level, score, player position) separately from the global scope, making it easier to add features like a pause menu or multiple players.
Collision Detection: The use of Math.hypot is the most performant and mathematically accurate way to check for collisions between circular objects.
Scalability: To convert this into a production-ready game, consider using Electron-Builder to compile the code into a single executable (.exe or .app) file.
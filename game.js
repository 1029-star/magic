const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const lvlText = document.getElementById('lvl');
const cntText = document.getElementById('cnt');
const menuScreen = document.getElementById('menuScreen');
const gameScreen = document.getElementById('gameScreen');
const levelsGrid = document.getElementById('levelsGrid');
const backBtn = document.getElementById('backBtn');

// Number of available levels
const TOTAL_LEVELS = 10;

class Game {
    constructor() {
        this.level = 1;
        this.gameRunning = false;
        this.ballLaunched = false;
        this.animationId = null;
        this.launchDirection = { x: 1, y: 1 }; // Default direction: down-right
        this.resetLevel();
    }

    resetLevel() {
        const speed = 3 + this.level;
        this.player = {
            x: 50,
            y: 50,
            r: 12,
            vx: speed,
            vy: speed,
            color: '#1abc9c'
        };
        this.launchVx = speed;
        this.launchVy = speed;

        this.coins = [];
        this.coinsCollected = 0;
        this.exit = { x: 530, y: 330, w: 40, h: 40, open: false };
        this.ballLaunched = false;

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

    startLevel(levelNum) {
        this.level = levelNum;
        this.gameRunning = true;
        this.resetLevel();
        
        // Hide menu, show game
        menuScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        
        this.loop();
    }

    update() {
        // Only move the ball if launched
        if (!this.ballLaunched) {
            return;
        }

        // Update velocity based on held keys (allow mid-air direction changes)
        const speed = 3 + this.level;
        let newVx = this.player.vx;
        let newVy = this.player.vy;
        
        // Get current direction from held keys
        let dirX = 0, dirY = 0;
        if (keysPressed['KeyW']) dirY -= 1;
        if (keysPressed['KeyS']) dirY += 1;
        if (keysPressed['KeyA']) dirX -= 1;
        if (keysPressed['KeyD']) dirX += 1;
        if (keysPressed['KeyQ']) { dirX -= 1; dirY -= 1; }
        if (keysPressed['KeyE']) { dirX += 1; dirY -= 1; }
        if (keysPressed['KeyZ']) { dirX -= 1; dirY += 1; }
        if (keysPressed['KeyX']) { dirX += 1; dirY += 1; }
        if (keysPressed['KeyC']) { dirX = 0; dirY = 0; }
        
        // Apply new direction if keys are held
        if (dirX !== 0 || dirY !== 0) {
            // Normalize diagonal movement
            const magnitude = Math.sqrt(dirX * dirX + dirY * dirY);
            newVx = (dirX / magnitude) * speed;
            newVy = (dirY / magnitude) * speed;
            this.player.vx = newVx;
            this.player.vy = newVy;
        }

        this.player.x += this.player.vx;
        this.player.y += this.player.vy;

        // Boundary Bouncing
        if (this.player.x + this.player.r > canvas.width || this.player.x - this.player.r < 0) this.player.vx *= -1;
        if (this.player.y + this.player.r > canvas.height || this.player.y - this.player.r < 0) this.player.vy *= -1;

        // Door Collision (bounce off locked door)
        if (!this.exit.open) {
            const doorX = this.exit.x;
            const doorY = this.exit.y;
            const doorW = this.exit.w;
            const doorH = this.exit.h;

            // Check if ball is colliding with door
            if (this.player.x + this.player.r > doorX && this.player.x - this.player.r < doorX + doorW &&
                this.player.y + this.player.r > doorY && this.player.y - this.player.r < doorY + doorH) {
                
                // Determine which side was hit and bounce accordingly
                const overlapLeft = (this.player.x + this.player.r) - doorX;
                const overlapRight = (doorX + doorW) - (this.player.x - this.player.r);
                const overlapTop = (this.player.y + this.player.r) - doorY;
                const overlapBottom = (doorY + doorH) - (this.player.y - this.player.r);

                const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

                if (minOverlap === overlapLeft || minOverlap === overlapRight) {
                    this.player.vx *= -1;
                } else {
                    this.player.vy *= -1;
                }
            }
        }

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
                // Level complete - check if there's a next level
                if (this.level < TOTAL_LEVELS) {
                    this.level++;
                    this.resetLevel();
                } else {
                    // Game complete!
                    this.completeGame();
                }
            }
        }
    }

    draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Render Exit (Door on Ledge)
        this.drawDoorOnLedge();

        // Render Coins
        this.coins.forEach(coin => {
            ctx.beginPath();
            ctx.arc(coin.x, coin.y, coin.r, 0, Math.PI * 2);
            ctx.fillStyle = '#f1c40f';
            ctx.fill();
            ctx.strokeStyle = '#f39c12';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.closePath();
        });

        // Render Player
        ctx.beginPath();
        ctx.arc(this.player.x, this.player.y, this.player.r, 0, Math.PI * 2);
        ctx.fillStyle = this.player.color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();

        // Draw launch indicator if ball not launched
        if (!this.ballLaunched) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Use WSAD/QEZXC to aim, then SPACE to launch', canvas.width / 2, 25);

            // Draw direction indicator (arrow showing launch direction)
            const arrowX = canvas.width / 2;
            const arrowY = canvas.height - 40;
            const arrowLength = 30;
            const arrowSize = 8;

            // Draw direction arrow
            ctx.strokeStyle = '#1abc9c';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(arrowX, arrowY);
            ctx.lineTo(
                arrowX + this.launchDirection.x * arrowLength,
                arrowY + this.launchDirection.y * arrowLength
            );
            ctx.stroke();

            // Draw arrowhead
            const angle = Math.atan2(this.launchDirection.y, this.launchDirection.x);
            ctx.fillStyle = '#1abc9c';
            ctx.beginPath();
            ctx.moveTo(
                arrowX + this.launchDirection.x * arrowLength,
                arrowY + this.launchDirection.y * arrowLength
            );
            ctx.lineTo(
                arrowX + this.launchDirection.x * arrowLength - arrowSize * Math.cos(angle - Math.PI / 6),
                arrowY + this.launchDirection.y * arrowLength - arrowSize * Math.sin(angle - Math.PI / 6)
            );
            ctx.lineTo(
                arrowX + this.launchDirection.x * arrowLength - arrowSize * Math.cos(angle + Math.PI / 6),
                arrowY + this.launchDirection.y * arrowLength - arrowSize * Math.sin(angle + Math.PI / 6)
            );
            ctx.fill();
        }
    }

    drawDoorOnLedge() {
        const doorX = this.exit.x;
        const doorY = this.exit.y;
        const doorW = this.exit.w;
        const doorH = this.exit.h;
        const ledgeH = 8;

        // Draw ledge/platform
        ctx.fillStyle = '#8b7355';
        ctx.fillRect(doorX - 5, doorY + doorH, doorW + 10, ledgeH);
        
        // Add shadow on ledge
        ctx.fillStyle = '#6b5345';
        ctx.fillRect(doorX - 5, doorY + doorH + ledgeH, doorW + 10, 3);

        if (this.exit.open) {
            // Draw open door (swung open to the right)
            // Empty doorway/frame
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(doorX + 2, doorY + 2, doorW - 4, doorH - 4);

            // Door frame
            ctx.strokeStyle = '#34495e';
            ctx.lineWidth = 4;
            ctx.strokeRect(doorX, doorY, doorW, doorH);

            // Open door panel (swung to the right side)
            ctx.fillStyle = '#27ae60';
            ctx.save();
            ctx.translate(doorX + doorW, doorY);
            ctx.fillRect(0, 0, 8, doorH);
            
            // Door panels/texture
            ctx.strokeStyle = '#229954';
            ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
                ctx.strokeRect(2, 5 + i * (doorH / 3), 4, doorH / 3 - 5);
            }
            ctx.restore();

            // Exit arrow
            ctx.fillStyle = '#ecf0f1';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('→', doorX + doorW / 2, doorY + doorH / 2);

            // Glow effect
            ctx.shadowColor = 'rgba(46, 204, 113, 0.8)';
            ctx.shadowBlur = 10;
            ctx.strokeStyle = 'rgba(46, 204, 113, 0.6)';
            ctx.lineWidth = 2;
            ctx.strokeRect(doorX - 2, doorY - 2, doorW + 4, doorH + 4);
            ctx.shadowColor = 'transparent';
        } else {
            // Draw locked door
            // Door
            ctx.fillStyle = '#8b4513';
            ctx.fillRect(doorX, doorY, doorW, doorH);
            
            // Door frame
            ctx.strokeStyle = '#5d2e0f';
            ctx.lineWidth = 3;
            ctx.strokeRect(doorX, doorY, doorW, doorH);

            // Door handle
            ctx.fillStyle = '#d4af37';
            ctx.beginPath();
            ctx.arc(doorX + doorW - 8, doorY + doorH / 2, 3, 0, Math.PI * 2);
            ctx.fill();

            // Lock symbol
            ctx.strokeStyle = '#d4af37';
            ctx.lineWidth = 2;
            
            // Lock body (circle)
            ctx.beginPath();
            ctx.arc(doorX + doorW / 2, doorY + doorH / 2 + 2, 6, 0, Math.PI * 2);
            ctx.stroke();
            
            // Lock shackle (U-shape)
            ctx.beginPath();
            ctx.arc(doorX + doorW / 2, doorY + doorH / 2 - 2, 8, Math.PI, 0, false);
            ctx.stroke();

            // "LOCKED" text
            ctx.fillStyle = '#c0392b';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('LOCKED', doorX + doorW / 2, doorY + 10);
        }
    }

    loop() {
        if (this.gameRunning) {
            this.update();
            this.draw();
            this.animationId = requestAnimationFrame(() => this.loop());
        }
    }

    stopGame() {
        this.gameRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }

    completeGame() {
        this.stopGame();
        alert('🎉 Congratulations! You completed all levels!');
        this.returnToMenu();
    }

    returnToMenu() {
        this.stopGame();
        gameScreen.classList.add('hidden');
        menuScreen.classList.remove('hidden');
    }

    launchBall() {
        if (!this.ballLaunched) {
            this.ballLaunched = true;
            const speed = 3 + this.level;
            this.player.vx = this.launchDirection.x * speed;
            this.player.vy = this.launchDirection.y * speed;
        }
    }

    setLaunchDirection(dirX, dirY) {
        // Allow direction changes anytime (before or after launch)
        this.launchDirection = { x: dirX, y: dirY };
    }
}

const game = new Game();

// Initialize menu
function initializeMenu() {
    levelsGrid.innerHTML = '';
    for (let i = 1; i <= TOTAL_LEVELS; i++) {
        const btn = document.createElement('button');
        btn.className = 'level-btn';
        btn.innerText = i;
        btn.onclick = () => game.startLevel(i);
        levelsGrid.appendChild(btn);
    }
}

// Back button handler
backBtn.addEventListener('click', () => {
    game.returnToMenu();
});

// Launch ball with Space or Enter key
const keysPressed = {};

document.addEventListener('keydown', (e) => {
    // Track all direction keys as pressed
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'KeyZ', 'KeyX', 'KeyC'].includes(e.code)) {
        keysPressed[e.code] = true;
        e.preventDefault();
        
        // Update preview direction before launch
        if (game.gameRunning && !game.ballLaunched) {
            let dirX = 0, dirY = 0;
            if (keysPressed['KeyW']) dirY -= 1;
            if (keysPressed['KeyS']) dirY += 1;
            if (keysPressed['KeyA']) dirX -= 1;
            if (keysPressed['KeyD']) dirX += 1;
            if (keysPressed['KeyQ']) { dirX -= 1; dirY -= 1; }
            if (keysPressed['KeyE']) { dirX += 1; dirY -= 1; }
            if (keysPressed['KeyZ']) { dirX -= 1; dirY += 1; }
            if (keysPressed['KeyX']) { dirX += 1; dirY += 1; }
            if (keysPressed['KeyC']) { dirX = 0; dirY = 0; }
            
            if (dirX !== 0 || dirY !== 0) {
                const magnitude = Math.sqrt(dirX * dirX + dirY * dirY);
                game.launchDirection = { x: dirX / magnitude, y: dirY / magnitude };
            }
        }
        return;
    }
    
    // Handle launch trigger (Space or Enter)
    if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (game.gameRunning && !game.ballLaunched) {
            game.launchBall();
        }
    }
});

document.addEventListener('keyup', (e) => {
    // Track key releases
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'KeyZ', 'KeyX', 'KeyC'].includes(e.code)) {
        keysPressed[e.code] = false;
    }
});

// Launch ball with click on canvas
canvas.addEventListener('click', () => {
    if (game.gameRunning && !game.ballLaunched) {
        game.launchBall();
    }
});

// Initialize the menu on page load
initializeMenu();
game.loop();

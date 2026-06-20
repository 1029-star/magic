const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const lvlText = document.getElementById('lvl');
const cntText = document.getElementById('cnt');
const cntTotalText = document.getElementById('cntTotal');
const menuScreen = document.getElementById('menuScreen');
const shopScreen = document.getElementById('shopScreen');
const gameScreen = document.getElementById('gameScreen');
const levelsGrid = document.getElementById('levelsGrid');
const shopGrid = document.getElementById('shopGrid');
const shopBtn = document.getElementById('shopBtn');
const shopPrevPageBtn = document.getElementById('shopPrevPage');
const shopNextPageBtn = document.getElementById('shopNextPage');
const shopPageLabel = document.getElementById('shopPageLabel');
const settingsScreen = document.getElementById('settingsScreen');
const settingsBtn = document.getElementById('settingsBtn');
const backSettingsBtn = document.getElementById('backSettingsBtn');
const backBtn = document.getElementById('backBtn');
const resetBtn = document.getElementById('resetBtn');
const backShopBtn = document.getElementById('backShopBtn');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageLabel = document.getElementById('pageLabel');
const walletText = document.getElementById('wallet');
const walletShopText = document.getElementById('walletShop');
const unlockedCountText = document.getElementById('unlockedCount');
const totalCountText = document.getElementById('totalCount');

// Number of available levels
const TOTAL_LEVELS = 48;
const LEVELS_PER_PAGE = 12;
const DIRECTION_CHANGE_COOLDOWN_MS = 3000; // 3s cooldown between direction changes

let settingsClickCount = 0;
let lastSettingsClickTime = 0;
let developerModeEnabled = false;
let currentMenuPage = 1;
const PROGRESS_DATA_KEY = 'magicProgress';

const SHOP_ITEMS = [
    { id: 'defaultTrail', type: 'trail', name: 'Default Trail', description: 'The starting simple white trail.', cost: 0 },
    { id: 'defaultCostume', type: 'costume', name: 'Default Costume', description: 'The classic red ball look.', cost: 0 },
    { id: 'sparkTrail', type: 'trail', name: 'Spark Trail', description: 'Leaves a bright blue spark trail as you move.', cost: 5 },
    { id: 'rainbowTrail', type: 'trail', name: 'Rainbow Trail', description: 'A colorful streak follows the ball with every bounce.', cost: 8 },
    { id: 'fireTrail', type: 'trail', name: 'Fire Trail', description: 'A blazing flame trail that flickers behind you.', cost: 7 },
    { id: 'iceTrail', type: 'trail', name: 'Ice Trail', description: 'A cool icy trail with a frosty glow.', cost: 7 },
    { id: 'shadowCostume', type: 'costume', name: 'Shadow Costume', description: 'A sleek dark costume with a glowing outline.', cost: 6 },
    { id: 'goldenCostume', type: 'costume', name: 'Golden Costume', description: 'A shiny gold look that glows when moving.', cost: 10 },
    { id: 'neonCostume', type: 'costume', name: 'Neon Costume', description: 'Bright neon lines pulse around the ball.', cost: 7 },
    { id: 'ghostCostume', type: 'costume', name: 'Ghost Costume', description: 'A ghostly pale look that leaves a soft trail.', cost: 8 }
];

const DEFAULT_PROGRESS = {
    unlockedLevel: 1,
    wallet: 0,
    ownedItems: ['defaultTrail', 'defaultCostume'],
    equippedTrail: 'defaultTrail',
    equippedCostume: 'defaultCostume'
};

let progress = loadProgress();

function loadProgress() {
    if (typeof localStorage === 'undefined') return { ...DEFAULT_PROGRESS };
    try {
        const raw = localStorage.getItem(PROGRESS_DATA_KEY);
        if (!raw) return { ...DEFAULT_PROGRESS };
        const stored = JSON.parse(raw);
        const loaded = {
            unlockedLevel: Math.min(TOTAL_LEVELS, Math.max(1, stored.unlockedLevel || 1)),
            wallet: Math.max(0, stored.wallet || 0),
            ownedItems: Array.isArray(stored.ownedItems) ? stored.ownedItems : [...DEFAULT_PROGRESS.ownedItems],
            equippedTrail: typeof stored.equippedTrail === 'string' ? stored.equippedTrail : 'defaultTrail',
            equippedCostume: typeof stored.equippedCostume === 'string' ? stored.equippedCostume : 'defaultCostume'
        };
        if (!loaded.ownedItems.includes('defaultTrail')) loaded.ownedItems.push('defaultTrail');
        if (!loaded.ownedItems.includes('defaultCostume')) loaded.ownedItems.push('defaultCostume');
        return loaded;
    } catch (error) {
        return { ...DEFAULT_PROGRESS };
    }
}

function saveProgress() {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(PROGRESS_DATA_KEY, JSON.stringify(progress));
    } catch (error) {
        // Ignore storage failures
    }
}

function resetProgressData() {
    if (!confirm('Reset all progress, costumes, trails, and unlocked levels?')) return;
    progress = { ...DEFAULT_PROGRESS };
    saveProgress();
    currentMenuPage = 1;
    game.unlockedLevels = progress.unlockedLevel;
    if (settingsScreen) settingsScreen.classList.add('hidden');
    if (menuScreen) menuScreen.classList.remove('hidden');
    showMenuPage(1);
    updateMenuStats();
    updateShopUI();
}

function addWallet(amount) {
    progress.wallet = Math.max(0, progress.wallet + amount);
    saveProgress();
    updateMenuStats();
}

function toggleDeveloperToolsVisibility() {
    const developerToolsDiv = document.getElementById('developerTools');
    if (developerToolsDiv) {
        if (developerModeEnabled) {
            developerToolsDiv.classList.remove('hidden');
        } else {
            developerToolsDiv.classList.add('hidden');
        }
    }
}

function unlockAllLevels() {
    progress.unlockedLevel = TOTAL_LEVELS;
    saveProgress();
    game.unlockedLevels = TOTAL_LEVELS;
    updateMenuStats();
    showMenuPage(currentMenuPage);
    alert('All levels unlocked!');
}

function unlockAllItems() {
    progress.ownedItems = SHOP_ITEMS.map(item => item.id);
    saveProgress();
    updateShopUI();
    alert('All shop items unlocked!');
}


function buyShopItem(itemId) {
    const item = SHOP_ITEMS.find(item => item.id === itemId);
    if (!item || progress.ownedItems.includes(itemId) || progress.wallet < item.cost) return;
    progress.wallet -= item.cost;
    progress.ownedItems.push(itemId);
    saveProgress();
    updateMenuStats();
    updateShopUI();
}

function equipShopItem(itemId) {
    if (!progress.ownedItems.includes(itemId)) return;
    const item = SHOP_ITEMS.find(item => item.id === itemId);
    if (!item) return;

    if (item.type === 'trail') {
        progress.equippedTrail = itemId;
    } else if (item.type === 'costume') {
        progress.equippedCostume = itemId;
    }
    saveProgress();
    updateShopUI();
}

function updateMenuStats() {
    if (unlockedCountText) unlockedCountText.innerText = String(progress.unlockedLevel);
    if (totalCountText) totalCountText.innerText = String(TOTAL_LEVELS);
    if (walletText) walletText.innerText = String(progress.wallet);
    if (walletShopText) walletShopText.innerText = String(progress.wallet);
    updateMenuButtons();
}

function updateShopUI() {
    if (!shopGrid) return;
    shopGrid.innerHTML = '';
    const allowedType = shopPage === 'costume' ? 'costume' : 'trail';

    SHOP_ITEMS.filter(item => item.type === allowedType).forEach(item => {
        const card = document.createElement('div');
        card.className = 'shop-card';
        if (progress.ownedItems.includes(item.id)) card.classList.add('owned');
        if ((item.type === 'trail' && progress.equippedTrail === item.id) ||
            (item.type === 'costume' && progress.equippedCostume === item.id)) {
            card.classList.add('equipped');
        }

        const title = document.createElement('h3');
        title.textContent = item.name;
        card.appendChild(title);

        const desc = document.createElement('p');
        desc.textContent = item.description;
        card.appendChild(desc);

        const costLine = document.createElement('small');
        costLine.textContent = `Cost: ${item.cost} coins`;
        card.appendChild(costLine);

        const button = document.createElement('button');
        if (progress.ownedItems.includes(item.id)) {
            button.textContent = progress.equippedTrail === item.id || progress.equippedCostume === item.id ? 'Equipped' : 'Equip';
            button.className = 'equip';
            button.disabled = progress.equippedTrail === item.id || progress.equippedCostume === item.id;
            button.addEventListener('click', () => equipShopItem(item.id));
        } else {
            button.textContent = `Buy (${item.cost})`;
            button.className = 'buy';
            button.disabled = progress.wallet < item.cost;
            button.addEventListener('click', () => buyShopItem(item.id));
        }
        card.appendChild(button);
        shopGrid.appendChild(card);
    });
}

function getPlayerColor() {
    if (progress.equippedCostume === 'shadowCostume') return '#34495e';
    if (progress.equippedCostume === 'goldenCostume') return '#f1c40f';
    if (progress.equippedCostume === 'neonCostume') return '#ff49dc';
    if (progress.equippedCostume === 'ghostCostume') return '#dfe7f5';
    return '#e74c3c';
}

function getTrailColor(alpha = 1) {
    if (progress.equippedTrail === 'rainbowTrail') return null;
    if (progress.equippedTrail === 'sparkTrail') return `rgba(52, 152, 219, ${alpha})`;
    if (progress.equippedTrail === 'fireTrail') return `rgba(241, 196, 15, ${alpha})`;
    if (progress.equippedTrail === 'iceTrail') return `rgba(174, 214, 241, ${alpha})`;
    return `rgba(255, 255, 255, ${alpha})`;
}

const LEVEL_PRESETS = Array.from({ length: TOTAL_LEVELS }, (_, index) => {
    const level = index + 1;
    const coinCount = 3 + Math.floor(index / 5);
    const exitX = 520 - (index % 4) * 80;
    const exitY = 320 - Math.floor(index / 6) * 30;
    const coins = Array.from({ length: coinCount }, (__, coinIndex) => ({
        x: 80 + ((level * 73 + coinIndex * 111) % 450),
        y: 80 + ((level * 59 + coinIndex * 97) % 230),
        r: 8
    }));

    const obstacles = [];
    if (level >= 5) { // Bouncers start from level 5
        const count = Math.min(8, Math.floor(level / 5) + 1); // More bouncers as levels increase
        for (let i = 0; i < count; i++) {
            const obs = { // Base bouncer properties
                x: 150 + (level * 47 + i * 110) % 300,
                y: 100 + (level * 13 + i * 70) % 150,
                w: 80,
                h: 25,
                type: 'bouncer'
            };
            if (level >= 25) { // Moving bouncers from level 25
                obs.vx = 2 + (level - 25) * 0.1; // Increase speed with level
                if (level >= 35) { // Vertical movement for some bouncers from level 35
                    obs.vy = 1.5 + (level - 35) * 0.1;
                }
            }
            obstacles.push(obs);
        }
    }
    if (level >= 10) { // Hazards start from level 10
        const count = Math.min(6, Math.floor(level / 8)); // More hazards as levels increase
        for (let i = 0; i < count; i++) {
            const obs = { // Base hazard properties
                x: 100 + (level * 29 + i * 180) % 400,
                y: 50 + (level * 37 + i * 90) % 100,
                w: 20,
                h: 120,
                type: 'hazard'
            };
            if (level >= 42) { // Moving hazards from level 42
                obs.vx = 2.5 + (level - 42) * 0.15; // Increase speed with level
                if (i % 2 === 0) obs.vy = 1.5 + (level - 42) * 0.1; // Some hazards move vertically
            }
            obstacles.push(obs);
        }
    }

    return {
        speed: 3 + level * 0.4, // Steeper speed increase
        playerStart: {
            x: 50 + (index % 4) * 20,
            y: 50 + Math.floor(index / 12) * 15
        },
        exit: {
            x: exitX,
            y: exitY,
            w: 40,
            h: 40
        },
        coins,
        obstacles
    };
});

class Game {
    constructor() {
        this.level = 1;
        this.unlockedLevels = progress.unlockedLevel;
        this.gameRunning = false;
        this.ballLaunched = false;
        this.animationId = null;
        this.launchDirection = { x: 1, y: 1 }; // Default direction: down-right
        this.trailPoints = [];
        this.resetLevel();
    }

    resetLevel() {
        const config = LEVEL_PRESETS[this.level - 1];
        const speed = config.speed;
        this.player = {
            x: config.playerStart.x,
            y: config.playerStart.y,
            r: 12,
            vx: speed,
            vy: speed,
            color: getPlayerColor()
        };
        this.trailPositions = [];
        this.launchVx = speed;
        this.launchVy = speed;

        this.coins = config.coins.map(coin => ({ ...coin }));
        this.obstacles = config.obstacles.map(obs => ({ ...obs }));
        this.coinsCollected = 0;
        this.requiredCoins = this.coins.length;
        this.exit = { ...config.exit, open: false };
        this.ballLaunched = false;
        this.directionChangeBlockedUntil = 0;
        this.trailPoints = [{ x: this.player.x, y: this.player.y }];

        lvlText.innerText = this.level;
        cntText.innerText = '0';
        if (cntTotalText) cntTotalText.innerText = String(this.requiredCoins);
    }

    startLevel(levelNum) {
        if (levelNum > this.unlockedLevels) {
            return;
        }

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

        // Move obstacles if they have velocity
        this.obstacles.forEach(obs => {
            if (obs.vx) {
                obs.x += obs.vx;
                if (obs.x <= 0 || obs.x + obs.w >= canvas.width) obs.vx *= -1;
            }
            if (obs.vy) {
                obs.y += obs.vy;
                if (obs.y <= 0 || obs.y + obs.h >= canvas.height) obs.vy *= -1;
            }
        });

        // Update velocity based on held keys (allow mid-air direction changes for a short time)
        const speed = LEVEL_PRESETS[this.level - 1].speed;
        let newVx = this.player.vx;
        let newVy = this.player.vy;
        const now = performance.now();
        const canChangeDirection = !this.ballLaunched || (now >= this.directionChangeBlockedUntil);

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

        // Apply new direction if keys are held and direction changes are still allowed
        if (canChangeDirection && (dirX !== 0 || dirY !== 0)) {
            const magnitude = Math.sqrt(dirX * dirX + dirY * dirY);
            newVx = (dirX / magnitude) * speed;
            newVy = (dirY / magnitude) * speed;
            this.player.vx = newVx;
            this.player.vy = newVy;
            // start cooldown so player can't change direction again immediately
            this.directionChangeBlockedUntil = now + DIRECTION_CHANGE_COOLDOWN_MS;
        }

        this.player.x += this.player.vx;
        this.player.y += this.player.vy;
        this.trailPoints.push({ x: this.player.x, y: this.player.y });
        if (this.trailPoints.length > 28) this.trailPoints.shift();

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

        // Obstacle Collisions
        this.obstacles.forEach(obs => {
            if (this.player.x + this.player.r > obs.x && this.player.x - this.player.r < obs.x + obs.w &&
                this.player.y + this.player.r > obs.y && this.player.y - this.player.r < obs.y + obs.h) {
                
                if (obs.type === 'bouncer') {
                    const overlapLeft = (this.player.x + this.player.r) - obs.x;
                    const overlapRight = (obs.x + obs.w) - (this.player.x - this.player.r);
                    const overlapTop = (this.player.y + this.player.r) - obs.y;
                    const overlapBottom = (obs.y + obs.h) - (this.player.y - this.player.r);

                    const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

                    if (minOverlap === overlapLeft) {
                        this.player.vx = -Math.abs(this.player.vx);
                        this.player.x = obs.x - this.player.r;
                    } else if (minOverlap === overlapRight) {
                        this.player.vx = Math.abs(this.player.vx);
                        this.player.x = obs.x + obs.w + this.player.r;
                    } else if (minOverlap === overlapTop) {
                        this.player.vy = -Math.abs(this.player.vy);
                        this.player.y = obs.y - this.player.r;
                    } else if (minOverlap === overlapBottom) {
                        this.player.vy = Math.abs(this.player.vy);
                        this.player.y = obs.y + obs.h + this.player.r;
                    }
                } else if (obs.type === 'hazard') {
                    this.resetLevel();
                }
            }
        });

        // Coin Collision
        this.coins = this.coins.filter(coin => {
            const dist = Math.hypot(this.player.x - coin.x, this.player.y - coin.y);
            if (dist < this.player.r + coin.r) {
                this.coinsCollected++;
                cntText.innerText = this.coinsCollected;
                if (this.coinsCollected >= this.requiredCoins) this.exit.open = true;
                return false;
            }
            return true;
        });

        // Exit Collision
        if (this.exit.open) {
            if (this.player.x > this.exit.x && this.player.x < this.exit.x + this.exit.w &&
                this.player.y > this.exit.y && this.player.y < this.exit.y + this.exit.h) {
                if (this.level < TOTAL_LEVELS) {
                    this.unlockLevel(this.level + 1);
                    this.level++;
                    this.resetLevel();
                } else {
                    this.completeGame();
                }
            }
        }
    }

    draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Render Obstacles
        this.obstacles.forEach(obs => {
            ctx.fillStyle = obs.type === 'bouncer' ? '#95a5a6' : '#e74c3c';
            ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
        });

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

        // Render Trail
        if (this.trailPoints.length > 1) {
            ctx.save();
            ctx.lineWidth = 8;
            ctx.lineCap = 'round';
            ctx.globalCompositeOperation = 'lighter';
            for (let i = 1; i < this.trailPoints.length; i++) {
                const start = this.trailPoints[i - 1];
                const end = this.trailPoints[i];
                const alpha = i / this.trailPoints.length;
                const color = progress.equippedTrail === 'rainbowTrail'
                    ? `hsla(${(i / this.trailPoints.length) * 360}, 100%, 60%, ${alpha * 0.7})`
                    : getTrailColor(alpha * 0.7);
                ctx.strokeStyle = color;
                ctx.beginPath();
                ctx.moveTo(start.x, start.y);
                ctx.lineTo(end.x, end.y);
                ctx.stroke();
                ctx.closePath();
            }
            ctx.restore();
        }

        // Render Player
        ctx.beginPath();
        ctx.arc(this.player.x, this.player.y, this.player.r, 0, Math.PI * 2);
        ctx.fillStyle = getPlayerColor();
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

    unlockLevel(levelNumber) {
        if (levelNumber > progress.unlockedLevel && levelNumber <= TOTAL_LEVELS) {
            progress.unlockedLevel = levelNumber;
            saveProgress();
            this.unlockedLevels = progress.unlockedLevel;
            addWallet(3);
            updateMenuStats();
            updateShopUI();
        }
    }

    launchBall() {
        if (!this.ballLaunched) {
            this.ballLaunched = true;
            const speed = 3 + this.level;
            this.player.vx = this.launchDirection.x * speed;
            this.player.vy = this.launchDirection.y * speed;
            // Block direction changes for the first DIRECTION_CHANGE_COOLDOWN_MS after launch
            this.directionChangeBlockedUntil = performance.now() + DIRECTION_CHANGE_COOLDOWN_MS;
        }
    }

    setLaunchDirection(dirX, dirY) {
        // Allow direction changes anytime (before or after launch)
        this.launchDirection = { x: dirX, y: dirY };
    }
}

const game = new Game();

function getTotalPages() {
    return Math.ceil(TOTAL_LEVELS / LEVELS_PER_PAGE);
}

function updateMenuButtons() {
    const firstLevel = (currentMenuPage - 1) * LEVELS_PER_PAGE + 1;
    const lastLevel = Math.min(currentMenuPage * LEVELS_PER_PAGE, TOTAL_LEVELS);

    const buttons = levelsGrid.querySelectorAll('button');
    buttons.forEach((btn, index) => {
        const levelNumber = index + 1;
        const isOnPage = levelNumber >= firstLevel && levelNumber <= lastLevel;
        btn.style.display = isOnPage ? 'inline-flex' : 'none';
        btn.disabled = levelNumber > game.unlockedLevels;

        if (btn.disabled) {
            btn.classList.add('locked');
            btn.title = 'Unlock the previous level to play this one';
        } else {
            btn.classList.remove('locked');
            btn.title = '';
        }
    });

    pageLabel.innerText = `Page ${currentMenuPage}/${getTotalPages()}`;
    prevPageBtn.disabled = currentMenuPage <= 1;
    nextPageBtn.disabled = currentMenuPage >= getTotalPages();
}

function showMenuPage(pageNumber) {
    currentMenuPage = Math.max(1, Math.min(getTotalPages(), pageNumber));
    updateMenuButtons();
}

// Help the player switch between pages in the shop
let shopPage = 'costume';

function showShopPage(pageName) {
    shopPage = pageName;
    shopPageLabel.innerText = pageName === 'costume' ? 'Costumes' : 'Trails';
    shopPrevPageBtn.disabled = pageName === 'costume';
    shopNextPageBtn.disabled = pageName === 'trail';
    updateShopUI();
}

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

    prevPageBtn.addEventListener('click', () => showMenuPage(currentMenuPage - 1));
    nextPageBtn.addEventListener('click', () => showMenuPage(currentMenuPage + 1));
    
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            // Developer tools activation logic
            const now = performance.now();
            if (now - lastSettingsClickTime < 500) { // 500ms threshold for rapid clicks
                settingsClickCount++;
                if (settingsClickCount >= 3) {
                    developerModeEnabled = !developerModeEnabled; // Toggle developer mode
                    toggleDeveloperToolsVisibility();
                    settingsClickCount = 0; // Reset count after activation
                    alert(`Developer Tools ${developerModeEnabled ? 'Enabled' : 'Disabled'}`);
                }
            } else {
                settingsClickCount = 1; // Start new count
            }
            lastSettingsClickTime = now;

            menuScreen.classList.add('hidden');
            settingsScreen.classList.remove('hidden');
        });
    }

    if (backSettingsBtn) {
        backSettingsBtn.addEventListener('click', () => {
            settingsScreen.classList.add('hidden');
            menuScreen.classList.remove('hidden');
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', resetProgressData);
    }

    // Dynamically create developer tools section
    const developerToolsDiv = document.createElement('div');
    developerToolsDiv.id = 'developerTools';
    developerToolsDiv.classList.add('hidden'); // Hidden by default
    developerToolsDiv.innerHTML = `
        <h3 style="color: #e74c3c; margin-top: 20px;">Developer Tools</h3>
        <button id="unlockAllLevelsBtn" class="dev-btn" style="background-color: #3498db; color: white; padding: 10px 15px; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;">Unlock All Levels</button>
        <button id="unlockAllItemsBtn" class="dev-btn" style="background-color: #2ecc71; color: white; padding: 10px 15px; border: none; border-radius: 5px; cursor: pointer;">Unlock All Items</button>
    `;
    settingsScreen.appendChild(developerToolsDiv);

    // Add event listeners for developer tools buttons AFTER they are in the DOM
    const unlockAllLevelsBtn = document.getElementById('unlockAllLevelsBtn');
    const unlockAllItemsBtn = document.getElementById('unlockAllItemsBtn');

    if (unlockAllLevelsBtn) {
        unlockAllLevelsBtn.addEventListener('click', unlockAllLevels);
    }
    if (unlockAllItemsBtn) {
        unlockAllItemsBtn.addEventListener('click', unlockAllItems);
    }

    if (developerModeEnabled) { // Show if already enabled from a previous session (though not persisted)
        developerToolsDiv.classList.remove('hidden');
    }
    shopBtn.addEventListener('click', () => {
        menuScreen.classList.add('hidden');
        shopScreen.classList.remove('hidden');
        showShopPage('costume');
    });
    shopPrevPageBtn.addEventListener('click', () => showShopPage('costume'));
    shopNextPageBtn.addEventListener('click', () => showShopPage('trail'));
    backShopBtn.addEventListener('click', () => {
        shopScreen.classList.add('hidden');
        menuScreen.classList.remove('hidden');
    });
    showMenuPage(1);
    updateMenuStats();
    updateShopUI();
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

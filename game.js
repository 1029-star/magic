const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const lvlText = document.getElementById('lvl');
const cntText = document.getElementById('cnt');
const cntTotalText = document.getElementById('cntTotal');
const steeringTimerText = document.getElementById('steeringTimer');
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

const fs = (typeof require !== 'undefined') ? require('fs') : null;
const path = (typeof require !== 'undefined') ? require('path') : null;
const baseDir = (typeof __dirname !== 'undefined') ? __dirname : (typeof process !== 'undefined' && typeof process.cwd === 'function' ? process.cwd() : '');

// Number of available levels
let TOTAL_LEVELS = 72;
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
    equippedCostume: 'defaultCostume',
    customLevels: []
};

let progress = loadProgress();

function loadProgress() {
    if (typeof localStorage === 'undefined') return { ...DEFAULT_PROGRESS };
    try {
        const raw = localStorage.getItem(PROGRESS_DATA_KEY);
        if (!raw) return { ...DEFAULT_PROGRESS };
        const stored = JSON.parse(raw);
        const loaded = {
            unlockedLevel: Math.max(1, stored.unlockedLevel || 1),
            wallet: Math.max(0, stored.wallet || 0),
            ownedItems: Array.isArray(stored.ownedItems) ? stored.ownedItems : [...DEFAULT_PROGRESS.ownedItems],
            equippedTrail: typeof stored.equippedTrail === 'string' ? stored.equippedTrail : 'defaultTrail',
            equippedCostume: typeof stored.equippedCostume === 'string' ? stored.equippedCostume : 'defaultCostume',
            customLevels: Array.isArray(stored.customLevels) ? stored.customLevels : []
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
            updateDevDeleteSelect();
        } else {
            developerToolsDiv.classList.add('hidden');
        }
    }
}

function updateDevDeleteSelect() {
    const select = document.getElementById('devDeleteLevelSelect');
    if (!select) return;
    select.innerHTML = '<option value="">-- Choose Preset --</option>';
    for (let i = 72; i < LEVEL_PRESETS.length; i++) {
        const preset = LEVEL_PRESETS[i];
        const opt = document.createElement('option');
        opt.value = i;
        opt.innerText = `${i + 1}: ${preset.name || 'Preset'}`;
        select.appendChild(opt);
    }
}

function requestDeveloperAccess(callback) {
    if (developerModeEnabled) {
        developerModeEnabled = false;
        toggleDeveloperToolsVisibility();
        alert("Developer Tools Disabled.");
        callback(false);
    } else {
        showCustomPrompt("Enter Developer Passcode:", "Enter passcode...", (passcode) => {
            if (passcode === "magic") {
                developerModeEnabled = true;
                toggleDeveloperToolsVisibility();
                alert("Developer Tools Enabled!");
                callback(true);
            } else if (passcode !== null) {
                alert("Invalid passcode. Access denied.");
                callback(false);
            } else {
                callback(false);
            }
        });
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
    
    // Player Start: always top-left, safe and consistent
    const playerStart = { x: 60, y: 60 };
    
    // Exit Position: moves around in higher tiers, but defaults to bottom-right
    let exitX = 520;
    let exitY = 320;
    if (level > 15) {
        // Vary exit position slightly for variety
        exitX = 500 - (level % 3) * 60;
        exitY = 320 - (level % 2) * 50;
    }
    const exit = { x: exitX, y: exitY, w: 40, h: 40 };

    // Speed scales, but caps to keep it playable
    // Level 1: 3.5, Level 48: 8.2
    const speed = 3.5 + Math.min(1.5, level * 0.1) + (level > 15 ? Math.min(3, (level - 15) * 0.1) : 0);

    const coins = [];
    const obstacles = [];

    // TIER 1: Levels 1-5 (Introductory, bouncers only)
    if (level <= 5) {
        // A few static bouncers
        const count = level;
        for (let i = 0; i < count; i++) {
            obstacles.push({
                x: 180 + i * 70,
                y: 120 + (i % 2) * 80,
                w: 70,
                h: 20,
                type: 'bouncer'
            });
        }
        
        // Coins well-spaced
        const coinCount = 3 + level;
        for (let i = 0; i < coinCount; i++) {
            coins.push({
                x: 100 + (i * 90) % 400,
                y: 100 + (i * 70) % 220,
                r: 8
            });
        }
    }
    // TIER 2: Levels 6-10 (Intro to Slow Zones and static hazards)
    else if (level <= 10) {
        // 1 slow zone in the center
        obstacles.push({
            x: 200,
            y: 120,
            w: 200,
            h: 160,
            type: 'slow_zone',
            speedMultiplier: 0.5
        });

        // Some bouncers
        obstacles.push({ x: 120, y: 150, w: 60, h: 20, type: 'bouncer' });
        obstacles.push({ x: 420, y: 230, w: 60, h: 20, type: 'bouncer' });

        // Static hazards in corners/borders, away from start (x:60, y:60)
        obstacles.push({ x: 300, y: 40, w: 20, h: 60, type: 'hazard' });
        if (level >= 8) {
            obstacles.push({ x: 300, y: 300, w: 20, h: 60, type: 'hazard' });
        }

        // Coins (avoiding center slow zone or placing some inside it)
        coins.push({ x: 300, y: 200, r: 8 }); // inside slow zone
        coins.push({ x: 100, y: 300, r: 8 });
        coins.push({ x: 500, y: 100, r: 8 });
        if (level >= 8) {
            coins.push({ x: 480, y: 280, r: 8 });
        }
    }
    // TIER 3: Levels 11-20 (Intro to Portal Teleporters)
    else if (level <= 20) {
        // Portal Pair A & B
        // Portal A at (140, 280) targets B at (460, 120)
        const portalA = {
            x: 140,
            y: 280,
            r: 16,
            type: 'portal',
            color: '#9b59b6', // purple
            target: { x: 460, y: 120 }
        };
        const portalB = {
            x: 460,
            y: 120,
            r: 16,
            type: 'portal',
            color: '#e67e22', // orange
            target: { x: 140, y: 280 }
        };
        obstacles.push(portalA, portalB);

        // A large hazard wall in the middle, dividing the map!
        // To get from left to right, you MUST use the portals!
        obstacles.push({ x: 290, y: 40, w: 20, h: 320, type: 'hazard' });

        // Slow zone near the portal exits for reaction time
        obstacles.push({
            x: 380,
            y: 80,
            w: 160,
            h: 80,
            type: 'slow_zone',
            speedMultiplier: 0.5
        });

        // Bouncers
        obstacles.push({ x: 80, y: 180, w: 80, h: 20, type: 'bouncer' });
        obstacles.push({ x: 440, y: 220, w: 80, h: 20, type: 'bouncer' });

        // Coins (some on left, some on right)
        coins.push({ x: 90, y: 100, r: 8 });
        coins.push({ x: 80, y: 320, r: 8 }); // left side
        coins.push({ x: 500, y: 80, r: 8 });  // right side
        coins.push({ x: 510, y: 280, r: 8 }); // right side
        if (level >= 15) {
            coins.push({ x: 220, y: 150, r: 8 });
        }
    }
    // TIER 4: Levels 21-30 (Moving Bouncers and static hazard fields)
    else if (level <= 30) {
        // Slow zone
        obstacles.push({
            x: 220,
            y: 100,
            w: 160,
            h: 200,
            type: 'slow_zone',
            speedMultiplier: 0.4
        });

        // Portals
        const pA = { x: 100, y: 320, r: 15, type: 'portal', color: '#1abc9c', target: { x: 500, y: 80 } };
        const pB = { x: 500, y: 80, r: 15, type: 'portal', color: '#e67e22', target: { x: 100, y: 320 } };
        obstacles.push(pA, pB);

        // Moving bouncers in middle
        obstacles.push({
            x: 250,
            y: 180,
            w: 100,
            h: 25,
            type: 'bouncer',
            vx: 1.5 + (level - 20) * 0.1
        });

        // Static hazards creating a maze
        obstacles.push({ x: 180, y: 40, w: 20, h: 140, type: 'hazard' });
        obstacles.push({ x: 400, y: 220, w: 20, h: 140, type: 'hazard' });

        // Coins scattered
        coins.push({ x: 150, y: 150, r: 8 });
        coins.push({ x: 300, y: 50, r: 8 });
        coins.push({ x: 300, y: 350, r: 8 });
        coins.push({ x: 450, y: 250, r: 8 });
        if (level >= 26) {
            coins.push({ x: 70, y: 250, r: 8 });
        }
    }
    // TIER 5: Levels 31-40 (Moving Hazards and precision steer corridors)
    else if (level <= 40) {
        // Dynamic portals (Portal A targets B, B targets C, C targets A!)
        const pA = { x: 100, y: 300, r: 15, type: 'portal', color: '#9b59b6', target: { x: 300, y: 100 } };
        const pB = { x: 300, y: 100, r: 15, type: 'portal', color: '#e67e22', target: { x: 500, y: 300 } };
        const pC = { x: 500, y: 300, r: 15, type: 'portal', color: '#2ecc71', target: { x: 100, y: 300 } };
        obstacles.push(pA, pB, pC);

        // Moving hazard in the center corridor (vertical)
        obstacles.push({
            x: 290,
            y: 150,
            w: 20,
            h: 100,
            type: 'hazard',
            vy: 2.0 + (level - 30) * 0.15
        });

        // Moving hazard (horizontal)
        obstacles.push({
            x: 150,
            y: 220,
            w: 80,
            h: 20,
            type: 'hazard',
            vx: 1.8 + (level - 30) * 0.1
        });

        // Slow zone cushion near center
        obstacles.push({
            x: 250,
            y: 80,
            w: 100,
            h: 80,
            type: 'slow_zone',
            speedMultiplier: 0.45
        });

        // Static bouncers
        obstacles.push({ x: 180, y: 60, w: 25, h: 80, type: 'bouncer' });
        obstacles.push({ x: 390, y: 260, w: 25, h: 80, type: 'bouncer' });

        // Coins in dangerous areas
        coins.push({ x: 300, y: 40, r: 8 });
        coins.push({ x: 100, y: 200, r: 8 });
        coins.push({ x: 500, y: 200, r: 8 });
        coins.push({ x: 300, y: 360, r: 8 });
        if (level >= 35) {
            coins.push({ x: 200, y: 150, r: 8 });
        }
    }
    // TIER 6: Levels 41-48 (Grandmaster puzzle lanes)
    else if (level <= 48) {
        // High speed, narrow gaps, dual portal networks
        const p1 = { x: 80, y: 320, r: 15, type: 'portal', color: '#e74c3c', target: { x: 520, y: 80 } };
        const p2 = { x: 520, y: 80, r: 15, type: 'portal', color: '#3498db', target: { x: 80, y: 320 } };
        const p3 = { x: 80, y: 80, r: 15, type: 'portal', color: '#2ecc71', target: { x: 520, y: 320 } };
        const p4 = { x: 520, y: 320, r: 15, type: 'portal', color: '#f1c40f', target: { x: 80, y: 80 } };
        obstacles.push(p1, p2, p3, p4);

        // Multiple slow zones
        obstacles.push({ x: 150, y: 50, w: 100, h: 80, type: 'slow_zone', speedMultiplier: 0.4 });
        obstacles.push({ x: 350, y: 270, w: 100, h: 80, type: 'slow_zone', speedMultiplier: 0.4 });

        // Horizontal moving hazards blocking portals
        obstacles.push({
            x: 100,
            y: 180,
            w: 120,
            h: 20,
            type: 'hazard',
            vx: 2.5 + (level - 40) * 0.2
        });
        obstacles.push({
            x: 380,
            y: 200,
            w: 120,
            h: 20,
            type: 'hazard',
            vx: -2.5 - (level - 40) * 0.2
        });

        // Giant center bouncer
        obstacles.push({ x: 260, y: 160, w: 80, h: 80, type: 'bouncer' });

        // Coins in tight corners
        coins.push({ x: 300, y: 90, r: 8 });
        coins.push({ x: 300, y: 310, r: 8 });
        coins.push({ x: 130, y: 280, r: 8 });
        coins.push({ x: 470, y: 120, r: 8 });
        coins.push({ x: 200, y: 200, r: 8 });
        coins.push({ x: 400, y: 200, r: 8 });
    }
    // TIER 7: Levels 49-56 (Moving Saws & Fragile Bouncers)
    else if (level <= 56) {
        // Moving saw blade
        obstacles.push({
            x: 300,
            y: 200,
            r: 18,
            type: 'saw',
            vx: 2.5 + (level - 49) * 0.15,
            vy: 2.0 + (level - 49) * 0.1,
            angle: 0
        });

        // Fragile bouncers
        obstacles.push({ x: 120, y: 180, w: 80, h: 22, type: 'fragile_bouncer', hitsRemaining: 2 });
        obstacles.push({ x: 400, y: 180, w: 80, h: 22, type: 'fragile_bouncer', hitsRemaining: 2 });

        // Static bouncers
        obstacles.push({ x: 260, y: 80, w: 80, h: 20, type: 'bouncer' });
        obstacles.push({ x: 260, y: 300, w: 80, h: 20, type: 'bouncer' });

        // Slow zone
        obstacles.push({ x: 60, y: 280, w: 100, h: 80, type: 'slow_zone', speedMultiplier: 0.5 });

        // Coins
        coins.push({ x: 110, y: 320, r: 8 });
        coins.push({ x: 300, y: 140, r: 8 });
        coins.push({ x: 300, y: 260, r: 8 });
        coins.push({ x: 480, y: 100, r: 8 });
        if (level >= 52) {
            coins.push({ x: 480, y: 300, r: 8 });
        }
    }
    // TIER 8: Levels 57-64 (Puzzle Holes & Speed Boosts)
    else if (level <= 64) {
        // Puzzle hole triggers sub-puzzles (1, 2, or 3)
        const puzzleId = 1 + ((level - 57) % 3);
        obstacles.push({
            x: 300,
            y: 200,
            r: 20,
            type: 'puzzle_hole',
            puzzleId: puzzleId,
            completed: false,
            id: `hole_${level}`
        });

        // Boost pads
        obstacles.push({ x: 80, y: 260, w: 32, h: 32, type: 'boost', direction: { x: 1, y: 0 } });
        obstacles.push({ x: 480, y: 100, w: 32, h: 32, type: 'boost', direction: { x: -1, y: 0 } });

        // Static bouncers
        obstacles.push({ x: 160, y: 120, w: 80, h: 20, type: 'bouncer' });
        obstacles.push({ x: 360, y: 260, w: 80, h: 20, type: 'bouncer' });

        // Static hazard walls
        obstacles.push({ x: 140, y: 220, w: 20, h: 100, type: 'hazard' });
        obstacles.push({ x: 440, y: 80, w: 20, h: 100, type: 'hazard' });

        // Coins
        coins.push({ x: 220, y: 70, r: 8 });
        coins.push({ x: 380, y: 330, r: 8 });
        coins.push({ x: 100, y: 150, r: 8 });
        coins.push({ x: 500, y: 250, r: 8 });
    }
    // TIER 9: Levels 65-72 (Ultimate Gauntlets)
    else {
        // Portal Pair
        const portalA = { x: 100, y: 300, r: 15, type: 'portal', color: '#9b59b6', target: { x: 500, y: 100 } };
        const portalB = { x: 500, y: 100, r: 15, type: 'portal', color: '#e67e22', target: { x: 100, y: 300 } };
        obstacles.push(portalA, portalB);

        // Moving saw blade
        obstacles.push({
            x: 300,
            y: 200,
            r: 16,
            type: 'saw',
            vx: 3.2,
            vy: 2.2,
            angle: 0
        });

        // Speed boost pad
        obstacles.push({ x: 280, y: 320, w: 32, h: 32, type: 'boost', direction: { x: 0, y: -1 } });

        // Fragile bouncers
        obstacles.push({ x: 200, y: 150, w: 60, h: 20, type: 'fragile_bouncer', hitsRemaining: 2 });
        obstacles.push({ x: 340, y: 230, w: 60, h: 20, type: 'fragile_bouncer', hitsRemaining: 2 });

        // Hazards
        obstacles.push({ x: 180, y: 20, w: 20, h: 100, type: 'hazard' });
        obstacles.push({ x: 400, y: 280, w: 20, h: 100, type: 'hazard' });

        // Slow zone
        obstacles.push({ x: 160, y: 260, w: 100, h: 80, type: 'slow_zone', speedMultiplier: 0.45 });

        // Optional puzzle hole on specific levels
        if (level === 70 || level === 72) {
            obstacles.push({
                x: 300,
                y: 80,
                r: 18,
                type: 'puzzle_hole',
                puzzleId: 3,
                completed: false,
                id: `hole_${level}`
            });
        }

        // Coins
        coins.push({ x: 300, y: 140, r: 8 });
        coins.push({ x: 230, y: 90, r: 8 });
        coins.push({ x: 370, y: 310, r: 8 });
        coins.push({ x: 80, y: 220, r: 8 });
        coins.push({ x: 520, y: 180, r: 8 });
        coins.push({ x: 300, y: 370, r: 8 });
    }

    return {
        speed,
        playerStart,
        exit,
        coins,
        obstacles
    };
});

function loadWorkspacePresets() {
    let presets = [];
    if (fs) {
        try {
            const fsPath = path.join(baseDir, 'custom_presets.json');
            if (fs.existsSync(fsPath)) {
                const data = fs.readFileSync(fsPath, 'utf8');
                presets = JSON.parse(data);
            }
        } catch (err) {
            console.error("Error reading custom_presets.json from disk:", err);
        }
    } else {
        try {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', 'custom_presets.json', false); // synchronous
            xhr.send(null);
            if (xhr.status === 200 || xhr.status === 0) {
                presets = JSON.parse(xhr.responseText);
            }
        } catch (err) {
            console.log("No custom_presets.json loaded via XHR:", err.message);
        }
    }

    if (Array.isArray(presets) && presets.length > 0) {
        presets.forEach((preset) => {
            LEVEL_PRESETS.push(preset);
        });
        TOTAL_LEVELS += presets.length;
        console.log(`Loaded ${presets.length} permanent presets. New TOTAL_LEVELS = ${TOTAL_LEVELS}`);
    }

    // Deduplicate local custom levels against loaded preset levels
    if (progress.customLevels && progress.customLevels.length > 0) {
        const presetNames = new Set(LEVEL_PRESETS.map(p => p.name));
        const originalCount = progress.customLevels.length;
        progress.customLevels = progress.customLevels.filter(cl => !presetNames.has(cl.name));
        if (progress.customLevels.length !== originalCount) {
            saveProgress();
        }
    }

    // Clamp unlockedLevel to the updated TOTAL_LEVELS
    progress.unlockedLevel = Math.min(TOTAL_LEVELS, progress.unlockedLevel);
    saveProgress();
}

loadWorkspacePresets();

class Game {
    constructor() {
        this.level = 1;
        this.unlockedLevels = progress.unlockedLevel;
        this.gameRunning = false;
        this.ballLaunched = false;
        this.animationId = null;
        this.launchDirection = { x: 1, y: 1 }; // Default direction: down-right
        this.trailPoints = [];
        this.inPuzzleMode = false;
        this.activePuzzleId = 0;
        this.savedLevelState = null;
        
        // Level Editor Fields
        this.editorMode = false;
        this.editorSelectedObject = null;
        this.editorActiveTool = 'select';
        this.editorDraggingObject = false;
        this.editorDragOffset = { x: 0, y: 0 };
        this.editorDrawing = false;
        this.editorDrawStart = null;
        this.editorDrawCurrent = null;
        this.editorLastMousePos = null;
        this.editorPendingPortal = null;
        this.editorResizingObject = false;
        
        // Custom Play / Playtest Fields
        this.isCustomPlay = false;
        this.isPlaytesting = false;
        this.customLevelConfig = null;
        this.editorCustomLevel = null;
        
        this.resetLevel();
    }
 
    getCurrentLevelConfig() {
        if (this.isCustomPlay) {
            return this.customLevelConfig;
        }
        return LEVEL_PRESETS[this.level - 1];
    }

    resetLevel() {
        const config = this.getCurrentLevelConfig();
        const speed = config.speed || 5;
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
        this.spawnShieldActive = false;
        this.spawnShieldExpiresAt = 0;
        this.inPuzzleMode = false;
        this.activePuzzleId = 0;
        this.savedLevelState = null;
 
        if (this.isCustomPlay) {
            lvlText.innerText = config.name || "Custom";
        } else {
            lvlText.innerText = this.level;
        }
        cntText.innerText = '0';
        if (cntTotalText) cntTotalText.innerText = String(this.requiredCoins);
        if (steeringTimerText) {
            steeringTimerText.innerText = 'AIMING';
            steeringTimerText.style.color = '#3498db';
            steeringTimerText.style.textShadow = '0 0 5px rgba(52, 152, 219, 0.5)';
        }
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
                const width = obs.w || (obs.r ? obs.r * 2 : 0);
                if (obs.type === 'saw') {
                    if (obs.x - obs.r <= 0 || obs.x + obs.r >= canvas.width) obs.vx *= -1;
                } else {
                    if (obs.x <= 0 || obs.x + width >= canvas.width) obs.vx *= -1;
                }
            }
            if (obs.vy) {
                obs.y += obs.vy;
                const height = obs.h || (obs.r ? obs.r * 2 : 0);
                if (obs.type === 'saw') {
                    if (obs.y - obs.r <= 0 || obs.y + obs.r >= canvas.height) obs.vy *= -1;
                } else {
                    if (obs.y <= 0 || obs.y + height >= canvas.height) obs.vy *= -1;
                }
            }
            if (obs.type === 'saw') {
                obs.angle = (obs.angle || 0) + 0.08;
            }
        });

        // Update velocity based on held keys (allow mid-air direction changes for a short time)
        const speed = this.getCurrentLevelConfig().speed || 5;
        let newVx = this.player.vx;
        let newVy = this.player.vy;
        const now = performance.now();
        if (this.spawnShieldActive && now >= this.spawnShieldExpiresAt) {
            this.spawnShieldActive = false;
        }
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

        // Slow Zones check
        let speedMultiplier = 1.0;
        this.obstacles.forEach(obs => {
            if (obs.type === 'slow_zone') {
                const closestX = Math.max(obs.x, Math.min(this.player.x, obs.x + obs.w));
                const closestY = Math.max(obs.y, Math.min(this.player.y, obs.y + obs.h));
                const distance = Math.hypot(this.player.x - closestX, this.player.y - closestY);
                if (distance < this.player.r) {
                    speedMultiplier = obs.speedMultiplier || 0.4;
                }
            }
        });

        // Portal Teleportation Check
        this.obstacles.forEach(obs => {
            if (obs.type === 'portal') {
                const dist = Math.hypot(this.player.x - obs.x, this.player.y - obs.y);
                if (dist < this.player.r + obs.r) {
                    if (now > (obs.cooldownUntil || 0)) {
                        this.player.x = obs.target.x;
                        this.player.y = obs.target.y;
                        
                        const cooldownTime = now + 1000;
                        obs.cooldownUntil = cooldownTime;
                        
                        const targetPortal = this.obstacles.find(o => o.type === 'portal' && o.x === obs.target.x && o.y === obs.target.y);
                        if (targetPortal) {
                            targetPortal.cooldownUntil = cooldownTime;
                        }
                        
                        this.trailPoints = [{ x: this.player.x, y: this.player.y }];
                    }
                }
            }
        });

        // Circular Obstacle Collisions (Saws)
        this.obstacles.forEach(obs => {
            if (obs.type === 'saw') {
                const dist = Math.hypot(this.player.x - obs.x, this.player.y - obs.y);
                if (dist < this.player.r + obs.r) {
                    if (!this.spawnShieldActive) {
                        if (this.inPuzzleMode) {
                            this.setupPuzzlePreset(this.activePuzzleId);
                        } else {
                            this.resetLevel();
                        }
                    }
                }
            }
        });

        // Boost Pad Collision Check
        this.obstacles.forEach(obs => {
            if (obs.type === 'boost') {
                if (this.player.x + this.player.r > obs.x && this.player.x - this.player.r < obs.x + obs.w &&
                    this.player.y + this.player.r > obs.y && this.player.y - this.player.r < obs.y + obs.h) {
                    
                    const speed = (this.getCurrentLevelConfig().speed || 5) * 1.6;
                    this.player.vx = obs.direction.x * speed;
                    this.player.vy = obs.direction.y * speed;
                    
                    // Reset steering cooldown
                    this.directionChangeBlockedUntil = now;
                }
            }
        });

        // Puzzle Hole Collision Check
        if (!this.inPuzzleMode) {
            this.obstacles.forEach(obs => {
                if (obs.type === 'puzzle_hole' && !obs.completed) {
                    const dist = Math.hypot(this.player.x - obs.x, this.player.y - obs.y);
                    if (dist < this.player.r * 0.6) {
                        this.enterPuzzleMode(obs);
                    }
                }
            });
        }

        this.player.x += this.player.vx * speedMultiplier;
        this.player.y += this.player.vy * speedMultiplier;
        this.trailPoints.push({ x: this.player.x, y: this.player.y });
        if (this.trailPoints.length > 28) this.trailPoints.shift();

        // Boundary Bouncing with position correction to prevent sticking
        if (this.player.x + this.player.r > canvas.width) {
            this.player.vx = -Math.abs(this.player.vx);
            this.player.x = canvas.width - this.player.r;
        } else if (this.player.x - this.player.r < 0) {
            this.player.vx = Math.abs(this.player.vx);
            this.player.x = this.player.r;
        }

        if (this.player.y + this.player.r > canvas.height) {
            this.player.vy = -Math.abs(this.player.vy);
            this.player.y = canvas.height - this.player.r;
        } else if (this.player.y - this.player.r < 0) {
            this.player.vy = Math.abs(this.player.vy);
            this.player.y = this.player.r;
        }

        // Door Collision (bounce off locked door)
        if (!this.exit.open) {
            const doorX = this.exit.x;
            const doorY = this.exit.y;
            const doorW = this.exit.w;
            const doorH = this.exit.h;

            if (this.player.x + this.player.r > doorX && this.player.x - this.player.r < doorX + doorW &&
                this.player.y + this.player.r > doorY && this.player.y - this.player.r < doorY + doorH) {
                
                const overlapLeft = (this.player.x + this.player.r) - doorX;
                const overlapRight = (doorX + doorW) - (this.player.x - this.player.r);
                const overlapTop = (this.player.y + this.player.r) - doorY;
                const overlapBottom = (doorY + doorH) - (this.player.y - this.player.r);

                const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

                if (minOverlap === overlapLeft) {
                    this.player.vx = -Math.abs(this.player.vx);
                    this.player.x = doorX - this.player.r;
                } else if (minOverlap === overlapRight) {
                    this.player.vx = Math.abs(this.player.vx);
                    this.player.x = doorX + doorW + this.player.r;
                } else if (minOverlap === overlapTop) {
                    this.player.vy = -Math.abs(this.player.vy);
                    this.player.y = doorY - this.player.r;
                } else if (minOverlap === overlapBottom) {
                    this.player.vy = Math.abs(this.player.vy);
                    this.player.y = doorY + doorH + this.player.r;
                }
            }
        }

        // Obstacle Collisions (Bouncers & Hazards)
        this.obstacles.forEach(obs => {
            if (obs.type === 'bouncer' || obs.type === 'fragile_bouncer' || obs.type === 'hazard') {
                if (this.player.x + this.player.r > obs.x && this.player.x - this.player.r < obs.x + obs.w &&
                    this.player.y + this.player.r > obs.y && this.player.y - this.player.r < obs.y + obs.h) {
                    
                    if (obs.type === 'bouncer' || obs.type === 'fragile_bouncer') {
                        const overlapLeft = (this.player.x + this.player.r) - obs.x;
                        const overlapRight = (obs.x + obs.w) - (this.player.x - this.player.r);
                        const overlapTop = (this.player.y + this.player.r) - obs.y;
                        const overlapBottom = (obs.y + obs.h) - (this.player.y - this.player.r);

                        const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

                        let hitDetected = false;
                        if (minOverlap === overlapLeft) {
                            this.player.vx = -Math.abs(this.player.vx);
                            this.player.x = obs.x - this.player.r;
                            hitDetected = true;
                        } else if (minOverlap === overlapRight) {
                            this.player.vx = Math.abs(this.player.vx);
                            this.player.x = obs.x + obs.w + this.player.r;
                            hitDetected = true;
                        } else if (minOverlap === overlapTop) {
                            this.player.vy = -Math.abs(this.player.vy);
                            this.player.y = obs.y - this.player.r;
                            hitDetected = true;
                        } else if (minOverlap === overlapBottom) {
                            this.player.vy = Math.abs(this.player.vy);
                            this.player.y = obs.y + obs.h + this.player.r;
                            hitDetected = true;
                        }

                        if (hitDetected && obs.type === 'fragile_bouncer') {
                            obs.hitsRemaining--;
                            if (obs.hitsRemaining <= 0) {
                                obs.destroyed = true;
                            }
                        }
                    } else if (obs.type === 'hazard') {
                        if (!this.spawnShieldActive) {
                            if (this.inPuzzleMode) {
                                this.setupPuzzlePreset(this.activePuzzleId);
                            } else {
                                this.resetLevel();
                            }
                        }
                    }
                }
            }
        });

        // Filter out destroyed fragile bouncers
        this.obstacles = this.obstacles.filter(obs => !obs.destroyed);

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
                if (this.inPuzzleMode) {
                    this.completePuzzle();
                } else if (this.isCustomPlay) {
                    this.stopGame();
                    if (this.isPlaytesting) {
                        alert('🎉 Playtest Success! Level completed!');
                        this.stopPlaytest();
                    } else {
                        alert('🎉 Custom Level Completed!');
                        this.returnToMenu();
                    }
                } else {
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
    }

    draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Render Obstacles
        this.obstacles.forEach(obs => {
            if (obs.type === 'bouncer') {
                ctx.fillStyle = '#95a5a6';
                ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
            } else if (obs.type === 'hazard') {
                ctx.fillStyle = '#e74c3c';
                ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
            } else if (obs.type === 'slow_zone') {
                ctx.fillStyle = 'rgba(52, 152, 219, 0.15)';
                ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
                ctx.strokeStyle = 'rgba(52, 152, 219, 0.4)';
                ctx.lineWidth = 1.5;
                ctx.save();
                ctx.setLineDash([6, 4]);
                ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
                ctx.restore();
                
                ctx.fillStyle = 'rgba(52, 152, 219, 0.6)';
                ctx.font = 'bold 9px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('SLOW ZONE', obs.x + obs.w / 2, obs.y + obs.h / 2);
            } else if (obs.type === 'portal') {
                const pulse = 1 + 0.12 * Math.sin(performance.now() / 150);
                
                // Outer glow
                ctx.beginPath();
                ctx.arc(obs.x, obs.y, obs.r * 1.25 * pulse, 0, Math.PI * 2);
                ctx.strokeStyle = obs.color || '#9b59b6';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.closePath();
                
                // Main portal circle
                ctx.beginPath();
                ctx.arc(obs.x, obs.y, obs.r * pulse, 0, Math.PI * 2);
                ctx.fillStyle = obs.color || '#9b59b6';
                ctx.fill();
                ctx.closePath();
                
                // Portal core
                ctx.beginPath();
                ctx.arc(obs.x, obs.y, obs.r * 0.4, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                ctx.closePath();
            } else if (obs.type === 'saw') {
                ctx.save();
                ctx.translate(obs.x, obs.y);
                ctx.rotate(obs.angle || 0);
                
                // Draw circular saw blade body
                ctx.fillStyle = '#bdc3c7';
                ctx.beginPath();
                ctx.arc(0, 0, obs.r - 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.closePath();
                
                // Draw spinning triangular teeth
                const teethCount = 8;
                ctx.fillStyle = '#7f8c8d';
                for (let i = 0; i < teethCount; i++) {
                    ctx.rotate((Math.PI * 2) / teethCount);
                    ctx.beginPath();
                    ctx.moveTo(obs.r - 4, -4);
                    ctx.lineTo(obs.r + 6, 0);
                    ctx.lineTo(obs.r - 4, 4);
                    ctx.fill();
                    ctx.closePath();
                }
                
                // Draw inner ring and red center cap
                ctx.beginPath();
                ctx.arc(0, 0, obs.r * 0.4, 0, Math.PI * 2);
                ctx.strokeStyle = '#95a5a6';
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.closePath();
                
                ctx.fillStyle = '#e74c3c';
                ctx.beginPath();
                ctx.arc(0, 0, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.closePath();
                
                ctx.restore();
            } else if (obs.type === 'boost') {
                ctx.fillStyle = 'rgba(46, 204, 113, 0.22)';
                ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
                ctx.strokeStyle = '#2ecc71';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
                
                ctx.save();
                ctx.translate(obs.x + obs.w / 2, obs.y + obs.h / 2);
                const angle = Math.atan2(obs.direction.y, obs.direction.x);
                ctx.rotate(angle);
                
                // Draw pulsing chevron arrows pointing in obs.direction
                const pulse = 1 + 0.1 * Math.sin(performance.now() / 120);
                ctx.beginPath();
                ctx.moveTo(-6 * pulse, -5);
                ctx.lineTo(2 * pulse, 0);
                ctx.lineTo(-6 * pulse, 5);
                ctx.moveTo(-1 * pulse, -5);
                ctx.lineTo(7 * pulse, 0);
                ctx.lineTo(-1 * pulse, 5);
                ctx.strokeStyle = '#2ecc71';
                ctx.lineWidth = 2.5;
                ctx.stroke();
                ctx.closePath();
                
                ctx.restore();
            } else if (obs.type === 'fragile_bouncer') {
                ctx.fillStyle = obs.hitsRemaining === 1 ? '#d35400' : '#e67e22'; // darker as it cracks
                ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
                
                // Draw crack lines
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
                ctx.lineWidth = 1.5;
                ctx.moveTo(obs.x + 5, obs.y + 5);
                ctx.lineTo(obs.x + obs.w - 5, obs.y + obs.h - 5);
                if (obs.hitsRemaining === 1) {
                    ctx.moveTo(obs.x + obs.w - 6, obs.y + 6);
                    ctx.lineTo(obs.x + 6, obs.y + obs.h - 6);
                }
                ctx.stroke();
                ctx.closePath();
            } else if (obs.type === 'puzzle_hole') {
                if (!obs.completed) {
                    const pulse = 1 + 0.08 * Math.sin(performance.now() / 100);
                    
                    // Glow ring
                    ctx.beginPath();
                    ctx.arc(obs.x, obs.y, obs.r * 1.2 * pulse, 0, Math.PI * 2);
                    ctx.strokeStyle = 'rgba(155, 89, 182, 0.5)';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    ctx.closePath();

                    // Black hole core
                    ctx.beginPath();
                    ctx.arc(obs.x, obs.y, obs.r * pulse, 0, Math.PI * 2);
                    ctx.fillStyle = '#111111';
                    ctx.fill();
                    ctx.strokeStyle = '#9b59b6';
                    ctx.lineWidth = 2.5;
                    ctx.stroke();
                    ctx.closePath();

                    // Swirling vortex line inside
                    ctx.save();
                    ctx.translate(obs.x, obs.y);
                    ctx.rotate(performance.now() / 120);
                    ctx.strokeStyle = '#8e44ad';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.arc(0, 0, obs.r * 0.6, 0, Math.PI);
                    ctx.stroke();
                    ctx.closePath();
                    ctx.restore();
                    
                    // Text label
                    ctx.fillStyle = '#9b59b6';
                    ctx.font = 'bold 8px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(`PORTAL ${obs.puzzleId}`, obs.x, obs.y - obs.r - 4);
                } else {
                    // Closed portal representation
                    ctx.beginPath();
                    ctx.arc(obs.x, obs.y, obs.r, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(155, 89, 182, 0.15)';
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(155, 89, 182, 0.4)';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                    ctx.closePath();
                }
            }
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

        // Render Spawn Invulnerability Shield (glowing cyan bubble)
        if (this.spawnShieldActive) {
            const shieldAlpha = 0.35 + 0.15 * Math.sin(performance.now() / 100);
            ctx.beginPath();
            ctx.arc(this.player.x, this.player.y, this.player.r + 10, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(52, 152, 219, ${shieldAlpha})`;
            ctx.fill();
            ctx.strokeStyle = 'rgba(52, 152, 219, 0.8)';
            ctx.lineWidth = 2.5;
            ctx.stroke();
            ctx.closePath();
            
            // Text label above
            ctx.fillStyle = '#3498db';
            ctx.font = 'bold 9px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('SHIELDED', this.player.x, this.player.y - this.player.r - 12);
        }

        // Render Cooldown Circle around the player ball and update UI
        const now = performance.now();
        if (this.ballLaunched) {
            const timeLeft = this.directionChangeBlockedUntil - now;
            if (timeLeft > 0) {
                const pct = timeLeft / DIRECTION_CHANGE_COOLDOWN_MS; // 1 to 0
                
                // Outer track
                ctx.beginPath();
                ctx.arc(this.player.x, this.player.y, this.player.r + 7, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.lineWidth = 3;
                ctx.stroke();
                ctx.closePath();

                // Draining arc (colored red to yellow gradient or bright orange)
                ctx.beginPath();
                ctx.arc(this.player.x, this.player.y, this.player.r + 7, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * pct), false);
                ctx.strokeStyle = '#e74c3c'; // Flat Red
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';
                
                // Add a glowing effect
                ctx.save();
                ctx.shadowColor = '#e74c3c';
                ctx.shadowBlur = 6;
                ctx.stroke();
                ctx.restore();
                
                ctx.closePath();

                // Update UI Text
                if (steeringTimerText) {
                    const secs = (timeLeft / 1000).toFixed(1);
                    steeringTimerText.innerText = secs + 's';
                    steeringTimerText.style.color = '#e74c3c';
                    steeringTimerText.style.textShadow = '0 0 5px rgba(231, 76, 60, 0.5)';
                }
            } else {
                // Cooldown is finished - draw subtle green ring
                ctx.beginPath();
                ctx.arc(this.player.x, this.player.y, this.player.r + 7, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(46, 204, 113, 0.4)';
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.closePath();

                // Update UI Text
                if (steeringTimerText && steeringTimerText.innerText !== 'READY') {
                    steeringTimerText.innerText = 'READY';
                    steeringTimerText.style.color = '#2ecc71';
                    steeringTimerText.style.textShadow = '0 0 5px rgba(46, 204, 113, 0.5)';
                }
            }
        } else {
            // Not launched yet
            if (steeringTimerText && steeringTimerText.innerText !== 'AIMING') {
                steeringTimerText.innerText = 'AIMING';
                steeringTimerText.style.color = '#3498db';
                steeringTimerText.style.textShadow = '0 0 5px rgba(52, 152, 219, 0.5)';
            }
        }

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

        if (this.inPuzzleMode) {
            ctx.fillStyle = 'rgba(155, 89, 182, 0.95)';
            ctx.font = 'bold 15px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(`PORTAL PUZZLE CHALLENGE #${this.activePuzzleId}`, canvas.width / 2, 5);
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

    drawEditor() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. Draw Grid Overlay
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        const gridSize = 20;
        for (let x = 0; x < canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }

        const lvl = this.editorCustomLevel;
        if (!lvl) return;

        // 2. Draw Obstacles from lvl.obstacles
        if (lvl.obstacles) {
            lvl.obstacles.forEach(obs => {
                if (obs.type === 'bouncer') {
                    ctx.fillStyle = '#95a5a6';
                    ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
                } else if (obs.type === 'hazard') {
                    ctx.fillStyle = '#e74c3c';
                    ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
                } else if (obs.type === 'slow_zone') {
                    ctx.fillStyle = 'rgba(52, 152, 219, 0.15)';
                    ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
                    ctx.strokeStyle = 'rgba(52, 152, 219, 0.4)';
                    ctx.lineWidth = 1.5;
                    ctx.save();
                    ctx.setLineDash([6, 4]);
                    ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
                    ctx.restore();
                    
                    ctx.fillStyle = 'rgba(52, 152, 219, 0.6)';
                    ctx.font = 'bold 9px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('SLOW ZONE', obs.x + obs.w / 2, obs.y + obs.h / 2);
                } else if (obs.type === 'portal') {
                    const pulse = 1 + 0.05 * Math.sin(performance.now() / 150);
                    
                    // Outer glow
                    ctx.beginPath();
                    ctx.arc(obs.x, obs.y, obs.r * 1.25 * pulse, 0, Math.PI * 2);
                    ctx.strokeStyle = obs.color || '#9b59b6';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    ctx.closePath();
                    
                    // Main portal circle
                    ctx.beginPath();
                    ctx.arc(obs.x, obs.y, obs.r * pulse, 0, Math.PI * 2);
                    ctx.fillStyle = obs.color || '#9b59b6';
                    ctx.fill();
                    ctx.closePath();
                    
                    // Portal core
                    ctx.beginPath();
                    ctx.arc(obs.x, obs.y, obs.r * 0.4, 0, Math.PI * 2);
                    ctx.fillStyle = '#ffffff';
                    ctx.fill();
                    ctx.closePath();

                    // Draw link lines to target portal in editor
                    if (obs.target) {
                        ctx.save();
                        ctx.strokeStyle = 'rgba(155, 89, 182, 0.3)';
                        ctx.lineWidth = 2;
                        ctx.setLineDash([4, 4]);
                        ctx.beginPath();
                        ctx.moveTo(obs.x, obs.y);
                        ctx.lineTo(obs.target.x, obs.target.y);
                        ctx.stroke();
                        ctx.restore();
                    }
                } else if (obs.type === 'saw') {
                    ctx.save();
                    ctx.translate(obs.x, obs.y);
                    ctx.rotate(obs.angle || 0);
                    
                    // Draw circular saw blade body
                    ctx.fillStyle = '#bdc3c7';
                    ctx.beginPath();
                    ctx.arc(0, 0, obs.r - 2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.closePath();
                    
                    // Draw spinning teeth
                    const teethCount = 8;
                    ctx.fillStyle = '#7f8c8d';
                    for (let i = 0; i < teethCount; i++) {
                        ctx.rotate((Math.PI * 2) / teethCount);
                        ctx.beginPath();
                        ctx.moveTo(obs.r - 4, -4);
                        ctx.lineTo(obs.r + 6, 0);
                        ctx.lineTo(obs.r - 4, 4);
                        ctx.fill();
                        ctx.closePath();
                    }
                    
                    // Draw center
                    ctx.beginPath();
                    ctx.arc(0, 0, obs.r * 0.4, 0, Math.PI * 2);
                    ctx.strokeStyle = '#95a5a6';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                    ctx.closePath();
                    
                    ctx.fillStyle = '#e74c3c';
                    ctx.beginPath();
                    ctx.arc(0, 0, 4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.closePath();
                    
                    ctx.restore();
                    
                    // Animate slightly in editor mode for visual feedback
                    obs.angle = (obs.angle || 0) + 0.02;
                } else if (obs.type === 'boost') {
                    ctx.fillStyle = 'rgba(46, 204, 113, 0.22)';
                    ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
                    ctx.strokeStyle = '#2ecc71';
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
                    
                    ctx.save();
                    ctx.translate(obs.x + obs.w / 2, obs.y + obs.h / 2);
                    const angle = Math.atan2(obs.direction.y, obs.direction.x);
                    ctx.rotate(angle);
                    
                    // Pulsing chevron arrows pointing in direction
                    const pulse = 1 + 0.05 * Math.sin(performance.now() / 120);
                    ctx.beginPath();
                    ctx.moveTo(-6 * pulse, -5);
                    ctx.lineTo(2 * pulse, 0);
                    ctx.lineTo(-6 * pulse, 5);
                    ctx.strokeStyle = '#2ecc71';
                    ctx.lineWidth = 2.5;
                    ctx.stroke();
                    ctx.closePath();
                    
                    ctx.restore();
                } else if (obs.type === 'fragile_bouncer') {
                    ctx.fillStyle = obs.hitsRemaining === 1 ? '#d35400' : '#e67e22';
                    ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
                    
                    ctx.beginPath();
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
                    ctx.lineWidth = 1.5;
                    ctx.moveTo(obs.x + 5, obs.y + 5);
                    ctx.lineTo(obs.x + obs.w - 5, obs.y + obs.h - 5);
                    ctx.stroke();
                    ctx.closePath();
                } else if (obs.type === 'puzzle_hole') {
                    const pulse = 1 + 0.05 * Math.sin(performance.now() / 100);
                    ctx.beginPath();
                    ctx.arc(obs.x, obs.y, obs.r * pulse, 0, Math.PI * 2);
                    ctx.fillStyle = '#111111';
                    ctx.fill();
                    ctx.strokeStyle = '#9b59b6';
                    ctx.lineWidth = 2.5;
                    ctx.stroke();
                    ctx.closePath();
                    
                    ctx.fillStyle = '#9b59b6';
                    ctx.font = 'bold 8px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(`PORTAL ${obs.puzzleId}`, obs.x, obs.y - obs.r - 4);
                }
            });
        }

        // 3. Draw Coins from lvl.coins
        if (lvl.coins) {
            lvl.coins.forEach(coin => {
                ctx.beginPath();
                ctx.arc(coin.x, coin.y, coin.r, 0, Math.PI * 2);
                ctx.fillStyle = '#f1c40f';
                ctx.fill();
                ctx.strokeStyle = '#f39c12';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.closePath();
            });
        }

        // 4. Draw Exit Door
        if (lvl.exit) {
            ctx.fillStyle = '#8b4513';
            ctx.fillRect(lvl.exit.x, lvl.exit.y, lvl.exit.w, lvl.exit.h);
            ctx.strokeStyle = '#5d2e0f';
            ctx.lineWidth = 3;
            ctx.strokeRect(lvl.exit.x, lvl.exit.y, lvl.exit.w, lvl.exit.h);

            // Exit Door handle
            ctx.fillStyle = '#d4af37';
            ctx.beginPath();
            ctx.arc(lvl.exit.x + lvl.exit.w - 8, lvl.exit.y + lvl.exit.h / 2, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // 5. Draw Player Start
        if (lvl.playerStart) {
            ctx.beginPath();
            ctx.arc(lvl.playerStart.x, lvl.playerStart.y, 12, 0, Math.PI * 2);
            ctx.fillStyle = '#e74c3c';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.closePath();
            
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 8px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('START', lvl.playerStart.x, lvl.playerStart.y);
        }

        // 6. Draw selection outline/handles for the selected item
        if (this.editorSelectedObject) {
            const sel = this.editorSelectedObject;
            ctx.save();
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 2]);
            
            if (sel === lvl.playerStart) {
                ctx.beginPath();
                ctx.arc(sel.x, sel.y, 15, 0, Math.PI * 2);
                ctx.stroke();
            } else if (sel.r !== undefined) {
                ctx.beginPath();
                ctx.arc(sel.x, sel.y, sel.r + 3, 0, Math.PI * 2);
                ctx.stroke();
            } else if (sel.w !== undefined) {
                ctx.strokeRect(sel.x - 3, sel.y - 3, sel.w + 6, sel.h + 6);
                
                // Draw solid cyan resize handle at bottom-right corner
                ctx.restore();
                ctx.fillStyle = '#00ffff';
                ctx.fillRect(sel.x + sel.w - 4, sel.y + sel.h - 4, 8, 8);
                
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.strokeRect(sel.x + sel.w - 4, sel.y + sel.h - 4, 8, 8);
                ctx.save();
            }
            ctx.restore();
        }

        // 7. Draw dragging / resizing preview guide in real-time
        if (this.editorDrawing && this.editorDrawStart && this.editorDrawCurrent) {
            const start = this.editorDrawStart;
            const cur = this.editorDrawCurrent;
            const x = Math.min(start.x, cur.x);
            const y = Math.min(start.y, cur.y);
            const w = Math.abs(start.x - cur.x);
            const h = Math.abs(start.y - cur.y);

            ctx.save();
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x, y, w, h);
            ctx.restore();
        }
    }

    loop() {
        if (this.gameRunning) {
            this.update();
            this.draw();
            this.animationId = requestAnimationFrame(() => this.loop());
        } else if (this.editorMode) {
            this.drawEditor();
            this.animationId = requestAnimationFrame(() => this.loop());
        }
    }

    stopGame() {
        this.gameRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }

    enterPuzzleMode(hole) {
        // Save current level state
        this.savedLevelState = {
            player: { ...this.player },
            coins: this.coins.map(c => ({ ...c })),
            obstacles: this.obstacles.map(o => ({ ...o })),
            exit: { ...this.exit },
            ballLaunched: this.ballLaunched,
            coinsCollected: this.coinsCollected,
            requiredCoins: this.requiredCoins,
            trailPoints: [...this.trailPoints],
            launchDirection: { ...this.launchDirection },
            directionChangeBlockedUntil: this.directionChangeBlockedUntil,
            spawnShieldActive: this.spawnShieldActive,
            spawnShieldExpiresAt: this.spawnShieldExpiresAt,
            holeId: hole.id || `${hole.x}_${hole.y}`
        };

        this.inPuzzleMode = true;
        this.activePuzzleId = hole.puzzleId;
        this.setupPuzzlePreset(hole.puzzleId);
    }

    setupPuzzlePreset(puzzleId) {
        this.coins = [];
        this.obstacles = [];
        this.coinsCollected = 0;
        this.ballLaunched = false;
        this.trailPoints = [];

        // All puzzles have an exit door at the right bottom
        this.exit = { x: 520, y: 320, w: 40, h: 40, open: false };

        if (puzzleId === 1) {
            // Maze Escape Puzzle
            this.player.x = 80;
            this.player.y = 80;
            
            // Maze walls
            this.obstacles.push({ x: 200, y: 0, w: 30, h: 260, type: 'bouncer' });
            this.obstacles.push({ x: 380, y: 140, w: 30, h: 260, type: 'bouncer' });
            // Shorter wall (w: 100 instead of 180) to leave an 80px gap at the right side of this horizontal partition
            this.obstacles.push({ x: 200, y: 260, w: 100, h: 30, type: 'bouncer' });

            // A small moving hazard in the gap
            this.obstacles.push({ x: 250, y: 340, w: 80, h: 20, type: 'hazard', vx: 2 });

            // Coins
            this.coins.push({ x: 100, y: 320, r: 8 });
            this.coins.push({ x: 300, y: 80, r: 8 });
            this.coins.push({ x: 480, y: 150, r: 8 });
            
            this.requiredCoins = this.coins.length;
        } else if (puzzleId === 2) {
            // Boost Precision steering
            this.player.x = 60;
            this.player.y = 200;

            // Boost pads pushing player up and down
            this.obstacles.push({ x: 180, y: 280, w: 32, h: 32, type: 'boost', direction: { x: 0, y: -1 } });
            this.obstacles.push({ x: 320, y: 80, w: 32, h: 32, type: 'boost', direction: { x: 0, y: 1 } });
            this.obstacles.push({ x: 440, y: 280, w: 32, h: 32, type: 'boost', direction: { x: 0, y: -1 } });

            // Hazards between the boost pads
            this.obstacles.push({ x: 240, y: 60, w: 25, h: 180, type: 'hazard' });
            this.obstacles.push({ x: 370, y: 160, w: 25, h: 180, type: 'hazard' });

            // Coins
            this.coins.push({ x: 196, y: 120, r: 8 });
            this.coins.push({ x: 336, y: 280, r: 8 });
            this.coins.push({ x: 456, y: 120, r: 8 });

            this.requiredCoins = this.coins.length;
        } else {
            // Portal teleporter puzzle
            this.player.x = 80;
            this.player.y = 80;

            // Portal chain
            const p1 = { x: 200, y: 280, r: 15, type: 'portal', color: '#9b59b6', target: { x: 400, y: 100 } };
            const p2 = { x: 400, y: 100, r: 15, type: 'portal', color: '#e67e22', target: { x: 200, y: 280 } };
            this.obstacles.push(p1, p2);

            // Hazards blocking areas
            this.obstacles.push({ x: 0, y: 180, w: 260, h: 25, type: 'hazard' });
            this.obstacles.push({ x: 340, y: 220, w: 260, h: 25, type: 'hazard' });

            // Fragile bouncers
            this.obstacles.push({ x: 120, y: 120, w: 60, h: 20, type: 'fragile_bouncer', hitsRemaining: 2 });
            this.obstacles.push({ x: 420, y: 280, w: 60, h: 20, type: 'fragile_bouncer', hitsRemaining: 2 });

            // Coins
            this.coins.push({ x: 80, y: 320, r: 8 });
            this.coins.push({ x: 500, y: 80, r: 8 });

            this.requiredCoins = this.coins.length;
        }
        
        cntText.innerText = '0';
        if (cntTotalText) cntTotalText.innerText = String(this.requiredCoins);
        if (steeringTimerText) {
            steeringTimerText.innerText = 'PUZZLE CHALLENGE';
            steeringTimerText.style.color = '#9b59b6';
            steeringTimerText.style.textShadow = '0 0 5px rgba(155, 89, 182, 0.5)';
        }
    }

    completePuzzle() {
        const state = this.savedLevelState;
        this.player = state.player;
        this.coins = state.coins;
        this.obstacles = state.obstacles;
        this.exit = state.exit;
        this.ballLaunched = false;
        this.coinsCollected = state.coinsCollected;
        this.requiredCoins = state.requiredCoins;
        this.trailPoints = [{ x: this.player.x, y: this.player.y }];
        this.launchDirection = state.launchDirection;
        this.directionChangeBlockedUntil = 0;
        this.spawnShieldActive = false;
        this.spawnShieldExpiresAt = 0;

        const completedHole = this.obstacles.find(o => o.type === 'puzzle_hole' && (o.id === state.holeId || `${o.x}_${o.y}` === state.holeId));
        if (completedHole) {
            completedHole.completed = true;
        }

        this.inPuzzleMode = false;
        this.activePuzzleId = 0;
        this.savedLevelState = null;

        lvlText.innerText = this.level;
        cntText.innerText = this.coinsCollected;
        if (cntTotalText) cntTotalText.innerText = String(this.requiredCoins);
        if (steeringTimerText) {
            steeringTimerText.innerText = 'READY';
            steeringTimerText.style.color = '#2ecc71';
            steeringTimerText.style.textShadow = '0 0 5px rgba(46, 204, 113, 0.5)';
        }
    }

    completeGame() {
        this.stopGame();
        alert('🎉 Congratulations! You completed all levels!');
        this.returnToMenu();
    }

    returnToMenu() {
        this.stopGame();
        this.isCustomPlay = false;
        this.isPlaytesting = false;
        this.editorMode = false;
        
        // Hide editor components
        document.getElementById('editorPanel').classList.add('hidden');
        document.getElementById('editorStatsText').classList.add('hidden');
        document.getElementById('gameStatsText').classList.remove('hidden');
        
        gameScreen.classList.add('hidden');
        menuScreen.classList.remove('hidden');
        initializeMenu();
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
            const speed = this.isCustomPlay ? (this.customLevelConfig.speed || 5) : (3 + this.level);
            this.player.vx = this.launchDirection.x * speed;
            this.player.vy = this.launchDirection.y * speed;
            // Block direction changes for the first DIRECTION_CHANGE_COOLDOWN_MS after launch
            this.directionChangeBlockedUntil = performance.now() + DIRECTION_CHANGE_COOLDOWN_MS;
            this.spawnShieldActive = true;
            this.spawnShieldExpiresAt = this.directionChangeBlockedUntil;
        }
    }

    setLaunchDirection(dirX, dirY) {
        // Allow direction changes anytime (before or after launch)
        this.launchDirection = { x: dirX, y: dirY };
    }

    // === LEVEL EDITOR ACTIONS ===

    enterEditorMode() {
        this.stopGame();
        this.editorMode = true;
        this.isCustomPlay = false;
        this.isPlaytesting = false;

        // Hide normal menu and game UI, show editor UI
        menuScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        
        const gameStats = document.getElementById('gameStatsText');
        const editorStats = document.getElementById('editorStatsText');
        const editorPanel = document.getElementById('editorPanel');
        const gameHint = document.getElementById('gameHintText');
        
        if (gameStats) gameStats.classList.add('hidden');
        if (editorStats) editorStats.classList.remove('hidden');
        if (editorPanel) editorPanel.classList.remove('hidden');
        if (gameHint) {
            gameHint.innerText = "Editor Mode: Snapped to 20px grid. Place objects, config properties, click Playtest!";
        }

        // Load custom level config from localStorage or set default
        this.loadEditorCustomLevel();
        
        // Reset properties panel
        this.editorSelectedObject = null;
        this.updatePropertiesPanel();

        // Switch to Select tool by default
        this.setEditorTool('select');

        // Populate dropdown
        this.updateSavedLevelsDropdown();

        // Start editor loop
        this.loop();
    }

    exitEditorMode() {
        this.stopGame();
        this.editorMode = false;
        this.returnToMenu();
    }

    setEditorTool(toolId) {
        this.editorActiveTool = toolId;
        
        // Update tool UI buttons
        const toolButtons = document.querySelectorAll('#editorToolbox button');
        toolButtons.forEach(btn => {
            if (btn.id === `tool-${toolId}`) {
                btn.classList.add('active');
                btn.style.background = '#9b59b6';
                btn.style.border = '1px solid #ffffff';
            } else {
                btn.classList.remove('active');
                btn.style.background = '';
                btn.style.border = '';
            }
        });
        
        // Reset any portal placement states
        this.editorPendingPortal = null;
    }

    handleCanvasMouseDown(e) {
        if (!this.editorMode || this.isPlaytesting) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const snappedX = snap(mouseX);
        const snappedY = snap(mouseY);

        if (this.editorActiveTool === 'select') {
            // First check if user clicked on the resize handle of the currently selected rectangular object
            if (this.editorSelectedObject && this.editorSelectedObject.w !== undefined && this.editorSelectedObject.h !== undefined) {
                const sel = this.editorSelectedObject;
                const handleX = sel.x + sel.w;
                const handleY = sel.y + sel.h;
                if (Math.abs(mouseX - handleX) <= 6 && Math.abs(mouseY - handleY) <= 6) {
                    this.editorResizingObject = true;
                    return;
                }
            }

            // Find object clicked on
            const clickedObj = this.findObjectAt(mouseX, mouseY);
            if (clickedObj) {
                this.editorSelectedObject = clickedObj;
                this.editorDraggingObject = true;
                
                // Keep track of the click offset
                this.editorDragOffset = {
                    x: mouseX - clickedObj.x,
                    y: mouseY - clickedObj.y
                };
                
                this.updatePropertiesPanel();
            } else {
                this.editorSelectedObject = null;
                this.updatePropertiesPanel();
            }
        } else if (['bouncer', 'hazard', 'slow_zone', 'fragile_bouncer'].includes(this.editorActiveTool)) {
            // Rectangular drawing tool
            this.editorDrawing = true;
            this.editorDrawStart = { x: snappedX, y: snappedY };
            this.editorDrawCurrent = { x: snappedX, y: snappedY };
        } else {
            // Placement tool (coins, saws, boost pad, player start, exit, portals, puzzle holes)
            this.placeObjectAt(snappedX, snappedY);
        }
    }

    handleCanvasMouseMove(e) {
        if (!this.editorMode || this.isPlaytesting) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        this.editorLastMousePos = { x: mouseX, y: mouseY };

        if (this.editorResizingObject && this.editorSelectedObject) {
            const sel = this.editorSelectedObject;
            const newW = snap(mouseX - sel.x);
            const newH = snap(mouseY - sel.y);
            sel.w = Math.max(20, newW);
            sel.h = Math.max(20, newH);
            this.updatePropertiesPanel();
        } else if (this.editorDrawing) {
            this.editorDrawCurrent = { x: snap(mouseX), y: snap(mouseY) };
        } else if (this.editorDraggingObject && this.editorSelectedObject) {
            const newX = snap(mouseX - this.editorDragOffset.x);
            const newY = snap(mouseY - this.editorDragOffset.y);

            // Bound checking to keep inside canvas
            const obj = this.editorSelectedObject;
            const oldX = obj.x;
            const oldY = obj.y;

            if (obj === this.editorCustomLevel.playerStart) {
                obj.x = Math.max(15, Math.min(canvas.width - 15, newX));
                obj.y = Math.max(15, Math.min(canvas.height - 15, newY));
            } else if (obj === this.editorCustomLevel.exit) {
                obj.x = Math.max(0, Math.min(canvas.width - obj.w, newX));
                obj.y = Math.max(0, Math.min(canvas.height - obj.h, newY));
            } else if (obj.r !== undefined) {
                obj.x = Math.max(obj.r, Math.min(canvas.width - obj.r, newX));
                obj.y = Math.max(obj.r, Math.min(canvas.height - obj.r, newY));
                
                // If it is a portal, adjust targets of Portal A and B
                if (obj.type === 'portal') {
                    this.editorCustomLevel.obstacles.forEach(other => {
                        if (other.type === 'portal') {
                            if (other.target && other.target.x === oldX && other.target.y === oldY) {
                                other.target.x = obj.x;
                                other.target.y = obj.y;
                            }
                        }
                    });
                }
            } else if (obj.w !== undefined) {
                obj.x = Math.max(0, Math.min(canvas.width - obj.w, newX));
                obj.y = Math.max(0, Math.min(canvas.height - obj.h, newY));
            }

            this.updatePropertiesPanel();
        }
    }

    handleCanvasMouseUp(e) {
        if (!this.editorMode || this.isPlaytesting) return;

        if (this.editorDrawing) {
            this.editorDrawing = false;
            const start = this.editorDrawStart;
            const cur = this.editorDrawCurrent;

            let x = Math.min(start.x, cur.x);
            let y = Math.min(start.y, cur.y);
            let w = Math.abs(start.x - cur.x);
            let h = Math.abs(start.y - cur.y);

            // Minimum sizing
            if (w < 20) w = 40;
            if (h < 20) h = 20;

            const obstacle = {
                x: x,
                y: y,
                w: w,
                h: h,
                type: this.editorActiveTool
            };

            if (this.editorActiveTool === 'slow_zone') {
                obstacle.speedMultiplier = 0.5;
            } else if (this.editorActiveTool === 'fragile_bouncer') {
                obstacle.hitsRemaining = 2;
            }

            this.editorCustomLevel.obstacles.push(obstacle);
            this.editorSelectedObject = obstacle;
            this.updatePropertiesPanel();
            this.saveEditorCustomLevel();
        }

        if (this.editorResizingObject) {
            this.editorResizingObject = false;
            this.saveEditorCustomLevel();
        }

        if (this.editorDraggingObject) {
            this.editorDraggingObject = false;
            this.saveEditorCustomLevel();
        }
    }

    findObjectAt(x, y) {
        const lvl = this.editorCustomLevel;

        // Check Exit Door
        if (x >= lvl.exit.x && x <= lvl.exit.x + lvl.exit.w && y >= lvl.exit.y && y <= lvl.exit.y + lvl.exit.h) {
            return lvl.exit;
        }

        // Check Player Start position
        const distToStart = Math.hypot(x - lvl.playerStart.x, y - lvl.playerStart.y);
        if (distToStart < 15) {
            return lvl.playerStart;
        }

        // Check Coins
        for (let i = 0; i < lvl.coins.length; i++) {
            const coin = lvl.coins[i];
            if (Math.hypot(x - coin.x, y - coin.y) < coin.r + 4) {
                return coin;
            }
        }

        // Check Obstacles
        for (let i = 0; i < lvl.obstacles.length; i++) {
            const obs = lvl.obstacles[i];
            if (obs.r !== undefined) {
                if (Math.hypot(x - obs.x, y - obs.y) < obs.r + 4) {
                    return obs;
                }
            } else if (obs.w !== undefined) {
                if (x >= obs.x && x <= obs.x + obs.w && y >= obs.y && y <= obs.y + obs.h) {
                    return obs;
                }
            }
        }

        return null;
    }

    placeObjectAt(x, y) {
        const lvl = this.editorCustomLevel;

        if (this.editorActiveTool === 'player') {
            lvl.playerStart = { x, y };
            this.editorSelectedObject = lvl.playerStart;
        } else if (this.editorActiveTool === 'exit') {
            lvl.exit = { x: x - 20, y: y - 20, w: 40, h: 40 };
            this.editorSelectedObject = lvl.exit;
        } else if (this.editorActiveTool === 'coin') {
            const coin = { x, y, r: 8 };
            lvl.coins.push(coin);
            this.editorSelectedObject = coin;
        } else if (this.editorActiveTool === 'saw') {
            const saw = { x, y, r: 18, type: 'saw', vx: 2.0, vy: 2.0, angle: 0 };
            lvl.obstacles.push(saw);
            this.editorSelectedObject = saw;
        } else if (this.editorActiveTool === 'boost') {
            const boost = { x: x - 16, y: y - 16, w: 32, h: 32, type: 'boost', direction: { x: 1, y: 0 } };
            lvl.obstacles.push(boost);
            this.editorSelectedObject = boost;
        } else if (this.editorActiveTool === 'puzzle_hole') {
            const puzzle_hole = {
                x,
                y,
                r: 20,
                type: 'puzzle_hole',
                puzzleId: 1,
                completed: false,
                id: 'custom_hole_' + Date.now()
            };
            lvl.obstacles.push(puzzle_hole);
            this.editorSelectedObject = puzzle_hole;
        } else if (this.editorActiveTool === 'portal') {
            if (!this.editorPendingPortal) {
                const portalA = {
                    x,
                    y,
                    r: 15,
                    type: 'portal',
                    color: '#9b59b6',
                    target: null
                };
                lvl.obstacles.push(portalA);
                this.editorPendingPortal = portalA;
                this.editorSelectedObject = portalA;
                alert("Portal A placed! Click again to place linked Portal B.");
            } else {
                const portalB = {
                    x,
                    y,
                    r: 15,
                    type: 'portal',
                    color: '#e67e22',
                    target: { x: this.editorPendingPortal.x, y: this.editorPendingPortal.y }
                };
                this.editorPendingPortal.target = { x, y };
                lvl.obstacles.push(portalB);
                this.editorSelectedObject = portalB;
                this.editorPendingPortal = null;
            }
        } else if (this.editorActiveTool === 'bouncer') {
            const bouncer = { x: x - 30, y: y - 10, w: 60, h: 20, type: 'bouncer' };
            lvl.obstacles.push(bouncer);
            this.editorSelectedObject = bouncer;
        } else if (this.editorActiveTool === 'hazard') {
            const hazard = { x: x - 20, y: y - 20, w: 40, h: 40, type: 'hazard' };
            lvl.obstacles.push(hazard);
            this.editorSelectedObject = hazard;
        } else if (this.editorActiveTool === 'slow_zone') {
            const slow_zone = { x: x - 40, y: y - 40, w: 80, h: 80, type: 'slow_zone', speedMultiplier: 0.5 };
            lvl.obstacles.push(slow_zone);
            this.editorSelectedObject = slow_zone;
        } else if (this.editorActiveTool === 'fragile_bouncer') {
            const fragile_bouncer = { x: x - 30, y: y - 10, w: 60, h: 20, type: 'fragile_bouncer', hitsRemaining: 2 };
            lvl.obstacles.push(fragile_bouncer);
            this.editorSelectedObject = fragile_bouncer;
        }

        this.updatePropertiesPanel();
        this.saveEditorCustomLevel();
    }

    updatePropertiesPanel() {
        const panel = document.getElementById('editorPropertiesPanel');
        if (!panel) return;

        if (!this.editorSelectedObject) {
            panel.innerHTML = '<span style="color: #95a5a6; font-style: italic;">Select an item on the canvas to configure properties.</span>';
            return;
        }

        const obj = this.editorSelectedObject;
        const lvl = this.editorCustomLevel;

        let name = "Unknown";
        let isPlayer = (obj === lvl.playerStart);
        let isExit = (obj === lvl.exit);

        if (isPlayer) name = "Player Start";
        else if (isExit) name = "Exit Door";
        else if (obj.r !== undefined && !obj.type) name = "Coin";
        else if (obj.type === 'bouncer') name = "Bouncer";
        else if (obj.type === 'hazard') name = "Hazard";
        else if (obj.type === 'slow_zone') name = "Slow Zone";
        else if (obj.type === 'portal') name = "Portal";
        else if (obj.type === 'saw') name = "Moving Saw";
        else if (obj.type === 'boost') name = "Boost Pad";
        else if (obj.type === 'fragile_bouncer') name = "Fragile Bouncer";
        else if (obj.type === 'puzzle_hole') name = "Puzzle Hole";

        let html = `<div style="font-weight: bold; color: #fff; margin-bottom: 8px; font-size: 0.9rem;">${name}</div>`;
        
        html += `
            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                <label style="flex: 1; display: flex; flex-direction: column;">
                    <span>X:</span>
                    <input type="number" id="prop-x" value="${Math.round(obj.x)}" style="background: #2c3e50; border: 1px solid #7f8c8d; color: white; padding: 2px 4px; border-radius: 4px; font-size: 0.75rem;">
                </label>
                <label style="flex: 1; display: flex; flex-direction: column;">
                    <span>Y:</span>
                    <input type="number" id="prop-y" value="${Math.round(obj.y)}" style="background: #2c3e50; border: 1px solid #7f8c8d; color: white; padding: 2px 4px; border-radius: 4px; font-size: 0.75rem;">
                </label>
            </div>
        `;

        if (obj.w !== undefined) {
            html += `
                <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                    <label style="flex: 1; display: flex; flex-direction: column;">
                        <span>Width:</span>
                        <input type="number" id="prop-w" value="${Math.round(obj.w)}" style="background: #2c3e50; border: 1px solid #7f8c8d; color: white; padding: 2px 4px; border-radius: 4px; font-size: 0.75rem;">
                    </label>
                    <label style="flex: 1; display: flex; flex-direction: column;">
                        <span>Height:</span>
                        <input type="number" id="prop-h" value="${Math.round(obj.h)}" style="background: #2c3e50; border: 1px solid #7f8c8d; color: white; padding: 2px 4px; border-radius: 4px; font-size: 0.75rem;">
                    </label>
                </div>
            `;
        }

        if (obj.type === 'slow_zone') {
            html += `
                <div style="margin-bottom: 8px;">
                    <label style="display: flex; flex-direction: column;">
                        <span>Speed Mult:</span>
                        <input type="number" step="0.1" min="0.1" max="1" id="prop-slow" value="${obj.speedMultiplier || 0.5}" style="background: #2c3e50; border: 1px solid #7f8c8d; color: white; padding: 2px 4px; border-radius: 4px; font-size: 0.75rem;">
                    </label>
                </div>
            `;
        } else if (obj.type === 'fragile_bouncer') {
            html += `
                <div style="margin-bottom: 8px;">
                    <label style="display: flex; flex-direction: column;">
                        <span>Hits Allowed:</span>
                        <input type="number" min="1" max="10" id="prop-hits" value="${obj.hitsRemaining || 2}" style="background: #2c3e50; border: 1px solid #7f8c8d; color: white; padding: 2px 4px; border-radius: 4px; font-size: 0.75rem;">
                    </label>
                </div>
            `;
        } else if (obj.type === 'saw') {
            html += `
                <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                    <label style="flex: 1; display: flex; flex-direction: column;">
                        <span>Speed VX:</span>
                        <input type="number" step="0.5" id="prop-vx" value="${obj.vx || 0}" style="background: #2c3e50; border: 1px solid #7f8c8d; color: white; padding: 2px 4px; border-radius: 4px; font-size: 0.75rem;">
                    </label>
                    <label style="flex: 1; display: flex; flex-direction: column;">
                        <span>Speed VY:</span>
                        <input type="number" step="0.5" id="prop-vy" value="${obj.vy || 0}" style="background: #2c3e50; border: 1px solid #7f8c8d; color: white; padding: 2px 4px; border-radius: 4px; font-size: 0.75rem;">
                    </label>
                </div>
            `;
        } else if (obj.type === 'boost') {
            const dirX = obj.direction.x;
            const dirY = obj.direction.y;
            let dirVal = 'right';
            if (dirX === 1 && dirY === 0) dirVal = 'right';
            else if (dirX === -1 && dirY === 0) dirVal = 'left';
            else if (dirX === 0 && dirY === -1) dirVal = 'up';
            else if (dirX === 0 && dirY === 1) dirVal = 'down';

            html += `
                <div style="margin-bottom: 8px;">
                    <span style="display: block; margin-bottom: 4px; font-weight: bold;">Boost Direction:</span>
                    <div style="display: flex; gap: 6px;">
                        <button id="btn-dir-right" style="flex: 1; padding: 6px 4px; background: ${dirVal === 'right' ? '#2ecc71' : '#34495e'}; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.85rem; transition: background 0.15s;">→</button>
                        <button id="btn-dir-left" style="flex: 1; padding: 6px 4px; background: ${dirVal === 'left' ? '#2ecc71' : '#34495e'}; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.85rem; transition: background 0.15s;">←</button>
                        <button id="btn-dir-up" style="flex: 1; padding: 6px 4px; background: ${dirVal === 'up' ? '#2ecc71' : '#34495e'}; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.85rem; transition: background 0.15s;">↑</button>
                        <button id="btn-dir-down" style="flex: 1; padding: 6px 4px; background: ${dirVal === 'down' ? '#2ecc71' : '#34495e'}; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.85rem; transition: background 0.15s;">↓</button>
                    </div>
                </div>
            `;
        } else if (obj.type === 'puzzle_hole') {
            const pId = obj.puzzleId || 1;
            html += `
                <div style="margin-bottom: 8px;">
                    <span style="display: block; margin-bottom: 4px; font-weight: bold;">Puzzle Preset:</span>
                    <div style="display: flex; gap: 6px;">
                        <button id="btn-puzzle-1" style="flex: 1; padding: 6px 4px; background: ${pId === 1 ? '#9b59b6' : '#34495e'}; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.75rem; transition: background 0.15s;">Preset 1</button>
                        <button id="btn-puzzle-2" style="flex: 1; padding: 6px 4px; background: ${pId === 2 ? '#9b59b6' : '#34495e'}; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.75rem; transition: background 0.15s;">Preset 2</button>
                        <button id="btn-puzzle-3" style="flex: 1; padding: 6px 4px; background: ${pId === 3 ? '#9b59b6' : '#34495e'}; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.75rem; transition: background 0.15s;">Preset 3</button>
                    </div>
                </div>
            `;
        }

        if (!isPlayer && !isExit) {
            html += `
                <button id="prop-delete-btn" style="background: #c0392b; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; width: 100%; font-size: 0.8rem; margin-top: 8px; transition: background 0.2s;">Delete Object</button>
            `;
        }

        panel.innerHTML = html;

        // Bind event listeners to input changes
        const inputX = document.getElementById('prop-x');
        const inputY = document.getElementById('prop-y');
        const inputW = document.getElementById('prop-w');
        const inputH = document.getElementById('prop-h');
        const inputSlow = document.getElementById('prop-slow');
        const inputHits = document.getElementById('prop-hits');
        const inputVX = document.getElementById('prop-vx');
        const inputVY = document.getElementById('prop-vy');
        const deleteBtn = document.getElementById('prop-delete-btn');

        if (inputX) {
            inputX.addEventListener('input', (e) => {
                const val = parseInt(e.target.value) || 0;
                const oldX = obj.x;
                obj.x = val;
                
                if (obj.type === 'portal') {
                    lvl.obstacles.forEach(other => {
                        if (other.type === 'portal' && other.target && other.target.x === oldX && other.target.y === obj.y) {
                            other.target.x = val;
                        }
                    });
                }
                this.saveEditorCustomLevel();
            });
        }
        if (inputY) {
            inputY.addEventListener('input', (e) => {
                const val = parseInt(e.target.value) || 0;
                const oldY = obj.y;
                obj.y = val;
                
                if (obj.type === 'portal') {
                    lvl.obstacles.forEach(other => {
                        if (other.type === 'portal' && other.target && other.target.x === obj.x && other.target.y === oldY) {
                            other.target.y = val;
                        }
                    });
                }
                this.saveEditorCustomLevel();
            });
        }
        if (inputW) {
            inputW.addEventListener('input', (e) => {
                obj.w = parseInt(e.target.value) || 20;
                this.saveEditorCustomLevel();
            });
        }
        if (inputH) {
            inputH.addEventListener('input', (e) => {
                obj.h = parseInt(e.target.value) || 20;
                this.saveEditorCustomLevel();
            });
        }
        if (inputSlow) {
            inputSlow.addEventListener('input', (e) => {
                obj.speedMultiplier = parseFloat(e.target.value) || 0.5;
                this.saveEditorCustomLevel();
            });
        }
        if (inputHits) {
            inputHits.addEventListener('input', (e) => {
                obj.hitsRemaining = parseInt(e.target.value) || 2;
                this.saveEditorCustomLevel();
            });
        }
        if (inputVX) {
            inputVX.addEventListener('input', (e) => {
                obj.vx = parseFloat(e.target.value) || 0;
                this.saveEditorCustomLevel();
            });
        }
        if (inputVY) {
            inputVY.addEventListener('input', (e) => {
                obj.vy = parseFloat(e.target.value) || 0;
                this.saveEditorCustomLevel();
            });
        }
        
        // Boost Direction button listeners
        const btnRight = document.getElementById('btn-dir-right');
        const btnLeft = document.getElementById('btn-dir-left');
        const btnUp = document.getElementById('btn-dir-up');
        const btnDown = document.getElementById('btn-dir-down');

        if (btnRight) {
            btnRight.addEventListener('click', () => {
                obj.direction = { x: 1, y: 0 };
                this.saveEditorCustomLevel();
                this.updatePropertiesPanel();
            });
        }
        if (btnLeft) {
            btnLeft.addEventListener('click', () => {
                obj.direction = { x: -1, y: 0 };
                this.saveEditorCustomLevel();
                this.updatePropertiesPanel();
            });
        }
        if (btnUp) {
            btnUp.addEventListener('click', () => {
                obj.direction = { x: 0, y: -1 };
                this.saveEditorCustomLevel();
                this.updatePropertiesPanel();
            });
        }
        if (btnDown) {
            btnDown.addEventListener('click', () => {
                obj.direction = { x: 0, y: 1 };
                this.saveEditorCustomLevel();
                this.updatePropertiesPanel();
            });
        }

        // Puzzle Preset button listeners
        const btnP1 = document.getElementById('btn-puzzle-1');
        const btnP2 = document.getElementById('btn-puzzle-2');
        const btnP3 = document.getElementById('btn-puzzle-3');

        if (btnP1) {
            btnP1.addEventListener('click', () => {
                obj.puzzleId = 1;
                this.saveEditorCustomLevel();
                this.updatePropertiesPanel();
            });
        }
        if (btnP2) {
            btnP2.addEventListener('click', () => {
                obj.puzzleId = 2;
                this.saveEditorCustomLevel();
                this.updatePropertiesPanel();
            });
        }
        if (btnP3) {
            btnP3.addEventListener('click', () => {
                obj.puzzleId = 3;
                this.saveEditorCustomLevel();
                this.updatePropertiesPanel();
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.deleteSelectedObject();
            });
        }
    }

    deleteSelectedObject() {
        if (!this.editorSelectedObject) return;
        const obj = this.editorSelectedObject;
        const lvl = this.editorCustomLevel;

        const coinIdx = lvl.coins.indexOf(obj);
        if (coinIdx !== -1) {
            lvl.coins.splice(coinIdx, 1);
            this.editorSelectedObject = null;
            this.updatePropertiesPanel();
            this.saveEditorCustomLevel();
            return;
        }

        const obsIdx = lvl.obstacles.indexOf(obj);
        if (obsIdx !== -1) {
            if (obj.type === 'portal') {
                const targetX = obj.target ? obj.target.x : null;
                const targetY = obj.target ? obj.target.y : null;
                
                lvl.obstacles.splice(obsIdx, 1);
                
                if (targetX !== null && targetY !== null) {
                    const targetPortalIdx = lvl.obstacles.findIndex(other => other.type === 'portal' && other.x === targetX && other.y === targetY);
                    if (targetPortalIdx !== -1) {
                        lvl.obstacles.splice(targetPortalIdx, 1);
                    }
                }
            } else {
                lvl.obstacles.splice(obsIdx, 1);
            }
            this.editorSelectedObject = null;
            this.updatePropertiesPanel();
            this.saveEditorCustomLevel();
        }
    }

    saveEditorCustomLevel() {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('magicCustomLevelScratchpad', JSON.stringify(this.editorCustomLevel));
        }
    }

    loadEditorCustomLevel() {
        if (typeof localStorage !== 'undefined') {
            const raw = localStorage.getItem('magicCustomLevelScratchpad');
            if (raw) {
                try {
                    this.editorCustomLevel = JSON.parse(raw);
                    if (!this.editorCustomLevel.playerStart) this.editorCustomLevel.playerStart = { x: 60, y: 60 };
                    if (!this.editorCustomLevel.exit) this.editorCustomLevel.exit = { x: 520, y: 320, w: 40, h: 40 };
                    if (!this.editorCustomLevel.coins) this.editorCustomLevel.coins = [];
                    if (!this.editorCustomLevel.obstacles) this.editorCustomLevel.obstacles = [];
                    if (!this.editorCustomLevel.speed) this.editorCustomLevel.speed = 5.0;
                    return;
                } catch (e) {
                    // Ignore
                }
            }
        }
        this.editorCustomLevel = this.getDefaultCustomLevel();
    }

    getDefaultCustomLevel() {
        return {
            speed: 5.0,
            playerStart: { x: 60, y: 60 },
            exit: { x: 520, y: 320, w: 40, h: 40 },
            coins: [],
            obstacles: []
        };
    }

    startPlaytest() {
        this.stopGame();
        this.isCustomPlay = true;
        this.isPlaytesting = true;
        this.editorMode = false;
        
        this.customLevelConfig = JSON.parse(JSON.stringify(this.editorCustomLevel));
        
        document.getElementById('editorStatsText').classList.add('hidden');
        
        const gameStats = document.getElementById('gameStatsText');
        if (gameStats) gameStats.classList.remove('hidden');

        const gameHint = document.getElementById('gameHintText');
        if (gameHint) gameHint.innerText = "Playtesting: Bounce and collect coins to unlock exit! Press Back to Menu or stop playtest button in editor.";

        const playtestBtn = document.getElementById('editorPlaytestBtn');
        if (playtestBtn) {
            playtestBtn.innerText = "⏹ Stop Playtest";
            playtestBtn.style.background = '#e74c3c';
        }

        // Hide editor toolbox and properties header/panel
        document.getElementById('editorToolboxHeader').classList.add('hidden');
        document.getElementById('editorToolbox').classList.add('hidden');
        document.getElementById('editorPropertiesHeader').classList.add('hidden');
        document.getElementById('editorPropertiesPanel').classList.add('hidden');
        document.getElementById('editorSavedLevelsContainer').classList.add('hidden');

        // Hide other operations buttons in the same container during playtest
        document.getElementById('editorSaveBtn').classList.add('hidden');
        document.getElementById('editorExportImportContainer').classList.add('hidden');
        document.getElementById('editorClearBtn').classList.add('hidden');

        this.gameRunning = true;
        this.resetLevel();
        this.loop();
    }

    stopPlaytest() {
        this.stopGame();
        this.isCustomPlay = false;
        this.isPlaytesting = false;
        this.editorMode = true;

        const playtestBtn = document.getElementById('editorPlaytestBtn');
        if (playtestBtn) {
            playtestBtn.innerText = "▶ Playtest";
            playtestBtn.style.background = '#2ecc71';
        }

        // Restore editor toolbox and properties header/panel
        document.getElementById('editorToolboxHeader').classList.remove('hidden');
        document.getElementById('editorToolbox').classList.remove('hidden');
        document.getElementById('editorPropertiesHeader').classList.remove('hidden');
        document.getElementById('editorPropertiesPanel').classList.remove('hidden');
        document.getElementById('editorSavedLevelsContainer').classList.remove('hidden');

        // Restore other operations buttons
        document.getElementById('editorSaveBtn').classList.remove('hidden');
        document.getElementById('editorExportImportContainer').classList.remove('hidden');
        document.getElementById('editorClearBtn').classList.remove('hidden');

        document.getElementById('gameStatsText').classList.add('hidden');
        document.getElementById('editorStatsText').classList.remove('hidden');
        document.getElementById('gameHintText').innerText = "Editor Mode: Place items, adjust parameters, then Playtest!";

        this.editorSelectedObject = null;
        this.updatePropertiesPanel();

        this.loop();
    }

    exportCustomLevel() {
        const json = JSON.stringify(this.editorCustomLevel);
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            navigator.clipboard.writeText(json).then(() => {
                alert("Level configuration JSON copied to clipboard successfully!");
            }).catch(err => {
                showCustomPrompt("Export Level (Copy the text below):", "", () => {}, json);
            });
        } else {
            showCustomPrompt("Export Level (Copy the text below):", "", () => {}, json);
        }
    }

    importCustomLevel() {
        showCustomPrompt("Import Level", "Paste your JSON level configuration here:", (json) => {
            if (!json) return;
            try {
                const config = JSON.parse(json);
                if (!config.playerStart || !config.exit) {
                    alert("Invalid level format: Must contain playerStart and exit properties.");
                    return;
                }
                if (!config.coins) config.coins = [];
                if (!config.obstacles) config.obstacles = [];
                if (!config.speed) config.speed = 5.0;

                this.editorCustomLevel = config;
                this.editorSelectedObject = null;
                this.updatePropertiesPanel();
                this.saveEditorCustomLevel();
                this.updateSavedLevelsDropdown();
                alert("Level imported successfully!");
            } catch (e) {
                alert("Invalid JSON data. Import failed.");
            }
        });
    }



    clearCustomLevel() {
        if (confirm("Are you sure you want to clear this entire custom level?")) {
            this.editorCustomLevel = this.getDefaultCustomLevel();
            this.editorSelectedObject = null;
            this.updatePropertiesPanel();
            this.saveEditorCustomLevel();
        }
    }

    saveCustomLevelToList() {
        showCustomPrompt("Enter a name for this custom level:", "My Custom Level", (levelName) => {
            if (levelName === null) return;
            
            const trimmedName = levelName.trim();
            
            // Save to Workspace custom_presets.json if running in Electron (fs is available)
            let savedPermanently = false;
            if (fs) {
                let presets = [];
                try {
                    const fsPath = path.join(baseDir, 'custom_presets.json');
                    if (fs.existsSync(fsPath)) {
                        const data = fs.readFileSync(fsPath, 'utf8');
                        presets = JSON.parse(data);
                    }
                } catch (err) {
                    console.error("Error reading existing custom_presets.json:", err);
                }

                // Create a copy for the permanent preset
                const presetCopy = JSON.parse(JSON.stringify(this.editorCustomLevel));
                presetCopy.name = trimmedName !== "" ? trimmedName : `Preset Level ${TOTAL_LEVELS + 1}`;
                if (!presetCopy.speed) presetCopy.speed = 5.0;

                presets.push(presetCopy);

                try {
                    const fsPath = path.join(baseDir, 'custom_presets.json');
                    fs.writeFileSync(fsPath, JSON.stringify(presets, null, 4), 'utf8');
                    
                    // Append it to current session array to make it live instantly
                    LEVEL_PRESETS.push(presetCopy);
                    TOTAL_LEVELS += 1;
                    savedPermanently = true;
                } catch (err) {
                    console.error("Error writing custom_presets.json:", err);
                }
            } else {
                // Fallback to Save to Local Storage Custom Levels in browser environment
                if (!progress.customLevels) {
                    progress.customLevels = [];
                }
                
                const copy = JSON.parse(JSON.stringify(this.editorCustomLevel));
                copy.name = trimmedName !== "" ? trimmedName : `Custom Level ${progress.customLevels.length + 1}`;
                if (!copy.speed) copy.speed = 5.0;
                
                progress.customLevels.push(copy);
                saveProgress();
            }
            
            if (savedPermanently) {
                alert("Level successfully saved permanently to custom_presets.json!");
            } else {
                alert("Level saved to your Custom Levels list! You can play it from the main levels menu.");
            }
            
            this.updateSavedLevelsDropdown();
            updateDevDeleteSelect();
            initializeMenu();
        });
    }

    updateSavedLevelsDropdown() {
        const select = document.getElementById('editorSavedLevelsSelect');
        if (!select) return;

        select.innerHTML = '<option value="">-- Choose Level --</option>';

        // 1. Preset Levels (from custom_presets.json / LEVEL_PRESETS starting from 72)
        if (LEVEL_PRESETS.length > 72) {
            const grp = document.createElement('optgroup');
            grp.label = "Preset Levels";
            for (let i = 72; i < LEVEL_PRESETS.length; i++) {
                const opt = document.createElement('option');
                opt.value = `preset-${i}`;
                opt.textContent = `${i + 1}: ${LEVEL_PRESETS[i].name || 'Preset'}`;
                grp.appendChild(opt);
            }
            select.appendChild(grp);
        }

        // 2. Local Custom Levels (from progress.customLevels)
        const customLevels = progress.customLevels || [];
        if (customLevels.length > 0) {
            const grp = document.createElement('optgroup');
            grp.label = "Local Custom Levels";
            customLevels.forEach((cl, index) => {
                const opt = document.createElement('option');
                opt.value = `local-${index}`;
                opt.textContent = cl.name || `Custom Level ${index + 1}`;
                grp.appendChild(opt);
            });
            select.appendChild(grp);
        }
    }

    loadCustomLevelFromSelect(val) {
        let config = null;
        if (val.startsWith('preset-')) {
            const idx = parseInt(val.substring(7));
            config = LEVEL_PRESETS[idx];
        } else if (val.startsWith('local-')) {
            const idx = parseInt(val.substring(6));
            const customLevels = progress.customLevels || [];
            config = customLevels[idx];
        }
        
        if (!config) return;

        if (confirm(`Load "${config.name || 'Level'}" into the editor? This will overwrite the current draft.`)) {
            this.editorCustomLevel = JSON.parse(JSON.stringify(config));
            this.editorSelectedObject = null;
            this.updatePropertiesPanel();
            this.saveEditorCustomLevel();
        }
    }

    deleteCustomLevelFromSelect(val) {
        if (!val) return;
        
        if (val.startsWith('preset-')) {
            const idx = parseInt(val.substring(7));
            const presetToDelete = LEVEL_PRESETS[idx];
            if (!presetToDelete) return;
            
            if (confirm(`Are you sure you want to delete "${presetToDelete.name || 'this preset'}" permanently for everyone? This cannot be undone.`)) {
                if (fs) {
                    let presets = [];
                    try {
                        const fsPath = path.join(baseDir, 'custom_presets.json');
                        if (fs.existsSync(fsPath)) {
                            const data = fs.readFileSync(fsPath, 'utf8');
                            presets = JSON.parse(data);
                        }
                    } catch (err) {
                        console.error("Error reading custom_presets.json during delete:", err);
                    }
                    
                    const customPresetIndex = idx - 72;
                    if (customPresetIndex >= 0 && customPresetIndex < presets.length) {
                        presets.splice(customPresetIndex, 1);
                        try {
                            const fsPath = path.join(baseDir, 'custom_presets.json');
                            fs.writeFileSync(fsPath, JSON.stringify(presets, null, 4), 'utf8');
                        } catch (err) {
                            alert("Failed to write to custom_presets.json: " + err.message);
                            return;
                        }
                    }
                }
                
                LEVEL_PRESETS.splice(idx, 1);
                TOTAL_LEVELS -= 1;
                
                if (progress.unlockedLevel > TOTAL_LEVELS) {
                    progress.unlockedLevel = TOTAL_LEVELS;
                    saveProgress();
                }
                
                alert("Preset level deleted successfully!");
                updateDevDeleteSelect();
                initializeMenu();
                this.updateSavedLevelsDropdown();
            }
        } else if (val.startsWith('local-')) {
            const idx = parseInt(val.substring(6));
            const customLevels = progress.customLevels || [];
            const config = customLevels[idx];
            if (!config) return;
            
            if (confirm(`Are you sure you want to delete "${config.name || 'Level'}" from your local levels list?`)) {
                progress.customLevels.splice(idx, 1);
                saveProgress();
                alert("Custom level deleted successfully!");
                initializeMenu();
                this.updateSavedLevelsDropdown();
            }
        }
    }

    startCustomLevel(index) {
        const customLevels = progress.customLevels || [];
        const config = customLevels[index];
        if (!config) return;

        this.stopGame();
        this.isCustomPlay = true;
        this.customLevelConfig = config;
        this.customLevelIndex = index;
        
        this.gameRunning = true;
        this.resetLevel();
        
        menuScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        
        this.loop();
    }



    placeObjectFromDragAndDrop(toolId, x, y) {
        if (toolId === 'portal') {
            this.editorActiveTool = 'portal';
            this.placeObjectAt(x, y);
            if (!this.editorPendingPortal) {
                this.setEditorTool('select');
            } else {
                // Keep the portal tool active visually
                const toolButtons = document.querySelectorAll('#editorToolbox button');
                toolButtons.forEach(btn => {
                    if (btn.id === 'tool-portal') {
                        btn.classList.add('active');
                        btn.style.background = '#9b59b6';
                        btn.style.border = '1px solid #ffffff';
                    } else {
                        btn.classList.remove('active');
                        btn.style.background = '';
                        btn.style.border = '';
                    }
                });
            }
        } else {
            this.setEditorTool(toolId);
            this.placeObjectAt(x, y);
            this.setEditorTool('select');
        }
    }
}

const game = new Game();

function getTotalPages() {
    const customLevelsCount = (progress.customLevels || []).length;
    return Math.ceil((TOTAL_LEVELS + customLevelsCount) / LEVELS_PER_PAGE);
}

function updateMenuButtons() {
    const customLevelsCount = (progress.customLevels || []).length;
    const totalButtonsCount = TOTAL_LEVELS + customLevelsCount;
    const totalPages = Math.ceil(totalButtonsCount / LEVELS_PER_PAGE);

    const firstLevel = (currentMenuPage - 1) * LEVELS_PER_PAGE + 1;
    const lastLevel = Math.min(currentMenuPage * LEVELS_PER_PAGE, totalButtonsCount);

    const buttons = levelsGrid.querySelectorAll('button');
    buttons.forEach((btn, index) => {
        const levelNumber = index + 1;
        const isOnPage = levelNumber >= firstLevel && levelNumber <= lastLevel;
        btn.style.display = isOnPage ? 'inline-flex' : 'none';

        if (levelNumber <= TOTAL_LEVELS) {
            btn.disabled = levelNumber > game.unlockedLevels;
            if (btn.disabled) {
                btn.classList.add('locked');
                btn.title = 'Unlock the previous level to play this one';
            } else {
                btn.classList.remove('locked');
                btn.title = '';
            }
        } else {
            btn.disabled = false;
            btn.classList.remove('locked');
            btn.title = '';
        }
    });

    pageLabel.innerText = `Page ${currentMenuPage}/${totalPages || 1}`;
    prevPageBtn.disabled = currentMenuPage <= 1;
    nextPageBtn.disabled = currentMenuPage >= totalPages;
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
// Initialize menu
function initializeMenu() {
    levelsGrid.innerHTML = '';
    
    // Preset Levels
    for (let i = 1; i <= TOTAL_LEVELS; i++) {
        const btn = document.createElement('button');
        btn.className = 'level-btn';
        btn.innerText = i;
        btn.onclick = () => game.startLevel(i);
        levelsGrid.appendChild(btn);
    }

    // Custom Levels
    const customLevels = progress.customLevels || [];
    customLevels.forEach((cl, index) => {
        const btn = document.createElement('button');
        btn.className = 'level-btn';
        btn.style.background = 'linear-gradient(135deg, #8e44ad 0%, #c39bd3 100%)';
        btn.innerText = `C${index + 1}`;
        btn.title = cl.name || `Custom Level ${index + 1}`;
        btn.onclick = () => game.startCustomLevel(index);
        levelsGrid.appendChild(btn);
    });

    showMenuPage(currentMenuPage);
    updateMenuStats();
    updateShopUI();
}

let eventListenersInitialized = false;

function initializeAllEventListeners() {
    if (eventListenersInitialized) return;
    eventListenersInitialized = true;

    // 1. Pagination Listeners
    prevPageBtn.addEventListener('click', () => showMenuPage(currentMenuPage - 1));
    nextPageBtn.addEventListener('click', () => showMenuPage(currentMenuPage + 1));
    
    // 2. Settings Listeners
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            const now = performance.now();
            if (now - lastSettingsClickTime < 500) {
                settingsClickCount++;
                if (settingsClickCount >= 3) {
                    settingsClickCount = 0;
                    requestDeveloperAccess(() => {});
                }
            } else {
                settingsClickCount = 1;
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

    // 3. Developer Tools Listeners
    const unlockAllLevelsBtn = document.getElementById('unlockAllLevelsBtn');
    const unlockAllItemsBtn = document.getElementById('unlockAllItemsBtn');
    const devOpenEditorBtn = document.getElementById('devOpenEditorBtn');
    const devDeleteLevelSelect = document.getElementById('devDeleteLevelSelect');
    const devDeleteLevelBtn = document.getElementById('devDeleteLevelBtn');

    if (unlockAllLevelsBtn) {
        unlockAllLevelsBtn.addEventListener('click', unlockAllLevels);
    }
    if (unlockAllItemsBtn) {
        unlockAllItemsBtn.addEventListener('click', unlockAllItems);
    }
    if (devOpenEditorBtn) {
        devOpenEditorBtn.addEventListener('click', () => {
            settingsScreen.classList.add('hidden');
            game.enterEditorMode();
        });
    }
    if (devDeleteLevelBtn && devDeleteLevelSelect) {
        devDeleteLevelBtn.addEventListener('click', () => {
            const val = devDeleteLevelSelect.value;
            if (val === "") {
                alert("Please select a level preset to delete.");
                return;
            }
            
            const levelIndex = parseInt(val);
            const presetToDelete = LEVEL_PRESETS[levelIndex];
            if (!presetToDelete) {
                alert("Invalid level selected.");
                return;
            }
            
            if (confirm(`Are you sure you want to delete "${presetToDelete.name || 'this preset'}" permanently for everyone? This cannot be undone.`)) {
                if (fs) {
                    let presets = [];
                    try {
                        const fsPath = path.join(baseDir, 'custom_presets.json');
                        if (fs.existsSync(fsPath)) {
                            const data = fs.readFileSync(fsPath, 'utf8');
                            presets = JSON.parse(data);
                        }
                    } catch (err) {
                        console.error("Error reading custom_presets.json during delete:", err);
                    }
                    
                    const customPresetIndex = levelIndex - 72;
                    if (customPresetIndex >= 0 && customPresetIndex < presets.length) {
                        presets.splice(customPresetIndex, 1);
                        
                        try {
                            const fsPath = path.join(baseDir, 'custom_presets.json');
                            fs.writeFileSync(fsPath, JSON.stringify(presets, null, 4), 'utf8');
                        } catch (err) {
                            alert("Failed to write to custom_presets.json: " + err.message);
                            return;
                        }
                    }
                }
                
                LEVEL_PRESETS.splice(levelIndex, 1);
                TOTAL_LEVELS -= 1;
                
                if (progress.unlockedLevel > TOTAL_LEVELS) {
                    progress.unlockedLevel = TOTAL_LEVELS;
                    saveProgress();
                }
                
                alert("Preset level deleted successfully!");
                updateDevDeleteSelect();
                initializeMenu();
                game.updateSavedLevelsDropdown();
            }
        });
    }

    // 4. Shop Listeners
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

    // 5. Back Button
    backBtn.addEventListener('click', () => {
        if (game.isPlaytesting) {
            game.stopPlaytest();
        } else {
            game.returnToMenu();
        }
    });

    // 7. Toolbox Buttons (with drag and drop source initialization)
    const toolboxTools = [
        'select', 'player', 'exit', 'coin',
        'bouncer', 'hazard', 'slow_zone', 'portal',
        'saw', 'boost', 'fragile_bouncer', 'puzzle_hole'
    ];
    toolboxTools.forEach(toolId => {
        const btn = document.getElementById(`tool-${toolId}`);
        if (btn) {
            btn.addEventListener('click', () => {
                game.setEditorTool(toolId);
            });
            if (toolId !== 'select') {
                btn.setAttribute('draggable', 'true');
                btn.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', toolId);
                });
            }
        }
    });

    // 8. Operations Buttons
    const playtestBtn = document.getElementById('editorPlaytestBtn');
    if (playtestBtn) {
        playtestBtn.addEventListener('click', () => {
            if (game.isPlaytesting) {
                game.stopPlaytest();
            } else {
                game.startPlaytest();
            }
        });
    }

    const saveBtn = document.getElementById('editorSaveBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            game.saveCustomLevelToList();
        });
    }



    const exportBtn = document.getElementById('editorExportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            game.exportCustomLevel();
        });
    }

    const importBtn = document.getElementById('editorImportBtn');
    if (importBtn) {
        importBtn.addEventListener('click', () => {
            game.importCustomLevel();
        });
    }

    const clearBtn = document.getElementById('editorClearBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            game.clearCustomLevel();
        });
    }

    // 9. Saved Levels Management
    const selectSaved = document.getElementById('editorSavedLevelsSelect');
    if (selectSaved) {
        selectSaved.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val !== "") {
                game.loadCustomLevelFromSelect(val);
            }
        });
    }

    const deleteSavedBtn = document.getElementById('editorDeleteSavedBtn');
    if (deleteSavedBtn) {
        deleteSavedBtn.addEventListener('click', () => {
            const select = document.getElementById('editorSavedLevelsSelect');
            if (select && select.value !== "") {
                game.deleteCustomLevelFromSelect(select.value);
            } else {
                alert("Please select a saved level first.");
            }
        });
    }

    // 10. Canvas Mouse & Drag/Drop Listeners
    canvas.addEventListener('mousedown', (e) => {
        game.handleCanvasMouseDown(e);
    });
    canvas.addEventListener('mousemove', (e) => {
        game.handleCanvasMouseMove(e);
    });
    canvas.addEventListener('mouseup', (e) => {
        game.handleCanvasMouseUp(e);
    });

    canvas.addEventListener('dragover', (e) => {
        if (!game.editorMode || game.isPlaytesting) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    });

    canvas.addEventListener('drop', (e) => {
        if (!game.editorMode || game.isPlaytesting) return;
        e.preventDefault();

        const toolId = e.dataTransfer.getData('text/plain');
        if (!toolId) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const snappedX = snap(mouseX);
        const snappedY = snap(mouseY);

        game.placeObjectFromDragAndDrop(toolId, snappedX, snappedY);
    });
}

// Global Grid Snapping Helper
function snap(val, size = 20) {
    return Math.round(val / size) * size;
}

// Launch ball with Space or Enter key
const keysPressed = {};

document.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT' || activeEl.tagName === 'TEXTAREA')) {
        // Let normal typing and text inputs work
        return;
    }

    // Delete selected block on Backspace or Delete key
    if (e.code === 'Backspace' || e.code === 'Delete') {
        if (game.editorMode && !game.isPlaytesting && game.editorSelectedObject) {
            e.preventDefault();
            game.deleteSelectedObject();
            return;
        }
    }

    // Toggle developer tools hotkey: Backquote / tilde key (`)
    if (e.code === 'Backquote') {
        e.preventDefault();
        
        requestDeveloperAccess((granted) => {
            if (granted) {
                game.stopGame();
                menuScreen.classList.add('hidden');
                gameScreen.classList.add('hidden');
                const editorPanel = document.getElementById('editorPanel');
                if (editorPanel) editorPanel.classList.add('hidden');
                settingsScreen.classList.remove('hidden');
            } else if (!developerModeEnabled) {
                settingsScreen.classList.add('hidden');
                menuScreen.classList.remove('hidden');
                initializeMenu();
            }
        });
        return;
    }

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
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT' || activeEl.tagName === 'TEXTAREA')) {
        return;
    }
    // Track key releases
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'KeyZ', 'KeyX', 'KeyC'].includes(e.code)) {
        keysPressed[e.code] = false;
    }
});

// Launch ball with click on canvas (only in normal game, not editor)
canvas.addEventListener('click', () => {
    if (!game.editorMode && game.gameRunning && !game.ballLaunched) {
        game.launchBall();
    }
});

function showCustomPrompt(title, placeholder, callback, defaultValue = '') {
    const modal = document.getElementById('customPromptModal');
    const titleEl = document.getElementById('customPromptTitle');
    const inputEl = document.getElementById('customPromptInput');
    const cancelBtn = document.getElementById('customPromptCancel');
    const confirmBtn = document.getElementById('customPromptConfirm');

    if (!modal || !titleEl || !inputEl || !cancelBtn || !confirmBtn) {
        const res = prompt(title, defaultValue);
        callback(res);
        return;
    }

    titleEl.textContent = title;
    inputEl.value = defaultValue;
    inputEl.placeholder = placeholder;
    modal.classList.remove('hidden');
    inputEl.focus();
    if (defaultValue) {
        inputEl.select();
    }

    // Remove existing event listeners by cloning buttons
    const newCancelBtn = cancelBtn.cloneNode(true);
    const newConfirmBtn = confirmBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    newCancelBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        callback(null);
    });

    newConfirmBtn.addEventListener('click', () => {
        const val = inputEl.value;
        modal.classList.add('hidden');
        callback(val);
    });

    inputEl.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            newConfirmBtn.click();
        } else if (e.key === 'Escape') {
            newCancelBtn.click();
        }
    };
}

// Initialize the menu and event listeners on page load
initializeAllEventListeners();
initializeMenu();
game.loop();

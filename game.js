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

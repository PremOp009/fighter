const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const uiLayer = document.getElementById('ui-layer');
const startBtn = document.getElementById('start-btn');
const gameOverText = document.getElementById('game-over-text');

// HUD Elements
const levelIndicator = document.getElementById('level-indicator');
const levelUpMsg = document.getElementById('level-up-msg');

// Assets
const bgImage = new Image(); bgImage.src = 'background.jpeg'; 
const playerImg = new Image(); playerImg.src = 'player.png'; 
const enemyImg = new Image(); enemyImg.src = 'enemy.png'; 
const obstacleImg = new Image(); obstacleImg.src = 'obstacle.png';

const shootSound = new Audio('shoot.mp3');
const explosionSound = new Audio('explosion.mp3');
const bgMusic = new Audio('music.mp3');
bgMusic.loop = true; bgMusic.volume = 0.5;

canvas.width = Math.ceil(window.innerWidth);
canvas.height = Math.ceil(window.innerHeight);

// State
let gameRunning = false;
let gameOver = false;
let score = 0;
let level = 1;

let enemies = [];
let obstacles = [];
let bullets = [];
let explosions = [];

let spawnTimer = 0;
let obstacleTimer = 0;
let shootTimer = 0;

// Background
let bgX = 0; const bgSpeed = 2;

// Player
const player = { x: 100, y: canvas.height / 2, width: 100, height: 60, hitbox: 30 };

// Inputs
canvas.addEventListener('mousemove', (e) => {
    if (gameRunning && !gameOver) player.y = e.clientY;
});
window.addEventListener('resize', () => {
    canvas.width = Math.ceil(window.innerWidth);
    canvas.height = Math.ceil(window.innerHeight);
    if (!gameRunning) player.y = canvas.height / 2;
});

startBtn.addEventListener('click', startGame);

function startGame() {
    uiLayer.style.display = 'none'; // Hide Menu
    gameOverText.style.display = 'none'; 
    
    // 🔥 SHOW HUD 🔥
    levelIndicator.style.display = 'block';
    levelIndicator.innerText = "LEVEL: 1";
    levelUpMsg.style.display = 'none';

    gameRunning = true;
    gameOver = false;
    score = 0;
    level = 1;
    
    enemies = [];
    obstacles = [];
    bullets = [];
    explosions = [];
    player.x = 100;
    
    bgMusic.currentTime = 0;
    bgMusic.play().catch(e => console.log(e));
}

function triggerGameOver() {
    gameOver = true;
    gameRunning = false;
    bgMusic.pause();
    explosionSound.currentTime = 0;
    explosionSound.play();

    uiLayer.style.display = 'block'; // Show Menu
    gameOverText.style.display = 'block';
    
    // Hide HUD Level on death so it doesn't overlap
    levelIndicator.style.display = 'none';
    
    startBtn.innerText = "RETRY MISSION";
    startBtn.style.background = "red";
    startBtn.style.color = "white";
}

function checkLevelUp() {
    let oldLevel = level;
    
    // Level Logic: 
    if (score >= 50) level = 4;      // GOD MODE
    else if (score >= 25) level = 3; // HARD
    else if (score >= 10) level = 2; // MEDIUM
    
    if (level > oldLevel) {
        levelUpMsg.innerText = "LEVEL " + level + "!";
        levelUpMsg.style.display = 'block';
        levelIndicator.innerText = "LEVEL: " + level;
        
        // Hide "Level Up" text after 2 seconds
        setTimeout(() => {
            levelUpMsg.style.display = 'none';
        }, 2000);
    }
}

// Classes
class Bullet {
    constructor(x, y) { this.x = x; this.y = y; this.speed = 15; this.markedForDeletion = false; }
    update() { this.x += this.speed; if (this.x > canvas.width) this.markedForDeletion = true; }
    draw() { ctx.fillStyle = '#00d2ff'; ctx.fillRect(this.x, this.y - 2, 30, 6); ctx.shadowBlur = 15; ctx.shadowColor = '#00d2ff'; }
}

class Explosion {
    constructor(x, y) { this.x = x; this.y = y; this.size = 1; this.maxSize = 50; this.markedForDeletion = false; }
    update() { this.size += 2; if (this.size > this.maxSize) this.markedForDeletion = true; }
    draw() { ctx.save(); ctx.globalAlpha = 1 - (this.size / this.maxSize); ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fillStyle = '#ffaa00'; ctx.fill(); ctx.restore(); }
}

class Enemy {
    constructor() {
        this.x = canvas.width; this.y = Math.random() * (canvas.height - 100) + 50;
        this.width = 100; this.height = 60;
        this.speed = (Math.random() * 3 + 4) + (level * 1.5); // Speed increases with level
        this.markedForDeletion = false;
    }
    update() { this.x -= this.speed; if (this.x < -100) this.markedForDeletion = true; }
    draw() {
        ctx.save(); ctx.translate(this.x, this.y); ctx.scale(-1, 1);
        if (enemyImg.complete) ctx.drawImage(enemyImg, -this.width/2, -this.height/2, this.width, this.height);
        else { ctx.fillStyle = 'red'; ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height); }
        ctx.restore();
    }
}

class Obstacle {
    constructor() {
        this.x = canvas.width; this.y = Math.random() * canvas.height;
        this.size = Math.random() * 40 + 40; 
        this.speed = (Math.random() * 2 + 3) + (level * 0.5); // Speed increases with level
        this.angle = 0; this.spinSpeed = Math.random() * 0.1 - 0.05;
        this.markedForDeletion = false;
    }
    update() { this.x -= this.speed; this.angle += this.spinSpeed; if (this.x < -100) this.markedForDeletion = true; }
    draw() {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
        if (obstacleImg.complete) ctx.drawImage(obstacleImg, -this.size/2, -this.size/2, this.size, this.size);
        else { ctx.fillStyle = 'gray'; ctx.beginPath(); ctx.arc(0, 0, this.size/2, 0, Math.PI*2); ctx.fill(); }
        ctx.restore();
    }
}

// Logic
function handleBullets() {
    bullets.forEach(b => { b.update(); b.draw(); }); bullets = bullets.filter(b => !b.markedForDeletion);
}
function handleExplosions() {
    explosions.forEach(e => { e.update(); e.draw(); }); explosions = explosions.filter(e => !e.markedForDeletion);
}
function handleObstacles() {
    let spawnRate = 150 - (level * 20); // Spawns faster with level
    if (obstacleTimer > spawnRate) { obstacles.push(new Obstacle()); obstacleTimer = 0; } else obstacleTimer++;
    obstacles.forEach(obs => {
        obs.update(); obs.draw();
        const dist = Math.sqrt((player.x - obs.x)**2 + (player.y - obs.y)**2);
        if (dist < (player.hitbox + obs.size/3)) { triggerGameOver(); explosions.push(new Explosion(player.x, player.y)); }
        bullets.forEach(bullet => {
            if (!bullet.markedForDeletion) {
                const bdist = Math.sqrt((bullet.x - obs.x)**2 + (bullet.y - obs.y)**2);
                if (bdist < obs.size/2) bullet.markedForDeletion = true;
            }
        });
    });
    obstacles = obstacles.filter(o => !o.markedForDeletion);
}
function handleEnemies() {
    let spawnRate = 60 - (level * 10); // Spawns faster with level
    if (spawnTimer > spawnRate) { enemies.push(new Enemy()); spawnTimer = 0; } else spawnTimer++;
    enemies.forEach(enemy => {
        enemy.update(); enemy.draw();
        const dist = Math.sqrt((player.x - enemy.x)**2 + (player.y - enemy.y)**2);
        if (dist < 40) { triggerGameOver(); explosions.push(new Explosion(player.x, player.y)); }
        if (!gameOver && Math.abs(player.y - enemy.y) < 30) {
            if (shootTimer > 15) {
                bullets.push(new Bullet(player.x + 40, player.y + 5));
                shootSound.currentTime = 0; shootSound.play(); shootTimer = 0;
            }
        }
        bullets.forEach(bullet => {
            if (!bullet.markedForDeletion && !enemy.markedForDeletion) {
                const dist = Math.sqrt((bullet.x - enemy.x)**2 + (bullet.y - enemy.y)**2);
                if (dist < 50) {
                    enemy.markedForDeletion = true; bullet.markedForDeletion = true;
                    explosions.push(new Explosion(enemy.x, enemy.y));
                    explosionSound.currentTime = 0; explosionSound.play(); score++;
                    checkLevelUp(); // Check level on every kill
                }
            }
        });
    });
    enemies = enemies.filter(e => !e.markedForDeletion);
    shootTimer++;
}

function drawScore() { ctx.fillStyle = 'white'; ctx.font = 'bold 30px Courier New'; ctx.fillText('SCORE: ' + score, 20, 40); }
function drawGameOverStats() { ctx.save(); ctx.fillStyle = 'white'; ctx.font = '20px Courier New'; ctx.fillText('FINAL SCORE: ' + score, canvas.width/2 - 70, canvas.height/2 + 80); ctx.restore(); }

function handleBackground() {
    if (bgImage.complete) {
        if (gameRunning && !gameOver) bgX -= bgSpeed;
        if (bgX <= -canvas.width * 2) bgX = 0;
        const x = Math.floor(bgX); const w = Math.ceil(canvas.width); const overlap = 2;
        if (x > -w) ctx.drawImage(bgImage, x, 0, w, canvas.height);
        if (x + w > -w) { ctx.save(); ctx.translate(x + w * 2 - overlap, 0); ctx.scale(-1, 1); ctx.drawImage(bgImage, 0, 0, w, canvas.height); ctx.restore(); }
        if (x + w * 2 > -w) { ctx.drawImage(bgImage, x + w * 2 - (overlap * 2), 0, w, canvas.height); }
    } else { ctx.fillStyle = '#0f2027'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
}

function animate() {
    handleBackground();
    if (!gameOver) { ctx.save(); ctx.translate(player.x, player.y); if (playerImg.complete) ctx.drawImage(playerImg, -player.width/2, -player.height/2, player.width, player.height); ctx.restore(); }
    if (gameRunning) { handleEnemies(); handleObstacles(); handleBullets(); handleExplosions(); if (!gameOver) drawScore(); else drawGameOverStats(); }
    requestAnimationFrame(animate);
}
animate();

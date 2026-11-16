
const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");

// Game Controls
const startButton = document.getElementById("start-button");
const pauseButton = document.getElementById("pause-button");
const gameMessage = document.getElementById("game-message");
const restartButton = document.getElementById("restart-button");

// Game States
let gameStarted  = false;
let paused = false;

// Start Button
startButton.addEventListener("click",  function() {
    gameStarted = true;

    startButton.hidden = true;
    pauseButton.hidden = false;

    gameMessage.textContent = "P TO PAUSE";
});

// Pause and Resum the game
function togglePause() {
    if (!gameStarted || gameOver) return;

    paused = !paused;

    pauseButton.textContent = paused ? "RESUME" : "PAUSE";

    gameMessage.textContent = paused ? "GAME PAUSED" : "P TO PAUSE";

    // Clear pressed keys when pausing
    if (paused) {
        for (const key in keys) {
            keys[key] = false;
        }
    }
}

pauseButton.addEventListener("click", togglePause);

restartButton.addEventListener("click", restartGame);

// Player
const player = {
    x: 400,
    y: 250,
    radius: 12,
    speed: 4,
    health: 100
};

// Keyboard controls
const keys = {};

// Mobile joystick
const joystick = document.getElementById("joystick");
const joystickStick = document.getElementById("joystick-stick");

let joystickActive = false;

function moveJoystick(event) {
    const rect = joystick.getBoundingClientRect();

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let dx = event.clientX - centerX;
    let dy = event.clientY - centerY;

    const maxDistance = 35;

    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > maxDistance) {
        dx = (dx / distance) * maxDistance;
        dy = (dy / distance) * maxDistance;
    }

    joystickStick.style.transform =
        `translate(${dx}px, ${dy}px)`;

    const threshold = 0.2;

    keys.d = dx / maxDistance > threshold;
    keys.a = dx / maxDistance < -threshold;
    keys.s = dy / maxDistance > threshold;
    keys.w = dy / maxDistance < -threshold;
}

function resetJoystick() {
    joystickActive = false;

    joystickStick.style.transform = "translate(0px, 0px)";

    keys.w = false;
    keys.a = false;
    keys.s = false;
    keys.d = false;
}

joystick.addEventListener("pointerdown", function(event) {
    joystickActive = true;

    joystick.setPointerCapture(event.pointerId);

    moveJoystick(event);
});

joystick.addEventListener("pointermove", function(event) {
    if (joystickActive) {
        moveJoystick(event);
    }
});

joystick.addEventListener("pointerup", resetJoystick);
joystick.addEventListener("pointercancel", resetJoystick);

const enemies = [];

let frameCount = 0;

let shootCooldown = 0;

const bullets = [];

const particles = [];

let score = 0;

let highScore = Number(localStorage.getItem("lastStandHighScore")) || 0;

let damageCooldown = 0;

let displayedHealth = 100;

// Screen Shake
let shakeTimer = 0;
const shakeIntensity = 4;

let survivalTime = 0;

let wave = 1;

let previousWave = 1;

let waveMessageTimer = 0;

let gameOver = false;

document.addEventListener("keydown", function(event) {
    const key = event.key.toLowerCase();

    keys[key] = true;

    if (key === "p" && !event.repeat) {
        togglePause();
    }

    if (key === "r" && gameOver) {
        restartGame();
    }
});

document.addEventListener("keyup", function(event) {
    keys[event.key.toLowerCase()] = false;
});

// Move player

function movePlayer() {

    let dx = 0;
    let dy = 0;

    // Horizontal movement
    if (keys["d"] || keys["arrowright"]) {
        dx += 1;
    }

    if (keys["a"] || keys["arrowleft"]) {
        dx -= 1;
    }

    // Vertical movement
    if (keys["s"] || keys["arrowdown"]) {
        dy += 1;
    }

    if (keys["w"] || keys["arrowup"]) {
        dy -= 1;
    }

    // Calculate movement length
    const length = Math.sqrt(dx * dx + dy * dy);

    // Normalize movement
    if (length > 0) {
        dx /= length;
        dy /= length;
    }

    // Apply movement speed
    player.x += dx * player.speed;
    player.y += dy * player.speed;

}


// Keep player inside arena
function keepPlayerInside() {

    player.x = Math.max(
        player.radius,
        Math.min(canvas.width - player.radius, player.x)
    );

    player.y = Math.max(
        player.radius,
        Math.min(canvas.height - player.radius, player.y)
    );

}

// Draw player
function drawPlayer() {

    ctx.beginPath();

    ctx.arc(
        player.x,
        player.y,
        player.radius,
        0,
        Math.PI * 2
    );

    ctx.fillStyle = "#2aa373";
    ctx.fill();

}

// Spawn Enemies
function spawnEnemy() {
    const enemy = {
        x: 0,
        y: 0,
        radius: 12,
        speed: Math.min(3.5, 1.3 + (wave - 1) * 0.2),
        health: 2
    };

    let attempts = 0;
    let distance = 0;

    do {
        const side = Math.floor(Math.random() * 4);

        if (side === 0) {
            enemy.x = Math.random() * canvas.width;
            enemy.y = 0;
        } else if (side === 1) {
            enemy.x = Math.random() * canvas.width;
            enemy.y = canvas.height;
        } else if (side === 2) {
            enemy.x = 0;
            enemy.y = Math.random() * canvas.height;
        } else {
            enemy.x = canvas.width;
            enemy.y = Math.random() * canvas.height;
        }

        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;

        distance = Math.sqrt(dx * dx + dy * dy);
        attempts++;

    } while (distance < 180 && attempts < 10);

    enemies.push(enemy);
}

// Updating Enemies
function updateEnemies() {
        for (const enemy of enemies) {
            if (enemy.hitFlash > 0) {
                enemy.hitFlash--;
            }
        }

    for (const enemy of enemies) {
        // Calculate direction toward player
        let dx = player.x - enemy.x;
        let dy = player.y - enemy.y;

    // Calculate distance
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Normalize direction 
    if (distance > 0) {
        dx /= distance;
        dy /= distance;
    }

    // Move enemy toward player
    enemy.x += dx * enemy.speed;
    enemy.y += dy * enemy.speed;
    }
}

// Player Collision Checking
function checkPlayerCollision() {
    if (damageCooldown > 0) {
         damageCooldown--;
         return;
        }

    for (const enemy of enemies) {
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;

        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < player.radius + enemy.radius) {
            player.health -= 10;
            damageCooldown = 60;

            // Trigger screen shake
            shakeTimer = 8;

            if (player.health <= 0) {
                player.health = 0;
                gameOver = true;

                restartButton.hidden = false;
                pauseButton.hidden = true;
                gameMessage.textContent = "YOU DID YOUR BEST. TRY AGAIN";

                if (score > highScore) {
                    highScore = score;

                    localStorage.setItem(
                        "lastStandHighScore",
                        highScore
                    );
                }
            }
            break;
        }
    }
}


// Create enemy particles
function createEnemyParticles(x, y) {
    for (let i = 0; i < 8; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;

        particles.push({
            x: x,
            y: y,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            life: 30,
            radius: 3
        });
    }
}

// Update particles 
function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];

        particle.x += particle.dx;
        particle.y += particle.dy;

        particle.life--;

        if (particle.life <= 0) {
            particles.splice(i, 1);
        }
    }
}


// Make the player shooot
function shoot() {
    if (enemies.length === 0) {
        return;
    }

    // Find the nearest enemy
    let nearestEnemy = enemies[0];
    let shortestDistance = Infinity;

    for (const enemy of enemies) {
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;

        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < shortestDistance) {
            shortestDistance = distance;
            nearestEnemy = enemy;
        }
    }

    // Calculate shooting direction
    let dx = nearestEnemy.x - player.x;
    let dy = nearestEnemy.y - player.y;

    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) {
        return;
    }
    dx /= distance;
    dy /= distance;

    // Create a bullet
    bullets.push({
        x: player.x,
        y: player.y,
        dx: dx,
        dy: dy,
        speed: 20,
        radius: 4
    });
}
// Auto Shooting function
function autoShoot() {
    shootCooldown++;

    if (shootCooldown >= 20){
        shoot();
        shootCooldown = 0;
    }
}
// Update Bullets
function updateBullets() {
    

    // Go through bullets backwards
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];

        // Move bullet
        bullet.x += bullet.dx * bullet.speed;
        bullet.y += bullet.dy * bullet.speed;

        // Check collision with enemies
        for (let j = enemies.length - 1; j >= 0; j--) {

            const enemy = enemies[j];

            const dx = enemy.x - bullet.x;
            const dy = enemy.y - bullet.y;

            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= enemy.radius + bullet.radius) {

                // Damage enemy
                enemy.health -= 1;

                // Activate hit flash
                enemy.hitFlash = 8;

                // Remove bullet
                bullets.splice(i, 1);
                

                // Check if enemy is defeated
                if (enemy.health <= 0) {
                    createEnemyParticles(enemy.x, enemy.y);
                    enemies.splice(j, 1);
                    score += 10;
                }
                break;
            }
        }

        // Remove bullet outside the arena
        if ( 
            bullet.x < 0 || 
            bullet.x > canvas.width || 
            bullet.y < 0 ||
            bullet.y > canvas.height
            ) {
            bullets.splice(i, 1);
        }
    }
}


// Draw Health Bar
function drawHealthBar() {

    // Smoothly animate health
    displayedHealth += (player.health - displayedHealth) * 0.15;

    // Keep health within 0-100
    displayedHealth = Math.max(0, Math.min(100, displayedHealth));

    // Health bar background
    ctx.fillStyle = "#333";
    ctx.fillRect(20, 65, 150, 14);

    // Choose colour based on health
    if (displayedHealth > 60) {
        ctx.fillStyle = "#42e6a4";
    } else if (displayedHealth > 30) {
        ctx.fillStyle = "#ffb347";
    } else {
        ctx.fillStyle = "#ff5263";
    }

    // Draw current health
    ctx.fillRect(
        20,
        65,
        150 * (displayedHealth / 100),
        14
    );

    // Health bar border
    ctx.strokeStyle = "white";
    ctx.lineWidth = 1;
    ctx.strokeRect(20, 65, 150, 14);

    // Health text
    ctx.fillStyle = "white";
    ctx.font = "bold 12px Arial";
    ctx.fillText(
        "HP: " + player.health,
        20,
        60
    );
}


// Drawing Game Info
function drawGameInfo() {
    ctx.textAlign = "right";

    // Wave
    ctx.fillStyle = "#42e6a4";
    ctx.font = "bold 22px Arial";

    ctx.fillText(
        "WAVE " + wave,
        canvas.width - 20,
        30
    );

    // Survival time
    ctx.fillStyle = "white";
    ctx.font = "16px Arial";

    ctx.fillText(
        "TIME: " + survivalTime + "s",
        canvas.width - 20,
        55
    );

    // High score
    ctx.fillStyle = "#ffb347";

    ctx.fillText(
        "BEST: " + highScore,
        canvas.width - 20,
        80
    );

    ctx.textAlign = "left";
}



// Drawing Enemies
function drawEnemies() {
    for (const enemy of enemies) {
    ctx.beginPath();

    ctx.arc(
        enemy.x,
        enemy.y,
        enemy.radius,
        0,
        Math.PI * 2
    );
    
    // Change color when enemy gets hit
    if (enemy.hitFlash > 0) {
        ctx.fillStyle = "white";
    } else {
        ctx.fillStyle = "#ff5263";
    }

    ctx.fill();
    }
}



// Drawing particles
function drawParticles() {
    for (const particle of particles) {
        ctx.beginPath();

        ctx.arc(
            particle.x,
            particle.y,
            particle.radius,
            0,
            Math.PI * 2
        );

    ctx.fillStyle = "#ffb347";
    ctx.fill();
    }
}

// Drawing score
function drawScore() {
    ctx.textAlign = "left";

    //  Score label
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px Arial";
    ctx.fillText("SCORE", 20, 35);

    ctx.fillStyle = "#42e6a4";
    ctx.font = "bold 24px Arial";

    ctx.fillText(score, 95, 35);
}

// Drawing Bullets
function drawBullets() {
    for (const bullet of bullets) {
        ctx.beginPath();
        ctx.arc(
            bullet.x,
            bullet.y,
            bullet.radius,
            0,
            Math.PI * 2
        );

        ctx.fillStyle = "#ffe66d";
        ctx.fill();
    }
}

function drawWaveAnnouncement() {
    if (waveMessageTimer > 0) {
        ctx.textAlign = "center";

        ctx.fillStyle = "#2aa373";
        ctx.font = "bold 36px Arial";

        ctx.fillText(
            "WAVE " + wave,
            canvas.width / 2,
            canvas.height / 2 - 15
        );
        ctx.textAlign = "left";
    }
}

function isMobileDevice() {
    return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

// Drawing Game Over function 
function drawGameOver() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#ff5363";
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "center";

    ctx. fillText(
        "GAME OVER",
        canvas.width / 2,
        canvas.height / 2
    );

    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText(
        "FINAL SCORE: " + score,
        canvas.width / 2,
        canvas.height / 2 + 45
    );

    ctx.fillText(
        isMobileDevice() ? "TAP RESTART TO PLAY AGAIN" : "PRESS R TO RESTART",
        canvas.width / 2,
        canvas.height / 2 + 85
    );
    ctx.textAlign = "left";
}

// Start Screen
function drawStartScreen() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.82)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = "center";

    ctx.fillStyle = "#2aa373";
    ctx.font = "bold 38px Arial";
    ctx.fillText("LAST STAND", canvas.width / 2, canvas.height / 2 - 60);

    ctx.fillStyle = "white";
    ctx.font = "18px Arial";
    ctx.fillText(
        "HOW LONG CAN YOU SURVIVE",
        canvas.width /2,
        canvas.height / 2 - 15
    );

    ctx.fillStyle = "#ebe4e4";
    ctx.font = "14px Arial";
    ctx.fillText(
        isMobileDevice() ? "USE THE JOYSTICK TO MOVE" : "WASD / ARROW KEYS TO MOVE",
        canvas.width / 2,
        canvas.height / 2 + 30
    );

    ctx.fillText(
        "AUTO-SHOOTING ENABLED",
        canvas.width /2,
        canvas.height / 2 + 60
    );

    ctx.textAlign = "left";

}

// Pause Screen
function drawPauseScreen() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = "center";

    ctx.fillStyle = "#d69b32";
    ctx.font = "bold 42px Arial";
    ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2 - 15);

    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.fillText(
        "PRESS P OR CLICK RESUME",
        canvas.width / 2,
        canvas.height / 2 + 30
    );
    ctx.textAlign = "left";
}

// Restart System
function restartGame() {
    player.x = 400;
    player.y = 250;
    player.health = 100;
    displayedHealth = 100;

    enemies.length = 0;
    bullets.length = 0;
    particles.length = 0;

    score = 0;
    frameCount = 0;
    shootCooldown = 0;
    damageCooldown = 0;
    survivalTime = 0;
    wave = 1;
    previousWave = 1;
    waveMessageTimer = 0;

    gameOver = false;
    restartButton.hidden = true;
    pauseButton.hidden = false;
    pauseButton.textContent = "PAUSE";

    gameMessage.textContent = "P TO PAUSE";
}

// Game loop

function gameLoop() {

    // Clear previous frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameStarted && !paused && !gameOver) {
        movePlayer();
        keepPlayerInside();

        frameCount++;

        survivalTime = Math.floor(frameCount / 60);

        wave = Math.floor(survivalTime / 20) + 1;

        if (wave > previousWave) {
            previousWave = wave;
            waveMessageTimer = 120;
        }

        if (waveMessageTimer > 0) {
            waveMessageTimer--;
        }

        let spawnInterval = Math.max(25, 100 - (wave - 1) * 10);

        if (frameCount % spawnInterval === 0) {
    // Calculate how many enemies should spawn
    const enemiesPerSpawn = Math.min(3, Math.ceil(wave / 3));

    // Maximum enemies allowed in the arena
    const maxEnemies = 15;

    // Spawn enemies without exceeding the limit
    for (let i = 0; i < enemiesPerSpawn; i++) {
        if (enemies.length < maxEnemies) {
            spawnEnemy();
        }
    }
}
    
    // Update enemies
    updateEnemies();

    checkPlayerCollision();

    if (shakeTimer > 0) {
        shakeTimer--;
    }

    autoShoot();

    updateBullets();

    updateParticles();
}

// Screen shake effect
ctx.save();

if (shakeTimer > 0) {
    const shakeX = (Math.random() - 0.5) * shakeIntensity * 2;
    const shakeY = (Math.random() - 0.5) * shakeIntensity * 2;

    ctx.translate(shakeX, shakeY);
}

    // Draw everything
    drawEnemies();
    drawBullets();
    drawParticles();
    drawPlayer();
    drawScore();
    drawHealthBar();
    drawGameInfo();

    ctx.restore();

    if (gameStarted && !gameOver) {
        drawWaveAnnouncement();
    }

    if (gameOver) {
        drawGameOver();
    }

    if (!gameStarted) {
        drawStartScreen();
    }

    if (paused) {
        drawPauseScreen();
    }

    // Next frame
    requestAnimationFrame(gameLoop);
}

// Start game
gameLoop();

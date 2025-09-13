export interface GameCallbacks {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onPowerUpChange: (powerUps: Array<{type: string, timeLeft: number}>) => void;
  onGameOver: () => void;
}

export interface Vector2D {
  x: number;
  y: number;
}

export interface GameObject {
  position: Vector2D;
  velocity: Vector2D;
  size: Vector2D;
  active: boolean;
}

export interface Player extends GameObject {
  health: number;
  shootCooldown: number;
  powerUps: Map<string, number>;
}

export interface Enemy extends GameObject {
  type: 'basic' | 'fast' | 'heavy';
  health: number;
  points: number;
  shootCooldown: number;
}

export interface Projectile extends GameObject {
  damage: number;
  owner: 'player' | 'enemy';
}

export interface PowerUp extends GameObject {
  type: 'rapidFire' | 'shield' | 'multiShot';
  duration: number;
}

export interface Particle extends GameObject {
  life: number;
  maxLife: number;
  color: string;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private callbacks: GameCallbacks;
  private lastTime: number = 0;
  private frameCount: number = 0;
  
  // Game state
  private score: number = 0;
  private lives: number = 3;
  private level: number = 1;
  private gameSpeed: number = 1;
  
  // Input state
  private input = {
    left: false,
    right: false,
    shoot: false
  };
  
  // Game objects
  private player: Player;
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private powerUps: PowerUp[] = [];
  private particles: Particle[] = [];
  
  // Spawn timers
  private enemySpawnTimer: number = 0;
  private powerUpSpawnTimer: number = 0;
  
  // Constants
  private readonly PLAYER_SPEED = 300;
  private readonly PROJECTILE_SPEED = 400;
  private readonly ENEMY_SPAWN_RATE = 2000; // milliseconds
  private readonly POWERUP_SPAWN_RATE = 15000; // milliseconds

  constructor(canvas: HTMLCanvasElement, callbacks: GameCallbacks) {
    this.canvas = canvas;
    this.callbacks = callbacks;
    
    // Initialize player
    this.player = {
      position: { x: canvas.width / 2, y: canvas.height - 60 },
      velocity: { x: 0, y: 0 },
      size: { x: 30, y: 30 },
      active: true,
      health: 100,
      shootCooldown: 0,
      powerUps: new Map()
    };
  }

  public setPlayerInput(action: 'left' | 'right' | 'shoot', pressed: boolean) {
    this.input[action] = pressed;
  }

  public update(timestamp: number) {
    const deltaTime = timestamp - this.lastTime;
    this.lastTime = timestamp;
    this.frameCount++;

    // Update player
    this.updatePlayer(deltaTime);
    
    // Update game objects
    this.updateEnemies(deltaTime);
    this.updateProjectiles(deltaTime);
    this.updatePowerUps(deltaTime);
    this.updateParticles(deltaTime);
    
    // Handle spawning
    this.updateSpawning(deltaTime);
    
    // Handle collisions
    this.handleCollisions();
    
    // Update game state
    this.updateGameState();
    
    // Clean up inactive objects
    this.cleanup();
  }

  private updatePlayer(deltaTime: number) {
    const dt = deltaTime / 1000;
    
    // Handle movement
    this.player.velocity.x = 0;
    if (this.input.left) {
      this.player.velocity.x = -this.PLAYER_SPEED;
    }
    if (this.input.right) {
      this.player.velocity.x = this.PLAYER_SPEED;
    }
    
    // Update position
    this.player.position.x += this.player.velocity.x * dt;
    
    // Constrain to screen bounds
    this.player.position.x = Math.max(this.player.size.x / 2, 
      Math.min(this.canvas.width - this.player.size.x / 2, this.player.position.x));
    
    // Handle shooting
    this.player.shootCooldown = Math.max(0, this.player.shootCooldown - deltaTime);
    
    if (this.input.shoot && this.player.shootCooldown <= 0) {
      this.createPlayerProjectile();
      
      // Set cooldown (faster with rapid fire power-up)
      const rapidFireActive = this.player.powerUps.has('rapidFire');
      this.player.shootCooldown = rapidFireActive ? 100 : 250;
    }
    
    // Update power-ups
    for (const [powerUpType, timeLeft] of this.player.powerUps.entries()) {
      const newTimeLeft = timeLeft - deltaTime;
      if (newTimeLeft <= 0) {
        this.player.powerUps.delete(powerUpType);
      } else {
        this.player.powerUps.set(powerUpType, newTimeLeft);
      }
    }
    
    // Update power-up callback
    const activePowerUps = Array.from(this.player.powerUps.entries()).map(([type, timeLeft]) => ({
      type,
      timeLeft: timeLeft / 1000
    }));
    this.callbacks.onPowerUpChange(activePowerUps);
  }

  private updateEnemies(deltaTime: number) {
    const dt = deltaTime / 1000;
    
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      
      // Update position
      enemy.position.x += enemy.velocity.x * dt * this.gameSpeed;
      enemy.position.y += enemy.velocity.y * dt * this.gameSpeed;
      
      // Remove enemies that go off screen
      if (enemy.position.y > this.canvas.height + 50) {
        enemy.active = false;
      }
      
      // Enemy shooting
      enemy.shootCooldown = Math.max(0, enemy.shootCooldown - deltaTime);
      if (enemy.shootCooldown <= 0 && Math.random() < 0.005) {
        this.createEnemyProjectile(enemy);
        enemy.shootCooldown = 1000 + Math.random() * 2000;
      }
    }
  }

  private updateProjectiles(deltaTime: number) {
    const dt = deltaTime / 1000;
    
    for (const projectile of this.projectiles) {
      if (!projectile.active) continue;
      
      // Update position
      projectile.position.x += projectile.velocity.x * dt;
      projectile.position.y += projectile.velocity.y * dt;
      
      // Remove projectiles that go off screen
      if (projectile.position.y < -10 || projectile.position.y > this.canvas.height + 10 ||
          projectile.position.x < -10 || projectile.position.x > this.canvas.width + 10) {
        projectile.active = false;
      }
    }
  }

  private updatePowerUps(deltaTime: number) {
    for (const powerUp of this.powerUps) {
      if (!powerUp.active) continue;
      
      // Floating animation
      powerUp.position.y += Math.sin(this.frameCount * 0.1) * 0.5;
      powerUp.duration -= deltaTime;
      
      // Remove expired power-ups
      if (powerUp.duration <= 0) {
        powerUp.active = false;
      }
    }
  }

  private updateParticles(deltaTime: number) {
    const dt = deltaTime / 1000;
    
    for (const particle of this.particles) {
      if (!particle.active) continue;
      
      // Update position
      particle.position.x += particle.velocity.x * dt;
      particle.position.y += particle.velocity.y * dt;
      
      // Update life
      particle.life -= deltaTime;
      if (particle.life <= 0) {
        particle.active = false;
      }
    }
  }

  private updateSpawning(deltaTime: number) {
    // Enemy spawning
    this.enemySpawnTimer -= deltaTime;
    if (this.enemySpawnTimer <= 0) {
      this.spawnEnemy();
      this.enemySpawnTimer = this.ENEMY_SPAWN_RATE / this.gameSpeed;
    }
    
    // Power-up spawning
    this.powerUpSpawnTimer -= deltaTime;
    if (this.powerUpSpawnTimer <= 0) {
      this.spawnPowerUp();
      this.powerUpSpawnTimer = this.POWERUP_SPAWN_RATE;
    }
  }

  private handleCollisions() {
    // Player projectiles vs enemies
    for (const projectile of this.projectiles) {
      if (!projectile.active || projectile.owner !== 'player') continue;
      
      for (const enemy of this.enemies) {
        if (!enemy.active) continue;
        
        if (this.checkCollision(projectile, enemy)) {
          projectile.active = false;
          enemy.health -= projectile.damage;
          
          // Create hit particles
          this.createParticles(enemy.position, '#ff6b6b', 5);
          
          if (enemy.health <= 0) {
            enemy.active = false;
            this.score += enemy.points;
            this.callbacks.onScoreChange(this.score);
            
            // Create destruction particles
            this.createParticles(enemy.position, '#ffd93d', 10);
          }
        }
      }
    }
    
    // Enemy projectiles vs player
    for (const projectile of this.projectiles) {
      if (!projectile.active || projectile.owner !== 'enemy') continue;
      
      if (this.checkCollision(projectile, this.player)) {
        projectile.active = false;
        
        // Check for shield power-up
        if (!this.player.powerUps.has('shield')) {
          this.lives--;
          this.callbacks.onLivesChange(this.lives);
          
          // Create hit particles
          this.createParticles(this.player.position, '#ff4757', 8);
          
          if (this.lives <= 0) {
            this.callbacks.onGameOver();
          }
        }
      }
    }
    
    // Player vs enemies (collision damage)
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      
      if (this.checkCollision(this.player, enemy)) {
        enemy.active = false;
        
        if (!this.player.powerUps.has('shield')) {
          this.lives--;
          this.callbacks.onLivesChange(this.lives);
          
          // Create collision particles
          this.createParticles(this.player.position, '#ff6b6b', 12);
          
          if (this.lives <= 0) {
            this.callbacks.onGameOver();
          }
        }
      }
    }
    
    // Player vs power-ups
    for (const powerUp of this.powerUps) {
      if (!powerUp.active) continue;
      
      if (this.checkCollision(this.player, powerUp)) {
        powerUp.active = false;
        this.player.powerUps.set(powerUp.type, powerUp.duration);
        
        // Create collection particles
        this.createParticles(powerUp.position, '#6c5ce7', 8);
      }
    }
  }

  private updateGameState() {
    // Increase difficulty over time
    const newLevel = Math.floor(this.score / 1000) + 1;
    if (newLevel !== this.level) {
      this.level = newLevel;
      this.gameSpeed = 1 + (this.level - 1) * 0.2;
      this.callbacks.onLevelChange(this.level);
    }
  }

  private cleanup() {
    this.enemies = this.enemies.filter(e => e.active);
    this.projectiles = this.projectiles.filter(p => p.active);
    this.powerUps = this.powerUps.filter(p => p.active);
    this.particles = this.particles.filter(p => p.active);
  }

  private checkCollision(obj1: GameObject, obj2: GameObject): boolean {
    return obj1.position.x < obj2.position.x + obj2.size.x &&
           obj1.position.x + obj1.size.x > obj2.position.x &&
           obj1.position.y < obj2.position.y + obj2.size.y &&
           obj1.position.y + obj1.size.y > obj2.position.y;
  }

  private createPlayerProjectile() {
    const projectile: Projectile = {
      position: { 
        x: this.player.position.x, 
        y: this.player.position.y - this.player.size.y / 2 
      },
      velocity: { x: 0, y: -this.PROJECTILE_SPEED },
      size: { x: 4, y: 12 },
      active: true,
      damage: 25,
      owner: 'player'
    };
    
    this.projectiles.push(projectile);
    
    // Multi-shot power-up
    if (this.player.powerUps.has('multiShot')) {
      const leftProjectile: Projectile = {
        ...projectile,
        position: { x: projectile.position.x - 15, y: projectile.position.y },
        velocity: { x: -50, y: -this.PROJECTILE_SPEED }
      };
      
      const rightProjectile: Projectile = {
        ...projectile,
        position: { x: projectile.position.x + 15, y: projectile.position.y },
        velocity: { x: 50, y: -this.PROJECTILE_SPEED }
      };
      
      this.projectiles.push(leftProjectile, rightProjectile);
    }
  }

  private createEnemyProjectile(enemy: Enemy) {
    const projectile: Projectile = {
      position: { 
        x: enemy.position.x, 
        y: enemy.position.y + enemy.size.y / 2 
      },
      velocity: { x: 0, y: this.PROJECTILE_SPEED * 0.6 },
      size: { x: 3, y: 8 },
      active: true,
      damage: 20,
      owner: 'enemy'
    };
    
    this.projectiles.push(projectile);
  }

  private spawnEnemy() {
    const enemyTypes: Array<Enemy['type']> = ['basic', 'fast', 'heavy'];
    const randomType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
    
    const enemy: Enemy = {
      position: { 
        x: Math.random() * (this.canvas.width - 40) + 20, 
        y: -30 
      },
      velocity: { x: (Math.random() - 0.5) * 50, y: 80 },
      size: { x: 30, y: 30 },
      active: true,
      type: randomType,
      health: randomType === 'heavy' ? 75 : randomType === 'fast' ? 25 : 50,
      points: randomType === 'heavy' ? 200 : randomType === 'fast' ? 150 : 100,
      shootCooldown: Math.random() * 2000
    };
    
    // Adjust properties by type
    if (randomType === 'fast') {
      enemy.velocity.y = 120;
      enemy.size = { x: 25, y: 25 };
    } else if (randomType === 'heavy') {
      enemy.velocity.y = 50;
      enemy.size = { x: 40, y: 40 };
    }
    
    this.enemies.push(enemy);
  }

  private spawnPowerUp() {
    const powerUpTypes: Array<PowerUp['type']> = ['rapidFire', 'shield', 'multiShot'];
    const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
    
    const powerUp: PowerUp = {
      position: { 
        x: Math.random() * (this.canvas.width - 30) + 15, 
        y: -20 
      },
      velocity: { x: 0, y: 60 },
      size: { x: 25, y: 25 },
      active: true,
      type: randomType,
      duration: 8000 // 8 seconds on screen
    };
    
    this.powerUps.push(powerUp);
  }

  private createParticles(position: Vector2D, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const particle: Particle = {
        position: { ...position },
        velocity: {
          x: (Math.random() - 0.5) * 200,
          y: (Math.random() - 0.5) * 200
        },
        size: { x: 3, y: 3 },
        active: true,
        life: 500 + Math.random() * 500,
        maxLife: 1000,
        color
      };
      
      this.particles.push(particle);
    }
  }

  public render(ctx: CanvasRenderingContext2D) {
    // Clear canvas with space background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Render starfield background
    this.renderStarfield(ctx);
    
    // Render game objects
    this.renderPlayer(ctx);
    this.renderEnemies(ctx);
    this.renderProjectiles(ctx);
    this.renderPowerUps(ctx);
    this.renderParticles(ctx);
  }

  private renderStarfield(ctx: CanvasRenderingContext2D) {
    const starCount = 100;
    ctx.fillStyle = 'white';
    
    for (let i = 0; i < starCount; i++) {
      const x = (i * 137.5) % this.canvas.width;
      const y = (i * 73.7 + this.frameCount * 0.5) % this.canvas.height;
      const size = Math.random() * 2;
      
      ctx.globalAlpha = Math.random() * 0.8 + 0.2;
      ctx.fillRect(x, y, size, size);
    }
    
    ctx.globalAlpha = 1;
  }

  private renderPlayer(ctx: CanvasRenderingContext2D) {
    if (!this.player.active) return;
    
    const { x, y } = this.player.position;
    const { x: w, y: h } = this.player.size;
    
    // Shield effect
    if (this.player.powerUps.has('shield')) {
      ctx.beginPath();
      ctx.arc(x, y, w/2 + 5, 0, Math.PI * 2);
      ctx.strokeStyle = '#6c5ce7';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.6;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    
    // Player ship
    ctx.fillStyle = '#00d2d3';
    ctx.beginPath();
    ctx.moveTo(x, y - h/2);
    ctx.lineTo(x - w/2, y + h/2);
    ctx.lineTo(x + w/2, y + h/2);
    ctx.closePath();
    ctx.fill();
    
    // Engine glow
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(x - 3, y + h/2, 6, 8);
  }

  private renderEnemies(ctx: CanvasRenderingContext2D) {
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      
      const { x, y } = enemy.position;
      const { x: w, y: h } = enemy.size;
      
      // Different colors for different types
      let color = '#ff4757';
      if (enemy.type === 'fast') color = '#ffa502';
      if (enemy.type === 'heavy') color = '#5f27cd';
      
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x, y + h/2);
      ctx.lineTo(x - w/2, y - h/2);
      ctx.lineTo(x + w/2, y - h/2);
      ctx.closePath();
      ctx.fill();
      
      // Health bar for heavy enemies
      if (enemy.type === 'heavy') {
        const healthPercentage = enemy.health / 75;
        ctx.fillStyle = 'red';
        ctx.fillRect(x - w/2, y - h/2 - 8, w, 3);
        ctx.fillStyle = 'green';
        ctx.fillRect(x - w/2, y - h/2 - 8, w * healthPercentage, 3);
      }
    }
  }

  private renderProjectiles(ctx: CanvasRenderingContext2D) {
    for (const projectile of this.projectiles) {
      if (!projectile.active) continue;
      
      const { x, y } = projectile.position;
      const { x: w, y: h } = projectile.size;
      
      ctx.fillStyle = projectile.owner === 'player' ? '#00d2d3' : '#ff4757';
      ctx.fillRect(x - w/2, y - h/2, w, h);
      
      // Glow effect for player projectiles
      if (projectile.owner === 'player') {
        ctx.shadowColor = '#00d2d3';
        ctx.shadowBlur = 5;
        ctx.fillRect(x - w/2, y - h/2, w, h);
        ctx.shadowBlur = 0;
      }
    }
  }

  private renderPowerUps(ctx: CanvasRenderingContext2D) {
    for (const powerUp of this.powerUps) {
      if (!powerUp.active) continue;
      
      const { x, y } = powerUp.position;
      const { x: w } = powerUp.size;
      
      // Pulsing effect
      const pulse = Math.sin(this.frameCount * 0.1) * 0.2 + 0.8;
      ctx.globalAlpha = pulse;
      
      ctx.fillStyle = '#6c5ce7';
      ctx.beginPath();
      ctx.arc(x, y, w/2, 0, Math.PI * 2);
      ctx.fill();
      
      // Power-up icon
      ctx.fillStyle = 'white';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const icon = powerUp.type === 'rapidFire' ? '⚡' : 
                  powerUp.type === 'shield' ? '🛡️' : '⭐';
      ctx.fillText(icon, x, y);
      
      ctx.globalAlpha = 1;
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D) {
    for (const particle of this.particles) {
      if (!particle.active) continue;
      
      const { x, y } = particle.position;
      const { x: w, y: h } = particle.size;
      
      const alpha = particle.life / particle.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.fillRect(x - w/2, y - h/2, w, h);
    }
    
    ctx.globalAlpha = 1;
  }

  public reset() {
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.gameSpeed = 1;
    
    // Reset player
    this.player.position = { x: this.canvas.width / 2, y: this.canvas.height - 60 };
    this.player.health = 100;
    this.player.powerUps.clear();
    
    // Clear all game objects
    this.enemies = [];
    this.projectiles = [];
    this.powerUps = [];
    this.particles = [];
    
    // Reset timers
    this.enemySpawnTimer = 0;
    this.powerUpSpawnTimer = this.POWERUP_SPAWN_RATE;
    
    // Reset callbacks
    this.callbacks.onScoreChange(this.score);
    this.callbacks.onLivesChange(this.lives);
    this.callbacks.onLevelChange(this.level);
    this.callbacks.onPowerUpChange([]);
  }
}
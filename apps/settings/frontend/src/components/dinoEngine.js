// dinoEngine.js — Dino Run ゲームエンジン（描画・物理・定数）

export const W          = 800
export const H          = 320
export const GROUND_Y   = 270
export const DINO_X     = 80
export const DINO_W     = 44
export const DINO_H     = 50
export const GRAVITY    = 0.55
export const JUMP_FORCE = -12.5
export const BASE_SPEED = 5

// ── 物理更新 ──────────────────────────────────────────────────────

export function updateDino(state) {
  state.dinoVY += GRAVITY
  state.dinoY  += state.dinoVY
  if (state.dinoY >= GROUND_Y - DINO_H) {
    state.dinoY  = GROUND_Y - DINO_H
    state.dinoVY = 0
  }
}

export function updateClouds(clouds, speed) {
  clouds.forEach(c => {
    c.x -= speed * 0.3
    if (c.x + c.w < 0) {
      c.x = W + 20
      c.y = 40 + Math.random() * 80
    }
  })
}

export function spawnObstacle(obstacles) {
  const h    = 28 + Math.random() * 36
  const arms = Math.random() > 0.4
  obstacles.push({ x: W + 10, w: 18 + Math.random() * 10, h, arms })
}

export function updateObstacles(obstacles, speed) {
  for (let i = obstacles.length - 1; i >= 0; i--) {
    obstacles[i].x -= speed
    if (obstacles[i].x < -60) obstacles.splice(i, 1)
  }
}

export function checkCollision(dinoY, obstacles) {
  const dx = DINO_X + 10, dw = DINO_W - 20
  const dy = dinoY + 6,   dh = DINO_H - 10
  for (const o of obstacles) {
    const ox = o.x + 3, ow = o.w - 6
    const oy = GROUND_Y - o.h, oh = o.h
    if (dx + dw > ox && dx < ox + ow && dy + dh > oy && dy < oy + oh) return true
  }
  return false
}

export function makeSpeed(score) {
  return BASE_SPEED + Math.floor(score / 150) * 0.4
}

export function spawnClouds() {
  return Array.from({ length: 5 }, (_, i) => ({
    x: 100 + i * 160,
    y: 40 + Math.random() * 80,
    w: 60 + Math.random() * 60,
  }))
}

// ── 描画 ──────────────────────────────────────────────────────────

export function drawScene(ctx, state) {
  ctx.clearRect(0, 0, W, H)

  // 背景
  ctx.fillStyle = '#1e1e1e'
  ctx.fillRect(0, 0, W, H)

  // 雲
  ctx.fillStyle = '#2a2d2e'
  for (const c of state.clouds) {
    ctx.beginPath()
    ctx.ellipse(c.x + c.w * 0.3, c.y,     c.w * 0.3,  12, 0, 0, Math.PI * 2)
    ctx.ellipse(c.x + c.w * 0.6, c.y - 4, c.w * 0.25, 10, 0, 0, Math.PI * 2)
    ctx.ellipse(c.x + c.w * 0.7, c.y + 2, c.w * 0.2,   9, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // 地面
  ctx.fillStyle = '#555'
  ctx.fillRect(0, GROUND_Y, W, 2)
  ctx.fillStyle = '#3c3c3c'
  ctx.fillRect(0, GROUND_Y + 2, W, 8)

  // スコアマイルストーンフラッシュ
  if (state.score > 0 && state.score % 100 === 0 && state.frame % 20 < 10) {
    ctx.fillStyle = '#007acc44'
    ctx.fillRect(0, 0, W, H)
  }

  drawDino(ctx, state)
  drawObstacles(ctx, state.obstacles)
}

function drawDino(ctx, { dinoY, phase, frame }) {
  const color = phase === 'dead' ? '#e74c3c' : '#4ec9b0'
  const dark  = phase === 'dead' ? '#c0392b' : '#37a08a'
  const x = DINO_X, y = dinoY

  ctx.fillStyle = color

  // 尻尾
  ctx.beginPath()
  ctx.moveTo(x + 6,  y + DINO_H - 14)
  ctx.lineTo(x - 6,  y + DINO_H - 6)
  ctx.lineTo(x + 2,  y + DINO_H - 20)
  ctx.fill()

  // 胴体
  ctx.fillRect(x + 6,  y + 18, DINO_W - 14, DINO_H - 24)

  // 首・頭
  ctx.fillRect(x + 18, y + 2,  DINO_W - 18, 22)

  // 口先
  ctx.fillRect(x + DINO_W - 6, y + 10, 8, 12)

  // 目
  ctx.fillStyle = '#1e1e1e'
  ctx.fillRect(x + DINO_W - 10, y + 6,  6, 6)
  ctx.fillStyle = '#fff'
  ctx.fillRect(x + DINO_W - 9,  y + 7,  2, 2)

  // 鼻孔
  ctx.fillStyle = dark
  ctx.fillRect(x + DINO_W, y + 14, 3, 3)

  // 腕
  ctx.fillStyle = color
  ctx.fillRect(x + 22, y + 30, 10, 6)

  // 脚（走行アニメ）
  if (phase === 'running' && dinoY >= GROUND_Y - DINO_H - 2) {
    const leg = Math.floor(frame / 7) % 2
    if (leg === 0) {
      ctx.fillRect(x + 12, y + DINO_H - 6, 9, 14)
      ctx.fillRect(x + 9,  y + DINO_H + 6, 14,  4)
      ctx.fillRect(x + 24, y + DINO_H - 2, 9, 10)
    } else {
      ctx.fillRect(x + 12, y + DINO_H - 2, 9, 10)
      ctx.fillRect(x + 24, y + DINO_H - 6, 9, 14)
      ctx.fillRect(x + 22, y + DINO_H + 6, 14,  4)
    }
  } else {
    ctx.fillRect(x + 12, y + DINO_H - 4, 9, 12)
    ctx.fillRect(x + 9,  y + DINO_H + 6, 14,  4)
    ctx.fillRect(x + 24, y + DINO_H - 4, 9, 12)
    ctx.fillRect(x + 22, y + DINO_H + 6, 14,  4)
  }

  // 死亡時の × 目
  if (phase === 'dead') {
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    const ex = x + DINO_W - 10, ey = y + 6
    ctx.beginPath(); ctx.moveTo(ex,     ey);     ctx.lineTo(ex + 6, ey + 6); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(ex + 6, ey);     ctx.lineTo(ex,     ey + 6); ctx.stroke()
    ctx.lineWidth = 1
  }
}

function drawObstacles(ctx, obstacles) {
  for (const o of obstacles) {
    const oy = GROUND_Y - o.h
    ctx.fillStyle = '#6a9955'
    ctx.fillRect(o.x, oy, o.w, o.h)
    ctx.beginPath()
    ctx.moveTo(o.x - 3,        oy + 6)
    ctx.lineTo(o.x + o.w / 2,  oy - 8)
    ctx.lineTo(o.x + o.w + 3,  oy + 6)
    ctx.fill()
    if (o.arms) {
      ctx.fillStyle = '#4d7a3d'
      ctx.fillRect(o.x - 12,       GROUND_Y - o.h * 0.65,      12, 7)
      ctx.fillRect(o.x - 12,       GROUND_Y - o.h * 0.65 - 10,  7, 12)
      ctx.fillRect(o.x + o.w,      GROUND_Y - o.h * 0.55,      12, 7)
      ctx.fillRect(o.x + o.w + 5,  GROUND_Y - o.h * 0.55 - 10,  7, 12)
    }
  }
}

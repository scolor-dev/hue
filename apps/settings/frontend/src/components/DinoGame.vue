<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// ── Canvas & state ──────────────────────────────────────────────
const canvas  = ref<HTMLCanvasElement | null>(null)
const score   = ref(0)
const best    = ref(0)
const phase   = ref<'idle' | 'running' | 'dead'>('idle')

// ── Constants ───────────────────────────────────────────────────
const W          = 800
const H          = 320
const GROUND_Y   = 270
const DINO_X     = 80
const DINO_W     = 44
const DINO_H     = 50
const GRAVITY    = 0.55
const JUMP_FORCE = -12.5
const BASE_SPEED = 5

// ── Mutable game state (not reactive — updated every frame) ──────
let rafId       = 0
let frame       = 0
let dinoY       = GROUND_Y - DINO_H
let dinoVY      = 0
let speed       = BASE_SPEED
let nextIn      = 100
let obstacles: { x: number; w: number; h: number; arms: boolean }[] = []
let clouds:    { x: number; y: number; w: number }[] = []

// ── Cloud helpers ────────────────────────────────────────────────
function spawnClouds() {
  clouds = Array.from({ length: 5 }, (_, i) => ({
    x: 100 + i * 160,
    y: 40 + Math.random() * 80,
    w: 60 + Math.random() * 60,
  }))
}

// ── Jump / start / restart ───────────────────────────────────────
function onAction() {
  if (phase.value === 'idle') { startGame(); return }
  if (phase.value === 'dead') { restart();   return }
  if (dinoY >= GROUND_Y - DINO_H - 2) dinoVY = JUMP_FORCE
}

function startGame() {
  phase.value = 'running'
  restart()
}

function restart() {
  score.value  = 0
  frame        = 0
  dinoY        = GROUND_Y - DINO_H
  dinoVY       = 0
  obstacles    = []
  speed        = BASE_SPEED
  nextIn       = 100
  phase.value  = 'running'
  spawnClouds()
  cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(tick)
}

// ── Main loop ────────────────────────────────────────────────────
function tick() {
  const ctx = canvas.value?.getContext('2d')
  if (!ctx) return

  frame++
  score.value  = Math.floor(frame / 6)
  speed        = BASE_SPEED + Math.floor(score.value / 150) * 0.4

  // Dino physics
  dinoVY += GRAVITY
  dinoY  += dinoVY
  if (dinoY >= GROUND_Y - DINO_H) { dinoY = GROUND_Y - DINO_H; dinoVY = 0 }

  // Clouds (slow parallax)
  clouds = clouds.map(c => ({ ...c, x: c.x - speed * 0.3 }))
  clouds.forEach(c => { if (c.x + c.w < 0) { c.x = W + 20; c.y = 40 + Math.random() * 80 } })

  // Obstacles
  nextIn--
  if (nextIn <= 0) {
    const h    = 28 + Math.random() * 36
    const arms = Math.random() > 0.4
    obstacles.push({ x: W + 10, w: 18 + Math.random() * 10, h, arms })
    nextIn = 55 + Math.random() * 70
  }
  obstacles = obstacles
    .map(o => ({ ...o, x: o.x - speed }))
    .filter(o => o.x > -60)

  // Collision (shrunken hitbox)
  const dx = DINO_X + 10, dw = DINO_W - 20, dy = dinoY + 6, dh = DINO_H - 10
  for (const o of obstacles) {
    const ox = o.x + 3, ow = o.w - 6, oy = GROUND_Y - o.h, oh = o.h
    if (dx + dw > ox && dx < ox + ow && dy + dh > oy && dy < oy + oh) {
      if (score.value > best.value) best.value = score.value
      phase.value = 'dead'
      draw(ctx)
      return
    }
  }

  draw(ctx)
  rafId = requestAnimationFrame(tick)
}

// ── Draw ─────────────────────────────────────────────────────────
function draw(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, W, H)

  // Sky
  ctx.fillStyle = '#1e1e1e'
  ctx.fillRect(0, 0, W, H)

  // Clouds
  ctx.fillStyle = '#2a2d2e'
  for (const c of clouds) {
    ctx.beginPath()
    ctx.ellipse(c.x + c.w * 0.3, c.y, c.w * 0.3, 12, 0, 0, Math.PI * 2)
    ctx.ellipse(c.x + c.w * 0.6, c.y - 4, c.w * 0.25, 10, 0, 0, Math.PI * 2)
    ctx.ellipse(c.x + c.w * 0.7, c.y + 2, c.w * 0.2, 9, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // Ground
  ctx.fillStyle = '#555'
  ctx.fillRect(0, GROUND_Y, W, 2)
  ctx.fillStyle = '#3c3c3c'
  ctx.fillRect(0, GROUND_Y + 2, W, 8)

  // Score flash on milestone
  if (score.value > 0 && score.value % 100 === 0 && frame % 20 < 10) {
    ctx.fillStyle = '#007acc44'
    ctx.fillRect(0, 0, W, H)
  }

  drawDino(ctx)
  drawObstacles(ctx)
}

function drawDino(ctx: CanvasRenderingContext2D) {
  const color = phase.value === 'dead' ? '#e74c3c' : '#4ec9b0'
  const dark  = phase.value === 'dead' ? '#c0392b' : '#37a08a'
  const x = DINO_X, y = dinoY

  ctx.fillStyle = color

  // Tail
  ctx.beginPath()
  ctx.moveTo(x + 6, y + DINO_H - 14)
  ctx.lineTo(x - 6, y + DINO_H - 6)
  ctx.lineTo(x + 2, y + DINO_H - 20)
  ctx.fill()

  // Body
  ctx.fillRect(x + 6, y + 18, DINO_W - 14, DINO_H - 24)

  // Neck + head
  ctx.fillRect(x + 18, y + 2, DINO_W - 18, 22)

  // Snout
  ctx.fillRect(x + DINO_W - 6, y + 10, 8, 12)

  // Eye
  ctx.fillStyle = '#1e1e1e'
  ctx.fillRect(x + DINO_W - 10, y + 6, 6, 6)
  ctx.fillStyle = '#fff'
  ctx.fillRect(x + DINO_W - 9, y + 7, 2, 2)

  // Nostril
  ctx.fillStyle = dark
  ctx.fillRect(x + DINO_W, y + 14, 3, 3)

  // Arm
  ctx.fillStyle = color
  ctx.fillRect(x + 22, y + 30, 10, 6)

  // Legs
  ctx.fillStyle = color
  if (phase.value === 'running' && dinoY >= GROUND_Y - DINO_H - 2) {
    const leg = Math.floor(frame / 7) % 2
    if (leg === 0) {
      ctx.fillRect(x + 12, y + DINO_H - 6, 9, 14)
      ctx.fillRect(x + 9,  y + DINO_H + 6, 14, 4)
      ctx.fillRect(x + 24, y + DINO_H - 2, 9, 10)
    } else {
      ctx.fillRect(x + 12, y + DINO_H - 2, 9, 10)
      ctx.fillRect(x + 24, y + DINO_H - 6, 9, 14)
      ctx.fillRect(x + 22, y + DINO_H + 6, 14, 4)
    }
  } else {
    ctx.fillRect(x + 12, y + DINO_H - 4, 9, 12)
    ctx.fillRect(x + 9,  y + DINO_H + 6, 14, 4)
    ctx.fillRect(x + 24, y + DINO_H - 4, 9, 12)
    ctx.fillRect(x + 22, y + DINO_H + 6, 14, 4)
  }

  // Dead X eyes
  if (phase.value === 'dead') {
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    const ex = x + DINO_W - 10, ey = y + 6
    ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + 6, ey + 6); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(ex + 6, ey); ctx.lineTo(ex, ey + 6); ctx.stroke()
    ctx.lineWidth = 1
  }
}

function drawObstacles(ctx: CanvasRenderingContext2D) {
  for (const o of obstacles) {
    const oy = GROUND_Y - o.h
    ctx.fillStyle = '#6a9955'
    // Main trunk
    ctx.fillRect(o.x, oy, o.w, o.h)
    // Top spike
    ctx.beginPath()
    ctx.moveTo(o.x - 3, oy + 6)
    ctx.lineTo(o.x + o.w / 2, oy - 8)
    ctx.lineTo(o.x + o.w + 3, oy + 6)
    ctx.fill()
    // Arms
    if (o.arms) {
      ctx.fillStyle = '#4d7a3d'
      ctx.fillRect(o.x - 12, GROUND_Y - o.h * 0.65, 12, 7)
      ctx.fillRect(o.x - 12, GROUND_Y - o.h * 0.65 - 10, 7, 12)
      ctx.fillRect(o.x + o.w, GROUND_Y - o.h * 0.55, 12, 7)
      ctx.fillRect(o.x + o.w + 5, GROUND_Y - o.h * 0.55 - 10, 7, 12)
    }
  }
}

// ── Initial idle draw ────────────────────────────────────────────
function drawIdle() {
  const ctx = canvas.value?.getContext('2d')
  if (!ctx) return
  spawnClouds()
  draw(ctx)
}

// ── Keyboard / lifecycle ─────────────────────────────────────────
function onKey(e: KeyboardEvent) {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault()
    onAction()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  drawIdle()
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div class="dino-page">
    <div class="dino-header">
      <h2 class="dino-title">🦕 Dino Run</h2>
      <div class="score-board">
        <span class="score-hi">HI {{ String(best).padStart(5, '0') }}</span>
        <span class="score-now">{{ String(score).padStart(5, '0') }}</span>
      </div>
    </div>

    <div class="canvas-wrap" @click="onAction" tabindex="0">
      <canvas ref="canvas" :width="800" :height="320" />

      <Transition name="fade">
        <div v-if="phase === 'idle'" class="overlay">
          <div class="overlay-dino">🦕</div>
          <p class="overlay-title">Dino Run</p>
          <p class="overlay-hint">Space / ↑ / クリック でスタート</p>
        </div>
      </Transition>

      <Transition name="fade">
        <div v-if="phase === 'dead'" class="overlay overlay-dead">
          <p class="overlay-title">GAME OVER</p>
          <p class="overlay-score">Score: {{ score }}</p>
          <p class="overlay-hint">Space / ↑ / クリック でリスタート</p>
        </div>
      </Transition>
    </div>

    <p class="hint-text">Space キー / ↑ キー / クリック でジャンプ</p>
  </div>
</template>

<style scoped>
.dino-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  user-select: none;
}

.dino-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dino-title {
  margin: 0;
  font-size: 18px;
  color: #cccccc;
}

.score-board {
  display: flex;
  gap: 16px;
  font-family: 'Consolas', monospace;
  font-size: 16px;
  font-weight: 600;
}

.score-hi  { color: #858585; }
.score-now { color: #4ec9b0; }

.canvas-wrap {
  position: relative;
  border: 1px solid #3c3c3c;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  outline: none;
  max-width: 800px;
}

canvas { display: block; width: 100%; }

.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #1e1e1ecc;
  gap: 6px;
}

.overlay-dino  { font-size: 48px; line-height: 1; }
.overlay-title { margin: 0; font-size: 22px; font-weight: 700; color: #cccccc; letter-spacing: 0.06em; }
.overlay-score { margin: 0; font-size: 16px; color: #4ec9b0; font-family: 'Consolas', monospace; }
.overlay-hint  { margin: 0; font-size: 12px; color: #858585; }

.overlay-dead .overlay-title { color: #e74c3c; }

.hint-text {
  margin: 0;
  font-size: 11px;
  color: #555;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from,  .fade-leave-to      { opacity: 0; }
</style>

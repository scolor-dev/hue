<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import {
  GROUND_Y, DINO_H,
  updateDino, updateClouds, updateObstacles, spawnObstacle, checkCollision,
  makeSpeed, spawnClouds, drawScene,
} from './dinoEngine.js'

const canvas = ref<HTMLCanvasElement | null>(null)
const score  = ref(0)
const best   = ref(0)
const phase  = ref<'idle' | 'running' | 'dead'>('idle')

// ゲームループ用のミュータブルな状態（リアクティブ不要）
const gs = {
  frame: 0, dinoY: GROUND_Y - DINO_H, dinoVY: 0,
  obstacles: [] as { x: number; w: number; h: number; arms: boolean }[],
  clouds: spawnClouds(),
  nextIn: 100,
}

let rafId = 0

function onAction() {
  if (phase.value === 'idle') { start(); return }
  if (phase.value === 'dead') { restart(); return }
  if (gs.dinoY >= GROUND_Y - DINO_H - 2) gs.dinoVY = -12.5
}

function start() {
  phase.value = 'running'
  restart()
}

function restart() {
  score.value = 0
  Object.assign(gs, {
    frame: 0, dinoY: GROUND_Y - DINO_H, dinoVY: 0,
    obstacles: [], clouds: spawnClouds(), nextIn: 100,
  })
  phase.value = 'running'
  cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(tick)
}

function tick() {
  const ctx = canvas.value?.getContext('2d')
  if (!ctx) return

  gs.frame++
  score.value = Math.floor(gs.frame / 6)
  const speed = makeSpeed(score.value)

  updateDino(gs)
  updateClouds(gs.clouds, speed)

  gs.nextIn--
  if (gs.nextIn <= 0) {
    spawnObstacle(gs.obstacles)
    gs.nextIn = 55 + Math.random() * 70
  }
  updateObstacles(gs.obstacles, speed)

  if (checkCollision(gs.dinoY, gs.obstacles)) {
    if (score.value > best.value) best.value = score.value
    phase.value = 'dead'
    drawScene(ctx, { ...gs, score: score.value, phase: phase.value })
    return
  }

  drawScene(ctx, { ...gs, score: score.value, phase: phase.value })
  rafId = requestAnimationFrame(tick)
}

function onKey(e: KeyboardEvent) {
  if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); onAction() }
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  const ctx = canvas.value?.getContext('2d')
  if (ctx) drawScene(ctx, { ...gs, score: 0, phase: 'idle' })
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

<script setup lang="ts">
import { ref, onMounted, onUnmounted, shallowRef } from 'vue';

const CELL_SIZE = 50;
const PIECE_RADIUS = 18;
const SPAWN_PROBABILITY = 0.002;
const MIN_LIFETIME = 300;
const MAX_LIFETIME = 600;
const FADE_DURATION = 60;

interface ChessPiece {
  row: number;
  col: number;
  color: 'black' | 'white';
  opacity: number;
  life: number;
  maxLife: number;
  isActive: boolean;
}

const canvasRef = ref<HTMLCanvasElement | null>(null);
const rows = ref(0);
const cols = ref(0);
const pieces = shallowRef<ChessPiece[]>([]);
const gridMap = ref<Map<string, boolean>>(new Map());

let animationId: number | null = null;
let lastTime = 0;
let clickTimer: ReturnType<typeof setTimeout> | null = null;
const CLICK_DELAY = 200;

const calculateGridDimensions = (width: number, height: number): void => {
  rows.value = Math.floor(height / CELL_SIZE);
  cols.value = Math.floor(width / CELL_SIZE);
};

const handleResize = (): void => {
  if (!canvasRef.value) return;

  const parent = canvasRef.value.parentElement;
  if (!parent) return;

  const width = parent.clientWidth;
  const height = parent.clientHeight;

  canvasRef.value.width = width;
  canvasRef.value.height = height;

  calculateGridDimensions(width, height);
};

const getCellKey = (row: number, col: number): string => `${row},${col}`;

const isCellOccupied = (row: number, col: number): boolean => {
  return gridMap.value.has(getCellKey(row, col));
};

const setCellOccupied = (row: number, col: number, occupied: boolean): void => {
  const key = getCellKey(row, col);
  if (occupied) {
    gridMap.value.set(key, true);
  } else {
    gridMap.value.delete(key);
  }
};

const clearGrid = (): void => {
  gridMap.value.clear();
  pieces.value = [];
};

const getPieceAt = (row: number, col: number): ChessPiece | undefined => {
  return pieces.value.find((p) => p.row === row && p.col === col);
};

const floodFillActivate = (startRow: number, startCol: number): void => {
  const startPiece = getPieceAt(startRow, startCol);
  if (!startPiece) return;

  const targetColor = startPiece.color;
  const visited = new Set<string>();
  const connectedPieces: ChessPiece[] = [];
  const stack: { row: number; col: number }[] = [{ row: startRow, col: startCol }];

  const directions = [
    { dr: -1, dc: 0 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 },
  ];

  while (stack.length > 0) {
    const { row, col } = stack.pop()!;
    const key = getCellKey(row, col);

    if (visited.has(key)) continue;
    visited.add(key);

    const piece = getPieceAt(row, col);
    if (!piece || piece.color !== targetColor) continue;

    connectedPieces.push(piece);

    for (const { dr, dc } of directions) {
      const newRow = row + dr;
      const newCol = col + dc;
      const newKey = getCellKey(newRow, newCol);

      if (
        newRow >= 0 &&
        newRow < rows.value &&
        newCol >= 0 &&
        newCol < cols.value &&
        !visited.has(newKey)
      ) {
        stack.push({ row: newRow, col: newCol });
      }
    }
  }

  if (connectedPieces.length === 0) return;

  const newMaxLife = MIN_LIFETIME + Math.random() * (MAX_LIFETIME - MIN_LIFETIME);

  pieces.value = pieces.value.map((p) => {
    const isConnected = connectedPieces.some(
      (cp) => cp.row === p.row && cp.col === p.col
    );

    if (isConnected) {
      return {
        ...p,
        isActive: true,
        life: newMaxLife,
        maxLife: newMaxLife,
        opacity: 1,
      };
    }
    return p;
  });
};

const getGridPosition = (offsetX: number, offsetY: number): { row: number; col: number } => {
  const col = Math.floor(offsetX / CELL_SIZE);
  const row = Math.floor(offsetY / CELL_SIZE);
  return { row, col };
};

const handleClick = (event: MouseEvent): void => {
  if (clickTimer !== null) {
    clearTimeout(clickTimer);
    clickTimer = null;
    return;
  }

  clickTimer = setTimeout(() => {
    clickTimer = null;
    const { row, col } = getGridPosition(event.offsetX, event.offsetY);

    if (row < 0 || row >= rows.value || col < 0 || col >= cols.value) return;

    const piece = getPieceAt(row, col);
    if (piece) {
      floodFillActivate(row, col);
    }
  }, CLICK_DELAY);
};

const handleDoubleClick = (event: MouseEvent): void => {
  if (clickTimer !== null) {
    clearTimeout(clickTimer);
    clickTimer = null;
  }

  const { row, col } = getGridPosition(event.offsetX, event.offsetY);

  if (row < 0 || row >= rows.value || col < 0 || col >= cols.value) return;

  if (isCellOccupied(row, col)) return;

  const newPiece = createPiece(row, col);
  setCellOccupied(row, col, true);
  pieces.value = [...pieces.value, newPiece];

  floodFillActivate(row, col);
};

const calculateOpacity = (piece: ChessPiece): number => {
  const lifeRatio = piece.life / piece.maxLife;
  const fadeOutStart = FADE_DURATION / piece.maxLife;

  if (lifeRatio > 1 - fadeOutStart) {
    const fadeProgress = (1 - lifeRatio) / fadeOutStart;
    return Math.min(1, fadeProgress);
  }

  if (piece.life <= FADE_DURATION) {
    return Math.max(0, piece.life / FADE_DURATION);
  }

  return 1;
};

const createPiece = (row: number, col: number): ChessPiece => {
  const maxLife = MIN_LIFETIME + Math.random() * (MAX_LIFETIME - MIN_LIFETIME);
  return {
    row,
    col,
    color: Math.random() > 0.5 ? 'black' : 'white',
    opacity: 0,
    life: maxLife,
    maxLife,
    isActive: false,
  };
};

const spawnRandomPiece = (): void => {
  if (Math.random() > SPAWN_PROBABILITY) return;

  const emptyCells: { row: number; col: number }[] = [];

  for (let r = 0; r < rows.value; r++) {
    for (let c = 0; c < cols.value; c++) {
      if (!isCellOccupied(r, c)) {
        emptyCells.push({ row: r, col: c });
      }
    }
  }

  if (emptyCells.length === 0) return;

  const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  const newPiece = createPiece(randomCell.row, randomCell.col);

  setCellOccupied(randomCell.row, randomCell.col, true);
  pieces.value = [...pieces.value, newPiece];
};

const updatePieces = (): void => {
  const updatedPieces: ChessPiece[] = [];

  for (const piece of pieces.value) {
    const newLife = piece.life - 1;

    if (newLife <= 0) {
      setCellOccupied(piece.row, piece.col, false);
      continue;
    }

    const updatedPiece: ChessPiece = {
      ...piece,
      life: newLife,
      opacity: calculateOpacity({ ...piece, life: newLife }),
    };

    updatedPieces.push(updatedPiece);
  }

  pieces.value = updatedPieces;
};

const drawPiece = (ctx: CanvasRenderingContext2D, piece: ChessPiece): void => {
  const x = piece.col * CELL_SIZE + CELL_SIZE / 2;
  const y = piece.row * CELL_SIZE + CELL_SIZE / 2;

  ctx.save();
  ctx.globalAlpha = piece.opacity;

  if (piece.color === 'black') {
    const gradient = ctx.createRadialGradient(
      x - PIECE_RADIUS * 0.3,
      y - PIECE_RADIUS * 0.3,
      0,
      x,
      y,
      PIECE_RADIUS
    );
    gradient.addColorStop(0, '#4a4a4a');
    gradient.addColorStop(0.5, '#2a2a2a');
    gradient.addColorStop(1, '#000000');

    ctx.beginPath();
    ctx.arc(x, y, PIECE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, PIECE_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(80, 80, 80, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
  } else {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;

    const gradient = ctx.createRadialGradient(
      x - PIECE_RADIUS * 0.3,
      y - PIECE_RADIUS * 0.3,
      0,
      x,
      y,
      PIECE_RADIUS
    );
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.5, '#f0f0f0');
    gradient.addColorStop(1, '#d0d0d0');

    ctx.beginPath();
    ctx.arc(x, y, PIECE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.beginPath();
    ctx.arc(x, y, PIECE_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(150, 150, 150, 0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  if (piece.isActive) {
    const glowIntensity = 0.5 + Math.sin(Date.now() / 200) * 0.3;
    const glowRadius = PIECE_RADIUS + 6 + Math.sin(Date.now() / 150) * 2;

    ctx.beginPath();
    ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 215, 0, ${glowIntensity})`;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, glowRadius + 2, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 215, 0, ${glowIntensity * 0.5})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    const innerGlowRadius = PIECE_RADIUS * 0.4;
    const innerGlowIntensity = 0.6 + Math.sin(Date.now() / 100) * 0.2;
    ctx.beginPath();
    ctx.arc(x, y, innerGlowRadius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 215, 0, ${innerGlowIntensity})`;
    ctx.fill();
  }

  ctx.restore();
};

const render = (ctx: CanvasRenderingContext2D): void => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const piece of pieces.value) {
    drawPiece(ctx, piece);
  }
};

const gameLoop = (currentTime: number): void => {
  if (!canvasRef.value) return;

  const ctx = canvasRef.value.getContext('2d');
  if (!ctx) return;

  if (currentTime - lastTime >= 16) {
    spawnRandomPiece();
    updatePieces();
    render(ctx);
    lastTime = currentTime;
  }

  animationId = requestAnimationFrame(gameLoop);
};

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  handleResize();

  if (canvasRef.value) {
    resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(canvasRef.value.parentElement as Element);
  }

  window.addEventListener('resize', handleResize);

  animationId = requestAnimationFrame(gameLoop);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);

  if (clickTimer !== null) {
    clearTimeout(clickTimer);
    clickTimer = null;
  }

  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});

defineExpose({
  rows,
  cols,
  gridMap,
  pieces,
  isCellOccupied,
  setCellOccupied,
  clearGrid,
  floodFillActivate,
  getPieceAt,
  cellSize: CELL_SIZE,
});
</script>

<template>
  <canvas
    ref="canvasRef"
    class="absolute inset-0 w-full h-full cursor-pointer"
    @click="handleClick"
    @dblclick="handleDoubleClick"
  />
</template>

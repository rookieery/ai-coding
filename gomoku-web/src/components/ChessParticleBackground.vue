<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const CELL_SIZE = 50;

interface GridCell {
  row: number;
  col: number;
}

const canvasRef = ref<HTMLCanvasElement | null>(null);
const rows = ref(0);
const cols = ref(0);
const gridMap = ref<Map<string, boolean>>(new Map());

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
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});

defineExpose({
  rows,
  cols,
  gridMap,
  isCellOccupied,
  setCellOccupied,
  clearGrid,
  cellSize: CELL_SIZE,
});
</script>

<template>
  <canvas
    ref="canvasRef"
    class="absolute inset-0 w-full h-full"
  />
</template>

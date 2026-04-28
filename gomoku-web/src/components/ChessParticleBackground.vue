<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

interface Props {
  cellSize?: number;     
  spawnRate?: number;    
  pieceLife?: number;    
  connectRadius?: number;      // 手动拖拽时的触发距离
  autoConnectRadius?: number;  // 自动生成时的常驻引力网触发距离
}

const props = withDefaults(defineProps<Props>(), {
  cellSize: 45,          
  spawnRate: 0.02,
  pieceLife: 8000,
  connectRadius: 400,    
  autoConnectRadius: 200, 
});

const canvasRef = ref<HTMLCanvasElement | null>(null);
let ctx: CanvasRenderingContext2D | null = null;
let animationFrameId: number;

interface Piece {
  row: number;
  col: number;
  color: 'black' | 'white';
  startTime: number;
  life: number;
  opacity: number;
  isActive: boolean;
  pulseScale: number;
  maxPulseScale: number; 
  isDying?: boolean;     
  dieTime?: number;      
}

const grid = new Map<string, Piece>();
const dimensions = { width: 0, height: 0, rows: 0, cols: 0 };

const drag = {
  isDragging: false,
  key: '',
  x: 0,
  y: 0
};

const initCanvas = () => {
  if (!canvasRef.value) return;
  dimensions.width = window.innerWidth;
  dimensions.height = window.innerHeight;
  canvasRef.value.width = dimensions.width;
  canvasRef.value.height = dimensions.height;
  dimensions.cols = Math.ceil(dimensions.width / props.cellSize);
  dimensions.rows = Math.ceil(dimensions.height / props.cellSize);
  ctx = canvasRef.value.getContext('2d');
};

const triggerAutoConnect = (row: number, col: number, color: 'black' | 'white') => {
  const newX = col * props.cellSize + props.cellSize / 2;
  const newY = row * props.cellSize + props.cellSize / 2;
  const connectedKeys: string[] = [];

  grid.forEach((p, k) => {
    if (p.row === row && p.col === col) return; 
    if (p.color === color && !p.isDying) {
      const px = p.col * props.cellSize + props.cellSize / 2;
      const py = p.row * props.cellSize + props.cellSize / 2;
      const dist = Math.hypot(px - newX, py - newY);
      
      if (dist <= props.autoConnectRadius) {
        connectedKeys.push(k);
      }
    }
  });

  if (connectedKeys.length > 0) {
    const now = performance.now();
    
    connectedKeys.forEach(k => {
      const cp = grid.get(k);
      if (cp) {
        cp.startTime = now; 
        cp.isActive = true; 
        cp.pulseScale = 1.6;
      }
    });
    
    const newPiece = grid.get(`${row}-${col}`);
    if (newPiece) {
      newPiece.isActive = true;
      newPiece.pulseScale = 1.6;
    }
  }
};

const checkFiveInARow = (row: number, col: number, color: 'black' | 'white') => {
  const directions = [
    [1, 0], [0, 1], [1, 1], [1, -1]
  ];

  const piecesToExplode = new Set<string>();

  directions.forEach(([dr, dc]) => {
    const lineKeys = [`${row}-${col}`];
    
    for (let i = 1; i < 5; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      const key = `${r}-${c}`;
      const p = grid.get(key);
      if (p && p.color === color && !p.isDying) lineKeys.push(key);
      else break;
    }

    for (let i = 1; i < 5; i++) {
      const r = row - dr * i;
      const c = col - dc * i;
      const key = `${r}-${c}`;
      const p = grid.get(key);
      if (p && p.color === color && !p.isDying) lineKeys.push(key);
      else break;
    }

    if (lineKeys.length >= 5) {
      lineKeys.forEach(k => piecesToExplode.add(k));
    }
  });

  if (piecesToExplode.size >= 5) {
    const sortedKeys = Array.from(piecesToExplode).sort((a, b) => {
      const pa = grid.get(a)!;
      const pb = grid.get(b)!;
      const distA = Math.max(Math.abs(pa.row - row), Math.abs(pa.col - col));
      const distB = Math.max(Math.abs(pb.row - row), Math.abs(pb.col - col));
      return distA - distB;
    });

    sortedKeys.forEach((key, index) => {
      setTimeout(() => {
        const livePiece = grid.get(key);
        if (livePiece) {
          livePiece.isDying = true;
          livePiece.isActive = true;
          livePiece.maxPulseScale = 3.5; 
          livePiece.pulseScale = 3.5;
          livePiece.dieTime = performance.now();
        }
      }, index * 120); 
    });
  }
};

const handleMouseDown = (e: MouseEvent) => {
  const col = Math.floor(e.clientX / props.cellSize);
  const row = Math.floor(e.clientY / props.cellSize);
  const key = `${row}-${col}`;
  
  const piece = grid.get(key);
  if (piece && !piece.isDying) {
    drag.isDragging = true;
    drag.key = key;
    drag.x = e.clientX;
    drag.y = e.clientY;
    piece.startTime = performance.now();
  }
};

const handleMouseMove = (e: MouseEvent) => {
  if (!drag.isDragging) return;
  drag.x = e.clientX;
  drag.y = e.clientY;
};

const handleMouseUp = (e: MouseEvent) => {
  if (!drag.isDragging) return;
  
  const draggedPiece = grid.get(drag.key);
  if (!draggedPiece) {
    drag.isDragging = false;
    return;
  }

  const connectedKeys: string[] = [];
  
  grid.forEach((p, k) => {
    if (k !== drag.key && p.color === draggedPiece.color && !p.isDying) {
      const px = p.col * props.cellSize + props.cellSize / 2;
      const py = p.row * props.cellSize + props.cellSize / 2;
      const dist = Math.hypot(px - drag.x, py - drag.y);
      if (dist < props.connectRadius) {
        connectedKeys.push(k);
      }
    }
  });

  const newCol = Math.floor(drag.x / props.cellSize);
  const newRow = Math.floor(drag.y / props.cellSize);
  const newKey = `${newRow}-${newCol}`;

  grid.delete(drag.key);
  draggedPiece.row = newRow;
  draggedPiece.col = newCol;
  grid.set(newKey, draggedPiece);

  draggedPiece.isActive = true;
  draggedPiece.pulseScale = 1.6;
  draggedPiece.startTime = performance.now();

  connectedKeys.forEach(k => {
    const cp = grid.get(k);
    if (cp && !cp.isDying) {
      cp.isActive = true;
      cp.pulseScale = 1.6;
      cp.startTime = performance.now();
    }
  });

  drag.isDragging = false;
  drag.key = '';

  checkFiveInARow(newRow, newCol, draggedPiece.color);
};

const handleMouseLeave = () => {
  if (drag.isDragging) handleMouseUp(new MouseEvent('mouseup'));
};

const handleDblClick = (e: MouseEvent) => {
  const col = Math.floor(e.clientX / props.cellSize);
  const row = Math.floor(e.clientY / props.cellSize);
  const key = `${row}-${col}`;
  
  if (!grid.has(key)) {
    const color = Math.random() > 0.5 ? 'black' : 'white';
    const newPiece: Piece = {
      row, col, color,
      startTime: performance.now(),
      life: props.pieceLife,
      opacity: 0,
      isActive: false,
      pulseScale: 1,
      maxPulseScale: 1.6
    };
    grid.set(key, newPiece);
    
    triggerAutoConnect(row, col, color);
    checkFiveInARow(row, col, color);
  }
};

const render = (time: number) => {
  if (!ctx) return;
  ctx.clearRect(0, 0, dimensions.width, dimensions.height);

  // 随机生成
  if (Math.random() < props.spawnRate) {
    const r = Math.floor(Math.random() * dimensions.rows);
    const c = Math.floor(Math.random() * dimensions.cols);
    const key = `${r}-${c}`;
    if (!grid.has(key)) {
      const color = Math.random() > 0.5 ? 'black' : 'white';
      grid.set(key, {
        row: r, col: c, color,
        startTime: time,
        life: props.pieceLife,
        opacity: 0,
        isActive: false,
        pulseScale: 1,
        maxPulseScale: 1.6
      });
      
      triggerAutoConnect(r, c, color);
      checkFiveInARow(r, c, color);
    }
  }

  // --- 阶段 A：绘制全局引力连线 ---
  const piecesEntries = Array.from(grid.entries());
  for (let i = 0; i < piecesEntries.length; i++) {
    const [k1, p1] = piecesEntries[i];
    if (p1.isDying) continue;
    
    const isDragged1 = drag.isDragging && k1 === drag.key;
    const px1 = isDragged1 ? drag.x : p1.col * props.cellSize + props.cellSize / 2;
    const py1 = isDragged1 ? drag.y : p1.row * props.cellSize + props.cellSize / 2;

    // 两两对比，寻找范围内的同色棋子
    for (let j = i + 1; j < piecesEntries.length; j++) {
      const [k2, p2] = piecesEntries[j];
      if (p2.isDying || p1.color !== p2.color) continue;

      const isDragged2 = drag.isDragging && k2 === drag.key;
      const px2 = isDragged2 ? drag.x : p2.col * props.cellSize + props.cellSize / 2;
      const py2 = isDragged2 ? drag.y : p2.row * props.cellSize + props.cellSize / 2;

      const dist = Math.hypot(px2 - px1, py2 - py1);
      
      // 拖拽时享有更广的吸附半径，常驻展示采用基础引力半径
      const radiusLimit = (isDragged1 || isDragged2) ? props.connectRadius : props.autoConnectRadius;

      if (dist < radiusLimit) {
        // 连线透明度由两端最暗的棋子决定，并根据距离衰减
        const baseOpacity = Math.min(p1.opacity, p2.opacity);
        const lineOpacity = (1 - dist / radiusLimit) * 0.8 * baseOpacity;
        
        if (lineOpacity > 0.01) {
          ctx!.beginPath();
          ctx!.moveTo(px1, py1);
          ctx!.lineTo(px2, py2);
          ctx!.strokeStyle = p1.color === 'black' 
            ? `rgba(99, 102, 241, ${lineOpacity})`  
            : `rgba(244, 63, 94, ${lineOpacity})`;  
          ctx!.lineWidth = 1.5;
          ctx!.stroke();
        }
      }
    }
  }

  // --- 阶段 B：绘制所有棋子实体 ---
  let draggedPieceToRenderLast: Piece | null = null;
  let draggedPieceKey = '';

  grid.forEach((p, key) => {
    if (drag.isDragging && key === drag.key) {
      draggedPieceToRenderLast = p;
      draggedPieceKey = key;
      return; 
    }
    renderSinglePiece(p, key, time);
  });

  if (draggedPieceToRenderLast) {
    renderSinglePiece(draggedPieceToRenderLast, draggedPieceKey, time, true);
  }

  animationFrameId = requestAnimationFrame(render);
};

// 抽离单颗棋子的渲染逻辑
const renderSinglePiece = (p: Piece, key: string, time: number, isDragged = false) => {
  if (p.isDying && p.dieTime) {
    const dieElapsed = time - p.dieTime;
    const deathDuration = 500; 
    
    p.opacity = Math.max(0, 1 - dieElapsed / deathDuration);
    
    if (dieElapsed >= deathDuration) {
      grid.delete(key); 
      return; 
    }
  } else {
    const elapsed = time - p.startTime;
    const lifeRatio = elapsed / p.life;

    if (lifeRatio >= 1 && !isDragged) {
      p.opacity = 0; 
      return;
    }

    p.opacity = lifeRatio < 0.2 ? lifeRatio / 0.2 : (1 - lifeRatio) / 0.8;
    if (isDragged) p.opacity = 1; 
  }

  if (p.pulseScale > 1) {
    p.pulseScale -= (p.isDying ? 0.05 : 0.015);
  } else {
    p.isActive = false;
  }

  const x = isDragged ? drag.x : p.col * props.cellSize + props.cellSize / 2;
  const y = isDragged ? drag.y : p.row * props.cellSize + props.cellSize / 2;
  const radius = props.cellSize * 0.32;

  ctx!.save();
  ctx!.globalAlpha = p.opacity;

  // 1. 物理涟漪波纹
  if (p.isActive && p.pulseScale > 1) {
    const rippleExpand = (p.maxPulseScale - p.pulseScale) * props.cellSize;
    const rippleAlpha = Math.max(0, (p.pulseScale - 1) / (p.maxPulseScale - 1));
    
    ctx!.beginPath();
    ctx!.arc(x, y, Math.max(0.1, radius + rippleExpand), 0, Math.PI * 2);
    ctx!.strokeStyle = p.color === 'black' 
      ? `rgba(99, 102, 241, ${rippleAlpha})` 
      : `rgba(244, 63, 94, ${rippleAlpha})`;
    ctx!.lineWidth = p.isDying ? 4 : 2; 
    ctx!.stroke();
  }

  // 2. 实体棋子投影
  ctx!.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx!.shadowBlur = isDragged ? 15 : 8;
  ctx!.shadowOffsetY = isDragged ? 8 : 4;

  // 3. 拟真材质渲染
  const gradient = ctx!.createRadialGradient(
    x - radius * 0.3, y - radius * 0.3, radius * 0.1, 
    x, y, radius
  );
  
  if (p.color === 'black') {
    gradient.addColorStop(0, '#555555');
    gradient.addColorStop(0.3, '#222222');
    gradient.addColorStop(1, '#050505');
  } else {
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.4, '#eeeeee');
    gradient.addColorStop(1, '#cccccc');
  }

  ctx!.fillStyle = gradient;
  ctx!.beginPath();
  ctx!.arc(x, y, radius, 0, Math.PI * 2);
  ctx!.fill();

  ctx!.restore();
};

const gc = () => {
  grid.forEach((p, k) => {
    if (!drag.isDragging || k !== drag.key) {
      if (!p.isDying && performance.now() - p.startTime >= p.life) {
        grid.delete(k);
      }
    }
  });
};
setInterval(gc, 2000);

onMounted(() => {
  initCanvas();
  window.addEventListener('resize', initCanvas);
  animationFrameId = requestAnimationFrame(render);
});

onUnmounted(() => {
  window.removeEventListener('resize', initCanvas);
  cancelAnimationFrame(animationFrameId);
});
</script>

<template>
  <canvas
    ref="canvasRef"
    class="fixed inset-0 pointer-events-auto cursor-crosshair z-0"
    style="background: transparent;"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseLeave"
    @dblclick="handleDblClick"
  />
</template>
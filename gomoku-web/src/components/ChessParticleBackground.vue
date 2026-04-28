<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

interface Props {
  cellSize?: number;     
  spawnRate?: number;    
  pieceLife?: number;    
  connectRadius?: number; // 粒子连线的最大触发距离
}

const props = withDefaults(defineProps<Props>(), {
  cellSize: 45,          
  spawnRate: 0.02,
  pieceLife: 8000,
  connectRadius: 400,    // 默认150px内触发连线
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
}

const grid = new Map<string, Piece>();
const dimensions = { width: 0, height: 0, rows: 0, cols: 0 };

// 拖拽状态中心
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

// 1. 按下鼠标：拾取棋子
const handleMouseDown = (e: MouseEvent) => {
  const col = Math.floor(e.clientX / props.cellSize);
  const row = Math.floor(e.clientY / props.cellSize);
  const key = `${row}-${col}`;
  
  if (grid.has(key)) {
    drag.isDragging = true;
    drag.key = key;
    drag.x = e.clientX;
    drag.y = e.clientY;
    
    // 刷新寿命，防止拖着拖着消失了
    const piece = grid.get(key)!;
    piece.startTime = performance.now();
  }
};

// 2. 拖拽移动：实时更新绝对坐标
const handleMouseMove = (e: MouseEvent) => {
  if (!drag.isDragging) return;
  drag.x = e.clientX;
  drag.y = e.clientY;
};

// 3. 松开鼠标：吸附网格、触发全量脉冲
const handleMouseUp = (e: MouseEvent) => {
  if (!drag.isDragging) return;
  
  const draggedPiece = grid.get(drag.key);
  if (!draggedPiece) {
    drag.isDragging = false;
    return;
  }

  const connectedKeys: string[] = [];
  
  // 找出此刻所有在连接半径内的同色棋子
  grid.forEach((p, k) => {
    if (k !== drag.key && p.color === draggedPiece.color) {
      const px = p.col * props.cellSize + props.cellSize / 2;
      const py = p.row * props.cellSize + props.cellSize / 2;
      const dist = Math.hypot(px - drag.x, py - drag.y);
      if (dist < props.connectRadius) {
        connectedKeys.push(k);
      }
    }
  });

  // 吸附到新网格
  const newCol = Math.floor(drag.x / props.cellSize);
  const newRow = Math.floor(drag.y / props.cellSize);
  const newKey = `${newRow}-${newCol}`;

  grid.delete(drag.key);
  draggedPiece.row = newRow;
  draggedPiece.col = newCol;
  grid.set(newKey, draggedPiece);

  // 触发当前棋子的脉冲
  draggedPiece.isActive = true;
  draggedPiece.pulseScale = 1.6;
  draggedPiece.startTime = performance.now();

  // 触发所有被连接棋子的脉冲
  connectedKeys.forEach(k => {
    const cp = grid.get(k);
    if (cp) {
      cp.isActive = true;
      cp.pulseScale = 1.6;
      cp.startTime = performance.now();
    }
  });

  drag.isDragging = false;
  drag.key = '';
};

// 4. 离开画布保护机制
const handleMouseLeave = () => {
  if (drag.isDragging) handleMouseUp(new MouseEvent('mouseup'));
};

// 5. 双击生成
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
      isActive: true,
      pulseScale: 1.6
    };
    grid.set(key, newPiece);
  }
};

// 渲染循环
const render = (time: number) => {
  if (!ctx) return;
  ctx.clearRect(0, 0, dimensions.width, dimensions.height);

  // 随机生成
  if (Math.random() < props.spawnRate) {
    const r = Math.floor(Math.random() * dimensions.rows);
    const c = Math.floor(Math.random() * dimensions.cols);
    const key = `${r}-${c}`;
    if (!grid.has(key)) {
      grid.set(key, {
        row: r, col: c,
        color: Math.random() > 0.5 ? 'black' : 'white',
        startTime: time,
        life: props.pieceLife,
        opacity: 0,
        isActive: false,
        pulseScale: 1
      });
    }
  }

  // --- 阶段 A：绘制拖拽连线 (在棋子下方) ---
  if (drag.isDragging && drag.key) {
    const draggedPiece = grid.get(drag.key);
    if (draggedPiece) {
      grid.forEach((p, k) => {
        if (k !== drag.key && p.color === draggedPiece.color) {
          const px = p.col * props.cellSize + props.cellSize / 2;
          const py = p.row * props.cellSize + props.cellSize / 2;
          const dist = Math.hypot(px - drag.x, py - drag.y);
          
          if (dist < props.connectRadius) {
            // 根据距离计算线段透明度 (越近越亮)
            const lineOpacity = (1 - dist / props.connectRadius) * 0.8 * p.opacity;
            ctx!.beginPath();
            ctx!.moveTo(drag.x, drag.y);
            ctx!.lineTo(px, py);
            ctx!.strokeStyle = draggedPiece.color === 'black' 
              ? `rgba(99, 102, 241, ${lineOpacity})`  // 靛蓝连线
              : `rgba(244, 63, 94, ${lineOpacity})`;  // 玫瑰红连线
            ctx!.lineWidth = 1.5;
            ctx!.stroke();
          }
        }
      });
    }
  }

  // --- 阶段 B：绘制所有棋子实体 ---
  let draggedPieceToRenderLast: Piece | null = null;

  grid.forEach((p, key) => {
    // 提取出当前被拖拽的棋子最后画，保证它浮在最顶层
    if (drag.isDragging && key === drag.key) {
      draggedPieceToRenderLast = p;
      return; 
    }
    renderSinglePiece(p, time);
  });

  if (draggedPieceToRenderLast) {
    renderSinglePiece(draggedPieceToRenderLast, time, true);
  }

  animationFrameId = requestAnimationFrame(render);
};

// 抽离单颗棋子的渲染逻辑
const renderSinglePiece = (p: Piece, time: number, isDragged = false) => {
  const elapsed = time - p.startTime;
  const lifeRatio = elapsed / p.life;

  // 拖拽时不计算寿命损耗
  if (lifeRatio >= 1 && !isDragged) {
    // 这里因为是在 forEach 外部调用的封装，直接使用引用删除需要注意，但我们在 Vue map里，等下次自然清理也可。
    // 为了严谨，将其透明度直接归零
    p.opacity = 0; 
    return;
  }

  p.opacity = lifeRatio < 0.2 ? lifeRatio / 0.2 : (1 - lifeRatio) / 0.8;
  if (isDragged) p.opacity = 1; // 拖拽时始终保持完全不透明

  if (p.pulseScale > 1) {
    p.pulseScale -= 0.015;
  } else {
    p.isActive = false;
  }

  // 判断是否是被拖拽的棋子，如果是，使用鼠标绝对坐标
  const x = isDragged ? drag.x : p.col * props.cellSize + props.cellSize / 2;
  const y = isDragged ? drag.y : p.row * props.cellSize + props.cellSize / 2;
  const radius = props.cellSize * 0.32;

  ctx!.save();
  ctx!.globalAlpha = p.opacity;

  // 1. 物理涟漪波纹
  if (p.isActive && p.pulseScale > 1) {
    const rippleExpand = (1.6 - p.pulseScale) * props.cellSize;
    const rippleAlpha = Math.max(0, (p.pulseScale - 1) * 1.6);
    
    ctx!.beginPath();
    ctx!.arc(x, y, radius + rippleExpand, 0, Math.PI * 2);
    ctx!.strokeStyle = p.color === 'black' ? `rgba(99, 102, 241, ${rippleAlpha})` : `rgba(244, 63, 94, ${rippleAlpha})`;
    ctx!.lineWidth = 2;
    ctx!.stroke();
  }

  // 2. 实体棋子投影 (被拖拽时阴影加大，体现悬浮感)
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

// 补丁：定期清理死去的粒子（因为上面的抽离，放在帧尾统一清理更安全）
const gc = () => {
  grid.forEach((p, k) => {
    if (!drag.isDragging || k !== drag.key) {
      if (performance.now() - p.startTime >= p.life) grid.delete(k);
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
/**
 * Room composable
 * Manages room list, current room state, and Socket.io room events
 */
import { ref, computed, onUnmounted } from 'vue';
import { fetchRooms, fetchRoomById, type RoomInfo } from '../api/room-api';
import { socketService } from '../services/socket.service';

// ── Shared state (singleton across component instances) ────────────────

const rooms = ref<RoomInfo[]>([]);
const currentRoom = ref<RoomInfo | null>(null);
let listenerCount = 0;

// ── Socket event handlers ──────────────────────────────────────────────

function onRoomCreated(payload: unknown): void {
  const { room } = payload as { room: RoomInfo };
  const idx = rooms.value.findIndex((r) => r.id === room.id);
  if (idx === -1) {
    rooms.value.unshift(room);
  } else {
    rooms.value[idx] = room;
  }
  if (currentRoom.value?.id === room.id) {
    currentRoom.value = room;
  }
}

function onRoomUpdated(payload: unknown): void {
  const { room } = payload as { room: RoomInfo };
  const idx = rooms.value.findIndex((r) => r.id === room.id);
  if (idx !== -1) {
    rooms.value[idx] = room;
  }
  if (currentRoom.value?.id === room.id) {
    currentRoom.value = room;
  }
}

function onRoomRemoved(payload: unknown): void {
  const { roomId } = payload as { roomId: string };
  rooms.value = rooms.value.filter((r) => r.id !== roomId);
  if (currentRoom.value?.id === roomId) {
    currentRoom.value = null;
  }
}

// ── Composable ─────────────────────────────────────────────────────────

export function useRoom() {
  const isInRoom = computed(() => currentRoom.value !== null);

  // ── REST methods ────────────────────────────────────────────────────

  async function loadRooms(page: number = 1, pageSize: number = 20): Promise<void> {
    const result = await fetchRooms(page, pageSize);
    rooms.value = result.rooms;
  }

  async function loadRoomById(roomId: string): Promise<RoomInfo> {
    const room = await fetchRoomById(roomId);
    currentRoom.value = room;
    return room;
  }

  // ── Socket methods ──────────────────────────────────────────────────

  function createRoom(name: string, ruleMode: 'standard' | 'renju'): void {
    socketService.emit('room:create', { name, ruleMode, isRanked: false });
  }

  function joinRoom(roomId: string): void {
    socketService.emit('room:join', { roomId });
  }

  function leaveRoom(roomId: string): void {
    socketService.emit('room:leave', { roomId });
  }

  function watchRoom(roomId: string): void {
    socketService.emit('room:watch', { roomId });
  }

  // ── Lifecycle ───────────────────────────────────────────────────────

  function registerListeners(): void {
    if (listenerCount === 0) {
      socketService.on('room:created', onRoomCreated);
      socketService.on('room:updated', onRoomUpdated);
      socketService.on('room:removed', onRoomRemoved);
    }
    listenerCount++;
  }

  function unregisterListeners(): void {
    listenerCount--;
    if (listenerCount <= 0) {
      listenerCount = 0;
      socketService.off('room:created', onRoomCreated);
      socketService.off('room:updated', onRoomUpdated);
      socketService.off('room:removed', onRoomRemoved);
    }
  }

  // Auto-register on mount, clean up on unmount
  registerListeners();
  onUnmounted(() => {
    unregisterListeners();
  });

  return {
    // State
    rooms,
    currentRoom,
    isInRoom,

    // REST methods
    loadRooms,
    loadRoomById,

    // Socket methods
    createRoom,
    joinRoom,
    leaveRoom,
    watchRoom,
  };
}

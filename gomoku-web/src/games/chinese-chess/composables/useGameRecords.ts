import { ref } from 'vue';
import { gameApi, type ChineseChessFrontendGame, type FrontendGame, type GameListItem, type GameType } from '../../../api/game-api';
import { useGlobalAuth } from '../../../composables/useAuth';
import { t } from '../../../i18n';

export function useGameRecords(gameType: GameType) {
  const gameRecords = ref<GameListItem[]>([]);
  const editingGameId = ref<string | null>(null);
  const editingName = ref('');

  const auth = useGlobalAuth();

  const fetchRecords = async () => {
    try {
      const result = await gameApi.getGames(gameType);
      gameRecords.value = result.games;
    } catch {
      gameRecords.value = [];
    }
  };

  const canEditGame = (game: GameListItem): boolean => {
    const isAdmin = auth.user.value?.role === 'ADMIN';
    return isAdmin || !game.isPublic;
  };

  const saveGame = async (
    game: ChineseChessFrontendGame,
    existingRecords: GameListItem[]
  ): Promise<{ id: string; name: string; timestamp: number } | null> => {
    if (!game.name.trim()) return null;

    if (existingRecords.some(g => g.name === game.name.trim())) {
      return null;
    }

    try {
      const savedGame = await gameApi.saveGame(game as unknown as FrontendGame);
      await fetchRecords();
      return savedGame;
    } catch {
      return null;
    }
  };

  const updateGame = async (id: string, game: ChineseChessFrontendGame): Promise<boolean> => {
    const record = gameRecords.value.find(g => g.id === id);
    if (!record || !canEditGame(record)) {
      return false;
    }

    try {
      await gameApi.updateGame(id, game as unknown as FrontendGame);
      await fetchRecords();
      return true;
    } catch {
      return false;
    }
  };

  const deleteGame = async (id: string): Promise<boolean> => {
    const game = gameRecords.value.find(g => g.id === id);
    if (!game || !canEditGame(game)) {
      return false;
    }

    try {
      await gameApi.deleteGame(id, gameType);
      await fetchRecords();
      return true;
    } catch {
      return false;
    }
  };

  const startEditing = (game: GameListItem, notify: (msg: string) => void) => {
    if (!canEditGame(game)) {
      notify(game.isPublic ? t('noPermissionEditPublic') : t('noPermissionEdit'));
      return false;
    }
    editingGameId.value = game.id;
    editingName.value = game.name;
    return true;
  };

  const saveEdit = async (notify: (msg: string) => void): Promise<boolean> => {
    if (!editingGameId.value) return false;
    const name = editingName.value.trim();
    if (!name) {
      editingGameId.value = null;
      return false;
    }

    const index = gameRecords.value.findIndex(g => g.id === editingGameId.value);
    if (index !== -1) {
      const game = gameRecords.value[index];
      if (!canEditGame(game)) {
        notify(game.isPublic ? t('noPermissionEditPublic') : t('noPermissionEdit'));
        editingGameId.value = null;
        return false;
      }

      try {
        const fullGame = await gameApi.getGame(game.id, gameType);
        const updatedGame = { ...fullGame, name } as ChineseChessFrontendGame;
        await gameApi.updateGame(game.id, updatedGame as unknown as FrontendGame);
        await fetchRecords();
        notify(t('updateSuccess'));
        editingGameId.value = null;
        return true;
      } catch {
        notify(t('updateFailed'));
        editingGameId.value = null;
        return false;
      }
    }
    editingGameId.value = null;
    return false;
  };

  const cancelEditing = () => {
    editingGameId.value = null;
  };

  const getFullGame = async (id: string): Promise<ChineseChessFrontendGame | null> => {
    try {
      const game = await gameApi.getGame(id, gameType);
      return game as ChineseChessFrontendGame;
    } catch {
      return null;
    }
  };

  return {
    gameRecords,
    editingGameId,
    editingName,

    fetchRecords,
    canEditGame,
    saveGame,
    updateGame,
    deleteGame,
    startEditing,
    saveEdit,
    cancelEditing,
    getFullGame,
  };
}

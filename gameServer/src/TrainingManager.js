import { ApplicationLoop } from "./ApplicationLoop.js";
import { Game } from "./gameplay/Game.js";
import { BotManager } from "./bots/BotManager.js";

/**
 * Менеджер тренировочных сессий.
 * Создаёт отдельную игровую арену для каждого игрока.
 */
export class TrainingManager {
	/** @type {Map<string, TrainingSession>} */
	#sessions = new Map();
	#mainHooks;
	#arenaConfig;

	/**
	 * @param {Object} options
	 * @param {import("./Main.js").GameServerHooks} options.hooks
	 * @param {Object} options.arenaConfig
	 * @param {number} options.arenaConfig.arenaWidth
	 * @param {number} options.arenaConfig.arenaHeight
	 * @param {number} options.arenaConfig.pitWidth
	 * @param {number} options.arenaConfig.pitHeight
	 * @param {import("./gameplay/Game.js").GameModes} options.arenaConfig.gameMode
	 */
	constructor({ hooks, arenaConfig }) {
		this.#mainHooks = hooks;
		this.#arenaConfig = arenaConfig;
		
		// Периодическая очистка неактивных сессий
		setInterval(() => {
			this.#cleanupInactiveSessions();
		}, 60000); // Каждую минуту
	}

	/**
	 * Получить или создать тренировочную сессию для подключения
	 * @param {import("./WebSocketConnection.js").WebSocketConnection} connection
	 * @param {number} botCount - Количество ботов (2 или 4)
	 * @returns {TrainingSession}
	 */
	getOrCreateSession(connection, botCount = 2) {
		const sessionId = this.#generateSessionId();
		
		const session = new TrainingSession({
			sessionId,
			hooks: this.#mainHooks,
			arenaConfig: this.#arenaConfig,
			botCount: Math.max(0, Math.min(4, botCount)), // Ограничиваем 0-4
		});
		
		this.#sessions.set(sessionId, session);
		
		// Удаляем сессию при закрытии последнего соединения
		session.onEmpty(() => {
			this.#sessions.delete(sessionId);
		});
		
		return session;
	}

	/**
	 * Удаляет неактивные сессии (без игроков и старше 5 минут)
	 */
	#cleanupInactiveSessions() {
		const now = Date.now();
		const timeout = 5 * 60 * 1000; // 5 минут
		
		for (const [sessionId, session] of this.#sessions.entries()) {
			if (session.isEmpty() && (now - session.createdAt) > timeout) {
				session.destroy();
				this.#sessions.delete(sessionId);
			}
		}
	}

	#generateSessionId() {
		return `training_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
	}

	getActiveSessionCount() {
		return this.#sessions.size;
	}

	destroy() {
		for (const session of this.#sessions.values()) {
			session.destroy();
		}
		this.#sessions.clear();
	}
}

/**
 * Одна тренировочная сессия (персональная арена для одного игрока + боты)
 */
class TrainingSession {
	#sessionId;
	#applicationLoop;
	#game;
	#botManager;
	#botCount;
	#playerConnection = null;
	#onEmptyCallback = null;
	createdAt;

	/**
	 * @param {Object} options
	 * @param {string} options.sessionId
	 * @param {import("./Main.js").GameServerHooks} options.hooks
	 * @param {Object} options.arenaConfig
	 * @param {number} options.botCount
	 */
	constructor({ sessionId, hooks, arenaConfig, botCount }) {
		this.#sessionId = sessionId;
		this.#botCount = botCount;
		this.createdAt = Date.now();

		// Создаём мини-экземпляр Main для этой сессии
		const miniMain = {
			hooks,
			serverId: `training_${sessionId}`,
			applicationLoop: null,
			game: null,
			botManager: null,
			lobbyManager: null, // Для тренировок не нужен
			websocketManager: {
				loop: (now, dt) => {
					if (this.#playerConnection) {
						this.#playerConnection.loop(now, dt);
					}
				},
			},
		};

		this.#applicationLoop = new ApplicationLoop(miniMain);
		miniMain.applicationLoop = this.#applicationLoop;

		this.#game = new Game(this.#applicationLoop, miniMain, {
			arenaWidth: arenaConfig.arenaWidth,
			arenaHeight: arenaConfig.arenaHeight,
			pitWidth: arenaConfig.pitWidth,
			pitHeight: arenaConfig.pitHeight,
			gameMode: arenaConfig.gameMode,
		});
		miniMain.game = this.#game;

		this.#botManager = new BotManager(miniMain);
		miniMain.botManager = this.#botManager;

		this.#applicationLoop.onSlowTickEnded(() => {
			this.#botManager.loop(performance.now());
		});
	}

	get sessionId() {
		return this.#sessionId;
	}

	get game() {
		return this.#game;
	}

	get botManager() {
		return this.#botManager;
	}

	/**
	 * Добавить игрока в эту сессию
	 * @param {import("./WebSocketConnection.js").WebSocketConnection} connection
	 */
	addPlayer(connection) {
		this.#playerConnection = connection;
		
		// Запускаем ботов когда игрок присоединяется
		if (this.#botCount > 0) {
			this.#botManager.setTargetCount(this.#botCount);
		}
	}

	/**
	 * Удалить игрока из сессии
	 */
	removePlayer() {
		this.#playerConnection = null;
		
		// Останавливаем ботов
		this.#botManager.clear();
		
		// Уведомляем что сессия пуста
		if (this.#onEmptyCallback) {
			this.#onEmptyCallback();
		}
	}

	isEmpty() {
		return this.#playerConnection === null;
	}

	onEmpty(callback) {
		this.#onEmptyCallback = callback;
	}

	destroy() {
		if (this.#botManager) {
			this.#botManager.clear();
		}
		// Game и ApplicationLoop очистятся автоматически при garbage collection
		this.#playerConnection = null;
	}
}


const getEnv = (key) => (typeof Deno != "undefined" && "env" in Deno ? Deno.env.get(key) ?? undefined : undefined);
import { WebSocketManager } from "./WebSocketManager.js";
import { TrainingManager } from "./TrainingManager.js";

/**
 * @typedef AuthContext
 * @property {import("./WebSocketConnection.js").WebSocketConnection} connection
 * @property {string} token
 * @property {string} ip
 */

/**
 * @typedef AuthResult
 * @property {boolean} success
 * @property {string} [reason]
 * @property {string} [playerName]
 * @property {boolean} [plusSkinsAllowed]
 * @property {boolean} [isSpectator]
 * @property {boolean} [hasExtraLife]
 * @property {number} [depositTier]
 * @property {string} [userId]
 * @property {number} [telegramId]
 * @property {Record<string, unknown>} [metadata]
 */

/**
 * @typedef GameServerHooks
 * @property {(context: AuthContext) => Promise<AuthResult>} [authenticatePlayer]
 */

/**
 * Специальная версия Main для тренировочного режима.
 * Вместо одной общей игры создаёт персональные арены для каждого игрока.
 */
export class TrainingMain {
	/**
	 * @param {Object} options
	 * @param {number} options.arenaWidth
	 * @param {number} options.arenaHeight
	 * @param {number} [options.pitWidth]
	 * @param {number} [options.pitHeight]
	 * @param {import("./gameplay/Game.js").GameModes} [options.gameMode]
	 * @param {GameServerHooks} [options.hooks]
	 */
	constructor({
		arenaWidth,
		arenaHeight,
		pitWidth = 16,
		pitHeight = 16,
		gameMode = "default",
		hooks,
	}) {
		this.hooks = hooks;
		this.serverId = getEnv("GAMESERVER_ID") ?? "training";
		
		// Менеджер тренировочных сессий
		this.trainingManager = new TrainingManager({
			hooks,
			arenaConfig: {
				arenaWidth,
				arenaHeight,
				pitWidth,
				pitHeight,
				gameMode,
			},
		});

		// WebSocketManager работает с этим специальным Main
		this.websocketManager = new TrainingWebSocketManager(this);
	}

	/**
	 * @param {Object} options
	 * @param {number} options.port
	 * @param {string} options.hostname
	 */
	init({ port, hostname }) {
		this.websocketManager.startServer(port, hostname);
	}
}

/**
 * Специальный WebSocket менеджер для тренировочного режима.
 * Создаёт персональную сессию для каждого подключения.
 */
class TrainingWebSocketManager {
	#mainInstance;
	/** @type {Map<import("./WebSocketConnection.js").WebSocketConnection, import("./TrainingManager.js").TrainingSession>} */
	#connectionToSession = new Map();

	/**
	 * @param {TrainingMain} mainInstance
	 */
	constructor(mainInstance) {
		this.#mainInstance = mainInstance;
	}

	/**
	 * Запускает WebSocket сервер (не используется напрямую в production.js)
	 * @param {number} port
	 * @param {string} hostname
	 */
	startServer(port, hostname) {
		// Реализация аналогична WebSocketManager, но не используется в текущей архитектуре
		// так как production.js использует handleRequest
	}

	/**
	 * Обрабатывает WebSocket запрос
	 * @param {Request} request
	 * @param {Deno.ServeHandlerInfo<Deno.NetAddr>} info
	 */
	async handleRequest(request, info) {
		// Получаем количество ботов из query параметра
		const url = new URL(request.url);
		const botCount = parseInt(url.searchParams.get("bots") || "2", 10);
		
		// Создаём новую тренировочную сессию для этого подключения
		// (будет создана при подключении WebSocketConnection)
		
		// Передаём запрос в базовый WebSocketManager
		// но с кастомной обработкой через TrainingWebSocketConnection
		
		if (request.method != "GET") {
			return new Response("Endpoint is a websocket", { status: 405 });
		}
		if (request.headers.get("upgrade") != "websocket") {
			return new Response("Endpoint is a websocket", {
				status: 426,
				headers: { upgrade: "websocket" },
			});
		}

		let ip = "";
		const realIp = request.headers.get("X-Real-IP");
		if (realIp) {
			ip = realIp;
		} else if (info.remoteAddr.transport == "tcp") {
			ip = info.remoteAddr.hostname;
		}

		const { socket, response } = Deno.upgradeWebSocket(request);
		
		socket.addEventListener("open", () => {
			// Создаём новую тренировочную сессию
			const session = this.#mainInstance.trainingManager.getOrCreateSession(null, botCount);
			
			// Создаём WebSocket подключение которое работает с этой сессией
			const connection = new TrainingWebSocketConnection(
				socket,
				ip,
				this.#mainInstance,
				session.game,
				session,
				botCount
			);
			
			this.#connectionToSession.set(connection, session);
			session.addPlayer(connection);

			socket.addEventListener("message", async (message) => {
				try {
					if (message.data instanceof ArrayBuffer) {
						await connection.onMessage(message.data);
					} else if (typeof message.data == "string") {
						await connection.onStringMessage(message.data);
					}
				} catch (e) {
					console.error("Error handling websocket message", e);
				}
			});

			socket.addEventListener("close", () => {
				connection.onClose();
				const session = this.#connectionToSession.get(connection);
				if (session) {
					session.removePlayer();
					this.#connectionToSession.delete(connection);
				}
			});
		});

		return response;
	}
}

/**
 * Импортируем WebSocketConnection и расширяем его для тренировочного режима
 */
import { WebSocketConnection } from "./WebSocketConnection.js";

class TrainingWebSocketConnection extends WebSocketConnection {
	#trainingSession;
	#botCount;

	/**
	 * @param {WebSocket} socket
	 * @param {string} ip
	 * @param {TrainingMain} mainInstance
	 * @param {import("./gameplay/Game.js").Game} game
	 * @param {import("./TrainingManager.js").TrainingSession} trainingSession
	 * @param {number} botCount
	 */
	constructor(socket, ip, mainInstance, game, trainingSession, botCount) {
		super(socket, ip, mainInstance, game);
		this.#trainingSession = trainingSession;
		this.#botCount = botCount;
	}
}


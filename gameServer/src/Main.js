const getEnv = (key) => (typeof Deno != "undefined" && "env" in Deno ? Deno.env.get(key) ?? undefined : undefined);
import { ApplicationLoop } from "./ApplicationLoop.js";
import { Game } from "./gameplay/Game.js";
import { LobbyManager } from "./LobbyManager.js";
import { BotManager } from "./bots/BotManager.js";
import { WebSocketConnection } from "./WebSocketConnection.js";
import { WebSocketManager } from "./WebSocketManager.js";

/**
 * @typedef AuthContext
 * @property {WebSocketConnection} connection
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
 * @property {string} [photoUrl]
 * @property {string} [telegramUsername]
 * @property {Record<string, unknown>} [metadata]
 */

/**
 * @typedef GameServerHooks
 * @property {(context: AuthContext) => Promise<AuthResult>} [authenticatePlayer]
 */

export class Main {
	/**
	 * @param {Object} options
	 * @param {number} options.arenaWidth
	 * @param {number} options.arenaHeight
	 * @param {number} [options.pitWidth] pit is specific to arena gamemode and refers to the thing in the middle of the arena.
	 * @param {number} [options.pitHeight] pit is specific to arena gamemode and refers to the thing in the middle of the arena.
	 * @param {import("./gameplay/Game.js").GameModes} [options.gameMode]
	 * @param {GameServerHooks} [options.hooks]
	 * @param {number} [options.minPlayers]
	 * @param {number} [options.maxPlayers]
	 * @param {number} [options.countdownMs]
	 */
	constructor({
		arenaWidth,
		arenaHeight,
		pitWidth = 16,
		pitHeight = 16,
		gameMode = "default",
		hooks,
		minPlayers,
		maxPlayers,
		countdownMs,
	}) {
		this.hooks = hooks;
		this.serverId = getEnv("GAMESERVER_ID") ?? null;
		this.applicationLoop = new ApplicationLoop(this);
		this.game = new Game(this.applicationLoop, this, {
			arenaWidth,
			arenaHeight,
			pitWidth,
			pitHeight,
			gameMode,
		});
		this.websocketManager = new WebSocketManager(this, this.game);
		this.lobbyManager = new LobbyManager(this, {
			minPlayers: minPlayers ?? (parseInt(getEnv("SPACEBEE_LOBBY_MIN_PLAYERS") ?? "4", 10) || 4),
			maxPlayers: maxPlayers ?? (parseInt(getEnv("SPACEBEE_LOBBY_MAX_PLAYERS") ?? "8", 10) || 8),
			countdownMs: countdownMs ?? (parseInt(getEnv("SPACEBEE_LOBBY_COUNTDOWN_MS") ?? "3000", 10) || 3000),
		});
		this.botManager = new BotManager(this);
		this.applicationLoop.onSlowTickEnded(() => {
			this.botManager.loop(performance.now());
		});
		this.game.onPlayerCountChange((playerCount) => {
			this.websocketManager.notifyControlSocketsPlayerCount(playerCount);
		});
		this.game.onPlayerScoreReported((score) => {
			this.websocketManager.notifyControlSocketsPlayerScore(score);
		});
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

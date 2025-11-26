/**
 * @typedef {"idle" | "countdown" | "versus" | "active"} LobbyState
 */

export class LobbyManager {
	#mainInstance;
	#minPlayers;
	#maxPlayers;
	#countdownMs;
	/** @type {Set<import("./WebSocketConnection.js").WebSocketConnection>} */
	#waitingConnections = new Set();
	/** @type {Set<import("./WebSocketConnection.js").WebSocketConnection>} */
	#activeConnections = new Set();
	/** @type {LobbyState} */
	#state = "idle";
	/** @type {ReturnType<typeof setTimeout> | null} */
	#countdownTimer = null;
	/** @type {ReturnType<typeof setInterval> | null} */
	#countdownInterval = null;
	#countdownEndsAt = 0;
	#matchStarted = false;
	/** @type {number?} */
	#betAmount = null;

	/**
	 * @param {import("./Main.js").Main} mainInstance
	 * @param {Object} options
	 * @param {number} [options.minPlayers]
	 * @param {number} [options.maxPlayers]
	 * @param {number} [options.countdownMs]
	 */
	constructor(mainInstance, {
		minPlayers = 4,
		maxPlayers = 8,
		countdownMs = 3_000,
	} = {}) {
		this.#mainInstance = mainInstance;
		this.#minPlayers = minPlayers;
		this.#maxPlayers = Math.max(maxPlayers, minPlayers);
		this.#countdownMs = countdownMs;
	}

	get maxPlayers() {
		return this.#maxPlayers;
	}

	get betAmount() {
		return this.#betAmount;
	}

	/**
	 * Called once a connection has successfully authenticated.
	 * @param {import("./WebSocketConnection.js").WebSocketConnection} connection
	 * @param {number?} betAmount
	 */
	registerConnection(connection, betAmount = null) {
		// If lobby has a bet amount, check if it matches
		if (this.#betAmount !== null && betAmount !== this.#betAmount) {
			// Bet mismatch - reject connection
			console.warn(`Bet mismatch: lobby requires ${this.#betAmount}, but player offered ${betAmount}`);
			connection.close();
			return;
		}

		// If this is the first player, set the lobby's bet amount
		if (this.#betAmount === null && betAmount !== null) {
			this.#betAmount = betAmount;
		}

		this.#waitingConnections.add(connection);
		connection.setLobbyState("waiting", this.#buildStatusPayload());
		this.#broadcastStatus();
		if (this.#state === "active") {
			this.#fillOpenSlots();
		}
		this.#maybeStartCountdown();
	}

	/**
	 * Called when the connection successfully created a player.
	 * @param {import("./WebSocketConnection.js").WebSocketConnection} connection
	 */
	notifyPlayerJoined(connection) {
		if (this.#waitingConnections.has(connection)) {
			this.#waitingConnections.delete(connection);
		}
		this.#activeConnections.add(connection);
		connection.setLobbyState("active", this.#buildStatusPayload());
		this.#broadcastStatus();
	}

	/**
	 * Called when the connection closes for any reason.
	 * @param {import("./WebSocketConnection.js").WebSocketConnection} connection
	 */
	handleConnectionClosed(connection) {
		let changed = false;
		if (this.#waitingConnections.delete(connection)) {
			changed = true;
		}
		if (this.#activeConnections.delete(connection)) {
			changed = true;
		}

		if (!changed) return;

		if (this.#activeConnections.size === 0) {
			this.#state = "idle";
			this.#matchStarted = false;
			this.#mainInstance.botManager?.clear();
		}

		this.#maybeStartCountdown();
		this.#fillOpenSlots();
		this.#broadcastStatus();
	}

	/**
	 * Called when a player leaves the game but the connection remains.
	 * @param {import("./gameplay/Player.js").Player} player
	 */
	handlePlayerRemoved(player) {
		const connection = player.connection;
		if (!connection) return;
		// Don't fill open slots when a player dies - this prevents bots from spawning
		// after real players are eliminated in 1v1 or 1v1v1v1 modes
		// this.#fillOpenSlots();

		// Check for winner - if only one human player remains in active match
		if (this.#state === "active" && this.#matchStarted) {
			this.#checkForWinner();
		}
	}

	/**
	 * Check if there's a winner (only one human player left)
	 */
	#checkForWinner() {
		// Get all active players from the game
		const game = this.#mainInstance.game;
		if (!game) return;

		const alivePlayers = game.getAlivePlayers();
		const humanPlayers = alivePlayers.filter(p => !p.isBot);

		console.log(`[LobbyManager] checkForWinner: ${alivePlayers.length} alive, ${humanPlayers.length} human, matchStarted=${this.#matchStarted}`);

		// If only one human player remains and match has started, they win
		if (humanPlayers.length === 1 && this.#matchStarted) {
			const winner = humanPlayers[0];
			console.log(`[LobbyManager] Winner found: ${winner.name}`);
			winner.notifyVictory();
		}
	}

	#maybeStartCountdown() {
		if (this.#state === "active") return;
		if (this.#waitingConnections.size >= this.#minPlayers) {
			if (this.#state !== "countdown") {
				this.#startCountdown();
			}
		} else if (this.#state === "countdown" && this.#waitingConnections.size < this.#minPlayers) {
			this.#cancelCountdown();
			this.#broadcastStatus();
		}
	}

	#startCountdown() {
		this.#state = "countdown";
		this.#countdownEndsAt = Date.now() + this.#countdownMs;
		this.#broadcastStatus();

		// Update countdown every second
		this.#countdownInterval = setInterval(() => {
			this.#broadcastStatus();
		}, 1000);

		this.#countdownTimer = setTimeout(() => {
			this.#countdownTimer = null;
			if (this.#countdownInterval) {
				clearInterval(this.#countdownInterval);
				this.#countdownInterval = null;
			}
			this.#startVersus();
		}, this.#countdownMs);
	}

	#startVersus() {
		this.#state = "versus";
		const payload = this.#buildStatusPayload();
		console.log("[LobbyManager] Starting versus state, players:", JSON.stringify(payload.players));
		this.#broadcastStatus();
		// Versus screen lasts 5 seconds
		this.#countdownTimer = setTimeout(() => {
			this.#countdownTimer = null;
			this.#beginMatch();
		}, 5000);
	}

	#cancelCountdown() {
		if (this.#countdownTimer) {
			clearTimeout(this.#countdownTimer);
			this.#countdownTimer = null;
		}
		if (this.#countdownInterval) {
			clearInterval(this.#countdownInterval);
			this.#countdownInterval = null;
		}
		this.#state = "idle";
	}

	#beginMatch() {
		if (this.#waitingConnections.size < this.#minPlayers) {
			this.#state = "idle";
			this.#broadcastStatus();
			return;
		}
		this.#state = "active";
		this.#matchStarted = true;
		if (this.#mainInstance.botManager) {
			const humanSlots = Math.min(this.#waitingConnections.size, this.#maxPlayers);
			const neededBots = Math.max(
				0,
				Math.min(this.#maxPlayers, this.#minPlayers) - humanSlots,
			);
			this.#mainInstance.botManager.setTargetCount(neededBots);
		}
		this.#fillOpenSlots(true);
		this.#broadcastStatus();
	}

	/**
	 * @param {boolean} [allowMinFill]
	 */
	#fillOpenSlots(allowMinFill = false) {
		if (this.#state !== "active") return;
		while (this.#waitingConnections.size > 0) {
			const botCount = this.#mainInstance.botManager?.getActiveCount?.() ?? 0;
			const currentActive = this.#activeConnections.size + botCount;
			if (currentActive >= this.#maxPlayers) break;
			if (!allowMinFill && this.#activeConnections.size === 0) break;
			const [connection] = this.#waitingConnections;
			if (!connection) break;
			this.#waitingConnections.delete(connection);
			this.#activeConnections.add(connection);
			connection.enableGameplay(this.#buildStatusPayload());
		}

		if (this.#activeConnections.size === 0) {
			// No one joined yet; go back to waiting state.
			this.#state = "idle";
		}
		// Don't add bots after the match has started
		if (this.#mainInstance.botManager && !this.#matchStarted) {
			const desiredBots = Math.max(
				0,
				Math.min(this.#maxPlayers, this.#minPlayers) - this.#activeConnections.size,
			);
			this.#mainInstance.botManager.setTargetCount(desiredBots);
		}
		this.#broadcastStatus();
	}

	#broadcastStatus() {
		const payload = this.#buildStatusPayload();
		for (const connection of this.#waitingConnections) {
			connection.setLobbyState(this.#state, payload);
		}
		for (const connection of this.#activeConnections) {
			connection.setLobbyState("active", payload);
		}
	}

	#buildStatusPayload() {
		const countdownSeconds =
			this.#state === "countdown" ? Math.max(0, Math.ceil((this.#countdownEndsAt - Date.now()) / 1000)) : null;
		const botCount = this.#mainInstance.botManager?.getActiveCount?.() ?? 0;

		// Collect player info for versus screen
		/** @type {Array<{username: string, photoUrl: string|null, telegramId: number|null}>} */
		const players = [];
		for (const connection of this.#waitingConnections) {
			players.push(connection.getPlayerInfo());
		}
		for (const connection of this.#activeConnections) {
			players.push(connection.getPlayerInfo());
		}

		return {
			waitingCount: this.#waitingConnections.size,
			activeCount: this.#activeConnections.size + botCount,
			botCount,
			state: this.#state,
			minPlayers: this.#minPlayers,
			maxPlayers: this.#maxPlayers,
			betAmount: this.#betAmount,
			countdownSeconds,
			players,
		};
	}
}

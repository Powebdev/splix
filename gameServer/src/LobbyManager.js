/**
 * @typedef {"idle" | "countdown" | "active"} LobbyState
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
	#countdownTimer = null;
	#countdownEndsAt = 0;

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

	/**
	 * Called once a connection has successfully authenticated.
	 * @param {import("./WebSocketConnection.js").WebSocketConnection} connection
	 */
	registerConnection(connection) {
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
		this.#fillOpenSlots();
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
		this.#countdownTimer = setTimeout(() => {
			this.#countdownTimer = null;
			this.#beginMatch();
		}, this.#countdownMs);
	}

	#cancelCountdown() {
		if (this.#countdownTimer) {
			clearTimeout(this.#countdownTimer);
			this.#countdownTimer = null;
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
		if (this.#mainInstance.botManager) {
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
		return {
			waitingCount: this.#waitingConnections.size,
			activeCount: this.#activeConnections.size,
			botCount,
			minPlayers: this.#minPlayers,
			maxPlayers: this.#maxPlayers,
			countdownSeconds,
		};
	}
}


import { BotConnection } from "./BotConnection.js";

const DIRECTIONS = ["up", "down", "left", "right"];

export class Bot {
	/**
	 * @param {import("../Main.js").Main} mainInstance
	 * @param {number} id
	 */
	constructor(mainInstance, id) {
		this.#mainInstance = mainInstance;
		this.#id = id;
		this.#connection = new BotConnection(() => {
			this.#markForRemoval = true;
		});
		const auth = {
			success: true,
			playerName: `Bot-${id}`,
			telegramId: null,
			userId: null,
			depositTier: 0,
			hasExtraLife: true,
			metadata: {
				isBot: true,
			},
		};
		this.#player = this.#mainInstance.game.createPlayer(this.#connection, {
			skin: {
				colorId: 1 + (id % 6),
				patternId: 0,
			},
			name: auth.playerName,
			isSpectator: false,
			auth,
		});
		this.#direction = this.#randomDirection();
	}

	#id;
	#mainInstance;
	#connection;
	#player;
	#direction;
	#lastDirectionChange = 0;
	#markForRemoval = false;

	get player() {
		return this.#player;
	}

	get isActive() {
		return Boolean(this.#player) && !this.#player.permanentlyDead && !this.#markForRemoval;
	}

	update(now) {
		if (!this.#player || this.#player.permanentlyDead || this.#markForRemoval) {
			return;
		}
		if (this.#player.dead && this.#player.permanentlyDead) {
			this.#markForRemoval = true;
			return;
		}
		if (now - this.#lastDirectionChange > 1_500) {
			this.#direction = this.#randomDirection();
			this.#lastDirectionChange = now;
		}
		const pos = this.#player.getPosition();
		this.#player.clientPosUpdateRequested(this.#direction, pos);
	}

	destroy() {
		if (this.#player) {
			this.#mainInstance.game.removePlayer(this.#player);
			this.#player = null;
		}
		this.#markForRemoval = true;
	}

	#randomDirection() {
		const index = Math.floor(Math.random() * DIRECTIONS.length);
		return /** @type {import("../gameplay/Player.js").Direction} */ (DIRECTIONS[index]);
	}
}


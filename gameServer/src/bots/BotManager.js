import { Bot } from "./Bot.js";

export class BotManager {
	/**
	 * @param {import("../Main.js").Main} mainInstance
	 */
	constructor(mainInstance) {
		this.#mainInstance = mainInstance;
	}

	#mainInstance;
	/** @type {Bot[]} */
	#bots = [];
	#targetCount = 0;
	#nextBotId = 1;

	setTargetCount(count) {
		this.#targetCount = Math.max(0, count);
		this.#ensureBotCount();
	}

	clear() {
		this.#targetCount = 0;
		for (const bot of this.#bots) {
			bot.destroy();
		}
		this.#bots = [];
	}

	getActiveCount() {
		let count = 0;
		for (const bot of this.#bots) {
			if (bot.isActive) count++;
		}
		return count;
	}

	loop(now) {
		// console.log("BotManager loop");
		const activeBots = [];
		for (const bot of this.#bots) {
			if (bot.isActive) {
				bot.update(now);
				activeBots.push(bot);
			} else {
				bot.destroy();
			}
		}
		this.#bots = activeBots;
		this.#ensureBotCount();
	}

	#ensureBotCount() {
		let activeCount = this.getActiveCount();
		while (activeCount < this.#targetCount) {
			const bot = new Bot(this.#mainInstance, this.#nextBotId++);
			this.#bots.push(bot);
			activeCount++;
		}

		if (activeCount > this.#targetCount) {
			const surplus = activeCount - this.#targetCount;
			let removed = 0;
			for (const bot of this.#bots) {
				if (removed >= surplus) break;
				if (bot.isActive) {
					bot.destroy();
					removed++;
				}
			}
		}
	}
}


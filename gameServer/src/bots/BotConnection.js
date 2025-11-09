export class BotConnection {
	protocolVersion = 99;
	plusSkinsAllowed = true;

	constructor(onClose) {
		this.#onClose = onClose;
	}

	#onClose;

	send() {}
	sendPlayerState() {}
	sendPlayerSkin() {}
	sendPlayerName() {}
	sendPlayerIsSpectator() {}
	sendFillRect() {}
	sendRemovePlayer() {}
	sendGameOver() {}
	sendMyScore() {}
	sendMyRank() {}

	close() {
		if (typeof this.#onClose == "function") {
			this.#onClose();
		}
	}
}


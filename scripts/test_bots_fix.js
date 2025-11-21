import { TrainingManager } from "../gameServer/src/TrainingManager.js";
import { Game } from "../gameServer/src/gameplay/Game.js";
import { BotManager } from "../gameServer/src/bots/BotManager.js";

// Mock WebSocketConnection with Proxy to catch all methods
class MockWebSocketConnection {
    constructor() {
        return new Proxy(this, {
            get(target, prop) {
                if (prop in target) return target[prop];
                return () => { }; // Return no-op function for any missing method
            }
        });
    }
    send() { }
    close() { }
    loop() { }
}

// Mock Main
class MockMain {
    constructor() {
        this.game = {
            loop: () => { },
            onPlayerCountChange: () => { },
            onPlayerScoreReported: () => { },
            arena: { width: 100, height: 100, getTileValue: () => 0 }
        };
        this.websocketManager = {
            loop: () => { },
            notifyControlSocketsPlayerCount: () => { },
            notifyControlSocketsPlayerScore: () => { }
        };
        this.botManager = { loop: () => { } };
    }
}

async function runTest() {
    console.log("Starting Bot Fix Verification...");

    const main = new MockMain();
    const trainingManager = new TrainingManager({
        hooks: {},
        arenaConfig: {
            arenaWidth: 100,
            arenaHeight: 100,
            pitWidth: 10,
            pitHeight: 10,
            gameMode: "default"
        }
    });

    const session = trainingManager.getOrCreateSession(null, 2);
    console.log(`Session created: ${session.sessionId}`);

    // Access private botManager via the miniMain attached to session
    // We need to find where the botManager is stored. 
    // In TrainingManager.js: miniMain.botManager = this.#botManager;
    // But we can't access miniMain easily from outside.
    // However, we can inspect the session object if we can find it.
    // TrainingManager stores sessions in #sessions map.

    // Let's rely on the fact that we can't easily access private fields, 
    // but we can observe the effects or use the session.game.

    // Actually, we can just run the loop and see if it crashes or logs errors.
    // To verify bot count, we might need to add a temporary log in BotManager or use a debugger.
    // Or we can check session.game.players.size.

    const game = session.game;

    // Add a player to start the game logic
    const playerConn = new MockWebSocketConnection();
    const player = game.createPlayer(playerConn, "TestPlayer", "skin", false);

    console.log("Player added. Running loop...");

    let steps = 0;
    const maxSteps = 1000; // 50ms * 1000 = 50 seconds

    let playerCount = 0;
    session.game.onPlayerCountChange((count) => {
        console.log(`Player count changed to: ${count}`);
        playerCount = count;
    });

    const interval = setInterval(() => {
        const now = performance.now();
        // ApplicationLoop is already running via setInterval in TrainingSession
        // We just need to poll the state

        // Check bot count via tracked variable
        // Note: playerCount includes the real player
        const botCount = playerCount - 1; // Subtract our test player

        if (steps % 20 === 0) { // Log every second
            console.log(`Step ${steps}: Total Players: ${playerCount} (Bots: ${botCount})`);
        }

        if (botCount > 2) {
            console.error("FAIL: Too many bots detected!");
            clearInterval(interval);
            process.exit(1);
        }

        steps++;
        if (steps >= maxSteps) {
            console.log("Test finished successfully.");
            clearInterval(interval);
            process.exit(0);
        }
    }, 10); // Run fast
}

runTest();

/**
 * Loop Detector - identifies when bot is stuck in repetitive movement patterns
 */
export class LoopDetector {
    #positionHistory;
    #maxHistorySize;
    #loopThreshold;

    constructor(maxHistorySize = 20, loopThreshold = 0.3) {
        this.#positionHistory = [];
        this.#maxHistorySize = maxHistorySize;
        this.#loopThreshold = loopThreshold; // 30% repetitions = loop
    }

    /**
     * Add current position to history
     */
    addPosition(x, y) {
        this.#positionHistory.push({
            x: Math.floor(x),
            y: Math.floor(y),
            timestamp: Date.now(),
        });

        // Limit history size
        if (this.#positionHistory.length > this.#maxHistorySize) {
            this.#positionHistory.shift();
        }
    }

    /**
     * Check if bot is looping (returning to same positions)
     */
    isLooping() {
        if (this.#positionHistory.length < 10) return false;

        // Compare recent positions with older positions
        const recentPositions = this.#positionHistory.slice(-5);
        const olderPositions = this.#positionHistory.slice(0, -5);

        let repeatCount = 0;

        for (const recent of recentPositions) {
            for (const older of olderPositions) {
                const dist = Math.sqrt(
                    Math.pow(recent.x - older.x, 2) +
                    Math.pow(recent.y - older.y, 2)
                );

                // If we were at this position before (within 10px radius)
                if (dist < 10) {
                    repeatCount++;
                    break;
                }
            }
        }

        // If more than threshold% of positions are repeats
        return (repeatCount / recentPositions.length) > this.#loopThreshold;
    }

    /**
     * Clear history
     */
    clear() {
        this.#positionHistory = [];
    }

    /**
     * Get current history size
     */
    getHistorySize() {
        return this.#positionHistory.length;
    }
}

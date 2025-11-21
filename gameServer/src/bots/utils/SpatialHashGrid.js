/**
 * Spatial Hash Grid for fast collision detection
 * Divides space into cells for O(1) lookups instead of O(n) iteration
 */
export class SpatialHashGrid {
    #cellSize;
    #grid;

    constructor(cellSize = 20) {
        this.#cellSize = cellSize;
        this.#grid = new Map();
    }

    /**
     * Convert world coordinates to grid cell key
     */
    #hashCoords(x, y) {
        const cellX = Math.floor(x / this.#cellSize);
        const cellY = Math.floor(y / this.#cellSize);
        return `${cellX},${cellY}`;
    }

    /**
     * Insert a point into the grid
     */
    insert(x, y, data = null) {
        const hash = this.#hashCoords(x, y);
        if (!this.#grid.has(hash)) {
            this.#grid.set(hash, []);
        }
        this.#grid.get(hash).push({ x, y, data });
    }

    /**
     * Get all points within radius of given position
     * Much faster than checking entire trail
     */
    getNearby(x, y, radius) {
        const nearby = [];
        const cellRadius = Math.ceil(radius / this.#cellSize);
        const centerCellX = Math.floor(x / this.#cellSize);
        const centerCellY = Math.floor(y / this.#cellSize);

        for (let dx = -cellRadius; dx <= cellRadius; dx++) {
            for (let dy = -cellRadius; dy <= cellRadius; dy++) {
                const hash = `${centerCellX + dx},${centerCellY + dy}`;
                if (this.#grid.has(hash)) {
                    nearby.push(...this.#grid.get(hash));
                }
            }
        }

        return nearby;
    }

    /**
     * Check if a point exists within radius
     */
    hasNearby(x, y, radius) {
        const nearby = this.getNearby(x, y, radius);
        for (const point of nearby) {
            const dist = Math.sqrt(
                Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2)
            );
            if (dist < radius) {
                return true;
            }
        }
        return false;
    }

    /**
     * Clear all data
     */
    clear() {
        this.#grid.clear();
    }

    /**
     * Get total number of points stored
     */
    size() {
        let count = 0;
        for (const cell of this.#grid.values()) {
            count += cell.length;
        }
        return count;
    }
}

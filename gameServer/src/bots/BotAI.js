import { Vec2 } from "renda";
import { SpatialHashGrid } from "./utils/SpatialHashGrid.js";
import { LoopDetector } from "./utils/LoopDetector.js";

const DIRECTIONS = ["up", "down", "left", "right"];

// Boundary zones
const FIELD_MARGIN = 20;           // Physical edge
const MIN_DISTANCE_FROM_EDGE = 30; // Planning buffer
const SAFE_ZONE_BUFFER = 50;       // Comfort zone
const COLLISION_RADIUS = 3;        // Collision detection radius

export class BotAI {
    #player;
    #game;
    #arena;

    // State
    #state = "expanding"; // expanding, returning, fleeing
    #targetPos = null;
    #lastDirection = null;
    #lastPos = null;
    #stuckCounter = 0;
    #expandSteps = 0; // How many steps we've taken while expanding
    #maxExpandSteps = 0; // Max steps before returning
    #stepsInCurrentDirection = 0; // Steps in current direction

    // Safety utilities
    #trailGrid = null;      // Spatial hash for fast collision detection
    #loopDetector = null;   // Detects stuck/looping behavior

    // Config
    #maxTrailLength = 6; // How far to go before returning (reduced for safety)
    #safetyDistance = 7; // Distance to keep from enemies when vulnerable

    constructor(player, game) {
        this.#player = player;
        this.#game = game;
        this.#arena = game.arena;
        this.#lastDirection = player.currentDirection;

        // Initialize safety utilities
        this.#trailGrid = new SpatialHashGrid(20);
        this.#loopDetector = new LoopDetector(20, 0.3);
    }

    update(now) {
        if (!this.#player || this.#player.dead) return "paused";

        const pos = this.#player.getPosition();

        // Add position to loop detector
        this.#loopDetector.addPosition(pos.x, pos.y);

        // Check for looping behavior
        if (this.#loopDetector.isLooping()) {
            // Bot is stuck in a loop - reset and try different approach
            this.#state = "returning";
            this.#loopDetector.clear();
            this.#stuckCounter = 0;
        }

        // Detect if we are stuck
        if (this.#lastPos && pos.x === this.#lastPos.x && pos.y === this.#lastPos.y) {
            this.#stuckCounter++;
        } else {
            this.#stuckCounter = 0;
            this.#lastPos = pos.clone();
        }

        // If stuck, pick random valid direction
        if (this.#stuckCounter > 5) {
            this.#stuckCounter = 0;
            return this.#pickRandomValidDirection(pos);
        }

        // 1. Analyze situation
        const myTileValue = this.#getTileValue(pos);
        const isSafe = myTileValue === this.#player.id;
        const trailLength = this.#getTrailLength();
        const threat = this.#detectThreats(pos);

        // 2. Determine State
        if (threat) {
            this.#state = "fleeing";
        } else if (!isSafe && trailLength > this.#maxTrailLength) {
            this.#state = "returning";
        } else if (isSafe) {
            this.#state = "expanding";
            // Reset when we return to base
            this.#expandSteps = 0;
            this.#maxExpandSteps = 3 + Math.floor(Math.random() * 3); // 3-5 steps

            // Clear trail grid when we return to safety
            this.#trailGrid.clear();
            this.#loopDetector.clear();
        }

        // 3. Execute State
        let desiredDirection = this.#lastDirection;

        switch (this.#state) {
            case "fleeing":
                desiredDirection = this.#calculateFleeDirection(pos, threat);
                break;
            case "returning":
                desiredDirection = this.#calculateReturnDirection(pos);
                break;
            case "expanding":
                desiredDirection = this.#calculateExpandDirection(pos);
                break;
        }

        // 4. Safety Override (Avoid immediate death)
        desiredDirection = this.#ensureSafety(pos, desiredDirection);

        // Track movement when expanding
        if (this.#state === "expanding" && !isSafe) {
            // Sync spatial grid with actual trail from player
            this.#syncTrailGrid();

            // Only increment when we actually moved to a new position
            if (!this.#lastPos || pos.x !== this.#lastPos.x || pos.y !== this.#lastPos.y) {
                this.#expandSteps++;

                // Track steps in current direction
                if (desiredDirection === this.#lastDirection) {
                    this.#stepsInCurrentDirection++;
                } else {
                    this.#stepsInCurrentDirection = 1;
                }
            }
        } else {
            this.#stepsInCurrentDirection = 0;
        }

        this.#lastDirection = desiredDirection;
        return desiredDirection;
    }

    #getTileValue(pos) {
        try {
            return this.#arena.getTileValue(pos);
        } catch (e) {
            return -1; // Out of bounds
        }
    }

    #getTrailLength() {
        // Approximate trail length based on vertices
        let length = 0;
        const vertices = Array.from(this.#player.getTrailVertices());
        if (vertices.length === 0) return 0;

        let last = vertices[0];
        for (let i = 1; i < vertices.length; i++) {
            length += last.distanceTo(vertices[i]);
            last = vertices[i];
        }
        length += last.distanceTo(this.#player.getPosition());
        return length;
    }

    #detectThreats(pos) {
        // Simple threat detection: is any enemy close to me or my trail?
        // We can use game.getOverlappingViewportPlayersForPos but that might be too broad.
        // Let's iterate over all players for now (training mode has few players).
        // In a real game we'd optimize this.

        // Accessing private #players map is not possible directly, but Game has getOverlappingViewportPlayersForRect
        // We can check players in our viewport.

        const viewportPlayers = Array.from(this.#game.getOverlappingViewportPlayersForRect(this.#player.getUpdatesViewport()));

        for (const other of viewportPlayers) {
            if (other === this.#player || other.dead || other.isSpectator) continue;

            const otherPos = other.getPosition();
            const dist = pos.distanceTo(otherPos);

            // If enemy is close and I am not safe (have a trail), it's a threat
            if (dist < this.#safetyDistance && this.#getTileValue(pos) !== this.#player.id) {
                return otherPos;
            }

            // Also check if they are close to my trail
            // This is expensive to check perfectly, so we'll just check if they are close to me for now
            // as a proxy for "close to my vulnerable parts"
        }

        return null;
    }

    #calculateFleeDirection(pos, threatPos) {
        // Move away from threat, but towards safety (my territory)
        // Find nearest safe tile
        const safeDir = this.#findNearestSafeDirection(pos);
        if (safeDir) return safeDir;

        // If can't find safe tile, just move away from threat
        const diff = pos.clone().sub(threatPos);
        if (Math.abs(diff.x) > Math.abs(diff.y)) {
            return diff.x > 0 ? "right" : "left";
        } else {
            return diff.y > 0 ? "down" : "up";
        }
    }

    #calculateReturnDirection(pos) {
        // BFS to find nearest own tile
        return this.#findNearestSafeDirection(pos) || this.#lastDirection;
    }

    #calculateExpandDirection(pos) {
        // Simple strategy: go straight for a few steps, then turn
        // This creates clean rectangular captures

        const myTileValue = this.#getTileValue(pos);
        const isSafe = myTileValue === this.#player.id;

        // If we're on our territory, pick a direction to start
        if (isSafe) {
            // Choose a random direction that's safe
            const directions = ["up", "down", "left", "right"];
            const validDirs = directions.filter(dir => this.#isSafeMove(pos, dir));
            if (validDirs.length > 0) {
                const chosenDir = validDirs[Math.floor(Math.random() * validDirs.length)];
                this.#stepsInCurrentDirection = 0;
                return chosenDir;
            }
            return this.#lastDirection || "right";
        }

        // If we've gone far enough, start returning
        if (this.#expandSteps >= this.#maxExpandSteps) {
            this.#state = "returning";
            return this.#calculateReturnDirection(pos);
        }

        // CRITICAL: Don't turn too early! Must go at least 2 steps in one direction
        // This prevents tight loops that cause self-collision
        const MIN_STEPS_BEFORE_TURN = 2;

        // If we haven't gone far enough in current direction, keep going
        if (this.#stepsInCurrentDirection < MIN_STEPS_BEFORE_TURN && this.#lastDirection) {
            if (this.#isSafeMove(pos, this.#lastDirection)) {
                return this.#lastDirection;
            }
            // If we can't continue but haven't gone far enough, we're in trouble
            // Return to base immediately
            this.#state = "returning";
            return this.#calculateReturnDirection(pos);
        }

        // Otherwise, keep going in the same direction if possible
        // This creates straight lines which are safer
        if (this.#lastDirection && this.#isSafeMove(pos, this.#lastDirection)) {
            return this.#lastDirection;
        }

        // If we can't continue, try to turn (prefer perpendicular directions)
        const perpDirs = this.#getPerpendicularDirections(this.#lastDirection);
        for (const dir of perpDirs) {
            if (this.#isSafeMove(pos, dir)) {
                this.#stepsInCurrentDirection = 0;
                return dir;
            }
        }

        // Last resort: any safe direction
        const allDirs = ["up", "down", "left", "right"];
        for (const dir of allDirs) {
            if (this.#isSafeMove(pos, dir)) {
                this.#stepsInCurrentDirection = 0;
                return dir;
            }
        }

        // If no safe direction, return to base
        this.#state = "returning";
        return this.#calculateReturnDirection(pos);
    }

    #getPerpendicularDirections(dir) {
        if (dir === "up" || dir === "down") return ["left", "right"];
        if (dir === "left" || dir === "right") return ["up", "down"];
        return ["up", "down", "left", "right"];
    }

    #findNearestSafeDirection(pos) {
        // Simple look-ahead
        const neighbors = [
            { dir: "up", pos: pos.clone().add(new Vec2(0, -1)) },
            { dir: "down", pos: pos.clone().add(new Vec2(0, 1)) },
            { dir: "left", pos: pos.clone().add(new Vec2(-1, 0)) },
            { dir: "right", pos: pos.clone().add(new Vec2(1, 0)) },
        ];

        // Sort by distance to nearest owned tile? 
        // That's expensive. Let's just check immediate neighbors for now.
        // Or better: move towards center of map if lost?
        // Let's try to move towards the nearest tile with my ID.
        // Since we don't have an easy way to query "nearest tile of type X", 
        // we might need to rely on remembering where we came from or just random walk until safe.

        // Improved strategy: Move towards the center of the arena if we are lost, 
        // but usually we just want to close the loop.
        // Any move that doesn't kill us is better than nothing.

        // For "Returning", we want to close the loop. 
        // A simple heuristic is to move towards the weighted center of our owned tiles? No, too expensive.
        // Let's just move towards the spawn point? Or just random valid moves that are NOT away from base.

        // Let's implement a simple BFS for "nearest safe tile" with limited depth
        const visited = new Set();
        const queue = [{ pos: pos, firstDir: null, dist: 0 }];
        visited.add(`${pos.x},${pos.y}`);

        let bestDir = null;

        // Limit BFS
        let iterations = 0;
        while (queue.length > 0 && iterations < 50) {
            const current = queue.shift();
            iterations++;

            if (this.#getTileValue(current.pos) === this.#player.id) {
                return current.firstDir;
            }

            for (const dir of DIRECTIONS) {
                // Don't reverse
                if (this.#isReverse(current.firstDir || this.#lastDirection, dir)) continue;

                const nextPos = this.#getNextPos(current.pos, dir);
                const key = `${nextPos.x},${nextPos.y}`;

                if (!visited.has(key) && this.#isValidPos(nextPos)) {
                    visited.add(key);
                    queue.push({
                        pos: nextPos,
                        firstDir: current.firstDir || dir,
                        dist: current.dist + 1
                    });
                }
            }
        }

        return null;
    }

    #ensureSafety(pos, desiredDir) {
        // Check if desiredDir leads to death
        if (this.#isSafeMove(pos, desiredDir)) {
            return desiredDir;
        }

        // If not, try other directions
        const alternatives = DIRECTIONS.filter(d => d !== desiredDir && !this.#isReverse(this.#lastDirection, d));
        for (const alt of alternatives) {
            if (this.#isSafeMove(pos, alt)) {
                return alt;
            }
        }

        // If all else fails, keep going (and die) or try reverse (which is invalid but handled by game)
        return desiredDir;
    }

    #isSafeMove(pos, dir) {
        const nextPos = this.#getNextPos(pos, dir);

        // 1. Check bounds with safety margin
        if (!this.#isWithinSafeBounds(nextPos)) return false;

        // 2. Check self-collision using spatial hash (MUCH faster than iterating trail)
        if (this.#checkSelfCollision(nextPos.x, nextPos.y)) return false;

        return true;
    }

    /**
     * Check if position is within safe bounds (with margins)
     */
    #isWithinSafeBounds(pos) {
        return (
            pos.x >= FIELD_MARGIN &&
            pos.x <= this.#arena.width - FIELD_MARGIN &&
            pos.y >= FIELD_MARGIN &&
            pos.y <= this.#arena.height - FIELD_MARGIN
        );
    }

    /**
     * Fast collision detection using spatial hash grid
     * O(1) instead of O(n) trail iteration
     */
    #checkSelfCollision(x, y) {
        // First, check against actual trail vertices for accuracy
        const vertices = Array.from(this.#player.getTrailVertices());

        // Check exact vertex matches
        for (const vertex of vertices) {
            const dist = Math.sqrt(
                Math.pow(x - vertex.x, 2) +
                Math.pow(y - vertex.y, 2)
            );
            if (dist < COLLISION_RADIUS) {
                return true;
            }
        }

        // Check line segments
        if (vertices.length > 1) {
            for (let i = 0; i < vertices.length - 1; i++) {
                const p1 = vertices[i];
                const p2 = vertices[i + 1];

                // Distance from point to line segment
                const distToSegment = this.#distanceToSegment(x, y, p1.x, p1.y, p2.x, p2.y);
                if (distToSegment < COLLISION_RADIUS) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Sync spatial grid with actual player trail
     */
    #syncTrailGrid() {
        // Clear and rebuild from actual trail
        this.#trailGrid.clear();

        const vertices = Array.from(this.#player.getTrailVertices());
        for (const vertex of vertices) {
            this.#trailGrid.insert(vertex.x, vertex.y, { timestamp: Date.now() });
        }
    }

    /**
     * Calculate distance from point to line segment
     */
    #distanceToSegment(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lengthSquared = dx * dx + dy * dy;

        if (lengthSquared === 0) {
            // Segment is a point
            return Math.sqrt(Math.pow(px - x1, 2) + Math.pow(py - y1, 2));
        }

        // Project point onto line
        let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
        t = Math.max(0, Math.min(1, t)); // Clamp to segment

        const projX = x1 + t * dx;
        const projY = y1 + t * dy;

        return Math.sqrt(Math.pow(px - projX, 2) + Math.pow(py - projY, 2));
    }

    #getNextPos(pos, dir) {
        const p = pos.clone();
        if (dir === "up") p.y--;
        if (dir === "down") p.y++;
        if (dir === "left") p.x--;
        if (dir === "right") p.x++;
        return p;
    }

    #isValidPos(pos) {
        // Check map boundaries. 
        // Note: getTileValue returns -1 for out of bounds, but we should also check coordinates.
        // Arena walls are usually at the edges.
        if (pos.x < 0 || pos.x >= this.#arena.width || pos.y < 0 || pos.y >= this.#arena.height) {
            return false;
        }
        // Also check if the tile is a wall (if map has walls inside)
        if (this.#getTileValue(pos) === -1) {
            return false;
        }
        return true;
    }

    #isReverse(dir1, dir2) {
        if (!dir1 || !dir2) return false;
        if (dir1 === "up" && dir2 === "down") return true;
        if (dir1 === "down" && dir2 === "up") return true;
        if (dir1 === "left" && dir2 === "right") return true;
        if (dir1 === "right" && dir2 === "left") return true;
        return false;
    }

    #pickRandomValidDirection(pos) {
        const valid = DIRECTIONS.filter(d => !this.#isReverse(this.#lastDirection, d) && this.#isValidPos(this.#getNextPos(pos, d)));
        if (valid.length === 0) return "up"; // Should not happen
        return valid[Math.floor(Math.random() * valid.length)];
    }
}

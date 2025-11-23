/**
 * Sends game session results to the webapp backend
 * @param {object} sessionData
 * @param {number|null} sessionData.userTelegramId
 * @param {string} sessionData.gameMode - '1v1', '1v1v1v1', or 'training'
 * @param {boolean} sessionData.isWinner
 * @param {number} sessionData.kills
 * @param {number} sessionData.maxTiles
 * @param {number} sessionData.timeAliveSeconds
 * @param {string} sessionData.startedAt - ISO timestamp
 * @param {string} sessionData.endedAt - ISO timestamp
 */
export async function reportSessionToBackend(sessionData) {
    // Don't report training sessions or sessions without telegram ID
    if (sessionData.gameMode === "training" || !sessionData.userTelegramId) {
        return;
    }

    try {
        const response = await fetch("http://localhost:8787/api/game/report-session", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(sessionData),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Failed to report session to backend: ${response.status} ${errorText}`);
        } else {
            console.log(`Session reported successfully for user ${sessionData.userTelegramId}`);
        }
    } catch (error) {
        console.error("Error reporting session to backend:", error);
    }
}

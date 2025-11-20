import { TrainingMain } from "./TrainingMain.js";

/**
 * @param {ConstructorParameters<typeof TrainingMain>} args
 */
export function init(...args) {
	return new TrainingMain(...args);
}


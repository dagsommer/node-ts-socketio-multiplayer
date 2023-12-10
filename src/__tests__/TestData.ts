import { GameState } from "../types";

export interface TestGameDetails {
	gameId: string;
	iteration: number;
	state: GameState;
}

export interface TestGameAccessDetails {
	gameId: string;
	token: string;
}

export interface TestPlayerDetails {
	playerId: string;
}

export interface TestGameEvent {
	gameId: string;
	iteration: number;
}

export const sampleTestToken: string = "testToken";

export const sampleTestGameDetails: TestGameDetails = {
	gameId: "testGame",
	iteration: 1,
	state: "waitingForPlayers",
};

export const sampleTestPlayerDetails: TestPlayerDetails = {
	playerId: "testPlayer",
};

export const sampleTestGameAccessDetails: TestGameAccessDetails = {
	gameId: "testGame",
	token: sampleTestToken,
};

export const sampleTestGameEvent: TestGameEvent = {
	gameId: "testGame",
	iteration: 1,
};
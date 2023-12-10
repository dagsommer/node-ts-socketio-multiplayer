export type GameState = "waitingForPlayers" | "inProgress" | "finished";

export interface MinimumGameDetails {
	gameId: string;
	iteration: number;
	state: GameState;
}

export interface MinimumGameAccessDetails<TokenType> {
	gameId: string;
	token: TokenType;
}

export interface MinimumPlayerDetails {
	playerId: string;
}

export interface MinimumGameEvent {
	gameId: string;
	iteration: number;
}

export enum GameAction {
	Create,
	Join,
	Start,
	Move,
	EmitEvent,
	Finish,
	Leave,
}

export type EventHandler = (...args: any) => Promise<void>;

export interface EventHandlers {
	[key: string]: EventHandler;
}
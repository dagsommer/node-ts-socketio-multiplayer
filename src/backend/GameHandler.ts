import { Server, Socket } from "socket.io";

import http from "http";

import {
	MinimumGameDetails,
	MinimumPlayerDetails,
	MinimumGameEvent,
	MinimumGameAccessDetails,
	GameAction,
	EventHandler,
	EventHandlers,
} from "../types";

export class GameHandler<
	GameDetailsType extends MinimumGameDetails,
	PlayerType extends MinimumPlayerDetails,
	GameEvent extends MinimumGameEvent,
	TokenType,
	GameAccessDetailsType extends MinimumGameAccessDetails<TokenType>
> {
	constructor(
		httpServer: http.Server,
		validateToken: (
			token: TokenType,
			gameId: string,
			action: GameAction
		) => Promise<boolean>
	) {
		this.#io = new Server(httpServer);
		this.#validateToken = validateToken;
		this.#io.on("connection", (socket) => {
			this._mostRecentSocket = socket;
			socket.onAny((event, ...args) => {
				this.handler(socket, event, ...args);
			});
		});
	}

	#handlers: EventHandlers = {};
	#io: Server;
	#validateToken: (
		token: TokenType,
		gameId: string,
		action: GameAction
	) => Promise<boolean>;
	_mostRecentSocket: Socket | null = null; // This is used for testing purposes only.

	private handler = (socket: Socket, event: string, ...args: any[]) => {
		if (this.#handlers[event]) {
			this.#handlers[event](socket, ...args).catch((error) => {
				console.error(`Error in handler for ${event}: ${error}`);
				socket.emit("error", error.message || error);
			});
		} else {
			socket.emit("error", "Invalid event");
		}
	};

	public setValidateToken = (
		validateToken: (
			token: TokenType,
			gameId: string,
			action: GameAction
		) => Promise<boolean>
	) => {
		this.#validateToken = validateToken;
	};

	private on = (event: string, handler: EventHandler) => {
		this.#handlers[event] = handler;
	};

	public close = () => {
		this.#io.close();
	};

	public _resetHandlers = () => {
		this.#handlers = {};
	};

	public onCreateGame = (
		handler: (
			game: GameDetailsType,
			player: PlayerType,
			token: TokenType
		) => Promise<void>
	) => {
		this.on("game:create", async (socket, ...args) => {
			const [gameDetails, playerDetails, token] = args;
			const game = gameDetails as GameDetailsType;
			const player = playerDetails as PlayerType;
			const isValid = await this.#validateToken(
				token,
				game?.gameId,
				GameAction.Create
			);
			if (isValid) {
				if (!game?.gameId) {
					throw new Error("Game must have an id");
				}

				if (!game?.iteration) {
					throw new Error("Game must have an iteration");
				}

				if (!game?.state) {
					throw new Error("Game must have a state");
				}

				if (
					!["waitingForPlayers", "inProgress", "finished"].includes(game?.state)
				) {
					throw new Error(
						"Game state must be one of waitingForPlayers, inProgress, or finished"
					);
				}

				if (!playerDetails?.playerId) {
					throw new Error("Player must have an id");
				}

				const room = this.#io.sockets.adapter.rooms.get(game.gameId);
				if (room && room.size >= 1) {
					throw new Error(`Game with id ${game.gameId} already exists`);
				}

				try {
					await handler(game, player, token);
				} catch (error) {
					throw new Error("Error while handling event");
				}
				socket.join(game.gameId);
				socket.emit("game:created", game);
				this.#io.to(game.gameId).emit("game:joined", player);
			} else {
				throw new Error("Invalid token");
			}
		});
	};

	public onJoinGame = (
		handler: (
			gameAccess: GameAccessDetailsType,
			player: PlayerType
		) => Promise<void>
	) => {
		this.on("game:join", async (socket, ...args) => {
			const [gameAccessDetails, playerDetails] = args;
			const gameAccess = gameAccessDetails as GameAccessDetailsType;
			const player = playerDetails as PlayerType;
			const isValid = await this.#validateToken(
				gameAccess.token,
				gameAccess.gameId,
				GameAction.Join
			);
			if (isValid) {
				if (!gameAccess?.gameId) {
					throw new Error("Game must have an id");
				}

				if (!player?.playerId) {
					throw new Error("Player must have an id");
				}

				try {
					await handler(gameAccess, player);
				} catch (error) {
					throw new Error("Error while handling event");
				}
				socket.join(gameAccess.gameId);
				socket.emit("game:joined", gameAccess.gameId);
				this.#io.to(gameAccess.gameId).emit("game:joined", player);
			} else {
				throw new Error("Invalid token");
			}
		});
	};

	public onStartGame = (
		handler: (gameAccess: GameAccessDetailsType) => Promise<void>
	) => {
		this.on("game:start", async (socket, ...args) => {
			const [gameAccessDetails] = args;
			const gameAccess = gameAccessDetails as GameAccessDetailsType;
			const isValid = await this.#validateToken(
				gameAccess.token,
				gameAccess.gameId,
				GameAction.Start
			);
			if (isValid) {
				if (!gameAccess?.gameId) {
					throw new Error("Game must have an id");
				}

				try {
					await handler(gameAccess);
				} catch (error) {
					throw new Error("Error while handling event");
				}
				socket.emit("game:started", gameAccess.gameId);
				this.#io.to(gameAccess.gameId).emit("game:started", gameAccess.gameId);
			} else {
				throw new Error("Invalid token");
			}
		});
	};

	public onFinishGame = (
		handler: (gameAccess: GameAccessDetailsType) => Promise<void>
	) => {
		this.on("game:finish", async (socket, ...args) => {
			const [gameAccessDetails] = args;
			const gameAccess = gameAccessDetails as GameAccessDetailsType;
			const isValid = await this.#validateToken(
				gameAccess.token,
				gameAccess.gameId,
				GameAction.Finish
			);
			if (isValid) {
				if (!gameAccess?.gameId) {
					throw new Error("Game must have an id");
				}

				try {
					await handler(gameAccess);
				} catch (error) {
					throw new Error("Error while handling event");
				}
				socket.emit("game:finished", gameAccess.gameId);
				this.#io.to(gameAccess.gameId).emit("game:finished", gameAccess.gameId);
			} else {
				throw new Error("Invalid token");
			}
		});
	};

	public onEmitGameEvent = (
		handler: (gameEvent: GameEvent, player: PlayerType) => Promise<void>
	) => {
		this.on("game:event", async (socket, ...args) => {
			const [gameAccessDetails, gameEventObj, playerObj] = args;
			const gameEvent = gameEventObj as GameEvent;
			const gameAccess = gameAccessDetails as GameAccessDetailsType;
			const player = playerObj as PlayerType;

			const isValid = await this.#validateToken(
				gameAccess.token,
				gameAccess.gameId,
				GameAction.EmitEvent
			);
			if (isValid) {
				if (!gameAccess?.gameId) {
					throw new Error("Game must have an id");
				}

				if (!gameEvent?.iteration) {
					throw new Error("Game event must have an iteration");
				}

				if (!player?.playerId) {
					throw new Error("Player must have an id");
				}

				try {
					await handler(gameEvent, player);
				} catch (error) {
					throw new Error("Error while handling event");
				}
				this.#io.to(gameAccess.gameId).emit("game:event", gameEvent);
			} else {
				throw new Error("Invalid token");
			}
		});
	};

	public onLeaveGame = (
		handler: (
			gameAccess: GameAccessDetailsType,
			player: PlayerType
		) => Promise<void>
	) => {
		this.on("game:leave", async (socket, ...args) => {
			const [gameAccessDetails, playerDetails] = args;
			const gameAccess = gameAccessDetails as GameAccessDetailsType;
			const player = playerDetails as PlayerType;
			const isValid = await this.#validateToken(
				gameAccess.token,
				gameAccess.gameId,
				GameAction.Leave
			);
			if (isValid) {
				if (!gameAccess?.gameId) {
					throw new Error("Game must have an id");
				}
				if (!player?.playerId) {
					throw new Error("Player must have an id");
				}
				try {
					await handler(gameAccess, player);
				} catch (error) {
					throw new Error("Error while handling event");
				}
				socket.emit("game:left", player);
			} else {
				throw new Error("Invalid token");
			}
		});
	};

	public emitEvent = async (gameEvent: GameEvent) => {
		const { gameId } = gameEvent;

		if (!gameId) {
			throw new Error("Game event must have a game id");
		}

		this.#io.to(gameId).emit("game:event", gameEvent);
	};
}

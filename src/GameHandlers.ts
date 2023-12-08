import { Server, Socket } from "socket.io";

import http from "http";

export type GameState = "waitingForPlayers" | "inProgress" | "finished";

interface MinimumGameDetails {
	gameId: string;
	iteration: number;
	state: GameState;
}

interface MinimumGameAccessDetails<TokenType> {
	gameId: string;
	token: TokenType;
}

interface MinimumPlayerDetails {
	playerId: string;
}

interface MinimumGameEvent {
	iteration: number;
}

enum GameAction {
	Create,
	Join,
	Start,
	Move,
	EmitEvent,
	Finish,
	Leave,
}

//it should take a generic type which is the game details.
// the generic must have an id, and a function to validate a token.
//it should take a generic type which is the user details.
//it should create handlers for socket.io events.
//  for game:create it should call a method it is given in the constructor.
//   then it should emit a game:created event to the room, which is the game id, and add the user to the socket.io room, which is the game id.
//  for game:join it should call a method it is given in the constructor.
//   then it should
//   1) add the user to the socket.io room, which is the game id.
//   2) emit a game:joined event to the room, which is the game id.
//  for game:start it should call a method it is given in the constructor.
//   then it should emit a game:started event to the room, which is the game id.
//  for game:event it should call a method it is given in the constructor.
//   then it should emit a game:event event to the room, which is the game id.
//  for game:finish it should call a method it is given in the constructor.
//   then it should emit a game:finished event to the room, which is the game id.
//   and it should remove the room from the socket.io room, which is the game id.
//  for game:leave it should call a method it is given in the constructor.
//   then it should emit a game:left event to the room, which is the game id.
//   and it should remove the user from the socket.io room, which is the game id.

// write a constructor that takes the following arguments:
// 1) a socket.io server
// 2) a function that creates a game
// 3) a function that joins a game
// 4) a function that starts a game
// 5) a function that emits a game event
// 6) a function that finishes a game
// 7) a function that leaves a game
// 8) a function that validates a token
// 9) a function that gets the game state
// 10) a function that sets the game state

interface GameHandlerInterface<
	GameDetailsType extends MinimumGameDetails,
	PlayerType extends MinimumPlayerDetails,
	GameEvent extends MinimumGameEvent,
	TokenType,
	GameAccessDetailsType extends MinimumGameAccessDetails<TokenType>
> {
	httpServer: http.Server;
	createGame: (
		game: GameDetailsType,
		player: PlayerType,
		token: TokenType
	) => Promise<void>;
	joinGame: (
		gameAccess: GameAccessDetailsType,
		player: PlayerType
	) => Promise<void>;
	startGame: (gameAccess: GameAccessDetailsType) => Promise<void>;
	emitGameEvent: (gameEvent: GameEvent) => Promise<void>;
	finishGame: (gameAccess: GameAccessDetailsType) => Promise<void>;
	leaveGame: (gameAccess: GameAccessDetailsType) => Promise<void>;
	validateToken: (token: TokenType, action: GameAction) => Promise<boolean>;
	getGameState: (gameId: string) => Promise<GameDetailsType>;
	setGameState: (state: GameDetailsType) => Promise<void>;
}

type EventHandler = (...args: any) => Promise<void>;

interface EventHandlers {
	[key: string]: EventHandler;
}

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
			socket.emit("error", "Invalid event", "Invalid event");
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
				game.gameId,
				GameAction.Create
			);
			if (isValid) {
				if (!game.gameId) {
					throw new Error("Game must have an id");
				}

				if (!game.iteration) {
					throw new Error("Game must have an iteration");
				}

				if (!game.state) {
					throw new Error("Game must have a state");
				}

				if (
					!["waitingForPlayers", "inProgress", "finished"].includes(game.state)
				) {
					throw new Error(
						"Game state must be one of waitingForPlayers, inProgress, or finished"
					);
				}

				if (!playerDetails.playerId) {
					throw new Error("Player must have an id");
				}
				await handler(game, player, token);
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
				if (!gameAccess.gameId) {
					throw new Error("Game must have an id");
				}

				if (!gameAccess.token) {
					throw new Error("Game must have a token");
				}

				if (!playerDetails.playerId) {
					throw new Error("Player must have an id");
				}

				await handler(gameAccess, player);
				socket.join(gameAccess.gameId);
				socket.emit("game:joined", gameAccess);
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
				if (!gameAccess.gameId) {
					throw new Error("Game must have an id");
				}

				if (!gameAccess.token) {
					throw new Error("Game must have a token");
				}

				await handler(gameAccess);
				socket.emit("game:started", gameAccess);
				this.#io.to(gameAccess.gameId).emit("game:started", gameAccess);
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
                if (!gameAccess.gameId) {
                    throw new Error("Game must have an id");
                }

                if (!gameAccess.token) {
                    throw new Error("Game must have a token");
                }

                await handler(gameAccess);
                socket.emit("game:finished", gameAccess);
                this.#io.to(gameAccess.gameId).emit("game:finished", gameAccess);
            } else {
                throw new Error("Invalid token");
            }
        });
    }

    public onEmitGameEvent = (
        handler: (gameEvent: GameEvent) => Promise<void>
    ) => {
        this.on("game:event", async (socket, ...args) => {
            const [gameAccessDetails, gameEventObj] = args;
            const gameEvent = gameEventObj as GameEvent;
            const gameAccess = gameAccessDetails as GameAccessDetailsType;

            const isValid = await this.#validateToken(
                gameAccess.token,
                gameAccess.gameId,
                GameAction.EmitEvent
            );
            if (isValid) {
                if (!gameAccess.gameId) {
                    throw new Error("Game must have an id");
                }

                if (!gameAccess.token) {
                    throw new Error("Game must have a token");
                }

                await handler(gameEvent);
                socket.emit("game:event", gameEvent);
                this.#io.to(gameAccess.gameId).emit("game:event", gameEvent);
            } else {
                throw new Error("Invalid token");
            }
        });
    }
}
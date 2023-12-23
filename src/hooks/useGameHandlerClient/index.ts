import { useEffect, useRef, useState } from "react";
import { Socket, io } from "socket.io-client";
import {
	GameState,
	MinimumGameAccessDetails,
	MinimumGameDetails,
	MinimumGameEvent,
	MinimumPlayerDetails,
} from "../../types";

type GameHandlerClientHook = <
	GameDetailsType extends MinimumGameDetails,
	PlayerType extends MinimumPlayerDetails,
	GameEvent extends MinimumGameEvent,
	TokenType,
	GameAccessDetailsType extends MinimumGameAccessDetails<TokenType>
>() => {
	connect: (serverUrl: string) => { newSocket: Socket };
	disconnect: () => void;
	currentGameId: string | null;
	currentPlayer: PlayerType | null;
	currentGameState: GameState;
	isHost: boolean;
	createGame: (
		gameDetails: GameDetailsType,
		playerDetails: PlayerType,
		token: TokenType
	) => void;
	onGameCreated: (callback: (game: GameDetailsType) => void) => void;
	joinGame: (
		gameAccessDetails: GameAccessDetailsType,
		player: PlayerType
	) => void;
	onGameJoined: (callback: (gameId: string) => void) => void;
	leaveGame: (gameAccessDetails: GameAccessDetailsType) => void;
	emitGameEvent: (
		gameAccessDetails: GameAccessDetailsType,
		event: GameEvent
	) => void;
	onGameEvent: (callback: (event: GameEvent) => void) => void;
	startGame: (gameAccessDetails: GameAccessDetailsType) => void;
	isConnected: boolean;
	onGameError: (callback: (error: string) => void) => void;
};

export const useGameHandlerClient: GameHandlerClientHook = <
	GameDetailsType extends MinimumGameDetails,
	PlayerType extends MinimumPlayerDetails,
	GameEvent extends MinimumGameEvent,
	TokenType,
	GameAccessDetailsType extends MinimumGameAccessDetails<TokenType>
>() => {
	const [socket, setSocket] = useState<Socket | null>(null);
	const [gameId, setGameId] = useState<string | null>(null);
	const [player, setPlayer] = useState<PlayerType | null>(null);
	const [isHost, setIsHost] = useState<boolean>(false);
	const [gameState, setGameState] = useState<GameState>("waitingForPlayers");
	const gameIdRef = useRef<string | null>(null);
	const socketRef = useRef<Socket | null>(null);

	// Update the ref whenever gameId state changes
	useEffect(() => {
		gameIdRef.current = gameId;
	}, [gameId]);

	// Update the ref whenever socket state changes
	useEffect(() => {
		socketRef.current = socket;
	}, [socket]);

	const getSocket = () => {
		if (!socketRef.current) {
			throw new Error("Socket is non-existent");
		}
		return socketRef.current;
	};

	const connect = (serverUrl: string) => {
		//check if serverUrl is valid
		if (!serverUrl) {
			throw new Error("Invalid server url");
		}

		const newSocket = io(serverUrl);

		//Set internal handlers
		newSocket.on("game:started", _onGameStarted);
		newSocket.on("game:finished", _onGameFinished);

		setSocket(newSocket);
		return { newSocket };
	};

	const disconnect = () => {
		if (socket) {
			socket.disconnect();
			setSocket(null);
		}
	};

	const createGame = (
		gameDetails: GameDetailsType,
		playerDetails: PlayerType,
		token: TokenType
	) => {
		setPlayer(playerDetails);
		setIsHost(true);
		getSocket().emit("game:create", gameDetails, playerDetails, token);
	};

	const onGameCreated = (callback: (game: GameDetailsType) => void) => {
		socket!.on("game:created", (game) => {
			setGameId(game.gameId);
			callback(game);
		});
	};

	const joinGame = (
		gameAccessDetails: GameAccessDetailsType,
		player: PlayerType
	) => {
		setPlayer(player);

		setIsHost(false);
		setGameState("waitingForPlayers");
		getSocket().emit("game:join", gameAccessDetails, player);
	};

	const onGameJoined = (callback: (gameId: string) => void) => {
		const eventHandler = (gameId: string) => {
			console.log("setting game id to " + gameId)
			setGameId(gameId);
			callback(gameId);
		};
		getSocket().removeAllListeners("game:joined");
		getSocket().on("game:joined", eventHandler);
	};

	const leaveGame = (gameAccessDetails: GameAccessDetailsType) => {
		if (
			!gameAccessDetails ||
			!gameAccessDetails.gameId ||
			!gameAccessDetails.token
		) {
			throw new Error("Invalid game access details");
		}
		if (!player) {
			throw new Error("Invalid player or game");
		}
		getSocket().emit("game:leave", gameAccessDetails, player);
		setGameId(null);
		setPlayer(null);
	};

	const emitGameEvent = (
		gameAccessDetails: GameAccessDetailsType,
		event: GameEvent
	) => {
		if (!gameIdRef.current) {
			throw new Error("Invalid game id");
		}
		if (!player) {
			throw new Error("Invalid player or game");
		}
		getSocket().emit("game:event", gameAccessDetails, event, player);
	};

	const onGameEvent = (callback: (event: GameEvent) => void) => {
		if (!callback) {
			throw new Error("Invalid callback");
		}
		const eventHandler = (event: GameEvent) => {
			callback(event);
		};
		getSocket().removeAllListeners("game:event");
		getSocket().on("game:event", eventHandler);
	};

	const startGame = (gameAccessDetails: GameAccessDetailsType) => {
		if (
			!gameAccessDetails ||
			!gameAccessDetails.gameId ||
			!gameAccessDetails.token
		) {
			throw new Error("Invalid game access details");
		}
		if (!player) {
			throw new Error("Invalid player or game");
		}
		if (!isHost) {
			throw new Error("Only the host can start the game");
		}
		getSocket().emit("game:start", gameAccessDetails);
	};

	const _onGameStarted = (_gameId: string) => {
		if (_gameId !== gameIdRef.current) {
			return;
		}
		setGameState("inProgress");
	};

	const _onGameFinished = (_gameId: string) => {
		if (_gameId !== gameIdRef.current) {
			return;
		}
		setGameState("finished");
	};

	const isConnected = socket?.connected ?? false;

	/*
	
	describe("Receiving errors", () => {
		it("should be able to set a handler for game:error events", async () => {
			const { result } = renderHook(() => useGameHandlerClient());
			expect(result.current.onGameError).toBeDefined();
		});

		it("should receive a game:error event when a game error occurs", async () => {
			const { result } = renderHook(() => useGameHandlerClient());
			act(() => {
				result.current.connect(serverUrl);
			});
			const socket = (await waitFor(io, "connection")) as ServerSocket;
			const gameErrorHandler = vi.fn();
			act(() => {
				result.current.onGameError(gameErrorHandler);
			});

			socket.emit("game:error", "test error");

			// Small delay to allow the event to be handled
			await act(() => sleep(100));

			expect(gameErrorHandler).toHaveBeenCalledWith("test error");
		});

	});
	
	*/

	const onGameError = (callback: (error: string) => void) => {
		if (!callback) {
			throw new Error("Invalid callback");
		}
		const eventHandler = (error: string) => {
			callback(error);
		};
		getSocket().removeAllListeners("error");
		getSocket().on("error", eventHandler);
	}

	return {
		connect,
		disconnect,
		isConnected,
		currentGameId: gameId,
		currentPlayer: player,
		currentGameState: gameState,
		isHost,
		createGame,
		onGameCreated,
		joinGame,
		onGameJoined,
		leaveGame,
		emitGameEvent,
		onGameEvent,
		startGame,
		onGameError,
	};
};

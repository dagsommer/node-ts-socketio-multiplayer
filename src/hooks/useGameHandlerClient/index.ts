import { useCallback, useEffect, useRef, useState } from "react";
import { Socket, io } from "socket.io-client";
import {
	GameState,
	MinimumGameAccessDetails,
	MinimumGameDetails,
	MinimumGameEvent,
	MinimumPlayerDetails,
} from "../../types";

export const useGameHandlerClient = <
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

	// Update the ref whenever gameId state changes
	useEffect(() => {
		gameIdRef.current = gameId;
	}, [gameId]);

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
		socket?.emit("game:create", gameDetails, playerDetails, token);
	};

	const onGameCreated = (callback: (game: GameDetailsType) => void) => {
		socket?.on("game:created", (game) => {
			setGameId(game.gameId);
			callback(game);
		});
	};

	const joinGame = (
		gameAccessDetails: GameAccessDetailsType,
		player: PlayerType
	) => {
		setPlayer(player);
		setGameId(gameAccessDetails.gameId);
		setIsHost(false);
        setGameState("waitingForPlayers");
		socket?.emit("game:join", gameAccessDetails, player);
	};

	const onGameJoined = (callback: (gameId: string) => void) => {
		const eventHandler = (gameId: string) => {
			setGameId(gameId);
			callback(gameId);
		};
		socket?.on("game:joined", eventHandler);
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
		socket?.emit("game:leave", gameAccessDetails, player);
		setGameId(null);
		setPlayer(null);
	};

	const emitGameEvent = (event: GameEvent) => {
		if (!gameId) {
			throw new Error("Invalid game id");
		}
		if (!player) {
			throw new Error("Invalid player or game");
		}
		socket?.emit("game:event", event, player);
	};

	const onGameEvent = (callback: (event: GameEvent) => void) => {
		if (!callback) {
			throw new Error("Invalid callback");
		}
		const eventHandler = (event: GameEvent) => {
			callback(event);
		};
		socket?.on("game:event", eventHandler);
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
		socket?.emit("game:start", gameAccessDetails);
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
    }

	return {
		connect,
		disconnect,
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
	};
};

import { renderHook, act } from "@testing-library/react";
import {
	beforeAll,
	afterAll,
	describe,
	afterEach,
	it,
	expect,
	vi,
	beforeEach,
	Mock,
} from "vitest";
import { useGameHandlerClient } from "../index";
import { Server, type Socket as ServerSocket } from "socket.io";
import { io as ioc, type Socket as ClientSocket } from "socket.io-client";
import { createServer } from "node:http";
import { type AddressInfo } from "node:net";
import {
	sampleTestGameAccessDetails,
	sampleTestGameDetails,
	sampleTestGameEvent,
	sampleTestPlayerDetails,
	sampleTestToken,
} from "../../../__tests__/TestData";

import {
	sleep,
	waitFor,
	waitForCb,
	waitForWithMultipleArguments,
} from "../../../__tests__/util";
import { GameState } from "../../../types";

describe("useGameHandlerClient tests", () => {
	let io: Server,
		serverUrl: string = "";

	afterAll(() => {
		io.close();
	});

	afterEach(() => {
		io.disconnectSockets();
	});

	beforeAll(() => {
		return new Promise((resolve) => {
			const httpServer = createServer();
			io = new Server(httpServer);
			httpServer.listen(() => {
				const port = (httpServer.address() as AddressInfo).port;
				serverUrl = `http://localhost:${port}`;

				resolve();
			});
		});
	});
	it("should be defined", () => {
		expect(useGameHandlerClient).toBeDefined();
	});

	describe("Connecting to the server", () => {
		it("should expose a connect function", () => {
			const { result } = renderHook(() => useGameHandlerClient());
			expect(result.current.connect).toBeDefined();
		});

		it("should be able to connect to the server", async () => {
			const { result } = renderHook(() => useGameHandlerClient());
			act(() => {
				result.current.connect(serverUrl);
			});
			await waitFor(io, "connection");
			expect(io.sockets.sockets.size).toBe(1);
		});

		it("should be able to disconnect from the server", async () => {
			const { result } = renderHook(() => useGameHandlerClient());
			act(() => {
				result.current.connect(serverUrl);
			});
			const socket = await waitFor(io, "connection");
			expect(io.sockets.sockets.size).toBe(1);
			const waitForDisconnect = waitFor(socket as ServerSocket, "disconnect");
			act(() => {
				result.current.disconnect();
			});
			await waitForDisconnect;
			expect(io.sockets.sockets.size).toBe(0);
		});

		it("should be able to reconnect to the server", async () => {
			const { result } = renderHook(() => useGameHandlerClient());
			act(() => {
				result.current.connect(serverUrl);
			});
			const socket = await waitFor(io, "connection");
			expect(io.sockets.sockets.size).toBe(1);
			const waitForDisconnect = waitFor(socket as ServerSocket, "disconnect");
			act(() => {
				result.current.disconnect();
			});
			await waitForDisconnect;
			expect(io.sockets.sockets.size).toBe(0);
			act(() => {
				result.current.connect(serverUrl);
			});
			await waitFor(io, "connection");
			expect(io.sockets.sockets.size).toBe(1);
		});

		it("shouldn't be able to connect without a url", async () => {
			const { result } = renderHook(() => useGameHandlerClient());
			expect(() => {
				result.current.connect("");
			}).toThrowError();
			expect(() => {
				// @ts-ignore - this is meant to test an argument missing
				result.current.connect();
			}).toThrowError();
		});
	});

	describe("Creating a game", () => {
		it("should expose a createGame function", () => {
			const { result } = renderHook(() => useGameHandlerClient());
			expect(result.current.createGame).toBeDefined();
		});

		it("should be able to create a game", async () => {
			const { result } = renderHook(() => useGameHandlerClient());
			act(() => {
				result.current.connect(serverUrl);
			});
			const socket = (await waitFor(io, "connection")) as ServerSocket;
			const waitForGameCreated = waitForWithMultipleArguments(
				socket as ServerSocket,
				"game:create"
			);
			act(() => {
				result.current.createGame(
					sampleTestGameDetails,
					sampleTestPlayerDetails,
					sampleTestToken
				);
			});
			const data = (await waitForGameCreated) as any;
			const [game, player, token] = data;
			expect(game.gameId).toStrictEqual(sampleTestGameDetails.gameId);
			expect(player.playerId).toStrictEqual(sampleTestPlayerDetails.playerId);
			expect(token).toStrictEqual(sampleTestToken);
		});

		it("should be able to set a handler for game:created events", async () => {
			const { result } = renderHook(() => useGameHandlerClient());
			expect(result.current.onGameCreated).toBeDefined();
		});

		it("should receive a game:created event when a game is created", async () => {
			const { result } = renderHook(() => useGameHandlerClient());
			act(() => {
				result.current.connect(serverUrl);
			});
			const socket = (await waitFor(io, "connection")) as ServerSocket;
			const waitForGameCreated = waitForWithMultipleArguments(
				socket as ServerSocket,
				"game:create"
			);
			const gameCreatedHandler = vi.fn();
			act(() => {
				result.current.onGameCreated(gameCreatedHandler);

				result.current.createGame(
					sampleTestGameDetails,
					sampleTestPlayerDetails,
					sampleTestToken
				);
			});
			const data = (await waitForGameCreated) as any;
			//Mock server response
			const [game] = data;
			socket.emit("game:created", game);

			// Small delay to allow the event to be handled
			await act(() => sleep(100));

			expect(gameCreatedHandler).toHaveBeenCalledWith(game);
		});

		it("should keep track of the current game after it's created", async () => {
			const { result } = renderHook(() => useGameHandlerClient());
			act(() => {
				result.current.connect(serverUrl);
			});
			const socket = (await waitFor(io, "connection")) as ServerSocket;
			const waitForGameCreated = waitForWithMultipleArguments(
				socket as ServerSocket,
				"game:create"
			);
			const gameCreatedHandler = vi.fn();
			act(() => {
				result.current.onGameCreated(gameCreatedHandler);

				result.current.createGame(
					sampleTestGameDetails,
					sampleTestPlayerDetails,
					sampleTestToken
				);
			});
			const data = (await waitForGameCreated) as any;
			//Mock server response
			const [game] = data;
			socket.emit("game:created", game);

			// Small delay to allow the event to be handled
			await act(() => sleep(100));

			expect(result.current.currentGameId).toStrictEqual(game.gameId);
		});

		it("should keep track of current players after a game is created", async () => {
			const { result } = renderHook(() => useGameHandlerClient());
			act(() => {
				result.current.connect(serverUrl);
			});
			await waitFor(io, "connection");
			act(() => {
				result.current.createGame(
					sampleTestGameDetails,
					sampleTestPlayerDetails,
					sampleTestToken
				);
			});

			expect(result.current.currentPlayer).toStrictEqual(
				sampleTestPlayerDetails
			);
		});

		it("should know that it is the host after a game is created", async () => {
			const { result } = renderHook(() => useGameHandlerClient());
			act(() => {
				result.current.connect(serverUrl);
			});
			await waitFor(io, "connection");

			act(() => {
				result.current.createGame(
					sampleTestGameDetails,
					sampleTestPlayerDetails,
					sampleTestToken
				);
			});

			expect(result.current.isHost).toBe(true);
		});

        it("should set the game state to waiting after a game is created", async () => {
            const { result } = renderHook(() => useGameHandlerClient());
            act(() => {
                result.current.connect(serverUrl);
            });
            await waitFor(io, "connection");

            act(() => {
                result.current.createGame(
                    sampleTestGameDetails,
                    sampleTestPlayerDetails,
                    sampleTestToken
                );
            });

            expect(result.current.currentGameState).toStrictEqual<GameState>("waitingForPlayers");
        });
	});

	describe("Joining a game", () => {
		it("should expose a joinGame function", () => {
			const { result } = renderHook(() => useGameHandlerClient());
			expect(result.current.joinGame).toBeDefined();
		});

		it("should be able to join a game", async () => {
			const { result } = renderHook(() => useGameHandlerClient());
			act(() => {
				result.current.connect(serverUrl);
			});
			const socket = (await waitFor(io, "connection")) as ServerSocket;

			const waitForGameJoined = waitForWithMultipleArguments(
				socket as ServerSocket,
				"game:join"
			);
			act(() => {
				result.current.joinGame(
					sampleTestGameAccessDetails,
					sampleTestPlayerDetails
				);
			});
			const data = (await waitForGameJoined) as any;
			const [gameAccess, player] = data;
			expect(gameAccess.gameId).toStrictEqual(
				sampleTestGameAccessDetails.gameId
			);
			expect(player.playerId).toStrictEqual(sampleTestPlayerDetails.playerId);
		});

		it("should be able to set a handler for game:joined events", async () => {
			const { result } = renderHook(() => useGameHandlerClient());
			expect(result.current.onGameJoined).toBeDefined();
		});

		it("should receive a game:joined event when a game is joined", async () => {
			const { result } = renderHook(() => useGameHandlerClient());
			act(() => {
				result.current.connect(serverUrl);
			});
			const socket = (await waitFor(io, "connection")) as ServerSocket;

			const waitForGameJoined = waitForWithMultipleArguments(
				socket as ServerSocket,
				"game:join"
			);
			const gameJoinedHandler = vi.fn();
			act(() => {
				result.current.onGameJoined(gameJoinedHandler);

				result.current.joinGame(
					sampleTestGameAccessDetails,
					sampleTestPlayerDetails
				);
			});
			const data = (await waitForGameJoined) as any;
			//Mock server response
			const [gameAccess] = data;
			socket.emit("game:joined", gameAccess.gameId);

			// Small delay to allow the event to be handled
			await act(() => sleep(100));

			expect(gameJoinedHandler).toHaveBeenCalledWith(gameAccess.gameId);
		});

		it("should keep track of the current game after it's joined", async () => {
			const { result } = renderHook(() => useGameHandlerClient());
			act(() => {
				result.current.connect(serverUrl);
			});
			const socket = (await waitFor(io, "connection")) as ServerSocket;

			const waitForGameJoined = waitForWithMultipleArguments(
				socket as ServerSocket,
				"game:join"
			);
			const gameJoinedHandler = vi.fn();
			act(() => {
				result.current.onGameJoined(gameJoinedHandler);

				result.current.joinGame(
					sampleTestGameAccessDetails,
					sampleTestPlayerDetails
				);
			});
			const data = (await waitForGameJoined) as any;
			//Mock server response
			const [gameAccess] = data;
			socket.emit("game:joined", gameAccess.gameId);

			// Small delay to allow the event to be handled
			await act(() => sleep(100));

			expect(result.current.currentGameId).toStrictEqual(gameAccess.gameId);
		});

		it("should keep track of current player after a game is joined", async () => {
			const { result } = renderHook(() => useGameHandlerClient());
			act(() => {
				result.current.connect(serverUrl);
			});
			await waitFor(io, "connection");

			act(() => {
				result.current.joinGame(
					sampleTestGameAccessDetails,
					sampleTestPlayerDetails
				);
			});

			expect(result.current.currentPlayer).toStrictEqual(
				sampleTestPlayerDetails
			);
		});

		it("should know that it is not the host after a game is joined", async () => {
			const { result } = renderHook(() => useGameHandlerClient());
			act(() => {
				result.current.connect(serverUrl);
			});
			await waitFor(io, "connection");

			act(() => {
				result.current.joinGame(
					sampleTestGameAccessDetails,
					sampleTestPlayerDetails
				);
			});

			expect(result.current.isHost).toStrictEqual(false);
		});

        it("should set the game state to waiting after a game is joined", async () => {
            const { result } = renderHook(() => useGameHandlerClient());
            act(() => {
                result.current.connect(serverUrl);
            });
            await waitFor(io, "connection");

            act(() => {
                result.current.joinGame(
                    sampleTestGameAccessDetails,
                    sampleTestPlayerDetails
                );
            });

            expect(result.current.currentGameState).toStrictEqual<GameState>("waitingForPlayers");
        });
	});

	describe("Leaving a game", () => {
		it("should expose a leaveGame function", () => {
			const { result } = renderHook(() => useGameHandlerClient());
			expect(result.current.leaveGame).toBeDefined();
		});

		it("should be able to leave a game", async () => {
			const { result } = renderHook(() => useGameHandlerClient());
			act(() => {
				result.current.connect(serverUrl);
			});
			const socket = (await waitFor(io, "connection")) as ServerSocket;

			act(() => {
				result.current.joinGame(
					sampleTestGameAccessDetails,
					sampleTestPlayerDetails
				);
			});
			await waitFor(socket, "game:join");

			const waitForGameLeft = waitForWithMultipleArguments(
				socket as ServerSocket,
				"game:leave"
			);
			act(() => {
				result.current.leaveGame(sampleTestGameAccessDetails);
			});
			const data = (await waitForGameLeft) as any;
			const [gameAccess, player] = data;
			expect(gameAccess.gameId).toStrictEqual(
				sampleTestGameAccessDetails.gameId
			);
			expect(player.playerId).toStrictEqual(sampleTestPlayerDetails.playerId);
		});

		it("shouldn't be able to leave a game without a gameAccessDetails", async () => {
			const { result } = renderHook(() => useGameHandlerClient());
			act(() => {
				result.current.connect(serverUrl);
			});
			await waitFor(io, "connection");

			expect(() => {
				// @ts-ignore - this is meant to test an argument missing
				result.current.leaveGame();
			}).toThrowError();
		});

		it("shouldn't be able to leave a game without having joined one", async () => {
			const { result } = renderHook(() => useGameHandlerClient());
			act(() => {
				result.current.connect(serverUrl);
			});
			await waitFor(io, "connection");

			expect(() => {
				result.current.leaveGame(sampleTestGameAccessDetails);
			}).toThrowError();
		});

		it("shouldn't have a current game after leaving a game", async () => {
			const { result } = renderHook(() => useGameHandlerClient());
			act(() => {
				result.current.connect(serverUrl);
			});
			const socket = (await waitFor(io, "connection")) as ServerSocket;

			const waitForGameJoined = waitForWithMultipleArguments(
				socket as ServerSocket,
				"game:join"
			);
			act(() => {
				result.current.joinGame(
					sampleTestGameAccessDetails,
					sampleTestPlayerDetails
				);
			});
			const data = (await waitForGameJoined) as any;
			//Mock server response
			const [gameAccess] = data;
			socket.emit("game:joined", gameAccess);

			// Small delay to allow the event to be handled
			await act(() => sleep(100));
			act(() => {
				result.current.leaveGame(sampleTestGameAccessDetails);
			});
			await waitFor(socket, "game:leave");
			expect(result.current.currentGameId).toBeNull();
		});

		it("shouldn't have a current player after leaving a game", async () => {
			const { result } = renderHook(() => useGameHandlerClient());
			act(() => {
				result.current.connect(serverUrl);
			});
			const socket = (await waitFor(io, "connection")) as ServerSocket;

			const waitForGameJoined = waitForWithMultipleArguments(
				socket as ServerSocket,
				"game:join"
			);
			act(() => {
				result.current.joinGame(
					sampleTestGameAccessDetails,
					sampleTestPlayerDetails
				);
			});
			const data = (await waitForGameJoined) as any;
			//Mock server response
			const [gameAccess] = data;
			socket.emit("game:joined", gameAccess);

			// Small delay to allow the event to be handled
			await act(() => sleep(100));
			act(() => {
				result.current.leaveGame(sampleTestGameAccessDetails);
			});
			await waitFor(socket, "game:leave");
			expect(result.current.currentPlayer).toBeNull();
		});
	});

	describe("Emitting a game event", () => {
		it("should expose an emitGameEvent function", () => {
			const { result } = renderHook(() => useGameHandlerClient());
			expect(result.current.emitGameEvent).toBeDefined();
		});

		it("should be able to emit a game event", async () => {
			const { result } = renderHook(() => useGameHandlerClient());
			act(() => {
				result.current.connect(serverUrl);
			});
			const socket = (await waitFor(io, "connection")) as ServerSocket;

			act(() => {
				result.current.joinGame(
					sampleTestGameAccessDetails,
					sampleTestPlayerDetails
				);
			});
			await waitFor(socket, "game:join");
			//send back a game:joined event with the game id
			act(() => {
				result.current.onGameJoined(vi.fn());
			})
			socket.emit("game:joined", sampleTestGameAccessDetails.gameId);

			await act(() => sleep(100));

			const waitForGameEvent = waitForWithMultipleArguments(
				socket as ServerSocket,
				"game:event"
			);
			act(() => {
				result.current.emitGameEvent(sampleTestGameAccessDetails, sampleTestGameEvent);
			});
			const data = (await waitForGameEvent) as any;
			const [access, event, playerobj] = data;
			expect(access).toStrictEqual(sampleTestGameAccessDetails);
			expect(event).toStrictEqual(sampleTestGameEvent);
			expect(playerobj).toStrictEqual(sampleTestPlayerDetails);
		});

		it("shouldn't be able to emit a game event without a game event", async () => {
			const { result } = renderHook(() => useGameHandlerClient());
			act(() => {
				result.current.connect(serverUrl);
			});
			await waitFor(io, "connection");

			expect(() => {
				// @ts-ignore - this is meant to test an argument missing
				result.current.emitGameEvent();
			}).toThrowError();
		});

		it("shouldn't be able to emit a game event without having joined a game", async () => {
			const { result } = renderHook(() => useGameHandlerClient());
			act(() => {
				result.current.connect(serverUrl);
			});
			await waitFor(io, "connection");

			expect(() => {
				result.current.emitGameEvent(sampleTestGameAccessDetails, sampleTestGameEvent);
			}).toThrowError();
		});
	});

	describe("Receiving a game event", () => {
		it("should be able to set a handler for game:event events", async () => {
			const { result } = renderHook(() => useGameHandlerClient());
			expect(result.current.onGameEvent).toBeDefined();
		});

		it("should receive a game:event event when a game event is emitted", async () => {
			const { result } = renderHook(() => useGameHandlerClient());
			act(() => {
				result.current.connect(serverUrl);
			});
			const socket = (await waitFor(io, "connection")) as ServerSocket;

			act(() => {
				result.current.joinGame(
					sampleTestGameAccessDetails,
					sampleTestPlayerDetails
				);
			});
			await waitFor(socket, "game:join");

			const gameEventHandler = vi.fn();
			act(() => {
				result.current.onGameEvent(gameEventHandler);
			});

			socket.emit("game:event", sampleTestGameEvent);

			// Small delay to allow the event to be handled
			await act(() => sleep(100));

			expect(gameEventHandler).toHaveBeenCalledWith(sampleTestGameEvent);
		});

		it("shouldn't be able to setup event handler without a handler", async () => {
			const { result } = renderHook(() => useGameHandlerClient());
			expect(() => {
				// @ts-ignore - this is meant to test an argument missing
				result.current.onGameEvent();
			}).toThrowError();
		});
	});

	describe("Starting a game", () => {
		it("should expose a startGame function", () => {
			const { result } = renderHook(() => useGameHandlerClient());
			expect(result.current.startGame).toBeDefined();
		});

		it("should be able to start a game", async () => {
			const { result } = renderHook(() => useGameHandlerClient());
			act(() => {
				result.current.connect(serverUrl);
			});
			const socket = (await waitFor(io, "connection")) as ServerSocket;

			act(() => {
				result.current.createGame(
					sampleTestGameDetails,
					sampleTestPlayerDetails,
					sampleTestToken
				);
			});
			await waitFor(socket, "game:create");

			const waitForGameStarted = waitForWithMultipleArguments(
				socket as ServerSocket,
				"game:start"
			);
			act(() => {
				result.current.startGame(sampleTestGameAccessDetails);
			});
			const data = (await waitForGameStarted) as any;
			const [gameAccess] = data;
			expect(gameAccess.gameId).toStrictEqual(
				sampleTestGameAccessDetails.gameId
			);
		});

		it("shouldn't be able to start a game without a gameAccessDetails", async () => {
			const { result } = renderHook(() => useGameHandlerClient());
			act(() => {
				result.current.connect(serverUrl);
			});
			await waitFor(io, "connection");

			expect(() => {
				// @ts-ignore - this is meant to test an argument missing
				result.current.startGame();
			}).toThrowError();
		});

		it("shouldn't be able to start a game without having joined a game", async () => {
			const { result } = renderHook(() => useGameHandlerClient());
			act(() => {
				result.current.connect(serverUrl);
			});
			await waitFor(io, "connection");

			expect(() => {
				result.current.startGame(sampleTestGameAccessDetails);
			}).toThrowError();
		});

		it("shouldn't be able to start a game without being the host", async () => {
			const { result } = renderHook(() => useGameHandlerClient());
			act(() => {
				result.current.connect(serverUrl);
			});
			const socket = (await waitFor(io, "connection")) as ServerSocket;

			act(() => {
				result.current.joinGame(
					sampleTestGameAccessDetails,
					sampleTestPlayerDetails
				);
			});
			await waitFor(socket, "game:join");

			expect(() => {
				result.current.startGame(sampleTestGameAccessDetails);
			}).toThrowError();
		});
	});

	describe("Receiving game started/finished events", () => {
		it("should update the game state when a game started event is received", async () => {
			const { result } = renderHook(useGameHandlerClient);
			act(() => {
				result.current.connect(serverUrl);
			});

			const socket = (await waitFor(io, "connection")) as ServerSocket;
			const gameDetails = { ...sampleTestGameDetails, gameId: "startedGame" };

			act(() => {
				result.current.createGame(
					gameDetails,
					sampleTestPlayerDetails,
					sampleTestToken
				);
				result.current.onGameCreated(vi.fn());
			});
			await waitFor(socket, "game:create");
			socket.emit("game:created", gameDetails);
			await act(() => sleep(100));
			expect(result.current.currentGameId).toStrictEqual(gameDetails.gameId);

			socket.emit("game:started", gameDetails.gameId);
			await act(() => sleep(100));
			expect(result.current.currentGameState).toStrictEqual<GameState>(
				"inProgress"
			);
		});

		it("should update the game state when a game finished event is received", async () => {
			const { result } = renderHook(useGameHandlerClient);
			act(() => {
				result.current.connect(serverUrl);
			});

			const socket = (await waitFor(io, "connection")) as ServerSocket;
			const gameDetails = { ...sampleTestGameDetails, gameId: "startedGame" };

			act(() => {
				result.current.createGame(
					gameDetails,
					sampleTestPlayerDetails,
					sampleTestToken
				);
				result.current.onGameCreated(vi.fn());
			});
			await waitFor(socket, "game:create");
			socket.emit("game:created", gameDetails);
			await act(() => sleep(100));
			expect(result.current.currentGameId).toStrictEqual(gameDetails.gameId);

			socket.emit("game:finished", gameDetails.gameId);
			await act(() => sleep(100));
			expect(result.current.currentGameState).toStrictEqual<GameState>(
				"finished"
			);
		});
	});

	describe("Receiving errors", () => {
		it("should be able to set a handler for error events", async () => {
			const { result } = renderHook(() => useGameHandlerClient());
			expect(result.current.onGameError).toBeDefined();
		});

		it("should receive a error event when a game error occurs", async () => {
			const { result } = renderHook(() => useGameHandlerClient());
			act(() => {
				result.current.connect(serverUrl);
			});
			const socket = (await waitFor(io, "connection")) as ServerSocket;
			const gameErrorHandler = vi.fn();
			act(() => {
				result.current.onGameError(gameErrorHandler);
			});

			socket.emit("error", "test error");

			// Small delay to allow the event to be handled
			await act(() => sleep(100));

			expect(gameErrorHandler).toHaveBeenCalledWith("test error");
		});

	});
});

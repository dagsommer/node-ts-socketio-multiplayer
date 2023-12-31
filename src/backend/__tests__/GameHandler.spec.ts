import {
	beforeAll,
	afterAll,
	describe,
	it,
	expect,
	vi,
	beforeEach,
	Mock,
} from "vitest";
import { createServer } from "node:http";
import { type AddressInfo } from "node:net";
import { io as ioc, type Socket as ClientSocket } from "socket.io-client";
import { Server, Socket, type Socket as ServerSocket } from "socket.io";
import http from "http";

import { GameHandler } from "../GameHandler";
import { TestGameAccessDetails, TestGameDetails, TestGameEvent, TestPlayerDetails, sampleTestGameAccessDetails, sampleTestGameDetails, sampleTestGameEvent, sampleTestPlayerDetails, sampleTestToken } from "../../__tests__/TestData";
import { GameState } from "../../types";
import { waitFor} from "../../__tests__/util";

describe("Game functions", () => {
	let serverSocket: Socket | null = null,
		clientSocket: ClientSocket,
		gameHandler: GameHandler<
			TestGameDetails,
			TestPlayerDetails,
			TestGameEvent,
			string,
			TestGameAccessDetails
		>,
		port: number;

	beforeAll(() => {
		return new Promise((resolve) => {
			const httpServer = createServer();
			const tokenValidator = async () => {
				return true;
			};
			gameHandler = new GameHandler(httpServer, tokenValidator);

			httpServer.listen(() => {
				port = (httpServer.address() as AddressInfo).port;
				clientSocket = ioc(`http://localhost:${port}`);
				clientSocket.on("connect", resolve);
			});
		});
	});

	afterAll(() => {
		gameHandler.close();
		clientSocket.disconnect();
	});

	beforeEach(() => {
		clientSocket.removeAllListeners();
		gameHandler.setValidateToken(async () => true);
		gameHandler._resetHandlers();
		serverSocket = gameHandler._mostRecentSocket;
	});


	describe("constructor", () => {

		it("should not allow an io instance to be provided without a namespace", () => {
			const httpServer = createServer();
			const tokenValidator = async () => {
				return true;
			};
			expect(() => {
				new GameHandler(httpServer, tokenValidator, new Server(httpServer));
			}).toThrowError("Must provide a namespace if providing an io instance");
		});
	});

	describe("Create game", () => {
		const createGameFn = async (
			game: TestGameDetails,
			player: TestPlayerDetails,
			token: string
		) => {};
		let mocked = vi.fn().mockImplementation(createGameFn);

		beforeEach(() => {
			mocked.mockReset();
		});

		it("should be able to create a new game", () => {
			return new Promise<void>((resolve) => {
				gameHandler.onCreateGame(mocked);

				waitFor(serverSocket, "game:create").then(() => {
					expect(mocked).toHaveBeenCalled();
					expect(mocked).toHaveBeenCalledWith(
						sampleTestGameDetails,
						sampleTestPlayerDetails,
						sampleTestToken
					);
					waitFor(clientSocket, "game:created").then(() => {
						resolve();
					});
				});

				clientSocket.emit(
					"game:create",
					sampleTestGameDetails,
					sampleTestPlayerDetails,
					sampleTestToken
				);
			});
		});

		it("shouldn't be able to create a new game with an invalid token", () => {
			return new Promise<void>((resolve) => {
				gameHandler.onCreateGame(mocked);
				gameHandler.setValidateToken(
					async (token: string) => token === "secretpassword"
				);

				const testToken: string = "testToken";
				const serverSocket = gameHandler._mostRecentSocket;

				waitFor(serverSocket, "game:create").then(() => {
					expect(mocked).not.toHaveBeenCalled();
					waitFor(clientSocket, "error").then(() => {
						resolve();
					});
				});

				clientSocket.emit(
					"game:create",
					sampleTestGameDetails,
					sampleTestPlayerDetails,
					testToken
				);
			});
		});

		it("should throw an error if the game has no id", () => {
			return new Promise<void>((resolve) => {
				gameHandler.onCreateGame(mocked);

				const serverSocket = gameHandler._mostRecentSocket;

				waitFor(serverSocket, "game:create").then(() => {
					expect(mocked).not.toHaveBeenCalled();
					waitFor(clientSocket, "error").then((value) => {
						expect(value).toEqual("Game must have an id");
						resolve();
					});
				});

				clientSocket.emit(
					"game:create",
					{ ...sampleTestGameDetails, gameId: undefined },
					sampleTestPlayerDetails,
					sampleTestToken
				);
			});
		});

		it("should throw an error if the game has no iteration", () => {
			return new Promise<void>((resolve) => {
				gameHandler.onCreateGame(mocked);

				const serverSocket = gameHandler._mostRecentSocket;

				waitFor(serverSocket, "game:create").then(() => {
					expect(mocked).not.toHaveBeenCalled();
					waitFor(clientSocket, "error").then((value) => {
						expect(value).toEqual("Game must have an iteration");
						resolve();
					});
				});

				clientSocket.emit(
					"game:create",
					{ ...sampleTestGameDetails, iteration: undefined },
					sampleTestPlayerDetails,
					sampleTestToken
				);
			});
		});

		it("should throw an error if the game has no state", () => {
			return new Promise<void>((resolve) => {
				gameHandler.onCreateGame(mocked);

				const serverSocket = gameHandler._mostRecentSocket;

				waitFor(serverSocket, "game:create").then(() => {
					expect(mocked).not.toHaveBeenCalled();
					waitFor(clientSocket, "error").then((value) => {
						expect(value).toEqual("Game must have a state");
						resolve();
					});
				});

				clientSocket.emit(
					"game:create",
					{ ...sampleTestGameDetails, state: undefined },
					sampleTestPlayerDetails,
					sampleTestToken
				);
			});
		});

		//is state valid?
		it("should throw an error if the game state is not valid", () => {
			return new Promise<void>((resolve) => {
				gameHandler.onCreateGame(mocked);

				const serverSocket = gameHandler._mostRecentSocket;

				waitFor(serverSocket, "game:create").then(() => {
					expect(mocked).not.toHaveBeenCalled();
					waitFor(clientSocket, "error").then((value) => {
						expect(value).toEqual(
							"Game state must be one of waitingForPlayers, inProgress, or finished"
						);
						resolve();
					});
				});

				clientSocket.emit(
					"game:create",
					{ ...sampleTestGameDetails, state: "some_non_existent_state" },
					sampleTestPlayerDetails,
					sampleTestToken
				);
			});
		});

		it("should throw an error if the player has no id", () => {
			return new Promise<void>((resolve) => {
				gameHandler.onCreateGame(mocked);

				const serverSocket = gameHandler._mostRecentSocket;

				waitFor(serverSocket, "game:create").then(() => {
					expect(mocked).not.toHaveBeenCalled();
					waitFor(clientSocket, "error").then((value) => {
						expect(value).toEqual("Player must have an id");
						resolve();
					});
				});

				clientSocket.emit(
					"game:create",
					sampleTestGameDetails,
					{ ...sampleTestPlayerDetails, playerId: undefined },
					sampleTestToken
				);
			});
		});

		it("shouldn't be able to create a game with an existing id", async () => {
			gameHandler.onCreateGame(mocked);
			const randomId = Math.random().toString(36).substring(7);

			const waitForFirstCreateGamePromise = waitFor(
				serverSocket,
				"game:create"
			);
			const waitForGameCreated = waitFor(clientSocket, "game:created");
			clientSocket.emit(
				"game:create",
				{ ...sampleTestGameDetails, gameId: randomId },
				sampleTestPlayerDetails,
				sampleTestToken
			);
			await waitForFirstCreateGamePromise;
			await waitForGameCreated;

			const waitForSecondCreateGamePromise = waitFor(
				serverSocket,
				"game:create"
			);
			const waitForError = waitFor(clientSocket, "error");
			clientSocket.emit(
				"game:create",
				{ ...sampleTestGameDetails, gameId: randomId },
				sampleTestPlayerDetails,
				sampleTestToken
			);

			await waitForSecondCreateGamePromise;

			expect(mocked).toHaveBeenCalledTimes(1);
			expect(waitForError).resolves.toEqual(
				`Game with id ${randomId} already exists`
			);
		});
	});

	describe("Join game", () => {
		const joinGameFn = async (
			gameAccess: TestGameAccessDetails,
			player: TestPlayerDetails
		) => {};
		let mocked = vi.fn().mockImplementation(joinGameFn);

		beforeEach(() => {
			mocked.mockReset();
		});

		it("should be able to join a game", () => {
			return new Promise<void>((resolve) => {
				gameHandler.onJoinGame(mocked);

				waitFor(serverSocket, "game:join").then(() => {
					expect(mocked).toHaveBeenCalled();
					expect(mocked).toHaveBeenCalledWith(
						sampleTestGameAccessDetails,
						sampleTestPlayerDetails
					);
					waitFor(clientSocket, "game:joined").then(() => {
						resolve();
					});
				});

				clientSocket.emit(
					"game:join",
					sampleTestGameAccessDetails,
					sampleTestPlayerDetails
				);
			});
		});

		it("shouldn't be able to join a game with an invalid token", () => {
			return new Promise<void>((resolve) => {
				gameHandler.onJoinGame(mocked);
				gameHandler.setValidateToken(
					async (token: string) => token === "secretpassword"
				);

				const testToken: string = "testToken";
				const serverSocket = gameHandler._mostRecentSocket;

				waitFor(serverSocket, "game:join").then(() => {
					expect(mocked).not.toHaveBeenCalled();
					waitFor(clientSocket, "error").then(() => {
						resolve();
					});
				});

				clientSocket.emit(
					"game:join",
					sampleTestGameAccessDetails,
					sampleTestPlayerDetails,
					testToken
				);
			});
		});

		it("should throw an error if the game has no id", () => {
			return new Promise<void>((resolve) => {
				gameHandler.onJoinGame(mocked);

				const serverSocket = gameHandler._mostRecentSocket;

				waitFor(serverSocket, "game:join").then(() => {
					expect(mocked).not.toHaveBeenCalled();
					waitFor(clientSocket, "error").then((value) => {
						expect(value).toEqual("Game must have an id");
						resolve();
					});
				});

				clientSocket.emit(
					"game:join",
					{ ...sampleTestGameAccessDetails, gameId: undefined },
					sampleTestPlayerDetails,
					sampleTestToken
				);
			});
		});

		it("should throw an error if the player has no id", () => {
			return new Promise<void>((resolve) => {
				gameHandler.onJoinGame(mocked);

				const serverSocket = gameHandler._mostRecentSocket;

				waitFor(serverSocket, "game:join").then(() => {
					expect(mocked).not.toHaveBeenCalled();
					waitFor(clientSocket, "error").then((value) => {
						expect(value).toEqual("Player must have an id");
						resolve();
					});
				});

				clientSocket.emit(
					"game:join",
					sampleTestGameAccessDetails,
					{ ...sampleTestPlayerDetails, playerId: undefined },
					sampleTestToken
				);
			});
		});
	});

	describe("Start game", () => {
		const startGameFn = async (gameAccess: TestGameAccessDetails) => {};
		let mocked = vi.fn().mockImplementation(startGameFn);

		beforeEach(() => {
			mocked.mockReset();
		});

		it("should be able to start a game", () => {
			return new Promise<void>((resolve) => {
				gameHandler.onStartGame(mocked);

				waitFor(serverSocket, "game:start").then(() => {
					expect(mocked).toHaveBeenCalled();
					expect(mocked).toHaveBeenCalledWith(sampleTestGameAccessDetails);
					waitFor(clientSocket, "game:started").then(() => {
						resolve();
					});
				});

				clientSocket.emit("game:start", sampleTestGameAccessDetails);
			});
		});

		it("shouldn't be able to start a game with an invalid token", () => {
			return new Promise<void>((resolve) => {
				gameHandler.onStartGame(mocked);
				gameHandler.setValidateToken(
					async (token: string) => token === "secretpassword"
				);

				const testToken: string = "testToken";
				const serverSocket = gameHandler._mostRecentSocket;

				waitFor(serverSocket, "game:start").then(() => {
					expect(mocked).not.toHaveBeenCalled();
					waitFor(clientSocket, "error").then(() => {
						resolve();
					});
				});

				clientSocket.emit("game:start", sampleTestGameAccessDetails, testToken);
			});
		});

		it("should throw an error if the game has no id", () => {
			return new Promise<void>((resolve) => {
				gameHandler.onStartGame(mocked);

				const serverSocket = gameHandler._mostRecentSocket;

				waitFor(serverSocket, "game:start").then(() => {
					expect(mocked).not.toHaveBeenCalled();
					waitFor(clientSocket, "error").then((value) => {
						expect(value).toEqual("Game must have an id");
						resolve();
					});
				});

				clientSocket.emit(
					"game:start",
					{ ...sampleTestGameAccessDetails, gameId: undefined },
					sampleTestToken
				);
			});
		});

		it("should allow backend to start game", async () => {
			const waitForClientPromise = waitFor(clientSocket, "game:started");
			gameHandler.onStartGame(mocked);
			gameHandler.startGame(sampleTestGameAccessDetails.gameId);
			await waitForClientPromise;
			expect(waitForClientPromise).resolves;
			expect(mocked).not.toHaveBeenCalled();
		});
	});

	describe("Finish game", () => {
		const finishGameFn = async (gameAccess: TestGameAccessDetails) => {};
		let mocked = vi.fn().mockImplementation(finishGameFn);

		beforeEach(() => {
			mocked.mockReset();
		});

		it("should be able to finish a game", () => {
			return new Promise<void>((resolve) => {
				gameHandler.onFinishGame(mocked);

				waitFor(serverSocket, "game:finish").then(() => {
					expect(mocked).toHaveBeenCalled();
					expect(mocked).toHaveBeenCalledWith(sampleTestGameAccessDetails);
					waitFor(clientSocket, "game:finished").then(() => {
						resolve();
					});
				});

				clientSocket.emit("game:finish", sampleTestGameAccessDetails);
			});
		});

		it("shouldn't be able to finish a game with an invalid token", () => {
			return new Promise<void>((resolve) => {
				gameHandler.onFinishGame(mocked);
				gameHandler.setValidateToken(
					async (token: string) => token === "secretpassword"
				);

				const testToken: string = "testToken";
				const serverSocket = gameHandler._mostRecentSocket;

				waitFor(serverSocket, "game:finish").then(() => {
					expect(mocked).not.toHaveBeenCalled();
					waitFor(clientSocket, "error").then(() => {
						resolve();
					});
				});

				clientSocket.emit(
					"game:finish",
					sampleTestGameAccessDetails,
					testToken
				);
			});
		});

		it("should throw an error if the game has no id", () => {
			return new Promise<void>((resolve) => {
				gameHandler.onFinishGame(mocked);

				waitFor(serverSocket, "game:finish").then(() => {
					expect(mocked).not.toHaveBeenCalled();
					waitFor(clientSocket, "error").then((value) => {
						expect(value).toEqual("Game must have an id");
						resolve();
					});
				});

				clientSocket.emit(
					"game:finish",
					{ ...sampleTestGameAccessDetails, gameId: undefined },
					sampleTestToken
				);
			});
		});
	});

	describe("Emit game event", () => {
		const emitGameEventFn = async (gameEvent: TestGameEvent) => {};
		let mocked = vi.fn().mockImplementation(emitGameEventFn);

		beforeEach(() => {
			mocked.mockReset();
		});

		it("should be able to emit a game event", async () => {
			gameHandler.onEmitGameEvent(mocked);

			const waitForServerpromise = waitFor(serverSocket, "game:event");
			const waitForClientPromise = waitFor(clientSocket, "game:event");

			clientSocket.emit(
				"game:event",
				sampleTestGameAccessDetails,
				sampleTestGameEvent,
				sampleTestPlayerDetails
			);

			await waitForServerpromise;
			expect(mocked).toHaveBeenCalledWith(
				sampleTestGameEvent,
				sampleTestPlayerDetails
			);
			expect(waitForClientPromise).resolves;
		});

		it("shouldn't be able to emit a game event without player details", () => {
			return new Promise<void>((resolve) => {
				gameHandler.onEmitGameEvent(mocked);

				const serverSocket = gameHandler._mostRecentSocket;

				waitFor(serverSocket, "game:event").then(() => {
					expect(mocked).not.toHaveBeenCalled();
					waitFor(clientSocket, "error").then((value) => {
						expect(value).toEqual("Player must have an id");
						resolve();
					});
				});

				clientSocket.emit(
					"game:event",
					sampleTestGameAccessDetails,
					sampleTestGameEvent
				);
			});
		});

		it("shouldn't be able to emit a game event with an invalid token", () => {
			return new Promise<void>((resolve) => {
				gameHandler.onEmitGameEvent(mocked);
				gameHandler.setValidateToken(
					async (token: string) => token === "secretpassword"
				);

				const testToken: string = "testToken";
				const serverSocket = gameHandler._mostRecentSocket;

				waitFor(serverSocket, "game:event").then(() => {
					expect(mocked).not.toHaveBeenCalled();
					waitFor(clientSocket, "error").then(() => {
						resolve();
					});
				});

				clientSocket.emit(
					"game:event",
					sampleTestGameAccessDetails,
					sampleTestGameEvent
				);
			});
		});

		it("should throw an error if the game has no id", () => {
			return new Promise<void>((resolve) => {
				gameHandler.onEmitGameEvent(mocked);

				const serverSocket = gameHandler._mostRecentSocket;

				waitFor(serverSocket, "game:event").then(() => {
					expect(mocked).not.toHaveBeenCalled();
					waitFor(clientSocket, "error").then((value) => {
						expect(value).toEqual("Game must have an id");
						resolve();
					});
				});

				clientSocket.emit(
					"game:event",
					{ ...sampleTestGameAccessDetails, gameId: undefined },
					sampleTestGameEvent
				);
			});
		});

		describe("From server side", () => {
			it("should be able to emit a game event", async () => {
				const waitForClientPromise = waitFor(clientSocket, "game:event");
				gameHandler.emitEvent(sampleTestGameEvent);
				await waitForClientPromise;
				expect(waitForClientPromise).resolves;
			});

			it("shouldn't be able to emit an event without a game id", async () => {
				gameHandler
					.emitEvent({
						...sampleTestGameEvent,
						gameId: undefined,
					} as any)
					.catch((error) => {
						expect(error).toEqual(new Error("Game event must have a game id"));
					});
				expect.assertions(1);
			});
		});

		it("shouldn't be able to emit an event without an iteration", () => {
			return new Promise<void>((resolve) => {
				gameHandler.onEmitGameEvent(mocked);

				const serverSocket = gameHandler._mostRecentSocket;

				waitFor(serverSocket, "game:event").then(() => {
					expect(mocked).not.toHaveBeenCalled();
					waitFor(clientSocket, "error").then((value) => {
						expect(value).toEqual("Game event must have an iteration");
						resolve();
					});
				});

				clientSocket.emit(
					"game:event",
					{ ...sampleTestGameEvent, iteration: undefined },
					sampleTestPlayerDetails
				);
			});
		});

		it("should be able to emit an event with iteration 0", async () => {
			const waitForServerPromise = waitFor(serverSocket, "game:event");
			const waitForClientPromise = waitFor(clientSocket, "game:event");
			gameHandler.onEmitGameEvent(mocked);

			clientSocket.emit(
				"game:event",
				sampleTestGameAccessDetails,
				{ ...sampleTestGameEvent, iteration: 0 },
				sampleTestPlayerDetails
			);

			await waitForServerPromise;
			await waitForClientPromise;
			expect(mocked).toHaveBeenCalledTimes(1);
		});

		it("should receive the events created from client side to itself once", async () => {
			const waitForServerPromise = waitFor(serverSocket, "game:event");
			const waitForClientPromise = waitFor(clientSocket, "game:event");
			gameHandler.onEmitGameEvent(mocked);

			clientSocket.emit(
				"game:event",
				sampleTestGameAccessDetails,
				sampleTestGameEvent,
				sampleTestPlayerDetails
			);

			await waitForServerPromise;
			await waitForClientPromise;
			expect(mocked).toHaveBeenCalledTimes(1);
		});
	});

	describe("Leave game", () => {
		const leaveGameFn = async (gameAccess: TestGameAccessDetails) => {};
		let mocked = vi.fn().mockImplementation(leaveGameFn);

		beforeEach(() => {
			mocked.mockReset();
		});

		it("should be able to leave a game", () => {
			return new Promise<void>((resolve) => {
				gameHandler.onLeaveGame(mocked);

				waitFor(serverSocket, "game:leave").then(() => {
					expect(mocked).toHaveBeenCalled();
					expect(mocked).toHaveBeenCalledWith(
						sampleTestGameAccessDetails,
						sampleTestPlayerDetails
					);
					waitFor(clientSocket, "game:left").then(() => {
						resolve();
					});
				});

				clientSocket.emit(
					"game:leave",
					sampleTestGameAccessDetails,
					sampleTestPlayerDetails
				);
			});
		});

		it("shouldn't be able to leave a game with an invalid token", () => {
			return new Promise<void>((resolve) => {
				gameHandler.onLeaveGame(mocked);
				gameHandler.setValidateToken(
					async (token: string) => token === "secretpassword"
				);

				const testToken: string = "testToken";
				const serverSocket = gameHandler._mostRecentSocket;

				waitFor(serverSocket, "game:leave").then(() => {
					expect(mocked).not.toHaveBeenCalled();
					waitFor(clientSocket, "error").then(() => {
						resolve();
					});
				});

				clientSocket.emit(
					"game:leave",
					{ ...sampleTestGameAccessDetails, token: testToken },
					sampleTestPlayerDetails
				);
			});
		});

		it("should throw an error if the game has no id", () => {
			return new Promise<void>((resolve) => {
				gameHandler.onLeaveGame(mocked);

				const serverSocket = gameHandler._mostRecentSocket;

				waitFor(serverSocket, "game:leave").then(() => {
					expect(mocked).not.toHaveBeenCalled();
					waitFor(clientSocket, "error").then((value) => {
						expect(value).toEqual("Game must have an id");
						resolve();
					});
				});

				clientSocket.emit(
					"game:leave",
					{ ...sampleTestGameAccessDetails, gameId: undefined },
					sampleTestPlayerDetails
				);
			});
		});

		it("should throw an error if the player has no id", () => {
			return new Promise<void>((resolve) => {
				gameHandler.onLeaveGame(mocked);

				const serverSocket = gameHandler._mostRecentSocket;

				waitFor(serverSocket, "game:leave").then(() => {
					expect(mocked).not.toHaveBeenCalled();
					waitFor(clientSocket, "error").then((value) => {
						expect(value).toEqual("Player must have an id");
						resolve();
					});
				});

				clientSocket.emit("game:leave", sampleTestGameAccessDetails, {
					...sampleTestPlayerDetails,
					playerId: undefined,
				});
			});
		});
	});

	it("should emit an error if the socket emits an unknown event", () => {
		return new Promise<void>((resolve) => {
			const serverSocket = gameHandler._mostRecentSocket;

			waitFor(serverSocket, "unknown:event").then(() => {
				waitFor(clientSocket, "error").then((value) => {
					expect(value).toEqual("Invalid event");
					resolve();
				});
			});

			clientSocket.emit("unknown:event");
		});
	});

	it("should emit an error if the handler throws an error", () => {
		return new Promise<void>((resolve) => {
			const serverSocket = gameHandler._mostRecentSocket;

			waitFor(serverSocket, "game:create").then(() => {
				waitFor(clientSocket, "error").then((value) => {
					expect(value).toEqual("Error while handling event");
					resolve();
				});
			});

			gameHandler.onCreateGame(() => {
				throw new Error("Test error");
			});
			clientSocket.emit(
				"game:create",
				{...sampleTestGameDetails, gameId: "handlerError"},
				sampleTestPlayerDetails,
				sampleTestToken
			);
		});
	});

	/* it("should work with an acknowledgement", () => {
		return new Promise<void>((resolve) => {
			serverSocket.on("hi", (cb) => {
				cb("hola");
			});
			clientSocket.emit("hi", (arg: any) => {
				expect(arg).toEqual("hola");
				resolve();
			});
		});
	});

	it("should work with emitWithAck()", async () => {
		serverSocket.on("foo", (cb) => {
			cb("bar");
		});
		const result = await clientSocket.emitWithAck("foo");
		expect(result).toEqual("bar");
	});

	it("should work with waitFor()", () => {
		clientSocket.emit("baz");

		return waitFor(serverSocket, "baz");
	}); */
});

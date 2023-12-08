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

import { GameHandler, GameState } from "../GameHandlers";

function waitFor(socket: ServerSocket | ClientSocket | null, event: string) {
	return new Promise((resolve, reject) => {
		if (!socket) {
			reject("Socket is null");
		}
		socket?.once(event, resolve);
	});
}

interface TestGameDetails {
	gameId: string;
	iteration: number;
	state: GameState;
  hostToken: string;
}

interface TestGameAccessDetails {
	gameId: string;
	token: string;
}

interface TestPlayerDetails {
	playerId: string;
}

interface TestGameEvent {
	gameId: string;
	iteration: number;
}

const sampleTestToken: string = "testToken";

const sampleTestGameDetails: TestGameDetails = {
	gameId: "testGame",
	iteration: 1,
	state: "waitingForPlayers",
  hostToken: sampleTestToken,
};

const sampleTestPlayerDetails: TestPlayerDetails = {
	playerId: "testPlayer",
};


const sampleTestGameAccessDetails: TestGameAccessDetails = {
	gameId: "testGame",
	token: sampleTestToken,
};

const sampleTestGameEvent: TestGameEvent = {
	gameId: "testGame",
	iteration: 1,
};

describe("Game functions", () => {
	let serverSocket: Socket | null = null,
		clientSocket: ClientSocket,
		gameHandler: GameHandler<
			TestGameDetails,
			TestPlayerDetails,
			TestGameEvent,
			string,
			TestGameAccessDetails
		>;

	beforeAll(() => {
		return new Promise((resolve) => {
			const httpServer = createServer();
			const tokenValidator = async () => {
				return true;
			};
			gameHandler = new GameHandler(httpServer, tokenValidator);

			httpServer.listen(() => {
				const port = (httpServer.address() as AddressInfo).port;
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
    const startGameFn = async (
      gameAccess: TestGameAccessDetails
    ) => {};
    let mocked = vi.fn().mockImplementation(startGameFn);

    beforeEach(() => {
      mocked.mockReset();
    });

    it("should be able to start a game", () => {
      return new Promise<void>((resolve) => {
        gameHandler.onStartGame(mocked);

        waitFor(serverSocket, "game:start").then(() => {
          expect(mocked).toHaveBeenCalled();
          expect(mocked).toHaveBeenCalledWith(
            sampleTestGameAccessDetails
          );
          waitFor(clientSocket, "game:started").then(() => {
            resolve();
          });
        });

        clientSocket.emit(
          "game:start",
          sampleTestGameAccessDetails
        );
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

        clientSocket.emit(
          "game:start",
          sampleTestGameAccessDetails,
          testToken
        );
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

  });

  describe("Finish game", () => {
    const finishGameFn = async (
      gameAccess: TestGameAccessDetails
    ) => {};
    let mocked = vi.fn().mockImplementation(finishGameFn);

    beforeEach(() => {
      mocked.mockReset();
    });

    it("should be able to finish a game", () => {
      return new Promise<void>((resolve) => {
        gameHandler.onFinishGame(mocked);

        waitFor(serverSocket, "game:finish").then(() => {
          expect(mocked).toHaveBeenCalled();
          expect(mocked).toHaveBeenCalledWith(
            sampleTestGameAccessDetails
          );
          waitFor(clientSocket, "game:finished").then(() => {
            resolve();
          });
        });

        clientSocket.emit(
          "game:finish",
          sampleTestGameAccessDetails
        );
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

        const serverSocket = gameHandler._mostRecentSocket;

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
    const emitGameEventFn = async (
      gameEvent: TestGameEvent
    ) => {};
    let mocked = vi.fn().mockImplementation(emitGameEventFn);

    beforeEach(() => {
      mocked.mockReset();
    });

    it("should be able to emit a game event", () => {
      return new Promise<void>((resolve) => {
        gameHandler.onEmitGameEvent(mocked);

        waitFor(serverSocket, "game:event").then(() => {
          expect(mocked).toHaveBeenCalled();
          expect(mocked).toHaveBeenCalledWith(
            sampleTestGameEvent
          );
          waitFor(clientSocket, "game:event").then(() => {
            resolve();
          });
        });

        clientSocket.emit(
          "game:event",
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
          sampleTestGameEvent,
          testToken
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
          { ...sampleTestGameEvent, gameId: undefined },
          sampleTestToken
        );
      });
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
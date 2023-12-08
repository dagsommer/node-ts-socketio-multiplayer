import http from "http";
import { GameState, setupGame } from "./GameHandlers";

const server = http.createServer();
const port = process.env.PORT || 8000;

setupGame({
  httpServer: server,
  createGame: async (game, player, token) => {
    console.log(`Game Created with ${game}, ${player}, ${token}`)
    console.log(game, player, token);
  },
  joinGame: async (gameAccess, player) => {
    console.log(gameAccess, player);
  },
  startGame: async (gameAccess) => {
    console.log(gameAccess);
  },
  emitGameEvent: async (gameEvent) => {
    console.log(gameEvent);
  },
  finishGame: async (gameAccess) => {
    console.log(gameAccess);
  },
  leaveGame: async (gameAccess) => {
    console.log(gameAccess);
  },
  validateToken: async (token, action) => {
    console.log(token, action);
    return true;
  },
  getGameState: async (gameId: string) => {
    return {
      gameId: gameId,
      iteration: 1,
      state: 'waitingForPlayers',
    };
  },
  setGameState: async (state) => {
    console.log(state);
  },
});

server.listen(port, () => {
	console.log(`Server is live at http://localhost:${port}`);
});

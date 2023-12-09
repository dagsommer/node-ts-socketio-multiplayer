import http from "http";
import { GameState, GameHandler, GameAction } from "./GameHandlers";

const server = http.createServer();
const port = process.env.PORT || 8000;

const tokenValidator = async (token: string, gameId: string, action: GameAction) => {
  return true;
}

const gameHandler = new GameHandler(server, tokenValidator);

gameHandler.onCreateGame(async (gameState, player, token) => {
  console.log("onCreateGame", gameState, player, token);
});

gameHandler.onJoinGame(async (gameAccess, player) => {
  console.log("onJoinGame", gameAccess, player);
});

gameHandler.onLeaveGame(async (gameAccess, player) => {
  console.log("onLeaveGame", gameAccess, player);
});

gameHandler.onEmitGameEvent(async (event, player) => {
  console.log("onEmitGameEvent", player, event);
})

gameHandler.onStartGame(async (gameAccess) => {
  console.log("onStartGame", gameAccess);
});


server.listen(port, () => {
	console.log(`Server is live at http://localhost:${port}`);
});

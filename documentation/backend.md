# Backend GameHandler Documentation

The `GameHandler` class in the backend manages game-related functionalities, including creating, joining, starting, and finishing games, as well as handling game events.

## Features

- **Game Creation**: Create new game sessions with detailed configurations.
- **Joining Games**: Players can join existing game sessions.
- **Starting and Finishing Games**: Control the flow of the game from starting to concluding a session.
- **Event Handling**: Emit and respond to various game-related events.
- **Error Handling**: Manage errors and invalid requests effectively.

## Setup and Initialization

```typescript
import { createServer } from "node:http";
import { GameHandler } from "path-to-GameHandler";

const httpServer = createServer();
const tokenValidator = async () => true; // Replace with actual token validation logic
const gameHandler = new GameHandler(httpServer, tokenValidator);
```

## Game Lifecycle

### Creating a Game

```typescript
gameHandler.onCreateGame(async (gameDetails, playerDetails, token) => {
  // Implement game creation logic
});
```

### Joining a Game

```typescript
gameHandler.onJoinGame(async (gameAccessDetails, playerDetails) => {
  // Implement game joining logic
});
```

### Starting a Game

```typescript
gameHandler.onStartGame(async (gameAccessDetails) => {
  // Implement game start logic
});
```

### Finishing a Game

```typescript
gameHandler.onFinishGame(async (gameAccessDetails) => {
  // Implement game finishing logic
});
```

### Handling Game Events

```typescript
gameHandler.onEmitGameEvent(async (gameEvent) => {
  // Implement game event handling logic
});
```

## Error Handling

Any error thrown by you in the `onCreateGame`, `onJoinGame`, `onStartGame`, `onFinishGame`, or `onEmitGameEvent` callbacks will be caught and handled by the `GameHandler` class. The error will be sent to the client in an "error" event.


---

This documentation provides an overview of the `GameHandler` class functionalities. Adapt and expand based on your specific implementation and requirements.

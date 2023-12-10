# useGameHandlerClient Hook

The `useGameHandlerClient` hook provides functionalities to handle client-side game logic in a real-time multiplayer game environment. It leverages WebSockets (via Socket.io) for real-time communication.

## Features

- **Connection Management**: Connect and disconnect from the game server.
- **Game Lifecycle**: Create, join, leave, and start games.
- **Event Handling**: Emit and listen for game-related events.
- **Game State Management**: Track the current state of the game, player details, and host status.

## Usage

### Connecting to the Server

````javascript
const { connect, disconnect } = useGameHandlerClient();

// Connect to the server
connect(serverUrl);

// Disconnect from the server
disconnect();

## Creating a Game

```javascript
const { createGame, onGameCreated, currentGameId, currentPlayer, isHost, currentGameState } = useGameHandlerClient();

// Create a new game
createGame(gameDetails, playerDetails, token);

// Listen for game creation events
onGameCreated((game) => {
  // Handle game creation
});

// Access the current game ID, player details, host status, and game state
console.log(currentGameId, currentPlayer, isHost, currentGameState);
````

### Joining a Game

```javascript
const { joinGame, onGameJoined } = useGameHandlerClient();

// Join an existing game
joinGame(gameAccessDetails, playerDetails);

// Listen for game join events
onGameJoined((gameId) => {
	// Handle game join
});
```

### Leaving a Game

```javascript
const { leaveGame } = useGameHandlerClient();

// Leave the current game
leaveGame(gameAccessDetails);
```

### Emitting a game event

```javascript
const { emitGameEvent } = useGameHandlerClient();

// Emit a game-related event
emitGameEvent(gameEvent);
```

### Listening for game events

```javascript
const { onGameEvent } = useGameHandlerClient();

// Listen for game-related events
onGameEvent((event) => {
  // Handle game event
});
```

### Starting a Game

```javascript
const { startGame } = useGameHandlerClient();

// Start the game
startGame(gameAccessDetails);
```

### Handling game start/finish events

```javascript
const { currentGameState } = useGameHandlerClient();

// The `currentGameState` is updated when the game starts or finishes
```

## Installation
To use the useGameHandlerClient hook in your project, install the required dependencies:
```bash
npm install --save socketio-multiplayer-lib
```

Then, import the hook from its module:
```typescript
import { useGameHandlerClient } from 'socketio-multiplayer-lib';
```

## Notes
* Ensure that the server URL is correctly specified when connecting.
* Handle all lifecycle events appropriately to maintain the game's state.
* Use the hook within a React functional component or custom hook.
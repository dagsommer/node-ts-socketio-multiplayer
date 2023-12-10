# socketio-multiplayer-lib
A library to simplify the backend for a multiplayer game using Socket.io

## Pre-requisites
- Node.js
- NPM (or Yarn, or PNPM)

## Installation
```bash
npm install --save socketio-multiplayer-lib
```

## Example usage

The library uses a `GameHandler` class to manage the game state and the socket connections. The `GameHandler` class is generic, and allows you to specify the type of the game state, and more, as long as it implements the minimal interface.



```typescript
import { GameHandler } from 'socketio-multiplayer-lib';




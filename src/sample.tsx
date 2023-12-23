"use client";
import { useEffect, useRef, useState } from "react";
import { useGameHandlerClient } from "./hooks/useGameHandlerClient";
import {
	MinimumGameAccessDetails,
	MinimumGameDetails,
	MinimumGameEvent,
	MinimumPlayerDetails,
} from "./types";
// make sure to update the imports to use the npm package instead of the local file
import React from "react";

interface Event {
	time: number;
	message: string;
}

interface GameEvent extends MinimumGameEvent {
	someRandomPayload: string;
}

const ExampleGame: React.FC = () => {
	const {
		connect,
		disconnect,
		currentGameId,
		currentPlayer,
		currentGameState,
		isHost,
		createGame,
		onGameCreated,
		joinGame,
		onGameJoined,
		leaveGame,
		emitGameEvent,
		onGameEvent,
		startGame,
		isConnected,
		onGameError,
	} = useGameHandlerClient<
		MinimumGameDetails,
		MinimumPlayerDetails,
		GameEvent,
		string | undefined,
		MinimumGameAccessDetails<string | undefined>
	>();
	const loadedRef = useRef(false);
	const [events, setEvents] = useState<Event[]>([]);
	const [joinGameId, setJoinGameId] = useState<string>("");
	const [token, setToken] = useState<string | undefined>(undefined);
	const [currentIteration, setCurrentIteration] = useState<number>(3);

	useEffect(() => {
		if (loadedRef.current) return;
		connect("http://localhost:8000/");
		loadedRef.current = true;
	}, [connect, isConnected]);

	useEffect(() => {
		if (token) return;
		const randomToken = Math.random().toString(36).substring(2, 15);
		setToken(randomToken);
	}, [token]);

	useEffect(() => {
		if (!isConnected) return;
		onGameCreated((gameId) => {
			console.log("game created", gameId);
			setEvents((events) => [
				...events,
				{
					time: Date.now(),
					message: "Game created!",
				},
			]);
		});
		onGameJoined((gameId) => {
			console.log("game joined", gameId);
			setEvents((events) => [
				...events,
				{
					time: Date.now(),
					message: "Game joined!",
				},
			]);
		});

		onGameEvent((event) => {
			console.log("game event", event);
			const { gameId, iteration, someRandomPayload } = event;

			if (iteration < currentIteration) {
				console.log(
					`Got event with iteration ${iteration}, but current iteration is ${currentIteration}. Ignoring event.`
				);
				return;
			}

			if (iteration > currentIteration) {
				setCurrentIteration(iteration);

				setEvents((events) => [
					...events,
					{
						time: Date.now(),
						message: "(new iteration) Game event: " + JSON.stringify(event),
					},
				]);
				return;
			}

			setEvents((events) => [
				...events,
				{
					time: Date.now(),
					message: "Game event: " + JSON.stringify(event),
				},
			]);
		});

		onGameError((error) => {
			console.log("game error", error);
			setEvents((events) => [
				...events,
				{
					time: Date.now(),
					message: "Game error: " + JSON.stringify(error),
				},
			]);
		});
	}, [
		connect,
		onGameCreated,
		onGameJoined,
		onGameEvent,
		onGameError,
		isConnected,
		currentIteration,
	]);

	const randomGameId = () => {
		return (
			Math.random().toString(36).substring(2, 15) +
			Math.random().toString(36).substring(2, 15)
		);
	};

	const randomPlayerIdReadable = () => {
		return Math.random().toString(36).substring(2, 15);
	};

	const createGameFn = () => {
		createGame(
			{ gameId: randomGameId(), iteration: 2, state: "waitingForPlayers" },
			{ playerId: randomPlayerIdReadable() },
			token
		);
	};

	const emitEvent =
		(newIteration: boolean = false) =>
		() => {
			if (!currentGameId) return;
			emitGameEvent(
				{
					gameId: currentGameId,
					token,
				},
				{
					gameId: currentGameId,
					iteration: newIteration ? currentIteration + 1 : currentIteration,
					someRandomPayload: randomPlayerIdReadable(),
				}
			);
			if (newIteration) setCurrentIteration(currentIteration + 1);
		};
	type BooleanLike = boolean | string | number | null | undefined;

	const When: React.FC<{ condition: BooleanLike; children: React.ReactNode }> = ({
		condition,
		children,
	}) => {
		return condition ? <>{children}</> : null;
	};

	return (
		<>
			<div>
				<h1>Example game</h1>
			</div>
			<When condition={currentGameId}>
				<p>Current game id: {currentGameId}</p>
				<p>Current game state: {currentGameState}</p>
				<div style={{
                    display: "flex",
                    gap: "1rem",
                }}>
					<When condition={isHost}>
						<button
							onClick={() =>
								startGame({
									gameId: currentGameId!,
									token,
								})
							}
						>
							Start spill
						</button>
					</When>
					<button onClick={emitEvent()}>Lag event</button>
					<button onClick={emitEvent(true)}>
						Create event with new iteration
					</button>
				</div>
				this is an example game
				<h2>Game history:</h2>
				{/*make with alternating backgrounds, like a list*/}
				<ul>
					{events.map((event, index) => (
						<li key={event.message + index}>{JSON.stringify(event)}</li>
					))}
				</ul>
			</When>
			<When condition={!currentGameId}>
				<button onClick={createGameFn}>Create game</button>
				<div style={{
                    display: "flex",
                    gap: "1rem",
                }}>
					<input
						placeholder="Game ID"
						value={joinGameId}
						onChange={(event) => setJoinGameId(event.currentTarget.value)}
					/>
					<button
						onClick={() =>
							joinGame({ gameId: joinGameId, token }, { playerId: "test" })
						}
					>
						Join game
					</button>
				</div>
			</When>
		</>
	);
};

export default ExampleGame;


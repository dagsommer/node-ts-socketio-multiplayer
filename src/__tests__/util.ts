export interface Onceable {
	once(event: string, callback: (...args: any[]) => void): void;
}

export function waitFor(socket: Onceable | null, event: string) {
	return new Promise((resolve, reject) => {
		if (!socket) {
			return reject("Socket is null");
		}
		socket.once(event, resolve);
	});
}

export const waitForWithMultipleArguments = (
	socket: Onceable | null,
	event: string
) => {
	return new Promise((resolve, reject) => {
		if (!socket) {
			return reject("Socket is null");
		}
		socket.once(event, (...args) => {
			resolve(args);
		});
	});
};

export const sleep = (ms: number) => {
	return new Promise((resolve) => setTimeout(resolve, ms));
};

export async function waitForCb(cb: Function, timeout = 1000) {
	const step = 300;
	let timeSpent = 0;
	let timedOut = false;

	while (true) {
		try {
			await sleep(step);
			timeSpent += step;
			cb();
			break;
		} catch {}
		if (timeSpent >= timeout) {
			timedOut = true;
			break;
		}
	}

	if (timedOut) {
		throw new Error("timeout");
	}
}

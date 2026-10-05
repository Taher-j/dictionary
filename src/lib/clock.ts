/** Returns the current time as epoch milliseconds. Injected so code that depends on time is testable. */
export type Clock = () => number;

export const systemClock: Clock = () => Date.now();

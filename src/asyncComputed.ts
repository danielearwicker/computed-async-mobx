import { promisedComputed, PromisedComputedValue } from "./promisedComputed";
import { throttledComputed } from "./throttledComputed"

/**
 * Composition of `promisedComputed` and `throttledComputed`, so performs
 * conversion of a promised value into a plain value and also waits for
 * the specified minimum delay before launching a new promise in response
 * to changes.
 * 
 * @param init Value to assume until the promise first resolves
 * @param delay Minimum time to wait between creating new promises
 * @param compute Evaluates to a promised or plain value
 * @param name (optional) For MobX debug purposes
 */
export function asyncComputed<T>(
    init: T,
    delay: number,
    compute: () => T | PromiseLike<T>, 
    name?: string
): PromisedComputedValue<T> {
    const throttled = throttledComputed(compute, delay, name);
    const promised = promisedComputed(init, throttled.get);

    return {
        get() { 
            return promised.get(); 
        },
        get busy() {
            return promised.busy;
        },
        getNonReactive() {
            return promised.getNonReactive();
        },
        refresh() {
            throttled.refresh();
        }
    };
}

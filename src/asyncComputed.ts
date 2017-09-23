import { promisedComputed, PromisedComputedValue } from "./promisedComputed";
import { throttledComputed } from "./throttledComputed"

/**
 * Composition of `promisedComputed` and `throttledComputed`, so performs
 * conversion of a promised value into a plain value and also waits for
 * the specified minimum delay before launching a new promise in response
 * to changes.
 * 
 * @param compute 
 * @param delay 
 * @param name 
 */
export function asyncComputed<T>(
    compute: () => T | PromiseLike<T>, 
    delay: number, 
    name?: string
): PromisedComputedValue<T> {
    
    return promisedComputed(throttledComputed(compute, delay, name).get);
}


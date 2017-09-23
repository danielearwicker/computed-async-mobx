import { computed } from "mobx"
import { promisedComputedInternal, PromisedComputedValue } from "./promisedComputed";
import { throttledComputed } from "./throttledComputed"
import { Getter } from "./Getter";

/**
 * DEPRECATED
 * 
 * The type returned by the `computedAsync` function. Represents the current `value`. Accessing 
 * the value inside a reaction will automatically listen to it, just like an `observable` or 
 * `computed`. The `busy` property is `true` when the asynchronous function is currently running.
 */
export interface ComputedAsyncValue<T> {
    /** The current value (observable) */
    readonly value: T;
    /** True if an async evaluation is in progress */
    readonly busy: boolean;
    /** True if Promise was rejected */
    readonly failed: boolean;
    /** The error from the rejected promise, or undefined */
    readonly error: any;
}

export interface ComputedAsyncOptions<T> {
    readonly init: T;
    readonly fetch: () => PromiseLike<T> | T;
    readonly delay?: number;
    readonly revert?: boolean;
    readonly name?: string;
    readonly error?: (error: any) => T;
    readonly rethrow?: boolean;
}

class ComputedAsync<T> implements ComputedAsyncValue<T> {

    private computation: Getter<PromiseLike<T> | T | undefined>;
    private promised: PromisedComputedValue<T>

    private lastValue: T | undefined;

    constructor(private options: ComputedAsyncOptions<T>) {
        
        if (options.delay) {
            this.computation = throttledComputed(options.fetch, options.delay);
        } else {
            this.computation = computed(options.fetch);
        }

        this.promised = promisedComputedInternal<T | undefined>(() => this.computation.get());
    }

    get busy() {
        return this.promised.busy;
    }

    @computed
    get failed() {
        try {
            this.promised.get();
            return false;
        } catch (x) {
            return true;
        }        
    }

    @computed
    get error() {
        try {
            this.promised.get();
            return undefined;
        } catch (x) {
            return x;
        }
    }

    private initializedValue() {
        this.lastValue = this.promised.get();
        return this.lastValue === undefined ? this.options.init : this.lastValue;
    }

    @computed
    get value(): T {
        if (this.promised.busy && this.options.revert) {
            return this.options.init;
        }

        if (this.options.rethrow) {
            return this.initializedValue();
        }

        try {
            return this.initializedValue();
        } catch (x) {
            if (this.options.error) {
                try {
                    return this.options.error(x);
                } catch (x) {
                    console.error(x);
                }
            }

            return this.lastValue === undefined ? this.options.init : this.lastValue;
        }
    }
}

/**
 * DEPRECATED - prefer `asyncComputed`, see https://github.com/danielearwicker/computed-async-mobx 
 */
export function computedAsync<T>(
    init: T,
    fetch: () => PromiseLike<T> | T,
    delay?: number): ComputedAsyncValue<T>;

/**
 * DEPRECATED - prefer `asyncComputed`, see https://github.com/danielearwicker/computed-async-mobx 
 */
export function computedAsync<T>(
    options: ComputedAsyncOptions<T>
): ComputedAsyncValue<T>;

export function computedAsync<T>(
    init: T | ComputedAsyncOptions<T>,
    fetch?: () => PromiseLike<T> | T,
    delay?: number
) {
    if (arguments.length === 1) {
        return new ComputedAsync<T>(init as ComputedAsyncOptions<T>);
    }

    return new ComputedAsync<T>({
        init: init as T,
        fetch: fetch!,
        delay
    });
}

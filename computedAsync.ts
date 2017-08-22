import { computed, /*Atom, autorunAsync, autorun, observable, action*/ } from "mobx"
import { fromPromise, IPromiseBasedObservable, isPromiseBasedObservable } from "mobx-utils";

export function isPromiseLike<T>(result: PromiseLike<T>|T): result is PromiseLike<T> {
    return result && typeof (result as any).then === "function";
}

/**
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

type PromiseResult<T> = { ok: true; value: T } | { ok: false; error: any };

function value<T>(value: T): PromiseResult<T> {
    return { ok: true, value };
}

function error<T>(error: any): PromiseResult<T> {
    return { ok: false, error };
}

class ComputedAsync<T> implements ComputedAsyncValue<T> {

    private cachedValue: T;
    
    @computed
    private get currentState(): IPromiseBasedObservable<PromiseResult<T>> | T {

        const promiseOrValue = this.options.fetch();

        return isPromiseLike(promiseOrValue)
            ? fromPromise(promiseOrValue.then(value, e => error<T>(e)))
            : promiseOrValue;
    }

    constructor(private options: ComputedAsyncOptions<T>) {
        this.cachedValue = options.init;
    }

    @computed
    get busy() {
        const s = this.currentState;
        return isPromiseBasedObservable(s) && s.state === "pending";
    }

    @computed
    get failed() {
        const s = this.currentState;
        return isPromiseBasedObservable(s) && s.state === "fulfilled" && !s.value.ok;
    }

    @computed
    get error() {
        const s = this.currentState;
        return isPromiseBasedObservable(s) && s.state === "fulfilled" && !s.value.ok
            ? s.value.error : undefined;
    }

    @computed
    get value(): T {
        const s = this.currentState;
        if (!isPromiseBasedObservable(s)) {
            return s;
        }

        if (s.state === "pending") {
            return this.options.revert ? this.options.init : this.cachedValue;
        }

        if (s.state === "rejected") {
            throw new Error("Unexpected");
        }

        if (!s.value.ok) {
            if (this.options.rethrow) {
                throw s.value;
            }

            if (this.options.error) {
                try {
                    return this.options.error(s.value.error);
                }
                catch (x) {
                    console.error(x);
                }
            }

            return this.options.init;
        }

        this.cachedValue = s.value.value;
        return this.cachedValue;
    }
}

export function computedAsync<T>(
    init: T,
    fetch: () => PromiseLike<T> | T,
    delay?: number): ComputedAsyncValue<T>;

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

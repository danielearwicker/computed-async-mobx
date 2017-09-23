import { computed, extras } from "mobx"
import { fromPromise, IPromiseBasedObservable, isPromiseBasedObservable } from "mobx-utils";
import { Getter } from "./Getter";

export function isPromiseLike<T>(result: PromiseLike<T>|T): result is PromiseLike<T> {
    return result && typeof (result as any).then === "function";
}

/**
 * PromisedComputedValue
 */
export interface PromisedComputedValue<T> extends Getter<T | undefined> {
    /** True if the promise is currently resolving */
    readonly busy: boolean;
}

type PromiseResult<T> = { ok: true; value: T } | { ok: false; error: any };

function value<T>(value: T): PromiseResult<T> {
    return { ok: true, value };
}

function error<T>(error: any): PromiseResult<T> {
    return { ok: false, error };
}

class PromisedComputed<T> implements PromisedComputedValue<T> {

    private cached: PromiseResult<T> | undefined;

    @computed
    private get currentState(): IPromiseBasedObservable<PromiseResult<T>> | PromiseResult<T> {

        try {
            const promiseOrValue = this.fetch();

            return isPromiseLike(promiseOrValue)
                ? fromPromise(promiseOrValue.then(value, e => error<T>(e)))
                : value(promiseOrValue);

        } catch (x) {
            return error<T>(x);
        }
    }

    constructor(
        private readonly fetch: () => PromiseLike<T> | T, 
        private disableReactionChecking?: boolean) { }

    @computed
    get busy() {
        const s = this.currentState;
        return !!(isPromiseBasedObservable(s) && s.state === "pending");
    }

    get() {
        if (!this.disableReactionChecking && 
            !extras.getGlobalState().isRunningReactions) {
            throw new Error("promisedComputed must be used inside reactions");
        }
        
        return this.value;
    }

    @computed
    private get value(): T | undefined {
        const s = this.currentState;

        const r = !isPromiseBasedObservable(s) ? s :
                s.state === "fulfilled" ? s.value :
                this.cached;

        if (!r) {
            return undefined;
        }

        this.cached = r;

        if (r.ok) {
            return r.value;
        }

        throw r.error;
    }
}

export function promisedComputed<T>(fetch: () => PromiseLike<T> | T): PromisedComputedValue<T> {
    return new PromisedComputed<T>(fetch);
}

export function promisedComputedInternal<T>(fetch: () => PromiseLike<T> | T): PromisedComputedValue<T> {
    return new PromisedComputed<T>(fetch, true);
}

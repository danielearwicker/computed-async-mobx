import { computed, action, observable, runInAction, autorun } from "mobx"
import { getGlobalState, makeObservable } from "./mobxShim";
import { fromPromise, IPromiseBasedObservable, isPromiseBasedObservable } from "mobx-utils";
import { Getter } from "./Getter";

export function isPromiseLike<T>(result: PromiseLike<T>|T): result is PromiseLike<T> {
    return result && typeof (result as any).then === "function";
}

/**
 * PromisedComputedValue
 */
export interface PromisedComputedValue<T> extends Getter<T> {
    /** True if the promise is currently resolving */
    readonly busy: boolean;

    refresh(): void;

    getNonReactive(): T;
}

type PromiseResult<T> = { ok: true; value: T } | { ok: false; error: any };

function value<T>(value: T): PromiseResult<T> {
    return { ok: true, value };
}

function error<T>(error: any): PromiseResult<T> {
    return { ok: false, error };
}

class PromisedComputed<T> implements PromisedComputedValue<T> {

    private cached: PromiseResult<T>;
    
    @observable
    private refreshCallCount!: number;
    
    @computed
    private get currentState(): IPromiseBasedObservable<PromiseResult<T>> | PromiseResult<T> {

        try {
            this.refreshCallCount;
            const promiseOrValue = this.fetch();

            return isPromiseLike(promiseOrValue)
                ? fromPromise(promiseOrValue.then(value, e => error<T>(e)))
                : value(promiseOrValue);

        } catch (x) {
            return error<T>(x);
        }
    }

    constructor(init: T, private readonly fetch: () => PromiseLike<T> | T) { 

        runInAction(() => this.refreshCallCount = 0);

        makeObservable(this, {
            refreshCallCount: observable,
            currentState: computed,
            busy: computed,
            refresh: action,
            value: computed
        });

        this.cached = value(init);
    }

    @computed
    get busy() {
        const s = this.currentState;
        return !!(isPromiseBasedObservable(s) && s.state === "pending");
    }

    @action
    refresh() {
        this.refreshCallCount++;
    }

    get() {
        if (!getGlobalState().trackingDerivation) {
            throw new Error("promisedComputed must be used inside reactions");
        }
        
        return this.value;
    }

    /**
     * This exists purely to support scenarios such as unit tests that
     * want to verify the most recent value outside of a reactive context
     */
    getNonReactive() {
        let result: T = undefined!;
        autorun(() => result = this.get())();
        return result;
    }

    @computed
    private get value(): T {
        const s = this.currentState;

        const r = !isPromiseBasedObservable(s) ? s :
                s.state === "fulfilled" ? s.value :
                this.cached;

        this.cached = r;

        if (r.ok) {
            return r.value;
        }

        throw r.error;
    }
}

/**
 * Similar to the standard computed, except that it converts promises into
 * plain values, unwrapping them when they resolve and updating to the new
 * value. The supplied function may return a plain value in which case the
 * update is entirely synchronous like standard computed.
 * 
 * As with the standard computed, exceptions (and rejected promises) are
 * propagated as re-thrown exceptions. To avoid this, perform your own 
 * error handling in your supplied function.
 * 
 * @param init Value to assume until the promise first resolves
 * @param compute Evaluates to a promised or plain value
 */
export function promisedComputed<T>(init: T, compute: () => PromiseLike<T> | T): PromisedComputedValue<T> {
    return new PromisedComputed<T>(init, compute);
}

import { Atom, autorunAsync, observable, action } from "mobx"

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
    readonly fetch: () => Promise<T>;
    readonly delay?: number;
    readonly revert?: boolean;
    readonly name?: string;
    readonly error?: (error: any) => T
}

class ComputedAsync<T> implements ComputedAsyncValue<T> {

    private atom: Atom;
    private cachedValue: T;
    private version = 0;
    private monitor: undefined | (() => void);
    
    constructor(private options: ComputedAsyncOptions<T>) {
        this.atom = new Atom(options.name || "ComputedAsync", () => this.wake(), () => this.sleep());
        this.cachedValue = options.init;
    }

    private wake() {
        
        this.sleep();
        
        this.monitor = autorunAsync(() => {

            const thisVersion = ++this.version;

            if (this.options.revert) {                
                this.cachedValue = this.options.init;
                this.atom.reportChanged();
            }

            const current = <T>(f: (arg: T) => void) => (arg: T) => {
                if (this.version === thisVersion) f(arg);
            };

            this.starting();

            this.options.fetch().then(current((v: T) => {
                this.stopped(false, undefined, v);                
            })).catch(current((e: any) => {

                let newValue = this.options.init;

                if (this.options.error) {
                    try {
                        newValue = this.options.error(e);
                    }
                    catch (x) {
                        console.error(x);                        
                    }
                }
                
                this.stopped(true, e, newValue);
            }));

        }, this.options.delay);
    }

    @observable busy = false;
    @observable failed = false;
    @observable error: any;

    @action private starting() {
        this.busy = true;
    }

    @action private stopped(f: boolean, e: any, v: T) {
        this.busy = false;
        this.failed = f;
        this.error = e;

        if (v !== this.cachedValue) {
            this.cachedValue = v;
            this.atom.reportChanged();            
        }
    }

    private sleep() {
        
        const monitor = this.monitor;
        this.monitor = undefined;
        
        if (monitor) {
            monitor();
        }
    }

    get value() {
        this.atom.reportObserved();
        return this.cachedValue;        
    }
}

export function computedAsync<T>(
    init: T,
    fetch: () => Promise<T>,
    delay?: number): ComputedAsyncValue<T>;

export function computedAsync<T>(
    options: ComputedAsyncOptions<T>
): ComputedAsyncValue<T>;

export function computedAsync<T>(
    init: T | ComputedAsyncOptions<T>,
    fetch?: () => Promise<T>,
    delay?: number
) {
    if (arguments.length === 1) {
        return new ComputedAsync<T>(init as ComputedAsyncOptions<T>);
    }

    return new ComputedAsync<T>({
        init: init as T,
        fetch: fetch as () => Promise<T>,
        delay
    });
}

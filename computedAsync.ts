import { Atom, autorunAsync, observable } from "mobx"

export interface ComputedAsyncValue<T> {
    readonly value: T;
    readonly busy: boolean;
}

export interface ComputedAsyncOptions<T> {
    readonly init: T;
    readonly fetch: () => Promise<T>;
    readonly delay?: number;
    readonly revert?: boolean;
    readonly name?: string;
}

class ComputedAsync<T> implements ComputedAsyncValue<T> {

    private atom: Atom;
    private cachedValue: T;
    private version = 0;
    private monitor: undefined | (() => void);
    private busyState = observable<boolean>(false);
    
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

            this.busyState.set(true);

            this.options.fetch().then(v => {

                if (this.version === thisVersion) {
                    this.cachedValue = v;
                    this.busyState.set(false);
                    this.atom.reportChanged();
                }
            });

        }, this.options.delay);
    }

    private sleep() {
        
        const monitor = this.monitor;
        this.monitor = undefined;
        
        if (monitor) {
            monitor();
        }
    }

    get value() {
        return this.atom.reportObserved() ? this.cachedValue : this.options.init;
    }

    get busy() {
        return this.busyState.get();
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

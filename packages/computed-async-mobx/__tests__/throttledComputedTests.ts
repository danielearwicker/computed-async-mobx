import { testStrictness, waitForLength, Obs, delay } from "../test-helpers";
import { observable, runInAction, autorun } from "mobx"
import { throttledComputed } from "../src/index"

function getInsideReaction<T>(getter: () => T) {

    let result: T = undefined!;

    const stop = autorun(() => {
        result = getter();
    });

    stop();

    return result;
}

testStrictness("throttledComputed - not synchronous at first", async () => {
    
    const o = observable({ x: 1, y: 2 });

    const r = throttledComputed(42, 50, () => o.x + o.y);

    expect(getInsideReaction(() => r.get())).toBe(42) // Initial value returned
    
    runInAction(() => o.x = 6);
    
    expect(getInsideReaction(() => r.get())).toBe(42) // Ditto
    
    const results: number[] = [];

    const stop = autorun(() => results.push(r.get()));

    expect(results).toEqual([42]);

    runInAction(() => o.x = 3);
    
    expect(results).toEqual([42]); // Reactive contexts don't see immediate changes
    
    await waitForLength(results, 2);
    
    expect(results).toEqual([42, 5]); // But do see delayed changes
    
    runInAction(() => o.x = 10);
    runInAction(() => o.x = 20);
    
    await waitForLength(results, 3);
    
    expect(results).toEqual([42, 5, 22]); // Changes are batched by throttling

    stop();
});

testStrictness("throttledComputed - propagates exceptions", async () => {
    
    const o = new Obs(false);

    const r = throttledComputed(2, 50, () => {
        if (o.get()) {
            throw new Error("Badness");
        }
        return 1;
    });

    expect(getInsideReaction(() => r.get())).toBe(2); // Initial value return

    const results: (number | string)[] = [];

    const stop = autorun(() => {
        try {
            results.push(r.get());
        } catch(x) {
            results.push(x.message);
        }        
    });

    expect(results).toEqual([2]);

    await waitForLength(results, 2);

    expect(results).toEqual([2, 1]);

    runInAction(() => o.set(true));
    
    expect(results).toEqual([2, 1]); // Reactive contexts don't see immediate changes
    
    await waitForLength(results, 3);
    
    expect(results).toEqual([2, 1, "Badness"]); // But do see delayed changes
    
    runInAction(() => o.set(false));
    runInAction(() => o.set(true));
    runInAction(() => o.set(false));
    
    await waitForLength(results, 4);
    
    expect(results).toEqual([2, 1, "Badness", 1]); // Changes are batched by throttling

    runInAction(() => o.set(true));
    await delay(1);
    runInAction(() => o.set(false));
    runInAction(() => o.set(true));

    await waitForLength(results, 5);
    
    expect(results).toEqual([2, 1, "Badness", 1, "Badness"]); // Changes are batched again
    
    stop();
});

testStrictness("throttledComputed - can be refreshed", async () => {
    
    let counter = 0;

    const r = throttledComputed(-1, 10, () => ++counter);

    const trace: (number)[] = [];
    const stop = autorun(() => trace.push(r.get()));

    expect(trace).toEqual([-1]); // Initial value appears synchronously

    r.refresh();

    expect(trace).toEqual([-1]); // Second value does NOT appear synchronously

    await waitForLength(trace, 2);

    expect(trace).toEqual([-1, 1]) // Second value appears asynchronously

    stop();
});

testStrictness("throttledComputed - non-reactive contexts see immediate value", async () => {
    
    let counter = 0;

    const r = throttledComputed(-1, 10, () => ++counter);

    expect(r.get()).toBe(1);
    expect(r.get()).toBe(2);

    r.refresh(); // has no effect outside reactive contexts

    expect(r.get()).toBe(3);
});

testStrictness("throttledComputed - non-reactive affects init value seen by reactive context", async () => {
    
    let counter = 0;

    const r = throttledComputed(-1, 10, () => ++counter);

    expect(r.get()).toBe(1);
    
    const trace: (number)[] = [];
    const stop = autorun(() => trace.push(r.get()));

    expect(trace).toEqual([1]);

    r.refresh();

    expect(trace).toEqual([1]); // Second value does NOT appear synchronously

    await waitForLength(trace, 2);

    expect(trace).toEqual([1, 2]) // Second value appears asynchronously

    stop();
});

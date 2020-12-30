import { testStrictness, waitForLength, Obs, delay } from "../test-helpers";
import { observable, runInAction, autorun } from "mobx"
import { promisedComputed } from "../src/index"

testStrictness("promisedComputed - can't be used outside of reactive contexts", async () => {
    
    const o = observable({ x: 1, y: 2 });

    const r = promisedComputed(undefined, async () => {
        const result = o.x + o.y;
        await delay(100);
        return result;
    });

    expect(() => r.get()).toThrowError(/inside reactions/);
});

testStrictness("promisedComputed - can use getNonReactive outside of reactive contexts", async () => {
    
    const o = observable({ x: 1, y: 2 });

    const r = promisedComputed(undefined, async () => {
        const result = o.x + o.y;
        await delay(100);
        return result;
    });

    expect(r.getNonReactive()).toBeUndefined();

    const stop = autorun(() => r.get());

    while (r.getNonReactive() === undefined) { 
        await delay(5);
    }

    stop();

    expect(r.getNonReactive()).toBe(3);
});

testStrictness("promisedComputed - transitions to new values", async () => {
    
    const o = observable({ x: 1, y: 2 });

    const r = promisedComputed(101, async () => {
        const result = o.x + o.y;
        await delay(10);
        return result;
    });

    const trace: (number)[] = [];
    const stop = autorun(() => trace.push(r.get()));

    expect(trace).toEqual([101]); // No new value until promise resolves

    await waitForLength(trace, 2);

    expect(trace).toEqual([101, 3]); // First proper value appears

    runInAction(() => o.x = 5);

    expect(trace).toEqual([101, 3]); // No value until promise resolves [2]

    await waitForLength(trace, 3);

    expect(trace).toEqual([101, 3, 7]); // Second value appears

    stop();
});

testStrictness("promisedComputed - busy property works by itself", async () => {
    
    const o = observable({ x: 1, y: 2 });

    const r = promisedComputed(undefined, async () => {
        const result = o.x + o.y;
        await delay(10);
        return result;
    });

    const trace: boolean[] = [];
    const stop = autorun(() => trace.push(r.busy));

    expect(trace).toEqual([true]); // Is initially busy

    await waitForLength(trace, 2);

    expect(trace).toEqual([true, false]); // Busy transitions to false
    
    runInAction(() => o.x = 5);

    expect(trace).toEqual([true, false, true]); // Synchronously transitions to true

    await waitForLength(trace, 4);

    expect(trace).toEqual([true, false, true, false]); // Second transition to false

    stop();
});

testStrictness("promisedComputed - busy property interleaves with value changes", async () => {
    
    const o = observable({ x: 1, y: 2 });

    const r = promisedComputed(undefined, async () => {
        const result = o.x + o.y;
        await delay(10);
        return result;
    });

    const trace: ({ 
        value: number | undefined, 
        busy: boolean
    })[] = [];

    const stop = autorun(() => trace.push({ value: r.get(), busy: r.busy }));

    expect(trace).toEqual([
        {value: undefined, busy: true}
    ]); // No value until promise resolves

    await waitForLength(trace, 2);

    expect(trace).toEqual([
        {value: undefined, busy: true},
        {value: 3, busy: false}
    ]); // Initial value appears

    runInAction(() => o.x = 5);

    expect(trace).toEqual([
        {value: undefined, busy: true},
        {value: 3, busy: false},
        {value: 3, busy: true}
    ]); // No value until promise resolves [2]

    await waitForLength(trace, 4);

    expect(trace).toEqual([
        {value: undefined, busy: true},
        {value: 3, busy: false},
        {value: 3, busy: true},
        {value: 7, busy: false}        
    ]); // Second value appears

    stop();
});

testStrictness("promisedComputed - propagates exceptions", async () => {
    
    const o = new Obs(false);

    const r = promisedComputed(101, async () => {
        const shouldThrow = o.get();

        await delay(10);

        if (shouldThrow) {
            throw new Error("Badness");
        }
        return 1;
    });

    const trace: (number | string)[] = [];

    const stop = autorun(() => {
        try {
            trace.push(r.get());
        } catch(x) {
            trace.push(x.message);
        }
    });

    expect(trace).toEqual([101]);

    await waitForLength(trace, 2);

    expect(trace).toEqual([101, 1]);
    
    runInAction(() => o.set(true));
    
    expect(trace).toEqual([101, 1]); // Reactive contexts don't seem immediate changes
    
    await waitForLength(trace, 3);
    
    expect(trace).toEqual([101, 1, "Badness"]); // But do see delayed changes
    
    runInAction(() => o.set(false));
    
    await waitForLength(trace, 4);
    
    expect(trace).toEqual([101, 1, "Badness", "Badness"]); // Transition to busy triggers new exception
  
    await waitForLength(trace, 5);
    
    expect(trace).toEqual([101, 1, "Badness", "Badness", 1]); // And reverts back to non-throwing
  
    stop();
});

testStrictness("promisedComputed - is fully synchronous if value is not a promise", async () => {
    
    const o = new Obs("sync");

    const r = promisedComputed("never", () => {
        const v = o.get();
        if (v === "throw") {
            throw new Error(v);
        }
        return v === "async" ? delay(10).then(() => v) : v; 
    });

    const trace: string[] = [];

    const stop = autorun(() => {
        try {
            trace.push(r.get() ?? "");
        } catch (x) {
            trace.push("error: " + x.message);
        }
    });

    expect(trace).toEqual(["sync"]); // Synchronously has value

    runInAction(() => o.set("sync2"));

    expect(trace).toEqual(["sync", "sync2"]); // Synchronously transitions

    runInAction(() => o.set("async"));
    
    expect(trace).toEqual(["sync", "sync2"]); // Does not immediately transition to promised value
    
    await waitForLength(trace, 3);

    expect(trace).toEqual(["sync", "sync2", "async"]); // Eventually transitions

    runInAction(() => o.set("throw"));
    
    expect(trace).toEqual(["sync", "sync2", "async", "error: throw"]); // Synchronously transitions to throwing

    runInAction(() => o.set("sync3"));

    expect(trace).toEqual(["sync", "sync2", "async", "error: throw", "sync3"]); // Synchronously transitions to normal

    stop();
});

testStrictness("promisedComputed - can be refreshed", async () => {
    
    let counter = 0;

    const r = promisedComputed(0, async () => {
        await delay(10);
        return ++counter;
    });

    const trace: (number)[] = [];
    const stop = autorun(() => trace.push(r.get()));

    expect(trace).toEqual([0]); // No new value until promise resolves

    await waitForLength(trace, 2);

    expect(trace).toEqual([0, 1]); // First proper value appears

    r.refresh();

    expect(trace).toEqual([0, 1]); // No value until promise resolves [2]

    await waitForLength(trace, 3);

    expect(trace).toEqual([0, 1, 2]); // Second value appears

    stop();
});

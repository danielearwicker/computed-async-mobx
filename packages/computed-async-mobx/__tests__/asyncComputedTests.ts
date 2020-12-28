import { testStrictness, waitForLength, Obs, delay } from "../test-helpers";
import { observable, runInAction, autorun } from "mobx"
import { asyncComputed } from "../src/index"

testStrictness("asyncComputed - can't be used outside of reactive contexts", async () => {
    
    const o = observable({ x: 1, y: 2 });

    const r = asyncComputed(undefined, 10, async () => {
        const result = o.x + o.y;
        await delay(100);
        return result;
    });

    expect(() => r.get()).toThrowError(/inside reactions/);
});

testStrictness("asyncComputed - can use getNonReactive outside of reactive contexts", async () => {
    
    const o = observable({ x: 1, y: 2 });

    const r = asyncComputed(undefined, 10, async () => {
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

testStrictness("asyncComputed - transitions to new values", async () => {
    
    const o = observable({ x: 1, y: 2 });

    const r = asyncComputed(99, 10, async () => {
        const result = o.x + o.y;
        await delay(10);
        return result;
    });

    const trace: (number | undefined)[] = [];
    const stop = autorun(() => trace.push(r.get()));

    expect(trace).toEqual([99]); // Init value until promise resolves

    await waitForLength(trace, 2);

    expect(trace).toEqual([99, 3]); // First real value appears

    runInAction(() => o.x = 5);

    expect(trace).toEqual([99, 3]) // No second value until promise resolves

    await waitForLength(trace, 3);

    expect(trace).toEqual([99, 3, 7]); // Second value appears

    stop();
});

testStrictness("asyncComputed - can be refreshed", async () => {
    
    let counter = 0;

    const r = asyncComputed(0, 10, async () => {
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

    expect(trace).toEqual([0, 1, 2]) // Second value appears

    stop();
});

testStrictness("asyncComputed - busy property works by itself", async () => {
    
    const o = observable({ x: 1, y: 2 });

    const r = asyncComputed(undefined, 10, async () => {
        const result = o.x + o.y;
        await delay(10);
        return result;
    });

    const trace: boolean[] = [];
    const stop = autorun(() => trace.push(r.busy));

    expect(trace).toEqual([false]); // Is not initially busy

    await waitForLength(trace, 2);

    expect(trace).toEqual([false, true]); // Busy transitions to true
    
    await waitForLength(trace, 3);

    expect(trace).toEqual([false, true, false]); // Busy transitions to false, completed
    
    runInAction(() => o.x = 5);

    expect(trace).toEqual([false, true, false]); // Doesn't synchronously transition to true, due to throttling

    await waitForLength(trace, 4);

    expect(trace).toEqual([false, true, false, true]); // Eventually transitions to true

    await waitForLength(trace, 5);

    expect(trace).toEqual([false, true, false, true, false]); // Second transition to false

    stop();
});

testStrictness("asyncComputed - busy property interleaves with value changes", async () => {
    
    const o = observable({ x: 1, y: 2 });

    const r = asyncComputed(99, 10, async () => {
        const result = o.x + o.y;
        await delay(10);
        return result;
    });

    const trace: ({ 
        value: number, 
        busy: boolean
    })[] = [];

    const stop = autorun(() => trace.push({ value: r.get(), busy: r.busy }));

    expect(trace).toEqual([ {value: 99, busy: false} ]);
        // No value until promise resolves, first execution starts async

    await waitForLength(trace, 2);

    expect(trace).toEqual([
        {value: 99, busy: false},
        {value: 99, busy: true}
    ]); // Initial value appears

    await waitForLength(trace, 3);

    expect(trace).toEqual([
        {value: 99, busy: false},
        {value: 99, busy: true},
        {value: 3, busy: false}
    ]); // Initial value appears

    runInAction(() => o.x = 5);

    expect(trace).toEqual([
        {value: 99, busy: false},
        {value: 99, busy: true},
        {value: 3, busy: false}
    ]); // No synchronous change in busy

    await waitForLength(trace, 4);

    expect(trace).toEqual([
        {value: 99, busy: false},
        {value: 99, busy: true},
        {value: 3, busy: false},
        {value: 3, busy: true}
    ]) // Eventually turns busy

    await waitForLength(trace, 5);

    expect(trace).toEqual([
        {value: 99, busy: false},
        {value: 99, busy: true},
        {value: 3, busy: false},
        {value: 3, busy: true},
        {value: 7, busy: false}        
    ]); // Second value appears

    stop();
});

testStrictness("asyncComputed - propagates exceptions", async () => {
    
    const o = new Obs(false);

    const r = asyncComputed("Init", 10, async () => {
        const shouldThrow = o.get();

        await delay(10);

        if (shouldThrow) {
            throw new Error("Badness");
        }
        return "Goodness";
    });

    const trace: (number | string | undefined)[] = [];

    const stop = autorun(() => {
        try {
            trace.push(r.get());
        } catch(x) {
            trace.push(x.message);
        }
    });

    expect(trace).toEqual(["Init"]);

    await waitForLength(trace, 2);

    expect(trace).toEqual(["Init", "Goodness"]);
    
    runInAction(() => o.set(true));
    
    expect(trace).toEqual(["Init", "Goodness"]); 
        //, "Reactive contexts don't seem immediate changes");
    
    await waitForLength(trace, 3);
    
    expect(trace).toEqual(["Init", "Goodness", "Badness"]); 
        //, "But do see delayed changes");
    
    runInAction(() => o.set(false));
    runInAction(() => o.set(true));
    runInAction(() => o.set(false));
    
    await waitForLength(trace, 4);
    
    expect(trace).toEqual(["Init", "Goodness", "Badness", "Badness"]); 
        //, "Change to busy makes us see another exception");

    await waitForLength(trace, 5);
    
    expect(trace).toEqual(["Init", "Goodness", "Badness", "Badness", "Goodness"]); 
        //, "Changes are batched by throttling");

    runInAction(() => o.set(true));
    await delay(1);
    runInAction(() => o.set(false));
    runInAction(() => o.set(true));

    await waitForLength(trace, 6);
    
    expect(trace).toEqual(["Init", "Goodness", "Badness", "Badness", "Goodness", "Badness"]); 
        //, "Changes are batched again");
    
    stop();
});


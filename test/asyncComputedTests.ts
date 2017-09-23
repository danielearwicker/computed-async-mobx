import * as test from "blue-tape";
import { testStrictness, waitForLength } from "./util";
import { delay } from "./delay";
import { observable, runInAction, autorun } from "mobx"
import { asyncComputed } from "../src/index"

testStrictness("asyncComputed - can't be used outside of reactive contexts", async (assert: test.Test) => {
    
    const o = observable({ x: 1, y: 2 });

    const r = asyncComputed(undefined, 10, async () => {
        const result = o.x + o.y;
        await delay(100);
        return result;
    });

    assert.throws(() => r.get(), /inside reactions/);
});

testStrictness("asyncComputed - transitions to new values", async (assert: test.Test) => {
    
    const o = observable({ x: 1, y: 2 });

    const r = asyncComputed(99, 10, async () => {
        const result = o.x + o.y;
        await delay(10);
        return result;
    });

    const trace: (number | undefined)[] = [];
    const stop = autorun(() => trace.push(r.get()));

    assert.deepEqual(trace, [99], "Init value until promise resolves");

    await waitForLength(trace, 2);

    assert.deepEqual(trace, [99, 3], "First real value appears");

    runInAction(() => o.x = 5);

    assert.deepEqual(trace, [99, 3], "No second value until promise resolves [2]");

    await waitForLength(trace, 3);

    assert.deepEqual(trace, [99, 3, 7], "Second value appears");

    stop();
});

testStrictness("asyncComputed - busy property works by itself", async (assert: test.Test) => {
    
    const o = observable({ x: 1, y: 2 });

    const r = asyncComputed(undefined, 10, async () => {
        const result = o.x + o.y;
        await delay(10);
        return result;
    });

    const trace: boolean[] = [];
    const stop = autorun(() => trace.push(r.busy));

    assert.deepEqual(trace, [true], "Is initially busy");

    await waitForLength(trace, 2);

    assert.deepEqual(trace, [true, false], "Busy transitions to false");
    
    runInAction(() => o.x = 5);

    assert.deepEqual(trace, [true, false], "Doesn't synchronously transition to true, due to throttling");

    await waitForLength(trace, 3);

    assert.deepEqual(trace, [true, false, true], "Eventually transitions to true");

    await waitForLength(trace, 4);

    assert.deepEqual(trace, [true, false, true, false], "Second transition to false");

    stop();
});

testStrictness("asyncComputed - busy property interleaves with value changes", async (assert: test.Test) => {
    
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

    assert.deepEqual(trace, [
        {value: 99, busy: true}
    ], "No value until promise resolves");

    await waitForLength(trace, 2);

    assert.deepEqual(trace, [
        {value: 99, busy: true},
        {value: 3, busy: false}
    ], "Initial value appears");

    runInAction(() => o.x = 5);

    assert.deepEqual(trace, [
        {value: 99, busy: true},
        {value: 3, busy: false}
    ], "No synchronous change in busy");

    await waitForLength(trace, 3);

    assert.deepEqual(trace, [
        {value: 99, busy: true},
        {value: 3, busy: false},
        {value: 3, busy: true}
    ], "Eventually turns busy");

    await waitForLength(trace, 4);

    assert.deepEqual(trace, [
        {value: 99, busy: true},
        {value: 3, busy: false},
        {value: 3, busy: true},
        {value: 7, busy: false}        
    ], "Second value appears");

    stop();
});

testStrictness("asyncComputed - propagates exceptions", async (assert: test.Test) => {
    
    const o = observable(false);

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

    assert.deepEqual(trace, ["Init"]);

    await waitForLength(trace, 2);

    assert.deepEqual(trace, ["Init", "Goodness"]);
    
    runInAction(() => o.set(true));
    
    assert.deepEqual(trace, ["Init", "Goodness"], "Reactive contexts don't seem immediate changes");
    
    await waitForLength(trace, 3);
    
    assert.deepEqual(trace, ["Init", "Goodness", "Badness"], "But do see delayed changes");
    
    runInAction(() => o.set(false));
    runInAction(() => o.set(true));
    runInAction(() => o.set(false));
    
    await waitForLength(trace, 4);
    
    assert.deepEqual(trace, ["Init", "Goodness", "Badness", "Badness"], "Change to busy makes us see another exception");

    await waitForLength(trace, 5);
    
    assert.deepEqual(trace, ["Init", "Goodness", "Badness", "Badness", "Goodness"], "Changes are batched by throttling");

    runInAction(() => o.set(true));
    await delay(1);
    runInAction(() => o.set(false));
    runInAction(() => o.set(true));

    await waitForLength(trace, 6);
    
    assert.deepEqual(trace, ["Init", "Goodness", "Badness", "Badness", "Goodness", "Badness"], "Changes are batched again");
    
    stop();
});


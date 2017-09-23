import * as test from "blue-tape";
import { testStrictness, waitForLength } from "./util";
import { delay } from "./delay";
import { observable, runInAction, autorun } from "mobx"
import { asyncComputed } from "../src/index"

testStrictness("asyncComputed - can't be used outside of reactive contexts", async (assert: test.Test) => {
    
    const o = observable({ x: 1, y: 2 });

    const r = asyncComputed(async () => {
        const result = o.x + o.y;
        await delay(100);
        return result;
    }, 10);

    assert.throws(() => r.get(), /inside reactions/);
});

testStrictness("asyncComputed - transitions to new values", async (assert: test.Test) => {
    
    const o = observable({ x: 1, y: 2 });

    const r = asyncComputed(async () => {
        const result = o.x + o.y;
        await delay(10);
        return result;
    }, 10);

    const trace: (number | undefined)[] = [];
    const stop = autorun(() => trace.push(r.get()));

    assert.deepEqual(trace, [undefined], "No value until promise resolves");

    await waitForLength(trace, 2);

    assert.deepEqual(trace, [undefined, 3], "Initial value appears");

    runInAction(() => o.x = 5);

    assert.deepEqual(trace, [undefined, 3], "No value until promise resolves [2]");

    await waitForLength(trace, 3);

    assert.deepEqual(trace, [undefined, 3, 7], "Second value appears");

    stop();
});

testStrictness("asyncComputed - busy property works by itself", async (assert: test.Test) => {
    
    const o = observable({ x: 1, y: 2 });

    const r = asyncComputed(async () => {
        const result = o.x + o.y;
        await delay(10);
        return result;
    }, 10);

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

    const r = asyncComputed(async () => {
        const result = o.x + o.y;
        await delay(10);
        return result;
    }, 10);

    const trace: ({ 
        value: number | undefined, 
        busy: boolean
    })[] = [];

    const stop = autorun(() => trace.push({ value: r.get(), busy: r.busy }));

    assert.deepEqual(trace, [
        {value: undefined, busy: true}
    ], "No value until promise resolves");

    await waitForLength(trace, 2);

    assert.deepEqual(trace, [
        {value: undefined, busy: true},
        {value: 3, busy: false}
    ], "Initial value appears");

    runInAction(() => o.x = 5);

    assert.deepEqual(trace, [
        {value: undefined, busy: true},
        {value: 3, busy: false}
    ], "No synchronous change in busy");

    await waitForLength(trace, 3);

    assert.deepEqual(trace, [
        {value: undefined, busy: true},
        {value: 3, busy: false},
        {value: 3, busy: true}
    ], "Eventually turns busy");

    await waitForLength(trace, 4);

    assert.deepEqual(trace, [
        {value: undefined, busy: true},
        {value: 3, busy: false},
        {value: 3, busy: true},
        {value: 7, busy: false}        
    ], "Second value appears");

    stop();
});

testStrictness("asyncComputed - propagates exceptions", async (assert: test.Test) => {
    
    const o = observable(false);

    const r = asyncComputed(async () => {
        const shouldThrow = o.get();

        await delay(10);

        if (shouldThrow) {
            throw new Error("Badness");
        }
        return 1;
    }, 10);

    const trace: (number | string | undefined)[] = [];

    const stop = autorun(() => {
        try {
            trace.push(r.get());
        } catch(x) {
            trace.push(x.message);
        }
    });

    assert.deepEqual(trace, [undefined]);

    await waitForLength(trace, 2);

    assert.deepEqual(trace, [undefined, 1]);
    
    runInAction(() => o.set(true));
    
    assert.deepEqual(trace, [undefined, 1], "Reactive contexts don't seem immediate changes");
    
    await waitForLength(trace, 3);
    
    assert.deepEqual(trace, [undefined, 1, "Badness"], "But do see delayed changes");
    
    runInAction(() => o.set(false));
    runInAction(() => o.set(true));
    runInAction(() => o.set(false));
    
    await waitForLength(trace, 4);
    
    assert.deepEqual(trace, [undefined, 1, "Badness", "Badness"], "Change to busy makes us see another exception");

    await waitForLength(trace, 5);
    
    assert.deepEqual(trace, [undefined, 1, "Badness", "Badness", 1], "Changes are batched by throttling");

    runInAction(() => o.set(true));
    await delay(1);
    runInAction(() => o.set(false));
    runInAction(() => o.set(true));

    await waitForLength(trace, 6);
    
    assert.deepEqual(trace, [undefined, 1, "Badness", "Badness", 1, "Badness"], "Changes are batched again");
    
    stop();
});


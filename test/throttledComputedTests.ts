import * as test from "blue-tape";
import { testStrictness, waitForLength, Obs } from "./util";
import { delay } from "./delay";
import { observable, runInAction, autorun } from "mobx"
import { throttledComputed } from "../src/index"

testStrictness("throttledComputed - synchronous at first", async (assert: test.Test) => {
    
    const o = observable({ x: 1, y: 2 });

    const r = throttledComputed(() => o.x + o.y, 50);

    assert.equal(r.get(), 3, "Initial computation is synchronous");

    runInAction(() => o.x = 5);
    
    assert.equal(r.get(), 7, "Subsequent computations outside reactive contexts are also synchronous");
    
    runInAction(() => o.x = 6);
    
    assert.equal(r.get(), 8, "Ditto");
    
    const results: number[] = [];

    const stop = autorun(() => results.push(r.get()));

    assert.deepEqual(results, [8]);

    runInAction(() => o.x = 3);
    
    assert.deepEqual(results, [8], "Reactive contexts don't seem immediate changes");
    
    await waitForLength(results, 2);
    
    assert.deepEqual(results, [8, 5], "But do see delayed changes");
    
    runInAction(() => o.x = 10);
    runInAction(() => o.x = 20);
    
    await waitForLength(results, 3);
    
    assert.deepEqual(results, [8, 5, 22], "Changes are batched by throttling");

    stop();
});

testStrictness("throttledComputed - propagates exceptions", async (assert: test.Test) => {
    
    const o = new Obs(false);

    const r = throttledComputed(() => {
        if (o.get()) {
            throw new Error("Badness");
        }
        return 1;
    }, 50);

    assert.equal(r.get(), 1, "Initial computation is synchronous");

    runInAction(() => o.set(true));
    
    assert.throws(() => r.get(), /Badness/, "Synchronously start throwing outside reactive context")

    runInAction(() => o.set(false));
    
    assert.equal(r.get(), 1, "Synchronously reverts to non-throwing outside reactive context");

    const results: (number | string)[] = [];

    const stop = autorun(() => {
        try {
            results.push(r.get());
        } catch(x) {
            results.push(x.message);
        }        
    });

    assert.deepEqual(results, [1]);

    runInAction(() => o.set(true));
    
    assert.deepEqual(results, [1], "Reactive contexts don't seem immediate changes");
    
    await waitForLength(results, 2);
    
    assert.deepEqual(results, [1, "Badness"], "But do see delayed changes");
    
    runInAction(() => o.set(false));
    runInAction(() => o.set(true));
    runInAction(() => o.set(false));
    
    await waitForLength(results, 3);
    
    assert.deepEqual(results, [1, "Badness", 1], "Changes are batched by throttling");

    runInAction(() => o.set(true));
    await delay(1);
    runInAction(() => o.set(false));
    runInAction(() => o.set(true));

    await waitForLength(results, 4);
    
    assert.deepEqual(results, [1, "Badness", 1, "Badness"], "Changes are batched again");
    
    stop();
});

testStrictness("throttledComputed - can be refreshed", async (assert: test.Test) => {
    
    let counter = 0;

    const r = throttledComputed(() => ++counter, 10);

    const trace: (number)[] = [];
    const stop = autorun(() => trace.push(r.get()));

    assert.deepEqual(trace, [1], "Initial value appears synchronously");

    r.refresh();

    assert.deepEqual(trace, [1, 2], "Second value appears synchronously");

    stop();
});
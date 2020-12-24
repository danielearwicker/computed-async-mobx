import test from "blue-tape";
import { testStrictness, waitForLength, Obs } from "./util";
import { delay } from "./delay";
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

testStrictness("throttledComputed - not synchronous at first", async (assert: test.Test) => {
    
    const o = observable({ x: 1, y: 2 });

    const r = throttledComputed(42, 50, () => o.x + o.y);

    assert.equal(getInsideReaction(() => r.get()), 42, "Initial value returned");
    
    runInAction(() => o.x = 6);
    
    assert.equal(getInsideReaction(() => r.get()), 42, "Ditto");
    
    const results: number[] = [];

    const stop = autorun(() => results.push(r.get()));

    assert.deepEqual(results, [42]);

    runInAction(() => o.x = 3);
    
    assert.deepEqual(results, [42], "Reactive contexts don't see immediate changes");
    
    await waitForLength(results, 2);
    
    assert.deepEqual(results, [42, 5], "But do see delayed changes");
    
    runInAction(() => o.x = 10);
    runInAction(() => o.x = 20);
    
    await waitForLength(results, 3);
    
    assert.deepEqual(results, [42, 5, 22], "Changes are batched by throttling");

    stop();
});

testStrictness("throttledComputed - propagates exceptions", async (assert: test.Test) => {
    
    const o = new Obs(false);

    const r = throttledComputed(2, 50, () => {
        if (o.get()) {
            throw new Error("Badness");
        }
        return 1;
    });

    assert.equal(getInsideReaction(() => r.get()), 2, "Initial value return");

    const results: (number | string)[] = [];

    const stop = autorun(() => {
        try {
            results.push(r.get());
        } catch(x) {
            results.push(x.message);
        }        
    });

    assert.deepEqual(results, [2]);

    await waitForLength(results, 2);

    assert.deepEqual(results, [2, 1]);

    runInAction(() => o.set(true));
    
    assert.deepEqual(results, [2, 1], "Reactive contexts don't see immediate changes");
    
    await waitForLength(results, 3);
    
    assert.deepEqual(results, [2, 1, "Badness"], "But do see delayed changes");
    
    runInAction(() => o.set(false));
    runInAction(() => o.set(true));
    runInAction(() => o.set(false));
    
    await waitForLength(results, 4);
    
    assert.deepEqual(results, [2, 1, "Badness", 1], "Changes are batched by throttling");

    runInAction(() => o.set(true));
    await delay(1);
    runInAction(() => o.set(false));
    runInAction(() => o.set(true));

    await waitForLength(results, 5);
    
    assert.deepEqual(results, [2, 1, "Badness", 1, "Badness"], "Changes are batched again");
    
    stop();
});

testStrictness("throttledComputed - can be refreshed", async (assert: test.Test) => {
    
    let counter = 0;

    const r = throttledComputed(-1, 10, () => ++counter);

    const trace: (number)[] = [];
    const stop = autorun(() => trace.push(r.get()));

    assert.deepEqual(trace, [-1], "Initial value appears synchronously");

    r.refresh();

    assert.deepEqual(trace, [-1], "Second value does NOT appear synchronously");

    await waitForLength(trace, 2);

    assert.deepEqual(trace, [-1, 1], "Second value appears asynchronously");

    stop();
});
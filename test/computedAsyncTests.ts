import * as test from "blue-tape";
import delay from "./delay";

import { observable, autorun, useStrict, runInAction, computed } from "mobx"
import { computedAsync } from "../computedAsync"

test("busy is initially true", async (assert: test.Test) => {
    
    const o = observable({ x: 0, y: 0 });
    
    const r = computedAsync(500, async () => {
        const vx = o.x, vy = o.y;
        await delay(100);
        return vx + vy;
    }, 1);
    
    assert.equal(r.busy, true);
});

async function nonReverting(strictness: boolean, assert: test.Test) {
    useStrict(strictness);

    const o = observable({ x: 0, y: 0 });

    const r = computedAsync(500, async () => {
        const vx = o.x, vy = o.y;
        await delay(100);
        return vx + vy;
    }, 1);

    let expect = (v: number) => assert.equal(v, 500);

    function expected(expecting: number) {
        return new Promise<void>(resolve => {
            expect = got => {
                assert.equal(got, expecting, "expected: " + expecting);
                resolve();
            };
        });
    }

    let stopRunner = autorun(() => expect(r.value));

    await delay(10);

    runInAction(() => o.x = 2);

    await expected(2);

    runInAction(() => o.y = 3);
    await delay(10);

    await expected(5);
    
    runInAction(() => o.x = 4);

    await expected(7);

    stopRunner();

    runInAction(() => o.y = 4);

    // Not being observed, so value doesn't change to 4 + 4 yet
    assert.equal(r.value, 7, "0010");

    expect = v => {
        assert.fail(`unexpected[1]: ${v}`);
    };

    runInAction(() => o.x = 5);
    await delay(1000);

    // Initially it will have the stale value when we start observing
    expect = v => assert.equal(v, 7, "0012");

    stopRunner = autorun(() => expect(r.value));

    // But will soon converge on the correct value
    await expected(9);

    runInAction(() => o.x = 1);
    
    await expected(5);

    stopRunner();

    expect = v => assert.fail(`unexpected[2]: ${v}`);

    runInAction(() => o.x = 2);

    await delay(1000);
    
    stopRunner();
}

test(`non-reverting, useStrict(true)`, assert => nonReverting(true, assert));
test(`non-reverting, useStrict(false)`, assert => nonReverting(false, assert));

async function synchronous(strictness: boolean, assert: test.Test) {
    useStrict(strictness);

    const o = observable({ x: 0, y: 0 });

    const r = computedAsync(500, async () => {
        const vx = o.x, vy = o.y;
        await delay(100);
        return vx + vy;
    });

    let expect = (v: number) => assert.equal(v, 500);

    function expected(expecting: number) {
        return new Promise<void>(resolve => {
            expect = got => {
                assert.equal(got, expecting, "expected " + expecting);
                resolve();
            };
        });
    }

    let stopRunner = autorun(() => expect(r.value));

    await delay(10);

    runInAction(() => o.x = 2);

    await expected(2);

    runInAction(() => o.y = 3);

    await delay(10);

    await expected(5);
    
    runInAction(() => o.x = 4);

    await expected(7);

    stopRunner();

    runInAction(() => o.y = 4);

    assert.equal(r.value, 7, "0009");

    expect = v => {
        assert.fail(`unexpected[1]: ${v}`);
    };

    runInAction(() => o.x = 5);
    await delay(1000);

    expect = v => assert.equal(v, 7, "0011"); 

    stopRunner = autorun(() => expect(r.value));

    await expected(9);

    runInAction(() => o.x = 1);

    await expected(5);

    stopRunner();

    expect = v => assert.fail(`unexpected[2]: ${v}`);

    runInAction(() => o.x = 2);

    await delay(1000);
    
    stopRunner();
}

test(`synchronous, useStrict(true)`, assert => synchronous(true, assert));
test(`synchronous, useStrict(false)`, assert => synchronous(false, assert));

function fullSynchronous(strictness: boolean, assert: test.Test) {
    useStrict(strictness);

    const o = observable({ x: 0, y: 0 });

    const r = computedAsync<number>(500, () => {            
        return o.x + o.y;
    });

    assert.equal(r.value, 0, "0001");

    runInAction(() => o.x = 2);

    assert.equal(r.value, 2, "0002");

    runInAction(() => o.y = 3);

    assert.equal(r.value, 5, "0003");

    return Promise.resolve();
}

test("full synchronous, useStrict(true)", (assert) => fullSynchronous(true, assert));
test("full synchronous, useStrict(false)", (assert) => fullSynchronous(false, assert));

async function reverting(strictness: boolean, assert: test.Test) {
    useStrict(strictness);
    
    const o = observable({ x: 0, y: 0 });

    const r = computedAsync({
        init: 500,
        fetch: async () => {
            const vx = o.x, vy = o.y;
            await delay(100);
            return vx + vy;
        },
        revert: true,
        delay: 1
    });

    const transitions: number[] = [];
    
    async function expect(...expected: number[]) {
        let timeout = 0;
        while (transitions.length < expected.length) {
            timeout++;
            assert.doesNotEqual(timeout, 20, `waiting for ${JSON.stringify(expected)}`);
            await delay(100);
        }

        assert.deepEqual(transitions, expected);
        transitions.length = 0;
    }

    let stopRunner = autorun(() => transitions.push(r.value));

    await expect(500);

    await delay(10);

    runInAction(() => o.x = 2);

    // don't expect a transition to 500, as it already was 500
    await expect(2);

    runInAction(() => o.y = 3);

    await expect(500, 5);
   
    runInAction(() => o.x = 4);
    
    await expect(500, 7);

    stopRunner();

    runInAction(() => o.y = 4);

    assert.equal(r.value, 500, "0001");
    await delay(1000);
    assert.equal(r.value, 500, "0001");
    await expect();

    runInAction(() => o.x = 5);
    await delay(1000);
    await expect();
    
    stopRunner = autorun(() => transitions.push(r.value));

    runInAction(() => o.x = 1);
    
    await expect(500, 5);

    stopRunner();
}

test("reverting, useStrict(true)", async (assert) => reverting(true, assert));
test("reverting, useStrict(false)", async (assert) => reverting(false, assert));

async function errorHandling(strictness: boolean, assert: test.Test) {
    useStrict(strictness);

    const o = observable({ b: true });

    const r = computedAsync(123, 
        () => o.b 
            ? Promise.reject("err") 
            : Promise.resolve(456), 1);

    assert.equal(r.value, 123);

    let valueChanges = 0;
    const stopCountValueChanges = autorun(() => {
        r.value;
        valueChanges++;
    });

    let errorChanges = 0;
    const stopCountErrorChanges = autorun(() => {
        r.error;
        errorChanges++;
    });

    assert.equal(valueChanges, 1);
    assert.equal(errorChanges, 1, "errorChanges");
    assert.equal(r.value, 123);

    await delay(10);

    assert.equal(valueChanges, 1);
    assert.equal(errorChanges, 2);
    assert.equal(r.value, 123);
    assert.equal(r.error, "err");

    runInAction(() => o.b = false);

    await delay(10);

    assert.equal(valueChanges, 2);
    assert.equal(errorChanges, 3);
    assert.equal(r.value, 456);
    assert.equal(r.error, undefined);

    runInAction(() => o.b = true);

    await delay(100);

    assert.equal(valueChanges, 3, "valueChanges[4]");
    assert.equal(errorChanges, 4, "errorChanges[4]");
    assert.equal(r.value, 123);
    assert.equal(r.error, "err");

    stopCountErrorChanges();
    stopCountValueChanges();
}

test(`error handling - default, useStrict(true)`, assert => errorHandling(true, assert));
test(`error handling - default, useStrict(false)`, assert => errorHandling(false, assert));

async function errorHandlingReplace(strictness: boolean, assert: test.Test) {
    useStrict(strictness);

    const o = observable({ b: true });

    const r = computedAsync({
        init: "123", 
        fetch: () => o.b 
            ? Promise.reject("bad") 
            : Promise.resolve("456"),
        error: e => "error: " + e,
        delay: 1
    });

    assert.equal(r.value, "123", "0000");

    const valueChanges: string[] = [];
    const stopCountValueChanges = autorun(() => {
        valueChanges.push(r.value);
    });

    const errorChanges: string[] = [];
    const stopCountErrorChanges = autorun(() => {
        errorChanges.push(r.error);
    });

    assert.deepEqual(valueChanges, ["123"], "0002");
    assert.deepEqual(errorChanges, [undefined], "0003");
    assert.equal(r.value, "123", "0004");

    await delay(1000);

    assert.deepEqual(valueChanges, ["123", "error: bad"], "0005");
    assert.deepEqual(errorChanges, [undefined, "bad"], "0006");
    assert.equal(r.value, "error: bad", "0007");
    assert.equal(r.error, "bad", "0008");

    runInAction(() => o.b = false);

    await delay(1000);

    assert.deepEqual(valueChanges, ["123", "error: bad", "123", "456"], "0009");
    assert.deepEqual(errorChanges, [undefined, "bad", undefined], "0010");
    assert.equal(r.value, "456", "0011");
    assert.equal(r.error, undefined, "0012");

    runInAction(() => o.b = true);

    await delay(1000);

    assert.deepEqual(valueChanges, ["123", "error: bad", "123", "456", "error: bad"], "0013");
    assert.deepEqual(errorChanges, [undefined, "bad", undefined, "bad"], "0014");
    assert.equal(r.value, "error: bad", "0015");
    assert.equal(r.error, "bad", "0016");

    stopCountErrorChanges();
    stopCountValueChanges();
}

test(`error handling - replace, useStrict(true)`, assert => errorHandlingReplace(true, assert));
test(`error handling - replace, useStrict(false)`, assert => errorHandlingReplace(false, assert));

test("inComputed", async (assert: test.Test) => {
    const o = observable({ x: 0, y: 0 });
    const r = computedAsync<number>({
        init: 0,
        fetch: async () => {
            //await delay(100);        
            return o.x + o.y;
        }
    });

    class Test {
        @computed get val() {
            return r.value;
        }
    }

    const t = new Test();

    // Observe the nested computed value
    const stop = autorun(() => t.val);

    assert.equal(t.val, 0);

    stop();

    await delay(100);
});


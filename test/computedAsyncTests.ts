import * as test from "blue-tape";
import delay from "./delay";

import { observable, autorun, useStrict, action } from "mobx"
import { computedAsync } from "../computedAsync"

for (var strictness of [false, true]) {

    test(`non-reverting, useStrict(${strictness})`, async (assert) => {

        useStrict(strictness);

        const x = observable<number>(0),
            y = observable<number>(0);

        const r = computedAsync(500, async () => {
            const vx = x.get(), vy = y.get();
            await delay(100);
            return vx + vy;
        });

        let expect = (v: number) => assert.equal(v, 500);

        function expected(expecting: number) {
            return new Promise<void>(resolve => {
                expect = got => {
                    assert.equal(got, expecting);
                    resolve();
                };
            });
        }

        let busyChanges = 0;
        const stopCountBusyChanges = autorun(() => {
            r.busy;
            busyChanges++;
        });

        assert.equal(busyChanges, 1);

        let stopRunner = autorun(() => expect(r.value));

        await delay(10);

        assert.equal(busyChanges, 2);

        action(() => x.set(2))();

        assert.equal(busyChanges, 2);

        await expected(2);

        assert.equal(busyChanges, 3);

        action(() => y.set(3))();

        assert.equal(busyChanges, 3);

        await delay(10);

        assert.equal(busyChanges, 4);

        await expected(5);

        assert.equal(busyChanges, 5);
        
        action(() => x.set(4))();

        assert.equal(busyChanges, 5);

        await expected(7);

        stopRunner();

        action(() => y.set(4))();

        assert.equal(busyChanges, 7);

        assert.equal(r.value, 7);

        expect = v => {
            assert.fail(`unexpected[1]: ${v}`);
        };

        action(() => x.set(5))();
        await delay(1000);

        assert.equal(busyChanges, 7);

        expect = v => assert.equal(v, 7); 

        stopRunner = autorun(() => expect(r.value));

        action(() => x.set(1))();

        assert.equal(busyChanges, 7);
        
        await expected(5);

        stopRunner();

        expect = v => assert.fail(`unexpected[2]: ${v}`);

        assert.equal(busyChanges, 9);

        action(() => x.set(2))();

        assert.equal(busyChanges, 9);

        await delay(1000);
        
        assert.equal(busyChanges, 9);

        stopRunner();
        stopCountBusyChanges();
    });

    test("reverting", async (assert) => {

        useStrict(strictness);
        
        const x = observable<number>(0),
            y = observable<number>(0);

        const r = computedAsync({
            init: 500,
            fetch: async () => {
                const vx = x.get(), vy = y.get();
                await delay(100);
                return vx + vy;
            },
            revert: true
        });

        let expect = (v: number) => assert.equal(v, 500);

        function expected(expecting: number) {
            return new Promise<void>(resolve => {
                expect = got => {
                    assert.equal(got, expecting);
                    resolve();
                };
            });
        }

        let stopRunner = autorun(() => expect(r.value));

        await delay(10);

        action(() => x.set(2))();

        await expected(500);
        await expected(2);

        action(() => y.set(3))();

        await expected(500);
        await expected(5);

        action(() => x.set(4))();

        await expected(500);
        await expected(7);

        stopRunner();

        action(() => y.set(4))();

        assert.equal(r.value, 7);

        expect = v => {
            assert.fail(`unexpected[1]: ${v}`);
        };

        action(() => x.set(5))();
        await delay(1000);

        expect = v => assert.equal(v, 7); 

        stopRunner = autorun(() => expect(r.value));

        action(() => x.set(1))();
        
        await expected(500);
        await expected(5);

        stopRunner();

        expect = v => assert.fail(`unexpected[2]: ${v}`);

        action(() => x.set(2))();

        await delay(1000);
        
        stopRunner();
    });
}

test(`error handling - default`, async (assert) => {

    useStrict(true);

    const o = observable<boolean>(true);

    const r = computedAsync(123, 
        () => o.get() 
            ? Promise.reject("err") 
            : Promise.resolve(456));

    assert.equal(r.value, 123);

    let busyChanges = 0;
    const stopCountBusyChanges = autorun(() => {
        r.busy;
        busyChanges++;
    });

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

    assert.equal(busyChanges, 1);
    assert.equal(valueChanges, 1);
    assert.equal(errorChanges, 1);
    assert.equal(r.value, 123);

    await delay(10);

    assert.equal(busyChanges, 3);
    assert.equal(valueChanges, 1);
    assert.equal(errorChanges, 2);
    assert.equal(r.value, 123);
    assert.equal(r.error, "err");

    action(() => o.set(false))();

    await delay(10);

    assert.equal(busyChanges, 5);
    assert.equal(valueChanges, 2);
    assert.equal(errorChanges, 3);
    assert.equal(r.value, 456);
    assert.equal(r.error, undefined);

    action(() => o.set(true))();

    await delay(10);

    assert.equal(busyChanges, 7);
    assert.equal(valueChanges, 3);
    assert.equal(errorChanges, 4);
    assert.equal(r.value, 123);
    assert.equal(r.error, "err");

    stopCountErrorChanges();
    stopCountValueChanges();
    stopCountBusyChanges();
});

test(`error handling - replace`, async (assert) => {

    useStrict(true);

    const o = observable<boolean>(true);

    const r = computedAsync({
        init: "123", 
        fetch: () => o.get() 
            ? Promise.reject("bad") 
            : Promise.resolve("456"),
        error: e => "error: " + e
    });

    assert.equal(r.value, "123");

    let busyChanges = 0;
    const stopCountBusyChanges = autorun(() => {
        r.busy;
        busyChanges++;
    });

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

    assert.equal(busyChanges, 1);
    assert.equal(valueChanges, 1);
    assert.equal(errorChanges, 1);
    assert.equal(r.value, "123");

    await delay(10);

    assert.equal(busyChanges, 3);
    assert.equal(valueChanges, 2);
    assert.equal(errorChanges, 2);
    assert.equal(r.value, "error: bad");
    assert.equal(r.error, "bad");

    action(() => o.set(false))();

    await delay(10);

    assert.equal(busyChanges, 5);
    assert.equal(valueChanges, 3);
    assert.equal(errorChanges, 3);
    assert.equal(r.value, "456");
    assert.equal(r.error, undefined);

    action(() => o.set(true))();

    await delay(10);

    assert.equal(busyChanges, 7);
    assert.equal(valueChanges, 4);
    assert.equal(errorChanges, 4);
    assert.equal(r.value, "error: bad");
    assert.equal(r.error, "bad");

    stopCountErrorChanges();
    stopCountValueChanges();
    stopCountBusyChanges();
});
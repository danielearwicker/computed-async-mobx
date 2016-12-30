# computed-async-mobx
_Define a computed by returning a Promise_

[![Build Status](https://travis-ci.org/danielearwicker/computed-async-mobx.svg?branch=master)](https://travis-ci.org/danielearwicker/computed-async-mobx)
[![Coverage Status](https://coveralls.io/repos/danielearwicker/computed-async-mobx/badge.svg?branch=master&service=github)](https://coveralls.io/github/danielearwicker/computed-async-mobx?branch=master)

*"People starting with MobX tend to use reactions [*autorun*] too often. The golden rule is: if you want to create a value based on the current state, use computed."* - [MobX - Concepts & Principles](http://mobxjs.github.io/mobx/intro/concepts.html)

A `computed` in MobX is defined by a function, which consumes other observable values and is automatically re-evaluated, like a spreadsheet cell containing a calculation.

    @computed get creditScore() {
        return this.scoresByUser[this.userName];
    }

However, it has to be a synchronous function body. What if you want to do something asynchronous? e.g. get something from the server. That's where this little extension comes in:

    creditScore = computedAsync(0, async () => {
         const response = await fetch(`users/${this.userName}/score`);
         const data = await response.json();
         return data.score;
     });

[Further explanation, rationale, change log, etc.](../../wiki)

# Installation

    npm install computed-async-mobx

# TypeScript

Of course TypeScript is optional; like a lot of libraries these days, this is a JavaScript library that happens to be written in TypeScript. It also has built-in type definitions: no need to `npm install @types/...` anything.

# Acknowledgements

I first saw this idea on the [Knockout.js wiki](https://github.com/knockout/knockout/wiki/Asynchronous-Dependent-Observables) about five years ago. [As discussed here](https://smellegantcode.wordpress.com/2015/02/21/knockout-clear-fully-automatic-cleanup-in-knockoutjs-3-3/) it was tricky to make it well-behaved re: memory leaks for a few years.

MobX uses the same (i.e. correct) approach as `ko.pureComputed` from the ground up, and the [Atom](http://mobxjs.github.io/mobx/refguide/extending.html#atoms) class makes it easy to detect when your data transitions between being observed and not.

Also a :rose: for [Basarat](https://github.com/basarat) for pointing out the need to support strict mode!

# Usage

Unlike the normal `computed` feature, `computedAsync` can't work as a decorator on a property getter. This is because it changes the type of the return value from `Promise<T>` to `T`.

Instead, as in the example above, declare an ordinary property. If you're using TypeScript (or an ES6 transpiler with equivalent support for classes) then you can declare and initialise the property in a class in one statement:

```ts
class Person {

     @observable userName: string;

     creditScore = computedAsync(0, async () => {
         const response = await fetch(`users/${this.userName}/score`);
         const data = await response.json();
         return data.score; // score between 0 and 1000
     });

     @computed
     get percentage() {
         return Math.round(this.creditScore.value / 10);
     }
}
```

Note how we can consume the value via the `.value` property inside another (ordinary) computed and it too will re-evaluate when the score updates.

# useStrict(true)

This library is transparent with respect to [MobX's strict mode](https://github.com/mobxjs/mobx/blob/gh-pages/docs/refguide/api.md#usestrict). Like `computed`, it doesn't mutate state but only consumes it.

# Gotchas

Take care when using `async`/`await`. MobX dependency tracking can only detect you reading data in the first "chunk" of a function containing `await`s. It's okay to read data in the expression passed to `await` (as in the above example) because that is evaluated before being passed to the first `await`. But after execution "returns" from the first `await` the context is different and MobX doesn't track further reads.

# API

The API is presented here in TypeScript but (as always) this does not mean you have to use it via TypeScript (just ignore the `<T>`s and other type annotations...)

## `ComputedAsyncValue<T>`

The type returned by the `computedAsync` function. Represents the current `value`. Accessing the value inside a reaction will automatically listen to it, just like an `observable` or `computed`. The `busy` property is `true` when the asynchronous function is currently running.

```ts
interface ComputedAsyncValue<T> {
    readonly value: T;
    readonly busy: boolean;
    readonly failed: boolean;
    readonly error: any;
}
```

If the current promise was rejected, `failed` will be `true` and `error` will contain the rejection value (ideally this would be based on `Error` but the Promise spec doesn't require it).

## `ComputedAsyncOptions<T>`

Accepted by one of the overloads of `computedAsync`.

* `init` - value used initially, and when not being observed
* `fetch` - the function that returns the promise, re-evaluated automatically whenever its dependencies change. Only executed when the `computedAsync` is being observed.
* `delay` - milliseconds to wait before re-evaluating, as in [autorunAsync](http://mobxjs.github.io/mobx/refguide/autorun-async.html)
* `revert` - if true, the value reverts to `init` whenever the `fetch` function is busy executing (you can use this to substitute "Please wait" etc.) The default is `false`, where the most recent value persists until a new one is available.
* `name` - debug name for [Atom](http://mobxjs.github.io/mobx/refguide/extending.html#atoms) used internally.
* `error` - if specified and a promise is rejected, this function is used to convert the rejection value into a stand-in for the result value. This allows consumers to ignore the `failed` and `error` properties and observe `value` alone.

```ts
interface ComputedAsyncOptions<T> {
    readonly init: T;
    readonly fetch: () => Promise<T>;
    readonly delay?: number;
    readonly revert?: boolean;
    readonly name?: string;
    readonly error?: (error: any) => T
}
```

## `computedAsync<T>`

Overload that takes most commonly used options:

```ts
function computedAsync<T>(init: T, fetch: () => Promise<T>, delay?: number): ComputedAsyncValue<T>;
```

This is equivalent to calling the second overload (below): `computedAsync({ init, fetch, delay })`.

```ts
function computedAsync<T>(options: ComputedAsyncOptions<T>): ComputedAsyncValue<T>;
```

# computed-async-mobx
_Define a computed by returning a Promise_

[![Build Status](https://travis-ci.org/danielearwicker/computed-async-mobx.svg?branch=master)](https://travis-ci.org/danielearwicker/computed-async-mobx)
[![Coverage Status](https://coveralls.io/repos/danielearwicker/computed-async-mobx/badge.svg?branch=master&service=github)](https://coveralls.io/github/danielearwicker/computed-async-mobx?branch=master)

*"People starting with MobX tend to use reactions [*autorun*] too often. The golden rule is: if you want to create a value based on the current state, use computed."* - [MobX - Concepts & Principles](http://mobxjs.github.io/mobx/intro/concepts.html)

# What is this for?

A `computed` in MobX is defined by a function, which consumes other observable values and is automatically re-evaluated, like a spreadsheet cell containing a calculation.

```ts
@computed get creditScore() {
    return this.scoresByUser[this.userName];
}
```
However, it has to be a synchronous function body. What if you want to do something asynchronous? e.g. get something from the server. That's where this little extension comes in:

```ts
creditScore = promisedComputed(0, async () => {
    const response = await fetch(`users/${this.userName}/score`);
    const data = await response.json();
    return data.score;
});
```

[Further explanation, rationale, etc.](../../wiki)

# New in Version 6.0.0...

* Breaking change: the old API (deprecated for over three years, seems fair!) has been removed. Stay tuned for a migration guide below.
* Support for MobX 6

----

## asyncComputed

This is the most capable function. It is actually just a composition of two simpler functions,
`promisedComputed` and `throttledComputed`, described below.

### Parameters

- `init` - the value to assume until the first genuine value is returned
- `delay` - the minimum time in milliseconds to wait between creating new promises
- `compute` - the function to evaluate to get a promise (or plain value)

### Returns

A Mobx-style getter, i.e. an object with a `get` function that returns the current value. It
is an observable, so it can be used from other MobX contexts. It *cannot* be used outside
MobX reactive contexts (it throws an exception if you attempt it).

The returned object also has a `busy` property that is true while a promise is still pending.
It also has a `refresh` method that can be called to force a new promise to be requested
immediately (bypassing the delay time).

There is also a method `getNonReactive()` which can be used outside reactive contexts. It is
a convenience for writing unit tests. Note that it will return the most recent value that was
computed while the `asyncComputed` was being observed.

[Generated references docs](docs/typedoc/modules/_asynccomputed_.html)

### Example

```ts
fullName = asyncComputed("(Please wait...)", 500, async () => {
        const response = await fetch(`users/${this.userName}/info`);
        const data = await response.json();
        return data.fullName;
});
```

The value of `fullName.get()` is observable. It will initially return
`"(Please wait...)"` and will later transition to the user's full name.
If the `this.userName` property is an observable and is modified, the
`promisedComputed` will update also, but after waiting at least 500
milliseconds.

----

## promisedComputed

Like `asyncComputed` but without the `delay` support. This has the slight advantage
of being fully synchronous if the `compute` function returns a plain value.

### Parameters

- `init` - the value to assume until the first genuine value is returned
- `compute` - the function to evaluate to get a promise (or plain value)

### Returns

Exactly as `asyncComputed`.

[Generated references docs](docs/typedoc/modules/_promisedcomputed_.html)

### Example

```ts
fullName = promisedComputed("(Please wait...)", async () => {
    const response = await fetch(`users/${this.userName}/info`);
    const data = await response.json();
    return data.fullName;
});
```

The value of `fullName.get()` is observable. It will initially return
`"(Please wait...)"` and will later transition to the user's full name.
If the `this.userName` property is an observable and is modified, the
`promisedComputed` will update also, as soon as possible.

----

## throttledComputed

Like the standard `computed` but with support for delaying for a specified number of 
milliseconds before re-evaluation.

(Note that `throttledComputed` has no special functionality for handling promises.)

### Parameters

- `compute` - the function to evaluate to get a plain value
- `delay` - the minimum time in milliseconds to wait before re-evaluating

### Returns

A Mobx-style getter, i.e. an object with a `get` function that returns the current value. It
is an observable, so it can be used from other MobX contexts. It can also be used outside
MobX reactive contexts but (like standard `computed`) it reverts to simply re-evaluating 
every time you request the value.

It also has a `refresh` method that *immediately* (synchronously) re-evaluates the function.

The value returned from `get` is always a value obtained from the provided `compute` function,
never silently substituted.

[Generated references docs](docs/typedoc/modules/_throttledcomputed_.html)

### Example

```ts
fullName = throttledComputed(500, () => {
    const data = slowSearchInMemory(this.userName);
    return data.fullName;
});
```

The value of `fullName.get()` is observable. It will initially return the result of the
search, which happens synchronously the first time. If the `this.userName` property is an
observable and is modified, the `throttledComputed` will update also, but after waiting at
least 500 milliseconds.

----

## autorunThrottled

Much like the standard `autorun` with the `delay` option, except that the initial run of 
the function happens synchronously.

(This is used by `throttledComputed` to allow it to be synchronously initialized.)

### Parameters

- `func` - The function to execute in reaction
- `delay` - The minimum delay between executions
- `name` - (optional) For MobX debug purposes

### Returns

- a disposal function.

A Mobx-style getter, i.e. an object with a `get` function that returns the current value. It
is an observable, so it can be used from other MobX contexts. It can also be used outside
MobX reactive contexts but (like standard `computed`) it reverts to simply re-evaluating 
every time you request the value.

[Generated references docs](docs/typedoc/modules/_autorunthrottled_.html)

----

# Installation

    npm install computed-async-mobx

# TypeScript

Of course TypeScript is optional; like a lot of libraries these days, this is a JavaScript 
library that happens to be written in TypeScript. It also has built-in type definitions: no 
need to `npm install @types/...` anything.

# Acknowledgements

I first saw this idea on the [Knockout.js wiki](https://github.com/knockout/knockout/wiki/Asynchronous-Dependent-Observables) in 2011. [As discussed here](https://smellegantcode.wordpress.com/2015/02/21/knockout-clear-fully-automatic-cleanup-in-knockoutjs-3-3/) it was tricky to make it well-behaved re: memory leaks for a few years.

MobX uses the same (i.e. correct) approach as `ko.pureComputed` from the ground up, and the [Atom](http://mobxjs.github.io/mobx/refguide/extending.html#atoms) class makes it easy to detect when your data transitions 
between being observed and not. More recently I realised `fromPromise` in [mobx-utils](https://github.com/mobxjs/mobx-utils) 
could be used to implement `promisedComputed` pretty directly. If you don't need throttling (`delay` parameter) then all
you need is a super-thin layer over existing libraries, which is what `promisedComputed` is.

Also a :rose: for [Basarat](https://github.com/basarat) for pointing out the need to support strict mode!

Thanks to [Daniel Nakov](https://github.com/dnakov) for fixes to support for MobX 4.x.

# Usage

Unlike the normal `computed` feature, `promisedComputed` can't work as a decorator on a property getter. This is because it changes the type of the return value from `PromiseLike<T>` to `T`.

Instead, as in the example above, declare an ordinary property. If you're using TypeScript (or an ES6 transpiler with equivalent support for classes) then you can declare and initialise the property in a class in one statement:

```ts
class Person {

     @observable userName: string;

     creditScore = promisedComputed(0, async () => {
         const response = await fetch(`users/${this.userName}/score`);
         const data = await response.json();
         return data.score; // score between 0 and 1000
     });

     @computed
     get percentage() {
         return Math.round(this.creditScore.get() / 10);
     }

     // For MobX 6
     constructor() {
         makeObservable(this);
     }
}
```

Note how we can consume the value via the `.get()` function inside another (ordinary) computed and it too will re-evaluate when the score updates.

# { enforceActions: "always" }

This library is transparent with respect to [MobX's strict mode](https://github.com/mobxjs/mobx/blob/gh-pages/docs/refguide/api.md#enforceactions), and since 4.2.0 this is true even of the very strict `"always"` mode that doesn't even let you initialize fields of a class outside a reactive context.

# Gotchas

Take care when using `async`/`await`. MobX dependency tracking can only detect you reading data in the first "chunk" of a function containing `await`s. It's okay to read data in the expression passed to `await` (as in the above example) because that is evaluated before being passed to the first `await`. But after execution "returns" from the first `await` the context is different and MobX doesn't track further reads.

For example, here we fetch two pieces of data to combine them together:

```ts
answer = asyncComputed(0, 1000, async () => {
    
    // Don't do this!!
    const part1 = await fetch(this.part1Uri),
          part2 = await fetch(this.part2Uri);
    
    // combine part1 and part2 into a result somehow...
    return part1 + part2;
});
```

The properties `part1Uri` and `part2Uri` are ordinary mobx `observable`s (or `computed`s). You'd expect that when either of those values changes, this `asyncComputed` will re-execute. But in fact it can only detect when `part1Uri` changes. When an `async` function is called, only the first part (up to the first `await`) executes immediately, and so that's the only part that MobX will be able to track. The remaining parts execute later on, when MobX has stopped listening.

(Note: the expression on the right of `await` has to be executed before the `await` pauses the function, so the access to `this.part1Uri` is properly detected by MobX).

We can work around this like so:

```ts
answer = asyncComputed(0, 1000, async () => {
    const uri1 = this.part1Uri, 
          uri2 = this.part2Uri;

    const part1 = await fetch(uri1),
          part2 = await fetch(uri2);

    // combine part1 and part2 into a result somehow...
    return result;
});
```

When in doubt, move all your gathering of observable values to the start of the `async` function.

# Migration

Versions prior to 3.0.0 had a different API. It was a single `computedAsync` function that had all the
capabilities, like a Swiss-Army Knife, making it difficult to test, maintain and use. It also had some
built-in functionality that could just as easily be provided by user code, which is pointless and only
creates obscurity.

- Instead of calling `computedAsync` with a zero `delay`, use `promisedComputed`, which takes no `delay`
  parameter.
- Instead of calling `computedAsync` with a non-zero `delay`, use `asyncComputed`.
- Instead of using the `value` property, call the `get()` function (this is for closer consistency with 
  standard MobX `computed`.)
- Instead of using `revert`, use the `busy` property to decide when to substitute a different value.
- The `rethrow` property made `computedAsync` propagate exceptions. There is no need to request this
  behaviour with `promisedComputed` and `asyncComputed` as they always propagate exceptions.
- The `error` property computed a substitute value in case of an error. Instead, just do this substitution
  in your `compute` function.

# Version History

See [CHANGES.md](CHANGES.md).

# License

MIT, see [LICENSE](LICENSE)

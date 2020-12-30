# Pre-Version 7 API

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

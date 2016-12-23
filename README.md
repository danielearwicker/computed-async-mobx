# computed-async-mobx
_Define a computed by returning a Promise_

[![Build Status](https://travis-ci.org/danielearwicker/computed-async-mobx.svg?branch=master)](https://travis-ci.org/danielearwicker/computed-async-mobx)
[![Coverage Status](https://coveralls.io/repos/danielearwicker/computed-async-mobx/badge.svg?branch=master&service=github)](https://coveralls.io/github/danielearwicker/computed-async-mobx?branch=master)

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

# Installation

    npm install computed-async-mobx

# TypeScript

Of course TypeScript is optional; this is a JavaScript library that happens to be written in TypeScript. It also has built-in type definitions.

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

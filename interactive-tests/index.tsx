import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { asyncComputed } from '../src/index';
import { delay } from '../test/delay';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import { makeObservable } from '../src/mobxShim';

class SlowCalculatorModel {
  x = "0";
  y = "0";

  constructor() {
    makeObservable(this, {
      x: observable,
      y: observable
    });
  }

  answer = asyncComputed(0, 1000, async () => {
    console.log(`starting fetch with ${this.x} + ${this.y}`);
    const r = parseFloat(this.x) + parseFloat(this.y);
    await delay(1000);
    console.log(`fetch returning ${r}`);
    return r;
  });
}

const SlowCalculator = observer(({model}: { model: SlowCalculatorModel }) => (
  <div>
    <input value={ model.x } onChange={ e => model.x = e.target.value }/> + 
    <input value={ model.y } onChange={ e => model.y = e.target.value }/> = 
    {model.answer.get()}        
    {model.answer.busy ? <div>busy...</div> : undefined}        
  </div>
));

async function timeConsumingOperation() {
  for (let i = 0; i < 5; i++) {
    await delay(500);
    console.log(`Waiting (${i})...`);
  }
}

@observer
class InitiallyBusy extends React.Component {
  observableValue = asyncComputed('Initial dummy value', 0,  async () => {
    await timeConsumingOperation();
    return 'Computed value';
  });

  render() {
    const value = this.observableValue.get(),
          busy = this.observableValue.busy;

    console.log('render()', { value, busy });
    return (<ul>
      <li>value: {value}</li>
      <li>busy: {JSON.stringify(busy)}</li>
    </ul>);
  }
}

const model = new SlowCalculatorModel();

function App(_: {}) {
  return (
    <div>
      <div> <SlowCalculator model={model}/> </div>
      <br/>
      <div> <InitiallyBusy/> </div>
    </div>
  );
}

ReactDOM.render(<App/>, document.body.appendChild(document.createElement('div')));
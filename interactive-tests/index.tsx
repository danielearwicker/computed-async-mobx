import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { computedAsync } from '../src/index';
import { delay } from '../test/delay';
import { observable } from 'mobx';
import { observer } from 'mobx-react';

@observer
class SlowCalculator extends React.Component {
  
  @observable
  x = "0";

  @observable
  y = "0";

  answer = computedAsync({
    init: 0,
    delay: 1000,
    fetch: async () => {
      console.log(`starting fetch with ${this.x} + ${this.y}`);
      const r = parseFloat(this.x) + parseFloat(this.y);
      await delay(1000);
      console.log(`fetch returning ${r}`);
      return r;
    }
  });

  render() {
    return (
      <div>
        <input value={ this.x } onChange={ e => this.x = e.target.value }/> + 
        <input value={ this.y } onChange={ e => this.y = e.target.value }/> = 
        {this.answer.value}        
        {this.answer.busy ? <div>busy...</div> : undefined}        
      </div>
    );
  }
}


async function timeConsumingOperation() {
  for (let i = 0; i < 5; i++) {
    await delay(500);
    console.log(`Waiting (${i})...`);
  }
}

@observer
class InitiallyBusy extends React.Component {
  observableValue = computedAsync({
    init: 'Initial dummy value',
    fetch: async () => {
      await timeConsumingOperation();
      return 'Computed value';
    },
  });

  render() {
    const { value, busy } = this.observableValue;
    console.log('render()', { value, busy });
    return (<ul>
      <li>value: {value}</li>
      <li>busy: {JSON.stringify(busy)}</li>
    </ul>);
  }
}

function App(_: {}) {
  return (
    <div>
      <div> <SlowCalculator/> </div>
      <div> <InitiallyBusy/> </div>
    </div>
  );
}

ReactDOM.render(<App/>, document.body.appendChild(document.createElement('div')));
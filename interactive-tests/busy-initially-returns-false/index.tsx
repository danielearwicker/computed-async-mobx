import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { computedAsync } from '../../computedAsync';
import delay from '../../test/delay';
import { observer } from 'mobx-react';

async function timeConsumingOperation() {
  for (let i = 0; i < 5; i++) {
    await delay(500);
    console.log(`Waiting (${i})...`);
  }
}

@observer
class UseCase extends React.Component {
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

ReactDOM.render(
  <UseCase />,
  document.body.appendChild(document.createElement('div'))
);
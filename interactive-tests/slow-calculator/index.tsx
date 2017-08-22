import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { computedAsync } from '../../computedAsync';
import delay from '../../test/delay';
import { observable } from 'mobx';
import { observer } from 'mobx-react';

@observer
class SlowCalculator extends React.Component {
  
  @observable
  x = 0;

  @observable
  y = 0;

  answer = computedAsync({
    init: 0,
    fetch: async () => {
      const r = this.x + this.y;
      await delay(1000);
      return r;
    }
  });

  render() {
    return (
      <div>
        <input value={ this.x } onChange={ e => this.x = parseFloat(e.target.value) }/> + 
        <input value={ this.y } onChange={ e => this.y = parseFloat(e.target.value) }/> = 
        {this.answer.value}
      </div>
    );
  }
}

ReactDOM.render(
  <SlowCalculator />,
  document.body.appendChild(document.createElement('div'))
);
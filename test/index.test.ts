import { describe, it } from 'node:test';
import assert from 'node:assert';

import { StateMachineBuilder } from '../src/index.ts';

type TestContext = {
  getTrue: () => boolean;
  getFalse: () => boolean;
};

describe('StateMachineBuilder', async () => {
  const testContext = {
    getTrue: () => true,
    getFalse: () => false,
  };

  it('Should build - One State', () => {
    const smb = new StateMachineBuilder<TestContext>();
    const stateBuilder = smb.state('test');
    const expectedState = stateBuilder.build();
    const sm = smb.initial(stateBuilder).build();
    sm.start(testContext);
    assert.deepEqual(sm.currentState, expectedState);
  });
});
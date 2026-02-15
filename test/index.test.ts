import { describe, it } from 'node:test';
import assert from 'node:assert';

import { StateMachineBuilder } from '../src/index.ts';

type TestContext = {
  getTrue: () => boolean;
  getFalse: () => boolean;
};

describe('StateMachineBuilder', () => {
  const testContext = {
    getTrue: () => true,
    getFalse: () => false,
    mutableState: false,
  };

  it('Should build - One State', () => {
    const sm = new StateMachineBuilder<TestContext>()
      .states([{
        id: 'test_01'
      }])
      .initialState('test_01')
      .build();
    
    sm.start(testContext);
    assert.strictEqual('test_01', sm.getCurrentState()?.id);
  });

  it('Should build - Two States, One Transition', () => {
    const sm = new StateMachineBuilder<TestContext>()
      .states([
        {
          id: 'test_01',
          transitions: [
            { target: 'test_02', guard: (ctx) => ctx.getTrue() }
          ]
        },
        {
          id: 'test_02'
        }
      ])
      .initialState('test_01')
      .build();
    sm.start(testContext);
    assert.strictEqual('test_01', sm.getCurrentState()?.id);
    // tick() should trigger the transition
    sm.tick();
    assert.strictEqual('test_02', sm.getCurrentState()?.id);
  });
});
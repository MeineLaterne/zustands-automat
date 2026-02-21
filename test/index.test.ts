import { describe, it } from 'node:test';
import assert from 'node:assert';

import { StateMachineBuilder } from '../src/index.ts';

type TestContext = {
  getTrue: () => boolean;
  getFalse: () => boolean;
  mutableState: boolean;
};

describe('StateMachineBuilder', () => {
  const testContext: TestContext = {
    getTrue: () => true,
    getFalse: () => false,
    mutableState: false,
  };

  it('Should build - One State', () => {
    const sm = new StateMachineBuilder(testContext)
      .states([{
        id: 'test_01',
        isInitialState: true,
      }])
      .build();

    assert.strictEqual('test_01', sm.getCurrentState()?.id);
  });

  it('Should build - Two States, One Transition', () => {
    const sm = new StateMachineBuilder(testContext)
      .states([
        {
          id: 'test_01',
          isInitialState: true,
          transitions: [
            { target: 'test_02', guard: (ctx) => ctx.getTrue() }
          ]
        },
        {
          id: 'test_02'
        }
      ])
      .build();

    assert.strictEqual('test_01', sm.getCurrentState()?.id);

    // tick() should trigger the transition
    sm.tick();
    assert.strictEqual('test_02', sm.getCurrentState()?.id);
  });

  it('Should build - Nested State Machine', () => {
    
    testContext.mutableState = false;
    
    const sm = new StateMachineBuilder(testContext)
      .states([
        {
          id: 'test_01',
          isInitialState: true,
          transitions: [
            { target: 'test_02', guard: (ctx) => ctx.mutableState === true, }
          ],
          states: [
            {
              id: 'nested_01',
              isInitialState: true,
              transitions: [{
                target: 'nested_02',
                guard: (ctx) => ctx.getTrue(),
              }]
            },
            {
              id: 'nested_02',
              onEnter: (ctx) => {
                ctx.mutableState = true;
              }
            }
          ]
        },
        {
          id: 'test_02'
        }
      ])
      .build();

    const state = sm.getCurrentState();
    assert.notEqual(state?.nestedStateMachine, undefined);
    assert.notEqual(state?.nestedStateMachine, null);

    assert.strictEqual('test_01', sm.getCurrentState()?.id);
    assert.strictEqual('nested_01', state?.nestedStateMachine?.getCurrentState()?.id);

    sm.tick();
    assert.strictEqual('test_01', sm.getCurrentState()?.id);
    assert.strictEqual('nested_02', state?.nestedStateMachine?.getCurrentState()?.id);

    sm.tick();
    assert.strictEqual('test_02', sm.getCurrentState()?.id);
  });
});
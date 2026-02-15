# State Machine Library

**This is work in progress**

A lightweight, type-safe TypeScript state machine library. Built with a declarative API that makes complex hierarchical state machines easy to read and maintain.

## Features

- **Declarative Configuration** - Define states and transitions in readable object notation
- **Nested State Machines** - States can contain their own state machines for hierarchical behavior
- **Type-Safe** - Full TypeScript support with generic context types
- **Lightweight** - No dependencies, minimal overhead

## Quick Start

```typescript

interface GameContext {
  input: { left: boolean; right: boolean; jump: boolean };
  isGrounded: boolean;
}

class Player {
  x = 0;
  y = 0;
  velX = 0;
  velY = 0;
  stateMachine: StateMachine<GameContext>;

  constructor(context: GameContext) {
    this.stateMachine = new StateMachineBuilder<GameContext>()
      .states([
        {
          id: 'idle',
          onEnter: (ctx) => { this.velX = 0; },
          transitions: [
            { 
              target: 'walk',
              guard: (ctx) => ctx.input.left || ctx.input.right
            }
          ]
        },
        {
          id: 'walk',
          onStay: (ctx) => {
            this.velX = ctx.input.left ? -3 : 3;
          },
          transitions: [
            { target: 'idle', guard: (ctx) => !ctx.input.left && !ctx.input.right }
          ]
        }
      ])
      .initialState('idle')
      .build();

    this.stateMachine.start(context);
  }

  update(deltaTime: number) {

    this.stateMachine.tick();
    
    // Apply gravity and velocity
    this.velY += context.gravity * deltaTime;
    this.x += this.velX * deltaTime;
    this.y += this.velY * deltaTime;
  }
}
```

## Core Concepts

### States

A state represents a discrete behavior or condition in your entity. Each state can have:

- **`id`** (required): Unique identifier for the state
- **`onEnter`**: Called once when entering the state
- **`onStay`**: Called every frame while in the state
- **`onExit`**: Called once when leaving the state
- **`transitions`**: Array of possible transitions to other states
- **`states`**: Nested states for hierarchical behavior (optional)

### Transitions

Transitions define how your entity moves from one state to another:

```typescript
{
  target: 'targetStateId',  // The state to transition to
  guard: (ctx) => boolean   // Optional condition - if true, transition happens
}
```

Transitions are evaluated in order. The first transition whose guard returns `true` will be taken.

### Context

The context is any object you pass to the state machine that contains information states need to make decisions:

```typescript
interface GameContext {
  input: InputManager;
  physics: PhysicsEngine;
  entities: Entity[];
  deltaTime: number;
}
```

The context is passed to all state handlers and guard functions.

## Advanced Usage

### Nested State Machines

States can contain their own state machines for complex hierarchical behavior:

```typescript
{
  id: 'combat',
  transitions: [
    { target: 'idle', guard: (ctx) => !ctx.inCombat }
  ],
  // Nested combat behaviors
  states: [
    {
      id: 'melee',
      onStay: (ctx) => { /* melee attack logic */ },
      transitions: [
        { target: 'ranged', guard: (ctx) => ctx.distanceToTarget > 100 }
      ]
    },
    {
      id: 'ranged',
      onStay: (ctx) => { /* ranged attack logic */ },
      transitions: [
        { target: 'melee', guard: (ctx) => ctx.distanceToTarget < 50 }
      ]
    }
  ]
}
```

The nested state machine will automatically:
- Enter its initial state when the parent state is entered
- Tick every frame while the parent state is active
- Exit its current state when the parent state is exited

### Access Current State

```typescript
const currentState = stateMachine.getCurrentState();
console.log(`Current state: ${currentState?.id}`);
console.log(`Time in state: ${currentState?.getTimeInState()}s`);
```

### State History

Track state transitions for debugging:

```typescript
console.log(stateMachine.stateHistory);
// [
//   { from: null, to: 'idle', timestamp: 1234567890 },
//   { from: 'idle', to: 'walk', timestamp: 1234567900 },
//   { from: 'walk', to: 'run', timestamp: 1234567910 }
// ]
```

### Multiple State Machines per Entity

Entities can have multiple independent state machines:

```typescript
class Enemy {
  movementAI: StateMachine<GameContext>;
  combatAI: StateMachine<GameContext>;
  emotionAI: StateMachine<GameContext>;

  constructor() {
    this.movementAI = new StateMachineBuilder<GameContext>()
      .states([/* movement states */])
      .initialState('idle')
      .build();

    this.combatAI = new StateMachineBuilder<GameContext>()
      .states([/* combat states */])
      .initialState('passive')
      .build();

    this.emotionAI = new StateMachineBuilder<GameContext>()
      .states([/* emotion states */])
      .initialState('neutral')
      .build();
  }

  update(context: GameContext) {
    this.movementAI.tick();
    this.combatAI.tick();
    this.emotionAI.tick();
  }
}
```

## API Reference

### `StateMachineBuilder<T>`

Builder class for creating state machines.

**Methods:**
- `.states(configs: StateConfig<T>[])` - Define all states
- `.initialState(stateId: string)` - Set the initial state
- `.build()` - Build and return the StateMachine

### `StateMachine<T>`

The main state machine class.

**Methods:**
- `.start(context: T)` - Initialize and start the state machine
- `.tick()` - Update the state machine (call every frame)
- `.getCurrentState()` - Get the current state
- `.getStateById(id: string)` - Get a state by its ID
- `.exit()` - Exit the current state

**Properties:**
- `.currentState` - The currently active state
- `.stateHistory` - Array of state transitions

### `State<T>`

Individual state class.

**Methods:**
- `.getTimeInState()` - Get seconds elapsed since entering this state

**Properties:**
- `.id` - State identifier

## Design Patterns

### Guard Functions in Class Context

Since transitions reference `this`, you can access entity properties:

```typescript
class Enemy {
  health = 100;
  
  constructor() {
    this.ai = new StateMachineBuilder<Context>()
      .states([
        {
          id: 'aggressive',
          transitions: [
            {
              target: 'retreat',
              guard: (ctx) => this.health < 30  // Access entity properties
            }
          ]
        }
      ])
      .build();
  }
}
```

### State-Specific Data

Store state-specific data directly on your entity:

```typescript
class NPC {
  // State-specific data
  patrolPath: Position[] = [];
  currentWaypoint = 0;
  chaseTarget: Entity | null = null;
  
  constructor() {
    this.ai = new StateMachineBuilder<Context>()
      .states([
        {
          id: 'patrol',
          onEnter: (ctx) => {
            this.patrolPath = this.generatePatrolPath();
            this.currentWaypoint = 0;
          }
        }
      ])
      .build();
  }
}
```

### Shared Transitions

Define common transition logic in helper functions:

```typescript
const canSeePlayer = (ctx: Context) => 
  ctx.physics.lineOfSight(ctx.enemy.pos, ctx.player.pos);

const tooFarFromSpawn = (ctx: Context) =>
  ctx.distance(ctx.enemy.pos, ctx.enemy.spawnPoint) > 500;

// Use in multiple states
{
  id: 'patrol',
  transitions: [
    { target: 'chase', guard: canSeePlayer },
    { target: 'return', guard: tooFarFromSpawn }
  ]
}
```

## Performance Considerations

- **Transition Order**: Transitions are evaluated in order. Put most common transitions first.
- **Guard Complexity**: Keep guard functions lightweight - they run every frame.
- **Context Size**: Only include data in context that states actually need.
- **State Depth**: Deeply nested state machines (3+ levels) may impact readability more than performance.

## Debugging Tips

1. **Log State Changes**: Add logging to `onEnter`/`onExit`:
   ```typescript
   onEnter: (ctx) => console.log(`Entering ${this.id}`)
   ```

2. **Visualize State History**:
   ```typescript
   console.table(stateMachine.stateHistory);
   ```

3. **Check Transition Guards**:
   ```typescript
   // Add named functions for better debugging
   const isHealthLow = (ctx) => {
     const result = ctx.health < 30;
     console.log(`isHealthLow: ${result}`);
     return result;
   };
   ```

4. **State Duration**: Monitor time in states:
   ```typescript
   if (currentState.getTimeInState() > 10) {
     console.warn(`Stuck in ${currentState.id} for 10+ seconds`);
   }
   ```

## License

MIT - Use freely in your projects

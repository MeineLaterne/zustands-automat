/**
 * State Machine Library
 * 
 * A lightweight, type-safe state machine implementation with support for:
 * - Declarative state configuration
 * - Nested state machines
 * - Guard conditions on transitions
 * - Lifecycle hooks (onEnter, onStay, onExit)
 */

export type StateHandler<T> = (context: T) => void;

export interface TransitionConfig<T> {
  target: string;
  guard?: (context: T) => boolean;
}

export interface StateConfig<T> {
  id: string;
  onEnter?: StateHandler<T>;
  onStay?: StateHandler<T>;
  onExit?: StateHandler<T>;
  transitions?: TransitionConfig<T>[];
  states?: StateConfig<T>[]; // Nested states for hierarchical state machines
}

export interface Transition<T> {
  target: State<T>;
  guard?: (context: T) => boolean;
}

export class State<T> {
  id: string;
  enterHandler?: StateHandler<T>;
  stayHandler?: StateHandler<T>;
  exitHandler?: StateHandler<T>;
  transitionConfigs: TransitionConfig<T>[];
  transitions: Map<string, Transition<T>> = new Map();
  nestedStateMachine?: StateMachine<T>;
  enteredAt: number = 0;

  constructor(
    id: string,
    enterHandler?: StateHandler<T>,
    stayHandler?: StateHandler<T>,
    exitHandler?: StateHandler<T>,
    transitionConfigs: TransitionConfig<T>[] = [],
    nestedStateMachine?: StateMachine<T>
  ) {
    this.id = id;
    this.enterHandler = enterHandler;
    this.stayHandler = stayHandler;
    this.exitHandler = exitHandler;
    this.transitionConfigs = transitionConfigs;
    this.nestedStateMachine = nestedStateMachine;
  }

  init(machine: StateMachine<T>): void {
    // Resolve transition references
    this.transitionConfigs.forEach(tc => {
      const targetState = machine.states.get(tc.target);
      if (targetState) {
        this.transitions.set(targetState.id, {
          target: targetState,
          guard: tc.guard
        });
      } else {
        throw new Error(`Invalid transition target: ${tc.target}`);
      }
    });

    // Initialize nested state machine if present
    this.nestedStateMachine?.init();    
  }

  enter(context: T): void {
    this.enteredAt = Date.now();
    this.enterHandler?.(context);
    
    // Enter nested machine's initial state
    this.nestedStateMachine?.enter(context);    
  }

  stay(context: T): State<T> {
    // Check transitions first (transitions have priority)
    for (const [_, transition] of this.transitions) {
      if (!transition.guard || transition.guard(context)) {
        return transition.target;
      }
    }

    // Execute stay logic
    this.stayHandler?.(context);

    // Update nested state machine
    if (this.nestedStateMachine) {
      this.nestedStateMachine.tick();
      
      // Check if nested machine wants to transition out
      // (This could be extended to support nested machine completion events)
    }

    // Stay in this state
    return this;
  }

  exit(context: T): void {
    this.exitHandler?.(context);
    
    // Exit nested machine's current state
    this.nestedStateMachine?.exit();
  }

  getTimeInState(): number {
    return (Date.now() - this.enteredAt) / 1000;
  }
}

export interface StateHistoryEntry {
  from: string | null;
  to: string;
  timestamp: number;
}

export class StateMachine<T> {
  context: T;
  states: Map<string, State<T>> = new Map();
  currentState: State<T> | null = null;
  initialState: State<T> | null = null;
  stateHistory: StateHistoryEntry[] = [];
  maxHistorySize: number = 50;

  constructor(context: T) {
    this.context = context;
  }

  addState(state: State<T>): void {
    this.states.set(state.id, state);
  }

  setInitialState(stateId: string): void {
    const state = this.states.get(stateId);
    if (state) {
      this.initialState = state;
    } else {
      throw new Error(`Initial state "${stateId}" not found`);
    }
  }

  init(): void {
    // Initialize all states (resolve transitions)
    this.states.forEach(state => state.init(this));
  }
  
  enter(context: T): void {
    this.context = context;
    if (this.initialState) {
      this.currentState = this.initialState;
      this.initialState.enter(context);
      this.recordTransition(null, this.initialState.id);
    }
  }

  setCurrentState(state: State<T>): void {
    if (this.context === null) {
      console.warn('Cannot set current state: context is null');
      return;
    }

    const previousState = this.currentState;

    // Exit current state
    this.currentState?.exit(this.context);
    
    // Transition to new state
    this.currentState = state;

    // Enter new state
    if (state) {
      state.enter(this.context);
      this.recordTransition(previousState?.id ?? null, state.id);
    }
  }

  tick(): void {
    if (this.currentState === null || this.context === null) {
      return;
    }

    const nextState = this.currentState.stay(this.context);

    if (nextState !== this.currentState) {
      this.setCurrentState(nextState);
    }
  }

  exit(): void {
    if (this.currentState && this.context) {
      this.currentState.exit(this.context);
      this.currentState = null;
    }
  }

  getCurrentState(): State<T> | null {
    return this.currentState;
  }

  getStateById(id: string): State<T> | undefined {
    return this.states.get(id);
  }

  private recordTransition(from: string | null, to: string): void {
    this.stateHistory.push({
      from,
      to,
      timestamp: Date.now()
    });

    // Keep history size bounded
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift();
    }
  }
}

export class StateMachineBuilder<T> {
  private machine: StateMachine<T>;
  private stateConfigs: StateConfig<T>[] = [];
  private initialStateId?: string;

  constructor(context: T) {
    this.machine = new StateMachine<T>(context);
  }

  states(configs: StateConfig<T>[]): StateMachineBuilder<T> {
    this.stateConfigs = configs;
    return this;
  }

  initialState(stateId: string): StateMachineBuilder<T> {
    this.initialStateId = stateId;
    return this;
  }

  build(): StateMachine<T> {
    // Build states recursively
    this.stateConfigs.forEach(config => {
      this.buildStateFromConfig(config, this.machine);
    });

    // Initialize state machine (resolve transitions)
    this.machine.init();

    // Set initial state
    if (this.initialStateId) {
      this.machine.setInitialState(this.initialStateId);
      this.machine.setCurrentState(this.machine.getStateById(this.initialStateId)!);
    }

    return this.machine;
  }

  private buildStateFromConfig(config: StateConfig<T>, parentMachine: StateMachine<T>): void {
    let nestedMachine: StateMachine<T> | undefined;

    // If this state has nested states, create a nested state machine
    if (config.states && config.states.length > 0) {
      nestedMachine = new StateMachine<T>(this.machine.context);
      
      // Build nested states
      config.states.forEach(nestedConfig => {
        this.buildStateFromConfig(nestedConfig, nestedMachine!);
      });

      // Set first nested state as initial state by default
      const firstNestedState = nestedMachine.states.values().next().value;
      if (firstNestedState) {
        nestedMachine.initialState = firstNestedState;
      }
    }

    // Create the state
    const state = new State<T>(
      config.id,
      config.onEnter,
      config.onStay,
      config.onExit,
      config.transitions || [],
      nestedMachine
    );

    // Add to parent machine
    parentMachine.addState(state);
  }
}

/**
 * Helper function to create a state machine builder
 * @param context Optional context to pass to the builder
 * @returns A new StateMachineBuilder instance
 */
export function createStateMachine<T>(context: T): StateMachineBuilder<T> {
  return new StateMachineBuilder<T>(context);
}

/**
 * Type guard to check if a value is a StateConfig
 */
export function isStateConfig<T>(value: any): value is StateConfig<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.id === 'string'
  );
}

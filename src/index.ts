
export class TransitionBuilder<T> {
  from: StateBuilder<T>;
  to: StateBuilder<T>;
  guardCondition?: (context: T) => boolean;

  constructor(from: StateBuilder<T>, to: StateBuilder<T>) {
    this.from = from;
    this.to = to;
  }

  when(guardCondition: (context: T) => boolean) {
    this.guardCondition = guardCondition;
    return this.from;
  }
}

export type Transition<T> = {
  target: State<T>;
  guard?: (context: T) => boolean;
};

export type StateProps<T> = {
  id: string;
  transitions: TransitionBuilder<T>[];
  enterHandler?: (context: T) => void;
  stayHandler?: (context: T) => void;
  exitHandler?: (context: T) => void;
  nestedStateMachine?: StateMachine<T>;
};

export class State<T> {
  id: string;
  transitionBuilders: TransitionBuilder<T>[];
  transitions: Map<string, Transition<T>> = new Map();
  enterHandler?: (context: T) => void;
  stayHandler?: (context: T) => void;
  exitHandler?: (context: T) => void;
  nestedStateMachine?: StateMachine<T>;

  constructor({ id, transitions, enterHandler, stayHandler, exitHandler, nestedStateMachine }: StateProps<T>) {
    this.id = id;
    this.transitionBuilders = transitions;
    this.enterHandler = enterHandler;
    this.stayHandler = stayHandler;
    this.exitHandler = exitHandler;
    this.nestedStateMachine = nestedStateMachine;
  }

  init(machine: StateMachine<T>) {
    // Resolve transition references
    this.transitionBuilders.forEach(tb => {
      const targetState = machine.states.get(tb.to.id);
      if (targetState) {
        this.transitions.set(targetState.id, {
          target: targetState,
          guard: tb.guardCondition
        });
      }
    });
  }

  enter(context: T) {
    this.enterHandler?.(context);
    // TODO: nested machines
  }

  stay(context: T): State<T> {
    // check transitions
    for (const [_, transition] of this.transitions) {
      if (!transition.guard || transition.guard(context)) {
        // transition to next state
        return transition.target;
      }
    }

    // execute handler
    this.stayHandler?.(context);

    // nested machine
    this.nestedStateMachine?.tick();

    // stay in this state
    return this;
  }

  exit(context: T) {
    this.exitHandler?.(context);
    // TODO: nested machines
  }
}

export class StateBuilder<T> {
  id: string;
  private _transitions: TransitionBuilder<T>[] = [];
  private _enterHandler?: (context: T) => void;
  private _stayHandler?: (context: T) => void;
  private _exitHandler?: (context: T) => void;
  private _nestedStateMachine?: StateMachine<T>;

  constructor(id: string) {
    this.id = id;
  }

  onEnter(handler: (context: T) => void): StateBuilder<T> {
    this._enterHandler = handler;
    return this;
  }

  onStay(handler: (context: T) => void): StateBuilder<T> {
    this._stayHandler = handler;
    return this;
  }

  onExit(handler: (context: T) => void): StateBuilder<T> {
    this._exitHandler = handler;
    return this;
  }

  to(targetStateBuilder: StateBuilder<T>): TransitionBuilder<T> {
    const transition = new TransitionBuilder(this, targetStateBuilder);
    this._transitions.push(transition);
    return transition;
  }

  nest(subMachine: StateMachine<T>): StateBuilder<T> {
    this._nestedStateMachine = subMachine;
    return this;
  }

  build(): State<T> {
    return new State({
      id: this.id,
      enterHandler: this._enterHandler,
      stayHandler: this._stayHandler,
      exitHandler: this._exitHandler,
      transitions: this._transitions,
      nestedStateMachine: this._nestedStateMachine
    });
  }
}

export class StateMachine<T> {
  private _states: Map<string, State<T>> = new Map();
  private _currentState: State<T> | null = null;
  private _context: T | null = null;
  private _initialState?: State<T>;

  set initialState(value: State<T> | undefined) {
    this._initialState = value;
  }

  get states(): Map<string, State<T>> {
    return this._states;
  }

  get currentState() {
    return this._currentState;
  }

  addState(key: string, state: State<T>) {
    this._states.set(key, state);
  }

  initStates() {
    this._states.forEach(state => state.init(this));
  }

  setCurrentState(state: State<T>) {
    if (this._context === null) {
      return;
    }
    
    this._currentState?.exit(this._context)
    
    this._currentState = state;
    
    state.enter(this._context);
  }

  start(context: T) {
    this._context = context;
    if (this._initialState) {
      this.setCurrentState(this._initialState);
    }
  }

  tick() { 
    if (this._currentState === null || this._context === null) {
      return;
    }
    
    const nextState = this._currentState.stay(this._context);
    
    if (nextState !== this._currentState) {
      this.setCurrentState(nextState);
    }
  }

  end() {}
}

export class StateMachineBuilder<T> {
  private _stateBuilders: Map<string, StateBuilder<T>> = new Map();
  private _initialStateBuilder?: StateBuilder<T>;

  state(id: string): StateBuilder<T> {
    if (!this._stateBuilders.has(id)) {
      const builder = new StateBuilder<T>(id);
      this._stateBuilders.set(id, builder);
    }
    return this._stateBuilders.get(id)!;
  }

  initial(stateBuilder: StateBuilder<T>): StateMachineBuilder<T> {
    this._initialStateBuilder = stateBuilder;
    return this;
  }

  build(): StateMachine<T> {
    const machine = new StateMachine<T>();

    // Build all states
    this._stateBuilders.forEach((builder, id) => {
      const state = builder.build();
      machine.addState(id, state);
    });

    // Initialize all states (resolve transitions)
    machine.initStates();

    // Set initial state
    if (this._initialStateBuilder) {
      machine.initialState = machine.states.get(this._initialStateBuilder.id);
    }

    return machine;
  }
}
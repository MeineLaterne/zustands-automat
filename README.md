## Description

A declarative API for building finite state machines.

This is work in progress.

## Example

```typescript
const sm = new StateMachineBuilder();

// Define states
const idle = sm.state('idle')
    .onEnter((ctx) => {
        this.velX = 0;
        this.color = '#4CAF50';
    })
    .onStay((ctx) => {
        this.velX *= 0.8; // Friction
    });

const walk = sm.state('walk')
    .onEnter((ctx) => {
        this.color = '#8BC34A';
    })
    .onStay((ctx) => {
        const speed = 3;
        if (ctx.input.isMovingLeft()) {
            this.velX = -speed;
            this.facing = -1;
        } else if (ctx.input.isMovingRight()) {
            this.velX = speed;
            this.facing = 1;
        }
    });

const run = sm.state('run')
    .onEnter((ctx) => {
        this.color = '#FFC107';
    })
    .onStay((ctx) => {
        const speed = 6;
        if (ctx.input.isMovingLeft()) {
            this.velX = -speed;
            this.facing = -1;
        } else if (ctx.input.isMovingRight()) {
            this.velX = speed;
            this.facing = 1;
        }
    });

const jump = sm.state('jump')
    .onEnter((ctx) => {
        this.velY = -12;
        this.color = '#2196F3';
    })
    .onStay((ctx) => {
        // Air control
        const airControl = 0.5;
        if (ctx.input.isMovingLeft()) {
            this.velX -= airControl;
            this.facing = -1;
        } else if (ctx.input.isMovingRight()) {
            this.velX += airControl;
            this.facing = 1;
        }
        this.velX *= 0.95; // Air resistance
    });

const fall = sm.state('fall')
    .onEnter((ctx) => {
        this.color = '#9C27B0';
    })
    .onStay((ctx) => {
        // Air control
        const airControl = 0.5;
        if (ctx.input.isMovingLeft()) {
            this.velX -= airControl;
            this.facing = -1;
        } else if (ctx.input.isMovingRight()) {
            this.velX += airControl;
            this.facing = 1;
        }
        this.velX *= 0.95;
    });

// Define transitions
idle
    .to(walk).when((ctx) => ctx.input.isMoving() && !ctx.input.isRunning())
    .to(run).when((ctx) => ctx.input.isMoving() && ctx.input.isRunning())
    .to(jump).when((ctx) => ctx.input.jumpPressed() && this.isGrounded(ctx))
    .to(fall).when((ctx) => !this.isGrounded(ctx));

walk
    .to(idle).when((ctx) => !ctx.input.isMoving())
    .to(run).when((ctx) => ctx.input.isMoving() && ctx.input.isRunning())
    .to(jump).when((ctx) => ctx.input.jumpPressed() && this.isGrounded(ctx))
    .to(fall).when((ctx) => !this.isGrounded(ctx));

run
    .to(idle).when((ctx) => !ctx.input.isMoving())
    .to(walk).when((ctx) => ctx.input.isMoving() && !ctx.input.isRunning())
    .to(jump).when((ctx) => ctx.input.jumpPressed() && this.isGrounded(ctx))
    .to(fall).when((ctx) => !this.isGrounded(ctx));

jump
    .to(fall).when((ctx) => this.velY > 0)
    .to(idle).when((ctx) => this.isGrounded(ctx));

fall
    .to(idle).when((ctx) => this.isGrounded(ctx) && !ctx.input.isMoving())
    .to(walk).when((ctx) => this.isGrounded(ctx) && ctx.input.isMoving() && !ctx.input.isRunning())
    .to(run).when((ctx) => this.isGrounded(ctx) && ctx.input.isMoving() && ctx.input.isRunning());

const stateMachine = sm.initial(idle).build();

```
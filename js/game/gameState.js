/*

* Hillbound
* js/game/gameState.js
* 
* Central runtime state manager for the active game session.
* Keeps gameplay state separate from physics, UI, and persistence.
  */

(function () {
"use strict";

window.Hillbound = window.Hillbound || {};

const GameState = {};

const STATES = {
    LOADING: "loading",
    READY: "ready",
    PLAYING: "playing",
    PAUSED: "paused",
    GAME_OVER: "gameover",
    CRASHED: "crashed",
    RESTARTING: "restarting"
};

const DEFAULTS = {
    state: STATES.LOADING,

    map: "countryside",
    vehicle: "starter-car",

    distance: 0,
    score: 0,
    coins: 0,
    fuel: 100,

    bestDistance: 0,
    bestScore: 0,

    elapsedTime: 0,
    runCount: 0,

    paused: false,
    gameOver: false,
    crashed: false,

    newBestDistance: false,
    newBestScore: false,

    startedAt: null,
    endedAt: null,

    reason: null
};

const clamp = (value, min, max) => {
    return Math.max(min, Math.min(max, value));
};

const number = (value, fallback = 0) => {
    const result = Number(value);

    return Number.isFinite(result)
        ? result
        : fallback;
};

const bool = (value, fallback = false) => {
    if (value === undefined || value === null) {
        return fallback;
    }

    return Boolean(value);
};

const clone = (object) => {
    try {
        return JSON.parse(JSON.stringify(object));
    } catch (error) {
        return Object.assign({}, object);
    }
};

function create(options = {}) {
    const state = Object.assign(
        {},
        DEFAULTS,
        options
    );

    state.state = options.state || STATES.LOADING;

    state.paused = state.state === STATES.PAUSED;
    state.gameOver =
        state.state === STATES.GAME_OVER ||
        state.state === STATES.CRASHED;

    state.crashed =
        state.state === STATES.CRASHED;

    state.startedAt = null;
    state.endedAt = null;

    state.reason = null;

    state.version = 1;

    state._listeners = {};

    return state;
}

function get(state, key, fallback = null) {
    if (!state || key === undefined) {
        return fallback;
    }

    return state[key] !== undefined
        ? state[key]
        : fallback;
}

function set(state, key, value) {
    if (!state || !key) {
        return state;
    }

    const previous = state[key];

    state[key] = value;

    emit(state, "change", {
        key,
        value,
        previous
    });

    return state;
}

function update(state, values = {}) {
    if (!state || !values) {
        return state;
    }

    Object.keys(values).forEach((key) => {
        const previous = state[key];

        state[key] = values[key];

        if (previous !== state[key]) {
            emit(state, "change", {
                key,
                value: state[key],
                previous
            });
        }
    });

    return state;
}

function setState(state, nextState, options = {}) {
    if (!state) {
        return null;
    }

    const previousState = state.state;

    if (!Object.values(STATES).includes(nextState)) {
        return state;
    }

    state.state = nextState;

    state.paused =
        nextState === STATES.PAUSED;

    state.gameOver =
        nextState === STATES.GAME_OVER ||
        nextState === STATES.CRASHED;

    state.crashed =
        nextState === STATES.CRASHED;

    if (options.reason !== undefined) {
        state.reason = options.reason;
    }

    if (
        nextState === STATES.PLAYING &&
        !state.startedAt
    ) {
        state.startedAt = Date.now();
    }

    if (
        nextState === STATES.GAME_OVER ||
        nextState === STATES.CRASHED
    ) {
        state.endedAt = Date.now();
    }

    emit(state, "statechange", {
        state: nextState,
        previousState,
        reason: state.reason
    });

    return state;
}

function is(state, value) {
    return !!state && state.state === value;
}

function isPlaying(state) {
    return is(state, STATES.PLAYING);
}

function isPaused(state) {
    return is(state, STATES.PAUSED);
}

function isGameOver(state) {
    return (
        is(state, STATES.GAME_OVER) ||
        is(state, STATES.CRASHED)
    );
}

function isCrashed(state) {
    return is(state, STATES.CRASHED);
}

function prepare(state, options = {}) {
    if (!state) {
        return null;
    }

    state.map =
        options.map ||
        state.map ||
        DEFAULTS.map;

    state.vehicle =
        options.vehicle ||
        state.vehicle ||
        DEFAULTS.vehicle;

    state.distance = 0;
    state.score = 0;
    state.coins = 0;

    state.fuel =
        options.fuel !== undefined
            ? Math.max(0, number(options.fuel))
            : DEFAULTS.fuel;

    state.elapsedTime = 0;

    state.paused = false;
    state.gameOver = false;
    state.crashed = false;

    state.newBestDistance = false;
    state.newBestScore = false;

    state.startedAt = null;
    state.endedAt = null;

    state.reason = null;

    setState(
        state,
        STATES.READY
    );

    emit(state, "prepared", {
        map: state.map,
        vehicle: state.vehicle
    });

    return state;
}

function start(state, options = {}) {
    if (!state) {
        return null;
    }

    if (options.map !== undefined) {
        state.map = options.map;
    }

    if (options.vehicle !== undefined) {
        state.vehicle = options.vehicle;
    }

    if (options.fuel !== undefined) {
        state.fuel = Math.max(
            0,
            number(options.fuel)
        );
    }

    state.distance = 0;
    state.score = 0;
    state.coins = 0;

    state.elapsedTime = 0;

    state.paused = false;
    state.gameOver = false;
    state.crashed = false;

    state.newBestDistance = false;
    state.newBestScore = false;

    state.reason = null;

    state.runCount =
        Math.max(
            0,
            Math.floor(
                number(state.runCount, 0)
            )
        ) + 1;

    state.startedAt = Date.now();
    state.endedAt = null;

    setState(
        state,
        STATES.PLAYING
    );

    emit(state, "start", {
        map: state.map,
        vehicle: state.vehicle,
        runCount: state.runCount
    });

    return state;
}

function pause(state, reason = "manual") {
    if (!state) {
        return false;
    }

    if (
        isGameOver(state) ||
        is(state, STATES.LOADING)
    ) {
        return false;
    }

    if (isPaused(state)) {
        return true;
    }

    setState(
        state,
        STATES.PAUSED,
        { reason }
    );

    emit(state, "pause", {
        reason
    });

    return true;
}

function resume(state) {
    if (!state) {
        return false;
    }

    if (!isPaused(state)) {
        return false;
    }

    state.reason = null;

    setState(
        state,
        STATES.PLAYING
    );

    emit(state, "resume");

    return true;
}

function togglePause(state) {
    if (!state) {
        return false;
    }

    if (isPaused(state)) {
        return resume(state);
    }

    return pause(state);
}

function crash(state, reason = "crash") {
    if (!state) {
        return false;
    }

    if (isGameOver(state)) {
        return false;
    }

    state.reason = reason;
    state.crashed = true;
    state.gameOver = true;
    state.endedAt = Date.now();

    setState(
        state,
        STATES.CRASHED,
        { reason }
    );

    emit(state, "crash", {
        reason,
        distance: state.distance,
        score: state.score,
        coins: state.coins
    });

    return true;
}

function end(state, reason = "finished") {
    if (!state) {
        return false;
    }

    if (isGameOver(state)) {
        return false;
    }

    state.reason = reason;
    state.gameOver = true;
    state.endedAt = Date.now();

    setState(
        state,
        STATES.GAME_OVER,
        { reason }
    );

    emit(state, "gameover", {
        reason,
        distance: state.distance,
        score: state.score,
        coins: state.coins
    });

    return true;
}

function restart(state) {
    if (!state) {
        return null;
    }

    const map = state.map;
    const vehicle = state.vehicle;
    const runCount = state.runCount;

    setState(
        state,
        STATES.RESTARTING
    );

    state.map = map;
    state.vehicle = vehicle;
    state.runCount = runCount;

    state.distance = 0;
    state.score = 0;
    state.coins = 0;

    state.fuel = DEFAULTS.fuel;

    state.elapsedTime = 0;

    state.paused = false;
    state.gameOver = false;
    state.crashed = false;

    state.newBestDistance = false;
    state.newBestScore = false;

    state.startedAt = null;
    state.endedAt = null;

    state.reason = null;

    emit(state, "restart");

    return state;
}

function updateRuntime(
    state,
    values = {},
    dt = 1 / 60
) {
    if (!state) {
        return null;
    }

    if (!isPlaying(state)) {
        return state;
    }

    dt = clamp(
        number(dt, 1 / 60),
        0,
        0.1
    );

    state.elapsedTime += dt;

    if (values.distance !== undefined) {
        state.distance = Math.max(
            0,
            number(values.distance)
        );
    }

    if (values.score !== undefined) {
        state.score = Math.max(
            0,
            number(values.score)
        );
    }

    if (values.coins !== undefined) {
        state.coins = Math.max(
            0,
            number(values.coins)
        );
    }

    if (values.fuel !== undefined) {
        state.fuel = Math.max(
            0,
            number(values.fuel)
        );
    }

    return state;
}

function setDistance(state, distance) {
    if (!state) return 0;

    state.distance = Math.max(
        0,
        number(distance)
    );

    return state.distance;
}

function addDistance(state, distance) {
    if (!state) return 0;

    state.distance = Math.max(
        0,
        state.distance +
        number(distance)
    );

    return state.distance;
}

function setScore(state, score) {
    if (!state) return 0;

    state.score = Math.max(
        0,
        number(score)
    );

    return state.score;
}

function addScore(state, score) {
    if (!state) return 0;

    state.score = Math.max(
        0,
        state.score +
        number(score)
    );

    return state.score;
}

function setCoins(state, coins) {
    if (!state) return 0;

    state.coins = Math.max(
        0,
        number(coins)
    );

    return state.coins;
}

function addCoins(state, coins = 1) {
    if (!state) return 0;

    state.coins = Math.max(
        0,
        state.coins +
        number(coins)
    );

    return state.coins;
}

function setFuel(state, fuel) {
    if (!state) return 0;

    state.fuel = Math.max(
        0,
        number(fuel)
    );

    return state.fuel;
}

function consumeFuel(state, amount) {
    if (!state) return 0;

    state.fuel = Math.max(
        0,
        state.fuel -
        Math.max(0, number(amount))
    );

    if (state.fuel <= 0) {
        emit(state, "fuelEmpty");
    }

    return state.fuel;
}

function setBestDistance(state, distance) {
    if (!state) return false;

    distance = Math.max(
        0,
        number(distance)
    );

    if (distance <= state.bestDistance) {
        return false;
    }

    state.bestDistance = distance;
    state.newBestDistance = true;

    emit(state, "newBestDistance", {
        distance
    });

    return true;
}

function setBestScore(state, score) {
    if (!state) return false;

    score = Math.max(
        0,
        number(score)
    );

    if (score <= state.bestScore) {
        return false;
    }

    state.bestScore = score;
    state.newBestScore = true;

    emit(state, "newBestScore", {
        score
    });

    return true;
}

function updateBestRecords(state) {
    if (!state) return;

    setBestDistance(
        state,
        state.distance
    );

    setBestScore(
        state,
        state.score
    );

    return state;
}

function clearRunFlags(state) {
    if (!state) return;

    state.newBestDistance = false;
    state.newBestScore = false;

    return state;
}

function getRunData(state) {
    if (!state) return null;

    return {
        map: state.map,
        vehicle: state.vehicle,

        distance: state.distance,
        score: state.score,
        coins: state.coins,
        fuel: state.fuel,

        elapsedTime: state.elapsedTime,

        bestDistance: state.bestDistance,
        bestScore: state.bestScore,

        runCount: state.runCount,

        state: state.state,
        paused: state.paused,
        gameOver: state.gameOver,
        crashed: state.crashed,

        reason: state.reason,

        newBestDistance:
            state.newBestDistance,

        newBestScore:
            state.newBestScore
    };
}

function serialize(state) {
    if (!state) return null;

    const data = getRunData(state);

    delete data._listeners;

    return clone(data);
}

function restore(state, data = {}) {
    if (!state || !data) {
        return state;
    }

    const allowedKeys = [
        "map",
        "vehicle",
        "distance",
        "score",
        "coins",
        "fuel",
        "elapsedTime",
        "bestDistance",
        "bestScore",
        "runCount",
        "reason"
    ];

    allowedKeys.forEach((key) => {
        if (data[key] !== undefined) {
            state[key] = data[key];
        }
    });

    state.distance = Math.max(
        0,
        number(state.distance)
    );

    state.score = Math.max(
        0,
        number(state.score)
    );

    state.coins = Math.max(
        0,
        number(state.coins)
    );

    state.fuel = Math.max(
        0,
        number(state.fuel)
    );

    state.elapsedTime = Math.max(
        0,
        number(state.elapsedTime)
    );

    state.bestDistance = Math.max(
        0,
        number(state.bestDistance)
    );

    state.bestScore = Math.max(
        0,
        number(state.bestScore)
    );

    state.runCount = Math.max(
        0,
        Math.floor(number(state.runCount))
    );

    return state;
}

function subscribe(state, eventName, callback) {
    if (!state || typeof callback !== "function") {
        return function () {};
    }

    if (!state._listeners[eventName]) {
        state._listeners[eventName] = [];
    }

    state._listeners[eventName].push(callback);

    return function unsubscribe() {
        unsubscribeEvent(
            state,
            eventName,
            callback
        );
    };
}

function unsubscribeEvent(
    state,
    eventName,
    callback
) {
    if (
        !state ||
        !state._listeners ||
        !state._listeners[eventName]
    ) {
        return;
    }

    state._listeners[eventName] =
        state._listeners[eventName].filter(
            (listener) => listener !== callback
        );
}

function emit(state, eventName, detail = {}) {
    if (!state || !state._listeners) {
        return;
    }

    const listeners =
        state._listeners[eventName];

    if (!listeners) {
        return;
    }

    listeners.slice().forEach((listener) => {
        try {
            listener(detail, state);
        } catch (error) {
            console.error(
                "[Hillbound.GameState]",
                error
            );
        }
    });
}

function destroy(state) {
    if (!state) return;

    if (state._listeners) {
        Object.keys(state._listeners).forEach(
            (eventName) => {
                state._listeners[eventName].length = 0;
            }
        );

        state._listeners = {};
    }

    state.state = STATES.GAME_OVER;

    return state;
}

/*
 * Public API
 */

GameState.STATES = STATES;
GameState.DEFAULTS = DEFAULTS;

GameState.create = create;

GameState.get = get;
GameState.set = set;
GameState.update = update;

GameState.setState = setState;

GameState.is = is;
GameState.isPlaying = isPlaying;
GameState.isPaused = isPaused;
GameState.isGameOver = isGameOver;
GameState.isCrashed = isCrashed;

GameState.prepare = prepare;
GameState.start = start;
GameState.pause = pause;
GameState.resume = resume;
GameState.togglePause = togglePause;

GameState.crash = crash;
GameState.end = end;
GameState.restart = restart;

GameState.updateRuntime = updateRuntime;

GameState.setDistance = setDistance;
GameState.addDistance = addDistance;

GameState.setScore = setScore;
GameState.addScore = addScore;

GameState.setCoins = setCoins;
GameState.addCoins = addCoins;

GameState.setFuel = setFuel;
GameState.consumeFuel = consumeFuel;

GameState.setBestDistance = setBestDistance;
GameState.setBestScore = setBestScore;
GameState.updateBestRecords =
    updateBestRecords;

GameState.clearRunFlags =
    clearRunFlags;

GameState.getRunData = getRunData;

GameState.serialize = serialize;
GameState.restore = restore;

GameState.subscribe = subscribe;
GameState.unsubscribe = unsubscribeEvent;

GameState.emit = emit;
GameState.destroy = destroy;

window.Hillbound.GameState = GameState;
window.HillboundGameState = GameState;
window.GameState = GameState;

})();
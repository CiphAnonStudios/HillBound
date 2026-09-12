/*

* Hillbound
* js/game/score.js
* 
* Score, distance, multiplier, and run-record management.
  */

(function () {
"use strict";

window.Hillbound = window.Hillbound || {};

const Score = {};

const defaults = {
    distanceMultiplier: 1,
    scoreMultiplier: 1,
    coinMultiplier: 1,

    distanceScoreRate: 10,
    coinScoreValue: 25,

    airTimeBonus: 5,
    flipBonus: 100,
    landingBonus: 25,

    maxScore: Number.MAX_SAFE_INTEGER,
    saveBestScore: true,
    saveBestDistance: true,

    storagePrefix: "hillbound_"
};

const clamp = (value, min, max) =>
    Math.max(min, Math.min(max, value));

const number = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};

const getMapKey = (map) => {
    if (!map) return "countryside";

    if (typeof map === "string") {
        return map.toLowerCase().replace(/\s+/g, "-");
    }

    return String(
        map.id ||
        map.key ||
        map.name ||
        "countryside"
    ).toLowerCase().replace(/\s+/g, "-");
};

const storageKey = (type, map) => {
    return defaults.storagePrefix +
        type +
        "_" +
        getMapKey(map);
};

function readStorage(key, fallback = 0) {
    try {
        const value = localStorage.getItem(key);

        if (value === null) {
            return fallback;
        }

        const parsed = Number(value);

        return Number.isFinite(parsed)
            ? parsed
            : fallback;
    } catch (error) {
        return fallback;
    }
}

function writeStorage(key, value) {
    try {
        localStorage.setItem(key, String(value));
        return true;
    } catch (error) {
        return false;
    }
}

function create(options = {}) {
    const config = Object.assign({}, defaults, options);

    const score = {
        config,

        distance: 0,
        score: 0,
        coins: 0,

        bestDistance: 0,
        bestScore: 0,

        runStarted: false,
        finished: false,

        multiplier: 1,

        airTime: 0,
        flips: 0,
        landings: 0,

        lastDistance: 0,
        lastScore: 0,
        lastCoins: 0,

        map: null,
        vehicle: null,

        _lastX: null,
        _airStart: null,
        _rotationStart: null,
        _lastRotation: null
    };

    loadBest(score, options.map);

    return score;
}

function loadBest(score, map) {
    const mapKey = map || score.map || "countryside";

    score.bestDistance = readStorage(
        storageKey("best_distance", mapKey),
        0
    );

    score.bestScore = readStorage(
        storageKey("best_score", mapKey),
        0
    );
}

function setMap(score, map) {
    if (!score) return;

    score.map = map || "countryside";

    loadBest(score, score.map);

    return score;
}

function setVehicle(score, vehicle) {
    if (!score) return;

    score.vehicle = vehicle || null;

    return score;
}

function startRun(score, options = {}) {
    if (!score) return null;

    if (options.map !== undefined) {
        setMap(score, options.map);
    }

    if (options.vehicle !== undefined) {
        setVehicle(score, options.vehicle);
    }

    score.distance = 0;
    score.score = 0;
    score.coins = 0;

    score.multiplier = number(
        options.multiplier,
        1
    );

    score.airTime = 0;
    score.flips = 0;
    score.landings = 0;

    score.lastDistance = 0;
    score.lastScore = 0;
    score.lastCoins = 0;

    score.runStarted = true;
    score.finished = false;

    score._lastX = null;
    score._airStart = null;
    score._rotationStart = null;
    score._lastRotation = null;

    return score;
}

function update(score, vehicle, dt = 1 / 60) {
    if (!score || !score.runStarted || score.finished) {
        return score;
    }

    dt = clamp(number(dt, 1 / 60), 0, 0.1);

    if (vehicle) {
        score.vehicle = vehicle;
    }

    const currentVehicle = score.vehicle;

    if (!currentVehicle) {
        return score;
    }

    updateDistance(score, currentVehicle);
    updateAirTime(score, currentVehicle, dt);
    updateRotation(score, currentVehicle);

    return score;
}

function updateDistance(score, vehicle) {
    const x = number(vehicle.x, 0);

    if (score._lastX === null) {
        score._lastX = x;
        return;
    }

    const delta = x - score._lastX;

    if (delta > 0) {
        score.distance += delta * score.config.distanceMultiplier;

        const distancePoints =
            delta *
            score.config.distanceScoreRate *
            score.config.scoreMultiplier *
            score.multiplier;

        addScore(score, distancePoints);
    }

    score._lastX = x;
}

function updateAirTime(score, vehicle, dt) {
    const grounded = !!vehicle.grounded;

    if (!grounded) {
        if (score._airStart === null) {
            score._airStart = 0;
        }

        score.airTime += dt;

        return;
    }

    if (score._airStart !== null) {
        const airtime = score.airTime;

        if (airtime > 0.35) {
            const bonus =
                airtime *
                score.config.airTimeBonus *
                score.multiplier;

            addScore(score, bonus);
        }

        score._airStart = null;
    }
}

function updateRotation(score, vehicle) {
    const rotation = number(vehicle.rotation, 0);

    if (score._lastRotation === null) {
        score._lastRotation = rotation;
        return;
    }

    let delta = rotation - score._lastRotation;

    while (delta > Math.PI) {
        delta -= Math.PI * 2;
    }

    while (delta < -Math.PI) {
        delta += Math.PI * 2;
    }

    if (!vehicle.grounded && Math.abs(delta) > 0.15) {
        score._rotationStart =
            number(score._rotationStart, 0) + delta;
    }

    if (vehicle.grounded && score._rotationStart !== null) {
        const rotations =
            Math.floor(
                Math.abs(score._rotationStart) /
                (Math.PI * 2)
            );

        if (rotations > 0) {
            score.flips += rotations;

            addScore(
                score,
                rotations *
                score.config.flipBonus *
                score.multiplier
            );
        }

        score._rotationStart = null;
    }

    score._lastRotation = rotation;
}

function addScore(score, amount) {
    if (!score) return 0;

    amount = number(amount, 0);

    if (amount <= 0) {
        return score.score;
    }

    score.score = clamp(
        score.score + amount,
        0,
        score.config.maxScore
    );

    return score.score;
}

function addCoins(score, amount = 1) {
    if (!score) return 0;

    amount = Math.max(0, number(amount, 0));

    const multiplied =
        amount *
        score.config.coinMultiplier;

    score.coins += multiplied;

    addScore(
        score,
        multiplied *
        score.config.coinScoreValue *
        score.multiplier
    );

    return score.coins;
}

function setDistance(score, distance) {
    if (!score) return;

    score.distance = Math.max(
        0,
        number(distance, 0)
    );

    return score.distance;
}

function setScore(score, value) {
    if (!score) return;

    score.score = clamp(
        number(value, 0),
        0,
        score.config.maxScore
    );

    return score.score;
}

function setMultiplier(score, multiplier) {
    if (!score) return;

    score.multiplier = Math.max(
        0,
        number(multiplier, 1)
    );

    return score.multiplier;
}

function addMultiplier(score, amount = 1) {
    if (!score) return;

    score.multiplier += number(amount, 0);

    return score.multiplier;
}

function landingBonus(score, impactSpeed = 0) {
    if (!score) return 0;

    score.landings++;

    const speed = Math.max(
        0,
        number(impactSpeed, 0)
    );

    const bonus =
        score.config.landingBonus *
        score.multiplier *
        (1 + clamp(speed / 100, 0, 1));

    addScore(score, bonus);

    return bonus;
}

function registerLanding(score, impactSpeed = 0) {
    return landingBonus(score, impactSpeed);
}

function registerFlip(score, count = 1) {
    if (!score) return 0;

    count = Math.max(
        0,
        Math.floor(number(count, 0))
    );

    if (count === 0) return 0;

    score.flips += count;

    const bonus =
        count *
        score.config.flipBonus *
        score.multiplier;

    addScore(score, bonus);

    return bonus;
}

function endRun(score, options = {}) {
    if (!score) return null;

    if (score.finished) {
        return getResult(score);
    }

    score.finished = true;
    score.runStarted = false;

    score.lastDistance = score.distance;
    score.lastScore = score.score;
    score.lastCoins = score.coins;

    const isNewDistance =
        score.distance > score.bestDistance;

    const isNewScore =
        score.score > score.bestScore;

    if (isNewDistance) {
        score.bestDistance = score.distance;
    }

    if (isNewScore) {
        score.bestScore = score.score;
    }

    const saveBest =
        options.saveBest !== false;

    if (saveBest) {
        saveBestRecords(score);
    }

    emitEvent("hillboundscoreend", {
        score: score.score,
        distance: score.distance,
        coins: score.coins,
        bestDistance: score.bestDistance,
        bestScore: score.bestScore,
        newBestDistance: isNewDistance,
        newBestScore: isNewScore
    });

    return getResult(score);
}

function saveBestRecords(score) {
    const map = score.map || "countryside";

    if (score.config.saveBestDistance) {
        writeStorage(
            storageKey("best_distance", map),
            score.bestDistance
        );
    }

    if (score.config.saveBestScore) {
        writeStorage(
            storageKey("best_score", map),
            score.bestScore
        );
    }
}

function getResult(score) {
    if (!score) return null;

    return {
        distance: score.distance,
        score: score.score,
        coins: score.coins,

        bestDistance: score.bestDistance,
        bestScore: score.bestScore,

        newBestDistance:
            score.distance >= score.bestDistance &&
            score.distance > score.lastDistance,

        newBestScore:
            score.score >= score.bestScore &&
            score.score > score.lastScore,

        flips: score.flips,
        landings: score.landings,
        airTime: score.airTime,

        map: score.map,
        vehicle: score.vehicle
            ? score.vehicle.id || score.vehicle.name
            : null
    };
}

function getHUDData(score) {
    if (!score) {
        return {
            distance: 0,
            score: 0,
            coins: 0,
            multiplier: 1,
            bestDistance: 0,
            bestScore: 0
        };
    }

    return {
        distance: Math.max(0, Math.floor(score.distance)),
        score: Math.floor(score.score),
        coins: Math.floor(score.coins),
        multiplier: Number(
            score.multiplier.toFixed(1)
        ),
        bestDistance: Math.floor(score.bestDistance),
        bestScore: Math.floor(score.bestScore)
    };
}

function getBestDistance(map) {
    return readStorage(
        storageKey("best_distance", map),
        0
    );
}

function getBestScore(map) {
    return readStorage(
        storageKey("best_score", map),
        0
    );
}

function setBestDistance(map, value) {
    value = Math.max(0, number(value, 0));

    writeStorage(
        storageKey("best_distance", map),
        value
    );

    return value;
}

function setBestScore(map, value) {
    value = Math.max(0, number(value, 0));

    writeStorage(
        storageKey("best_score", map),
        value
    );

    return value;
}

function reset(score) {
    if (!score) return;

    score.distance = 0;
    score.score = 0;
    score.coins = 0;

    score.airTime = 0;
    score.flips = 0;
    score.landings = 0;

    score.multiplier = 1;

    score.runStarted = false;
    score.finished = false;

    score._lastX = null;
    score._airStart = null;
    score._rotationStart = null;
    score._lastRotation = null;

    return score;
}

function serialize(score) {
    if (!score) return null;

    return {
        distance: score.distance,
        score: score.score,
        coins: score.coins,

        bestDistance: score.bestDistance,
        bestScore: score.bestScore,

        multiplier: score.multiplier,

        airTime: score.airTime,
        flips: score.flips,
        landings: score.landings,

        map: getMapKey(score.map),
        vehicle: score.vehicle
            ? score.vehicle.id || null
            : null
    };
}

function restore(score, data) {
    if (!score || !data) return score;

    score.distance = Math.max(
        0,
        number(data.distance, 0)
    );

    score.score = Math.max(
        0,
        number(data.score, 0)
    );

    score.coins = Math.max(
        0,
        number(data.coins, 0)
    );

    score.bestDistance = Math.max(
        score.bestDistance,
        number(data.bestDistance, 0)
    );

    score.bestScore = Math.max(
        score.bestScore,
        number(data.bestScore, 0)
    );

    score.multiplier = Math.max(
        0,
        number(data.multiplier, 1)
    );

    score.airTime = Math.max(
        0,
        number(data.airTime, 0)
    );

    score.flips = Math.max(
        0,
        number(data.flips, 0)
    );

    score.landings = Math.max(
        0,
        number(data.landings, 0)
    );

    if (data.map !== undefined) {
        score.map = data.map;
    }

    return score;
}

function emitEvent(name, detail) {
    try {
        window.dispatchEvent(
            new CustomEvent(name, {
                detail
            })
        );
    } catch (error) {
        // Older browsers may not support CustomEvent.
    }
}

Score.defaults = defaults;
Score.create = create;

Score.startRun = startRun;
Score.endRun = endRun;
Score.update = update;
Score.reset = reset;

Score.setMap = setMap;
Score.setVehicle = setVehicle;

Score.addScore = addScore;
Score.setScore = setScore;

Score.addCoins = addCoins;
Score.setDistance = setDistance;

Score.setMultiplier = setMultiplier;
Score.addMultiplier = addMultiplier;

Score.registerFlip = registerFlip;
Score.registerLanding = registerLanding;
Score.landingBonus = landingBonus;

Score.getResult = getResult;
Score.getHUDData = getHUDData;

Score.getBestDistance = getBestDistance;
Score.getBestScore = getBestScore;

Score.setBestDistance = setBestDistance;
Score.setBestScore = setBestScore;

Score.saveBestRecords = saveBestRecords;

Score.serialize = serialize;
Score.restore = restore;

window.Hillbound.Score = Score;
window.HillboundScore = Score;
window.Score = Score;

})();
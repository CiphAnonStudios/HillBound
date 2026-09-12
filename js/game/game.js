/* =========================================================
   HILLBOUND — GAME
   js/game/game.js
   Main gameplay controller
   ========================================================= */

(function () {
    "use strict";

    window.Hillbound = window.Hillbound || {};
    Hillbound.Game = Hillbound.Game || {};

    /* ---------------------------------------------------------
       Game State
       --------------------------------------------------------- */

    const Game = Hillbound.Game;

    Game.running = false;
    Game.paused = false;
    Game.gameOver = false;
    Game.initialized = false;

    Game.lastTime = 0;
    Game.animationFrame = null;

    Game.distance = 0;
    Game.coins = 0;
    Game.bestDistance = 0;

    Game.currentMap = "countryside";
    Game.currentVehicle = "starter-car";

    Game.canvas = null;
    Game.ctx = null;

    Game.vehicle = null;
    Game.terrain = null;
    Game.camera = null;

    Game.fuel = null;
    Game.coinManager = null;
    Game.score = null;

    /* ---------------------------------------------------------
       Configuration Helpers
       --------------------------------------------------------- */

    function getConfig() {
        return window.HillboundConfig ||
            window.gameConfig ||
            window.GameConfig ||
            {};
    }

    function getGameSettings() {
        if (
            Hillbound.getSettings &&
            typeof Hillbound.getSettings === "function"
        ) {
            return Hillbound.getSettings();
        }

        return {};
    }

    function getElement(id) {
        return document.getElementById(id);
    }

    /* ---------------------------------------------------------
       DOM References
       --------------------------------------------------------- */

    const DOM = {};

    function cacheDOM() {
        DOM.container =
            getElement("game-container");

        DOM.canvas =
            getElement("game-canvas");

        DOM.loading =
            getElement("game-loading-screen");

        DOM.loadingProgress =
            getElement("game-loading-progress");

        DOM.loadingText =
            getElement("game-loading-text");

        DOM.orientation =
            getElement("orientation-screen");

        DOM.pauseButton =
            getElement("pause-button");

        DOM.pauseOverlay =
            getElement("pause-overlay");

        DOM.gameOverOverlay =
            getElement("game-over-overlay");

        DOM.error =
            getElement("game-error");

        DOM.errorMessage =
            getElement("game-error-message");

        DOM.distance =
            getElement("distance-value");

        DOM.best =
            getElement("best-value");

        DOM.map =
            getElement("map-name");

        DOM.coins =
            getElement("coin-value");

        DOM.fuel =
            getElement("fuel-fill");

        DOM.finalDistance =
            getElement("final-distance");

        DOM.finalCoins =
            getElement("final-coins");

        DOM.finalBest =
            getElement("final-best");

        DOM.newBest =
            getElement("new-best");

        DOM.resume =
            getElement("resume-button");

        DOM.restart =
            getElement("restart-button");

        DOM.menu =
            getElement("menu-button");

        DOM.tryAgain =
            getElement("try-again-button");

        DOM.gameOverMenu =
            getElement("game-over-menu-button");
    }

    /* ---------------------------------------------------------
       Safe Method Call
       --------------------------------------------------------- */

    function callMethod(object, method) {
        if (
            !object ||
            typeof object[method] !== "function"
        ) {
            return null;
        }

        const args = Array.prototype.slice.call(
            arguments,
            2
        );

        try {
            return object[method].apply(
                object,
                args
            );
        } catch (error) {
            console.error(
                "[Hillbound Game]",
                method,
                error
            );

            return null;
        }
    }

    /* ---------------------------------------------------------
       Loading
       --------------------------------------------------------- */

    function setLoadingProgress(
        value,
        message
    ) {
        const progress = Math.max(
            0,
            Math.min(100, value)
        );

        if (DOM.loadingProgress) {
            DOM.loadingProgress.style.width =
                progress + "%";
        }

        if (
            DOM.loadingText &&
            message
        ) {
            DOM.loadingText.textContent =
                message;
        }
    }

    function hideLoading() {
        if (!DOM.loading) {
            return;
        }

        setLoadingProgress(
            100,
            "Ready to climb."
        );

        DOM.loading.classList.add(
            "loaded"
        );

        setTimeout(function () {
            if (DOM.loading) {
                DOM.loading.style.display =
                    "none";
            }
        }, 350);
    }

    function showLoading(
        message
    ) {
        if (!DOM.loading) {
            return;
        }

        DOM.loading.style.display =
            "flex";

        DOM.loading.classList.remove(
            "loaded"
        );

        setLoadingProgress(
            0,
            message || "Loading game..."
        );
    }

    /* ---------------------------------------------------------
       Error Handling
       --------------------------------------------------------- */

    function showGameError(
        message
    ) {
        console.error(
            "[Hillbound Game]",
            message
        );

        if (DOM.errorMessage) {
            DOM.errorMessage.textContent =
                message;
        }

        if (DOM.error) {
            DOM.error.hidden = false;
            DOM.error.classList.add(
                "visible"
            );
        }
    }

    function hideGameError() {
        if (!DOM.error) {
            return;
        }

        DOM.error.hidden = true;
        DOM.error.classList.remove(
            "visible"
        );
    }

    /* ---------------------------------------------------------
       Canvas
       --------------------------------------------------------- */

    function setupCanvas() {
        if (!DOM.canvas) {
            throw new Error(
                "Game canvas was not found."
            );
        }

        Game.canvas =
            DOM.canvas;

        Game.ctx =
            DOM.canvas.getContext(
                "2d"
            );

        if (!Game.ctx) {
            throw new Error(
                "Your browser could not create the game canvas."
            );
        }

        resizeCanvas();

        window.addEventListener(
            "resize",
            resizeCanvas
        );

        window.addEventListener(
            "orientationchange",
            function () {
                setTimeout(
                    resizeCanvas,
                    150
                );
            }
        );
    }

    function resizeCanvas() {
        if (
            !Game.canvas ||
            !Game.ctx
        ) {
            return;
        }

        const rect =
            Game.canvas.getBoundingClientRect();

        const width =
            Math.max(
                1,
                Math.floor(rect.width)
            );

        const height =
            Math.max(
                1,
                Math.floor(rect.height)
            );

        const pixelRatio =
            Math.min(
                window.devicePixelRatio || 1,
                2
            );

        Game.canvas.width =
            Math.floor(
                width * pixelRatio
            );

        Game.canvas.height =
            Math.floor(
                height * pixelRatio
            );

        Game.canvas.style.width =
            width + "px";

        Game.canvas.style.height =
            height + "px";

        Game.ctx.setTransform(
            pixelRatio,
            0,
            0,
            pixelRatio,
            0,
            0
        );

        Game.width = width;
        Game.height = height;
    }

    /* ---------------------------------------------------------
       Map Selection
       --------------------------------------------------------- */

    function getSelectedMap() {
        const params =
            new URLSearchParams(
                window.location.search
            );

        return (
            params.get("map") ||
            localStorage.getItem(
                "hillbound_selected_map"
            ) ||
            "countryside"
        );
    }

    function getSelectedVehicle() {
        const params =
            new URLSearchParams(
                window.location.search
            );

        return (
            params.get("vehicle") ||
            localStorage.getItem(
                "hillbound_selected_vehicle"
            ) ||
            "starter-car"
        );
    }

    function setMapName(name) {
        if (DOM.map) {
            DOM.map.textContent =
                formatName(name);
        }
    }

    function formatName(name) {
        if (!name) {
            return "";
        }

        return String(name)
            .replace(/[-_]/g, " ")
            .replace(/\b\w/g, function (letter) {
                return letter.toUpperCase();
            });
    }

    /* ---------------------------------------------------------
       Best Distance
       --------------------------------------------------------- */

    function getBestKey() {
        return (
            "hillbound_best_" +
            Game.currentMap +
            "_" +
            Game.currentVehicle
        );
    }

    function loadBestDistance() {
        let value = 0;

        try {
            value = Number(
                localStorage.getItem(
                    getBestKey()
                )
            );
        } catch (error) {
            value = 0;
        }

        if (
            !Number.isFinite(value) ||
            value < 0
        ) {
            value = 0;
        }

        Game.bestDistance =
            value;

        updateBestDisplay();
    }

    function saveBestDistance() {
        try {
            localStorage.setItem(
                getBestKey(),
                String(Game.bestDistance)
            );
        } catch (error) {
            console.warn(
                "[Hillbound] Could not save best distance.",
                error
            );
        }
    }

    function updateBestDisplay() {
        if (DOM.best) {
            DOM.best.textContent =
                formatDistance(
                    Game.bestDistance
                );
        }
    }

    /* ---------------------------------------------------------
       Distance
       --------------------------------------------------------- */

    function formatDistance(value) {
        const distance =
            Math.max(
                0,
                Number(value) || 0
            );

        return Math.floor(
            distance
        ) + "m";
    }

    function updateDistanceDisplay() {
        if (DOM.distance) {
            DOM.distance.textContent =
                formatDistance(
                    Game.distance
                );
        }
    }

    /* ---------------------------------------------------------
       Coin Display
       --------------------------------------------------------- */

    function updateCoinDisplay() {
        if (
            DOM.coins &&
            Number.isFinite(
                Game.coins
            )
        ) {
            DOM.coins.textContent =
                Math.floor(
                    Game.coins
                );
        }
    }

    /* ---------------------------------------------------------
       Fuel Display
       --------------------------------------------------------- */

    function updateFuelDisplay() {
        if (!DOM.fuel) {
            return;
        }

        let fuel = null;

        if (
            Game.fuel &&
            typeof Game.fuel.getPercentage ===
                "function"
        ) {
            fuel =
                Game.fuel.getPercentage();
        } else if (
            Game.fuel &&
            Number.isFinite(
                Game.fuel.current
            ) &&
            Number.isFinite(
                Game.fuel.max
            ) &&
            Game.fuel.max > 0
        ) {
            fuel =
                Game.fuel.current /
                Game.fuel.max *
                100;
        }

        if (fuel === null) {
            return;
        }

        fuel = Math.max(
            0,
            Math.min(100, fuel)
        );

        DOM.fuel.style.width =
            fuel + "%";

        DOM.fuel.classList.toggle(
            "warning",
            fuel <= 30 &&
            fuel > 10
        );

        DOM.fuel.classList.toggle(
            "danger",
            fuel <= 10
        );
    }

    /* ---------------------------------------------------------
       Game State
       --------------------------------------------------------- */

    function initializeGameState() {
        if (
            window.GameState &&
            typeof GameState.reset ===
                "function"
        ) {
            callMethod(
                GameState,
                "reset"
            );
        }

        if (
            window.HillboundGameState &&
            typeof HillboundGameState.reset ===
                "function"
        ) {
            callMethod(
                HillboundGameState,
                "reset"
            );
        }

        Game.distance = 0;
        Game.coins = 0;
        Game.paused = false;
        Game.gameOver = false;
    }

    /* ---------------------------------------------------------
       Input
       --------------------------------------------------------- */

    function initializeInput() {
        if (
            window.HillboundInput
        ) {
            callMethod(
                window.HillboundInput,
                "init"
            );

            return;
        }

        if (
            window.Input
        ) {
            callMethod(
                window.Input,
                "init"
            );
        }
    }

    /* ---------------------------------------------------------
       Mobile Controls
       --------------------------------------------------------- */

    function initializeMobileControls() {
        if (
            window.HillboundMobileControls
        ) {
            callMethod(
                window.HillboundMobileControls,
                "init"
            );

            return;
        }

        if (
            window.MobileControls
        ) {
            callMethod(
                window.MobileControls,
                "init"
            );
        }
    }

    /* ---------------------------------------------------------
       Orientation
       --------------------------------------------------------- */

    function initializeOrientation() {
        if (
            window.HillboundOrientation
        ) {
            callMethod(
                window.HillboundOrientation,
                "init"
            );

            return;
        }

        if (
            window.Orientation
        ) {
            callMethod(
                window.Orientation,
                "init"
            );
        }
    }

    /* ---------------------------------------------------------
       Terrain
       --------------------------------------------------------- */

    function createTerrain() {
        let terrain = null;

        const generator =
            window.TerrainGenerator ||
            window.HillboundTerrainGenerator;

        if (
            generator &&
            typeof generator.generate ===
                "function"
        ) {
            terrain =
                generator.generate(
                    Game.currentMap,
                    Game.width,
                    Game.height
                );
        }

        if (
            !terrain &&
            window.Terrain &&
            typeof window.Terrain.create ===
                "function"
        ) {
            terrain =
                window.Terrain.create(
                    Game.currentMap
                );
        }

        Game.terrain =
            terrain;

        if (!Game.terrain) {
            console.warn(
                "[Hillbound Game] No terrain system was available. Using fallback terrain."
            );

            Game.terrain =
                createFallbackTerrain();
        }

        return Game.terrain;
    }

    function createFallbackTerrain() {
        return {
            offset: 0,

            getHeight: function (x) {
                return (
                    Game.height * 0.68 +
                    Math.sin(x * 0.006) * 35 +
                    Math.sin(x * 0.014) * 18
                );
            },

            update: function () {},

            draw: function (ctx) {
                const ground =
                    Game.height * 0.68;

                ctx.save();

                ctx.fillStyle =
                    "#4a4a4a";

                ctx.beginPath();

                ctx.moveTo(
                    0,
                    ground
                );

                for (
                    let x = 0;
                    x <= Game.width;
                    x += 8
                ) {
                    const worldX =
                        x +
                        (this.offset || 0);

                    const y =
                        this.getHeight(
                            worldX
                        );

                    ctx.lineTo(
                        x,
                        y
                    );
                }

                ctx.lineTo(
                    Game.width,
                    Game.height
                );

                ctx.lineTo(
                    0,
                    Game.height
                );

                ctx.closePath();
                ctx.fill();

                ctx.restore();
            }
        };
    }

    /* ---------------------------------------------------------
       Vehicle
       --------------------------------------------------------- */

    function createVehicle() {
        let vehicle = null;

        if (
            window.Vehicle &&
            typeof window.Vehicle.create ===
                "function"
        ) {
            vehicle =
                window.Vehicle.create(
                    Game.currentVehicle
                );
        }

        if (
            !vehicle &&
            window.Car &&
            (
                Game.currentVehicle ===
                "starter-car" ||
                Game.currentVehicle ===
                "car"
            ) &&
            typeof window.Car.create ===
                "function"
        ) {
            vehicle =
                window.Car.create();
        }

        if (
            !vehicle &&
            window.HillboundVehicle &&
            typeof window.HillboundVehicle.create ===
                "function"
        ) {
            vehicle =
                window.HillboundVehicle.create(
                    Game.currentVehicle
                );
        }

        Game.vehicle =
            vehicle;

        if (!Game.vehicle) {
            console.warn(
                "[Hillbound Game] No vehicle system was available. Using fallback vehicle."
            );

            Game.vehicle =
                createFallbackVehicle();
        }

        initializeVehiclePosition();

        return Game.vehicle;
    }

    function initializeVehiclePosition() {
        if (!Game.vehicle) {
            return;
        }

        const startX = 120;

        let startY =
            Game.height * 0.5;

        if (
            Game.terrain &&
            typeof Game.terrain.getHeight ===
                "function"
        ) {
            startY =
                Game.terrain.getHeight(
                    startX
                ) - 80;
        }

        if (
            typeof Game.vehicle.setPosition ===
                "function"
        ) {
            Game.vehicle.setPosition(
                startX,
                startY
            );
        } else {
            Game.vehicle.x =
                startX;

            Game.vehicle.y =
                startY;
        }
    }

    function createFallbackVehicle() {
        return {
            x: 120,
            y: Game.height * 0.5,
            width: 90,
            height: 40,

            velocityX: 0,
            velocityY: 0,

            rotation: 0,
            angularVelocity: 0,

            destroyed: false,

            update: function (
                dt
            ) {
                this.velocityY +=
                    900 * dt;

                this.x +=
                    this.velocityX * dt;

                this.y +=
                    this.velocityY * dt;

                if (
                    Game.terrain &&
                    typeof Game.terrain.getHeight ===
                        "function"
                ) {
                    const ground =
                        Game.terrain.getHeight(
                            this.x
                        );

                    if (
                        this.y +
                        this.height / 2 >
                        ground
                    ) {
                        this.y =
                            ground -
                            this.height / 2;

                        this.velocityY = 0;
                    }
                }
            },

            draw: function (ctx) {
                ctx.save();

                ctx.translate(
                    this.x,
                    this.y
                );

                ctx.rotate(
                    this.rotation
                );

                ctx.fillStyle =
                    "#ff6a00";

                ctx.fillRect(
                    -45,
                    -20,
                    90,
                    35
                );

                ctx.fillStyle =
                    "#222222";

                ctx.fillRect(
                    -25,
                    -35,
                    35,
                    20
                );

                ctx.beginPath();

                ctx.arc(
                    -28,
                    18,
                    12,
                    0,
                    Math.PI * 2
                );

                ctx.arc(
                    28,
                    18,
                    12,
                    0,
                    Math.PI * 2
                );

                ctx.fill();

                ctx.restore();
            }
        };
    }

    /* ---------------------------------------------------------
       Camera
       --------------------------------------------------------- */

    function createCamera() {
        let camera = null;

        if (
            window.Camera &&
            typeof window.Camera.create ===
                "function"
        ) {
            camera =
                window.Camera.create(
                    Game.canvas
                );
        }

        if (
            !camera &&
            window.HillboundCamera &&
            typeof window.HillboundCamera.create ===
                "function"
        ) {
            camera =
                window.HillboundCamera.create(
                    Game.canvas
                );
        }

        Game.camera =
            camera;

        if (!Game.camera) {
            Game.camera =
                createFallbackCamera();
        }

        return Game.camera;
    }

    function createFallbackCamera() {
        return {
            x: 0,
            y: 0,

            update: function (
                target,
                dt
            ) {
                if (!target) {
                    return;
                }

                const targetX =
                    Math.max(
                        0,
                        target.x -
                        Game.width * 0.3
                    );

                const smoothing =
                    Math.min(
                        1,
                        dt * 5
                    );

                this.x +=
                    (
                        targetX -
                        this.x
                    ) * smoothing;
            },

            begin: function (ctx) {
                ctx.save();

                ctx.translate(
                    -this.x,
                    -this.y
                );
            },

            end: function (ctx) {
                ctx.restore();
            }
        };
    }

    /* ---------------------------------------------------------
       Fuel
       --------------------------------------------------------- */

    function createFuel() {
        let fuel = null;

        if (
            window.Fuel &&
            typeof window.Fuel.create ===
                "function"
        ) {
            fuel =
                window.Fuel.create(
                    Game.currentVehicle
                );
        }

        if (
            !fuel &&
            window.HillboundFuel &&
            typeof window.HillboundFuel.create ===
                "function"
        ) {
            fuel =
                window.HillboundFuel.create(
                    Game.currentVehicle
                );
        }

        Game.fuel =
            fuel;

        return fuel;
    }

    /* ---------------------------------------------------------
       Coins
       --------------------------------------------------------- */

    function createCoins() {
        let manager = null;

        if (
            window.Coins &&
            typeof window.Coins.create ===
                "function"
        ) {
            manager =
                window.Coins.create(
                    Game.currentMap
                );
        }

        if (
            !manager &&
            window.CoinManager &&
            typeof window.CoinManager.create ===
                "function"
        ) {
            manager =
                window.CoinManager.create(
                    Game.currentMap
                );
        }

        Game.coinManager =
            manager;

        return manager;
    }

    /* ---------------------------------------------------------
       Score
       --------------------------------------------------------- */

    function createScore() {
        let score = null;

        if (
            window.Score &&
            typeof window.Score.create ===
                "function"
        ) {
            score =
                window.Score.create();
        }

        if (
            !score &&
            window.HillboundScore &&
            typeof window.HillboundScore.create ===
                "function"
        ) {
            score =
                window.HillboundScore.create();
        }

        Game.score =
            score;

        return score;
    }

    /* ---------------------------------------------------------
       HUD
       --------------------------------------------------------- */

    function initializeHUD() {
        if (
            window.HUD &&
            typeof window.HUD.init ===
                "function"
        ) {
            callMethod(
                window.HUD,
                "init"
            );
        }

        if (
            window.HillboundHUD &&
            typeof window.HillboundHUD.init ===
                "function"
        ) {
            callMethod(
                window.HillboundHUD,
                "init"
            );
        }

        setMapName(
            Game.currentMap
        );

        updateDistanceDisplay();
        updateBestDisplay();
        updateCoinDisplay();
        updateFuelDisplay();
    }

    function updateHUD() {
        if (
            window.HUD &&
            typeof window.HUD.update ===
                "function"
        ) {
            callMethod(
                window.HUD,
                "update",
                Game
            );
        }

        updateDistanceDisplay();
        updateBestDisplay();
        updateCoinDisplay();
        updateFuelDisplay();
    }

    /* ---------------------------------------------------------
       Physics
       --------------------------------------------------------- */

    function updatePhysics(dt) {
        if (
            window.Physics &&
            typeof window.Physics.update ===
                "function"
        ) {
            callMethod(
                window.Physics,
                "update",
                Game.vehicle,
                Game.terrain,
                dt
            );

            return;
        }

        if (
            window.HillboundPhysics &&
            typeof window.HillboundPhysics.update ===
                "function"
        ) {
            callMethod(
                window.HillboundPhysics,
                "update",
                Game.vehicle,
                Game.terrain,
                dt
            );

            return;
        }

        if (
            Game.vehicle &&
            typeof Game.vehicle.update ===
                "function"
        ) {
            Game.vehicle.update(
                dt,
                Game.terrain
            );
        }
    }

    /* ---------------------------------------------------------
       Collision
       --------------------------------------------------------- */

    function updateCollision() {
        if (
            !Game.vehicle ||
            !Game.terrain
        ) {
            return false;
        }

        let crashed = false;

        if (
            window.Collision &&
            typeof window.Collision.check ===
                "function"
        ) {
            crashed =
                Boolean(
                    callMethod(
                        window.Collision,
                        "check",
                        Game.vehicle,
                        Game.terrain
                    )
                );
        }

        if (
            !crashed &&
            window.Collision &&
            typeof window.Collision.isCrashed ===
                "function"
        ) {
            crashed =
                Boolean(
                    callMethod(
                        window.Collision,
                        "isCrashed",
                        Game.vehicle
                    )
                );
        }

        if (
            !crashed &&
            Game.vehicle.crashed
        ) {
            crashed = true;
        }

        if (
            !crashed &&
            Game.vehicle.destroyed
        ) {
            crashed = true;
        }

        return crashed;
    }

    /* ---------------------------------------------------------
       Distance Calculation
       --------------------------------------------------------- */

    function updateDistance() {
        if (!Game.vehicle) {
            return;
        }

        let distance = null;

        if (
            Game.score &&
            typeof Game.score.getDistance ===
                "function"
        ) {
            distance =
                Game.score.getDistance();
        }

        if (
            distance === null &&
            Number.isFinite(
                Game.vehicle.x
            )
        ) {
            distance =
                Math.max(
                    0,
                    Game.vehicle.x - 120
                );
        }

        if (
            Number.isFinite(distance)
        ) {
            Game.distance =
                Math.max(
                    Game.distance,
                    distance
                );
        }
    }

    /* ---------------------------------------------------------
       Coins Update
       --------------------------------------------------------- */

    function updateCoins() {
        if (!Game.coinManager) {
            return;
        }

        if (
            typeof Game.coinManager.update ===
                "function"
        ) {
            callMethod(
                Game.coinManager,
                "update",
                Game.vehicle,
                Game
            );
        }

        if (
            typeof Game.coinManager.getCoins ===
                "function"
        ) {
            const value =
                Number(
                    Game.coinManager.getCoins()
                );

            if (
                Number.isFinite(value)
            ) {
                Game.coins =
                    Math.max(
                        Game.coins,
                        value
                    );
            }
        }
    }

    /* ---------------------------------------------------------
       Fuel Update
       --------------------------------------------------------- */

    function updateFuel(dt) {
        if (!Game.fuel) {
            return;
        }

        if (
            typeof Game.fuel.update ===
                "function"
        ) {
            callMethod(
                Game.fuel,
                "update",
                dt,
                Game.vehicle
            );
        }

        let empty = false;

        if (
            typeof Game.fuel.isEmpty ===
                "function"
        ) {
            empty =
                Boolean(
                    Game.fuel.isEmpty()
                );
        }

        if (
            empty ||
            Game.fuel.empty
        ) {
            endGame(
                "fuel"
            );
        }
    }

    /* ---------------------------------------------------------
       Terrain Update
       --------------------------------------------------------- */

    function updateTerrain(dt) {
        if (
            !Game.terrain ||
            typeof Game.terrain.update !==
                "function"
        ) {
            return;
        }

        callMethod(
            Game.terrain,
            "update",
            dt,
            Game.vehicle
        );
    }

    /* ---------------------------------------------------------
       Camera Update
       --------------------------------------------------------- */

    function updateCamera(dt) {
        if (
            !Game.camera
        ) {
            return;
        }

        if (
            typeof Game.camera.update ===
                "function"
        ) {
            callMethod(
                Game.camera,
                "update",
                Game.vehicle,
                dt
            );
        }
    }

    /* ---------------------------------------------------------
       Game-Over Detection
       --------------------------------------------------------- */

    function checkGameOver() {
        if (
            !Game.vehicle
        ) {
            return false;
        }

        if (
            updateCollision()
        ) {
            endGame(
                "crash"
            );

            return true;
        }

        if (
            Game.vehicle.y >
            Game.height + 500
        ) {
            endGame(
                "fall"
            );

            return true;
        }

        if (
            Game.vehicle.destroyed
        ) {
            endGame(
                "crash"
            );

            return true;
        }

        return false;
    }

    /* ---------------------------------------------------------
       Drawing
       --------------------------------------------------------- */

    function drawBackground() {
        const ctx =
            Game.ctx;

        if (!ctx) {
            return;
        }

        ctx.save();

        const gradient =
            ctx.createLinearGradient(
                0,
                0,
                0,
                Game.height
            );

        gradient.addColorStop(
            0,
            "#151515"
        );

        gradient.addColorStop(
            1,
            "#252525"
        );

        ctx.fillStyle =
            gradient;

        ctx.fillRect(
            0,
            0,
            Game.width,
            Game.height
        );

        ctx.restore();
    }

    function drawWorld() {
        const ctx =
            Game.ctx;

        if (!ctx) {
            return;
        }

        if (
            Game.camera &&
            typeof Game.camera.begin ===
                "function"
        ) {
            Game.camera.begin(
                ctx
            );
        }

        if (
            Game.terrain &&
            typeof Game.terrain.draw ===
                "function"
        ) {
            callMethod(
                Game.terrain,
                "draw",
                ctx,
                Game
            );
        }

        if (
            Game.coinManager &&
            typeof Game.coinManager.draw ===
                "function"
        ) {
            callMethod(
                Game.coinManager,
                "draw",
                ctx,
                Game
            );
        }

        if (
            Game.vehicle &&
            typeof Game.vehicle.draw ===
                "function"
        ) {
            callMethod(
                Game.vehicle,
                "draw",
                ctx,
                Game
            );
        }

        if (
            Game.camera &&
            typeof Game.camera.end ===
                "function"
        ) {
            Game.camera.end(
                ctx
            );
        }
    }

    function draw() {
        if (
            !Game.ctx
        ) {
            return;
        }

        drawBackground();
        drawWorld();
    }

    /* ---------------------------------------------------------
       Main Game Loop
       --------------------------------------------------------- */

    function gameLoop(timestamp) {
        if (!Game.running) {
            return;
        }

        if (!Game.lastTime) {
            Game.lastTime =
                timestamp;
        }

        let dt =
            (timestamp -
                Game.lastTime) /
            1000;

        Game.lastTime =
            timestamp;

        /*
         * Prevent huge physics jumps when the browser tab
         * becomes inactive or the device lags.
         */

        dt = Math.min(
            Math.max(dt, 0),
            0.033
        );

        if (
            !Game.paused &&
            !Game.gameOver
        ) {
            updateTerrain(dt);
            updatePhysics(dt);
            updateFuel(dt);
            updateCoins();
            updateDistance();
            updateCamera(dt);

            if (
                !Game.gameOver
            ) {
                checkGameOver();
            }

            updateHUD();
        }

        draw();

        Game.animationFrame =
            requestAnimationFrame(
                gameLoop
            );
    }

    /* ---------------------------------------------------------
       Start Loop
       --------------------------------------------------------- */

    function startLoop() {
        if (
            Game.animationFrame
        ) {
            cancelAnimationFrame(
                Game.animationFrame
            );
        }

        Game.running = true;
        Game.lastTime = 0;

        Game.animationFrame =
            requestAnimationFrame(
                gameLoop
            );
    }

    function stopLoop() {
        Game.running = false;

        if (
            Game.animationFrame
        ) {
            cancelAnimationFrame(
                Game.animationFrame
            );

            Game.animationFrame =
                null;
        }
    }

    /* ---------------------------------------------------------
       Pause
       --------------------------------------------------------- */

    function pause() {
        if (
            !Game.running ||
            Game.gameOver
        ) {
            return;
        }

        Game.paused = true;

        if (
            window.HillboundInput
        ) {
            callMethod(
                window.HillboundInput,
                "releaseAll"
            );
        }

        showPauseOverlay();

        document.dispatchEvent(
            new CustomEvent(
                "hillboundgamepause"
            )
        );
    }

    function resume() {
        if (
            Game.gameOver
        ) {
            return;
        }

        Game.paused = false;
        Game.lastTime = 0;

        hidePauseOverlay();

        document.dispatchEvent(
            new CustomEvent(
                "hillboundgameresume"
            )
        );
    }

    function togglePause() {
        if (Game.paused) {
            resume();
        } else {
            pause();
        }
    }

    function showPauseOverlay() {
        if (
            DOM.pauseOverlay
        ) {
            DOM.pauseOverlay.hidden =
                false;

            DOM.pauseOverlay.classList.add(
                "visible"
            );
        }

        /*
         * Some versions of the HTML use the modal itself
         * without the visible class.
         */

        const modal =
            document.querySelector(
                ".pause-modal"
            );

        if (modal) {
            modal.hidden = false;
            modal.classList.add(
                "visible"
            );
        }
    }

    function hidePauseOverlay() {
        if (
            DOM.pauseOverlay
        ) {
            DOM.pauseOverlay.hidden =
                true;

            DOM.pauseOverlay.classList.remove(
                "visible"
            );
        }

        const modal =
            document.querySelector(
                ".pause-modal"
            );

        if (modal) {
            modal.hidden = true;
            modal.classList.remove(
                "visible"
            );
        }
    }

    /* ---------------------------------------------------------
       Game Over
       --------------------------------------------------------- */

    function endGame(reason) {
        if (
            Game.gameOver
        ) {
            return;
        }

        Game.gameOver = true;
        Game.paused = false;

        const previousBest =
            Game.bestDistance;

        const isNewBest =
            Game.distance >
            previousBest;

        if (
            isNewBest
        ) {
            Game.bestDistance =
                Game.distance;

            saveBestDistance();
        }

        if (
            window.HillboundInput
        ) {
            callMethod(
                window.HillboundInput,
                "releaseAll"
            );
        }

        if (
            window.Score &&
            typeof window.Score.end ===
                "function"
        ) {
            callMethod(
                window.Score,
                "end",
                Game
            );
        }

        if (
            window.HillboundScore &&
            typeof window.HillboundScore.end ===
                "function"
        ) {
            callMethod(
                window.HillboundScore,
                "end",
                Game
            );
        }

        showGameOver(
            reason,
            isNewBest
        );

        updateHUD();

        document.dispatchEvent(
            new CustomEvent(
                "hillboundgameover",
                {
                    detail: {
                        reason:
                            reason,
                        distance:
                            Game.distance,
                        coins:
                            Game.coins,
                        best:
                            Game.bestDistance,
                        newBest:
                            isNewBest
                    }
                }
            )
        );
    }

    function showGameOver(
        reason,
        isNewBest
    ) {
        hidePauseOverlay();

        if (
            DOM.gameOverOverlay
        ) {
            DOM.gameOverOverlay.hidden =
                false;

            DOM.gameOverOverlay.classList.add(
                "visible"
            );
        }

        if (
            DOM.finalDistance
        ) {
            DOM.finalDistance.textContent =
                formatDistance(
                    Game.distance
                );
        }

        if (
            DOM.finalCoins
        ) {
            DOM.finalCoins.textContent =
                Math.floor(
                    Game.coins
                );
        }

        if (
            DOM.finalBest
        ) {
            DOM.finalBest.textContent =
                formatDistance(
                    Game.bestDistance
                );
        }

        if (
            DOM.newBest
        ) {
            DOM.newBest.hidden =
                !isNewBest;

            DOM.newBest.classList.toggle(
                "visible",
                isNewBest
            );
        }

        const reasonElement =
            document.querySelector(
                "[data-game-over-reason]"
            );

        if (reasonElement) {
            const messages = {
                crash:
                    "You crashed!",
                fall:
                    "You lost control!",
                fuel:
                    "Out of fuel!"
            };

            reasonElement.textContent =
                messages[reason] ||
                "Run complete!";
        }
    }

    function hideGameOver() {
        if (
            DOM.gameOverOverlay
        ) {
            DOM.gameOverOverlay.hidden =
                true;

            DOM.gameOverOverlay.classList.remove(
                "visible"
            );
        }
    }

    /* ---------------------------------------------------------
       Restart
       --------------------------------------------------------- */

    function restart() {
        stopLoop();

        hidePauseOverlay();
        hideGameOver();
        hideGameError();

        showLoading(
            "Restarting..."
        );

        setTimeout(
            function () {
                initializeGame();
            },
            150
        );
    }

    /* ---------------------------------------------------------
       Main Menu
       --------------------------------------------------------- */

    function goToMenu() {
        stopLoop();

        const path =
            window.location.pathname;

        /*
         * game.html lives inside /pages/, while index.html
         * lives one level above it.
         */

        if (
            path.includes(
                "/pages/"
            )
        ) {
            window.location.href =
                "../index.html";
        } else {
            window.location.href =
                "index.html";
        }
    }

    /* ---------------------------------------------------------
       Save Run
       --------------------------------------------------------- */

    function saveLocalRun() {
        const run = {
            map:
                Game.currentMap,
            vehicle:
                Game.currentVehicle,
            distance:
                Math.floor(
                    Game.distance
                ),
            coins:
                Math.floor(
                    Game.coins
                ),
            timestamp:
                Date.now()
        };

        let runs = [];

        try {
            runs =
                JSON.parse(
                    localStorage.getItem(
                        "hillbound_recent_runs"
                    )
                ) || [];
        } catch (error) {
            runs = [];
        }

        runs.unshift(
            run
        );

        runs =
            runs.slice(
                0,
                20
            );

        try {
            localStorage.setItem(
                "hillbound_recent_runs",
                JSON.stringify(
                    runs
                )
            );
        } catch (error) {
            console.warn(
                "[Hillbound] Could not save recent run.",
                error
            );
        }
    }

    /* ---------------------------------------------------------
       Event Listeners
       --------------------------------------------------------- */

    function initializeEvents() {
        if (
            DOM.pauseButton
        ) {
            DOM.pauseButton.addEventListener(
                "click",
                togglePause
            );
        }

        if (
            DOM.resume
        ) {
            DOM.resume.addEventListener(
                "click",
                resume
            );
        }

        if (
            DOM.restart
        ) {
            DOM.restart.addEventListener(
                "click",
                restart
            );
        }

        if (
            DOM.tryAgain
        ) {
            DOM.tryAgain.addEventListener(
                "click",
                restart
            );
        }

        if (
            DOM.menu
        ) {
            DOM.menu.addEventListener(
                "click",
                goToMenu
            );
        }

        if (
            DOM.gameOverMenu
        ) {
            DOM.gameOverMenu.addEventListener(
                "click",
                goToMenu
            );
        }

        /*
         * Escape pauses the game on desktop.
         */

        document.addEventListener(
            "keydown",
            function (event) {
                if (
                    event.key ===
                    "Escape"
                ) {
                    togglePause();
                }
            }
        );

        /*
         * Pause when the browser/tab becomes hidden
         * if Auto Pause is enabled.
         */

        document.addEventListener(
            "visibilitychange",
            function () {
                if (
                    document.hidden &&
                    Game.running &&
                    !Game.gameOver
                ) {
                    const settings =
                        getGameSettings();

                    if (
                        !settings.gameplay ||
                        settings.gameplay.autoPause !==
                            false
                    ) {
                        pause();
                    }
                }
            }
        );
    }

    /* ---------------------------------------------------------
       Initialize Game
       --------------------------------------------------------- */

    function initializeGame() {
        try {
            Game.initialized =
                false;

            Game.currentMap =
                getSelectedMap();

            Game.currentVehicle =
                getSelectedVehicle();

            cacheDOM();

            showLoading(
                "Preparing Hillbound..."
            );

            setLoadingProgress(
                15,
                "Setting up game..."
            );

            setupCanvas();

            setLoadingProgress(
                30,
                "Loading terrain..."
            );

            initializeGameState();

            createTerrain();

            setLoadingProgress(
                50,
                "Preparing vehicle..."
            );

            createVehicle();

            setLoadingProgress(
                65,
                "Starting systems..."
            );

            createCamera();
            createFuel();
            createCoins();
            createScore();

            setLoadingProgress(
                78,
                "Connecting controls..."
            );

            initializeInput();
            initializeMobileControls();
            initializeOrientation();

            setLoadingProgress(
                88,
                "Preparing HUD..."
            );

            loadBestDistance();
            initializeHUD();
            initializeEvents();

            Game.initialized =
                true;

            setLoadingProgress(
                100,
                "Ready to climb."
            );

            setTimeout(
                function () {
                    hideLoading();
                    startLoop();
                },
                200
            );

            document.dispatchEvent(
                new CustomEvent(
                    "hillboundgameinit",
                    {
                        detail: {
                            map:
                                Game.currentMap,
                            vehicle:
                                Game.currentVehicle
                        }
                    }
                )
            );
        } catch (error) {
            console.error(
                "[Hillbound Game] Initialization failed:",
                error
            );

            stopLoop();

            showGameError(
                "The game could not be started. Please reload the page."
            );
        }
    }

    /* ---------------------------------------------------------
       Public API
       --------------------------------------------------------- */

    Game.init =
        initializeGame;

    Game.start =
        startLoop;

    Game.stop =
        stopLoop;

    Game.pause =
        pause;

    Game.resume =
        resume;

    Game.togglePause =
        togglePause;

    Game.restart =
        restart;

    Game.end =
        endGame;

    Game.goToMenu =
        goToMenu;

    Game.getState =
        function () {
            return {
                running:
                    Game.running,
                paused:
                    Game.paused,
                gameOver:
                    Game.gameOver,
                map:
                    Game.currentMap,
                vehicle:
                    Game.currentVehicle,
                distance:
                    Game.distance,
                coins:
                    Game.coins,
                bestDistance:
                    Game.bestDistance
            };
        };

    /* ---------------------------------------------------------
       Start
       --------------------------------------------------------- */

    function startWhenReady() {
        if (
            document.readyState ===
            "loading"
        ) {
            document.addEventListener(
                "DOMContentLoaded",
                initializeGame,
                {
                    once: true
                }
            );
        } else {
            initializeGame();
        }
    }

    startWhenReady();

})();

/*
 * Hillbound
 * Camera System
 * js/game/camera.js
 *
 * Handles:
 * - Smooth camera following
 * - Horizontal/vertical tracking
 * - Look-ahead based on vehicle speed
 * - Camera bounds
 * - Screen shake
 * - Zoom
 * - World-to-screen conversion
 * - Screen-to-world conversion
 * - Camera reset/teleport
 */

(function () {
    "use strict";

    window.Hillbound = window.Hillbound || {};

    const Camera = {

        defaults: {
            smoothing: 7,
            positionSmoothing: 8,
            rotationSmoothing: 6,

            lookAhead: 120,
            lookAheadSpeed: 0.35,

            verticalOffset: -70,

            minZoom: 0.7,
            maxZoom: 1.35,
            zoom: 1,

            shakeStrength: 0,
            shakeDecay: 7,

            bounds: {
                enabled: false,
                minX: -Infinity,
                maxX: Infinity,
                minY: -Infinity,
                maxY: Infinity
            },

            followRotation: false,
            rotationStrength: 0.15
        },

        create(options) {
            options = options || {};

            const config = this.merge(
                this.defaults,
                options
            );

            return {
                x: this.number(options.x, 0),
                y: this.number(options.y, 0),

                targetX: this.number(options.x, 0),
                targetY: this.number(options.y, 0),

                zoom: this.number(config.zoom, 1),
                targetZoom: this.number(config.zoom, 1),

                rotation: 0,
                targetRotation: 0,

                shake: 0,
                shakeX: 0,
                shakeY: 0,

                smoothing: config.smoothing,
                positionSmoothing: config.positionSmoothing,
                rotationSmoothing: config.rotationSmoothing,

                lookAhead: config.lookAhead,
                lookAheadSpeed: config.lookAheadSpeed,
                verticalOffset: config.verticalOffset,

                minZoom: config.minZoom,
                maxZoom: config.maxZoom,

                followRotation: config.followRotation,
                rotationStrength: config.rotationStrength,

                bounds: this.clone(config.bounds),

                width: 0,
                height: 0,

                initialized: false
            };
        },

        merge(base, override) {
            const result = {};

            Object.keys(base).forEach((key) => {
                if (
                    base[key] &&
                    typeof base[key] === "object" &&
                    !Array.isArray(base[key])
                ) {
                    result[key] = this.merge(
                        base[key],
                        override && override[key]
                            ? override[key]
                            : {}
                    );
                } else {
                    result[key] =
                        override &&
                        override[key] !== undefined
                            ? override[key]
                            : base[key];
                }
            });

            if (override) {
                Object.keys(override).forEach((key) => {
                    if (result[key] === undefined) {
                        result[key] = override[key];
                    }
                });
            }

            return result;
        },

        clone(value) {
            if (value === undefined || value === null) {
                return value;
            }

            if (typeof value !== "object") {
                return value;
            }

            if (Array.isArray(value)) {
                return value.map((item) => this.clone(item));
            }

            const result = {};

            Object.keys(value).forEach((key) => {
                result[key] = this.clone(value[key]);
            });

            return result;
        },

        number(value, fallback) {
            const parsed = Number(value);

            return Number.isFinite(parsed)
                ? parsed
                : fallback;
        },

        clamp(value, min, max) {
            return Math.max(min, Math.min(max, value));
        },

        lerp(a, b, amount) {
            return a + (b - a) * amount;
        },

        smooth(current, target, speed, dt) {
            const amount = 1 - Math.exp(
                -Math.max(0, speed) * Math.max(0, dt)
            );

            return this.lerp(current, target, amount);
        },

        initialize(camera, width, height) {
            if (!camera) {
                return null;
            }

            camera.width = Math.max(0, this.number(width, 0));
            camera.height = Math.max(0, this.number(height, 0));

            camera.initialized = true;

            return camera;
        },

        resize(camera, width, height) {
            if (!camera) {
                return;
            }

            camera.width = Math.max(0, this.number(width, 0));
            camera.height = Math.max(0, this.number(height, 0));
        },

        setTarget(camera, x, y) {
            if (!camera) {
                return;
            }

            camera.targetX = this.number(x, camera.targetX);
            camera.targetY = this.number(y, camera.targetY);
        },

        setPosition(camera, x, y, instant) {
            if (!camera) {
                return;
            }

            x = this.number(x, camera.x);
            y = this.number(y, camera.y);

            camera.targetX = x;
            camera.targetY = y;

            if (instant !== false) {
                camera.x = x;
                camera.y = y;
            }
        },

        follow(camera, vehicle, dt) {
            if (!camera || !vehicle) {
                return;
            }

            const delta = Math.max(
                0,
                this.number(dt, 1 / 60)
            );

            const vehicleX = this.number(vehicle.x, 0);
            const vehicleY = this.number(vehicle.y, 0);

            let velocityX = 0;

            if (vehicle.velocity) {
                velocityX = this.number(
                    vehicle.velocity.x,
                    0
                );
            } else {
                velocityX = this.number(
                    vehicle.vx,
                    0
                );
            }

            /*
             * Look ahead in the direction the vehicle is moving.
             * This gives the player more visibility in front of
             * the vehicle without making the camera feel detached.
             */
            const lookAhead =
                velocityX *
                camera.lookAheadSpeed +
                Math.sign(velocityX) *
                camera.lookAhead;

            camera.targetX =
                vehicleX +
                lookAhead;

            camera.targetY =
                vehicleY +
                camera.verticalOffset;

            /*
             * If the vehicle is airborne, slightly increase the
             * vertical tracking so large jumps remain visible.
             */
            if (vehicle.grounded === false) {
                camera.targetY =
                    vehicleY +
                    camera.verticalOffset * 0.7;
            }

            /*
             * Optional rotation following.
             */
            if (camera.followRotation) {
                const vehicleRotation =
                    this.number(vehicle.rotation, 0);

                camera.targetRotation =
                    vehicleRotation *
                    camera.rotationStrength;
            } else {
                camera.targetRotation = 0;
            }

            this.applyBounds(camera);

            camera.x = this.smooth(
                camera.x,
                camera.targetX,
                camera.positionSmoothing,
                delta
            );

            camera.y = this.smooth(
                camera.y,
                camera.targetY,
                camera.positionSmoothing,
                delta
            );

            camera.rotation = this.smooth(
                camera.rotation,
                camera.targetRotation,
                camera.rotationSmoothing,
                delta
            );

            this.updateShake(camera, delta);
        },

        update(camera, vehicle, dt) {
            if (!camera) {
                return;
            }

            const delta = Math.max(
                0,
                this.number(dt, 1 / 60)
            );

            if (vehicle) {
                this.follow(
                    camera,
                    vehicle,
                    delta
                );
            } else {
                camera.x = this.smooth(
                    camera.x,
                    camera.targetX,
                    camera.positionSmoothing,
                    delta
                );

                camera.y = this.smooth(
                    camera.y,
                    camera.targetY,
                    camera.positionSmoothing,
                    delta
                );

                camera.rotation = this.smooth(
                    camera.rotation,
                    camera.targetRotation,
                    camera.rotationSmoothing,
                    delta
                );

                this.updateShake(
                    camera,
                    delta
                );
            }
        },

        applyBounds(camera) {
            if (!camera || !camera.bounds) {
                return;
            }

            if (!camera.bounds.enabled) {
                return;
            }

            camera.targetX = this.clamp(
                camera.targetX,
                camera.bounds.minX,
                camera.bounds.maxX
            );

            camera.targetY = this.clamp(
                camera.targetY,
                camera.bounds.minY,
                camera.bounds.maxY
            );
        },

        setBounds(camera, bounds) {
            if (!camera) {
                return;
            }

            bounds = bounds || {};

            camera.bounds = {
                enabled:
                    bounds.enabled !== undefined
                        ? !!bounds.enabled
                        : true,

                minX: this.number(
                    bounds.minX,
                    -Infinity
                ),

                maxX: this.number(
                    bounds.maxX,
                    Infinity
                ),

                minY: this.number(
                    bounds.minY,
                    -Infinity
                ),

                maxY: this.number(
                    bounds.maxY,
                    Infinity
                )
            };

            this.applyBounds(camera);
        },

        clearBounds(camera) {
            if (!camera) {
                return;
            }

            camera.bounds.enabled = false;
        },

        setZoom(camera, zoom, instant) {
            if (!camera) {
                return;
            }

            zoom = this.clamp(
                this.number(zoom, 1),
                camera.minZoom,
                camera.maxZoom
            );

            camera.targetZoom = zoom;

            if (instant !== false) {
                camera.zoom = zoom;
            }
        },

        zoomIn(camera, amount) {
            if (!camera) {
                return;
            }

            amount = this.number(amount, 0.1);

            this.setZoom(
                camera,
                camera.targetZoom + amount,
                false
            );
        },

        zoomOut(camera, amount) {
            if (!camera) {
                return;
            }

            amount = this.number(amount, 0.1);

            this.setZoom(
                camera,
                camera.targetZoom - amount,
                false
            );
        },

        updateZoom(camera, dt) {
            if (!camera) {
                return;
            }

            camera.zoom = this.smooth(
                camera.zoom,
                camera.targetZoom,
                camera.smoothing,
                dt
            );
        },

        addShake(camera, strength) {
            if (!camera) {
                return;
            }

            strength = Math.max(
                0,
                this.number(strength, 0)
            );

            camera.shake = Math.max(
                camera.shake,
                strength
            );
        },

        updateShake(camera, dt) {
            if (!camera) {
                return;
            }

            const delta = Math.max(
                0,
                this.number(dt, 1 / 60)
            );

            if (camera.shake > 0.01) {
                camera.shakeX =
                    (Math.random() * 2 - 1) *
                    camera.shake;

                camera.shakeY =
                    (Math.random() * 2 - 1) *
                    camera.shake;

                camera.shake = Math.max(
                    0,
                    camera.shake -
                    camera.defaultsShakeDecay *
                    delta
                );
            } else {
                camera.shake = 0;
                camera.shakeX = 0;
                camera.shakeY = 0;
            }
        },

        /*
         * Allows the game to control shake decay without
         * requiring another configuration object.
         */
        setShakeDecay(camera, value) {
            if (!camera) {
                return;
            }

            camera.defaultsShakeDecay =
                Math.max(
                    0,
                    this.number(value, 7)
                );
        },

        getShakeOffset(camera) {
            if (!camera) {
                return {
                    x: 0,
                    y: 0
                };
            }

            return {
                x: this.number(camera.shakeX, 0),
                y: this.number(camera.shakeY, 0)
            };
        },

        /*
         * Converts a world X coordinate to a screen X coordinate.
         */
        worldToScreenX(camera, worldX) {
            if (!camera) {
                return worldX;
            }

            const centerX =
                camera.width / 2;

            return (
                (worldX - camera.x) *
                camera.zoom +
                centerX +
                camera.shakeX
            );
        },

        /*
         * Converts a world Y coordinate to a screen Y coordinate.
         */
        worldToScreenY(camera, worldY) {
            if (!camera) {
                return worldY;
            }

            const centerY =
                camera.height / 2;

            return (
                (worldY - camera.y) *
                camera.zoom +
                centerY +
                camera.shakeY
            );
        },

        worldToScreen(camera, x, y) {
            return {
                x: this.worldToScreenX(
                    camera,
                    x
                ),

                y: this.worldToScreenY(
                    camera,
                    y
                )
            };
        },

        /*
         * Converts a screen X coordinate back into world space.
         */
        screenToWorldX(camera, screenX) {
            if (!camera) {
                return screenX;
            }

            const centerX =
                camera.width / 2;

            return (
                (
                    screenX -
                    centerX -
                    camera.shakeX
                ) /
                camera.zoom
            ) + camera.x;
        },

        /*
         * Converts a screen Y coordinate back into world space.
         */
        screenToWorldY(camera, screenY) {
            if (!camera) {
                return screenY;
            }

            const centerY =
                camera.height / 2;

            return (
                (
                    screenY -
                    centerY -
                    camera.shakeY
                ) /
                camera.zoom
            ) + camera.y;
        },

        screenToWorld(camera, x, y) {
            return {
                x: this.screenToWorldX(
                    camera,
                    x
                ),

                y: this.screenToWorldY(
                    camera,
                    y
                )
            };
        },

        /*
         * Starts a camera transform for drawing the world.
         */
        begin(ctx, camera) {
            if (!ctx || !camera) {
                return;
            }

            ctx.save();

            ctx.translate(
                camera.width / 2 +
                camera.shakeX,
                camera.height / 2 +
                camera.shakeY
            );

            if (camera.rotation) {
                ctx.rotate(
                    -camera.rotation
                );
            }

            ctx.scale(
                camera.zoom,
                camera.zoom
            );

            ctx.translate(
                -camera.x,
                -camera.y
            );
        },

        end(ctx) {
            if (!ctx) {
                return;
            }

            ctx.restore();
        },

        /*
         * Draws the world using the camera transform.
         */
        render(ctx, camera, drawWorld) {
            if (!ctx || !camera) {
                return;
            }

            this.begin(
                ctx,
                camera
            );

            if (typeof drawWorld === "function") {
                drawWorld();
            }

            this.end(ctx);
        },

        /*
         * Keeps the camera from moving too far ahead of the
         * terrain when the vehicle is near the beginning.
         */
        constrainToStart(camera, startX) {
            if (!camera) {
                return;
            }

            startX = this.number(
                startX,
                0
            );

            const minimumCameraX =
                startX +
                (camera.width / 2) /
                camera.zoom;

            if (camera.x < minimumCameraX) {
                camera.x = minimumCameraX;
            }

            if (camera.targetX < minimumCameraX) {
                camera.targetX = minimumCameraX;
            }
        },

        /*
         * Returns the approximate visible world rectangle.
         * Useful for terrain generation and culling.
         */
        getVisibleBounds(camera, padding) {
            if (!camera) {
                return {
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0
                };
            }

            padding = this.number(
                padding,
                0
            );

            const halfWidth =
                camera.width /
                (2 * camera.zoom);

            const halfHeight =
                camera.height /
                (2 * camera.zoom);

            return {
                left:
                    camera.x -
                    halfWidth -
                    padding,

                right:
                    camera.x +
                    halfWidth +
                    padding,

                top:
                    camera.y -
                    halfHeight -
                    padding,

                bottom:
                    camera.y +
                    halfHeight +
                    padding
            };
        },

        isVisible(camera, x, y, width, height, padding) {
            if (!camera) {
                return true;
            }

            width = this.number(
                width,
                0
            );

            height = this.number(
                height,
                0
            );

            const bounds =
                this.getVisibleBounds(
                    camera,
                    padding
                );

            return !(
                x + width < bounds.left ||
                x > bounds.right ||
                y + height < bounds.top ||
                y > bounds.bottom
            );
        },

        reset(camera, x, y) {
            if (!camera) {
                return;
            }

            x = this.number(x, 0);
            y = this.number(y, 0);

            camera.x = x;
            camera.y = y;

            camera.targetX = x;
            camera.targetY = y;

            camera.rotation = 0;
            camera.targetRotation = 0;

            camera.zoom = 1;
            camera.targetZoom = 1;

            camera.shake = 0;
            camera.shakeX = 0;
            camera.shakeY = 0;
        },

        /*
         * Immediately move the camera to a vehicle.
         * Useful after restarting a run.
         */
        snapToVehicle(camera, vehicle) {
            if (!camera || !vehicle) {
                return;
            }

            const x =
                this.number(vehicle.x, 0);

            const y =
                this.number(vehicle.y, 0);

            camera.x = x;
            camera.y =
                y +
                camera.verticalOffset;

            camera.targetX = camera.x;
            camera.targetY = camera.y;

            camera.rotation =
                camera.followRotation
                    ? this.number(
                        vehicle.rotation,
                        0
                    ) *
                    camera.rotationStrength
                    : 0;

            camera.targetRotation =
                camera.rotation;
        },

        serialize(camera) {
            if (!camera) {
                return null;
            }

            return {
                x: camera.x,
                y: camera.y,
                targetX: camera.targetX,
                targetY: camera.targetY,
                zoom: camera.zoom,
                targetZoom: camera.targetZoom,
                rotation: camera.rotation,
                targetRotation: camera.targetRotation,
                bounds: this.clone(camera.bounds)
            };
        },

        restore(camera, data) {
            if (!camera || !data) {
                return;
            }

            camera.x =
                this.number(
                    data.x,
                    camera.x
                );

            camera.y =
                this.number(
                    data.y,
                    camera.y
                );

            camera.targetX =
                this.number(
                    data.targetX,
                    camera.x
                );

            camera.targetY =
                this.number(
                    data.targetY,
                    camera.y
                );

            camera.zoom =
                this.clamp(
                    this.number(
                        data.zoom,
                        camera.zoom
                    ),
                    camera.minZoom,
                    camera.maxZoom
                );

            camera.targetZoom =
                this.clamp(
                    this.number(
                        data.targetZoom,
                        camera.zoom
                    ),
                    camera.minZoom,
                    camera.maxZoom
                );

            camera.rotation =
                this.number(
                    data.rotation,
                    0
                );

            camera.targetRotation =
                this.number(
                    data.targetRotation,
                    camera.rotation
                );

            if (data.bounds) {
                this.setBounds(
                    camera,
                    data.bounds
                );
            }
        },

        configure(camera, options) {
            if (!camera || !options) {
                return;
            }

            if (options.smoothing !== undefined) {
                camera.smoothing =
                    this.number(
                        options.smoothing,
                        camera.smoothing
                    );
            }

            if (
                options.positionSmoothing !==
                undefined
            ) {
                camera.positionSmoothing =
                    this.number(
                        options.positionSmoothing,
                        camera.positionSmoothing
                    );
            }

            if (
                options.rotationSmoothing !==
                undefined
            ) {
                camera.rotationSmoothing =
                    this.number(
                        options.rotationSmoothing,
                        camera.rotationSmoothing
                    );
            }

            if (
                options.lookAhead !==
                undefined
            ) {
                camera.lookAhead =
                    this.number(
                        options.lookAhead,
                        camera.lookAhead
                    );
            }

            if (
                options.lookAheadSpeed !==
                undefined
            ) {
                camera.lookAheadSpeed =
                    this.number(
                        options.lookAheadSpeed,
                        camera.lookAheadSpeed
                    );
            }

            if (
                options.verticalOffset !==
                undefined
            ) {
                camera.verticalOffset =
                    this.number(
                        options.verticalOffset,
                        camera.verticalOffset
                    );
            }

            if (
                options.minZoom !==
                undefined
            ) {
                camera.minZoom =
                    this.number(
                        options.minZoom,
                        camera.minZoom
                    );
            }

            if (
                options.maxZoom !==
                undefined
            ) {
                camera.maxZoom =
                    this.number(
                        options.maxZoom,
                        camera.maxZoom
                    );
            }

            if (
                options.followRotation !==
                undefined
            ) {
                camera.followRotation =
                    !!options.followRotation;
            }

            if (
                options.rotationStrength !==
                undefined
            ) {
                camera.rotationStrength =
                    this.number(
                        options.rotationStrength,
                        camera.rotationStrength
                    );
            }

            if (options.bounds) {
                this.setBounds(
                    camera,
                    options.bounds
                );
            }
        },

        /*
         * Debug information for development.
         */
        debug(camera) {
            if (!camera) {
                return null;
            }

            return {
                position: {
                    x: camera.x,
                    y: camera.y
                },

                target: {
                    x: camera.targetX,
                    y: camera.targetY
                },

                zoom: camera.zoom,
                targetZoom: camera.targetZoom,

                rotation: camera.rotation,

                shake: camera.shake,

                viewport: {
                    width: camera.width,
                    height: camera.height
                },

                visible:
                    this.getVisibleBounds(
                        camera
                    )
            };
        }
    };

    /*
     * Internal shake decay fallback.
     *
     * The camera object gets this value during creation so
     * updateShake() remains independent from the global config.
     */
    const originalCreate =
        Camera.create.bind(Camera);

    Camera.create = function (options) {
        const camera =
            originalCreate(options);

        camera.defaultsShakeDecay =
            this.number(
                options &&
                options.shakeDecay,
                this.defaults.shakeDecay
            );

        return camera;
    };

    window.Hillbound.Camera = Camera;

    /*
     * Compatibility alias.
     */
    window.Camera = Camera;

})();
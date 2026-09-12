/* =========================================================
   HILLBOUND
   Wheel System
   js/game/wheels.js
   ========================================================= */

(function () {
    "use strict";

    window.Hillbound = window.Hillbound || {};

    const Wheels = {};

    /* ---------------------------------------------------------
       Utilities
       --------------------------------------------------------- */

    function number(value, fallback = 0) {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function lerp(a, b, amount) {
        return a + (b - a) * amount;
    }

    /* ---------------------------------------------------------
       Default Wheel Configuration
       --------------------------------------------------------- */

    const DEFAULT_WHEEL = {
        radius: 16,
        width: 8,

        // Position relative to the vehicle center.
        offsetX: 0,
        offsetY: 18,

        // Wheel behavior.
        grip: 1,
        suspension: 1,
        damping: 0.85,

        // Runtime values.
        rotation: 0,
        angularVelocity: 0,
        grounded: false,

        compression: 0,
        contactX: 0,
        contactY: 0,
        groundHeight: 0
    };

    /* ---------------------------------------------------------
       Wheel Factory
       --------------------------------------------------------- */

    function createWheel(options = {}) {
        const wheel = Object.assign({}, DEFAULT_WHEEL, options);

        wheel.radius = Math.max(2, number(wheel.radius, 16));
        wheel.width = Math.max(1, number(wheel.width, 8));

        wheel.offsetX = number(wheel.offsetX);
        wheel.offsetY = number(wheel.offsetY);

        wheel.grip = Math.max(0, number(wheel.grip, 1));
        wheel.suspension = Math.max(0, number(wheel.suspension, 1));
        wheel.damping = clamp(number(wheel.damping, 0.85), 0, 1);

        wheel.rotation = number(wheel.rotation);
        wheel.angularVelocity = number(wheel.angularVelocity);

        wheel.grounded = false;
        wheel.compression = 0;

        return wheel;
    }

    Wheels.create = createWheel;

    /* ---------------------------------------------------------
       Wheel Layout
       --------------------------------------------------------- */

    function getWheelLayout(vehicle) {
        if (!vehicle) return [];

        const width = number(
            vehicle.width,
            vehicle.size && vehicle.size.width
        ) || 90;

        const height = number(
            vehicle.height,
            vehicle.size && vehicle.size.height
        ) || 45;

        const vehicleType = String(vehicle.type || "").toLowerCase();
        const id = String(vehicle.id || "").toLowerCase();

        /*
         * Bikes use slightly narrower wheel spacing.
         * Trucks use slightly wider spacing.
         */
        if (vehicleType === "bike" || id.includes("bike")) {
            return [
                {
                    offsetX: -width * 0.38,
                    offsetY: height * 0.28
                },
                {
                    offsetX: width * 0.38,
                    offsetY: height * 0.28
                }
            ];
        }

        if (vehicleType === "truck" || id.includes("truck")) {
            return [
                {
                    offsetX: -width * 0.38,
                    offsetY: height * 0.28
                },
                {
                    offsetX: width * 0.38,
                    offsetY: height * 0.28
                }
            ];
        }

        // Standard car.
        return [
            {
                offsetX: -width * 0.38,
                offsetY: height * 0.30
            },
            {
                offsetX: width * 0.38,
                offsetY: height * 0.30
            }
        ];
    }

    /* ---------------------------------------------------------
       Attach Wheels To Vehicle
       --------------------------------------------------------- */

    function attach(vehicle, options = {}) {
        if (!vehicle) return [];

        const layout = options.layout || getWheelLayout(vehicle);

        vehicle.wheels = layout.map(function (wheelOptions) {
            return createWheel({
                ...wheelOptions,

                radius:
                    options.radius ||
                    wheelOptions.radius ||
                    16,

                width:
                    options.width ||
                    wheelOptions.width ||
                    8,

                grip:
                    options.grip ||
                    1,

                suspension:
                    options.suspension ||
                    1
            });
        });

        return vehicle.wheels;
    }

    Wheels.attach = attach;

    /* ---------------------------------------------------------
       Ensure Wheels Exist
       --------------------------------------------------------- */

    function ensure(vehicle) {
        if (!vehicle) return [];

        if (!Array.isArray(vehicle.wheels) || vehicle.wheels.length === 0) {
            return attach(vehicle);
        }

        return vehicle.wheels;
    }

    Wheels.ensure = ensure;

    /* ---------------------------------------------------------
       World Position
       --------------------------------------------------------- */

    function getWorldPosition(vehicle, wheel) {
        const rotation = number(vehicle.rotation);

        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);

        const localX = number(wheel.offsetX);
        const localY = number(wheel.offsetY);

        return {
            x:
                number(vehicle.x) +
                localX * cos -
                localY * sin,

            y:
                number(vehicle.y) +
                localX * sin +
                localY * cos
        };
    }

    Wheels.getWorldPosition = getWorldPosition;

    /* ---------------------------------------------------------
       Terrain Contact
       --------------------------------------------------------- */

    function getTerrainHeight(terrain, x) {
        if (!terrain) return 0;

        try {
            if (typeof terrain.getHeight === "function") {
                return number(terrain.getHeight(x), 0);
            }

            if (typeof terrain.heightAt === "function") {
                return number(terrain.heightAt(x), 0);
            }

            if (typeof terrain.getGroundHeight === "function") {
                return number(terrain.getGroundHeight(x), 0);
            }

            if (typeof terrain.sampleHeight === "function") {
                return number(terrain.sampleHeight(x), 0);
            }
        } catch (error) {
            console.warn("[Hillbound] Wheel terrain lookup failed:", error);
        }

        return 0;
    }

    /* ---------------------------------------------------------
       Wheel Contact Update
       --------------------------------------------------------- */

    function updateWheelContact(vehicle, wheel, terrain) {
        const position = getWorldPosition(vehicle, wheel);

        const groundHeight = getTerrainHeight(
            terrain,
            position.x
        );

        const wheelBottom = position.y + wheel.radius;

        /*
         * Hillbound's canvas world uses positive Y downward.
         * A wheel is grounded when its bottom reaches the terrain.
         */
        const penetration = wheelBottom - groundHeight;

        const contactTolerance = 5;

        wheel.contactX = position.x;
        wheel.contactY = groundHeight;
        wheel.groundHeight = groundHeight;

        wheel.grounded = penetration >= -contactTolerance;

        if (wheel.grounded) {
            wheel.compression = clamp(
                penetration / Math.max(1, wheel.radius),
                0,
                1
            );
        } else {
            wheel.compression = 0;
        }

        return wheel;
    }

    Wheels.updateContact = updateWheelContact;

    /* ---------------------------------------------------------
       Update All Wheels
       --------------------------------------------------------- */

    function updateContacts(vehicle, terrain) {
        const wheels = ensure(vehicle);

        for (let i = 0; i < wheels.length; i++) {
            updateWheelContact(
                vehicle,
                wheels[i],
                terrain
            );
        }

        return wheels;
    }

    Wheels.updateContacts = updateContacts;

    /* ---------------------------------------------------------
       Grounded State
       --------------------------------------------------------- */

    function isGrounded(vehicle) {
        const wheels = ensure(vehicle);

        for (let i = 0; i < wheels.length; i++) {
            if (wheels[i].grounded) {
                return true;
            }
        }

        return false;
    }

    Wheels.isGrounded = isGrounded;

    function groundedCount(vehicle) {
        const wheels = ensure(vehicle);

        let count = 0;

        for (let i = 0; i < wheels.length; i++) {
            if (wheels[i].grounded) {
                count++;
            }
        }

        return count;
    }

    Wheels.groundedCount = groundedCount;

    /* ---------------------------------------------------------
       Wheel Rotation
       --------------------------------------------------------- */

    function updateRotation(vehicle, dt) {
        const wheels = ensure(vehicle);

        const velocityX = number(
            vehicle.velocity && vehicle.velocity.x,
            0
        );

        const safeDt = Math.max(0, number(dt, 0));

        for (let i = 0; i < wheels.length; i++) {
            const wheel = wheels[i];

            /*
             * Approximate rolling rotation.
             * This keeps wheel animation tied to vehicle movement.
             */
            const angularVelocity =
                velocityX / Math.max(1, wheel.radius);

            wheel.angularVelocity = angularVelocity;

            wheel.rotation +=
                angularVelocity * safeDt;

            /*
             * Prevent the value from growing forever.
             */
            if (Math.abs(wheel.rotation) > Math.PI * 1000) {
                wheel.rotation %= Math.PI * 2;
            }
        }
    }

    Wheels.updateRotation = updateRotation;

    /* ---------------------------------------------------------
       Wheel Grip
       --------------------------------------------------------- */

    function getGrip(vehicle, wheel) {
        const vehicleGrip =
            vehicle &&
            vehicle.stats
                ? number(vehicle.stats.grip, 50) / 50
                : 1;

        const wheelGrip =
            wheel
                ? number(wheel.grip, 1)
                : 1;

        return Math.max(
            0,
            vehicleGrip * wheelGrip
        );
    }

    Wheels.getGrip = getGrip;

    /* ---------------------------------------------------------
       Apply Wheel Traction
       --------------------------------------------------------- */

    function applyTraction(vehicle, wheel, amount, dt) {
        if (!vehicle || !wheel || !wheel.grounded) {
            return;
        }

        if (!vehicle.velocity) {
            vehicle.velocity = {
                x: 0,
                y: 0
            };
        }

        const safeDt = Math.max(0, number(dt, 0));

        const grip = getGrip(vehicle, wheel);

        /*
         * Keep traction modest so the core Physics system
         * remains responsible for the main vehicle movement.
         */
        const traction =
            number(amount, 0) *
            grip *
            safeDt;

        vehicle.velocity.x += traction;
    }

    Wheels.applyTraction = applyTraction;

    /* ---------------------------------------------------------
       Suspension Compression
       --------------------------------------------------------- */

    function getAverageCompression(vehicle) {
        const wheels = ensure(vehicle);

        if (!wheels.length) return 0;

        let total = 0;

        for (let i = 0; i < wheels.length; i++) {
            total += number(
                wheels[i].compression,
                0
            );
        }

        return total / wheels.length;
    }

    Wheels.getAverageCompression = getAverageCompression;

    /* ---------------------------------------------------------
       Vehicle Ground State
       --------------------------------------------------------- */

    function updateVehicleGroundState(vehicle) {
        if (!vehicle) return;

        const count = groundedCount(vehicle);

        vehicle.grounded = count > 0;

        /*
         * Store useful information for the physics system.
         */
        vehicle.groundedWheels = count;
        vehicle.wheelCount = ensure(vehicle).length;

        return vehicle.grounded;
    }

    Wheels.updateVehicleGroundState =
        updateVehicleGroundState;

    /* ---------------------------------------------------------
       Main Wheel Update
       --------------------------------------------------------- */

    function update(vehicle, terrain, dt) {
        if (!vehicle) return;

        const wheels = ensure(vehicle);

        updateContacts(
            vehicle,
            terrain
        );

        updateVehicleGroundState(
            vehicle
        );

        updateRotation(
            vehicle,
            dt
        );

        return wheels;
    }

    Wheels.update = update;

    /* ---------------------------------------------------------
       Draw Wheels
       --------------------------------------------------------- */

    function draw(
        ctx,
        vehicle,
        camera
    ) {
        if (!ctx || !vehicle) return;

        const wheels = ensure(vehicle);

        const cameraX =
            camera && number(camera.x);

        const cameraY =
            camera && number(camera.y);

        for (let i = 0; i < wheels.length; i++) {
            const wheel = wheels[i];

            const position =
                getWorldPosition(
                    vehicle,
                    wheel
                );

            const screenX =
                position.x - cameraX;

            const screenY =
                position.y - cameraY;

            ctx.save();

            ctx.translate(
                screenX,
                screenY
            );

            ctx.rotate(
                wheel.rotation
            );

            /*
             * Tire
             */
            ctx.beginPath();

            ctx.arc(
                0,
                0,
                wheel.radius,
                0,
                Math.PI * 2
            );

            ctx.fillStyle = "#161616";
            ctx.fill();

            /*
             * Wheel rim
             */
            ctx.beginPath();

            ctx.arc(
                0,
                0,
                wheel.radius * 0.48,
                0,
                Math.PI * 2
            );

            ctx.fillStyle = "#777777";
            ctx.fill();

            /*
             * Hub
             */
            ctx.beginPath();

            ctx.arc(
                0,
                0,
                wheel.radius * 0.18,
                0,
                Math.PI * 2
            );

            ctx.fillStyle = "#aaaaaa";
            ctx.fill();

            /*
             * Simple spokes.
             */
            ctx.strokeStyle = "#444444";
            ctx.lineWidth = 2;

            const spokeLength =
                wheel.radius * 0.42;

            for (let spoke = 0; spoke < 4; spoke++) {
                const angle =
                    (Math.PI / 2) * spoke;

                ctx.beginPath();

                ctx.moveTo(0, 0);

                ctx.lineTo(
                    Math.cos(angle) * spokeLength,
                    Math.sin(angle) * spokeLength
                );

                ctx.stroke();
            }

            ctx.restore();
        }
    }

    Wheels.draw = draw;

    /* ---------------------------------------------------------
       Reset
       --------------------------------------------------------- */

    function reset(vehicle) {
        if (!vehicle) return;

        const wheels = ensure(vehicle);

        for (let i = 0; i < wheels.length; i++) {
            const wheel = wheels[i];

            wheel.rotation = 0;
            wheel.angularVelocity = 0;
            wheel.grounded = false;
            wheel.compression = 0;
            wheel.contactX = 0;
            wheel.contactY = 0;
            wheel.groundHeight = 0;
        }

        updateVehicleGroundState(vehicle);
    }

    Wheels.reset = reset;

    /* ---------------------------------------------------------
       Vehicle Registration Helper
       --------------------------------------------------------- */

    function setupVehicle(vehicle) {
        if (!vehicle) return vehicle;

        ensure(vehicle);

        updateVehicleGroundState(
            vehicle
        );

        return vehicle;
    }

    Wheels.setupVehicle = setupVehicle;

    /* ---------------------------------------------------------
       Public API
       --------------------------------------------------------- */

    window.Hillbound.Wheels = Wheels;

    /*
     * Compatibility aliases.
     */
    window.HillboundWheelSystem = Wheels;
    window.Wheels = Wheels;

})();

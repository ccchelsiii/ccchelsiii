const settings = {
    particles: {
        length: 500,
        duration: 2,
        velocity: 100,
        effect: -0.75,
        size: 30,
    },
};

(function () {
    let lastFrameTime = 0;
    const vendors = ["ms", "moz", "webkit", "o"];

    for (let x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x] + "RequestAnimationFrame"];
        window.cancelAnimationFrame =
            window[vendors[x] + "CancelAnimationFrame"] ||
            window[vendors[x] + "CancelRequestAnimationFrame"];
    }

    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = function (callback) {
            const currentTime = new Date().getTime();
            const timeToNextFrame = Math.max(0, 16 - (currentTime - lastFrameTime));
            const id = window.setTimeout(function () {
                callback(currentTime + timeToNextFrame);
            }, timeToNextFrame);
            lastFrameTime = currentTime + timeToNextFrame;
            return id;
        };
    }

    if (!window.cancelAnimationFrame) {
        window.cancelAnimationFrame = function (id) {
            clearTimeout(id);
        };
    }
})();

const Point = (function () {
    function Point(x, y) {
        this.x = x || 0;
        this.y = y || 0;
    }

    Point.prototype.clone = function () {
        return new Point(this.x, this.y);
    };

    Point.prototype.length = function (length) {
        if (typeof length === "undefined")
            return Math.sqrt(this.x * this.x + this.y * this.y);
        this.normalize();
        this.x *= length;
        this.y *= length;
        return this;
    };

    Point.prototype.normalize = function () {
        const length = this.length();
        this.x /= length;
        this.y /= length;
        return this;
    };

    return Point;
})();

const Particle = (function () {
    function Particle() {
        this.position = new Point();
        this.velocity = new Point();
        this.acceleration = new Point();
        this.age = 0;
    }

    Particle.prototype.initialize = function (x, y, dx, dy) {
        this.position.x = x;
        this.position.y = y;
        this.velocity.x = dx;
        this.velocity.y = dy;
        this.acceleration.x = dx * settings.particles.effect;
        this.acceleration.y = dy * settings.particles.effect;
        this.age = 0;
    };

    Particle.prototype.update = function (deltaTime) {
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        this.velocity.x += this.acceleration.x * deltaTime;
        this.velocity.y += this.acceleration.y * deltaTime;
        this.age += deltaTime;
    };

    Particle.prototype.draw = function (context, image) {
        function ease(t) {
            return (--t) * t * t + 1;
        }

        const size = image.width * ease(this.age / settings.particles.duration);
        context.globalAlpha = 1 - this.age / settings.particles.duration;
        context.drawImage(image, this.position.x - size / 2, this.position.y - size / 2, size, size);
    };

    return Particle;
})();

const ParticlePool = (function () {
    let particles,
        firstActive = 0,
        firstFree = 0,
        duration = settings.particles.duration;

    function ParticlePool(length) {
        particles = new Array(length);
        for (let i = 0; i < particles.length; i++) particles[i] = new Particle();
    }

    ParticlePool.prototype.add = function (x, y, dx, dy) {
        particles[firstFree].initialize(x, y, dx, dy);

        firstFree++;
        if (firstFree === particles.length) firstFree = 0;
        if (firstActive === firstFree) firstActive++;
        if (firstActive === particles.length) firstActive = 0;
    };

    ParticlePool.prototype.update = function (deltaTime) {
        if (firstActive < firstFree) {
            for (let i = firstActive; i < firstFree; i++) particles[i].update(deltaTime);
        } else {
            for (let i = firstActive; i < particles.length; i++) particles[i].update(deltaTime);
            for (let i = 0; i < firstFree; i++) particles[i].update(deltaTime);
        }

        while (particles[firstActive].age >= duration && firstActive !== firstFree) {
            firstActive++;
            if (firstActive === particles.length) firstActive = 0;
        }
    };

    ParticlePool.prototype.draw = function (context, image) {
        if (firstActive < firstFree) {
            for (let i = firstActive; i < firstFree; i++) particles[i].draw(context, image);
        } else {
            for (let i = firstActive; i < particles.length; i++) particles[i].draw(context, image);
            for (let i = 0; i < firstFree; i++) particles[i].draw(context, image);
        }
    };

    return ParticlePool;
})();

(function (canvas) {
    const context = canvas.getContext("2d");
    const particles = new ParticlePool(settings.particles.length);
    const particleRate = settings.particles.length / settings.particles.duration;
    let time;

    function pointOnCroquetBow(t) {
        const x = 150 * Math.cos(t);
        const y = 100 * Math.sin(2 * t); // Adjusted for symmetry and a smoother curve
        return new Point(x, y);
    }

    const image = (function () {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.width = settings.particles.size;
        canvas.height = settings.particles.size;

        function to(t) {
            const point = pointOnCroquetBow(t);
            point.x = settings.particles.size / 2 + point.x * settings.particles.size / 300;
            point.y = settings.particles.size / 2 - point.y * settings.particles.size / 300;
            return point;
        }

        context.beginPath();
        let t = 0;
        let point = to(t);
        context.moveTo(point.x, point.y);
        while (t < 2 * Math.PI) {
            t += 0.01;
            point = to(t);
            context.lineTo(point.x, point.y);
        }
        context.closePath();
        context.fillStyle = "#ea80b0";
        context.fill();

        const image = new Image();
        image.src = canvas.toDataURL();
        return image;
    })();

    function render() {
        requestAnimationFrame(render);
        const newTime = new Date().getTime() / 1000;
        const deltaTime = newTime - (time || newTime);
        time = newTime;

        context.clearRect(0, 0, canvas.width, canvas.height);
        const amount = particleRate * deltaTime;
        for (let i = 0; i < amount; i++) {
            const pos = pointOnCroquetBow(2 * Math.PI * Math.random());
            const dir = pos.clone().length(settings.particles.velocity);
            particles.add(canvas.width / 2 + pos.x, canvas.height / 2 - pos.y, dir.x, -dir.y);
        }

        particles.update(deltaTime);
        particles.draw(context, image);
    }

    function onResize() {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    }
    window.onresize = onResize;

    setTimeout(function () {
        onResize();
        render();
    }, 10);
})(document.getElementById("background"));

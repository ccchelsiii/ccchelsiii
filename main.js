document.addEventListener('DOMContentLoaded', () => {

    const settings = {
        particles: {
            length: 500, // maximum amount of particles
            duration: 2, // particle duration in sec
            velocity: 100, // particle velocity in pixels/sec
            effect: -0.75, // play with this for a nice effect
            size: 30, // particle size in pixels
        },
        words: {
            list: ["miel", "chelseah", "miss u", "hahahaha", "mieeeeel", "ccchelsiii_", "ice bear", "carabonara", "pink", "miely", "milesueee", "milesssss"], // List of words
            maxDuration: 5, // Maximum floating time in seconds
            maxWords: 4 // Maximum number of words on screen
        }
    };

    (function() {
        let b = 0;
        const c = ["ms", "moz", "webkit", "o"];
        for (let a = 0; a < c.length && !window.requestAnimationFrame; ++a) {
            window.requestAnimationFrame = window[c[a] + "RequestAnimationFrame"];
            window.cancelAnimationFrame = window[c[a] + "CancelAnimationFrame"] || window[c[a] +
            "CancelRequestAnimationFrame"]
        }
        if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = function(h, e) {
                const d = new Date().getTime();
                const f = Math.max(0, 16 - (d - b));
                const g = window.setTimeout(function () {
                    h(d + f)
                }, f);
                b = d + f;
                return g
            }
        }
        if (!window.cancelAnimationFrame) {
            window.cancelAnimationFrame = function(d) {
                clearTimeout(d)
            }
        }
    }());


    const Point = (function () {
        function Point(x, y) {
            this.x = (typeof x !== 'undefined') ? x : 0;
            this.y = (typeof y !== 'undefined') ? y : 0;
        }

        Point.prototype.clone = function () {
            return new Point(this.x, this.y);
        };
        Point.prototype.length = function (length) {
            if (typeof length == 'undefined')
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
            // create and populate particle pool
            particles = new Array(length);
            for (let i = 0; i < particles.length; i++)
                particles[i] = new Particle();
        }

        ParticlePool.prototype.add = function (x, y, dx, dy) {
            particles[firstFree].initialize(x, y, dx, dy);

            // handle circular queue
            firstFree++;
            if (firstFree == particles.length) firstFree = 0;
            if (firstActive == firstFree) firstActive++;
            if (firstActive == particles.length) firstActive = 0;
        };
        ParticlePool.prototype.update = function (deltaTime) {
            let i;

            // update active particles
            if (firstActive < firstFree) {
                for (i = firstActive; i < firstFree; i++)
                    particles[i].update(deltaTime);
            }
            if (firstFree < firstActive) {
                for (i = firstActive; i < particles.length; i++)
                    particles[i].update(deltaTime);
                for (i = 0; i < firstFree; i++)
                    particles[i].update(deltaTime);
            }

            // remove inactive particles
            while (particles[firstActive].age >= duration && firstActive != firstFree) {
                firstActive++;
                if (firstActive == particles.length) firstActive = 0;
            }


        };
        ParticlePool.prototype.draw = function (context, image) {
            // draw active particles
            if (firstActive < firstFree) {
                for (i = firstActive; i < firstFree; i++)
                    particles[i].draw(context, image);
            }
            if (firstFree < firstActive) {
                for (i = firstActive; i < particles.length; i++)
                    particles[i].draw(context, image);
                for (i = 0; i < firstFree; i++)
                    particles[i].draw(context, image);
            }
        };
        return ParticlePool;
    })();


    (function(canvas) {
        let context = canvas.getContext('2d'),
            particles = new ParticlePool(settings.particles.length),
            particleRate = settings.particles.length / settings.particles.duration, // particles/sec
            time;

        // get point on heart with -PI <= t <= PI
        function pointOnHeart(t) {
            return new Point(
                160 * Math.pow(Math.sin(t), 3),
                130 * Math.cos(t) - 50 * Math.cos(2 * t) - 20 * Math.cos(3 * t) - 10 * Math.cos(4 * t) + 25
            );
        }

        // creating the particle image using a dummy canvas
        const image = (function () {
            const canvas = document.createElement('canvas'),
                context = canvas.getContext('2d');
            canvas.width = settings.particles.size;
            canvas.height = settings.particles.size;

            // helper function to create the path
            function to(t) {
                const point = pointOnHeart(t);
                point.x = settings.particles.size / 2 + point.x * settings.particles.size / 350;
                point.y = settings.particles.size / 2 - point.y * settings.particles.size / 350;
                return point;
            }

            // create the path
            context.beginPath();
            let t = -Math.PI;
            let point = to(t);
            context.moveTo(point.x, point.y);
            while (t < Math.PI) {
                t += 0.01; // baby steps!
                point = to(t);
                context.lineTo(point.x, point.y);
            }
            context.closePath();
            // create the fill
            context.fillStyle = '#ea80b0';
            context.fill();
            // create the image
            const image = new Image();
            image.src = canvas.toDataURL();
            return image;
        })();

        // render that thing!
        function render() {
            // next animation frame
            requestAnimationFrame(render);

            // update time
            const newTime = new Date().getTime() / 1000,
                deltaTime = newTime - (time || newTime);
            time = newTime;

            // clear canvas
            context.clearRect(0, 0, canvas.width, canvas.height);

            // create new particles
            const amount = particleRate * deltaTime;
            for (let i = 0; i < amount; i++) {
                const pos = pointOnHeart(Math.PI - 2 * Math.PI * Math.random());
                const dir = pos.clone().length(settings.particles.velocity);
                particles.add(canvas.width / 2 + pos.x, canvas.height / 2 - pos.y, dir.x, -dir.y);
            }

            // update and draw particles
            particles.update(deltaTime);
            particles.draw(context, image);
        }

        // handle (re-)sizing of the canvas
        function onResize() {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
        }
        window.onresize = onResize;

        // delay rendering bootstrap
        setTimeout(function() {
            onResize();
            render();
        }, 10);

    })(document.getElementById("background"));


    // Function to create and animate floating words
    function createFloatingWord(word) {
        const wordElement = document.createElement('div');
        wordElement.textContent = word;
        wordElement.classList.add('floating-word');
        wordElement.style.position = 'absolute';
        wordElement.style.left = `${Math.random() * 100}vw`;
        wordElement.style.top = `${Math.random() * 100}vh`;
        const wordColor = getRandomColor();
        wordElement.style.color = wordColor;
        wordElement.style.transform = `rotate(${Math.random() * 300}deg)`;
        wordElement.style.opacity = '0';
        wordElement.style.fontSize = '1.8em'; // Increase font size slightly
        wordElement.style.textShadow = `0 0 10px ${wordColor}`; // Add glowing effect
        document.body.appendChild(wordElement);

        // Animate the word
        setTimeout(() => {
            wordElement.style.transition = 'opacity 1s ease-out, transform 10s linear';
            wordElement.style.opacity = '1';
            wordElement.style.transform += ' scale(1.5)';
        }, 100);

        // Fade out and remove the word after maxDuration seconds
        setTimeout(() => {
            wordElement.style.opacity = '0';
            setTimeout(() => {
                wordElement.remove();
            }, 1000);
        }, Math.random() * settings.words.maxDuration * 1000);

        // Function to get random color
        function getRandomColor() {
            const letters = '0123456789ABCDEF';
            let color = '#';
            for (let i = 0; i < 6; i++) {
                color += letters[Math.floor(Math.random() * 16)];
            }
            return color;
        }
    }

    // Display random floating words from the list
    setInterval(() => {
        const word = settings.words.list[Math.floor(Math.random() * settings.words.list.length)];
        if (document.querySelectorAll('.floating-word').length < settings.words.maxWords) {
            createFloatingWord(word);
        }
    }, 3000);

    setInterval(() => {
        console.log("miss u much huhu");
    }, 5000);

});

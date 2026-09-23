(() => {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'sidebar-dither';
  canvas.setAttribute('aria-hidden', 'true');
  sidebar.prepend(canvas);

  const context = canvas.getContext('2d', { alpha: true });
  const lightPalette = [[242, 134, 164], [155, 151, 228], [91, 184, 186], [238, 179, 111]];
  const darkPalette = [[220, 94, 143], [128, 116, 226], [63, 164, 170], [217, 139, 72]];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pixelSize = 2;
  let width = 1;
  let height = 1;
  let particles = [];
  let frame;
  let lastFrame = 0;
  let lastRender = 0;

  const mix = (a, b, amount) => a + (b - a) * amount;
  const randomBetween = (min, max) => min + Math.random() * (max - min);

  function colorAt(palette, position) {
    const wrapped = ((position % palette.length) + palette.length) % palette.length;
    const index = Math.floor(wrapped);
    const amount = wrapped - index;
    return palette[index].map((channel, channelIndex) => mix(channel, palette[(index + 1) % palette.length][channelIndex], amount));
  }

  function resetParticle(particle, initial = false) {
    particle.anchorX = randomBetween(width * .68, width * 1.02);
    particle.y = initial ? randomBetween(-4, height + 4) : height + randomBetween(1, 18);
    particle.speed = randomBetween(.0035, .009);
    particle.wobble = randomBetween(1.2, Math.max(2, width * .055));
    particle.phase = randomBetween(0, Math.PI * 2);
    particle.alpha = randomBetween(.28, .7);
    particle.paletteOffset = randomBetween(-.18, .18);
    particle.tail = Math.random() > .72 ? 2 : 1;
  }

  function buildParticles() {
    const count = Math.max(32, Math.round(width * height * .005));
    particles = Array.from({ length: count }, () => {
      const particle = {};
      resetParticle(particle, true);
      return particle;
    });
  }

  function resize() {
    const bounds = sidebar.getBoundingClientRect();
    const nextWidth = Math.max(1, Math.ceil(bounds.width / pixelSize));
    const nextHeight = Math.max(1, Math.ceil(bounds.height / pixelSize));
    if (canvas.width === nextWidth && canvas.height === nextHeight) return;
    width = nextWidth;
    height = nextHeight;
    canvas.width = width;
    canvas.height = height;
    buildParticles();
    render(performance.now(), 0);
  }

  function drawPixel(x, y, color, alpha) {
    context.fillStyle = `rgba(${Math.round(color[0])},${Math.round(color[1])},${Math.round(color[2])},${alpha.toFixed(3)})`;
    context.fillRect(Math.round(x), Math.round(y), 1, 1);
  }

  function render(now, delta) {
    const isDark = getComputedStyle(document.documentElement).colorScheme === 'dark';
    const palette = isDark ? darkPalette : lightPalette;
    const palettePosition = now * .00018;
    context.clearRect(0, 0, width, height);

    particles.forEach(particle => {
      if (!reducedMotion) particle.y -= particle.speed * delta;
      if (particle.y < -5) resetParticle(particle);

      const x = particle.anchorX + Math.sin(now * .00075 + particle.phase) * particle.wobble + Math.cos(particle.y * .055 + particle.phase) * 1.2;
      const edgeFade = Math.max(0, Math.min(1, (x / width - .58) / .42));
      const twinkle = .72 + Math.sin(now * .0011 + particle.phase) * .18;
      const color = colorAt(palette, palettePosition + particle.paletteOffset + particle.y / Math.max(1, height) * .22);
      const alpha = particle.alpha * edgeFade * twinkle;
      if (alpha < .06) return;

      drawPixel(x, particle.y, color, alpha);
      if (particle.tail > 1) drawPixel(x, particle.y + 1, color, alpha * .34);
    });
  }

  function animate(now) {
    if (now - lastFrame >= 1000 / 20) {
      const delta = Math.min(80, now - lastRender || 0);
      lastRender = now;
      render(now, delta);
      lastFrame = now;
    }
    frame = requestAnimationFrame(animate);
  }

  new ResizeObserver(resize).observe(sidebar);
  resize();

  if (!reducedMotion) {
    lastRender = performance.now();
    frame = requestAnimationFrame(animate);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
      } else {
        lastFrame = 0;
        lastRender = performance.now();
        frame = requestAnimationFrame(animate);
      }
    });
  }
})();

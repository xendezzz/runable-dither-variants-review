(() => {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'sidebar-dither';
  canvas.setAttribute('aria-hidden', 'true');
  sidebar.prepend(canvas);

  const context = canvas.getContext('2d', { alpha: true });
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const lightPalette = [[241, 125, 160], [144, 157, 239], [91, 190, 194], [244, 181, 104]];
  const darkPalette = [[202, 91, 139], [116, 109, 220], [61, 161, 170], [211, 135, 62]];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pixelSize = 3;
  let width = 1;
  let height = 1;
  let frame;
  let lastFrame = 0;

  const clamp = value => Math.max(0, Math.min(1, value));
  const mix = (a, b, amount) => a + (b - a) * amount;

  function resize() {
    const bounds = sidebar.getBoundingClientRect();
    width = Math.max(1, Math.ceil(bounds.width / pixelSize));
    height = Math.max(1, Math.ceil(bounds.height / pixelSize));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    render(performance.now());
  }

  function render(now) {
    const isDark = getComputedStyle(document.documentElement).colorScheme === 'dark';
    const palette = isDark ? darkPalette : lightPalette;
    const image = context.createImageData(width, height);
    const phase = now * .00028;
    const palettePosition = (phase * .9) % palette.length;
    const paletteIndex = Math.floor(palettePosition);
    const colorAmount = palettePosition - paletteIndex;
    const first = palette[paletteIndex];
    const second = palette[(paletteIndex + 1) % palette.length];
    const baseColor = first.map((channel, index) => mix(channel, second[index], colorAmount));

    for (let y = 0; y < height; y += 1) {
      const ny = y / Math.max(1, height - 1);
      for (let x = 0; x < width; x += 1) {
        const nx = x / Math.max(1, width - 1);
        const index = (y * width + x) * 4;
        const edge = clamp((nx - .34) / .66);
        const waveA = Math.sin(ny * 8.2 + phase * 3.1 + nx * 2.4);
        const waveB = Math.cos(ny * 3.7 - phase * 2.2 + nx * 7.1);
        const waveC = Math.sin((nx + ny) * 10.4 + phase * 1.6);
        const field = clamp(.48 + waveA * .19 + waveB * .13 + waveC * .08);
        const envelope = edge * (.19 + field * .34);
        const threshold = (bayer[(y % 4) * 4 + (x % 4)] + .5) / 16;
        if (envelope < threshold) continue;

        const localTint = .88 + .12 * Math.sin(ny * 5.3 - phase * 2.5);
        image.data[index] = Math.round(baseColor[0] * localTint);
        image.data[index + 1] = Math.round(baseColor[1] * localTint);
        image.data[index + 2] = Math.round(baseColor[2] * localTint);
        image.data[index + 3] = Math.round(118 + field * 78);
      }
    }
    context.putImageData(image, 0, 0);
  }

  function animate(now) {
    if (now - lastFrame >= 1000 / 15) {
      render(now);
      lastFrame = now;
    }
    frame = requestAnimationFrame(animate);
  }

  const observer = new ResizeObserver(resize);
  observer.observe(sidebar);
  resize();

  if (!reducedMotion) {
    frame = requestAnimationFrame(animate);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
      } else {
        lastFrame = 0;
        frame = requestAnimationFrame(animate);
      }
    });
  }
})();

(() => {
  const matrix = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const clamp = value => Math.max(0, Math.min(255, value));

  function init(thumbnail) {
    const image = thumbnail.querySelector('img');
    if (!image) return;

    const monoCanvas = document.createElement('canvas');
    const colorCanvas = document.createElement('canvas');
    monoCanvas.className = 'thumbnail-static-dither thumbnail-static-dither--mono';
    colorCanvas.className = 'thumbnail-static-dither thumbnail-static-dither--color';
    monoCanvas.setAttribute('aria-hidden', 'true');
    colorCanvas.setAttribute('aria-hidden', 'true');
    thumbnail.append(monoCanvas, colorCanvas);

    let scheduled = false;

    function render() {
      scheduled = false;
      if (!image.complete || !image.naturalWidth) return;

      const bounds = thumbnail.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(bounds.width * dpr));
      const height = Math.max(1, Math.round(bounds.height * dpr));
      if (monoCanvas.width === width && monoCanvas.height === height && thumbnail.classList.contains('has-static-dither')) return;

      monoCanvas.width = colorCanvas.width = width;
      monoCanvas.height = colorCanvas.height = height;

      const sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = width;
      sourceCanvas.height = height;
      const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
      const imageRatio = image.naturalWidth / image.naturalHeight;
      const canvasRatio = width / height;
      let sourceX = 0;
      let sourceY = 0;
      let sourceWidth = image.naturalWidth;
      let sourceHeight = image.naturalHeight;

      if (canvasRatio > imageRatio) {
        sourceHeight = image.naturalWidth / canvasRatio;
        sourceY = (image.naturalHeight - sourceHeight) / 2;
      } else {
        sourceWidth = image.naturalHeight * canvasRatio;
        sourceX = (image.naturalWidth - sourceWidth) / 2;
      }

      sourceContext.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
      const source = sourceContext.getImageData(0, 0, width, height);
      const mono = new ImageData(width, height);
      const color = new ImageData(width, height);

      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const index = (y * width + x) * 4;
          const red = source.data[index];
          const green = source.data[index + 1];
          const blue = source.data[index + 2];
          const sourceLuminance = (red * .2126 + green * .7152 + blue * .0722) / 255;
          const luminance = Math.max(0, Math.min(1, (sourceLuminance - .12) * 1.24));
          const threshold = (matrix[(y % 4) * 4 + (x % 4)] + .5) / 16;
          const dot = luminance >= threshold ? 1 : 0;
          const exposed = Math.max(0, Math.min(1, sourceLuminance * 1.14 + .03));
          const monoValue = clamp(((dot ? 237 : 20) * .82) + ((exposed * 158 + 5) * .18));
          const colorLift = dot ? 1 : .55;

          mono.data[index] = mono.data[index + 1] = mono.data[index + 2] = monoValue;
          mono.data[index + 3] = 255;
          color.data[index] = clamp(red * colorLift * .82 + Math.min(red * 1.12 + 5, 255) * .18);
          color.data[index + 1] = clamp(green * colorLift * .82 + Math.min(green * 1.12 + 5, 255) * .18);
          color.data[index + 2] = clamp(blue * colorLift * .82 + Math.min(blue * 1.12 + 5, 255) * .18);
          color.data[index + 3] = 255;
        }
      }

      monoCanvas.getContext('2d').putImageData(mono, 0, 0);
      colorCanvas.getContext('2d').putImageData(color, 0, 0);
      thumbnail.classList.add('has-static-dither');
    }

    function schedule() {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(render);
    }

    image.addEventListener('load', schedule, { once: true });
    new ResizeObserver(schedule).observe(thumbnail);
    schedule();
  }

  document.querySelectorAll('.lesson-thumbnail').forEach(init);
})();

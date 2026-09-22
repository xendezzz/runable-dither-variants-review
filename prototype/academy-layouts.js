(() => {
  const frame = document.querySelector('.academy-frame');
  const holder = document.querySelector('.frame-holder');
  if (!frame || !holder) return;
  const resize = () => {
    const scale = Math.min(1, holder.clientWidth / 1512);
    frame.style.transform = `scale(${scale})`;
    holder.style.height = `${740 * scale}px`;
  };
  new ResizeObserver(resize).observe(holder);
  resize();
})();

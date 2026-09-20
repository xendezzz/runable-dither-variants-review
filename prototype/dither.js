(() => {
  function init(card) {
  const background = card.querySelector('.bg-art');
  const canvas = card.querySelector('.bg-dither');
  const fallback = card.querySelector('.bg-fallback');
  const canHover = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 901px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false });
  if (!gl) return;

  // The one-pixel shader and pointer response match the approved third variant.
  const vertex = `attribute vec2 a_position;varying vec2 v_uv;void main(){v_uv=(a_position+1.0)*0.5;gl_Position=vec4(a_position,0.0,1.0);}`;
  const fragment = `
    precision highp float;
    uniform sampler2D u_image;uniform vec2 u_resolution,u_imageSize,u_pointer,u_mid,u_tail;uniform float u_time,u_reveal,u_radius,u_pixelRatio,u_speed;varying vec2 v_uv;
    float bayer(vec2 q){vec2 p=mod(floor(q),4.0);
      if(p.y<1.0){if(p.x<1.0)return 0.0;if(p.x<2.0)return 8.0;if(p.x<3.0)return 2.0;return 10.0;}
      if(p.y<2.0){if(p.x<1.0)return 12.0;if(p.x<2.0)return 4.0;if(p.x<3.0)return 14.0;return 6.0;}
      if(p.y<3.0){if(p.x<1.0)return 3.0;if(p.x<2.0)return 11.0;if(p.x<3.0)return 1.0;return 9.0;}
      if(p.x<1.0)return 15.0;if(p.x<2.0)return 7.0;if(p.x<3.0)return 13.0;return 5.0;}
    void main(){
      vec2 ditherCell=floor(gl_FragCoord.xy);
      vec2 pixelCoord=ditherCell+vec2(0.5);
      vec2 uv=pixelCoord/u_resolution;float canvasRatio=u_resolution.x/u_resolution.y,imageRatio=u_imageSize.x/u_imageSize.y;
      if(canvasRatio>imageRatio)uv.y=(uv.y-0.5)*imageRatio/canvasRatio+0.5;
      else uv.x=(uv.x-0.5)*canvasRatio/imageRatio+0.5;
      vec2 delta=pixelCoord-u_pointer;
      float distanceFromPointer=length(delta);
      float angle=atan(delta.y,delta.x);
      vec2 direction=u_pointer-u_mid;
      direction=length(direction)>1.0?normalize(direction):vec2(1.0,0.0);
      float behind=max(0.0,dot(delta/(distanceFromPointer+0.001),-direction));
      float fluidEdge=1.0+0.035*sin(angle*3.0+u_time*1.3)+0.018*sin(angle*7.0-u_time*1.8)+0.22*u_speed*behind;
      float boundary=u_radius*fluidEdge;
      float fluidStrength=u_reveal*(1.0-smoothstep(u_radius*0.15,u_radius,distanceFromPointer));
      vec2 displacement=vec2(sin(uv.y*26.0+u_time*1.4),cos(uv.x*23.0-u_time*1.2))*1.25*u_pixelRatio*fluidStrength/u_resolution;
      vec3 original=texture2D(u_image,clamp(uv+displacement,0.0,1.0)).rgb;
      float luminance=dot(original,vec3(0.2126,0.7152,0.0722));
      luminance=clamp((luminance-0.12)*1.24,0.0,1.0);
      float threshold=(bayer(ditherCell)+0.5)/16.0;
      threshold+=0.035*sin(u_time*2.1+uv.x*14.0+uv.y*7.0);
      threshold+=0.0125*sin(u_time*4.3+uv.x*33.0-uv.y*17.0);
      float dotColor=step(threshold,luminance);
      float exposedLuma=clamp(dot(original,vec3(0.2126,0.7152,0.0722))*1.14+0.03,0.0,1.0);
      vec3 monochrome=mix(mix(vec3(0.0784),vec3(0.9294),dotColor),vec3(exposedLuma*0.62+0.02),0.18);
      vec3 coloredDither=mix(mix(original*0.55,original,dotColor),min(original*1.12+vec3(0.02),vec3(1.0)),0.18);
      float edgeDither=(bayer(ditherCell+vec2(2.0,1.0))+0.5)/16.0-0.5;
      float radialProgress=clamp((distanceFromPointer+edgeDither*6.0*u_pixelRatio)/boundary,0.0,1.0);
      float circleBlend=1.0-smoothstep(0.0,1.0,radialProgress);
      vec2 firstSegment=u_mid-u_tail;
      vec2 secondSegment=u_pointer-u_mid;
      float firstPosition=clamp(dot(pixelCoord-u_tail,firstSegment)/max(dot(firstSegment,firstSegment),1.0),0.0,1.0);
      float secondPosition=clamp(dot(pixelCoord-u_mid,secondSegment)/max(dot(secondSegment,secondSegment),1.0),0.0,1.0);
      float firstRadius=u_radius*mix(0.16,0.38,firstPosition)*(0.8+0.35*u_speed);
      float secondRadius=u_radius*mix(0.38,0.66,secondPosition)*(0.8+0.35*u_speed);
      float firstDistance=length(pixelCoord-mix(u_tail,u_mid,firstPosition))+edgeDither*5.0*u_pixelRatio;
      float secondDistance=length(pixelCoord-mix(u_mid,u_pointer,secondPosition))+edgeDither*5.0*u_pixelRatio;
      float firstBlend=(1.0-smoothstep(0.0,firstRadius,firstDistance))*mix(0.06,0.25,firstPosition);
      float secondBlend=(1.0-smoothstep(0.0,secondRadius,secondDistance))*mix(0.25,0.55,secondPosition);
      float trailBlend=max(firstBlend,secondBlend)*(0.35+0.65*u_speed);
      float reveal=u_reveal*max(circleBlend,trailBlend);
      vec3 result=mix(monochrome,coloredDither,reveal);
      gl_FragColor=vec4(result,1.0);
    }`;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }

  let program;
  try {
    program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  } catch (error) {
    console.warn('Using the image fallback:', error);
    return;
  }

  gl.useProgram(program);
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const names = ['u_image','u_resolution','u_imageSize','u_pointer','u_mid','u_tail','u_time','u_reveal','u_radius','u_pixelRatio','u_speed'];
  const u = Object.fromEntries(names.map(name => [name, gl.getUniformLocation(program, name)]));
  gl.uniform1i(u.u_image, 0);

  const state = { dpr: 1, ready: false, visible: false, pointerX: -10000, pointerY: -10000, midX: -10000, midY: -10000, tailX: -10000, tailY: -10000, targetX: -10000, targetY: -10000, hasPointer: false, reveal: 0, targetReveal: 0, lastMove: 0, targetSpeed: 0, speed: 0, lastFrame: 0 };
  new IntersectionObserver(entries => { state.visible = entries[0].isIntersecting; }, { threshold: .01 }).observe(card);
  function resize() {
    const box = canvas.getBoundingClientRect();
    state.dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(box.width * state.dpr));
    canvas.height = Math.max(1, Math.round(box.height * state.dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(program);
    gl.uniform2f(u.u_resolution, canvas.width, canvas.height);
    gl.uniform1f(u.u_pixelRatio, state.dpr);
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  const picture = new Image();
  picture.onload = () => {
    try {
      gl.useProgram(program);
      const texture = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, picture);
      if (gl.getError() !== gl.NO_ERROR) throw new Error('WebGL texture upload failed');
      gl.uniform2f(u.u_imageSize, picture.naturalWidth, picture.naturalHeight);
      state.ready = true;
      background.classList.add('ready');
    } catch (error) {
      console.warn('Using the image fallback:', error);
    }
  };
  picture.onerror = () => console.warn('Academy background could not load');
  const textureSources = { academy: window.RUNABLE_CARD_TEXTURE, webinars: window.RUNABLE_WEBINAR_TEXTURE, desktop: window.RUNABLE_DESKTOP_TEXTURE };
  picture.src = textureSources[card.dataset.texture] || fallback.src;

  card.addEventListener('pointermove', event => {
    if (!canHover.matches || event.pointerType === 'touch') return;
    const box = canvas.getBoundingClientRect();
    const now = performance.now();
    const nextX = (event.clientX - box.left) * state.dpr;
    const nextY = (box.bottom - event.clientY) * state.dpr;
    const elapsed = now - state.lastMove;
    if (state.hasPointer && elapsed > 0 && elapsed < 250) {
      state.targetSpeed = Math.min(1, Math.hypot(nextX - state.targetX, nextY - state.targetY) / state.dpr / (elapsed / 1000) / 1400);
    }
    state.targetX = nextX;
    state.targetY = nextY;
    state.lastMove = now;
    if (!state.hasPointer) {
      state.pointerX = state.midX = state.tailX = nextX;
      state.pointerY = state.midY = state.tailY = nextY;
      state.targetSpeed = 0;
      state.hasPointer = true;
    }
    state.targetReveal = 1;
  });
  card.addEventListener('pointerleave', () => {
    state.targetReveal = 0;
    state.targetSpeed = 0;
    state.hasPointer = false;
    state.lastMove = 0;
  });
  canHover.addEventListener('change', () => {
    if (!canHover.matches) {
      state.reveal = state.targetReveal = state.targetSpeed = 0;
      state.hasPointer = false;
      state.lastMove = 0;
    }
  });
  canvas.addEventListener('webglcontextlost', () => background.classList.remove('ready'));

  function render(now) {
    requestAnimationFrame(render);
    if (!state.ready || !state.visible || now - state.lastFrame < (reduced.matches ? 200 : 33)) return;
    const dt = state.lastFrame ? Math.min(100, now - state.lastFrame) : 33;
    state.lastFrame = now;
    state.speed += (state.targetSpeed - state.speed) * (reduced.matches ? 1 : 1 - Math.exp(-dt / 120));
    state.targetSpeed *= Math.exp(-dt / 220);
    const follow = reduced.matches ? 1 : 1 - Math.exp(-dt / 330);
    state.pointerX += (state.targetX - state.pointerX) * follow;
    state.pointerY += (state.targetY - state.pointerY) * follow;
    const midFollow = reduced.matches ? 1 : 1 - Math.exp(-dt / (520 + 160 * state.speed));
    state.midX += (state.pointerX - state.midX) * midFollow;
    state.midY += (state.pointerY - state.midY) * midFollow;
    const tailFollow = reduced.matches ? 1 : 1 - Math.exp(-dt / (850 + 600 * state.speed));
    state.tailX += (state.midX - state.tailX) * tailFollow;
    state.tailY += (state.midY - state.tailY) * tailFollow;
    state.reveal += (state.targetReveal - state.reveal) * (reduced.matches ? 1 : .16);
    gl.useProgram(program);
    gl.uniform2f(u.u_pointer, state.pointerX, state.pointerY);
    gl.uniform2f(u.u_mid, state.midX, state.midY);
    gl.uniform2f(u.u_tail, state.tailX, state.tailY);
    gl.uniform1f(u.u_speed, state.speed);
    gl.uniform1f(u.u_time, reduced.matches ? 0 : now * .0005);
    gl.uniform1f(u.u_reveal, state.reveal);
    gl.uniform1f(u.u_radius, 356.25 * state.dpr);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  requestAnimationFrame(render);
  }
  document.querySelectorAll('.academy-card').forEach(init);
})();

const clanMark = document.querySelector(".clan-mark");
const siteHeader = document.querySelector(".site-header");
const clanDaysElement = document.querySelector("#clan-days");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const clanAgeStartDate = "2026-11-27";
const clanAgeOnStartDate = 6;

function updateClanAge() {
  if (!clanDaysElement) {
    return;
  }

  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const startUtc = Date.parse(`${clanAgeStartDate}T00:00:00Z`);
  const daysSinceStart = Math.max(0, Math.floor((todayUtc - startUtc) / 86_400_000));

  clanDaysElement.textContent = String(clanAgeOnStartDate + daysSinceStart);

  const nextDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  window.setTimeout(updateClanAge, nextDay.getTime() - Date.now() + 50);
}

updateClanAge();

let frameRequested = false;
let lastScrollY = window.scrollY;
let wheelTargetY = window.scrollY;
let wheelFrame = 0;

function updateMarkDrift() {
  frameRequested = false;

  if (!clanMark || reducedMotion.matches) {
    return;
  }

  const progress = Math.min(Math.max(window.scrollY / (window.innerHeight * 0.85), 0), 1);

  clanMark.style.setProperty("--drift", `${progress * 24}px`);
}

function requestMarkUpdate() {
  if (!frameRequested) {
    frameRequested = true;
    window.requestAnimationFrame(updateMarkDrift);
  }
}

function handleScroll() {
  const currentScrollY = window.scrollY;

  if (siteHeader) {
    if (currentScrollY <= 80 || currentScrollY < lastScrollY) {
      siteHeader.classList.remove("site-header--hidden");
    } else if (currentScrollY > lastScrollY) {
      siteHeader.classList.add("site-header--hidden");
    }
  }

  lastScrollY = currentScrollY;
  requestMarkUpdate();
}

function scrollToPositionImmediately(position) {
  const root = document.documentElement;
  const previousBehavior = root.style.scrollBehavior;

  root.style.scrollBehavior = "auto";
  window.scrollTo(0, position);
  root.style.scrollBehavior = previousBehavior;
}

function animateWheelScroll() {
  const distance = wheelTargetY - window.scrollY;

  if (Math.abs(distance) < 0.5) {
    scrollToPositionImmediately(wheelTargetY);
    wheelFrame = 0;
    return;
  }

  scrollToPositionImmediately(window.scrollY + distance * 0.16);
  wheelFrame = window.requestAnimationFrame(animateWheelScroll);
}

function handleWheel(event) {
  if (
    reducedMotion.matches ||
    event.ctrlKey ||
    event.deltaY === 0 ||
    Math.abs(event.deltaX) > Math.abs(event.deltaY)
  ) {
    return;
  }

  event.preventDefault();

  if (!wheelFrame) {
    wheelTargetY = window.scrollY;
  }

  const deltaMultiplier = event.deltaMode === WheelEvent.DOM_DELTA_LINE
    ? 16
    : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
      ? window.innerHeight
      : 1;
  const maxScrollY = document.documentElement.scrollHeight - window.innerHeight;

  wheelTargetY = Math.min(
    Math.max(wheelTargetY + event.deltaY * deltaMultiplier * 0.65, 0),
    maxScrollY,
  );

  if (!wheelFrame) {
    wheelFrame = window.requestAnimationFrame(animateWheelScroll);
  }
}

function stopWheelAnimation() {
  if (wheelFrame) {
    window.cancelAnimationFrame(wheelFrame);
    wheelFrame = 0;
    wheelTargetY = window.scrollY;
  }
}

function initializeCursorTrail() {
  if (
    reducedMotion.matches ||
    !window.matchMedia("(hover: hover) and (pointer: fine)").matches
  ) {
    return;
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  canvas.className = "cursor-trail";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);

  const particles = [];
  let animationFrame = 0;
  let lastParticlePosition = null;
  let lastParticleTime = 0;
  let pixelRatio = 1;

  function resizeCanvas() {
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * pixelRatio);
    canvas.height = Math.round(window.innerHeight * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  function addParticle(x, y) {
    const sparkle = Math.random() < 0.22;

    particles.push({
      x,
      y,
      velocityX: (Math.random() - 0.5) * 0.045,
      velocityY: -0.015 - Math.random() * 0.03,
      size: sparkle ? 2.2 + Math.random() * 1.2 : 1 + Math.random() * 1.1,
      lifetime: 650 + Math.random() * 250,
      age: 0,
      lastUpdate: performance.now(),
      color: Math.random() < 0.82 ? "226, 70, 50" : "255, 145, 98",
    });

    if (particles.length > 24) {
      particles.shift();
    }

    if (!animationFrame) {
      animationFrame = window.requestAnimationFrame(renderParticles);
    }
  }

  function renderParticles(timestamp) {
    animationFrame = 0;
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);

    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index];
      const elapsed = Math.min(timestamp - particle.lastUpdate, 32);

      particle.lastUpdate = timestamp;
      particle.age += elapsed;

      if (particle.age >= particle.lifetime) {
        particles.splice(index, 1);
        continue;
      }

      particle.x += particle.velocityX * elapsed;
      particle.y += particle.velocityY * elapsed;

      const opacity = 1 - particle.age / particle.lifetime;
      context.globalAlpha = opacity * 0.58;
      context.fillStyle = `rgb(${particle.color})`;
      context.shadowColor = `rgba(${particle.color}, ${opacity * 0.7})`;
      context.shadowBlur = particle.size * 3;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size * 0.65, 0, Math.PI * 2);
      context.fill();
    }

    context.globalAlpha = 1;
    context.shadowBlur = 0;

    if (particles.length > 0) {
      animationFrame = window.requestAnimationFrame(renderParticles);
    }
  }

  function handlePointerMove(event) {
    if (event.pointerType !== "mouse") {
      return;
    }

    const position = { x: event.clientX, y: event.clientY };
    const now = performance.now();

    if (!lastParticlePosition) {
      addParticle(position.x, position.y);
      lastParticlePosition = position;
      lastParticleTime = now;
      return;
    }

    const distance = Math.hypot(
      position.x - lastParticlePosition.x,
      position.y - lastParticlePosition.y,
    );

    if (distance < 18 || now - lastParticleTime < 42) {
      return;
    }

    addParticle(position.x, position.y);
    lastParticlePosition = position;
    lastParticleTime = now;
  }

  function handleReducedMotionChange(event) {
    if (event.matches) {
      particles.length = 0;
      lastParticlePosition = null;
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }
  }

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("pointermove", handlePointerMove, { passive: true });
  reducedMotion.addEventListener("change", handleReducedMotionChange);
}

window.addEventListener("scroll", handleScroll, { passive: true });
window.addEventListener("wheel", handleWheel, { passive: false });
window.addEventListener("pointerdown", stopWheelAnimation, { passive: true });
window.addEventListener("keydown", stopWheelAnimation);
window.addEventListener("touchstart", stopWheelAnimation, { passive: true });
window.addEventListener("resize", requestMarkUpdate);
reducedMotion.addEventListener("change", requestMarkUpdate);
updateMarkDrift();
initializeCursorTrail();

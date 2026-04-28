const nav = document.querySelector(".nav");
const navToggle = document.querySelector(".nav__toggle");
const mobileMenu = document.querySelector(".mobile-menu");
const mobileMenuPanel = document.querySelector(".mobile-menu__panel");
const mobileMenuClose = document.querySelector(".mobile-menu__close");
const navLinks = document.querySelectorAll("[data-nav-link]");
const mobileLinks = document.querySelectorAll("[data-mobile-link]");
const animatedSections = document.querySelectorAll("[data-animate]");
const typingElement = document.querySelector(".hero__typing");
const typingTextElement = document.querySelector(".hero__typing-text");
const heroCanvas = document.querySelector("#hero-canvas");
const tiltCards = document.querySelectorAll("[data-tilt]");

/**
 * 根据锚点找到目标区块并平滑滚动，同时更新 URL hash。
 * @param {string} targetId
 */
function scrollToSection(targetId) {
  const target = document.querySelector(targetId);

  if (!target) {
    return;
  }

  target.scrollIntoView({ behavior: "smooth", block: "start" });

  if (window.location.hash !== targetId) {
    window.history.pushState(null, "", targetId);
  }
}

/**
 * 打开或关闭移动端菜单，同时同步可访问性属性。
 * @param {boolean} isOpen
 */
function setMenuState(isOpen) {
  if (!mobileMenu || !navToggle) {
    return;
  }

  mobileMenu.classList.toggle("is-open", isOpen);
  document.body.classList.toggle("menu-open", isOpen);
  navToggle.setAttribute("aria-expanded", String(isOpen));
  mobileMenu.setAttribute("aria-hidden", String(!isOpen));
}

/**
 * 每隔固定时间检查滚动状态，减少高频事件开销。
 * @param {Function} callback
 * @param {number} limit
 * @returns {Function}
 */
function throttle(callback, limit) {
  let waiting = false;

  return function throttledFunction(...args) {
    if (waiting) {
      return;
    }

    waiting = true;

    window.setTimeout(() => {
      callback.apply(this, args);
      waiting = false;
    }, limit);
  };
}

/**
 * 超过指定距离后为导航添加毛玻璃效果。
 */
function handleNavScroll() {
  if (!nav) {
    return;
  }

  nav.classList.toggle("nav-scrolled", window.scrollY > 80);
}

/**
 * 创建首屏打字机效果，循环展示多条职业描述。
 */
function initTypewriter() {
  if (!typingElement || !typingTextElement) {
    return;
  }

  let words = [];

  try {
    words = JSON.parse(typingElement.dataset.typing || "[]");
  } catch (error) {
    words = [];
  }

  if (!Array.isArray(words) || words.length === 0) {
    return;
  }

  let wordIndex = 0;
  let charIndex = 0;
  let isDeleting = false;

  const tick = () => {
    const currentWord = words[wordIndex];
    const visibleText = currentWord.slice(0, charIndex);

    typingTextElement.textContent = visibleText;
    typingElement.setAttribute("aria-label", currentWord);

    let delay = isDeleting ? 45 : 90;

    if (!isDeleting && charIndex < currentWord.length) {
      charIndex += 1;
    } else if (isDeleting && charIndex > 0) {
      charIndex -= 1;
    } else if (!isDeleting) {
      isDeleting = true;
      delay = 1400;
    } else {
      isDeleting = false;
      wordIndex = (wordIndex + 1) % words.length;
      delay = 220;
    }

    window.setTimeout(tick, delay);
  };

  tick();
}

/**
 * 使用 three.js 创建轻量 3D 粒子环背景，增强首屏层次感。
 */
function initHeroScene() {
  if (!heroCanvas || typeof window.THREE === "undefined") {
    return;
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({
    canvas: heroCanvas,
    alpha: true,
    antialias: true,
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  camera.position.set(0, 0, 10);

  const group = new THREE.Group();
  scene.add(group);

  const particlesCount = window.innerWidth < 768 ? 180 : 320;
  const positions = new Float32Array(particlesCount * 3);
  const scales = new Float32Array(particlesCount);

  for (let index = 0; index < particlesCount; index += 1) {
    const stride = index * 3;
    const angle = Math.random() * Math.PI * 2;
    const radius = 2.2 + Math.random() * 2.4;
    const y = (Math.random() - 0.5) * 3.2;

    positions[stride] = Math.cos(angle) * radius;
    positions[stride + 1] = y;
    positions[stride + 2] = Math.sin(angle) * radius;
    scales[index] = 0.5 + Math.random() * 1.2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));

  const material = new THREE.PointsMaterial({
    color: "#8c9c7a",
    size: window.innerWidth < 768 ? 0.045 : 0.055,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
  });

  const points = new THREE.Points(geometry, material);
  group.add(points);

  const wireGeometry = new THREE.TorusKnotGeometry(1.65, 0.04, 160, 18);
  const wireMaterial = new THREE.MeshBasicMaterial({
    color: "#d9ddd2",
    wireframe: true,
    transparent: true,
    opacity: 0.3,
  });
  const wireMesh = new THREE.Mesh(wireGeometry, wireMaterial);
  group.add(wireMesh);

  const pointer = { x: 0, y: 0 };

  const setSize = () => {
    const heroSection = document.querySelector(".section--hero");
    const width = heroSection ? heroSection.clientWidth : window.innerWidth;
    const height = heroSection ? heroSection.clientHeight : window.innerHeight;

    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  };

  const handlePointerMove = (event) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -((event.clientY / window.innerHeight) * 2 - 1);
  };

  let animationFrameId = 0;

  const render = () => {
    if (!prefersReducedMotion) {
      group.rotation.y += 0.0018;
      group.rotation.x += 0.0006;
      group.rotation.y += pointer.x * 0.0009;
      group.rotation.x += pointer.y * 0.0006;
      wireMesh.rotation.z += 0.0014;
    }

    renderer.render(scene, camera);
    animationFrameId = window.requestAnimationFrame(render);
  };

  setSize();
  render();

  window.addEventListener("resize", setSize);
  window.addEventListener("pointermove", handlePointerMove, { passive: true });

  window.addEventListener("beforeunload", () => {
    window.cancelAnimationFrame(animationFrameId);
    window.removeEventListener("resize", setSize);
    window.removeEventListener("pointermove", handlePointerMove);
    geometry.dispose();
    material.dispose();
    wireGeometry.dispose();
    wireMaterial.dispose();
    renderer.dispose();
  });
}

/**
 * 为项目卡片添加轻量 3D 倾斜效果。
 */
function initProjectTilt() {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion || tiltCards.length === 0) {
    return;
  }

  tiltCards.forEach((card) => {
    const handleMove = (event) => {
      const bounds = card.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width;
      const y = (event.clientY - bounds.top) / bounds.height;
      const rotateY = (x - 0.5) * 10;
      const rotateX = (0.5 - y) * 8;

      card.style.transform = `translateY(-6px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    };

    const resetCard = () => {
      card.style.transform = "";
    };

    card.addEventListener("mousemove", handleMove);
    card.addEventListener("mouseleave", resetCard);
    card.addEventListener("blur", resetCard, true);
  });
}

navLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    const targetId = link.getAttribute("href");

    if (!targetId || !targetId.startsWith("#")) {
      return;
    }

    event.preventDefault();
    scrollToSection(targetId);
  });
});

mobileLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    const targetId = link.getAttribute("href");

    if (!targetId || !targetId.startsWith("#")) {
      return;
    }

    event.preventDefault();
    scrollToSection(targetId);
    setMenuState(false);
  });
});

if (navToggle) {
  navToggle.addEventListener("click", () => {
    const isOpen = !mobileMenu.classList.contains("is-open");
    setMenuState(isOpen);
  });
}

if (mobileMenuClose) {
  mobileMenuClose.addEventListener("click", () => {
    setMenuState(false);
  });
}

if (mobileMenu) {
  mobileMenu.addEventListener("click", (event) => {
    if (event.target === mobileMenu) {
      setMenuState(false);
    }
  });
}

if (mobileMenuPanel) {
  mobileMenuPanel.addEventListener("click", (event) => {
    event.stopPropagation();
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setMenuState(false);
  }
});

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("section-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );

  animatedSections.forEach((section) => observer.observe(section));
} else {
  animatedSections.forEach((section) => section.classList.add("section-visible"));
}

initTypewriter();
initHeroScene();
initProjectTilt();
window.addEventListener("scroll", throttle(handleNavScroll, 100), { passive: true });
window.addEventListener("load", handleNavScroll);

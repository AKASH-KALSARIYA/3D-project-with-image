import { SmartWatch } from './watch.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  // Initialize the 3D Rolex watch
  const watch = new SmartWatch(container);

  // 1. Configure customizer color options
  const colorOptions = document.querySelectorAll('.color-option');
  colorOptions.forEach(opt => {
    opt.addEventListener('click', (e) => {
      colorOptions.forEach(sibling => sibling.classList.remove('active'));
      opt.classList.add('active');
      const hex = opt.getAttribute('data-color');
      watch.updateDialColor(hex);
    });
  });

  // 2. Configure customizer metal finishes
  const materialBtns = document.querySelectorAll('.material-btn');
  materialBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      materialBtns.forEach(sibling => sibling.classList.remove('active'));
      btn.classList.add('active');
      const matType = btn.getAttribute('data-material');
      watch.updateCaseMaterial(matType);
    });
  });

  // 3. Arrow selection cycler utility
  function cycleSelection(buttonsSelector, direction) {
    const buttons = Array.from(document.querySelectorAll(buttonsSelector));
    const activeIndex = buttons.findIndex(btn => btn.classList.contains('active'));
    if (activeIndex === -1) return;

    let nextIndex = activeIndex + direction;
    if (nextIndex < 0) nextIndex = buttons.length - 1;
    if (nextIndex >= buttons.length) nextIndex = 0;

    buttons[nextIndex].click(); // Trigger click on target button
  }

  // Bind Left/Right arrows inside customizer
  document.getElementById('metal-prev').addEventListener('click', () => cycleSelection('.material-btn', -1));
  document.getElementById('metal-next').addEventListener('click', () => cycleSelection('.material-btn', 1));
  document.getElementById('color-prev').addEventListener('click', () => cycleSelection('.color-option', -1));
  document.getElementById('color-next').addEventListener('click', () => cycleSelection('.color-option', 1));


  // 4. GSAP MatchMedia for responsive 3D scroll animations (face of watch always visible)
  const mm = gsap.matchMedia();

  // Desktop Scroll Layout
  mm.add("(min-width: 1025px)", () => {
    watch.watchGroup.position.set(0, 0, 0);

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: 'main',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1
      }
    });

    // Phase 1: Hero (Center) -> Oyster Case (Right Side)
    tl.to(watch.watchGroup.position, {
      x: 0.9,
      y: 0,
      z: 0,
      duration: 1
    })
    .to(watch.watchGroup.rotation, {
      x: 0.15,
      y: 0.2, // Subtle tilt to right, face stays fully visible
      z: 0,
      duration: 1
    }, '<')
    .to(watch.camera.position, {
      x: 0,
      y: 1.5,
      z: 3.8, // Zoom in
      duration: 1
    }, '<');

    // Phase 2: Oyster Case (Right) -> Tachymeter Bezel (Right Side, zoomed in)
    tl.to(watch.watchGroup.position, {
      x: 0.9,
      y: -0.2,
      z: 0,
      duration: 1
    })
    .to(watch.watchGroup.rotation, {
      x: 0.35, // Tilt bezel up to face camera
      y: 0,
      z: 0,
      duration: 1
    }, '<')
    .to(watch.camera.position, {
      x: 0,
      y: 1.0,
      z: 3.2, // Zoom in closer
      duration: 1
    }, '<');

    // Phase 3: Tachymeter Bezel -> Chronograph Dial (Left Side, zoomed on face)
    tl.to(watch.watchGroup.position, {
      x: -0.9,
      y: 0,
      z: 0,
      duration: 1
    })
    .to(watch.watchGroup.rotation, {
      x: 0.1,
      y: 0,
      z: 0,
      duration: 1
    }, '<')
    .to(watch.camera.position, {
      x: 0,
      y: 1.2,
      z: 2.8, // Zoom in dial details
      duration: 1
    }, '<');

    // Phase 4: Chronograph Dial -> Calibre Movement (Left Side, Exploded)
    tl.to(watch.watchGroup.position, {
      x: -0.9,
      y: 0,
      z: 0,
      duration: 1
    })
    .to(watch.watchGroup.rotation, {
      x: 0.25,
      y: -0.2, // Subtle tilt to left, face stays fully visible
      z: 0.1,
      duration: 1
    }, '<')
    .to(watch.camera.position, {
      x: 2.2,
      y: 1.2,
      z: 4.8, // Frame exploded movement
      duration: 1
    }, '<')
    .to(watch, {
      explodeProgress: 1, // Disassemble watch along Z
      duration: 1
    }, '<');

    // Phase 5: Calibre Movement -> Specifications Sheet (Right Side, Reassembled)
    tl.to(watch.watchGroup.position, {
      x: 0.9,
      y: 0,
      z: 0,
      duration: 1
    })
    .to(watch.watchGroup.rotation, {
      x: 0.1,
      y: 0.3, // Tilt to show specs angle
      z: 0,
      duration: 1
    }, '<')
    .to(watch.camera.position, {
      x: 0,
      y: 1.4,
      z: 4.0,
      duration: 1
    }, '<')
    .to(watch, {
      explodeProgress: 0, // Reassemble watch
      duration: 1
    }, '<');

    // Phase 6: Specifications Sheet -> Customizer Showcase (Right Side)
    tl.to(watch.watchGroup.position, {
      x: 0.9,
      y: 0,
      z: 0,
      duration: 1
    })
    .to(watch.watchGroup.rotation, {
      x: 0.2,
      y: 0, // Perfectly flat face-forward display
      z: 0,
      duration: 1
    }, '<')
    .to(watch.camera.position, {
      x: 0,
      y: 1.5,
      z: 4.5,
      duration: 1
    }, '<');
  });

  // Mobile Scroll Layout
  mm.add("(max-width: 1024px)", () => {
    watch.watchGroup.position.set(0, 0.3, 0);

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: 'main',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1
      }
    });

    // Phase 1: Hero -> Oyster Case
    tl.to(watch.watchGroup.position, {
      y: 0.4,
      duration: 1
    })
    .to(watch.watchGroup.rotation, {
      x: 0.15,
      y: 0.2,
      duration: 1
    }, '<');

    // Phase 2: Oyster Case -> Tachymeter Bezel
    tl.to(watch.watchGroup.position, {
      y: 0.3,
      duration: 1
    })
    .to(watch.watchGroup.rotation, {
      x: 0.35,
      y: 0,
      duration: 1
    }, '<');

    // Phase 3: Tachymeter Bezel -> Chronograph Dial
    tl.to(watch.watchGroup.position, {
      y: 0.4,
      duration: 1
    })
    .to(watch.watchGroup.rotation, {
      x: 0.1,
      y: 0,
      duration: 1
    }, '<');

    // Phase 4: Chronograph Dial -> Calibre Movement (Exploded)
    tl.to(watch.watchGroup.position, {
      y: 0.5,
      duration: 1
    })
    .to(watch.watchGroup.rotation, {
      x: 0.25,
      y: -0.2,
      z: 0.1,
      duration: 1
    }, '<')
    .to(watch.camera.position, {
      x: 1.5,
      y: 0.8,
      z: 4.8,
      duration: 1
    }, '<')
    .to(watch, {
      explodeProgress: 1,
      duration: 1
    }, '<');

    // Phase 5: Calibre -> Specifications Sheet (Reassembled)
    tl.to(watch.watchGroup.position, {
      y: 0.4,
      duration: 1
    })
    .to(watch.watchGroup.rotation, {
      x: 0.1,
      y: 0.3,
      z: 0,
      duration: 1
    }, '<')
    .to(watch, {
      explodeProgress: 0,
      duration: 1
    }, '<');

    // Phase 6: Specifications Sheet -> Customizer Showcase
    tl.to(watch.watchGroup.position, {
      y: 0.3,
      duration: 1
    })
    .to(watch.watchGroup.rotation, {
      x: 0.2,
      y: 0,
      z: 0,
      duration: 1
    }, '<')
    .to(watch.camera.position, {
      x: 0,
      y: 1.5,
      z: 4.5,
      duration: 1
    }, '<');
  });


  // 5. Scroll-linked Navbar Highlighting & Slide Index Tracking
  const sectionIds = ['#hero', '#case', '#tachymeter', '#chronograph', '#calibre', '#specs', '#customizer'];
  let activeSectionIndex = 0;

  sectionIds.forEach((id, index) => {
    ScrollTrigger.create({
      trigger: id,
      start: "top center",
      end: "bottom center",
      onEnter: () => {
        activeSectionIndex = index;
        highlightNavLink(id);
      },
      onEnterBack: () => {
        activeSectionIndex = index;
        highlightNavLink(id);
      }
    });
  });

  function highlightNavLink(id) {
    document.querySelectorAll('nav a').forEach(a => {
      a.classList.remove('active');
      if (a.getAttribute('href') === id) {
        a.classList.add('active');
      }
    });
  }

  // 6. Up/Down floating navigation arrows events
  document.getElementById('nav-up').addEventListener('click', () => {
    if (activeSectionIndex > 0) {
      const targetSec = document.querySelector(sectionIds[activeSectionIndex - 1]);
      if (targetSec) targetSec.scrollIntoView({ behavior: 'smooth' });
    }
  });

  document.getElementById('nav-down').addEventListener('click', () => {
    if (activeSectionIndex < sectionIds.length - 1) {
      const targetSec = document.querySelector(sectionIds[activeSectionIndex + 1]);
      if (targetSec) targetSec.scrollIntoView({ behavior: 'smooth' });
    }
  });

  // 7. Smooth scroll anchors setup
  document.querySelectorAll('nav a').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href.startsWith('#')) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });
});

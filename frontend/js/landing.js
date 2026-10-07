/* ═══════════════════════════════════════════════════════════
   SmartCityAI Landing — Premium Animations & Interactions
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var API = window.SMARTCITY_API_BASE ||
    (window.location.protocol === 'http:' && window.location.port !== '5500'
      ? window.location.origin : 'http://localhost:8765');

  /* ── Loader ── */
  function hideLoader() {
    var loader = document.getElementById('lpLoader');
    if (loader) setTimeout(function () { loader.classList.add('hidden'); }, 300);
  }

  /* ── Particle canvas ── */
  function initParticles() {
    var canvas = document.getElementById('lpParticles');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var particles = [];
    var count = 60;
    var w, h;

    function resize() {
      w = canvas.width = canvas.parentElement.offsetWidth;
      h = canvas.height = canvas.parentElement.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    for (var i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.5 + 0.5,
        dx: (Math.random() - 0.5) * 0.3,
        dy: (Math.random() - 0.5) * 0.3,
        o: Math.random() * 0.4 + 0.1
      });
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0 || p.x > w) p.dx *= -1;
        if (p.y < 0 || p.y > h) p.dy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(96,165,250,' + p.o + ')';
        ctx.fill();
      }
      // Draw lines between close particles
      for (var i = 0; i < particles.length; i++) {
        for (var j = i + 1; j < particles.length; j++) {
          var dx = particles[i].x - particles[j].x;
          var dy = particles[i].y - particles[j].y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = 'rgba(96,165,250,' + (0.08 * (1 - dist / 120)) + ')';
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(draw);
    }
    // Respect reduced motion
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      draw();
    } else {
      // Static particles only
      for (var i = 0; i < particles.length; i++) {
        ctx.beginPath();
        ctx.arc(particles[i].x, particles[i].y, particles[i].r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(96,165,250,' + particles[i].o + ')';
        ctx.fill();
      }
    }
  }

  /* ── Scroll reveal ── */
  function initScrollReveal() {
    var els = document.querySelectorAll('[data-reveal]');
    if (!els.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('revealed');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ── Navbar scroll ── */
  function initNavbar() {
    var nav = document.getElementById('lpNav');
    if (!nav) return;
    window.addEventListener('scroll', function () {
      nav.classList.toggle('scrolled', window.pageYOffset > 60);
    }, { passive: true });
  }

  /* ── Mobile menu ── */
  function initMobileMenu() {
    var hamburger = document.getElementById('lpHamburger');
    var menu = document.getElementById('lpMobile');
    var closeBtn = document.getElementById('lpMobileClose');
    if (!hamburger || !menu) return;

    function openMenu() {
      menu.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function closeMenu() {
      menu.classList.remove('open');
      document.body.style.overflow = '';
    }
    hamburger.addEventListener('click', openMenu);
    if (closeBtn) closeBtn.addEventListener('click', closeMenu);
    menu.addEventListener('click', function (e) { if (e.target === menu) closeMenu(); });
    menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', closeMenu); });
  }

  /* ── Animated counters ── */
  function animateCounter(el, target, suffix) {
    var duration = 2000;
    var startTime = null;
    function tick(now) {
      if (!startTime) startTime = now;
      var progress = Math.min((now - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 4);
      el.textContent = Math.round(target * eased) + (suffix || '');
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = target + (suffix || '');
    }
    requestAnimationFrame(tick);
  }

  function initCounters() {
    var counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          var el = e.target;
          animateCounter(el, parseInt(el.getAttribute('data-count'), 10), el.getAttribute('data-suffix') || '');
          io.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { io.observe(el); });
  }

  /* ── Dashboard preview bars ── */
  function initDashBars() {
    var container = document.getElementById('dashBars');
    if (!container) return;
    var heights = [40, 55, 48, 70, 62, 78, 68, 85, 75, 88, 80, 92];
    var colors = [
      'linear-gradient(180deg, rgba(99,102,241,.7), rgba(99,102,241,.2))',
      'linear-gradient(180deg, rgba(124,58,237,.7), rgba(124,58,237,.2))'
    ];
    for (var i = 0; i < heights.length; i++) {
      var bar = document.createElement('div');
      bar.className = 'lp-dash-bar';
      bar.style.height = '0%';
      bar.style.background = colors[i % 2];
      container.appendChild(bar);
    }
    setTimeout(function () {
      var bars = container.querySelectorAll('.lp-dash-bar');
      bars.forEach(function (bar, i) {
        bar.style.height = (heights[i] || 50) + '%';
      });
    }, 800);
  }

  /* ── Cursor glow ── */
  function initCursorGlow() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(pointer: coarse)').matches) return; // skip touch
    var glow = document.getElementById('lpCursorGlow');
    if (!glow) return;
    var mx = 0, my = 0, cx = 0, cy = 0;
    document.addEventListener('mousemove', function (e) {
      mx = e.clientX;
      my = e.clientY;
    }, { passive: true });
    function update() {
      cx += (mx - cx) * 0.08;
      cy += (my - cy) * 0.08;
      glow.style.left = cx + 'px';
      glow.style.top = cy + 'px';
      requestAnimationFrame(update);
    }
    update();
  }

  /* ── Auth-aware UI ── */
  function checkAuth() {
    fetch(API + '/api/auth/me', { credentials: 'include', signal: AbortSignal.timeout(5000) })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.authenticated) {
          var nav = document.getElementById('lpNav');
          if (nav) nav.classList.add('is-auth');
          document.querySelectorAll('.lp-auth-only').forEach(function (el) { el.style.display = ''; });
          document.querySelectorAll('.lp-guest-only').forEach(function (el) { el.style.display = 'none'; });
        }
      })
      .catch(function () { /* backend offline — keep guest UI */ });
  }

  /* ── Smooth anchor scroll ── */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (id === '#') return;
        var target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  /* ── Init all ── */
  document.addEventListener('DOMContentLoaded', function () {
    hideLoader();
    initParticles();
    initScrollReveal();
    initNavbar();
    initMobileMenu();
    initCounters();
    initDashBars();
    initCursorGlow();
    initSmoothScroll();
    checkAuth();
  });
})();

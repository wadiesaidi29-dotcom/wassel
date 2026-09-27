/* ============================================================
   WASSEL — Interactions & Animations
   Vanilla JS, zero dependencies.
   ============================================================ */
(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  /* ============ 1. PRELOADER ============ */
  const preloader = $("#preloader");
  if (preloader) {
    const statuses = [
      "Analyse sémantique des CV",
      "Calcul des embeddings",
      "Connexion candidats ↔ entreprises",
      "Prêt.",
    ];
    const statusEl = $("#preloaderStatus");
    let si = 0;
    const statusTimer = setInterval(() => {
      si = (si + 1) % statuses.length;
      if (statusEl) statusEl.textContent = statuses[si];
    }, 700);

    const hide = () => {
      clearInterval(statusTimer);
      preloader.classList.add("is-done");
      document.body.classList.add("is-loaded");
    };
    window.addEventListener("load", () => setTimeout(hide, 1400));
    setTimeout(hide, 3500); // safety
  }

  /* ============ 2. NEURAL NETWORK CANVAS ============ */
  const canvas = $("#neuralCanvas");
  if (canvas && !reducedMotion) {
    const ctx2d = canvas.getContext("2d");
    let W, H, nodes = [];
    const mouse = { x: -9999, y: -9999 };
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W * DPR; canvas.height = H * DPR;
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      ctx2d.setTransform(DPR, 0, 0, DPR, 0, 0);
      const count = Math.min(90, Math.floor((W * H) / 16000));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.6 + 0.6,
      }));
    };
    resize();
    window.addEventListener("resize", resize);

    window.addEventListener("mousemove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
    window.addEventListener("mouseout", () => { mouse.x = -9999; mouse.y = -9999; });

    const LINK = 130;
    const tick = () => {
      ctx2d.clearRect(0, 0, W, H);

      for (const n of nodes) {
        // gentle attraction toward mouse
        const dx = mouse.x - n.x, dy = mouse.y - n.y;
        const d = Math.hypot(dx, dy);
        if (d < 180 && d > 0.001) {
          n.vx += (dx / d) * 0.012;
          n.vy += (dy / d) * 0.012;
        }
        n.vx *= 0.985; n.vy *= 0.985;
        n.x += n.vx; n.y += n.vy;
        if (n.x < -20) n.x = W + 20; if (n.x > W + 20) n.x = -20;
        if (n.y < -20) n.y = H + 20; if (n.y > H + 20) n.y = -20;
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < LINK) {
            const alpha = (1 - d / LINK) * 0.16;
            ctx2d.strokeStyle = `rgba(139, 120, 255, ${alpha})`;
            ctx2d.lineWidth = 1;
            ctx2d.beginPath();
            ctx2d.moveTo(a.x, a.y);
            ctx2d.lineTo(b.x, b.y);
            ctx2d.stroke();
          }
        }
      }

      for (const n of nodes) {
        ctx2d.fillStyle = "rgba(140, 160, 255, 0.5)";
        ctx2d.beginPath();
        ctx2d.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx2d.fill();
      }

      if (!document.hidden) requestAnimationFrame(tick);
      else setTimeout(() => requestAnimationFrame(tick), 400);
    };
    tick();
  }

  /* ============ 3. CUSTOM CURSOR ============ */
  const dot = $("#cursorDot");
  if (dot && window.matchMedia("(hover: hover)").matches && !reducedMotion) {
    let tx = -50, ty = -50, cx = -50, cy = -50;
    window.addEventListener("mousemove", (e) => { tx = e.clientX; ty = e.clientY; });
    const follow = () => {
      cx += (tx - cx) * 0.22;
      cy += (ty - cy) * 0.22;
      dot.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      requestAnimationFrame(follow);
    };
    follow();
    const hoverSel = "a, button, input, [data-magnetic], input[type='range']";
    document.addEventListener("mouseover", (e) => {
      if (e.target.closest(hoverSel)) dot.classList.add("is-hover");
    });
    document.addEventListener("mouseout", (e) => {
      if (e.target.closest(hoverSel)) dot.classList.remove("is-hover");
    });
  } else if (dot) {
    dot.style.display = "none";
  }

  /* ============ 4. MAGNETIC BUTTONS + CARD GLOW ============ */
  if (!reducedMotion) {
    $$("[data-magnetic]").forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const mx = e.clientX - r.left - r.width / 2;
        const my = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${mx * 0.18}px, ${my * 0.28}px)`;
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
      el.addEventListener("mouseleave", () => { el.style.transform = ""; });
    });

    $$(".tilt").forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        el.style.transform = `perspective(900px) rotateY(${(px - 0.5) * 7}deg) rotateX(${(0.5 - py) * 7}deg) translateY(-4px)`;
        el.style.setProperty("--mx", `${px * 100}%`);
        el.style.setProperty("--my", `${py * 100}%`);
      });
      el.addEventListener("mouseleave", () => { el.style.transform = ""; });
    });
  }

  /* ============ 5. NAVBAR ============ */
  const navbar = $("#navbar");
  if (navbar) {
    const onScroll = () => navbar.classList.toggle("is-scrolled", window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }
  const burger = $("#burger");
  const navLinks = $("#navLinks");
  if (burger && navLinks) {
    burger.addEventListener("click", () => {
      burger.classList.toggle("is-open");
      navLinks.classList.toggle("is-open");
    });
    $$("a", navLinks).forEach((a) =>
      a.addEventListener("click", () => {
        burger.classList.remove("is-open");
        navLinks.classList.remove("is-open");
      })
    );
  }

  /* ============ 6. SCROLL REVEAL ============ */
  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (en.isIntersecting) {
          en.target.classList.add("is-visible");
          io.unobserve(en.target);
        }
      }
    },
    { threshold: 0.14, rootMargin: "0px 0px -40px 0px" }
  );
  $$(".reveal").forEach((el) => {
    const d = el.getAttribute("data-delay");
    if (d) el.style.setProperty("--d", d);
    io.observe(el);
  });

  /* ============ 7. HERO WORD STAGGER ============ */
  $$(".hero-word").forEach((w, i) => w.style.setProperty("--wi", i));

  /* ============ 8. COUNTERS ============ */
  const fmt = (n) => n.toLocaleString("fr-FR");
  const counterIO = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        counterIO.unobserve(en.target);
        const target = parseInt(en.target.dataset.counter, 10) || 0;
        const t0 = performance.now();
        const dur = 1500;
        const step = (t) => {
          const p = Math.min((t - t0) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          en.target.textContent = fmt(Math.round(target * eased));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    },
    { threshold: 0.6 }
  );
  $$("[data-counter]").forEach((el) => counterIO.observe(el));

  /* ============ 9. MATCH SCENE LOOP ============ */
  const scene = $("#matchScene");
  if (scene) {
    const beam = $("#beamPath");
    const scoreValue = $("#scoreValue");
    const scoreRing = $("#scoreRing");
    const scoreBox = $("#matchScore");
    const cardC = $("#cardCandidate");
    const cardE = $("#cardCompany");
    const CIRC = 327;

    const runMatch = () => {
      // reset
      cardC.classList.remove("is-matched");
      cardE.classList.remove("is-matched");
      scoreBox.classList.remove("is-visible");
      scoreRing.style.strokeDashoffset = CIRC;
      beam.classList.add("is-active");

      // searching phase
      setTimeout(() => {
        beam.classList.remove("is-active");
        const score = 70 + Math.floor(Math.random() * 28); // 70–97
        scoreBox.classList.add("is-visible");

        const t0 = performance.now();
        const dur = 1400;
        const step = (t) => {
          const p = Math.min((t - t0) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          const val = Math.round(score * eased);
          scoreValue.textContent = val;
          scoreRing.style.strokeDashoffset = CIRC * (1 - (score / 100) * eased);
          if (p < 1) requestAnimationFrame(step);
          else {
            cardC.classList.add("is-matched");
            cardE.classList.add("is-matched");
            spawnBurst(scoreBox);
          }
        };
        requestAnimationFrame(step);
      }, 1800);
    };

    runMatch();
    setInterval(runMatch, 6500);
  }

  /* ============ 10. NEGOTIATION DEMO ============ */
  const nCompany = $("#negoCompany");
  const nCandidate = $("#negoCandidate");
  if (nCompany && nCandidate) {
    const outC = $("#negoCompanyVal");
    const outP = $("#negoCandidateVal");
    const zone = $("#zoneOverlap");
    const verdict = $("#negoVerdict");
    const medianEl = $("#negoMedian");
    const MIN = 4000, MAX = 20000;

    const fill = (input) => {
      const pct = ((input.value - input.min) / (input.max - input.min)) * 100;
      input.style.setProperty("--fill", pct + "%");
    };

    const update = () => {
      const b = +nCompany.value; // budget max entreprise
      const c = +nCandidate.value; // minimum candidat
      outC.textContent = fmt(b) + " DH";
      outP.textContent = fmt(c) + " DH";
      fill(nCompany); fill(nCandidate);

      if (b >= c) {
        const left = ((c - MIN) / (MAX - MIN)) * 100;
        const width = ((b - c) / (MAX - MIN)) * 100;
        zone.style.left = left + "%";
        zone.style.width = Math.max(width, 2) + "%";
        zone.style.opacity = "1";
        verdict.textContent = "✓ Accord possible";
        verdict.className = "nego-verdict ok";
        medianEl.innerHTML = `Point médian proposé (à titre indicatif) : <strong>${fmt(Math.round((b + c) / 2))} DH</strong>`;
      } else {
        zone.style.opacity = "0";
        verdict.textContent = "✕ Pas de compatibilité salariale";
        verdict.className = "nego-verdict no";
        medianEl.textContent = "L'IA informe les deux parties et clôt la négociation.";
      }
    };
    nCompany.addEventListener("input", update);
    nCandidate.addEventListener("input", update);
    update();
  }

  /* ============ 10b. LOGIN ROLE SWITCH ============ */
  const roleSwitch = $("#loginRoleSwitch");
  let loginRole = "candidat";
  if (roleSwitch) {
    const slider = $("#roleSwitchSlider");
    const label = $("#loginBtnLabel");
    roleSwitch.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-login-role]");
      if (!btn) return;
      loginRole = btn.dataset.loginRole;
      $$([".role-switch-btn"], roleSwitch).forEach((b) =>
        b.classList.toggle("is-active", b === btn)
      );
      if (slider) slider.style.transform = loginRole === "entreprise" ? "translateX(100%)" : "translateX(0)";
      if (label)
        label.innerHTML =
          loginRole === "entreprise"
            ? 'Accéder à mon espace entreprise <span class="btn-arrow">→</span>'
            : 'Accéder à mon espace candidat <span class="btn-arrow">→</span>';
    });
  }

  /* ============ 11. SIGNUP FLOW ============ */
  const authCard = $("#authCard");
  if (authCard) {
    const steps = $$(".auth-step", authCard);
    const bar = $("#authProgressBar");
    let role = new URLSearchParams(location.search).get("role") || null;
    let current = 1;

    const show = (id, progress) => {
      steps.forEach((s) => s.classList.toggle("is-active", s.dataset.step === String(id)));
      if (bar && progress != null) bar.style.width = progress + "%";
      current = id;
      authCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };

    const DASH = { candidat: "candidat.html", entreprise: "entreprise.html" };

    const roleCards = $$(".role-card", authCard);
    const selectRole = (r) => {
      role = r;
      roleCards.forEach((c) => c.classList.toggle("is-selected", c.dataset.role === r));
      const pill = $("#rolePill");
      const echo = $("#roleEcho");
      if (pill) pill.textContent = r === "candidat" ? "Candidat" : "Entreprise";
      if (echo) echo.textContent = r;
    };

    roleCards.forEach((c) =>
      c.addEventListener("click", () => {
        selectRole(c.dataset.role);
        setTimeout(() => { if (current === 1) show(2, 66); }, 420);
      })
    );
    if (role) { selectRole(role); setTimeout(() => show(2, 66), 500); }

    const backBtn = $("#backToRole");
    if (backBtn) backBtn.addEventListener("click", () => show(1, 33));

    const accountForm = $("#accountForm");
    if (accountForm) {
      accountForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = $("#accName").value.trim();
        const email = $("#accEmail").value.trim();
        const pass = $("#accPass").value;
        if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || pass.length < 6) {
          accountForm.classList.add("shake");
          setTimeout(() => accountForm.classList.remove("shake"), 500);
          return;
        }
        sessionStorage.setItem("wassel-name", name);
        if (role === "entreprise") show("3-entreprise", 100);
        else finish(name);
      });
    }

    // password strength
    const passInput = $("#accPass");
    if (passInput) {
      passInput.addEventListener("input", () => {
        const v = passInput.value;
        let s = 0;
        if (v.length >= 6) s++;
        if (/[0-9]/.test(v) && /[a-zA-Z]/.test(v)) s++;
        if (v.length >= 10 || /[^a-zA-Z0-9]/.test(v)) s++;
        const barEl = $("#passStrengthBar");
        if (barEl) {
          barEl.style.width = ["0%", "33%", "66%", "100%"][s];
          barEl.style.background = ["", "#fb7185", "#fbbf24", "#34d399"][s];
        }
      });
    }

    const finishEntrepriseBtn = $("#finishEntreprise");
    if (finishEntrepriseBtn) {
      finishEntrepriseBtn.addEventListener("click", () => {
        finish($("#accName")?.value?.trim() || "vous");
      });
    }

    function finish(name) {
      const successName = $("#successName");
      const successText = $("#successText");
      if (successName) successName.textContent = name.split(" ")[0] || "vous";
      if (successText) {
        successText.textContent =
          role === "entreprise"
            ? "Votre espace entreprise et votre essai de 10 jours sont activés. Redirection…"
            : "Votre espace candidat est prêt — 100 % gratuit. Redirection…";
      }
      show(4, 100);
      setTimeout(() => {
        location.href = (role && DASH[role]) || "candidat.html";
      }, 2600);
    }
  }

  /* ============ 12. LOGIN ============ */
  const loginForm = $("#loginForm");
  if (loginForm) {
    const errEl = $("#loginError");
    const btn = $("#loginBtn");

    const attempt = (email) => {
      errEl.textContent = "";
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        errEl.textContent = "Veuillez saisir une adresse e-mail valide.";
        loginForm.classList.add("shake");
        setTimeout(() => loginForm.classList.remove("shake"), 500);
        return;
      }
      btn.classList.add("is-loading");
      setTimeout(() => {
        location.href = loginRole === "entreprise" ? "entreprise.html" : "candidat.html";
      }, 1600);
    };

    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      attempt($("#loginEmail").value.trim());
    });

    $$("[data-demo]").forEach((b) =>
      b.addEventListener("click", () => {
        $("#loginEmail").value = b.dataset.demo === "candidat" ? "demo.candidat@wassel.ma" : "demo.entreprise@wassel.ma";
        $("#loginPass").value = "demo1234";
        attempt($("#loginEmail").value);
      })
    );
  }

  /* ============ 13. SMOOTH ANCHOR OFFSET (nav height) ============ */
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      const target = $(id);
      if (!target) return;
      e.preventDefault();
      const y = target.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: reducedMotion ? "auto" : "smooth" });
    });
  });

  /* ============================================================
     14. HIGH-ANIMATION LAYER
     ============================================================ */

  /* ---- 14a. Scroll progress bar (all pages, motion-safe) ---- */
  let progressFill = null;
  const progress = document.createElement("div");
  progress.className = "scroll-progress";
  progress.innerHTML = "<span></span>";
  document.body.appendChild(progress);
  progressFill = progress.firstElementChild;
  const updateProgress = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    progressFill.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
  };
  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);
  updateProgress();

  /* ---- 14b. Scrollspy: active nav link ---- */
  {
    const spyTargets = ["tech", "process", "negotiation", "pricing"]
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    const navAs = $$(".nav-links a");
    if (spyTargets.length && navAs.length) {
      const spy = new IntersectionObserver(
        (entries) => {
          for (const en of entries) {
            if (!en.isIntersecting) continue;
            navAs.forEach((a) =>
              a.classList.toggle("is-active", a.getAttribute("href") === "#" + en.target.id)
            );
          }
        },
        { rootMargin: "-40% 0px -55% 0px" }
      );
      spyTargets.forEach((s) => spy.observe(s));
    }
  }

  if (!reducedMotion) {
    /* ---- 14c. Cursor follower ring ---- */
    if (window.matchMedia("(hover: hover)").matches) {
      const ring = document.createElement("div");
      ring.className = "cursor-ring";
      document.body.appendChild(ring);
      const hoverSel = "a, button, input, [data-magnetic], input[type='range']";
      let rtx = -60, rty = -60, rcx = -60, rcy = -60;
      window.addEventListener("mousemove", (e) => { rtx = e.clientX; rty = e.clientY; });
      document.addEventListener("mouseover", (e) => { if (e.target.closest(hoverSel)) ring.classList.add("is-hover"); });
      document.addEventListener("mouseout", (e) => { if (e.target.closest(hoverSel)) ring.classList.remove("is-hover"); });
      document.addEventListener("mousedown", () => ring.classList.add("is-down"));
      document.addEventListener("mouseup", () => ring.classList.remove("is-down"));
      (function ringFollow() {
        rcx += (rtx - rcx) * 0.15;
        rcy += (rty - rcy) * 0.15;
        ring.style.transform = `translate(${rcx}px, ${rcy}px) translate(-50%, -50%)`;
        requestAnimationFrame(ringFollow);
      })();
    }

    /* ---- 14d. Button ripple ---- */
    $$(".btn").forEach((btn) =>
      btn.addEventListener("pointerdown", (e) => {
        const r = btn.getBoundingClientRect();
        const s = document.createElement("span");
        s.className = "ripple";
        s.style.left = (e.clientX - r.left) + "px";
        s.style.top = (e.clientY - r.top) + "px";
        btn.appendChild(s);
        setTimeout(() => s.remove(), 700);
      })
    );

    /* ---- 14e. Split section titles into animated words ---- */
    const titleIO = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting) {
            en.target.classList.add("is-visible");
            titleIO.unobserve(en.target);
          }
        }
      },
      { threshold: 0.4 }
    );
    $$(".section-title").forEach((el) => {
      if (el.classList.contains("split-title")) return;
      el.classList.add("split-title");
      let wi = 0;
      const walk = (node) => {
        [...node.childNodes].forEach((child) => {
          if (child.nodeType === 3) {
            const frag = document.createDocumentFragment();
            child.textContent.split(/(\s+)/).forEach((part) => {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
              const w = document.createElement("span");
              w.className = "st-word";
              const inner = document.createElement("span");
              inner.textContent = part;
              inner.style.setProperty("--wi", wi++);
              w.appendChild(inner);
              frag.appendChild(w);
            });
            child.replaceWith(frag);
          } else if (child.nodeType === 1 && child.tagName !== "BR") {
            walk(child);
          }
        });
      };
      walk(el);
      titleIO.observe(el);
    });

    /* ---- 14f. Parallax + hero scroll-exit + marquee skew (single rAF loop) ---- */
    const parallaxEls = $$("[data-parallax]").map((el) => ({
      el,
      speed: parseFloat(el.dataset.parallax) || 0.1,
      cur: 0,
    }));
    const heroContainer = $(".hero-container");
    const marqueeBand = $(".marquee-band");
    let lastY = window.scrollY, marqueeSkew = 0;

    (function scrollFX() {
      const vh = window.innerHeight;
      const y = window.scrollY;

      for (const p of parallaxEls) {
        const r = p.el.getBoundingClientRect();
        if (r.bottom < -120 || r.top > vh + 120) continue;
        // subtract the translation we already applied to avoid feedback loops
        const rawCenter = r.top + r.height / 2 - vh / 2 - p.cur;
        const target = -rawCenter * p.speed;
        p.cur += (target - p.cur) * 0.12;
        p.el.style.transform = `translate3d(0, ${p.cur.toFixed(2)}px, 0)`;
      }

      if (heroContainer && y < vh) {
        const prog = Math.min(y / (vh * 0.85), 1);
        heroContainer.style.transform = `translate3d(0, ${(prog * 90).toFixed(1)}px, 0)`;
        heroContainer.style.opacity = String(1 - prog * 0.85);
      }

      if (marqueeBand) {
        const vel = y - lastY; lastY = y;
        marqueeSkew += (Math.max(-10, Math.min(10, vel * 0.3)) - marqueeSkew) * 0.08;
        marqueeBand.style.transform = `skewX(${marqueeSkew.toFixed(2)}deg)`;
      }

      requestAnimationFrame(scrollFX);
    })();

    /* ---- 14g. Process timeline: line draws + dots light up ---- */
    const steps = $(".steps");
    if (steps) {
      const line = document.createElement("div");
      line.className = "steps-line";
      line.innerHTML = "<span></span>";
      steps.appendChild(line);
      const fill = line.firstElementChild;
      const stepEls = $$(".step", steps);
      const updateTimeline = () => {
        const r = steps.getBoundingClientRect();
        const vh = window.innerHeight;
        const total = r.height + vh * 0.3;
        const p = Math.min(Math.max((vh * 0.82 - r.top) / total, 0), 1);
        fill.style.transform = `scaleX(${p})`;
        const edge = r.left + r.width * p;
        stepEls.forEach((s) => {
          const sr = s.getBoundingClientRect();
          s.classList.toggle("is-lit", edge >= sr.left + sr.width / 2);
        });
      };
      window.addEventListener("scroll", updateTimeline, { passive: true });
      window.addEventListener("resize", updateTimeline);
      updateTimeline();
    }
  }

  /* ---- 14h. Match burst (used by the match scene loop above) ---- */
  function spawnBurst(container) {
    if (reducedMotion || !container) return;
    const colors = ["#22d3ee", "#a78bfa", "#6d5efc", "#34d399", "#fbbf24"];
    for (let i = 0; i < 16; i++) {
      const p = document.createElement("span");
      p.className = "burst-particle";
      const ang = (Math.PI * 2 * i) / 16 + Math.random() * 0.5;
      const dist = 60 + Math.random() * 70;
      p.style.setProperty("--tx", (Math.cos(ang) * dist).toFixed(1) + "px");
      p.style.setProperty("--ty", (Math.sin(ang) * dist - 30).toFixed(1) + "px");
      p.style.background = colors[i % colors.length];
      p.style.boxShadow = `0 0 10px ${colors[i % colors.length]}`;
      container.appendChild(p);
      setTimeout(() => p.remove(), 950);
    }
    const ring = document.createElement("span");
    ring.className = "burst-ring";
    container.appendChild(ring);
    setTimeout(() => ring.remove(), 850);
  }

  /* ============================================================
     DASHBOARDS (candidat.html / entreprise.html)
     ============================================================ */
  const appBody = document.querySelector(".app-body");
  if (!appBody) return;

  /* --- personalization from signup --- */
  const savedName = sessionStorage.getItem("wassel-name");
  if (savedName) {
    const uname = $("#userName");
    const hello = $("#helloName");
    const avatar = $("#userAvatar");
    const initials = savedName.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    if (uname) uname.textContent = savedName;
    if (hello) hello.textContent = savedName.split(" ")[0];
    if (avatar) avatar.textContent = initials;
  }

  /* --- toast helper --- */
  const toast = $("#toast");
  let toastTimer;
  const showToast = (msg, icon = "✓") => {
    if (!toast) return;
    $("#toastMsg").textContent = msg;
    toast.querySelector(".toast-icon").textContent = icon;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3400);
  };

  /* --- tabs --- */
  const tabs = $$("#dashTabs .app-tab");
  const panes = $$(".dash-tab");
  const activate = (id) => {
    tabs.forEach((t) => t.classList.toggle("is-active", t.dataset.tab === id));
    panes.forEach((p) => {
      const on = p.dataset.tab === id;
      p.classList.toggle("is-active", on);
      if (on) $$('.reveal', p).forEach((r) => r.classList.add('is-visible'));
    });
  };
  tabs.forEach((t) =>
    t.addEventListener("click", (e) => {
      e.preventDefault();
      activate(t.dataset.tab);
    })
  );
  $$('[data-goto]').forEach((el) =>
    el.addEventListener('click', (e) => { e.preventDefault(); activate(el.dataset.goto); })
  );

  /* --- profile strength ring (candidat) --- */
  const strengthRing = $("#strengthRing");
  if (strengthRing) {
    const target = 82;
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min((t - t0) / 1600, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      $("#strengthValue").textContent = Math.round(target * eased);
      strengthRing.style.strokeDashoffset = 327 * (1 - (target / 100) * eased);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* --- CV drop zone (candidat) --- */
  const cvZone = $("#cvZone");
  if (cvZone) {
    const input = $("#cvInput");
    const icon = $("#cvZoneIcon");
    cvZone.addEventListener("click", () => input.click());
    cvZone.addEventListener("dragover", (e) => { e.preventDefault(); cvZone.classList.add("is-drag"); });
    cvZone.addEventListener("dragleave", () => cvZone.classList.remove("is-drag"));
    cvZone.addEventListener("drop", (e) => {
      e.preventDefault();
      cvZone.classList.remove("is-drag");
      const f = e.dataTransfer.files[0];
      if (f) cvUploaded(f.name);
    });
    input.addEventListener("change", () => { if (input.files[0]) cvUploaded(input.files[0].name); });
    function cvUploaded(name) {
      icon.textContent = "⏳";
      cvZone.classList.add("is-uploading");
      showToast("Analyse du CV par l'IA…", "⏳");
      setTimeout(() => {
        icon.textContent = "✅";
        cvZone.classList.add("is-done");
        cvZone.querySelector("b").textContent = name;
        cvZone.querySelector("span").textContent = "Analyse terminée — 3 nouveaux matches détectés !";
        showToast("CV analysé — nouveaux matches détectés 🎯", "✅");
      }, 2200);
    }
  }

  /* --- favorites + apply (candidat) --- */
  let currentFilter = "all";
  $$(".fav-btn").forEach((b) =>
    b.addEventListener("click", () => {
      b.classList.toggle("is-fav");
      b.textContent = b.classList.contains("is-fav") ? "❤" : "🤍";
      const row = b.closest(".match-row");
      row.dataset.fav = b.classList.contains("is-fav");
      if (currentFilter === "fav") applyMatchFilter(currentFilter);
    })
  );
  $$('[data-apply]').forEach((b) =>
    b.addEventListener("click", () => {
      b.textContent = "Envoyée ✓";
      b.disabled = true;
      b.classList.remove("btn-primary", "btn-outline");
      b.classList.add("btn-ghost");
      showToast(`Candidature envoyée à ${b.dataset.apply} 📤`);
    })
  );

  /* --- filters (matches + cvs) --- */
  const applyMatchFilter = (f) => {
    $$("#matchList .match-row").forEach((row) => {
      const s = +row.dataset.score;
      const show =
        f === "all" ||
        (f === "high" && s >= 90) ||
        (f === "mid" && s >= 70 && s < 90) ||
        (f === "fav" && row.dataset.fav === "true");
      row.style.display = show ? "" : "none";
    });
  };
  const bindFilters = (wrapId, applyFn) => {
    const wrap = $(wrapId);
    if (!wrap) return;
    wrap.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      $$(".chip", wrap).forEach((c) => c.classList.toggle("is-active", c === chip));
      applyFn(chip.dataset.filter);
    });
  };
  bindFilters("#matchFilters", (f) => { currentFilter = f; applyMatchFilter(f); });

  const applyCvFilter = (f) => {
    $$("#cvGrid .cv-card").forEach((card) => {
      const s = +card.dataset.score;
      const show =
        f === "all" ||
        (f === "high" && s >= 90) ||
        (f === "mid" && s >= 70 && s < 90);
      card.style.display = show ? "" : "none";
      if (show) {
        card.style.animation = "none";
        requestAnimationFrame(() => (card.style.animation = "cardIn .5s var(--ease-out)"));
      }
    });
  };
  bindFilters("#cvFilters", applyCvFilter);

  /* --- CV search (entreprise) --- */
  const cvSearch = $("#cvSearch");
  if (cvSearch) {
    const countEl = $("#cvCount");
    cvSearch.addEventListener("input", () => {
      const q = cvSearch.value.trim().toLowerCase();
      let n = 0;
      $$("#cvGrid .cv-card").forEach((card) => {
        const hay = (card.dataset.tags + " " + card.textContent).toLowerCase();
        const show = !q || hay.includes(q);
        card.style.display = show ? "" : "none";
        if (show) n++;
      });
      countEl.textContent = n + (n > 1 ? " profils" : " profil");
    });
  }

  /* --- contact buttons (entreprise, essai limit) --- */
  let contactsLeft = 2;
  $$('[data-contact]').forEach((b) =>
    b.addEventListener("click", () => {
      if (contactsLeft <= 0) {
        showToast("Limite de l'essai atteinte (2 candidats). Passez à l'abonnement pour continuer.", "⚠️");
        return;
      }
      contactsLeft--;
      b.textContent = "Invitation envoyée ✓";
      b.disabled = true;
      showToast(`Invitation envoyée à ${b.dataset.contact} (${contactsLeft} restante${contactsLeft > 1 ? "s" : ""})`, "📨");
    })
  );

  /* --- offers (entreprise) --- */
  const newOfferBtn = $("#newOfferBtn");
  if (newOfferBtn) {
    newOfferBtn.addEventListener("click", () => {
      newOfferBtn.textContent = "✓ Brouillon créé";
      showToast("Nouveau brouillon d'offre créé — complétez-le puis publiez.", "📝");
    });
  }
  $$('[data-offer-publish]').forEach((b) =>
    b.addEventListener("click", () => {
      const pill = b.closest(".offer-row").querySelector(".status-pill");
      pill.textContent = "Ouverte";
      pill.className = "status-pill open";
      b.textContent = "Publiée ✓";
      b.disabled = true;
      showToast("Offre publiée — le matching IA démarre.", "🚀");
    })
  );

  /* --- negotiation slider (both sides) --- */
  const MIN = 4000, MAX = 20000;
  const candRange = $("#candMin");
  const compRange = $("#compMax");
  const bindNego = (rangeSel, outSel, zoneSel, verdictSel, medianSel, otherVal, isCandidateSide, acceptSel) => {
    const range = $(rangeSel);
    if (!range) return;
    const out = $(outSel), zone = $(zoneSel), verdict = $(verdictSel), median = $(medianSel);
    const fill = () => {
      const pct = ((range.value - MIN) / (MAX - MIN)) * 100;
      range.style.setProperty("--fill", pct + "%");
    };
    const update = () => {
      const v = +range.value;
      out.textContent = fmt(v) + " DH";
      fill();
      const other = otherVal; // estimation de l'autre côté
      const lo = Math.min(v, other), hi = Math.max(v, other);
      const hasOverlap = isCandidateSide ? v <= other : v >= other;
      if (hasOverlap) {
        zone.style.left = ((lo - MIN) / (MAX - MIN)) * 100 + "%";
        zone.style.width = Math.max(((hi - lo) / (MAX - MIN)) * 100, 2) + "%";
        zone.style.opacity = "1";
        verdict.textContent = "✓ Zone d'accord détectée";
        verdict.className = "verdict-badge ok";
        const med = fmt(Math.round((v + other) / 2));
        if (median) median.innerHTML = `<b>${med} DH</b>`;
        const acc = acceptSel && $(acceptSel);
        if (acc) acc.textContent = `Accepter ${med} DH`;
      } else {
        zone.style.opacity = "0";
        verdict.textContent = "✕ Pas de compatibilité salariale";
        verdict.className = "verdict-badge no";
        if (median) median.innerHTML = "—";
      }
    };
    range.addEventListener("input", update);
    update();
  };
  bindNego("#candMin", "#candMinVal", "#candZone", "#candVerdict", "#candMedian", 10000, true, "#acceptMedian");
  bindNego("#compMax", "#compMaxVal", "#compZone", "#compVerdict", "#compMedian", 7500, false, "#compAccept");

  /* --- accept / chat / agreement actions --- */
  const acceptMedian = $("#acceptMedian");
  if (acceptMedian)
    acceptMedian.addEventListener("click", () => {
      acceptMedian.textContent = "✓ Proposition envoyée";
      acceptMedian.disabled = true;
      showToast("Proposition envoyée à DigitalMaroc — en attente de confirmation.", "🤝");
    });

  const openChat = $("#openChat");
  if (openChat)
    openChat.addEventListener("click", () => {
      $("#chatPanel").scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => $("#chatInput") && $("#chatInput").focus(), 600);
    });

  const chatInput = $("#chatInput");
  if (chatInput) {
    const send = () => {
      const txt = chatInput.value.trim();
      if (!txt) return;
      const body = $("#chatBody");
      const me = document.createElement("div");
      me.className = "msg msg-me";
      me.innerHTML = `<b>Vous</b><p></p>`;
      me.querySelector("p").textContent = txt;
      body.appendChild(me);
      chatInput.value = "";
      body.scrollTop = body.scrollHeight;

      const addAi = (text) => {
        const ai = document.createElement("div");
        ai.className = "msg msg-ai";
        ai.innerHTML = `<b>Médiateur IA</b><span></span>`;
        ai.querySelector("span").textContent = text;
        body.appendChild(ai);
        body.scrollTop = body.scrollHeight;
      };

      // L7AKAM (Groq) si l'API est configurée — sinon réponse démo
      if (window.WasselAPI && window.WasselAPI.configured()) {
        addAi("⏳ L7AKAM analyse…");
        window.WasselAPI
          .l7akam([{ role: "user", content: txt }])
          .then((r) => {
            const span = body.querySelector(".msg-ai:last-child span");
            if (span) span.textContent = r.reply || "Message transmis à l'autre partie. Rappel : l'IA ne fait que révéler la zone d'accord — la décision reste la vôtre.";
            body.scrollTop = body.scrollHeight;
          })
          .catch(() => {
            const span = body.querySelector(".msg-ai:last-child span");
            if (span) span.textContent = "Message transmis à l'autre partie (L7AKAM injoignable). La décision reste la vôtre.";
          });
      } else {
        setTimeout(() => {
          addAi("Message transmis à l'autre partie. Rappel : l'IA ne fait que révéler la zone d'accord — la décision reste la vôtre.");
        }, 1200);
      }
    };
    $("#chatSend").addEventListener("click", send);
    chatInput.addEventListener("keydown", (e) => { if (e.key === "Enter") send(); });
  }

  const compAccept = $("#compAccept");
  if (compAccept)
    compAccept.addEventListener("click", () => {
      compAccept.textContent = "✓ Accepté — accord de principe";
      compAccept.disabled = true;
      const ag = $("#agreementPanel");
      if (ag) { ag.hidden = false; ag.scrollIntoView({ behavior: "smooth", block: "center" }); }
      showToast("Accord de principe accepté — résumé disponible.", "🤝");
    });

  const compAgreement = $("#compAgreement");
  if (compAgreement)
    compAgreement.addEventListener("click", () => {
      const ag = $("#agreementPanel");
      if (ag) { ag.hidden = false; ag.scrollIntoView({ behavior: "smooth", block: "center" }); }
    });

  const downloadAgreement = $("#downloadAgreement");
  if (downloadAgreement)
    downloadAgreement.addEventListener("click", () => {
      showToast("Génération du PDF… (démo — reportlab côté serveur)", "📄");
      setTimeout(() => showToast("Résumé d'accord prêt : Resume_Accord_Wassel.pdf", "✅"), 1500);
    });

  /* --- trial banner (entreprise) --- */
  const trialBanner = $("#trialBanner");
  if (trialBanner) {
    const day = 3, remaining = 7;
    const start = new Date();
    start.setDate(start.getDate() - day);
    const end = new Date(start);
    end.setDate(end.getDate() + 10);
    $("#trialDay").textContent = day;
    $("#trialRemaining").textContent = remaining + " jours restants";
    $("#trialBar").style.width = (day / 10) * 100 + "%";
    const dateStr = end.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
    const renew = $("#renewDate");
    if (renew) renew.textContent = dateStr;
    const modalEnd = $("#modalEndDate");
    if (modalEnd) modalEnd.textContent = dateStr;
  }

  /* --- cancel modal --- */
  const cancelModal = $("#cancelModal");
  const openModal = () => { if (cancelModal) { cancelModal.hidden = false; requestAnimationFrame(() => cancelModal.classList.add("is-open")); } };
  const closeModal = () => { if (cancelModal) { cancelModal.classList.remove("is-open"); setTimeout(() => (cancelModal.hidden = true), 300); } };
  const cancelSubBtn = $("#cancelSubBtn");
  const manageSubBtn = $("#manageSubBtn");
  if (cancelSubBtn) cancelSubBtn.addEventListener("click", openModal);
  if (manageSubBtn) manageSubBtn.addEventListener("click", openModal);
  if (cancelModal) $$('[data-close]', cancelModal).forEach((b) => b.addEventListener("click", closeModal));
  const confirmCancel = $("#confirmCancel");
  if (confirmCancel)
    confirmCancel.addEventListener("click", () => {
      closeModal();
      const banner = $("#trialBanner");
      if (banner) {
        banner.classList.add("is-cancelled");
        banner.innerHTML = '<span class="trial-pill red">Abonnement annulé</span><span>Votre essai prend fin le <b>' + ($("#modalEndDate") ? $("#modalEndDate").textContent : "") + '</b> — aucune somme ne sera prélevée.</span>';
      }
      showToast("Abonnement annulé — accès jusqu'à la fin de l'essai.", "✅");
    });

  /* --- logout --- */
  const logoutBtn = $("#logoutBtn");
  if (logoutBtn)
    logoutBtn.addEventListener("click", () => {
      showToast("Déconnexion…", "👋");
      setTimeout(() => (location.href = "index.html"), 900);
    });
})();

/* ConformalDAgger site: small interactive demos. No libraries.
   Demos run only when their elements exist on the page. */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(parent, x, y, s, attrs) {
    var t = el("text", Object.assign({ x: x, y: y }, attrs || {}), parent);
    t.textContent = s;
    return t;
  }
  function clear(svg) { while (svg.firstChild) svg.removeChild(svg.firstChild); }
  function $(id) { return document.getElementById(id); }
  function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }
  // small seeded random generator so a run can be repeated
  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s += 0x6D2B79F5;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(r) { var u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  /* ------------------------------------------------ Step 1: shift schedules */
  (function shiftDemo() {
    var svg = $("shiftSvg");
    if (!svg) return;
    var P = {
      start: [0, 0], start2: [0, 0.12],
      g0: [0.30, 0.15], g1a: [0.30, 0.05], g1b: [0.30, -0.05], g1: [0.30, -0.15]
    };
    var NAMES = { g0: "g0", g1a: "g1a", g1b: "g1b", g1: "g1" };
    function goalFor(setting, ep) {
      if (setting === "shift") return ep >= 5 ? "g1" : "g0";
      if (setting === "drift") return ep >= 11 ? "g1" : ep >= 8 ? "g1b" : ep >= 5 ? "g1a" : "g0";
      return "g0";
    }
    function startFor(setting, ep) { return setting === "env" && ep >= 1 ? "start2" : "start"; }
    // map world (x in -0.03..0.36, y in -0.22..0.22) to svg
    function X(x) { return 60 + (x + 0.03) / 0.39 * 520; }
    function Y(y) { return 190 - y / 0.22 * 160; }
    var setting = "shift";
    var ep = $("ep"), epOut = $("epOut"), msg = $("shiftMsg");
    function draw() {
      clear(svg);
      var e = +ep.value;
      epOut.textContent = e;
      // grid
      for (var gx = 0; gx <= 0.3001; gx += 0.1) {
        el("line", { x1: X(gx), x2: X(gx), y1: 22, y2: 360, stroke: "var(--line)" }, svg);
        txt(svg, X(gx), 374, gx.toFixed(1), { "text-anchor": "middle", "class": "lbl" });
      }
      for (var gy = -0.2; gy <= 0.2001; gy += 0.1) {
        el("line", { x1: 40, x2: 600, y1: Y(gy), y2: Y(gy), stroke: "var(--line)" }, svg);
        txt(svg, 34, Y(gy) + 4, gy.toFixed(1), { "text-anchor": "end", "class": "lbl" });
      }
      txt(svg, 600, 16, "top view (x, y), metres", { "text-anchor": "end", "class": "lbl" });
      // previous episodes' goals, faint
      var seen = {};
      for (var k = 0; k <= 15; k++) seen[goalFor(setting, k)] = true;
      Object.keys(NAMES).forEach(function (g) {
        if (!seen[g]) return;
        var on = goalFor(setting, e) === g;
        el("circle", { cx: X(P[g][0]), cy: Y(P[g][1]), r: on ? 11 : 8, fill: on ? "var(--fill-o)" : "var(--surface)", stroke: on ? "var(--orange)" : "var(--ink-2)", "stroke-width": on ? 2.5 : 1.3, "stroke-dasharray": on ? "" : "4 3" }, svg);
        txt(svg, X(P[g][0]) + 16, Y(P[g][1]) + 4, NAMES[g], { "class": "lbl", "font-weight": on ? "700" : "400" });
      });
      // start(s)
      var st = startFor(setting, e);
      ["start", "start2"].forEach(function (s) {
        if (s === "start2" && setting !== "env") return;
        var on = s === st;
        el("rect", { x: X(P[s][0]) - 7, y: Y(P[s][1]) - 7, width: 14, height: 14, rx: 2, fill: on ? "var(--fill-a)" : "var(--surface)", stroke: on ? "var(--accent)" : "var(--ink-2)", "stroke-width": on ? 2.5 : 1.3 }, svg);
        txt(svg, X(P[s][0]) - 12, Y(P[s][1]) + 4, s === "start" ? "start" : "moved start", { "text-anchor": "end", "class": "lbl" });
      });
      // expert path with dots every step (0.01)
      var g = goalFor(setting, e), a = P[st], b = P[g];
      var dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy), n = Math.ceil(d / 0.01);
      el("line", { x1: X(a[0]), y1: Y(a[1]), x2: X(b[0]), y2: Y(b[1]), stroke: "var(--orange)", "stroke-width": 2 }, svg);
      for (var i = 1; i < n; i++) {
        var f = i * 0.01 / d;
        el("circle", { cx: X(a[0] + dx * f), cy: Y(a[1] + dy * f), r: 2.2, fill: "var(--orange)" }, svg);
      }
      // what the robot learned before (the demo goal), dashed accent, after a change
      if (g !== "g0") {
        el("line", { x1: X(a[0]), y1: Y(a[1]), x2: X(P.g0[0]), y2: Y(P.g0[1]), stroke: "var(--accent)", "stroke-width": 1.6, "stroke-dasharray": "6 5" }, svg);
      } else if (st !== "start") {
        // the learned habit: the old direction start -> g0, now starting from the moved start
        var ox = P.g0[0] - P.start[0], oy = P.g0[1] - P.start[1], f2 = 0.7;
        el("line", { x1: X(a[0]), y1: Y(a[1]), x2: X(a[0] + ox * f2), y2: Y(a[1] + oy * f2), stroke: "var(--accent)", "stroke-width": 1.6, "stroke-dasharray": "6 5" }, svg);
      }
      var label = e === 0 ? "Episode 0 = demonstrations" : "Episode " + e;
      var text;
      if (e === 0) text = label + ": the expert shows start → g0 ten times (with small pushes).";
      else if (setting === "stationary") text = label + ": the expert still wants g0. Nothing new to learn.";
      else if (setting === "env") text = label + ": the cup starts somewhere new, but the goal is still g0. Dashed blue: the direction the robot learned from the old start.";
      else if (g === "g0") text = label + ": the expert still wants g0.";
      else text = label + ": the expert now wants " + NAMES[g] + " (orange dots, " + n + " steps of 0.01). Dashed blue: the demo goal g0 the robot first learned. Each change opens a gap the robot must notice.";
      msg.textContent = text;
    }
    document.querySelectorAll("[data-shift]").forEach(function (b) {
      b.addEventListener("click", function () {
        setting = b.getAttribute("data-shift");
        document.querySelectorAll("[data-shift]").forEach(function (o) { o.setAttribute("aria-pressed", o === b ? "true" : "false"); });
        draw();
      });
    });
    ep.addEventListener("input", draw);
    var timer = null;
    $("epPlay").addEventListener("click", function () {
      if (timer) { clearInterval(timer); timer = null; this.textContent = "Play all"; return; }
      var btn = this;
      btn.textContent = "Stop";
      ep.value = 0; draw();
      timer = setInterval(function () {
        if (+ep.value >= 15) { clearInterval(timer); timer = null; btn.textContent = "Play all"; return; }
        ep.value = +ep.value + 1; draw();
      }, 700);
    });
    draw();
  })();

  /* ------------------------------------------------ Step 3: IQT demo */
  (function iqtDemo() {
    var svg = $("iqtSvg");
    if (!svg) return;
    // one action number, so the asking threshold is about a third of the paper's 4-number τ = 0.06
    var T = 600, ALPHA = 0.05, TAU = 0.02, BETA = 300, K = 100, Q0 = 0.01;
    var seed = 7;
    var ctl = { c: $("dC"), lr: $("dLr"), ask: $("dAsk"), shift: $("dShift") };

    function stream(r, shift) {
      // the error a_h - a_r over time: small noise; after the change a bias that fades as retraining catches up
      var e = [];
      for (var t = 0; t < T; t++) {
        var bias = 0;
        if (shift && t >= 300) bias = -0.022 * Math.exp(-(t - 300) / 110);
        e.push(bias + 0.0035 * gauss(r));
      }
      return e;
    }
    // one method run. weighted = true: IQT (divide by p). false: naive (ignore p).
    function run(err, U1, U2, c, lr, asking, weighted) {
      var qlo = Q0, qhi = Q0, hiHist = [], loHist = [];
      var out = { qlo: [], qhi: [], obs: [], miss: 0, missAfter: 0, nObs: 0, nAsk: 0 };
      for (var t = 0; t < T; t++) {
        var lo = Math.max(qlo, 0), hi = Math.max(qhi, 0);
        out.qlo.push(lo); out.qhi.push(hi);
        var e = err[t];
        var missHi = e > hi, missLo = -e > lo;
        if (missHi || missLo) { out.miss++; if (t >= 300 && t < 420) out.missAfter++; }
        var pAsk = asking ? sigmoid(BETA * ((lo + hi) - TAU)) : 0;
        var p = c + pAsk - c * pAsk;
        var human = U1[t] < c, ask = asking && U2[t] < pAsk;
        var seen = human || ask;
        out.obs.push(seen);
        if (ask && !human) out.nAsk++;
        if (!seen) continue;
        out.nObs++;
        hiHist.push(Math.max(e, 0)); loHist.push(Math.max(-e, 0));
        if (hiHist.length > K) { hiHist.shift(); loHist.shift(); }
        var bHi = Math.max(0.002, Math.max.apply(null, hiHist));
        var bLo = Math.max(0.002, Math.max.apply(null, loHist));
        var w = weighted ? 1 / p : 1;
        qhi += lr * bHi * w * ((e > qhi ? 1 : 0) - ALPHA);
        qlo += lr * bLo * w * ((-e > qlo ? 1 : 0) - ALPHA);
      }
      return out;
    }
    function draw() {
      var c = +ctl.c.value, lr = +ctl.lr.value, asking = ctl.ask.checked, shift = ctl.shift.checked;
      $("dCo").textContent = c.toFixed(2);
      $("dLro").textContent = lr.toFixed(2);
      var r = rng(seed);
      var err = stream(r, shift);
      var U1 = [], U2 = [];
      for (var t = 0; t < T; t++) { U1.push(r()); U2.push(r()); }
      var A = run(err, U1, U2, c, lr, asking, true);
      var B = run(err, U1, U2, c, lr, asking, false);

      clear(svg);
      var L = 56, R = 890, Tp = 14, Bt = 296, YMAX = 0.04;
      function X(t) { return L + t / (T - 1) * (R - L); }
      // values beyond the chart are drawn on its edge
      function Y(v) { v = Math.max(-YMAX, Math.min(YMAX, v)); return Tp + (Bt - Tp) * (1 - (v + YMAX) / (2 * YMAX)); }
      [-0.04, -0.02, 0, 0.02, 0.04].forEach(function (v) {
        el("line", { x1: L, x2: R, y1: Y(v), y2: Y(v), stroke: v === 0 ? "var(--ink-2)" : "var(--line)" }, svg);
        txt(svg, L - 6, Y(v) + 4, v.toFixed(2), { "text-anchor": "end" });
      });
      [0, 100, 200, 300, 400, 500, 599].forEach(function (t) { txt(svg, X(t), 316, t === 599 ? "600" : String(t), { "text-anchor": "middle" }); });
      txt(svg, R, 328, "time step", { "text-anchor": "end" });
      if (shift) {
        el("line", { x1: X(300), x2: X(300), y1: Tp, y2: Bt, stroke: "var(--ink-2)", "stroke-dasharray": "4 4" }, svg);
        txt(svg, X(300) + 6, Tp + 12, "expert changes", {});
      }
      function band(res, color, dash) {
        var up = "", dn = "";
        for (var t = 0; t < T; t++) {
          up += (t ? "L" : "M") + X(t).toFixed(1) + "," + Y(res.qhi[t]).toFixed(1);
          dn += (t ? "L" : "M") + X(t).toFixed(1) + "," + Y(-res.qlo[t]).toFixed(1);
        }
        var attrs = { fill: "none", stroke: color, "stroke-width": 2, "stroke-linejoin": "round" };
        if (dash) attrs["stroke-dasharray"] = dash;
        el("path", Object.assign({ d: up }, attrs), svg);
        el("path", Object.assign({ d: dn }, attrs), svg);
      }
      for (var i = 0; i < T; i++) {
        el("circle", { cx: X(i), cy: Y(Math.max(-YMAX, Math.min(YMAX, err[i]))), r: A.obs[i] ? 2.3 : 1.6, fill: "var(--ink)", opacity: A.obs[i] ? 0.85 : 0.18 }, svg);
      }
      band(B, "var(--orange)", "6 4");
      band(A, "var(--accent)", "");
      txt(svg, L + 4, Tp + 12, "error a_h − a_r", {});

      function pct(n, d) { return (100 * n / d).toFixed(1) + "%"; }
      var tgt = 2 * ALPHA;
      var s = $("iqtStats");
      s.innerHTML = "";
      [
        [pct(A.miss, T), "IQT: steps where the expert fell outside the margin (target 10%)", Math.abs(A.miss / T - tgt) <= Math.abs(B.miss / T - tgt) ? "good" : ""],
        [pct(B.miss, T), "Naive: steps outside its margin", Math.abs(B.miss / T - tgt) > Math.abs(A.miss / T - tgt) + 0.01 ? "bad" : ""],
        [pct(A.nObs, T), "IQT: steps with feedback (" + A.nAsk + " asked by the robot)", ""],
        [shift ? pct(A.missAfter, 120) + " / " + pct(B.missAfter, 120) : "—", "Outside the margin in the 120 steps after the change (IQT / naive)", ""]
      ].forEach(function (row) {
        var d = document.createElement("div");
        if (row[2]) d.className = row[2];
        d.innerHTML = "<b>" + row[0] + "</b><span>" + row[1] + "</span>";
        s.appendChild(d);
      });
    }
    function average() {
      var c = +ctl.c.value, lr = +ctl.lr.value, asking = ctl.ask.checked, shift = ctl.shift.checked, N = 200;
      var am = 0, bm = 0, ao = 0, bo = 0;
      for (var n = 0; n < N; n++) {
        var r = rng(n * 7919 + 1), err = stream(r, shift), U1 = [], U2 = [];
        for (var t = 0; t < T; t++) { U1.push(r()); U2.push(r()); }
        var A = run(err, U1, U2, c, lr, asking, true), B = run(err, U1, U2, c, lr, asking, false);
        am += A.miss; bm += B.miss; ao += A.nObs; bo += B.nObs;
      }
      var f = function (v) { return (100 * v / (N * T)).toFixed(1) + "%"; };
      $("iqtAvg").textContent = "Average of 200 runs with these settings: IQT outside its margin " + f(am) + " of steps (feedback on " + f(ao) +
        "); naive outside " + f(bm) + " (feedback on " + f(bo) + "). Target: 10%.";
    }
    ["c", "lr"].forEach(function (k) { ctl[k].addEventListener("input", function () { draw(); $("iqtAvg").textContent = ""; }); });
    ["ask", "shift"].forEach(function (k) { ctl[k].addEventListener("change", function () { draw(); $("iqtAvg").textContent = ""; }); });
    $("dNew").addEventListener("click", function () { seed = Math.floor(Math.random() * 1e9); draw(); });
    $("dAvg").addEventListener("click", average);
    draw();
  })();

  /* ------------------------------------------------ Step 3: sigmoid asking rule */
  (function sigDemo() {
    var svg = $("sigSvg");
    if (!svg) return;
    var cT = $("sT"), cB = $("sB"), cU = $("sU");
    function draw() {
      var tau = +cT.value, beta = +cB.value, u = +cU.value;
      $("sTo").textContent = tau.toFixed(3);
      $("sBo").textContent = beta;
      $("sUo").textContent = u.toFixed(3);
      clear(svg);
      var L = 56, R = 890, Tp = 14, Bt = 220, UMAX = 0.15;
      function X(v) { return L + v / UMAX * (R - L); }
      function Y(p) { return Tp + (Bt - Tp) * (1 - p); }
      [0, 0.25, 0.5, 0.75, 1].forEach(function (p) {
        el("line", { x1: L, x2: R, y1: Y(p), y2: Y(p), stroke: p === 0 ? "var(--ink-2)" : "var(--line)" }, svg);
        txt(svg, L - 6, Y(p) + 4, p.toFixed(2), { "text-anchor": "end" });
      });
      for (var v = 0; v <= 0.1501; v += 0.03) txt(svg, X(v), 238, v.toFixed(2), { "text-anchor": "middle" });
      txt(svg, R, 254, "margin size u", { "text-anchor": "end" });
      txt(svg, L + 4, Tp + 12, "chance the robot asks", {});
      el("line", { x1: X(tau), x2: X(tau), y1: Tp, y2: Bt, stroke: "var(--ink-2)", "stroke-dasharray": "4 4" }, svg);
      txt(svg, X(tau) + 6, Bt - 8, "τ", { "class": "v" });
      var d = "";
      for (var i = 0; i <= 300; i++) {
        var x = i / 300 * UMAX;
        d += (i ? "L" : "M") + X(x).toFixed(1) + "," + Y(sigmoid(beta * (x - tau))).toFixed(1);
      }
      el("path", { d: d, fill: "none", stroke: "var(--accent)", "stroke-width": 2.5 }, svg);
      var pu = sigmoid(beta * (u - tau));
      el("circle", { cx: X(u), cy: Y(pu), r: 6, fill: "var(--orange)" }, svg);
      var p = 0.2 + pu - 0.2 * pu;
      $("sigMsg").textContent = "u = " + u.toFixed(3) + " → the robot asks with chance " + pu.toFixed(2) +
        ". With the human stepping in 20% of the time, feedback is seen with p = " + p.toFixed(2) + ".";
    }
    [cT, cB, cU].forEach(function (c) { c.addEventListener("input", draw); });
    draw();
  })();

  /* ------------------------------------------------ Step 5: reaction demo */
  (function reactDemo() {
    var svg = $("reactSvg");
    if (!svg) return;
    var cS = $("rS"), cTh = $("rTh");
    function draw() {
      var sens = +cS.value, th = +cTh.value;
      $("rSo").textContent = sens.toFixed(1);
      $("rTho").textContent = th.toFixed(2);
      clear(svg);
      var T = 60, L = 56, R = 890, Tp = 14, Bt = 200;
      function X(t) { return L + t / (T - 1) * (R - L); }
      function Y(v) { return Tp + (Bt - Tp) * (1 - v); }
      [0, 0.5, 1].forEach(function (v) {
        el("line", { x1: L, x2: R, y1: Y(v), y2: Y(v), stroke: v === 0 ? "var(--ink-2)" : "var(--line)" }, svg);
        txt(svg, L - 6, Y(v) + 4, v.toFixed(1), { "text-anchor": "end" });
      });
      var r = rng(11), dev = [], rea = [], first = -1, step = -1, sm = 0;
      for (var t = 0; t < T; t++) {
        // the robot heads the wrong way from step 10: its distance from the expert's path grows
        var d = t < 10 ? 0 : Math.min(1, (t - 10) / 30);
        dev.push(d);
        sm = 0.7 * sm + 0.3 * Math.max(0, Math.min(1, sens * d + 0.06 * gauss(r)));
        rea.push(sm);
        if (first < 0 && sm > th) first = t;
        if (step < 0 && d > 0.6) step = t;
      }
      function line(arr, color, dash) {
        var p = "";
        arr.forEach(function (v, t) { p += (t ? "L" : "M") + X(t).toFixed(1) + "," + Y(v).toFixed(1); });
        var a = { d: p, fill: "none", stroke: color, "stroke-width": 2.4 };
        if (dash) a["stroke-dasharray"] = dash;
        el("path", a, svg);
      }
      line(dev, "var(--ink-2)", "6 4");
      line(rea, "var(--orange)");
      el("line", { x1: L, x2: R, y1: Y(th), y2: Y(th), stroke: "var(--orange)", "stroke-dasharray": "2 4" }, svg);
      if (first >= 0) {
        el("line", { x1: X(first), x2: X(first), y1: Tp, y2: Bt, stroke: "var(--accent)", "stroke-width": 1.5 }, svg);
        txt(svg, X(first) + 5, Tp + 14, "reaction noticed", { "class": "v" });
      }
      if (step >= 0) {
        el("line", { x1: X(step), x2: X(step), y1: Tp, y2: Bt, stroke: "var(--ink-2)", "stroke-width": 1.5 }, svg);
        txt(svg, X(step) + 5, Tp + 32, "person steps in", {});
      }
      [0, 10, 20, 30, 40, 50, 59].forEach(function (t) { txt(svg, X(t), 218, String(t === 59 ? 60 : t), { "text-anchor": "middle" }); });
      txt(svg, R, 232, "time step", { "text-anchor": "end" });
      var gain = first >= 0 && step >= 0 ? step - first : null;
      $("reactMsg").textContent = first < 0 ? "With this sensitivity the reaction never crosses the threshold: this person does not show it, so the robot must rely on asking." :
        "The reaction crosses the threshold at step " + first + ", " + (gain > 0 ? gain + " steps before" : "not before") + " the person would step in (step " + step + ").";
    }
    [cS, cTh].forEach(function (c) { c.addEventListener("input", draw); });
    draw();
  })();
})();

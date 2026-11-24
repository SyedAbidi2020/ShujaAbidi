/* PDDL planning site: small charts with hover, and the Blocksworld playground.
   No libraries. The checker below follows the same rules and text format as pddl.py / cot.py. */
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

  /* ------------------------------------------------------------ charts */
  function makeTip(box) {
    var tip = document.createElement("div");
    tip.className = "tip";
    box.appendChild(tip);
    return {
      show: function (html, evt) {
        tip.innerHTML = html;
        tip.classList.add("show");
        var r = box.getBoundingClientRect();
        var x = evt.clientX - r.left + 12, y = evt.clientY - r.top - 10;
        var w = tip.offsetWidth;
        if (x + w > r.width - 4) x = evt.clientX - r.left - w - 12;
        tip.style.left = Math.max(4, x) + "px";
        tip.style.top = Math.max(4, y - tip.offsetHeight) + "px";
      },
      hide: function () { tip.classList.remove("show"); }
    };
  }
  function legend(box, series) {
    if (series.length < 2) return;
    var lg = document.createElement("div");
    lg.className = "legend";
    series.forEach(function (s) {
      var sp = document.createElement("span");
      sp.innerHTML = '<i style="background:var(' + s.color + ')"></i>' + s.name;
      lg.appendChild(sp);
    });
    box.appendChild(lg);
  }
  function roundTop(x, y, w, h, r) {
    r = Math.min(r, w / 2, h);
    return "M" + x + "," + (y + h) + "V" + (y + r) + "Q" + x + "," + y + " " + (x + r) + "," + y +
      "H" + (x + w - r) + "Q" + (x + w) + "," + y + " " + (x + w) + "," + (y + r) + "V" + (y + h) + "Z";
  }
  function axes(svg, W, H, L, B, T, max, ticks, unit) {
    ticks.forEach(function (v) {
      var y = T + (H - T - B) * (1 - v / max);
      el("line", { x1: L, x2: W - 8, y1: y, y2: y, "class": v === 0 ? "ax" : "gl" }, svg);
      txt(svg, L - 6, y + 4, v + (unit || ""), { "text-anchor": "end" });
    });
  }
  function barChart(box, c) {
    var W = 640, H = c.height || 270, L = 44, B = 46, T = 14;
    legend(box, c.series);
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": c.label || "" }, box);
    var tip = makeTip(box);
    axes(svg, W, H, L, B, T, c.max, c.ticks, c.unit);
    var gw = (W - 8 - L) / c.groups.length, ns = c.series.length;
    var bw = Math.min(34, (gw - 26) / ns - 2);
    c.groups.forEach(function (g, gi) {
      var gx = L + gi * gw + (gw - (bw * ns + 2 * (ns - 1))) / 2;
      var lines = String(g).split("|");
      lines.forEach(function (ln, li) { txt(svg, L + gi * gw + gw / 2, H - B + 18 + li * 15, ln, { "text-anchor": "middle" }); });
      c.series.forEach(function (s, si) {
        var v = s.values[gi];
        if (v === null || v === undefined) return;
        var h = (H - T - B) * v / c.max, x = gx + si * (bw + 2), y = H - B - h;
        var hit = el("rect", { x: x - 1, y: T, width: bw + 2, height: H - T - B, "class": "hit" }, svg);
        var mk = h > 0 ? el("path", { d: roundTop(x, y, bw, h, 4), style: "fill:var(" + s.color + ")", "class": "mk" }, svg) : null;
        txt(svg, x + bw / 2, y - 5, v + (c.unit || ""), { "text-anchor": "middle", "class": "v" });
        var note = (c.notes && c.notes[gi]) ? "<br>" + c.notes[gi] : "";
        hit.addEventListener("mousemove", function (e) {
          if (mk) mk.classList.add("on");
          tip.show("<b>" + s.name + "</b> · " + lines.join(" ") + "<br>" + v + (c.unit || "") + (c.suffix || "") + note, e);
        });
        hit.addEventListener("mouseleave", function () { if (mk) mk.classList.remove("on"); tip.hide(); });
      });
    });
  }
  function lineChart(box, c) {
    var W = 640, H = c.height || 260, L = 44, B = 40, T = 14, R = c.endLabels ? 96 : 14;
    legend(box, c.series);
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": c.label || "" }, box);
    var tip = makeTip(box);
    axes(svg, W - R + 8, H, L, B, T, c.max, c.ticks, c.unit);
    var n = c.xs.length, pw = W - R - L;
    function X(i) { return L + (n === 1 ? pw / 2 : pw * i / (n - 1)); }
    function Y(v) { return T + (H - T - B) * (1 - v / c.max); }
    var every = c.xEvery || 1;
    c.xs.forEach(function (x, i) { if (i % every === 0 || i === n - 1) txt(svg, X(i), H - B + 18, x, { "text-anchor": "middle" }); });
    if (c.xTitle) txt(svg, L + pw / 2, H - 4, c.xTitle, { "text-anchor": "middle" });
    var cross = el("line", { x1: 0, x2: 0, y1: T, y2: H - B, "class": "gl", style: "opacity:0" }, svg);
    var dots = [];
    c.series.forEach(function (s) {
      var d = "", ds = [];
      s.values.forEach(function (v, i) {
        if (v === null) return;
        d += (d ? "L" : "M") + X(i) + "," + Y(v);
      });
      el("path", { d: d, fill: "none", style: "stroke:var(" + s.color + ");stroke-width:2;stroke-linejoin:round;stroke-linecap:round" }, svg);
      if (c.dots !== false) s.values.forEach(function (v, i) {
        if (v === null) return;
        ds[i] = el("circle", { cx: X(i), cy: Y(v), r: 4.5, style: "fill:var(" + s.color + ");stroke:var(--surface);stroke-width:2" }, svg);
      });
      dots.push(ds);
      if (c.endLabels) {
        var lv = s.values[n - 1];
        txt(svg, X(n - 1) + 9, Y(lv) + 4 + (s.dy || 0), s.name + " " + lv + (c.unit || ""), { "class": "v" });
      }
    });
    for (var i = 0; i < n; i++) (function (i) {
      var w = n === 1 ? pw : pw / (n - 1);
      var hit = el("rect", { x: X(i) - w / 2, y: T, width: w, height: H - T - B, "class": "hit" }, svg);
      hit.addEventListener("mousemove", function (e) {
        cross.setAttribute("x1", X(i)); cross.setAttribute("x2", X(i)); cross.style.opacity = 1;
        var rows = c.series.map(function (s) {
          var v = s.values[i];
          return v === null ? "" : '<span style="color:var(' + s.color + ')">■</span> ' + s.name + ": " + v + (c.unit || "");
        }).filter(Boolean).join("<br>");
        var note = (c.notes && c.notes[i]) ? "<br>" + c.notes[i] : "";
        tip.show("<b>" + (c.xName ? c.xName + " " : "") + c.xs[i] + "</b><br>" + rows + note, e);
      });
      hit.addEventListener("mouseleave", function () { cross.style.opacity = 0; tip.hide(); });
    })(i);
  }
  document.querySelectorAll(".chart[data-chart]").forEach(function (box) {
    var c = JSON.parse(box.getAttribute("data-chart"));
    if (c.type === "bar") barChart(box, c); else lineChart(box, c);
  });

  /* ------------------------------------------------------------ Blocksworld checker */
  var MYSTERY = { "pick-up": "attack", "put-down": "succumb", "unstack": "feast", "stack": "overcome",
    "ontable": "planet", "on": "craves", "clear": "province", "handempty": "harmony", "holding": "pain" };
  var BACK = {};
  for (var k in MYSTERY) BACK[MYSTERY[k]] = k;
  var WORDS = /(?<![\w-])(pick-up|put-down|unstack|stack|ontable|on|clear|handempty|holding)(?![\w-])/g;
  var mystery = false;
  function show(s) { return mystery ? s.replace(WORDS, function (m) { return MYSTERY[m]; }) : s; }

  function ground(name, args) {
    var x = args[0], y = args[1];
    switch (name) {
      case "pick-up": return { pre: ["clear " + x, "ontable " + x, "handempty"], add: ["holding " + x], del: ["ontable " + x, "clear " + x, "handempty"], n: 1 };
      case "put-down": return { pre: ["holding " + x], add: ["clear " + x, "handempty", "ontable " + x], del: ["holding " + x], n: 1 };
      case "stack": return { pre: ["holding " + x, "clear " + y], add: ["clear " + x, "handempty", "on " + x + " " + y], del: ["holding " + x, "clear " + y], n: 2 };
      case "unstack": return { pre: ["on " + x + " " + y, "clear " + x, "handempty"], add: ["holding " + x, "clear " + y], del: ["clear " + x, "handempty", "on " + x + " " + y], n: 2 };
    }
    return null;
  }
  var ARITY = { "pick-up": 1, "put-down": 1, "stack": 2, "unstack": 2 };
  function f(a) { return "(" + a + ")"; }
  // sort by the displayed names, as the real checker does in each domain
  function fset(s) { return Array.from(s).map(show).sort().map(f).join(" "); }
  function fa(a) { return "(" + a.join(" ") + ")"; }
  function applicable(s, a) {
    var g = ground(a[0], a.slice(1));
    return g.pre.filter(function (p) { return !s.has(p); });
  }
  function apply(s, a) {
    var g = ground(a[0], a.slice(1)), n = new Set(s);
    g.del.forEach(function (p) { n.delete(p); });
    g.add.forEach(function (p) { n.add(p); });
    return n;
  }
  function badAction(a, objs) {
    if (!(a[0] in ARITY)) return "action '" + a[0] + "' does not exist in the domain";
    if (a.length - 1 !== ARITY[a[0]]) return a[0] + " takes " + ARITY[a[0]] + " arguments, got " + (a.length - 1);
    for (var i = 1; i < a.length; i++) if (objs.indexOf(a[i]) < 0) return "object '" + a[i] + "' is not in the problem";
    return null;
  }
  // Phase 1 target text, same format as explain() in cot.py
  function explain(P, plan) {
    var s = new Set(P.init), out = [], valid = true, failed = 0, last = s;
    var lines = [];
    for (var i = 0; i < plan.length; i++) {
      var a = plan[i];
      lines.push("[Action " + (i + 1) + ": " + fa(a) + "]");
      var bad = badAction(a, P.objects);
      if (bad) { lines.push("- VIOLATION: " + bad); valid = false; failed = i + 1; break; }
      var g = ground(a[0], a.slice(1));
      lines.push("- Preconditions: " + fset(g.pre));
      lines.push("- Current state: " + fset(s));
      var miss = applicable(s, a);
      if (miss.length) {
        miss.forEach(function (p) { lines.push("- VIOLATION: the precondition " + f(p) + " is not true in the current state"); });
        if (i < plan.length - 1) lines.push("\nThe remaining " + (plan.length - i - 1) + " action(s) cannot be evaluated because action " + (i + 1) + " failed.");
        valid = false; failed = i + 1; break;
      }
      lines.push("- All preconditions are satisfied");
      lines.push("- Effects: add " + (fset(g.add) || "-") + "; delete " + (fset(g.del) || "-"));
      s = apply(s, a);
      lines.push("- Resulting state: " + fset(s));
    }
    var missing = P.goal.filter(function (g) { return !s.has(g); });
    var goalOk = valid && missing.length === 0;
    if (valid && !goalOk) lines.push("\nAll actions are applicable, but the goal is not reached: " + fset(missing) + " is not true in the final state.");
    if (goalOk) lines.push("\nThe goal " + fset(P.goal) + " is satisfied in the final state. The plan succeeds.");
    out.push("This plan is " + (goalOk ? "VALID" : "INVALID") + ". Let me analyze each action:\n");
    return { text: out.concat(lines).join("\n"), valid: goalOk, state: s, failed: failed };
  }
  function parsePlan(text) {
    var re = /\(([^()]+)\)/g, m, plan = [];
    while ((m = re.exec(text))) {
      var t = m[1].trim().toLowerCase().split(/[\s,]+/).filter(Boolean);
      if (!t.length) continue;
      if (BACK[t[0]]) t[0] = BACK[t[0]];
      plan.push(t);
    }
    return plan;
  }
  function allActions(objs) {
    var acts = [];
    objs.forEach(function (x) {
      acts.push(["pick-up", x], ["put-down", x]);
      objs.forEach(function (y) { if (x !== y) acts.push(["stack", x, y], ["unstack", x, y]); });
    });
    return acts;
  }
  function key(s) { return Array.from(s).sort().join("|"); }
  function shortest(P) {   // breadth-first search: fine up to 6 blocks (7,057 states)
    var acts = allActions(P.objects), start = new Set(P.init);
    var seen = {}, q = [[start, []]];
    seen[key(start)] = 1;
    while (q.length) {
      var cur = q.shift(), s = cur[0];
      if (P.goal.every(function (g) { return s.has(g); })) return cur[1];
      for (var i = 0; i < acts.length; i++) {
        if (applicable(s, acts[i]).length) continue;
        var n = apply(s, acts[i]), k = key(n);
        if (!seen[k]) { seen[k] = 1; q.push([n, cur[1].concat([acts[i]])]); }
      }
    }
    return null;
  }

  // problems
  function fromTowers(towers, held) {   // towers: arrays bottom -> top
    var init = [];
    towers.forEach(function (t) {
      t.forEach(function (b, i) { init.push(i === 0 ? "ontable " + b : "on " + b + " " + t[i - 1]); });
      if (t.length) init.push("clear " + t[t.length - 1]);
    });
    init.push(held ? "holding " + held : "handempty");
    return init;
  }
  function onFacts(towers) {
    var g = [];
    towers.forEach(function (t) { for (var i = 1; i < t.length; i++) g.push("on " + t[i] + " " + t[i - 1]); });
    return g;
  }
  var PRESETS = {
    ex1: { name: "bw-3-3005", objects: ["a", "b", "c"], init: fromTowers([["b", "c"], ["a"]]), goal: ["on a c"],
      note: "c is on b, a is on the table. Goal: a on c. (Training Example 1.)" },
    tower: { name: "bw-3-3000", objects: ["a", "b", "c"], init: fromTowers([["a"], ["b"], ["c"]]), goal: ["on c a", "on b c"],
      note: "All three blocks on the table. Goal: the tower b on c on a." },
    four: { name: "bw-4-demo", objects: ["a", "b", "c", "d"], init: fromTowers([["a", "d"], ["b", "c"]]), goal: ["on c d", "on b c", "on a b"],
      note: "d is on a, c is on b. Goal: the tower a on b on c on d. You will need unstack." }
  };
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function randomTowers(objs) {
    var t = [], o = shuffle(objs.slice());
    o.forEach(function (b) {
      var r = Math.floor(Math.random() * (t.length + 1));
      if (r === t.length) t.push([b]); else t[r].push(b);
    });
    return t;
  }
  function randomProblem(n) {
    var objs = "abcdef".slice(0, n).split("");
    for (var k = 0; k < 50; k++) {
      var init = fromTowers(randomTowers(objs)), goal = onFacts(randomTowers(objs));
      if (!goal.length) continue;
      var s = new Set(init);
      if (goal.every(function (g) { return s.has(g); })) continue;
      return { name: "random-" + n, objects: objs, init: init, goal: goal, note: "A random problem with " + n + " blocks." };
    }
  }

  // playground UI
  var root = document.getElementById("play");
  if (!root) return;
  var $ = function (id) { return document.getElementById(id); };
  var P, state, plan = [];
  function towersOf(s, objs) {
    var bases = objs.filter(function (b) { return s.has("ontable " + b); }), t = [];
    bases.forEach(function (b) {
      var col = [b], top = b, guard = 0;
      while (guard++ < 10) {
        var up = objs.filter(function (x) { return s.has("on " + x + " " + top); })[0];
        if (!up) break;
        col.push(up); top = up;
      }
      t.push(col);
    });
    var held = objs.filter(function (b) { return s.has("holding " + b); })[0] || null;
    return { towers: t, held: held };
  }
  function draw() {
    var box = $("world"), tw = towersOf(state, P.objects), n = P.objects.length;
    var S = 52, G = 26, slotW = S + G, W = Math.max(400, n * slotW + 160), H = 96 + Math.max(3, n) * S + 46;
    var tableY = H - 36;
    box.innerHTML = "";
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Blocks world: " + fset(state),
      style: "max-width:" + Math.round(W * 1.15) + "px;margin:0 auto" }, box);
    var tbl = el("rect", { x: 10, y: tableY, width: W - 20, height: 30, "class": "tblhit" }, svg);
    el("rect", { x: 10, y: tableY, width: W - 20, height: 6, rx: 3, "class": "tbl" }, svg);
    txt(svg, W - 16, tableY + 24, show("table: click here to put down"), { "text-anchor": "end", "class": "lbl" });
    tbl.addEventListener("click", function () { clickTable(); });
    // hand
    var hx = W / 2;
    el("path", { d: "M" + hx + ",4 V22 M" + (hx - 34) + ",34 Q" + (hx - 34) + ",22 " + hx + ",22 Q" + (hx + 34) + ",22 " + (hx + 34) + ",34", "class": "hand" }, svg);
    txt(svg, hx + 44, 20, show(tw.held ? "holding " + tw.held : "handempty"), { "class": "lbl" });
    function block(b, x, y, cls) {
      var g = el("g", { "class": "blk " + (cls || ""), tabindex: 0, role: "button", "aria-label": "block " + b }, svg);
      el("rect", { x: x, y: y, width: S, height: S, rx: 6 }, g);
      txt(g, x + S / 2, y + S / 2 + 7, b, { "text-anchor": "middle" });
      g.addEventListener("click", function () { clickBlock(b); });
      g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); clickBlock(b); } });
    }
    var x0 = (W - tw.towers.length * slotW + G) / 2;
    tw.towers.forEach(function (col, ti) {
      col.forEach(function (b, i) { block(b, x0 + ti * slotW, tableY - (i + 1) * S, ""); });
    });
    if (tw.held) block(tw.held, hx - S / 2, 36, "held");
    // facts
    var goalSet = new Set(P.goal), fx = $("facts");
    fx.innerHTML = "";
    Array.from(state).sort(function (x, y) { return show(x) < show(y) ? -1 : 1; }).forEach(function (p) {
      var sp = document.createElement("span");
      sp.textContent = show(f(p));
      if (goalSet.has(p)) { sp.className = "g"; sp.title = "part of the goal"; }
      fx.appendChild(sp);
    });
    $("goal").textContent = show(fset(P.goal));
    $("count").textContent = state.size + " true facts out of " + (n + 1) * (n + 1) + " possible";
    $("plan").value = show(plan.map(fa).join("\n"));
    if (P.goal.every(function (g) { return state.has(g); }))
      say("Goal reached in " + plan.length + " step" + (plan.length === 1 ? "" : "s") + ". Press “Check the plan” to see the Phase 1 explanation.", "good");
  }
  function say(m, cls) { var e = $("msg"); e.textContent = m; e.className = "msg " + (cls || ""); }
  function tryAct(a) {
    var miss = applicable(state, a);
    if (miss.length) {
      say(show("Not allowed: " + fa(a) + " needs " + miss.map(f).join(" and ") + ", which is not true now."), "bad");
      return;
    }
    state = apply(state, a);
    plan.push(a);
    say(show("Done: " + fa(a)), "");
    draw();
  }
  function clickBlock(b) {
    var held = P.objects.filter(function (x) { return state.has("holding " + x); })[0];
    if (held) {
      if (held === b) tryAct(["put-down", b]); else tryAct(["stack", held, b]);
      return;
    }
    if (state.has("ontable " + b)) tryAct(["pick-up", b]);
    else {
      var under = P.objects.filter(function (y) { return state.has("on " + b + " " + y); })[0];
      tryAct(["unstack", b, under]);
    }
  }
  function clickTable() {
    var held = P.objects.filter(function (x) { return state.has("holding " + x); })[0];
    if (held) tryAct(["put-down", held]);
    else say("The hand is empty. Click a block to pick it up.", "");
  }
  function problemText() {
    return show("(define (problem " + P.name + ")\n  (:domain blocksworld)\n  (:objects " + P.objects.join(" ") + ")\n  (:init " +
      P.init.map(f).join(" ") + ")\n  (:goal (and " + P.goal.map(f).join(" ") + ")))");
  }
  function load(p) {
    P = p; state = new Set(P.init); plan = [];
    $("note").textContent = P.note;
    $("ptext").textContent = problemText();
    $("out").textContent = "";
    say("Click a block to pick it up, then click another block (stack) or the table (put down).", "");
    draw();
  }
  function rules() {
    $("rules").textContent = show(
      "(pick-up ?x)    needs (clear ?x) (ontable ?x) (handempty)\n" +
      "                adds (holding ?x)   deletes (clear ?x) (ontable ?x) (handempty)\n" +
      "(put-down ?x)   needs (holding ?x)\n" +
      "                adds (clear ?x) (handempty) (ontable ?x)   deletes (holding ?x)\n" +
      "(stack ?x ?y)   needs (holding ?x) (clear ?y)\n" +
      "                adds (clear ?x) (handempty) (on ?x ?y)   deletes (holding ?x) (clear ?y)\n" +
      "(unstack ?x ?y) needs (on ?x ?y) (clear ?x) (handempty)\n" +
      "                adds (holding ?x) (clear ?y)   deletes (clear ?x) (handempty) (on ?x ?y)");
  }
  $("preset").addEventListener("change", function () {
    var v = this.value;
    load(v.indexOf("rand") === 0 ? randomProblem(+v.slice(4)) : JSON.parse(JSON.stringify(PRESETS[v])));
  });
  $("names").addEventListener("change", function () {
    mystery = this.value === "mystery";
    rules(); $("ptext").textContent = problemText(); $("out").textContent = ""; draw();
  });
  $("reset").addEventListener("click", function () { load(P); });
  $("undo").addEventListener("click", function () {
    if (!plan.length) return;
    var keep = plan.slice(0, -1);
    state = new Set(P.init); plan = [];
    keep.forEach(function (a) { state = apply(state, a); plan.push(a); });
    say("Undid the last action.", ""); draw();
  });
  $("check").addEventListener("click", function () {
    var p = parsePlan($("plan").value);
    if (!p.length) { say("Write a plan first, e.g. (pick-up a) (stack a c), or click blocks.", "bad"); return; }
    var r = explain(P, p);
    $("out").textContent = show(r.text);
    say(r.valid ? "The checker says VALID. The explanation below is exactly the kind of text Phase 1 trains on."
      : "The checker says INVALID" + (r.failed ? " at action " + r.failed : ": goal not reached") + ". See why below.", r.valid ? "good" : "bad");
  });
  $("solve").addEventListener("click", function () {
    var p = shortest(P);
    if (!p) { say("No plan exists.", "bad"); return; }
    $("plan").value = show(p.map(fa).join("\n"));
    state = new Set(P.init); plan = [];
    $("out").textContent = "";
    say("Shortest plan: " + p.length + " steps (found by searching every state). Press “Check the plan” to see it explained.", "good");
    draw(); $("plan").value = show(p.map(fa).join("\n"));
  });
  rules();
  load(JSON.parse(JSON.stringify(PRESETS.ex1)));
})();

/* ═══════════════════════════════════════════════════════
   GLOBAL ECONOMICS — PROBABILITY MODELING LAB
   app.js — C8 (Simulation) + C9 (Data Modeling)
   Juan Verastegui & Juan Cuibes | 2025-2026
═══════════════════════════════════════════════════════ */

'use strict';

// ── TAB SWITCHING ─────────────────────────────────────
function switchTab(id) {
  document.querySelectorAll('.tab-section').forEach(s => s.classList.add('hidden'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + id).classList.remove('hidden');
  document.getElementById('tab-' + id).classList.add('active');
  const buttons = document.querySelectorAll('.nav-btn');
  const map = { c8: 0, c9: 1, ai: 2 };
  buttons[map[id]].classList.add('active');
  if (id === 'c8') drawC8();
  if (id === 'c9' && c9Data.length > 0) fitAndDraw();
}

// ════════════════════════════════════════════════════════
// ══  C8: SIMULATION MODE  ════════════════════════════
// ════════════════════════════════════════════════════════

let c8Chart = null;

function onDistChange() {
  const dist = document.getElementById('distSelect').value;
  const blocks = ['uniform','triangular','linear','piecewise','normal'];
  blocks.forEach(d => {
    const el = document.getElementById('params-' + d);
    if (el) el.classList.toggle('hidden', d !== dist);
  });
  // show/hide x2
  document.getElementById('x2-row').style.display =
    document.getElementById('probType').value === 'between' ? '' : 'none';
  drawC8();
}

// Call on page load
document.addEventListener('DOMContentLoaded', () => {
  onDistChange();
  document.getElementById('probType').addEventListener('change', () => {
    document.getElementById('x2-row').style.display =
      document.getElementById('probType').value === 'between' ? '' : 'none';
    drawC8();
  });
});

/* ── PDF generators ─────────────────────────────────── */

function getUniformPDF(a, b) {
  if (b <= a) return null;
  const h = 1 / (b - a);
  const xs = linspace(a - 0.5, b + 0.5, 300);
  const ys = xs.map(x => (x >= a && x <= b) ? h : 0);
  return { xs, ys, support: [a, b], params: { a, b, h }, label: `Uniform(${a}, ${b})` };
}

function getTriangularPDF(a, b, c) {
  if (b <= a || c < a || c > b) return null;
  const n = 300;
  const xs = linspace(a - 0.2*(b-a), b + 0.2*(b-a), n);
  const ys = xs.map(x => {
    if (x < a || x > b) return 0;
    if (x <= c) return 2*(x-a)/((b-a)*(c-a));
    return 2*(b-x)/((b-a)*(b-c));
  });
  return { xs, ys, support: [a, b], params: { a, b, c }, label: `Triangular(${a}, ${b}, c=${c})` };
}

function getLinearPDF(a, b, dir) {
  if (b <= a) return null;
  // f(x) = (2/(b-a)^2)*(x-a) increasing  OR  (2/(b-a)^2)*(b-x) decreasing
  const n = 300;
  const xs = linspace(a - 0.2*(b-a), b + 0.2*(b-a), n);
  const L = b - a;
  const ys = xs.map(x => {
    if (x < a || x > b) return 0;
    return dir === 'inc' ? 2*(x-a)/(L*L) : 2*(b-x)/(L*L);
  });
  return { xs, ys, support: [a, b], params: { a, b, dir }, label: `Linear-${dir === 'inc' ? 'Increasing' : 'Decreasing'}(${a}, ${b})` };
}

function getPiecewisePDF(a1, b1, h1, b2, h2) {
  const area = h1*(b1-a1) + h2*(b2-b1);
  const warn = document.getElementById('pw-warning');
  warn.classList.toggle('hidden', Math.abs(area-1) < 1e-6);

  const n = 400;
  const xs = linspace(a1 - 0.5, b2 + 0.5, n);
  const ys = xs.map(x => {
    if (x >= a1 && x < b1) return h1;
    if (x >= b1 && x <= b2) return h2;
    return 0;
  });
  return { xs, ys, support: [a1, b2], params: { a1, b1, h1, b2, h2, area },
           label: `Piecewise [${a1},${b1}): h=${h1}, [${b1},${b2}]: h=${h2}` };
}

function getNormalPDF(mu, sigma) {
  if (sigma <= 0) return null;
  const lo = mu - 4*sigma, hi = mu + 4*sigma;
  const n = 400;
  const xs = linspace(lo, hi, n);
  const ys = xs.map(x => normalPDF(x, mu, sigma));
  return { xs, ys, support: [lo, hi], params: { mu, sigma }, label: `Normal(μ=${mu}, σ=${sigma})` };
}

/* ── CDF / probability calculators ────────────────────── */

function probUniform(a, b, x1, x2, type) {
  const cdf = x => Math.min(Math.max((x-a)/(b-a), 0), 1);
  return probFromCDF(cdf, x1, x2, type);
}

function probTriangular(a, b, c, x1, x2, type) {
  const cdf = x => {
    if (x <= a) return 0;
    if (x > b) return 1;
    if (x <= c) return (x-a)*(x-a)/((b-a)*(c-a));
    return 1 - (b-x)*(b-x)/((b-a)*(b-c));
  };
  return probFromCDF(cdf, x1, x2, type);
}

function probLinear(a, b, dir, x1, x2, type) {
  const L = b - a;
  const cdf = x => {
    if (x <= a) return 0;
    if (x >= b) return 1;
    if (dir === 'inc') return (x-a)*(x-a)/(L*L);
    return 1 - (b-x)*(b-x)/(L*L);
  };
  return probFromCDF(cdf, x1, x2, type);
}

function probPiecewise(a1, b1, h1, b2, h2, x1, x2, type) {
  const cdf = x => {
    if (x <= a1) return 0;
    if (x >= b2) return 1;
    if (x < b1) return h1*(x-a1);
    return h1*(b1-a1) + h2*(x-b1);
  };
  return probFromCDF(cdf, x1, x2, type);
}

function probNormal(mu, sigma, x1, x2, type) {
  const cdf = x => standardNormalCDF((x-mu)/sigma);
  return probFromCDF(cdf, x1, x2, type);
}

function probFromCDF(cdf, x1, x2, type) {
  if (type === 'below') return Math.max(0, Math.min(1, cdf(x1)));
  if (type === 'above') return Math.max(0, Math.min(1, 1 - cdf(x1)));
  return Math.max(0, Math.min(1, cdf(x2) - cdf(x1)));
}

/* ── Main draw function ─────────────────────────────── */

function drawC8() {
  const dist = document.getElementById('distSelect').value;
  const probType = document.getElementById('probType').value;
  const x1 = parseFloat(document.getElementById('prob_x1').value);
  const x2 = parseFloat(document.getElementById('prob_x2').value);

  let pdfData = null, prob = null, formula = '';

  if (dist === 'uniform') {
    const a = parseFloat(document.getElementById('u_a').value);
    const b = parseFloat(document.getElementById('u_b').value);
    pdfData = getUniformPDF(a, b);
    if (pdfData) {
      prob = probUniform(a, b, x1, x2, probType);
      formula = `f(x) = 1/(b−a) = 1/${(b-a).toFixed(2)} ≈ ${(1/(b-a)).toFixed(4)}   for x ∈ [${a}, ${b}]`;
    }
  } else if (dist === 'triangular') {
    const a = parseFloat(document.getElementById('t_a').value);
    const b = parseFloat(document.getElementById('t_b').value);
    const c = parseFloat(document.getElementById('t_c').value);
    pdfData = getTriangularPDF(a, b, c);
    if (pdfData) {
      prob = probTriangular(a, b, c, x1, x2, probType);
      formula = `f(x) = 2(x−a)/[(b−a)(c−a)] if x≤c;  2(b−x)/[(b−a)(b−c)] if x>c`;
    }
  } else if (dist === 'linear') {
    const a = parseFloat(document.getElementById('l_a').value);
    const b = parseFloat(document.getElementById('l_b').value);
    const dir = document.getElementById('l_dir').value;
    pdfData = getLinearPDF(a, b, dir);
    if (pdfData) {
      prob = probLinear(a, b, dir, x1, x2, probType);
      const L = (b-a).toFixed(2);
      formula = dir === 'inc'
        ? `f(x) = 2(x−${a})/(${L})²   for x ∈ [${a}, ${b}]`
        : `f(x) = 2(${b}−x)/(${L})²   for x ∈ [${a}, ${b}]`;
    }
  } else if (dist === 'piecewise') {
    const a1 = parseFloat(document.getElementById('pw_a1').value);
    const b1 = parseFloat(document.getElementById('pw_b1').value);
    const h1 = parseFloat(document.getElementById('pw_h1').value);
    const b2 = parseFloat(document.getElementById('pw_b2').value);
    const h2 = parseFloat(document.getElementById('pw_h2').value);
    pdfData = getPiecewisePDF(a1, b1, h1, b2, h2);
    if (pdfData) {
      prob = probPiecewise(a1, b1, h1, b2, h2, x1, x2, probType);
      formula = `f(x) = ${h1} on [${a1}, ${b1});  f(x) = ${h2} on [${b1}, ${b2}]  (total area = ${pdfData.params.area.toFixed(4)})`;
    }
  } else if (dist === 'normal') {
    const mu = parseFloat(document.getElementById('n_mu').value);
    const sigma = parseFloat(document.getElementById('n_sigma').value);
    pdfData = getNormalPDF(mu, sigma);
    if (pdfData) {
      prob = probNormal(mu, sigma, x1, x2, probType);
      formula = `f(x) = (1/(σ√2π)) · exp(−(x−μ)²/(2σ²))   μ=${mu}, σ=${sigma}`;
    }
  }

  if (!pdfData) { document.getElementById('probResult').textContent = 'Error'; return; }

  document.getElementById('probResult').textContent =
    prob !== null ? prob.toFixed(6) : '—';
  document.getElementById('c8-formula').textContent = formula;

  // Build shaded region dataset
  const { xs, ys, support } = pdfData;
  let shadeXs, shadeYs;
  const _x1 = (probType === 'below' || probType === 'above') ? x1 : Math.min(x1, x2);
  const _x2 = (probType === 'between') ? Math.max(x1, x2) : (probType === 'above' ? support[1] + 999 : x1);

  shadeXs = xs.map((x, i) => {
    if (probType === 'below')   return x <= _x1 ? x : null;
    if (probType === 'above')   return x >= _x1 ? x : null;
    if (probType === 'between') return (x >= _x1 && x <= _x2) ? x : null;
    return null;
  });
  shadeYs = xs.map((x, i) => {
    if (probType === 'below')   return x <= _x1 ? ys[i] : null;
    if (probType === 'above')   return x >= _x1 ? ys[i] : null;
    if (probType === 'between') return (x >= _x1 && x <= _x2) ? ys[i] : null;
    return null;
  });

  const labels = xs.map(x => x.toFixed(3));

  const datasets = [
    {
      label: pdfData.label,
      data: ys,
      borderColor: '#e8a030',
      backgroundColor: 'transparent',
      borderWidth: 2.5,
      pointRadius: 0,
      tension: 0.4,
      fill: false,
    },
    {
      label: probLabel(probType, x1, x2),
      data: shadeYs,
      borderColor: 'rgba(232,160,48,0.0)',
      backgroundColor: 'rgba(232,160,48,0.28)',
      borderWidth: 0,
      pointRadius: 0,
      tension: 0.4,
      fill: 'origin',
    }
  ];

  renderChart('c8chart', c8Chart, labels, datasets, pdfData.label, (chart) => { c8Chart = chart; });
}

function probLabel(type, x1, x2) {
  if (type === 'below') return `P(X < ${x1})`;
  if (type === 'above') return `P(X > ${x1})`;
  return `P(${Math.min(x1,x2)} < X < ${Math.max(x1,x2)})`;
}

// ════════════════════════════════════════════════════════
// ══  C9: DATA MODELING MODE  ═════════════════════════
// ════════════════════════════════════════════════════════

let c9Chart = null;
let c9Data = [];
let csvParsed = {};  // { colName: [values] }

/* ── CSV loading ─────────────────────────────────────── */

function loadCSV(event) {
  const file = event.target.files[0];
  if (!file) return;
  document.getElementById('uploadedName').textContent = file.name;
  const reader = new FileReader();
  reader.onload = e => {
    parseCSVText(e.target.result);
  };
  reader.readAsText(file);
}

function parseCSVText(text) {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return;
  const headers = lines[0].split(',').map(h => h.trim());
  csvParsed = {};
  headers.forEach(h => csvParsed[h] = []);
  lines.slice(1).forEach(line => {
    const cols = line.split(',').map(c => c.trim());
    headers.forEach((h, i) => {
      const v = parseFloat(cols[i]);
      if (!isNaN(v)) csvParsed[h].push(v);
    });
  });
  populateColSelect(headers);
  selectCol();
}

function parsePaste() {
  const text = document.getElementById('pasteData').value;
  const values = text.trim().split(/\s+|\n|,/).map(Number).filter(v => !isNaN(v));
  if (values.length === 0) return;
  csvParsed = { 'values': values };
  populateColSelect(['values']);
  c9Data = values;
  fitAndDraw();
}

function populateColSelect(headers) {
  const sel = document.getElementById('colSelect');
  sel.innerHTML = '';
  // Only numeric columns
  const numericHeaders = headers.filter(h => (csvParsed[h] || []).length > 0);
  numericHeaders.forEach(h => {
    const opt = document.createElement('option');
    opt.value = h;
    opt.textContent = `${h} (n=${(csvParsed[h]||[]).length})`;
    sel.appendChild(opt);
  });
}

function selectCol() {
  const col = document.getElementById('colSelect').value;
  if (!col || !csvParsed[col]) return;
  c9Data = csvParsed[col];
  fitAndDraw();
}

/* ── Built-in datasets ───────────────────────────────── */

// Dataset 1 — weekly screen time (hours/week)
const DS1 = {
  weekly_screen_time_hours: [11.2,13.5,9.8,12.7,14.1,10.9,15.3,8.7,12.1,13.8,16,9.4,11.7,14.8,10.2,12.9,15.6,13.1,11,14.4,
    18.6,20.1,17.9,22.4,19.3,21.7,16.8,23.1,20.8,18.1,24,19.9,21.2,17.5,22.8,25.3,18.9,20.5,23.6,19.7,
    7.1,8.3,6.5,9.2,7.8,10.1,5.9,8.7,6.8,9.6,7.4,10.8,6.2,8,9,5.6,11.3,7.7,8.9,6.9]
};

// Dataset 2 — delivery time (min)
const DS2 = {
  delivery_time_min: [34.2,36.8,31.5,40.1,38.7,35.9,42.6,33.8,37.4,39.9,41.3,30.7,32.9,36.1,43.5,44.2,29.8,34.7,37,45.1,
    51.6,48.9,53.4,50.2,55.7,47.8,52.5,49.6,56.1,54,46.9,57.4,58.2,52.1,50.8,59.5,45.7,54.8,51.3,60.4,
    27.4,29.1,31.8,26.7,33.5,30.6,28.3,34.2,32.7,25.9,35.1,36.4,27.8,29.9,31.2,37,24.8,33.1,30.1,34.9]
};

// Dataset 3 — resale value (USD)
const DS3 = {
  resale_value_usd: [410,425,438,452,467,480,495,508,520,535,548,562,575,589,603,617,630,644,659,673,
    355,372,388,401,419,436,450,468,482,499,515,531,548,563,579,596,612,629,645,662,
    290,305,319,334,348,361,377,392,406,421,435,449,464,478,493,507,522,536,551,565]
};

function loadBuiltinDataset(n) {
  const map = { 1: DS1, 2: DS2, 3: DS3 };
  const ds = map[n];
  csvParsed = ds;
  const cols = Object.keys(ds);
  populateColSelect(cols);
  document.getElementById('uploadedName').textContent = `Dataset ${n} (built-in)`;
  selectCol();
}

/* ── Parameter estimation ────────────────────────────── */

function estimateParams(data, dist) {
  const mn = Math.min(...data);
  const mx = Math.max(...data);
  const mu = mean(data);
  const sigma = std(data);

  if (dist === 'uniform') {
    return { a: mn, b: mx };
  }
  if (dist === 'triangular') {
    // Mode estimated as value at histogram peak
    const mode = histMode(data);
    return { a: mn, b: mx, c: mode };
  }
  if (dist === 'linear') {
    // Choose direction based on skewness
    const sk = skewness(data);
    const dir = sk >= 0 ? 'inc' : 'dec';
    return { a: mn, b: mx, dir };
  }
  if (dist === 'piecewise') {
    // Split into two halves at the median
    const med = median(data);
    return { a1: mn, b1: med, h1: 0.5/(med-mn), b2: mx, h2: 0.5/(mx-med) };
  }
  if (dist === 'normal') {
    return { mu, sigma };
  }
}

/* ── Fit + Draw ──────────────────────────────────────── */

function fitAndDraw() {
  if (!c9Data || c9Data.length === 0) return;
  const dist = document.getElementById('fitDist').value;
  const params = estimateParams(c9Data, dist);

  // Show params
  const paramsBox = document.getElementById('fitted-params');
  const paramsContent = document.getElementById('fitted-params-content');
  paramsBox.classList.remove('hidden');
  paramsContent.innerHTML = Object.entries(params)
    .map(([k,v]) => `<div class="param-line"><em>${k}</em> = ${typeof v === 'number' ? v.toFixed(4) : v}</div>`)
    .join('');

  // Build PDF
  const mn = Math.min(...c9Data), mx = Math.max(...c9Data);
  const pad = 0.1 * (mx - mn);
  const pdfXs = linspace(mn - pad, mx + pad, 400);
  let pdfYs;

  if (dist === 'uniform') {
    const {a, b} = params;
    const h = 1/(b-a);
    pdfYs = pdfXs.map(x => (x>=a && x<=b) ? h : 0);
  } else if (dist === 'triangular') {
    const {a, b, c} = params;
    pdfYs = pdfXs.map(x => {
      if (x < a || x > b) return 0;
      if (x <= c) return 2*(x-a)/((b-a)*(c-a));
      return 2*(b-x)/((b-a)*(b-c));
    });
  } else if (dist === 'linear') {
    const {a, b, dir} = params;
    const L = b - a;
    pdfYs = pdfXs.map(x => {
      if (x < a || x > b) return 0;
      return dir === 'inc' ? 2*(x-a)/(L*L) : 2*(b-x)/(L*L);
    });
  } else if (dist === 'piecewise') {
    const {a1, b1, h1, b2, h2} = params;
    pdfYs = pdfXs.map(x => {
      if (x < a1 || x > b2) return 0;
      return x < b1 ? h1 : h2;
    });
  } else if (dist === 'normal') {
    const {mu, sigma} = params;
    pdfYs = pdfXs.map(x => normalPDF(x, mu, sigma));
  }

  // Build histogram
  const bins = 12;
  const { binEdges, counts, density } = computeHistogram(c9Data, bins);
  const histLabels = binEdges.slice(0,-1).map((e,i) => ((e+binEdges[i+1])/2).toFixed(2));

  // Stats
  const muV = mean(c9Data), sdV = std(c9Data);
  showStats(c9Data.length, muV, sdV, mn, mx);

  // Interpretation
  showInterpretation(dist, params, c9Data, muV, sdV);

  // Prepare chart data — use pdfXs as labels, match histogram to those labels
  // We'll overlay both using dual approach: histogram as bar, PDF as line
  const allLabels = pdfXs.map(x => x.toFixed(3));

  // Map histogram density to pdf x positions
  const histDensityAtPdfX = pdfXs.map(x => {
    const bi = binEdges.findIndex((e, i) => i < binEdges.length-1 && x >= e && x < binEdges[i+1]);
    return bi >= 0 ? density[bi] : 0;
  });

  const datasets = [
    {
      label: 'Empirical histogram',
      data: histDensityAtPdfX,
      backgroundColor: 'rgba(30,51,88,0.85)',
      borderColor: 'rgba(138,150,168,0.5)',
      borderWidth: 1,
      type: 'bar',
      barPercentage: 1.0,
      categoryPercentage: 1.0,
      order: 2,
    },
    {
      label: `Fitted ${dist} PDF`,
      data: pdfYs,
      borderColor: '#e8a030',
      backgroundColor: 'rgba(232,160,48,0.1)',
      borderWidth: 2.5,
      pointRadius: 0,
      tension: 0.4,
      type: 'line',
      fill: false,
      order: 1,
    }
  ];

  if (c9Chart) { c9Chart.destroy(); c9Chart = null; }
  const ctx = document.getElementById('c9chart').getContext('2d');
  c9Chart = new Chart(ctx, {
    type: 'bar',
    data: { labels: allLabels, datasets },
    options: chartOptions(`Fitted ${capitalise(dist)} Distribution vs. Histogram`, true)
  });
}

function showStats(n, mu, sigma, mn, mx) {
  const bar = document.getElementById('c9-stats');
  bar.classList.remove('hidden');
  document.getElementById('stat-n').innerHTML    = `<strong>n</strong> = ${n}`;
  document.getElementById('stat-mean').innerHTML = `<strong>μ̂</strong> = ${mu.toFixed(3)}`;
  document.getElementById('stat-std').innerHTML  = `<strong>σ̂</strong> = ${sigma.toFixed(3)}`;
  document.getElementById('stat-min').innerHTML  = `<strong>min</strong> = ${mn.toFixed(3)}`;
  document.getElementById('stat-max').innerHTML  = `<strong>max</strong> = ${mx.toFixed(3)}`;
}

function showInterpretation(dist, params, data, mu, sigma) {
  const box = document.getElementById('fit-interpretation');
  const txt = document.getElementById('fit-interp-text');
  box.classList.remove('hidden');

  const mn = Math.min(...data), mx = Math.max(...data);
  const range = mx - mn;
  const sk = skewness(data).toFixed(2);

  const msgs = {
    uniform: `The uniform fit assigns equal density ${(1/(params.b-params.a)).toFixed(4)} across [${params.a.toFixed(2)}, ${params.b.toFixed(2)}]. `
      + `It is reasonable if the data is roughly flat across the range. `
      + `With skewness ≈ ${sk}, ${Math.abs(sk) < 0.5 ? 'the data appears fairly symmetric — a decent fit.' : 'notable skew suggests a better model may exist.'}`,

    triangular: `The triangular fit has support [${params.a.toFixed(2)}, ${params.b.toFixed(2)}] and mode ≈ ${params.c.toFixed(2)}. `
      + `It is appropriate when data peaks near the center and tapers off symmetrically. `
      + `Skewness ≈ ${sk} indicates ${Math.abs(sk) < 0.8 ? 'a moderate peak — reasonable fit.' : 'heavier tails than the triangular model assumes.'}`,

    linear: `A ${params.dir === 'inc' ? 'increasing' : 'decreasing'} linear PDF on [${params.a.toFixed(2)}, ${params.b.toFixed(2)}] was fitted (skewness = ${sk}). `
      + `This model is plausible when density changes monotonically. `
      + `${Math.abs(sk) > 0.4 ? 'The sign of skewness supports this direction.' : 'Low skewness suggests a more symmetric model might fit better.'}`,

    piecewise: `A two-piece piecewise uniform fit was applied with heights h₁ ≈ ${params.h1.toFixed(4)} on [${params.a1.toFixed(2)}, ${params.b1.toFixed(2)}) `
      + `and h₂ ≈ ${params.h2.toFixed(4)} on [${params.b1.toFixed(2)}, ${params.b2.toFixed(2)}]. `
      + `This model flexibly captures a step-change in density and may suit data with two distinct intensity regions.`,

    normal: `The normal fit has μ̂ = ${params.mu.toFixed(3)}, σ̂ = ${params.sigma.toFixed(3)}. `
      + `The empirical skewness is ${sk}; `
      + `${Math.abs(sk) < 0.5 ? 'this is close to 0, supporting normality.' : 'a skewness far from 0 suggests the normal model may underfit the tails.'} `
      + `The 68-95-99.7 rule predicts ~68% of values within one standard deviation of the mean.`
  };

  txt.textContent = msgs[dist] || 'No interpretation available.';
}

// ════════════════════════════════════════════════════════
// ══  CHART RENDERING HELPER  ═════════════════════════
// ════════════════════════════════════════════════════════

function renderChart(canvasId, existingChart, labels, datasets, title, callback) {
  if (existingChart) { existingChart.destroy(); existingChart = null; }
  const ctx = document.getElementById(canvasId).getContext('2d');
  const chart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: chartOptions(title, false)
  });
  callback(chart);
}

function chartOptions(title, mixed) {
  return {
    responsive: true,
    maintainAspectRatio: true,
    animation: { duration: 300 },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        labels: {
          color: '#8a96a8',
          font: { family: "'DM Mono', monospace", size: 11 }
        }
      },
      title: {
        display: true,
        text: title,
        color: '#e8edf5',
        font: { family: "'DM Serif Display', serif", size: 15 },
        padding: { bottom: 12 }
      },
      tooltip: {
        backgroundColor: 'rgba(21,36,64,0.95)',
        borderColor: '#2a3d5a',
        borderWidth: 1,
        titleColor: '#e8a030',
        bodyColor: '#8a96a8',
        titleFont: { family: "'DM Mono', monospace", size: 11 },
        bodyFont: { family: "'DM Mono', monospace", size: 11 },
        callbacks: {
          label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y !== null ? ctx.parsed.y.toFixed(5) : '—'}`
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#8a96a8',
          font: { family: "'DM Mono', monospace", size: 10 },
          maxTicksLimit: 10,
          maxRotation: 0
        },
        grid: { color: 'rgba(42,61,90,0.6)' }
      },
      y: {
        ticks: {
          color: '#8a96a8',
          font: { family: "'DM Mono', monospace", size: 10 }
        },
        grid: { color: 'rgba(42,61,90,0.6)' },
        title: {
          display: true,
          text: 'Density f(x)',
          color: '#8a96a8',
          font: { family: "'DM Mono', monospace", size: 11 }
        }
      }
    }
  };
}

// ════════════════════════════════════════════════════════
// ══  MATH UTILITIES  ══════════════════════════════════
// ════════════════════════════════════════════════════════

function linspace(a, b, n) {
  const arr = [];
  const step = (b - a) / (n - 1);
  for (let i = 0; i < n; i++) arr.push(a + i * step);
  return arr;
}

function normalPDF(x, mu, sigma) {
  return Math.exp(-0.5*((x-mu)/sigma)**2) / (sigma * Math.sqrt(2*Math.PI));
}

// Rational approximation for standard normal CDF
function standardNormalCDF(z) {
  const a1=0.254829592, a2=-0.284496736, a3=1.421413741, a4=-1.453152027, a5=1.061405429;
  const p=0.3275911;
  const sign = z < 0 ? -1 : 1;
  z = Math.abs(z);
  const t = 1 / (1 + p * z);
  const y = 1 - (((((a5*t+a4)*t)+a3)*t+a2)*t+a1)*t*Math.exp(-z*z);
  return 0.5 * (1 + sign * y);
}

function mean(arr) {
  return arr.reduce((s,v) => s+v, 0) / arr.length;
}

function std(arr) {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s,v) => s+(v-m)**2, 0) / arr.length);
}

function median(arr) {
  const s = [...arr].sort((a,b) => a-b);
  const mid = Math.floor(s.length/2);
  return s.length % 2 ? s[mid] : (s[mid-1]+s[mid])/2;
}

function skewness(arr) {
  const m = mean(arr), s = std(arr);
  if (s === 0) return 0;
  return arr.reduce((sum, v) => sum + ((v-m)/s)**3, 0) / arr.length;
}

function histMode(data) {
  const mn = Math.min(...data), mx = Math.max(...data);
  const bins = 10;
  const bw = (mx-mn)/bins;
  const counts = new Array(bins).fill(0);
  data.forEach(v => {
    const i = Math.min(Math.floor((v-mn)/bw), bins-1);
    counts[i]++;
  });
  const maxBin = counts.indexOf(Math.max(...counts));
  return mn + (maxBin + 0.5) * bw;
}

function computeHistogram(data, bins) {
  const mn = Math.min(...data), mx = Math.max(...data);
  const bw = (mx - mn) / bins;
  const binEdges = linspace(mn, mx + 1e-10, bins + 1);
  const counts = new Array(bins).fill(0);
  const n = data.length;
  data.forEach(v => {
    const i = Math.min(Math.floor((v - mn) / bw), bins - 1);
    counts[i]++;
  });
  const density = counts.map(c => c / (n * bw));
  return { binEdges, counts, density };
}

function capitalise(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Init ───────────────────────────────────────────────
window.addEventListener('load', () => {
  drawC8();
});

// js/main.js
let interactiveMode = true;
let headingsTyped = false;
let keyclickAudio = null;
let chartsInitialized = false;
let dataLoadPromise = null;
let pageActivated = false;
let hexSvg = null;
let hexState = null;
let overlayElement = null;
let overlayPromptScroll = null;
let overlayPromptInteractive = null;

function activatePage() {
  if (pageActivated) return;
  pageActivated = true;

  document.body.classList.remove("overlay-locked");
  overlayPromptInteractive.style.display = "none";
  overlayPromptScroll.style.display = "block";

  overlayPromptScroll.classList.add("overlay-hint");

  setupOverlayFade();
  waitForOverlayThenType();
  initCharts();
}

function waitForOverlayThenType() {
  if (headingsTyped) return;
  function check() {
    const overlay = document.getElementById("landing-overlay");
    if (!overlay || overlay.style.display === "none" || overlay.style.opacity === "0") {
      initHeadingTyping();
      return;
    }
    requestAnimationFrame(check);
  }
  requestAnimationFrame(check);
}

function setupOverlayFade() {
  const overlay = document.getElementById("landing-overlay");
  if (!overlay) return;

  overlay.style.opacity = "1";
  overlay.style.display = "flex";
  window.scrollTo(0, 0);

  let active = true;

  function onScroll() {
    if (!active) return;
    const h = window.innerHeight || 1;
    const y = window.scrollY || 0;
    const progress = Math.max(0, Math.min(y / h, 1));
    overlay.style.opacity = String(1 - progress);
    if (progress >= 1) {
      active = false;
      overlay.style.display = "none";
      window.removeEventListener("scroll", onScroll);
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
}

function wireOverlay() {
  overlayElement = document.getElementById("landing-overlay");
  overlayPromptScroll = document.getElementById("overlay-prompt-scroll");
  overlayPromptInteractive = document.getElementById("overlay-prompt-interactive");
  const overlayInput = document.getElementById("overlay-input");

  if (!overlayElement || !overlayPromptScroll || !overlayPromptInteractive || !overlayInput) {
    return;
  }

  document.body.classList.remove("no-js");
  overlayPromptInteractive.style.display = "none";
  overlayPromptScroll.style.display = "block";
  overlayPromptScroll.classList.remove("overlay-hint");

  let transitionedToInteractive = false;

  function showInteractivePrompt() {
    if (transitionedToInteractive || pageActivated) return;
    transitionedToInteractive = true;

    overlayPromptScroll.style.display = "none";
    overlayPromptInteractive.style.display = "block";
    overlayInput.value = "";
    overlayInput.focus();
  }

  window.addEventListener("scroll", showInteractivePrompt, { passive: true, once: true });
  window.addEventListener("wheel", showInteractivePrompt, { passive: true, once: true });
  window.addEventListener("click", showInteractivePrompt, { once: true });
  window.addEventListener("keydown", (event) => {
    if (transitionedToInteractive || pageActivated) return;
    // Ignore modifier-only keys; others count as interaction.
    if (event.key && event.key.length === 1 || event.key === "Enter" || event.key === " ") {
      showInteractivePrompt();
    }
  }, { once: true });

  overlayInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const value = overlayInput.value.trim();
    if (/^n/i.test(value)) {
      interactiveMode = false;
    } else if (/^y/i.test(value)) {
      interactiveMode = true;
    }

    overlayInput.value = "";
    overlayInput.blur();

    activatePage();
  });
}

function buildHexagon() {
  if (!hexSvg) return;
  hexSvg.innerHTML = "";
  const accent = "#5ad1ff";
  const accent2 = "#7aa7ff";
  const frame = "#6f7684";

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const grad = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
  grad.setAttribute("id", "cubeTop");
  grad.setAttribute("x1", "0%");
  grad.setAttribute("y1", "0%");
  grad.setAttribute("x2", "100%");
  grad.setAttribute("y2", "100%");
  const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
  stop1.setAttribute("offset", "0%");
  stop1.setAttribute("stop-color", accent);
  const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
  stop2.setAttribute("offset", "100%");
  stop2.setAttribute("stop-color", accent2);
  grad.append(stop1, stop2);
  defs.appendChild(grad);
  hexSvg.appendChild(defs);

  const ring1 = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  ring1.setAttribute("fill", "none");
  ring1.setAttribute("stroke", frame);
  ring1.setAttribute("stroke-width", "2");
  ring1.setAttribute("opacity", "0.9");

  const ring2 = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  ring2.setAttribute("fill", "none");
  ring2.setAttribute("stroke", accent);
  ring2.setAttribute("stroke-width", "1.6");
  ring2.setAttribute("opacity", "0.9");

  const ring3 = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  ring3.setAttribute("fill", "none");
  ring3.setAttribute("stroke", accent2);
  ring3.setAttribute("stroke-width", "1.2");
  ring3.setAttribute("opacity", "0.9");

  const core = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  core.setAttribute("r", "6");
  core.setAttribute("fill", "url(#cubeTop)");
  core.setAttribute("stroke", accent2);
  core.setAttribute("stroke-width", "1.2");
  core.setAttribute("opacity", "0.95");

  hexSvg.append(ring1, ring2, ring3, core);
  hexState = { ring1, ring2, ring3, core };
  renderHexagon(0);
  window.addEventListener("scroll", handleHexScroll, { passive: true });
}

function buildHexPoints(cx, cy, radius) {
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    points.push(`${x},${y}`);
  }
  return points.join(" ");
}

function handleHexScroll() {
  if (!hexState) return;
  const progress = clamp(window.scrollY / (window.innerHeight * 1.8), 0, 1);
  renderHexagon(progress);
}

function renderHexagon(t) {
  if (!hexState) return;
  const { ring1, ring2, ring3, core } = hexState;
  const cx = 100;
  const cy = 100;
  const radii = [78, 60, 44].map((r, i) => r - i * 4 + t * 8);
  const scales = [1, 0.92, 0.84];
  const spins = [t * 220, -t * 180, t * 260];
  const rings = [ring1, ring2, ring3];

  rings.forEach((ring, idx) => {
    const pts = buildHexPoints(cx, cy, radii[idx]);
    ring.setAttribute("points", pts);
    ring.setAttribute("transform", `rotate(${spins[idx]} ${cx} ${cy}) scale(${scales[idx]})`);
  });

  const coreScale = 0.9 + 0.1 * t;
  core.setAttribute("cx", cx);
  core.setAttribute("cy", cy);
  core.setAttribute("transform", `scale(${coreScale}) translate(${cx * (1 / coreScale - 1)} ${cy * (1 / coreScale - 1)})`);
}

function initLottie() {
  if (!window.lottie) return;
  lottie.loadAnimation({
    container: document.getElementById("lottie-container"),
    renderer: "svg",
    loop: true,
    autoplay: true,
    path: "animations/ai_timeline.json",
  });
}

function playKeyclick() {
  if (!keyclickAudio) {
    keyclickAudio = document.getElementById("keyclick-sound");
  }
  if (!keyclickAudio) return;
  try {
    keyclickAudio.currentTime = 0;
    keyclickAudio.play();
  } catch (e) {}
}

function typeText(node, fullText, speedMs, withSound) {
  return new Promise((resolve) => {
    if (!node) {
      resolve();
      return;
    }

    const text = (fullText != null ? fullText : node.textContent) || "";
    node.textContent = "";
    const cursor = document.createElement("span");
    cursor.className = "cli-cursor";
    node.appendChild(cursor);

    let i = 0;
    let cancelled = false;

    function finish() {
      cursor.remove();
      node.textContent = text;
      resolve();
    }

    function step() {
      if (cancelled || i >= text.length) {
        finish();
        return;
      }
      const ch = text.charAt(i);
      cursor.insertAdjacentText("beforebegin", ch);
      i += 1;
      if (withSound && ch !== " " && i % 3 === 0) {
        playKeyclick();
      }
      setTimeout(step, speedMs);
    }

    function skip() {
      cancelled = true;
      window.removeEventListener("click", skip);
      window.removeEventListener("keydown", skip);
    }

    window.addEventListener("click", skip, { once: true });
    window.addEventListener("keydown", skip, { once: true });

    step();
  });
}

async function initHeadingTyping() {
  if (headingsTyped) return;
  headingsTyped = true;

  const headings = Array.from(document.querySelectorAll("[data-typed-heading]"));
  if (!headings.length) return;

  if (!interactiveMode) {
    return;
  }

  for (const h of headings) {
    const fullText = h.textContent.trim();
    await typeText(h, fullText, 40, true);
  }
}

function initCharts() {
  if (chartsInitialized) return;
  ensureDataSets() 
    .then(() => {
      if (chartsInitialized) return;
      initOutputEmploymentChart();
      initAsmChart();
      initOecdChart();
      initGscpiProxyChart();
      initScrapUptimeChart();
      initCapexProxyChart();
      initRelativeWagesChart();
      chartsInitialized = true;
    })
    .catch((error) => {
      console.warn("Charts will render with fallback data:", error);
      initOutputEmploymentChart();
      initAsmChart();
      initOecdChart();
      initGscpiProxyChart();
      initScrapUptimeChart();
      initCapexProxyChart();
      initRelativeWagesChart();
      chartsInitialized = true;
    });
}

function getChartTheme() {
  const cs = getComputedStyle(document.documentElement);
  const text = cs.getPropertyValue("--text") || "#f3f4f8";
  const grid = "rgba(255,255,255,0.12)";
  const accent1 = cs.getPropertyValue("--accent") || "#35c5ff";
  const accent2 = "#40dcc5";
  const accent3 = "#d5d7dd";
  return { text, grid, accent1, accent2, accent3 };
}

function safeCreateChart(canvas, config) {
  if (!canvas || !window.Chart) return null;
  const existing = Chart.getChart(canvas);
  if (existing) existing.destroy();
  return new Chart(canvas.getContext("2d"), config);
}

function initOutputEmploymentChart() {
  const canvas = document.getElementById("chart-output-vs-employment");
  if (!canvas || !window.dataSets || !window.dataSets.IPMAN || !window.dataSets.MANEMP) return;

  canvas.height = 260;

  const { text, grid, accent1, accent2 } = getChartTheme();

  let labels = window.dataSets.IPMAN.map(d => d.date);
  let ipVals = window.dataSets.IPMAN.map(d => d.value);
  let emVals = window.dataSets.MANEMP.map(d => d.value);

  function toIndex(values) {
    const base = values.find(v => v != null);
    if (!base) return values;
    return values.map(v => v == null ? null : (v / base) * 100);
  }

  let ipIndex = toIndex(ipVals);
  let emIndex = toIndex(emVals);

  const maxPoints = 300;
  if (labels.length > maxPoints) {
    const step = Math.ceil(labels.length / maxPoints);
    const dsLabels = [];
    const dsIp = [];
    const dsEm = [];
    for (let i = 0; i < labels.length; i += step) {
      dsLabels.push(labels[i]);
      dsIp.push(ipIndex[i]);
      dsEm.push(emIndex[i]);
    }
    labels = dsLabels;
    ipIndex = dsIp;
    emIndex = dsEm;
  }

  safeCreateChart(canvas, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Output (IPMAN, index)",
          data: ipIndex,
          borderColor: accent1,
          borderWidth: 2,
          tension: 0.22,
          pointRadius: 0
        },
        {
          label: "Employment (MANEMP, index)",
          data: emIndex,
          borderColor: accent2,
          borderWidth: 2,
          tension: 0.22,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { labels: { color: text } }
      },
      scales: {
        x: { 
            ticks: { 
                color: text,
                maxTicksLimit: 10,
                callback: function(value, index, values) {
                    const label = this.getLabelForValue(value);
                    return label.substring(0,4);
                }
            }, 
            grid: { color: grid } 
        },
        y: { 
            ticks: { color: text }, 
            grid: { color: grid },
            title: { display: true, text: "Index (Base Year = 100)", color: text }
        }
      }
    }
  });
}

function initGscpiProxyChart() {
  const canvas = document.getElementById("chart-gscpi-proxy");
  if (!canvas || !window.dataSets || !window.dataSets.IPMAN) return;

  canvas.height = 260;

  const { text, grid, accent1 } = getChartTheme();
  let labels = window.dataSets.IPMAN.map(d => d.date);
  let values = window.dataSets.IPMAN.map(d => d.value);

  const maxPoints = 300;
  if (labels.length > maxPoints) {
    const step = Math.ceil(labels.length / maxPoints);
    const dsLabels = [];
    const dsVals = [];
    for (let i = 0; i < labels.length; i += step) {
      dsLabels.push(labels[i]);
      dsVals.push(values[i]);
    }
    labels = dsLabels;
    values = dsVals;
  }

  safeCreateChart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Industrial production (IPMAN)",
          data: values,
          borderColor: accent1,
          borderWidth: 2,
          tension: 0.18,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { labels: { color: text } }
      },
      scales: {
        x: {
          ticks: {
            color: text,
            maxTicksLimit: 10,
            callback: function(value) {
              const label = this.getLabelForValue(value);
              return label.substring(0, 4);
            }
          },
          grid: { color: grid }
        },
        y: {
          ticks: { color: text },
          grid: { color: grid }
        }
      }
    }
  });
}

function initAsmChart() {
  const canvas = document.getElementById("chart-asm-benchmark");
  if (!canvas || !window.dataSets || !window.dataSets.asmBenchmark2022) return;

  canvas.height = 260;

  const { text, grid, accent1 } = getChartTheme();
  const rows = window.dataSets.asmBenchmark2022.slice();

  rows.sort((a, b) => (b.adoptionRate || 0) - (a.adoptionRate || 0));
  const top = rows.slice(0, 8).reverse();

  const labels = top.map(r => r.industry);
  const values = top.map(r => r.adoptionRate);

  safeCreateChart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Adoption rate (%)",
          data: values,
          backgroundColor: accent1
        }
      ]
    },
    options: {
      indexAxis: "y",
      responsive: false,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
            callbacks: {
                label: (context) => `${context.raw.toFixed(1)}%`
            }
        }
      },
      scales: {
        x: {
          ticks: { color: text, callback: (v) => `${v}%` },
          grid: { color: grid }
        },
        y: {
          ticks: { color: text },
          grid: { display: false }
        }
      }
    }
  });
}

function initScrapUptimeChart() {
  const canvas = document.getElementById("chart-scrap-uptime");
  if (!canvas || !window.dataSets || !window.dataSets.asmBenchmark2022) return;

  canvas.height = 260;

  const { text, grid, accent1, accent2 } = getChartTheme();
  const rows = window.dataSets.asmBenchmark2022.slice();

  rows.sort((a, b) => (b.adoptionRate || 0) - (a.adoptionRate || 0));
  const top = rows.slice(0, 5).reverse();

  const labels = top.map(r => r.industry);
  const values = top.map(r => r.adoptionRate);

  safeCreateChart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Adoption rate (%)",
          data: values,
          backgroundColor: [accent1, accent1, accent2, accent2, accent1]
        }
      ]
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `${context.raw.toFixed(1)}%`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: text },
          grid: { display: false }
        },
        y: {
          ticks: {
            color: text,
            callback: (v) => `${v}%`
          },
          grid: { color: grid }
        }
      }
    }
  });
}

function initOecdChart() {
  const canvas = document.getElementById("chart-oecd-wages");
  if (!canvas || !window.dataSets || !window.dataSets.oecdAvgAnnualWages) return;

  canvas.height = 260;

  const { text, grid, accent1, accent2, accent3 } = getChartTheme();
  const rows = window.dataSets.oecdAvgAnnualWages.slice();

  const years = Array.from(new Set(rows.map(r => r.year))).sort((a, b) => b - a);
  const latestYear = years[0] || new Date().getFullYear() - 1;

  const countriesOfInterest = ["United States", "Germany", "China", "Mexico", "Japan", "Korea"];
  const series = rows.filter(r => r.year === latestYear && countriesOfInterest.includes(r.country))
                     .sort((a, b) => b.wage - a.wage);

  const labels = series.map(r => r.country);
  const values = series.map(r => r.wage);

  const colors = [accent1, accent2, accent3, "#ffb347", "#ff8c42", "#a16eff"].slice(0, labels.length);

  safeCreateChart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: `Average annual wages, ${latestYear}`,
          data: values,
          backgroundColor: colors
        }
      ]
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: `Avg. Annual Wages in Manufacturing, ${latestYear} (USD)`,
          color: text
        },
        tooltip: {
            callbacks: {
                label: (context) => `$${context.raw.toLocaleString()}`
            }
        }
      },
      scales: {
        x: {
          ticks: { color: text },
          grid: { display: false }
        },
        y: {
          ticks: { color: text, callback: (v) => `$${(v/1000)}k` },
          grid: { color: grid }
        }
      }
    }
  });
}

function initCapexProxyChart() {
  const canvas = document.getElementById("chart-capex-proxy");
  if (!canvas || !window.dataSets || !window.dataSets.IPMAN || !window.dataSets.MANEMP) return;

  canvas.height = 260;

  const { text, grid, accent1 } = getChartTheme();
  const ip = window.dataSets.IPMAN;
  const em = window.dataSets.MANEMP;

  const emByDate = new Map(em.map(d => [d.date, d.value]));
  const joined = [];
  for (const d of ip) {
    const emVal = emByDate.get(d.date);
    if (emVal != null && emVal !== 0) {
      joined.push({
        date: d.date,
        ratio: d.value / emVal
      });
    }
  }

  if (!joined.length) return;

  let labels = joined.map(d => d.date);
  let values = joined.map(d => d.ratio);

  const base = values.find(v => v != null);
  if (base) {
    values = values.map(v => v == null ? null : (v / base) * 100);
  }

  const maxPoints = 300;
  if (labels.length > maxPoints) {
    const step = Math.ceil(labels.length / maxPoints);
    const dsLabels = [];
    const dsVals = [];
    for (let i = 0; i < labels.length; i += step) {
      dsLabels.push(labels[i]);
      dsVals.push(values[i]);
    }
    labels = dsLabels;
    values = dsVals;
  }

  safeCreateChart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Output per job (index)",
          data: values,
          borderColor: accent1,
          borderWidth: 2,
          tension: 0.2,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { labels: { color: text } }
      },
      scales: {
        x: {
          ticks: {
            color: text,
            maxTicksLimit: 10,
            callback: function(value) {
              const label = this.getLabelForValue(value);
              return label.substring(0, 4);
            }
          },
          grid: { color: grid }
        },
        y: {
          ticks: { color: text },
          grid: { color: grid },
          title: {
            display: true,
            text: "Index (base year = 100)",
            color: text
          }
        }
      }
    }
  });
}

function initRelativeWagesChart() {
  const canvas = document.getElementById("chart-relative-wages");
  if (!canvas || !window.dataSets || !window.dataSets.oecdAvgAnnualWages) return;

  canvas.height = 260;

  const { text, grid, accent1, accent2, accent3 } = getChartTheme();
  const rows = window.dataSets.oecdAvgAnnualWages.slice();

  const years = Array.from(new Set(rows.map(r => r.year))).sort((a, b) => b - a);
  const latestYear = years[0] || new Date().getFullYear() - 1;

  const yearRows = rows.filter(r => r.year === latestYear);
  const usRow = yearRows.find(r => r.country === "United States");
  if (!usRow || !usRow.wage) return;

  const countriesOfInterest = ["United States", "Germany", "China", "Mexico", "Japan", "Korea"];
  const series = yearRows
    .filter(r => countriesOfInterest.includes(r.country))
    .map(r => ({
      country: r.country,
      ratio: r.wage / usRow.wage
    }))
    .sort((a, b) => b.ratio - a.ratio);

  const labels = series.map(r => r.country);
  const values = series.map(r => r.ratio);

  const colors = [accent1, accent2, accent3, "#ffb347", "#ff8c42", "#a16eff"].slice(0, labels.length);

  safeCreateChart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: `Relative wages, ${latestYear} (US = 1.0)`,
          data: values,
          backgroundColor: colors
        }
      ]
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => context.raw.toFixed(2)
          }
        }
      },
      scales: {
        x: {
          ticks: { color: text },
          grid: { display: false }
        },
        y: {
          ticks: {
            color: text,
            callback: (v) => v.toFixed(1)
          },
          grid: { color: grid }
        }
      }
    }
  });
}

const OUTPUT_FALLBACK = [
  { year: 1990, value: 100 },
  { year: 2000, value: 126 },
  { year: 2010, value: 118 },
  { year: 2020, value: 136 },
  { year: 2024, value: 142 },
];
const EMPLOYMENT_FALLBACK = [
  { year: 1990, value: 100 },
  { year: 2000, value: 93 },
  { year: 2010, value: 83 },
  { year: 2020, value: 88 },
  { year: 2024, value: 90 },
];
const ASM_FALLBACK = [
  { industry: "Computer & Electronics", adoptionRate: 72 },
  { industry: "Transportation Equipment", adoptionRate: 65 },
  { industry: "Chemicals & Plastics", adoptionRate: 58 },
  { industry: "Machinery", adoptionRate: 55 },
  { industry: "Food & Beverage", adoptionRate: 48 },
  { industry: "Fabricated Metals", adoptionRate: 42 },
  { industry: "Plastics & Rubber", adoptionRate: 38 },
  { industry: "Textiles & Apparel", adoptionRate: 28 },
];
const WAGE_FALLBACK = [
  { country: "United States", wage: 82932, year: 2022 },
  { country: "Germany", wage: 69433, year: 2022 },
  { country: "China", wage: 21500, year: 2022 }, // Approximation
  { country: "Mexico", wage: 17045, year: 2022 },
];

function ensureDataSets() {
  if (dataLoadPromise) return dataLoadPromise;
  dataLoadPromise = Promise.all([
    fetchTimeSeriesCsv("dataSets/IPMAN.csv", "observation_date", "IPMAN"),
    fetchTimeSeriesCsv("dataSets/MANEMP.csv", "observation_date", "MANEMP"),
    fetchAsmBenchmarkCsv("dataSets/asmBenchmark2022.csv"),
    fetchWageCsv("dataSets/oecdAvgAnnualWages.csv"),
  ])
    .then(([ipman, manemp, asm, wages]) => {
      window.dataSets = window.dataSets || {};
      window.dataSets.IPMAN = ipman.length ? ipman : toTimeSeries(OUTPUT_FALLBACK, 'year', 'value');
      window.dataSets.MANEMP = manemp.length ? manemp : toTimeSeries(EMPLOYMENT_FALLBACK, 'year', 'value');
      window.dataSets.asmBenchmark2022 = asm.length ? asm : ASM_FALLBACK;
      window.dataSets.oecdAvgAnnualWages = wages.length ? wages : WAGE_FALLBACK;
    })
    .catch((error) => {
      console.warn("Failed to load dataset CSVs, using fallbacks:", error);
      window.dataSets = window.dataSets || {};
      window.dataSets.IPMAN = toTimeSeries(OUTPUT_FALLBACK, 'year', 'value');
      window.dataSets.MANEMP = toTimeSeries(EMPLOYMENT_FALLBACK, 'year', 'value');
      window.dataSets.asmBenchmark2022 = ASM_FALLBACK;
      window.dataSets.oecdAvgAnnualWages = WAGE_FALLBACK;
    });
  return dataLoadPromise;
}

function toTimeSeries(data, yearKey, valKey) {
  return data.map(d => ({ date: `${d[yearKey]}-01-01`, value: d[valKey] }));
}

async function fetchText(path) {
  const response = await window.fetch(path);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.text();
}

async function fetchTimeSeriesCsv(path, dateKey, valueKey) {
  try {
    const text = await fetchText(path);
    const rows = parseCsvRows(text);
    return rowsToTimeSeries(rows, dateKey, valueKey);
  } catch (error) {
    console.warn(`Unable to load ${path}:`, error);
    return [];
  }
}

async function fetchAsmBenchmarkCsv(path) {
  try {
    const text = await fetchText(path);
    return rowsToAsmData(parseCsvRows(text));
  } catch (error) {
    console.warn(`Unable to load ${path}:`, error);
    return [];
  }
}

async function fetchWageCsv(path) {
  try {
    const text = await fetchText(path);
    return rowsToWageData(parseCsvRows(text));
  } catch (error) {
    console.warn(`Unable to load ${path}:`, error);
    return [];
  }
}

function parseCsvRows(text) {
  if (!text) return [];
  const normalized = text.replace(/\r/g, "");
  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);
  const header = parseCsvLine(lines[0] || '');
  const data = lines.slice(1).map(line => {
      const values = parseCsvLine(line);
      const row = {};
      header.forEach((key, i) => row[key] = values[i]);
      return row;
  });
  return data;
}

function parseCsvLine(line) {
  const cells = [];
  let buffer = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        buffer += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(buffer.trim());
      buffer = "";
      continue;
    }
    buffer += char;
  }
  cells.push(buffer.trim());
  return cells.map((cell) => cell.replace(/^\uFEFF/, "").trim());
}

function rowsToTimeSeries(rows, dateKey, valueKey) {
  return rows.map(row => ({
    date: row[dateKey],
    value: parseFloat(row[valueKey])
  })).filter(d => d.date && !isNaN(d.value));
}

function rowsToAsmData(rows) {
  const industryKey = Object.keys(rows[0] || {}).find(k => /industry/i.test(k));
  const rateKey = Object.keys(rows[0] || {}).find(k => /rate/i.test(k));
  if (!industryKey || !rateKey) return [];
  return rows.map(row => ({
    industry: row[industryKey],
    adoptionRate: parseFloat(row[rateKey])
  })).filter(d => d.industry && !isNaN(d.adoptionRate));
}

function rowsToWageData(rows) {
  const countryKey = Object.keys(rows[0] || {}).find(k => /country/i.test(k));
  const wageKey = Object.keys(rows[0] || {}).find(k => /wage/i.test(k));
  const yearKey = Object.keys(rows[0] || {}).find(k => /year/i.test(k));
  if (!countryKey || !wageKey || !yearKey) return [];
  return rows.map(row => ({
    country: row[countryKey],
    wage: parseFloat(row[wageKey]),
    year: parseInt(row[yearKey], 10)
  })).filter(d => d.country && !isNaN(d.wage) && !isNaN(d.year));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("overlay-locked");
  hexSvg = document.getElementById("hex-svg");
  buildHexagon();
  initLottie();
  wireOverlay();
});

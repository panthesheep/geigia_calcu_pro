import { PRODUCTION_TYPES } from "./data.js";

const $ = (q) => document.querySelector(q);

const els = {
  area: $("#area"),
  tipo: $("#tipo"),
  custom: $("#customParams"),
  densidad: $("#densidad"),
  rendimiento: $("#rendimiento"),
  unidad: $("#unidad"),
  ciclo: $("#ciclo"),
  areaErr: $("#areaError"),
  rPlantas: $("#rPlantas"),
  rRendimientoM2: $("#rRendimientoM2"),
  rCiclo: $("#rCiclo"),
  rPrimerCiclo: $("#rPrimerCiclo"),
  rAnual: $("#rAnual"),
  rCiclosNota: $("#rCiclosNota"),
  calcularBtn: $("#calcular"),
  results: $("#results"),
  resultsCard: $("#resultsCard"),
};

const nf0 = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 });

let lastRes = {
  prodPrimerCiclo: 0,
  prodAnual: 0
};

function initSelect() {
  PRODUCTION_TYPES.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.nombre;
    els.tipo.appendChild(opt);
  });
}

function getSelectedType() {
  const id = els.tipo.value;
  return PRODUCTION_TYPES.find(t => t.id === id);
}

function readParams() {
  const area = parseFloat(els.area.value);
  const selected = getSelectedType();

  let densidad = selected.densidad_m2;
  let rendimiento = selected.rendimiento_m2;
  let unidad = selected.unidad || "kg";
  let ciclo = selected.ciclo_dias;

  if (selected.id === "custom") {
    densidad = parseFloat(els.densidad.value);
    rendimiento = parseFloat(els.rendimiento.value);
    unidad = els.unidad.value;
    ciclo = parseInt(els.ciclo.value, 10);
  }

  return { area, densidad, rendimiento, unidad, ciclo, isCustom: selected.id === "custom", nombre: selected.nombre };
}

function validate({ area, densidad, rendimiento, ciclo, isCustom }) {
  let ok = true;
  els.areaErr.textContent = "";

  if (!(area > 0)) {
    els.areaErr.textContent = "Ingrese un área válida mayor que 0.";
    ok = false;
  }
  if (isCustom) {
    if (!(densidad > 0) || !(rendimiento > 0) || !(ciclo > 0)) {
      ok = false;
    }
  }
  return ok;
}

function compute({ area, densidad, rendimiento, unidad, ciclo }) {
  const totalPlantas = densidad * area;
  const prodPrimerCiclo = rendimiento * area;

  const ciclosPosibles = ciclo > 0 ? Math.max(1, Math.floor(365 / ciclo)) : 0;
  const prodAnual = prodPrimerCiclo * ciclosPosibles;

  return {
    totalPlantas,
    rendimientoM2: rendimiento,
    unidad,
    ciclo,
    prodPrimerCiclo,
    ciclosPosibles,
    prodAnual
  };
}

// Count-up animation helper
function animateCount(el, from, to, unit, duration = 600) {
  const start = performance.now();
  el.classList.remove("bump"); // reset if present

  function step(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3); // cubic ease-out
    const val = from + (to - from) * eased;
    el.textContent = `${nf2.format(val)} ${unit}`;
    if (t < 1) requestAnimationFrame(step);
    else {
      el.textContent = `${nf2.format(to)} ${unit}`;
      el.classList.add("bump");
      setTimeout(() => el.classList.remove("bump"), 250);
    }
  }
  requestAnimationFrame(step);
}

function render(res, valid, nombreTipo) {
  if (!valid) {
    els.rPlantas.textContent = "—";
    els.rRendimientoM2.textContent = "—";
    els.rCiclo.textContent = "—";
    els.rPrimerCiclo.textContent = "—";
    els.rAnual.textContent = "—";
    els.rCiclosNota.textContent = "";
    els.results.classList.remove("reveal");
    // hide results card when invalid or before first calc
    els.resultsCard.classList.add("hidden");
    els.resultsCard.setAttribute("aria-hidden", "true");
    return;
  }

  els.rPlantas.textContent = nf0.format(res.totalPlantas);
  els.rRendimientoM2.textContent = `${nf2.format(res.rendimientoM2)} ${res.unidad}/m² por ciclo`;
  els.rCiclo.textContent = `${res.ciclo} días`;

  // Count-up for key metrics
  animateCount(els.rPrimerCiclo, lastRes.prodPrimerCiclo || 0, res.prodPrimerCiclo, res.unidad, 700);
  animateCount(els.rAnual, lastRes.prodAnual || 0, res.prodAnual, res.unidad, 800);

  els.rCiclosNota.textContent = `Tipo: ${nombreTipo} • Ciclos estimados en 365 días: ${res.ciclosPosibles}`;
  els.results.classList.add("reveal");
  // show results card on valid calc
  els.resultsCard.classList.remove("hidden");
  els.resultsCard.setAttribute("aria-hidden", "false");

  // store last values for next animation
  lastRes.prodPrimerCiclo = res.prodPrimerCiclo;
  lastRes.prodAnual = res.prodAnual;
}

function toggleCustom() {
  const isCustom = els.tipo.value === "custom";
  els.custom.classList.toggle("hidden", !isCustom);
  els.custom.setAttribute("aria-hidden", String(!isCustom));
}

function recalc() {
  const params = readParams();
  const valid = validate(params);
  if (!valid) {
    render({}, false, params.nombre);
    return;
  }
  // button pulse feedback
  els.calcularBtn.classList.add("calculating");
  setTimeout(() => els.calcularBtn.classList.remove("calculating"), 700);

  const result = compute(params);
  render(result, true, params.nombre);
}

function restoreState() {
  const saved = JSON.parse(localStorage.getItem("geigia_state") || "{}");
  if (saved.area) els.area.value = saved.area;
  if (saved.tipo) els.tipo.value = saved.tipo;
  toggleCustom();
  if (saved.custom) {
    if (saved.custom.densidad) els.densidad.value = saved.custom.densidad;
    if (saved.custom.rendimiento) els.rendimiento.value = saved.custom.rendimiento;
    if (saved.custom.unidad) els.unidad.value = saved.custom.unidad;
    if (saved.custom.ciclo) els.ciclo.value = saved.custom.ciclo;
  }
  // ensure results are hidden on load
  els.resultsCard.classList.add("hidden");
  els.resultsCard.setAttribute("aria-hidden", "true");
}

function persist() {
  const selected = getSelectedType();
  const state = {
    area: els.area.value,
    tipo: els.tipo.value,
    custom: selected.id === "custom" ? {
      densidad: els.densidad.value,
      rendimiento: els.rendimiento.value,
      unidad: els.unidad.value,
      ciclo: els.ciclo.value
    } : null
  };
  localStorage.setItem("geigia_state", JSON.stringify(state));
}

function bind() {
  ["input", "change"].forEach(evt => {
    els.area.addEventListener(evt, () => { persist(); /* no auto calc */ });
    els.tipo.addEventListener(evt, () => { toggleCustom(); persist(); /* no auto calc */ });
    els.densidad.addEventListener(evt, () => { persist(); /* no auto calc */ });
    els.rendimiento.addEventListener(evt, () => { persist(); /* no auto calc */ });
    els.unidad.addEventListener(evt, () => { persist(); /* no auto calc */ });
    els.ciclo.addEventListener(evt, () => { persist(); /* no auto calc */ });
  });

  els.calcularBtn.addEventListener("click", () => {
    recalc();
  });
}

function main() {
  initSelect();
  restoreState();
  // do not auto-calc on load; wait for user action
  bind();
}

main();
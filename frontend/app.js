const API = "http://127.0.0.1:5000/api";
const COLORS = ["#313695", "#4575b4", "#74add1", "#abd9e9", "#ffffbf", "#fdae61", "#f46d43", "#d73027", "#a50026"];
const LULC_CLASSES = [
  { id: "water", name: "Water", defaultLevel: 2, color: "#4ba3e3" },
  { id: "trees", name: "Trees", defaultLevel: 3, color: "#25875a" },
  { id: "flooded_vegetation", name: "Flooded vegetation", defaultLevel: 2, color: "#73b7a2" },
  { id: "crops", name: "Crops", defaultLevel: 4, color: "#ddc34f" },
  { id: "built_area", name: "Built Area", defaultLevel: 8, color: "#d45b50" },
  { id: "bare_ground", name: "Bare ground", defaultLevel: 2, color: "#b99a71" },
  { id: "snow_ice", name: "Snow / Ice", defaultLevel: 1, color: "#a8d8ea" },
  { id: "rangeland", name: "Rangeland", defaultLevel: 4, color: "#a3b85d" },
];

let studyCase = null;
let countryMap = null;
let resultMap = null;
let resultOverlay = null;
let scenarios = [];
let results = [];
let activeModule = "mhi";

const views = [...document.querySelectorAll(".view")];
const scenarioList = document.getElementById("scenario-list");
const submitBar = document.getElementById("submit-bar");
const submitMessage = document.getElementById("submit-message");

function setView(id) {
  views.forEach((view) => view.classList.toggle("hidden", view.id !== id));
  views.forEach((view) => view.classList.toggle("active-view", view.id === id));
  const stage = id === "country-view" ? 0 : id === "scenario-view" ? 1 : 2;
  document.querySelectorAll(".step-item").forEach((item, index) => {
    item.classList.toggle("active", index === stage);
    item.classList.toggle("complete", index < stage);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (id === "country-view") setTimeout(() => countryMap?.invalidateSize(), 0);
  if (id === "result-view") setTimeout(() => resultMap?.invalidateSize(), 0);
}

function createCountryMap() {
  countryMap = L.map("country-map", { zoomControl: false }).setView([51.1, 9.6], 5);
  L.control.zoom({ position: "topright" }).addTo(countryMap);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(countryMap);

  const germanyOutline = [
    [54.90,8.65],[54.77,9.95],[54.98,10.95],[54.55,11.70],[53.90,12.30],
    [53.60,13.90],[52.85,14.65],[51.05,14.95],[50.85,14.15],[50.20,12.20],
    [49.00,13.05],[47.45,12.10],[47.55,9.60],[48.55,7.60],[49.75,6.05],
    [51.85,6.00],[53.55,7.05],[54.90,8.65],
  ];
  const germany = L.polygon(germanyOutline, { color: "#075f70", weight: 3, fillColor: "#16c7bd", fillOpacity: .72 }).addTo(countryMap);
  germany.bindTooltip("Germany · Southern Ruhr", { sticky: true });
  germany.on("click", selectGermany);
  L.circleMarker([51.45, 7.15], { radius: 8, color: "#fff", weight: 3, fillColor: "#075f70", fillOpacity: 1 }).addTo(countryMap).bindTooltip("Southern Ruhr");
}

async function loadStudyCase() {
  const button = document.getElementById("select-germany");
  const status = document.getElementById("raster-status");
  const message = document.getElementById("country-message");
  button.disabled = true;
  try {
    const response = await fetch(`${API}/study-cases/germany`);
    if (!response.ok) throw new Error("Unable to load the Germany study case.");
    studyCase = await response.json();
    const ready = studyCase.hazards.filter((hazard) => hazard.available).length;
    status.textContent = `${ready}/${studyCase.hazards.length} ready`;
    button.disabled = false;
    message.textContent = "";
  } catch (error) {
    status.textContent = "Offline";
    message.textContent = `${error.message} Start the backend on port 5000.`;
  }
}

function selectGermany() {
  if (!studyCase) return;
  setView("scenario-view");
}

function setModule(moduleName) {
  activeModule = moduleName;
  const exposure = moduleName === "exposure";
  document.getElementById("mhi-module").classList.toggle("hidden", exposure);
  document.getElementById("exposure-module").classList.toggle("hidden", !exposure);
  document.querySelectorAll(".module-tab").forEach(tab => tab.classList.toggle("active", tab.dataset.module === moduleName));
  document.querySelector(".recommendation-wrap").classList.toggle("hidden", exposure);
  document.getElementById("module-title").textContent = exposure ? "Exposed Elements" : "Multi-Hazard scenarios";
  document.getElementById("module-description").textContent = exposure
    ? "Configure Land Use / Land Cover significance levels for a separate Germany EAR assessment."
    : "Select the number of scenarios, then configure the hazard factors and their interaction levels.";
}

function generateExposureMatrix() {
  document.getElementById("lulc-grid").innerHTML = LULC_CLASSES.map(item => `<article class="lulc-card" data-class="${item.id}"><span class="lulc-symbol" style="--class-color:${item.color}"></span><div><strong>${item.name}</strong><small>Significance level</small></div><label><span class="sr-only">${item.name} level</span><select>${Array.from({ length: 9 }, (_, index) => `<option value="${index + 1}" ${index + 1 === item.defaultLevel ? "selected" : ""}>${index + 1}</option>`).join("")}</select><em>of 9</em></label></article>`).join("");
  document.getElementById("exposure-matrix").classList.remove("hidden");
  document.getElementById("exposure-output").classList.add("hidden");
  document.getElementById("exposure-message").textContent = "";
  document.getElementById("exposure-matrix").scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetExposureValues() {
  document.querySelectorAll(".lulc-card").forEach(card => {
    card.querySelector("select").value = LULC_CLASSES.find(item => item.id === card.dataset.class).defaultLevel;
  });
  document.getElementById("exposure-message").textContent = "Values reset to the proposed defaults.";
}

function sendExposureConfiguration() {
  const cards = [...document.querySelectorAll(".lulc-card")];
  if (cards.length !== LULC_CLASSES.length) {
    document.getElementById("exposure-message").textContent = "Generate the matrix before sending.";
    return;
  }
  const values = cards.map(card => ({ id: card.dataset.class, name: card.querySelector("strong").textContent, level: Number(card.querySelector("select").value) }));
  document.getElementById("exposure-summary").innerHTML = values.map(item => `<span>${item.name}<strong>${item.level}</strong></span>`).join("");
  document.getElementById("exposure-message").textContent = "";
  document.getElementById("exposure-output").classList.remove("hidden");
  document.getElementById("exposure-output").scrollIntoView({ behavior: "smooth", block: "center" });
}

function generateScenarios() {
  const count = Number(document.getElementById("scenario-count").value);
  scenarios = Array.from({ length: count }, (_, index) => ({ id: index + 1, generated: false }));
  scenarioList.innerHTML = scenarios.map(scenarioTemplate).join("");
  submitBar.classList.remove("hidden");
  submitMessage.textContent = "";
  bindScenarioEvents();
}

function scenarioTemplate(scenario) {
  const groups = [
    { id: "mining", title: "Mining-related factors" },
    { id: "natural", title: "Geological and natural factors" },
  ];
  return `<article class="workflow-card scenario-card" data-scenario="${scenario.id}">
    <div class="scenario-header"><h2>Scenario ${scenario.id}</h2><span class="scenario-state">Select factors</span></div>
    ${groups.map(group => `<div class="factor-group"><h3>${group.title}</h3><div class="checkbox-grid">
      ${studyCase.hazards.filter(h => h.category === group.id).map(h => `<label class="factor-check"><input type="checkbox" value="${h.id}" ${h.available ? "" : "disabled"}><span>${h.name}<small>${h.available ? "Raster ready" : `Missing ${h.filename}`}</small></span></label>`).join("")}
    </div></div>`).join("")}
    <div class="scenario-actions"><button class="utility select-all">Select all</button><button class="utility deselect-all">Deselect all</button><button class="primary generate-hazards">Generate hazards</button></div>
    <p class="form-message scenario-message" role="status"></p>
    <div class="hazard-stage hidden"><h3>Interaction levels</h3><p class="drag-instruction">Drag and drop cards to change the interaction order. You can also use Alt + Left/Right Arrow.</p><p class="order-status" aria-live="polite"></p><div class="hazard-cards"></div></div>
  </article>`;
}

function bindScenarioEvents() {
  document.querySelectorAll(".scenario-card").forEach(card => {
    card.querySelector(".select-all").addEventListener("click", () => card.querySelectorAll('input:not(:disabled)').forEach(input => { input.checked = true; }));
    card.querySelector(".deselect-all").addEventListener("click", () => card.querySelectorAll("input").forEach(input => { input.checked = false; }));
    card.querySelector(".generate-hazards").addEventListener("click", () => generateHazards(card));
    card.querySelectorAll("input").forEach(input => input.addEventListener("change", () => invalidateHazards(card)));
  });
}

function invalidateHazards(card) {
  const scenario = scenarios.find(item => item.id === Number(card.dataset.scenario));
  if (!scenario.generated) return;
  scenario.generated = false;
  card.querySelector(".hazard-stage").classList.add("hidden");
  card.querySelector(".scenario-state").textContent = "Regenerate hazards";
  card.querySelector(".scenario-state").classList.remove("ready");
}

function generateHazards(card) {
  const selected = [...card.querySelectorAll("input:checked")].map(input => studyCase.hazards.find(hazard => hazard.id === input.value));
  const message = card.querySelector(".scenario-message");
  if (selected.length < 2) {
    message.textContent = "Select at least two factors before generating hazards.";
    return;
  }
  message.textContent = "";
  const cards = card.querySelector(".hazard-cards");
  cards.innerHTML = selected.map(hazard => `<div class="hazard-card ${hazard.category === "natural" ? "natural" : ""}" data-hazard="${hazard.id}" draggable="true" tabindex="0" aria-label="${hazard.name}. Drag to change its position."><span class="drag-handle" aria-hidden="true">⠿</span><strong>${hazard.name}</strong><label>Interaction level Iᵢ<select><option value="1">1 · Low</option><option value="2" selected>2 · Medium</option><option value="3">3 · High</option></select></label></div>`).join("");
  enableHazardSorting(cards);
  announceOrder(cards);
  card.querySelector(".hazard-stage").classList.remove("hidden");
  card.querySelector(".scenario-state").textContent = `${selected.length} factors ready`;
  card.querySelector(".scenario-state").classList.add("ready");
  scenarios.find(item => item.id === Number(card.dataset.scenario)).generated = true;
}

function enableHazardSorting(container) {
  let dragged = null;
  container.querySelectorAll(".hazard-card").forEach(card => {
    card.addEventListener("dragstart", event => {
      dragged = card;
      card.classList.add("dragging");
      container.classList.add("sorting");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", card.dataset.hazard);
    });
    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
      container.classList.remove("sorting");
      container.querySelectorAll(".drag-over").forEach(item => item.classList.remove("drag-over"));
      dragged = null;
    });
    card.addEventListener("keydown", event => {
      if (!event.altKey || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      const sibling = event.key === "ArrowLeft" ? card.previousElementSibling : card.nextElementSibling;
      if (!sibling) return;
      if (event.key === "ArrowLeft") container.insertBefore(card, sibling);
      else container.insertBefore(sibling, card);
      card.focus();
      announceOrder(container);
    });
  });
  container.addEventListener("dragover", event => {
    event.preventDefault();
    if (!dragged) return;
    event.dataTransfer.dropEffect = "move";
    const target = event.target.closest(".hazard-card");
    container.querySelectorAll(".drag-over").forEach(item => item.classList.remove("drag-over"));
    if (!target || target === dragged) {
      if (!target) container.appendChild(dragged);
      return;
    }
    target.classList.add("drag-over");
    const rect = target.getBoundingClientRect();
    const placeAfter = event.clientX > rect.left + rect.width / 2;
    container.insertBefore(dragged, placeAfter ? target.nextElementSibling : target);
  });
  container.addEventListener("drop", event => {
    event.preventDefault();
    announceOrder(container);
  });
}

function announceOrder(container) {
  const names = [...container.querySelectorAll(".hazard-card")].map(card => card.querySelector("strong").textContent.trim());
  container.closest(".hazard-stage").querySelector(".order-status").textContent = `Current order: ${names.join(" → ")}`;
}

function scenarioPayload(card) {
  const hazardCards = [...card.querySelectorAll(".hazard-card")];
  const hazards = hazardCards.map((item, index) => ({ id: item.dataset.hazard, order: index + 1, interaction_level: Number(item.querySelector("select").value) }));
  const interactions = hazards.slice(0, -1).map((hazard, index) => ({ source: hazard.id, target: hazards[index + 1].id }));
  return { name: `Scenario ${card.dataset.scenario}`, hazards, interactions };
}

async function submitScenarios() {
  const incomplete = scenarios.find(scenario => !scenario.generated);
  if (incomplete) {
    submitMessage.textContent = `Generate hazards for Scenario ${incomplete.id} before submitting.`;
    document.querySelector(`[data-scenario="${incomplete.id}"]`).scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  submitMessage.textContent = "";
  setView("result-view");
  document.getElementById("map-loading").classList.remove("hidden");
  prepareResultMap();
  try {
    const cards = [...document.querySelectorAll(".scenario-card")];
    results = [];
    for (const card of cards) {
      const response = await fetch(`${API}/mhi/calculate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ study_case: "germany", scenario: scenarioPayload(card) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Scenario ${card.dataset.scenario} failed.`);
      results.push({ number: Number(card.dataset.scenario), ...data });
    }
    renderResultTabs();
    showResult(0);
  } catch (error) {
    setView("scenario-view");
    submitMessage.textContent = error.message;
  } finally {
    document.getElementById("map-loading").classList.add("hidden");
  }
}

function prepareResultMap() {
  if (resultMap) return;
  resultMap = L.map("result-map").setView([51.45, 7.15], 10);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "&copy; OpenStreetMap contributors" }).addTo(resultMap);
  document.getElementById("legend-items").innerHTML = COLORS.map(color => `<span style="background:${color}"></span>`).join("");
}

function renderResultTabs() {
  document.getElementById("result-tabs").innerHTML = results.map((result, index) => `<button class="result-tab ${index === 0 ? "active" : ""}" data-result="${index}">Scenario ${result.number}</button>`).join("");
  document.querySelectorAll(".result-tab").forEach(tab => tab.addEventListener("click", () => showResult(Number(tab.dataset.result))));
}

function showResult(index) {
  const result = results[index];
  document.querySelectorAll(".result-tab").forEach((tab, tabIndex) => tab.classList.toggle("active", tabIndex === index));
  if (resultOverlay) resultMap.removeLayer(resultOverlay);
  const backendOrigin = API.replace(/\/api$/, "");
  resultOverlay = L.imageOverlay(`${backendOrigin}${result.overlay_url}`, result.calculation.bounds, { opacity: .82 }).addTo(resultMap);
  resultMap.fitBounds(result.calculation.bounds);
  document.getElementById("raw-min").textContent = result.calculation.raw_min;
  document.getElementById("raw-max").textContent = result.calculation.raw_max;
  setTimeout(() => resultMap.invalidateSize(), 0);
}

document.getElementById("select-germany").addEventListener("click", selectGermany);
document.getElementById("generate-scenarios").addEventListener("click", generateScenarios);
document.getElementById("submit-scenarios").addEventListener("click", submitScenarios);
document.querySelectorAll("[data-back]").forEach(button => button.addEventListener("click", () => setView(button.dataset.back)));
document.getElementById("new-assessment").addEventListener("click", () => { scenarios = []; results = []; scenarioList.innerHTML = ""; submitBar.classList.add("hidden"); setView("country-view"); });
document.querySelectorAll(".module-tab").forEach(tab => tab.addEventListener("click", () => setModule(tab.dataset.module)));
document.getElementById("generate-exposure-matrix").addEventListener("click", generateExposureMatrix);
document.getElementById("reset-exposure").addEventListener("click", resetExposureValues);
document.getElementById("send-exposure").addEventListener("click", sendExposureConfiguration);
document.getElementById("edit-exposure").addEventListener("click", () => document.getElementById("exposure-matrix").scrollIntoView({ behavior: "smooth", block: "start" }));
const recommendationWrap = document.querySelector(".recommendation-wrap");
const recommendationButton = document.getElementById("recommendation-button");
recommendationButton.addEventListener("click", event => {
  event.stopPropagation();
  const open = recommendationWrap.classList.toggle("open");
  recommendationButton.setAttribute("aria-expanded", String(open));
});
document.addEventListener("click", event => {
  if (!recommendationWrap.contains(event.target)) {
    recommendationWrap.classList.remove("open");
    recommendationButton.setAttribute("aria-expanded", "false");
  }
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    recommendationWrap.classList.remove("open");
    recommendationButton.setAttribute("aria-expanded", "false");
  }
});

createCountryMap();
loadStudyCase();

const API = "http://127.0.0.1:5000/api";
let studyCase;
let map;
let resultMap;
let resultOverlay;

function show(id) {
  document.querySelectorAll("main > section").forEach((section) => section.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
  if (id === "country-view") setTimeout(() => map?.invalidateSize(), 0);
}

document.getElementById("public-access").addEventListener("click", () => {
  show("country-view");
  if (!map) createMap();
});
document.querySelectorAll("[data-back]").forEach((button) => button.addEventListener("click", () => show(button.dataset.back)));

function createMap() {
  map = L.map("map").setView([51.1, 10.2], 5);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "&copy; OpenStreetMap contributors" }).addTo(map);
  const germany = L.circleMarker([51.1657, 10.4515], { radius: 22, color: "#fff", weight: 3, fillColor: "#18794e", fillOpacity: .9 })
    .bindTooltip("Germany — Southern Ruhr", { permanent: true, direction: "bottom", offset: [0, 18] })
    .addTo(map);
  germany.on("click", loadGermany);
}

async function loadGermany() {
  const status = document.getElementById("map-status");
  status.textContent = "Loading Germany study case…";
  try {
    const response = await fetch(`${API}/study-cases/germany`);
    if (!response.ok) throw new Error("The backend API is unavailable.");
    studyCase = await response.json();
    renderHazards(); show("scenario-view");
  } catch (error) { status.textContent = `${error.message} Start the Flask backend on port 5000.`; status.className = "status error"; }
}

function renderHazards() {
  const root = document.getElementById("hazards");
  const groups = [{id: "mining", name: "Mining-related factors"}, {id: "natural", name: "Geological and natural factors"}];
  root.innerHTML = groups.map((group) => `<h4>${group.name}</h4>${studyCase.hazards.filter((hazard) => hazard.category === group.id).map((hazard) => `<label class="hazard"><input type="checkbox" value="${hazard.id}"><span>${hazard.name}</span><small class="${hazard.available ? "ready" : "missing"}">${hazard.available ? "raster ready" : `needs ${hazard.filename}`}</small></label>`).join("")}`).join("");
  root.querySelectorAll("input").forEach((input) => input.addEventListener("change", renderInteractions));
  renderInteractions();
}

function selectedHazards() {
  return [...document.querySelectorAll("#hazards input:checked")].map((input) => studyCase.hazards.find((hazard) => hazard.id === input.value));
}

function renderInteractions() {
  const selected = selectedHazards();
  const root = document.getElementById("interactions");
  if (!selected.length) { root.innerHTML = '<p class="muted">Select at least one hazard.</p>'; return; }
  root.innerHTML = selected.map((hazard, index) => `<div class="interaction" data-hazard="${hazard.id}"><span>${index + 1}. ${hazard.name}</span><select aria-label="I_i for ${hazard.name}"><option value="1">Iᵢ Low · 1</option><option value="2" selected>Iᵢ Moderate · 2</option><option value="3">Iᵢ High · 3</option></select><span>Nᵢ = ${selected.length === 1 ? 0 : (index === 0 || index === selected.length - 1 ? 1 : 2)}</span></div>`).join("");
}

document.getElementById("calculate").addEventListener("click", async () => {
  const selected = selectedHazards(); const result = document.getElementById("result");
  const levels = Object.fromEntries([...document.querySelectorAll(".interaction")].map((row) => [row.dataset.hazard, Number(row.querySelector("select").value)]));
  const interactions = selected.slice(0, -1).map((hazard, index) => ({ source: hazard.id, target: selected[index + 1].id }));
  result.textContent = "Validating scenario…"; result.className = "status";
  try {
    const response = await fetch(`${API}/mhi/calculate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ study_case: "germany", scenario: { name: "Scenario 1", hazards: selected.map((hazard, order) => ({ id: hazard.id, order: order + 1, interaction_level: levels[hazard.id] })), interactions } }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.missing_files ? `${data.error} ${data.missing_files.join(", ")}` : data.error);
    result.textContent = data.warning || "SHI calculation completed."; result.className = "status success";
    renderResultMap(data);
  } catch (error) { result.textContent = error.message; result.className = "status error"; }
});

function renderResultMap(data) {
  const mapElement = document.getElementById("result-map");
  mapElement.classList.remove("hidden");
  if (!resultMap) {
    resultMap = L.map("result-map");
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(resultMap);
  }
  if (resultOverlay) resultMap.removeLayer(resultOverlay);
  const bounds = data.calculation.bounds;
  const backendOrigin = API.replace(/\/api$/, "");
  resultOverlay = L.imageOverlay(`${backendOrigin}${data.overlay_url}?v=${Date.now()}`, bounds, { opacity: .8 }).addTo(resultMap);
  resultMap.fitBounds(bounds);
  setTimeout(() => resultMap.invalidateSize(), 0);

  const colors = ["#313695", "#4575b4", "#74add1", "#abd9e9", "#ffffbf", "#fdae61", "#f46d43", "#d73027", "#a50026"];
  document.getElementById("legend").classList.remove("hidden");
  document.getElementById("legend-items").innerHTML = colors.map((color, index) =>
    `<span class="legend-item"><i class="swatch" style="background:${color}"></i>${index + 1}</span>`
  ).join("");
}

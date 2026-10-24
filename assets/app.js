(() => {
  "use strict";

  const state = {
    data: null,
    search: "",
    type: "all",
    sort: "content_cer",
    comparisonMetric: "exact",
    selected: new Set(),
    sceneMetric: "degraded_exact",
    matrixSelection: null,
    cases: null,
    exampleIndex: 0,
    exampleModel: null,
    showDiff: true,
    research: null,
    study: "training",
  };

  const $ = (selector) => document.querySelector(selector);
  const percent = (value, digits = 2) => `${(100 * value).toFixed(digits)}%`;
  const integer = (value) => Number(value).toLocaleString("en-US");
  const typeNames = {
    "OCR pipeline": "OCR pipeline",
    "OCR model": "OCR model",
    "General model": "General VLM",
    "Closed model": "Hosted API",
  };
  const conditionNames = {
    "Complex-background Scene Text": "Complex Background",
    "Occluded Scene Text": "Occlusion",
    "Perspective-distorted Scene Text": "Perspective Distortion",
    "Reflective Scene Text": "Reflection",
    "Screen-based Scene Text": "Photographed Screens",
    "Small-scale & Blurry Scene Text": "Small Text and Blur",
    "Special-material Scene Text": "Special Materials",
    "Underexposed Scene Text": "Underexposure",
  };

  const metricNames = {
    content_cer: "Content CER", exact: "Page Exact",
    pass1: "Pass@1%", pass3: "Pass@3%", pass5: "Pass@5%",
    rgs: "Correct retention (RGS)", tail: "Worst 1% error share",
  };

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text != null) element.textContent = text;
    return element;
  }

  function sortedModels(metric = state.sort) {
    const direction = ["content_cer", "tail"].includes(metric) ? 1 : -1;
    return [...state.data.models].sort((left, right) => (
      modelMetric(left, metric) - modelMetric(right, metric)
    ) * direction);
  }

  function addDefinitions(target, rows) {
    target.innerHTML = "";
    rows.forEach(([term, description]) => {
      const row = document.createElement("div");
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = term;
      dd.textContent = description;
      row.append(dt, dd);
      target.append(row);
    });
  }

  function addStat(target, label, value) {
    const row = document.createElement("div");
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = label;
    dd.textContent = value;
    row.append(dt, dd);
    target.append(row);
  }

  function modelMetric(model, key) {
    if (key === "tail") return model.worst_one_percent_edit_share;
    if (key === "rgs") return model.rgs.all_conditions.rgs;
    return model.overall.metrics[key];
  }

  function modelUrl(modelId) {
    const url = new URL(window.location.href);
    url.hash = "";
    url.search = "";
    url.searchParams.set("model", modelId);
    return url.href;
  }

  function typeLabel(model) {
    const span = document.createElement("span");
    span.className = "type-label";
    span.dataset.type = model.type;
    span.textContent = typeNames[model.type] || model.type;
    return span;
  }

  function filteredModels() {
    return sortedModels()
      .filter((model) => state.type === "all" || model.type === state.type)
      .filter((model) => {
        const text = `${model.name} ${model.id} ${model.checkpoint}`.toLowerCase();
        return text.includes(state.search.toLowerCase());
      });
  }

  function renderLeaderboard() {
    const models = filteredModels();
    const tbody = $("#leaderboard-rows");
    tbody.innerHTML = "";
    const ranks = new Map(sortedModels().map((model, index) => [model.id, index + 1]));

    models.forEach((model) => {
      const row = document.createElement("tr");
      const rank = document.createElement("td");
      rank.className = "rank-value";
      rank.dataset.top = String(ranks.get(model.id) <= 3);
      rank.append(node("span", "", String(ranks.get(model.id)).padStart(2, "0")));

      const name = document.createElement("td");
      const nameCell = node("div", "model-name-cell");
      const nameText = node("div");
      const link = document.createElement("a");
      link.className = "model-link";
      link.href = modelUrl(model.id);
      link.textContent = model.name;
      const id = document.createElement("span");
      id.className = "model-id";
      id.textContent = model.checkpoint;
      nameText.append(link, id);
      nameCell.append(nameText);
      name.append(nameCell);

      const type = document.createElement("td");
      type.append(typeLabel(model));

      const values = [
        ["content_cer", true],
        ["exact", false],
        ["pass1", false],
        ["pass3", false],
        ["pass5", false],
        ["rgs", false],
        ["tail", false],
      ].map(([key, primary]) => {
        const cell = document.createElement("td");
        if (primary) cell.className = "metric-primary";
        if (["pass1", "pass3", "tail"].includes(key)) cell.classList.add("extra-metric");
        cell.textContent = percent(modelMetric(model, key));
        return cell;
      });
      row.append(rank, name, type, ...values);
      tbody.append(row);
    });

    $("#table-note").textContent = models.length
      ? `${models.length} of ${state.data.models.length} models · Ranks use all models · Retention uses ${integer(state.data.dataset.rgs_common_pairs)} pairs`
      : "No matching models.";

    document.querySelectorAll("[data-sort]").forEach((button) => {
      button.dataset.active = String(button.dataset.sort === state.sort);
      button.closest("th").setAttribute("aria-sort", button.dataset.sort === state.sort
        ? (["content_cer", "tail"].includes(state.sort) ? "ascending" : "descending")
        : "none");
    });
  }

  function renderSnapshot() {
    const dataset = state.data.dataset;
    const stats = $("#snapshot-stats");
    $("#leaderboard-scope").textContent =
      `${state.data.models.length} MODELS · ${integer(dataset.scored_test_pages)} PAGES EACH`;
    stats.innerHTML = "";
    [
      ["Field images", integer(dataset.pages)],
      ["Capture conditions", integer(Object.keys(dataset.conditions).length)],
      ["Test pages", integer(dataset.scored_test_pages)],
      ["Evaluated models", integer(state.data.models.length)],
    ].forEach(([label, value]) => addStat(stats, label, value));
  }

  function renderComparison() {
    const models = sortedModels(state.comparisonMetric).filter((model) => state.selected.has(model.id));
    const maximum = state.comparisonMetric === "content_cer"
      ? Math.max(.05, Math.ceil(Math.max(...models.map((model) => modelMetric(model, "content_cer"))) * 20) / 20)
      : 1;
    const chart = $("#comparison-bars");
    chart.innerHTML = "";
    chart.parentElement.style.setProperty("--plot-width", `${Math.max(700, models.length * 52 + 96)}px`);
    $("#comparison-axis").replaceChildren(...[1, .75, .5, .25, 0].map((ratio) => node("span", "", percent(maximum * ratio, 0))));
    models.forEach((model, index) => {
      const value = modelMetric(model, state.comparisonMetric);
      const column = node("a", "comparison-column");
      column.href = modelUrl(model.id);
      column.dataset.type = model.type;
      column.style.setProperty("--height", `${value / maximum * 300}px`);
      column.setAttribute("aria-label", `${model.name}, ${metricNames[state.comparisonMetric]} ${percent(value)}`);
      const body = node("span", "column-body");
      const prism = node("span", "column-prism");
      prism.append(node("span", "column-face"), node("span", "column-top"), node("span", "column-side"));
      body.append(node("span", "column-value", percent(value)), prism);
      const label = model.name.replace(" Preview (API)", "").replace(" (API)", "")
        .replace(/^(Doubao|Kimi) /, "$1\n")
        .replace("GLM Flash", "GLM\nFlash")
        .replace(/^(GLM|GOT)-OCR$/, "$1\nOCR")
        .replace(/(Qwen[\d.]+|Ovis[\d.]+)-/, "$1\n")
        .replace(/(InternVL)(?=\d)/, "$1\n")
        .replace(/(PP-OCR)(?=v)/, "$1\n")
        .replace("PaddleOCR-VL", "Paddle\nOCR-VL")
        .replace("Surya OCR 2", "Surya\nOCR 2")
        .replace(/^DeepSeek /, "DeepSeek\n")
        .replace(/(V[\d.]+) Flash$/, "$1\nFlash")
        .replace("DeepSeek-", "DeepSeek\n")
        .replace("HunyuanOCR", "Hunyuan\nOCR");
      const name = node("span", "column-name");
      name.append(...label.split("\n").map((part) => node("span", "column-name-part", part)));
      column.append(body, name, node("span", "column-index", String(index + 1).padStart(2, "0")));
      chart.append(column);
    });
    const values = models.map((model) => modelMetric(model, state.comparisonMetric));
    $("#comparison-note").textContent = `${metricNames[state.comparisonMetric]} · ${models.length === state.data.models.length ? "All" : "Selected"} ${models.length} models · ${percent(Math.min(...values))}–${percent(Math.max(...values))}`;
    $("#comparison-definition").textContent = {
      exact: "Pages with no scored character errors. Higher is better.",
      rgs: "Exact normal views that remain exact under real degradation. Higher is better.",
      content_cer: "Character edit errors divided by scored reference characters. Lower is better.",
      pass5: "Pages with a scored character error rate of at most 5%. Higher is better.",
    }[state.comparisonMetric];
    $("#comparison-scale").textContent = `Scale: 0 to ${percent(maximum, 0)} · ${state.comparisonMetric === "content_cer" ? "Lower is better" : "Higher is better"}`;
    $("#selection-count").textContent = `${models.length} / ${state.data.models.length}`;
    $("#comparison-all").disabled = models.length === state.data.models.length;
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
      chart.animate([{ opacity: .3 }, { opacity: 1 }], { duration: 420, easing: "ease-out" });
    }
  }

  function renderComparisonPicker() {
    const picker = $("#comparison-models");
    picker.innerHTML = "";
    state.data.models.forEach((model) => {
      const label = node("label");
      const checkbox = node("input");
      checkbox.type = "checkbox";
      checkbox.value = model.id;
      checkbox.checked = state.selected.has(model.id);
      checkbox.addEventListener("change", () => {
        if (!checkbox.checked && state.selected.size === 1) {
          checkbox.checked = true;
          return;
        }
        if (checkbox.checked) state.selected.add(model.id);
        else state.selected.delete(model.id);
        renderComparison();
      });
      label.append(checkbox, node("span", "", model.name));
      picker.append(label);
    });
  }

  function studyTable(headers, rows, caption = "", append = false) {
    const table = node("table", "detail-table");
    if (caption) table.append(node("caption", "", caption));
    const head = node("thead");
    const titles = node("tr");
    headers.forEach((title) => {
      const th = node("th", "", title);
      th.scope = "col";
      titles.append(th);
    });
    head.append(titles);
    const body = node("tbody");
    rows.forEach((values) => {
      const row = node("tr");
      values.forEach((value) => row.append(node("td", "", value)));
      body.append(row);
    });
    table.append(head, body);
    if (append) $("#study-table").append(table);
    else $("#study-table").replaceChildren(table);
  }

  function studyBar(label, value, maximum, variant = "") {
    const row = node("div", `study-bar ${variant}`);
    row.append(node("span", "study-bar-label", label));
    const track = node("div", "study-bar-track");
    const fill = node("span", "study-bar-fill");
    fill.style.width = `${Math.max(0, Math.min(100, 100 * value / maximum))}%`;
    track.append(fill);
    row.append(track, node("span", "study-bar-value", value.toFixed(2) + "%"));
    return row;
  }

  function studyReading(title, number, label, paragraphs) {
    const target = $("#study-interpretation");
    const key = node("div", "study-key");
    key.append(node("strong", "", number), node("span", "", label));
    target.replaceChildren(node("h3", "", title), key,
      ...paragraphs.map((text) => node("p", "", text)));
  }

  function renderResearch() {
    const data = state.research;
    const chart = $("#study-chart");
    chart.replaceChildren();
    chart.dataset.study = state.study;
    $("#study-interpretation").dataset.study = state.study;
    $("#study-date").textContent = data.snapshot;
    $("#study-tabs").querySelectorAll("button").forEach((button) =>
      button.setAttribute("aria-pressed", String(button.dataset.study === state.study)));
    $("#research-provenance").textContent =
      `Frozen results · ${data.dataset_release} · Full tables and study boundaries are available above.`;

    if (state.study === "training") {
      const study = data.training;
      const [base, normal, real] = study.arms;
      $("#study-scope").textContent = `${study.model} · ${integer(study.test_pages)} CLTW test pages`;
      chart.append(node("h3", "", "Content character error rate ↓"),
        node("p", "study-axis-label", "Same test set · Percentage of reference characters"));
      study.arms.forEach((arm) => chart.append(studyBar(
        `${arm.id} · ${arm.label}`, arm.cer_pct, 30, arm.id === "B" ? "is-selected" : "")));
      $("#study-chart-note").textContent =
        "B/C/D show the mean of all three training seeds. The original model is a single baseline.";
      studyReading("Training improves recognition on CLTW.",
        (base.cer_pct - normal.cer_pct).toFixed(2) + " pp",
        "lower Content-CER after normal-view training", [
          `Three seeds per trained arm; ${study.source_groups} sources and ${study.steps} steps per arm. Adding real degradation raises Page Exact by ${(real.exact_pct - normal.exact_pct).toFixed(2)} pp but also raises character error rate by ${(real.cer_pct - normal.cer_pct).toFixed(2)} pp.`,
        ]);
      studyTable(["Condition", "Content-CER", "Seed CER range", "Page Exact", "Seed Exact range"],
        study.arms.map((arm) => [
          `${arm.id} · ${arm.label}`, arm.cer_pct.toFixed(2) + "%",
          arm.id === "A" ? "Single baseline" : arm.cer_seed_range_pct.map((v) => v.toFixed(2) + "%").join(" – "),
          arm.exact_pct.toFixed(2) + "%",
          arm.id === "A" ? "Single baseline" : arm.exact_seed_range_pct.map((v) => v.toFixed(2) + "%").join(" – "),
        ]));
      $("#study-boundary").textContent =
        `${study.scope} ${study.range_note} CLTW reference text has not undergone complete independent double annotation.`;
    } else if (state.study === "matched") {
      const study = data.matched_training;
      const primary = study.cohorts.find((cohort) => cohort.primary);
      const change = primary.comparisons.B_vs_A;
      const interval = (row) => `${row.delta_f1_pp.toFixed(3)} [${row.ci95_pp.map((v) => v.toFixed(3)).join(", ")}]`;
      $("#study-scope").textContent =
        `${study.model} · ${study.pages} full images · ${integer(study.predictions)} complete outputs`;
      chart.append(node("h3", "", "Official recognition F1 ↑"),
        node("p", "study-axis-label", "Balances missed and extra text · Mean over pages"));
      study.cohorts.forEach((cohort) => {
        const group = node("div", "study-transfer-group");
        group.append(node("h4", "", `${cohort.label} · ${cohort.pages} pages${cohort.primary ? " · Primary test" : ""}`));
        cohort.arms.forEach((arm) => group.append(studyBar(
          `${arm.id} · ${{A: "Original", B: "CLTW", E: "Public data"}[arm.id]}`,
          arm.f1_pct, 100, arm.id === "B" ? "is-selected" : arm.id === "E" ? "is-control" : "is-baseline")));
        chart.append(group);
      });
      $("#study-chart-note").textContent =
        `B/E are means of three training seeds. E uses ${study.public_training_sources.lsvt} LSVT and ${study.public_training_sources.art} ArT training sources; CC-OCR is external to both.`;
      studyReading("The matched-budget primary test failed.",
        change.delta_f1_pp.toFixed(2) + " pp",
        "CC-OCR F1 change: CLTW-trained model versus original", [
          `CLTW training has lower mean recognition F1 on all three external datasets. On the primary CC-OCR test, B−A is ${interval(change)} pp and B−E is ${interval(primary.comparisons.B_vs_E)} pp.`,
          `Both training sets use ${study.sources} sources, ${study.steps} steps and three seeds. This study does not establish a transfer advantage for CLTW.`,
        ]);
      studyTable(["Dataset / pages", "A F1", "B F1", "E F1", "B−A / 95% interval (pp)", "B−E / 95% interval (pp)"],
        study.cohorts.map((cohort) => [
          `${cohort.label} / ${cohort.pages}${cohort.primary ? " · Primary" : ""}`,
          ...cohort.arms.map((arm) => arm.f1_pct.toFixed(3) + "%"),
          interval(cohort.comparisons.B_vs_A), interval(cohort.comparisons.B_vs_E),
        ]));
      studyTable(["Dataset", "Comparison", "Seed 20261031", "Seed 20261032", "Seed 20261033"],
        study.cohorts.flatMap((cohort) => Object.entries(cohort.comparisons).map(([key, row]) => [
          cohort.label, key.replaceAll("_", " "),
          ...["31", "32", "33"].map((seed) => row.seed_delta_f1_pp[seed].toFixed(3) + " pp"),
        ])), "All training seeds · F1 changes", true);
      studyTable(["Supplement", "Comparison", "F1 change / 95% interval (pp)", "Scope"],
        Object.entries(study.precision.comparisons).map(([key, row]) => [
          `${study.precision.pages} CC-OCR pages / ${study.precision.predictions} outputs`,
          key.replaceAll("_", " "), interval(row), "One seed; CPU execution and float32 decoder",
        ]), "Exploratory execution and precision sensitivity", true);
      studyTable(["Dataset", "B−A F1 / 95% interval (pp)", "Page Exact change", "Scope"],
        study.previous_transfer_recheck.cohorts.map((cohort) => [
          cohort.dataset, interval(cohort), cohort.delta_exact_pp.toFixed(3) + " pp",
          "Historical full weights; two recorded seeds; 104,008-token training budget",
        ]), "Retrospective full-weight recheck · 512 pages / 5,120 outputs", true);
      $("#study-boundary").textContent =
        `${study.scope} Formal inference uses 4-bit decoder weights and a ${integer(study.generation_limit)}-token generation limit. ` +
        "Intervals use 5,000 paired page/source resamples, conditional on fixed training seeds. CC-OCR includes 99 Chinese pages and one English page; unknown parent-document grouping is not covered by these intervals. References have not been independently relabeled. " +
        "The 2026-10-22 CLTW experiment uses a different 104,008-token training budget.";
    } else {
      const study = data.loop_case;
      $("#study-scope").textContent = `${study.model} · External table · 4-bit weights (NF4)`;
      chart.append(node("h3", "", "One header. Excessive continuation."),
        node("p", "study-axis-label", "Occurrences counted in the image and model output"));
      [
        ["Visible in the image", study.visible_occurrences, "is-baseline"],
        ["Repeated in the output", study.output_occurrences, "is-loop"],
      ].forEach(([label, value, variant]) => {
        const row = node("div", `study-count ${variant}`);
        const track = node("div", "study-bar-track");
        const fill = node("span", "study-bar-fill");
        fill.style.width = `${100 * value / study.output_occurrences}%`;
        track.append(fill);
        row.append(node("span", "", label), node("strong", "", integer(value)), track);
        chart.append(row);
      });
      const methodNames = {
        raw: "Original Hunyuan output", iterative_deduplicate: "Iterative deduplication",
        extended_deduplicate: "Extended deduplication", PP_mobile: "Ordinary PP-OCR mobile",
        physical_confidence_GOT: "Visual-evidence GOT rereading",
        four_line_chunk_PP_fallback: "Four-line chunks + PP fallback",
        fresh_full_GOT: "Fresh full-page GOT",
      };
      $("#study-chart-note").textContent =
        `A visually audited case from CC-OCR table photos. Output reached ${integer(study.generated_tokens)} generated tokens.`;
      studyReading("A header is repeated beyond the visible text.",
        integer(study.output_occurrences) + " repeats",
        `for a header with ${study.visible_occurrences} visible occurrences`, [
          "Deduplication removes the repeated continuation but leaves missing page content. Reading the pixels again is needed to recover it.",
          "Ordinary OCR is the strongest recovery control on this case: " +
            study.methods.PP_mobile.content_cer_pct.toFixed(2) + "% CER versus " +
            study.methods.physical_confidence_GOT.content_cer_pct.toFixed(2) + "% for the rereading candidate.",
        ]);
      studyTable(["Same-case method", "Character error rate", "Edits", "Page exact"],
        Object.entries(study.methods).map(([method, result]) => [
          methodNames[method], result.content_cer_pct.toFixed(2) + "%",
          integer(result.edits), result.page_exact ? "Yes" : "No",
        ]));
      $("#study-boundary").textContent =
        `${study.scope} Complete-cohort recovery evidence remains ${data.cross_model.full_cohort_gate}; ` +
        `${data.cross_model.pending_stages} stages are incomplete in this frozen snapshot.`;
    }
  }

  async function initializeResearch() {
    try {
      const response = await fetch("data/research.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`Research data HTTP ${response.status}`);
      state.research = await response.json();
      $("#study-tabs").addEventListener("click", (event) => {
        const button = event.target.closest("button[data-study]");
        if (!button) return;
        state.study = button.dataset.study;
        renderResearch();
      });
      renderResearch();
    } catch (error) {
      $("#study-scope").textContent = "Study data temporarily unavailable";
      $("#study-boundary").textContent = error.message;
    }
  }

  function renderUncertainty(model) {
    const overallScope = `${integer(model.overall.pages)} pages / ${integer(model.overall.source_groups)} sources`;
    const pairedScope = `${integer(model.rgs.all_conditions.pairs)} pairs / ${integer(model.rgs.all_conditions.source_groups)} sources`;
    const rows = ["content_cer", "exact", "pass5"].map((key) => [
      metricNames[key], model.overall.metrics[key], model.overall.ci95[key], overallScope,
    ]);
    rows.push(["Correct retention", model.rgs.all_conditions.rgs,
      model.rgs.all_conditions.ci95, pairedScope]);
    $("#uncertainty-rows").replaceChildren(...rows.map(([label, value, interval, scope]) => {
      const row = node("tr");
      [label, percent(value), interval.map((v) => percent(v)).join(" – "), scope]
        .forEach((text) => row.append(node("td", "", text)));
      return row;
    }));
  }

  async function initializeScenes() {
    const response = await fetch("data/scenes.json");
    if (!response.ok) throw new Error("Dataset scene images are unavailable");
    const scenes = await response.json();
    $("#scene-grid").replaceChildren(...scenes.map((scene) => {
      const figure = node("figure", "scene-preview");
      const link = node("a");
      link.href = scene.src;
      link.target = "_blank";
      link.rel = "noopener";
      link.title = scene.page_id;
      const image = node("img");
      image.src = scene.src;
      image.alt = `CLTW scene example: ${scene.label}`;
      image.loading = "lazy";
      link.append(image);
      figure.append(link, node("figcaption", "", scene.label));
      return figure;
    }));
  }

  function renderConfiguration() {
    const { dataset, protocol, models } = state.data;
    addDefinitions($("#generation-config"), [
      ["Test input", `${integer(dataset.canonical_test_pages)} pages; ${integer(dataset.scored_test_pages)} pages currently scored across all models`],
      ["Generation limit", `${integer(protocol.max_new_tokens)} tokens`],
      ["Decoding", protocol.decoding],
      ["Missing predictions", protocol.prediction_policy],
    ]);
    addDefinitions($("#scoring-config"), [
      ["Primary metrics", "Page Exact (page CER = 0); Pass@1%/3%/5% (page CER <= 1%/3%/5%, respectively)"],
      ["Secondary metrics", "Content CER; Worst 1% error share"],
      ["Text normalization", protocol.scoring],
      ["Confidence intervals", protocol.confidence_intervals],
      ["Reference audit", protocol.reference_audit],
      ["Pairing audit", protocol.pairing_audit],
    ]);
    $("#primary-prompt").textContent = protocol.primary_prompt;

    const exceptions = models.filter((model) => model.prompt !== protocol.primary_prompt);
    const tbody = $("#prompt-exceptions");
    tbody.innerHTML = "";
    exceptions.forEach((model) => {
      const row = document.createElement("tr");
      const name = document.createElement("td");
      const prompt = document.createElement("td");
      const link = document.createElement("a");
      link.href = modelUrl(model.id);
      link.textContent = model.name;
      name.append(link);
      prompt.textContent = model.prompt;
      row.append(name, prompt);
      tbody.append(row);
    });
  }

  const pp = (value, digits = 1) => `${value > 0 ? "+" : ""}${(value * 100).toFixed(digits)} pp`;

  function inspectCondition(model, conditionName) {
    state.matrixSelection = { model: model.id, condition: conditionName };
    const result = model.paired_by_condition[conditionName];
    const target = $("#matrix-inspector");
    const identity = node("div", "matrix-inspector-identity");
    const link = node("a", "", `${model.name} ↗`);
    link.href = modelUrl(model.id);
    identity.append(link, node("span", "", conditionNames[conditionName]));
    const stats = node("dl", "matrix-cell-stats");
    [["Normal Exact", percent(result.normal_exact)], ["Degraded Exact", percent(result.degraded_exact)],
      ["Exact change", pp(result.degraded_minus_normal_exact)],
      ["Page CER change", pp(result.degraded_minus_normal_page_cer, 2)]]
      .forEach(([label, value]) => addStat(stats, label, value));
    const intervalKey = state.sceneMetric === "degraded_minus_normal_page_cer"
      ? state.sceneMetric : "degraded_minus_normal_exact";
    const interval = result.ci95[intervalKey];
    const note = node("p", "matrix-interval",
      `${integer(result.pairs)} pairs · ${integer(result.source_groups)} source groups · ` +
      `${intervalKey.includes("page_cer") ? "Page CER" : "Page Exact"} change 95% interval: ${pp(interval[0], 2)} to ${pp(interval[1], 2)}`);
    target.replaceChildren(identity, stats, note);
    document.querySelectorAll(".scene-cell").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.model === model.id && button.dataset.condition === conditionName));
    });
  }

  function renderSceneMatrix() {
    const conditions = Object.keys(state.data.models[0].paired_by_condition);
    const models = sortedModels("content_cer");
    const values = models.flatMap((model) => conditions.map((name) => model.paired_by_condition[name][state.sceneMetric]));
    const minimum = Math.min(...values), maximum = Math.max(...values);
    const isRate = state.sceneMetric === "degraded_exact";
    const format = (value) => isRate ? percent(value, 1) : pp(value, state.sceneMetric.includes("page_cer") ? 2 : 1);
    $("#matrix-definition").textContent = {
      degraded_exact: "Exact transcription on degraded views in the paired subset. Higher is better.",
      degraded_minus_normal_exact: "Degraded minus normal Page Exact, in percentage points. Higher is better.",
      degraded_minus_normal_page_cer: "Degraded minus normal mean page CER, in percentage points. Lower is better.",
    }[state.sceneMetric];
    $("#matrix-scale").textContent = `Observed range ${format(minimum)} to ${format(maximum)} · greener = better`;
    const head = node("tr");
    const first = node("th", "", "Model / checkpoint");
    first.scope = "col";
    head.append(first);
    conditions.forEach((name) => {
      const result = models[0].paired_by_condition[name];
      const th = node("th");
      th.scope = "col";
      th.append(node("span", "", conditionNames[name]),
        node("small", "", `${result.pairs} pairs · ${result.source_groups} sources`));
      head.append(th);
    });
    $("#matrix-head").replaceChildren(head);
    $("#matrix-rows").replaceChildren(...models.map((model) => {
      const row = node("tr");
      const label = node("th");
      label.scope = "row";
      const link = node("a", "model-link", model.name);
      link.href = modelUrl(model.id);
      label.append(link);
      row.append(label);
      conditions.forEach((name) => {
        const result = model.paired_by_condition[name];
        const cell = node("td");
        const button = node("button", "scene-cell", format(result[state.sceneMetric]));
        button.type = "button";
        button.dataset.model = model.id;
        button.dataset.condition = name;
        let strength = (result[state.sceneMetric] - minimum) / (maximum - minimum || 1);
        if (state.sceneMetric.includes("page_cer")) strength = 1 - strength;
        button.style.background = `rgb(${[235, 221, 201].map((channel, i) => Math.round(channel + ([148, 188, 149][i] - channel) * strength)).join(",")})`;
        button.title = `${model.name} · ${conditionNames[name]}: Normal Exact ${percent(result.normal_exact)}, degraded Exact ${percent(result.degraded_exact)}; ${result.pairs} pairs`;
        button.setAttribute("aria-label", `${model.name}, ${conditionNames[name]}, ${format(result[state.sceneMetric])}. Show paired details.`);
        button.addEventListener("click", () => inspectCondition(model, name));
        cell.append(button);
        row.append(cell);
      });
      return row;
    }));
    const selection = state.matrixSelection || { model: models[0].id, condition: conditions[0] };
    inspectCondition(models.find((model) => model.id === selection.model), selection.condition);
  }

  function renderExample() {
    const example = state.cases.examples[state.exampleIndex];
    const output = example.outputs[state.exampleModel];
    const model = state.data.models.find((item) => item.id === state.exampleModel);
    $("#example-scene").value = String(state.exampleIndex);
    $("#example-model").value = state.exampleModel;
    if ($("#example-image").getAttribute("src") !== example.src) $("#example-image").src = example.src;
    $("#example-image").alt = `CLTW ${example.label}: ${example.page_id.split("/").pop()}`;
    $("#example-label").textContent = example.label;
    $("#example-page-id").textContent = example.page_id;
    $("#example-model-link").href = modelUrl(model.id);
    $("#example-model-link").title = `${model.name} evaluation`;
    $("#example-failure").replaceChildren(
      node("strong", "", example.featured.title),
      node("p", "", example.featured.description),
    );
    $("#example-output-status").textContent = output.provider_refused ? "Provider refusal · empty output"
      : output.differences.every(([tag]) => tag === "equal") ? "Text matches after removing whitespace" : example.featured.title;
    $("#example-diff").setAttribute("aria-pressed", String(state.showDiff));
    $("#example-diff").textContent = state.showDiff ? "Hide highlights" : "Highlight differences";
    const reference = $("#example-reference"), prediction = $("#example-output");
    reference.replaceChildren();
    prediction.replaceChildren();
    if (state.showDiff) {
      output.differences.forEach(([tag, left, right]) => {
        const contentChange = tag !== "equal" && /[\p{L}\p{N}]/u.test(left + right);
        if (left) reference.append(node("span", contentChange ? "diff-removed" : "", left));
        if (right) prediction.append(node("span", contentChange ? "diff-added" : "", right));
      });
    } else {
      reference.textContent = example.reference;
      prediction.textContent = output.display_text || "(Empty output)";
    }
    reference.scrollTop = prediction.scrollTop = 0;
    if (state.showDiff && !["Wrong words throughout", "Wrong subject and facts", "Rewritten passage"].includes(example.featured.title)) {
      requestAnimationFrame(() => [reference, prediction].forEach((container) => {
        const changes = [...container.querySelectorAll(".diff-removed, .diff-added")]
          .filter((span) => (span.textContent.match(/[\p{L}\p{N}]/gu) || []).length >= 8)
          .sort((a, b) => b.textContent.length - a.textContent.length);
        const target = changes[0];
        if (target) container.scrollTop += target.getBoundingClientRect().top - container.getBoundingClientRect().top - 20;
      }));
    }
    $("#diff-note").textContent = state.showDiff
      ? "Peach: missing or changed text. Green: added or changed text. Punctuation-only differences stay uncolored. Highlights ignore whitespace; original outputs are included in the download."
      : "Transcribed text with line breaks. Thinking and HTML wrappers are removed for reading; original outputs are included in the download.";
  }

  function initializeImageViewer() {
    const viewport = $("#image-viewport"), image = $("#example-image");
    let scale = 1, x = 0, y = 0;
    const pointers = new Map();
    let pinchDistance = 0;
    const apply = () => {
      const width = viewport.clientWidth, height = viewport.clientHeight;
      const ratio = (image.naturalWidth || width) / (image.naturalHeight || height);
      const fitWidth = Math.min(width, height * ratio), fitHeight = fitWidth / ratio;
      const limitX = Math.max(0, (fitWidth * scale - width) / 2);
      const limitY = Math.max(0, (fitHeight * scale - height) / 2);
      x = Math.max(-limitX, Math.min(limitX, x));
      y = Math.max(-limitY, Math.min(limitY, y));
      image.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
      $("#image-scale").textContent = `${Math.round(scale * 100)}%`;
      $("#image-out").disabled = scale <= 1;
      $("#image-in").disabled = scale >= 8;
    };
    const reset = () => { scale = 1; x = y = 0; apply(); };
    const zoom = (factor, px = 0, py = 0) => {
      const next = Math.max(1, Math.min(8, scale * factor));
      x = px - (px - x) * next / scale;
      y = py - (py - y) * next / scale;
      scale = next;
      apply();
    };
    image.addEventListener("load", reset);
    new ResizeObserver(apply).observe(viewport);
    $("#image-in").addEventListener("click", () => zoom(1.35));
    $("#image-out").addEventListener("click", () => zoom(1 / 1.35));
    $("#image-reset").addEventListener("click", reset);
    viewport.addEventListener("wheel", (event) => {
      event.preventDefault();
      const rect = viewport.getBoundingClientRect();
      zoom(Math.exp(-event.deltaY * .002), event.clientX - rect.left - rect.width / 2, event.clientY - rect.top - rect.height / 2);
    }, { passive: false });
    viewport.addEventListener("keydown", (event) => {
      if (["+", "=", "-", "0", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) event.preventDefault();
      if (["+", "="].includes(event.key)) zoom(1.35);
      if (event.key === "-") zoom(1 / 1.35);
      if (event.key === "0") reset();
      if (event.key.startsWith("Arrow")) {
        x += ({ ArrowLeft: 30, ArrowRight: -30 }[event.key] || 0);
        y += ({ ArrowUp: 30, ArrowDown: -30 }[event.key] || 0);
        apply();
      }
    });
    viewport.addEventListener("pointerdown", (event) => {
      viewport.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      viewport.classList.add("is-dragging");
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
      }
    });
    viewport.addEventListener("pointermove", (event) => {
      const previous = pointers.get(event.pointerId);
      if (!previous) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDistance) zoom(distance / pinchDistance);
        pinchDistance = distance;
      } else { x += event.clientX - previous.x; y += event.clientY - previous.y; apply(); }
    });
    const release = (event) => {
      pointers.delete(event.pointerId);
      pinchDistance = 0;
      if (!pointers.size) viewport.classList.remove("is-dragging");
    };
    ["pointerup", "pointercancel", "lostpointercapture"].forEach((name) => viewport.addEventListener(name, release));
    const expand = $("#image-expand"), browser = $("#example-browser");
    const setExpanded = (expanded) => {
      browser.classList.toggle("is-expanded", expanded);
      document.body.classList.toggle("viewer-expanded", expanded);
      expand.setAttribute("aria-pressed", String(expanded));
      expand.textContent = expanded ? "Close ×" : "Expand ↗";
      if (expanded) { browser.setAttribute("role", "dialog"); browser.setAttribute("aria-modal", "true"); browser.setAttribute("aria-label", "Image and transcription viewer"); viewport.focus(); }
      else { browser.removeAttribute("role"); browser.removeAttribute("aria-modal"); expand.focus(); }
      document.querySelectorAll("body > header, body > footer, #home-view > :not(#examples), #examples .section-heading, .example-toolbar, .example-footer, #case-search-status")
        .forEach((element) => { element.inert = expanded; });
      apply();
    };
    expand.addEventListener("click", () => setExpanded(!browser.classList.contains("is-expanded")));
    document.addEventListener("keydown", (event) => {
      if (!browser.classList.contains("is-expanded")) return;
      if (event.key === "Escape") { event.preventDefault(); setExpanded(false); }
      if (event.key === "Tab") {
        const focusable = [...browser.querySelectorAll('button:not(:disabled), select, a[href], [tabindex="0"]')];
        const first = focusable[0], last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
  }

  async function initializeExamples() {
    const response = await fetch("data/cases.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Recorded examples are unavailable");
    state.cases = await response.json();
    state.exampleModel = state.cases.examples[0].featured.model;
    $("#example-scene").replaceChildren(...state.cases.examples.map((example, i) => {
      const model = state.data.models.find((item) => item.id === example.featured.model);
      const option = node("option", "", `${model.name} · ${example.featured.title}`);
      option.value = String(i);
      return option;
    }));
    $("#example-model").replaceChildren(...state.data.models.map((model) => {
      const option = node("option", "", model.name);
      option.value = model.id;
      return option;
    }));
    $("#example-scene").addEventListener("change", (event) => {
      state.exampleIndex = Number(event.target.value);
      state.exampleModel = state.cases.examples[state.exampleIndex].featured.model;
      state.showDiff = true;
      $("#case-search").value = "";
      $("#case-search-status").textContent = "";
      renderExample();
    });
    $("#example-model").addEventListener("change", (event) => {
      state.exampleModel = event.target.value;
      state.exampleIndex = state.cases.examples.findIndex((example) => example.featured.model === state.exampleModel);
      state.showDiff = true;
      $("#case-search").value = "";
      $("#case-search-status").textContent = "";
      renderExample();
    });
    $("#example-diff").addEventListener("click", () => { state.showDiff = !state.showDiff; renderExample(); });
    $("#case-search").addEventListener("input", (event) => {
      const query = event.target.value.trim();
      const matches = state.cases.examples.map((example, i) => ({ example, i }))
        .filter(({ example }) => example.page_id === query || example.page_id.split("/").pop() === query);
      const match = matches.find(({ example }) => example.featured.model === state.exampleModel) || matches[0];
      const index = match?.i ?? -1;
      $("#case-search-status").textContent = !query ? "" : index < 0
        ? "No exact match in the selected examples. Paste a full page ID or complete filename." : "Exact example found.";
      if (index >= 0) {
        state.exampleIndex = index;
        state.exampleModel = state.cases.examples[index].featured.model;
        state.showDiff = true;
        renderExample();
      }
    });
    initializeImageViewer();
    renderExample();
  }

  function metricBar(value) {
    const wrapper = document.createElement("span");
    wrapper.className = "metric-bar";
    const track = document.createElement("span");
    track.className = "metric-bar-track";
    const fill = document.createElement("span");
    fill.className = "metric-bar-fill";
    fill.style.width = `${Math.max(0, Math.min(100, 100 * value))}%`;
    const text = document.createElement("span");
    text.className = "metric-bar-value";
    text.textContent = percent(value);
    track.append(fill);
    wrapper.append(track, text);
    return wrapper;
  }

  function renderGroupedRows(target, groups, order) {
    target.innerHTML = "";
    order.forEach((name) => {
      const group = groups[name];
      const row = document.createElement("tr");
      const label = document.createElement("td");
      const pages = document.createElement("td");
      const cer = document.createElement("td");
      const exact = document.createElement("td");
      const pass5 = document.createElement("td");
      label.textContent = name;
      pages.textContent = integer(group.pages);
      cer.textContent = percent(group.metrics.content_cer);
      exact.append(metricBar(group.metrics.exact));
      pass5.append(metricBar(group.metrics.pass5));
      row.append(label, pages, cer, exact, pass5);
      target.append(row);
    });
  }

  function renderConditionRows(model) {
    const tbody = $("#condition-rows");
    tbody.innerHTML = "";
    Object.entries(model.paired_by_condition).forEach(([name, condition]) => {
      const row = document.createElement("tr");
      const label = document.createElement("td");
      const pairs = document.createElement("td");
      const normal = document.createElement("td");
      const degraded = document.createElement("td");
      const exactDelta = document.createElement("td");
      const cerDelta = document.createElement("td");
      label.textContent = conditionNames[name] || name;
      pairs.textContent = integer(condition.pairs);
      normal.textContent = percent(condition.normal_exact);
      degraded.textContent = percent(condition.degraded_exact);
      exactDelta.textContent = `${(100 * condition.degraded_minus_normal_exact).toFixed(1)} pp`;
      cerDelta.textContent = `${condition.degraded_minus_normal_page_cer >= 0 ? "+" : ""}${(
        100 * condition.degraded_minus_normal_page_cer
      ).toFixed(2)} pp`;
      exactDelta.className = condition.degraded_minus_normal_exact < 0
        ? "delta-negative"
        : "delta-positive";
      cerDelta.className = condition.degraded_minus_normal_page_cer > 0
        ? "delta-negative"
        : "delta-positive";
      row.append(label, pairs, normal, degraded, exactDelta, cerDelta);
      tbody.append(row);
    });
  }

  function renderModel(modelId) {
    const model = state.data.models.find((item) => item.id === modelId);
    if (!model) {
      window.location.replace("./");
      return;
    }

    $("#home-view").hidden = true;
    $("#model-view").hidden = false;
    document.title = `${model.name} · CLTW Leaderboard`;
    $("#model-name").textContent = model.name;
    $("#model-type").textContent = typeNames[model.type] || model.type;
    $("#model-checkpoint").textContent = model.checkpoint;
    $("#model-prompt").textContent = model.prompt;
    $(".skip-link").href = "#model-view";
    const ordered = sortedModels("content_cer");
    const rank = ordered.findIndex((item) => item.id === model.id);
    $("#model-rank").textContent = `Content CER rank ${rank + 1} / ${ordered.length}`;
    $("#model-type").dataset.type = model.type;
    const navigation = $("#profile-navigation");
    navigation.innerHTML = "";
    [[rank - 1, "← Previous model"], [rank + 1, "Next model →"]].forEach(([i, title]) => {
      if (!ordered[i]) return;
      const link = node("a", "", title);
      link.href = modelUrl(ordered[i].id);
      link.title = ordered[i].name;
      navigation.append(link);
    });
    const long = model.by_length[">500"];
    const gap = model.paired.degraded_minus_normal_exact;
    $("#model-observation").replaceChildren(
      node("strong", "", "Evaluation observations"),
      node("p", "", `Across ${integer(long.pages)} pages with more than 500 characters, Page Exact is ${percent(long.metrics.exact)}. ` +
        `For identical-content pairs, Page Exact on degraded views is ${(Math.abs(gap) * 100).toFixed(2)} percentage points ${gap < 0 ? "lower" : "higher"} than on normal views.`),
    );

    const stats = $("#model-stats");
    stats.innerHTML = "";
    [
      [metricNames.content_cer, percent(model.overall.metrics.content_cer)],
      [metricNames.exact, percent(model.overall.metrics.exact)],
      [metricNames.pass1, percent(model.overall.metrics.pass1)],
      [metricNames.pass5, percent(model.overall.metrics.pass5)],
      [metricNames.rgs, percent(model.rgs.all_conditions.rgs)],
      [metricNames.tail, percent(model.worst_one_percent_edit_share)],
    ].forEach(([label, value]) => addStat(stats, label, value));

    renderUncertainty(model);
    const inference = model.inference;
    addDefinitions($("#model-config"), [
      ["Model ID", model.id],
      ["Checkpoint / API", model.checkpoint],
      ["Inference method", inference.method],
      ["Generation limit", inference.max_new_tokens ? `${integer(inference.max_new_tokens)} tokens` : "Native output"],
      ["Sampling", inference.do_sample === false ? "Disabled" : "Model default"],
      ["Beam count", inference.num_beams == null ? "Model default" : String(inference.num_beams)],
      ["Temperature", inference.temperature == null ? "Model default" : String(inference.temperature)],
      ["Thinking", inference.thinking || "Not applicable"],
      ...(inference.base_url ? [["API URL", inference.base_url]] : []),
      ...(model.full_text ? [
        ["Full-text CER (including Latin letters and punctuation)", percent(model.full_text.cer)],
        ["Adjacent repetition alerts", `${integer(model.full_text.adjacent_repeat_pages)} pages`],
      ] : []),
      ...(model.api_diagnostics ? [
        ["API refusals", `${integer(model.api_diagnostics.refused_pages)} pages`],
        ["Generation limit reached", `${integer(model.api_diagnostics.truncated_pages)} pages`],
      ] : []),
      [
        "Correct retention (RGS) 95% CI",
        `${percent(model.rgs.all_conditions.ci95[0])} to ${percent(model.rgs.all_conditions.ci95[1])}`,
      ],
      [
        "Correct retention (RGS) sample",
        `${integer(model.rgs.all_conditions.retained_pairs)} / ${integer(model.rgs.all_conditions.normal_correct_pairs)} pairs correct on normal views remain correct on degraded views`,
      ],
    ]);

    renderGroupedRows(
      $("#length-rows"),
      model.by_length,
      ["0-50", "51-100", "101-200", "201-500", ">500"],
    );
    renderGroupedRows(
      $("#region-rows"),
      model.by_regions,
      ["1-5", "6-10", "11-20", ">20"],
    );
    renderConditionRows(model);
  }

  function bindControls() {
    $("#scene-metric").addEventListener("change", (event) => { state.sceneMetric = event.target.value; renderSceneMatrix(); });
    $("#table-details").addEventListener("click", (event) => {
      const detailed = event.currentTarget.getAttribute("aria-pressed") !== "true";
      event.currentTarget.setAttribute("aria-pressed", String(detailed));
      event.currentTarget.textContent = detailed ? "Fewer metrics −" : "More metrics ＋";
      $(".leaderboard-table").dataset.detailed = String(detailed);
      if (!detailed && ["pass1", "pass3", "tail"].includes(state.sort)) { state.sort = "content_cer"; renderLeaderboard(); }
    });
    const issue = new URL($("#submission-link").href);
    issue.searchParams.set("title", "Model evaluation request: [checkpoint]");
    issue.searchParams.set("body", "Checkpoint / API version:\nModel ID:\nEvaluation date:\nPrediction file URL (2,832 pages with status and actual input image hashes):\nRun metadata file URL:\nActual prompt:\nImage preprocessing:\nGeneration limit:\nDecoding / thinking settings:\nReference text or paired normal image used for inference:\nUnresolved failures / retries:\nDataset release: CLTW-canonical-2026-10-17\nAdditional notes:\n");
    $("#submission-link").href = issue.href;
    $("#comparison-all").addEventListener("click", () => {
      state.selected = new Set(state.data.models.map((model) => model.id));
      $("#comparison-models").querySelectorAll("input").forEach((input) => { input.checked = true; });
      renderComparison();
    });
    $("#comparison-metric").addEventListener("change", (event) => {
      state.comparisonMetric = event.target.value;
      renderComparison();
    });
    $("#view-switch").addEventListener("click", (event) => {
      const button = event.target.closest("button[data-view]");
      if (!button) return;
      $("#comparison-panel").dataset.view = button.dataset.view;
      $("#view-switch").querySelectorAll("button").forEach((item) =>
        item.setAttribute("aria-pressed", String(item === button)));
    });
    $("#model-search").addEventListener("input", (event) => {
      state.search = event.target.value.trim();
      renderLeaderboard();
    });
    $("#type-filter").addEventListener("click", (event) => {
      const button = event.target.closest("button[data-type]");
      if (!button) return;
      state.type = button.dataset.type;
      document.querySelectorAll("#type-filter button").forEach((item) => {
        item.setAttribute("aria-pressed", String(item === button));
      });
      renderLeaderboard();
    });
    document.querySelector(".leaderboard-table thead").addEventListener("click", (event) => {
      const button = event.target.closest("button[data-sort]");
      if (!button) return;
      state.sort = button.dataset.sort;
      renderLeaderboard();
    });
  }

  async function initialize() {
    const response = await fetch("data/benchmark.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Failed to load benchmark data: ${response.status}`);
    state.data = await response.json();
    $("#snapshot-date").textContent = `CLTW benchmark snapshot · ${state.data.snapshot}`;
    const modelId = new URLSearchParams(window.location.search).get("model");
    if (modelId) {
      renderModel(modelId);
      return;
    }
    renderSnapshot();
    renderConfiguration();
    state.selected = new Set(state.data.models.map((model) => model.id));
    renderComparisonPicker();
    renderComparison();
    renderSceneMatrix();
    bindControls();
    renderLeaderboard();
    await initializeScenes();
    await initializeExamples();
    await initializeResearch();
  }

  initialize().catch((error) => {
    const main = node("main", "section");
    const inner = node("div", "section-inner");
    inner.append(node("h1", "", "Failed to load data"), node("p", "", error.message));
    main.append(inner);
    document.body.replaceChildren(main);
  });
})();

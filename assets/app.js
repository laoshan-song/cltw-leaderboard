(() => {
  "use strict";

  const state = {
    data: null,
    search: "",
    type: "all",
    sort: "content_cer",
  };

  const $ = (selector) => document.querySelector(selector);
  const percent = (value, digits = 2) => `${(100 * value).toFixed(digits)}%`;
  const integer = (value) => Number(value).toLocaleString("en-US");
  const typeNames = {
    "OCR pipeline": "OCR 流水线",
    "OCR model": "OCR 模型",
    "General model": "通用视觉模型",
    "Closed model": "闭源视觉模型",
  };
  const conditionNames = {
    "Occluded Scene Text": "遮挡",
    "Perspective-distorted Scene Text": "透视变形",
    "Reflective Scene Text": "反光",
    "Small-scale & Blurry Scene Text": "小字 / 模糊",
    "Underexposed Scene Text": "低照度",
  };

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
    const direction = ["content_cer", "tail"].includes(state.sort) ? 1 : -1;
    return state.data.models
      .filter((model) => state.type === "all" || model.type === state.type)
      .filter((model) => {
        const text = `${model.name} ${model.id} ${model.checkpoint}`.toLowerCase();
        return text.includes(state.search.toLowerCase());
      })
      .sort((left, right) => (
        modelMetric(left, state.sort) - modelMetric(right, state.sort)
      ) * direction);
  }

  function renderLeaderboard() {
    const models = filteredModels();
    const tbody = $("#leaderboard-rows");
    tbody.innerHTML = "";

    models.forEach((model, index) => {
      const row = document.createElement("tr");
      const rank = document.createElement("td");
      rank.className = "rank-value";
      rank.textContent = String(index + 1);

      const name = document.createElement("td");
      const link = document.createElement("a");
      link.className = "model-link";
      link.href = modelUrl(model.id);
      link.textContent = model.name;
      const id = document.createElement("span");
      id.className = "model-id";
      id.textContent = model.checkpoint;
      name.append(link, id);

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
        cell.textContent = percent(modelMetric(model, key));
        return cell;
      });
      row.append(rank, name, type, ...values);
      tbody.append(row);
    });

    const pending = state.data.dataset.excluded_revised_image_pages;
    $("#table-note").textContent = models.length
      ? `显示 ${models.length} / ${state.data.models.length} 个模型；RGS 使用 ${integer(state.data.dataset.rgs_common_pairs)} 个公共配对。` +
        (pending ? `${pending} 张换图页待补推理。` : "测试集全部计分。")
      : "没有匹配的模型。";

    document.querySelectorAll("[data-sort]").forEach((button) => {
      button.dataset.active = String(button.dataset.sort === state.sort);
    });
  }

  function renderSnapshot() {
    const dataset = state.data.dataset;
    const stats = $("#snapshot-stats");
    $("#leaderboard-scope").textContent =
      `${state.data.models.length} MODELS · ${integer(dataset.scored_test_pages)} PAGES EACH`;
    stats.innerHTML = "";
    [
      ["计分页", integer(dataset.scored_test_pages)],
      ["模型", integer(state.data.models.length)],
      ["计分字符", integer(dataset.test_reference_characters)],
      ["同文配对", integer(dataset.exact_content_pairs)],
      ["RGS 配对", integer(dataset.rgs_common_pairs)],
      ["物理条件", integer(Object.keys(dataset.conditions).length)],
    ].forEach(([label, value]) => addStat(stats, label, value));
  }

  function renderReliabilityChart() {
    const chart = $("#reliability-chart");
    chart.innerHTML = "";
    [...state.data.models]
      .sort((left, right) => (
        right.overall.metrics.pass5 - left.overall.metrics.pass5
      ))
      .forEach((model) => {
        const row = document.createElement("a");
        row.className = "reliability-row";
        row.dataset.type = model.type;
        row.href = modelUrl(model.id);
        row.setAttribute(
          "aria-label",
          `${model.name} PagePass@5 ${percent(model.overall.metrics.pass5)}`,
        );

        const label = document.createElement("span");
        label.className = "reliability-label";
        label.textContent = model.name;

        const track = document.createElement("span");
        track.className = "reliability-track";
        const fill = document.createElement("span");
        fill.className = "reliability-fill";
        fill.style.width = `${100 * model.overall.metrics.pass5}%`;
        track.append(fill);

        const value = document.createElement("span");
        value.className = "reliability-value";
        value.textContent = percent(model.overall.metrics.pass5);
        row.append(label, track, value);
        chart.append(row);
      });
  }

  function renderRgsChart() {
    const chart = $("#rgs-chart");
    chart.innerHTML = "";
    [...state.data.models]
      .sort((left, right) => (
        right.rgs.all_conditions.rgs - left.rgs.all_conditions.rgs
      ))
      .forEach((model) => {
        const metric = model.rgs.all_conditions;
        const row = document.createElement("a");
        row.className = "reliability-row";
        row.dataset.type = model.type;
        row.href = modelUrl(model.id);
        row.title = `95% CI ${percent(metric.ci95[0])}–${percent(metric.ci95[1])}`;
        row.setAttribute(
          "aria-label",
          `${model.name} RGS ${percent(metric.rgs)}，95% 置信区间 ${percent(metric.ci95[0])} 至 ${percent(metric.ci95[1])}`,
        );

        const label = document.createElement("span");
        label.className = "reliability-label";
        label.textContent = model.name;

        const track = document.createElement("span");
        track.className = "reliability-track";
        const fill = document.createElement("span");
        fill.className = "reliability-fill";
        fill.style.width = `${100 * metric.rgs}%`;
        track.append(fill);

        const value = document.createElement("span");
        value.className = "reliability-value";
        value.textContent = percent(metric.rgs);
        row.append(label, track, value);
        chart.append(row);
      });
  }

  function renderConfiguration() {
    const { dataset, protocol, models } = state.data;
    addDefinitions($("#generation-config"), [
      ["测试输入", `${integer(dataset.canonical_test_pages)} 页；当前共同计分 ${integer(dataset.scored_test_pages)} 页`],
      ["生成上限", `${integer(protocol.max_new_tokens)} tokens`],
      ["解码", protocol.decoding],
      ["预测缺失", protocol.prediction_policy],
    ]);
    addDefinitions($("#scoring-config"), [
      ["主指标", "Page Exact、PagePass@1/3/5"],
      ["辅助指标", "Content CER、Worst 1% error share"],
      ["文本处理", protocol.scoring],
      ["置信区间", protocol.confidence_intervals],
      ["标签审计", protocol.reference_audit],
      ["配对审计", protocol.pairing_audit],
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

    const stats = $("#model-stats");
    stats.innerHTML = "";
    [
      ["Content CER", percent(model.overall.metrics.content_cer)],
      ["Page Exact", percent(model.overall.metrics.exact)],
      ["PagePass@1", percent(model.overall.metrics.pass1)],
      ["PagePass@5", percent(model.overall.metrics.pass5)],
      ["RGS", percent(model.rgs.all_conditions.rgs)],
      ["Worst 1% errors", percent(model.worst_one_percent_edit_share)],
    ].forEach(([label, value]) => addStat(stats, label, value));

    const inference = model.inference;
    addDefinitions($("#model-config"), [
      ["模型 ID", model.id],
      ["检查点 / API", model.checkpoint],
      ["推理方式", inference.method],
      ["生成上限", inference.max_new_tokens ? `${integer(inference.max_new_tokens)} tokens` : "Native output"],
      ["采样", inference.do_sample === false ? "Disabled" : "Model default"],
      ["Beam", inference.num_beams == null ? "Model default" : String(inference.num_beams)],
      ["Temperature", inference.temperature == null ? "Model default" : String(inference.temperature)],
      ["Thinking", inference.thinking || "Not applicable"],
      ...(inference.base_url ? [["API 地址", inference.base_url]] : []),
      ...(model.full_text ? [
        ["含英文与标点 CER", percent(model.full_text.cer)],
        ["重复片段告警", `${integer(model.full_text.adjacent_repeat_pages)} 页`],
      ] : []),
      ...(model.api_diagnostics ? [
        ["接口拒答", `${integer(model.api_diagnostics.refused_pages)} 页`],
        ["触及生成上限", `${integer(model.api_diagnostics.truncated_pages)} 页`],
      ] : []),
      [
        "RGS 95% 区间",
        `${percent(model.rgs.all_conditions.ci95[0])}–${percent(model.rgs.all_conditions.ci95[1])}`,
      ],
      [
        "RGS 样本",
        `${integer(model.rgs.all_conditions.retained_pairs)} / ${integer(model.rgs.all_conditions.normal_correct_pairs)} 个正常图正确配对保持全对`,
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
    renderRgsChart();
    renderReliabilityChart();
    renderConfiguration();
    bindControls();
    renderLeaderboard();
  }

  initialize().catch((error) => {
    document.body.innerHTML = `<main class="section"><div class="section-inner"><h1>数据加载失败</h1><p>${error.message}</p></div></main>`;
  });
})();

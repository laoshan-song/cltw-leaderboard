(() => {
  "use strict";

  const state = {
    data: null,
    search: "",
    type: "all",
    sort: "content_cer",
    comparisonMetric: "pass5",
    selected: new Set([
      "doubao_seed21_turbo", "glmocr", "kimi_k28", "qwen3vl_8b",
      "fireredocr", "hunyuanocr", "paddleocrvl", "ppocrv4_server",
    ]),
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

  const profiles = [
    ["doubao", "Doubao", "DB", "api", "豆包系列闭源多模态模型。通过 API 接收完整图像，按统一指令转写可见文字；本页展示当前检查点在真实场景长文本中的整页表现。"],
    ["kimi", "Kimi", "K", "api", "Kimi K2.8 Preview 的 API 预览版本。本次评测关闭思考，使用完整图像与统一转写指令，观察它对长文本、复杂布局和真实退化的读取表现。"],
    ["glm53", "GLM", "GL", "api", "GLM 系列闭源视觉模型。通过 API 完成整页文字转写，使用冻结的图像、提示词与评分协议，和其他系统在同一批页面上比较。"],
    ["glmocr", "GLM-OCR", "GL", "ocr", "面向文字读取的专用模型。使用原生 OCR 入口处理整页图像，在 CLTW 上比较字符准确性、页面完整性和同文退化视图的识别表现。"],
    ["qwen", "Qwen", "Q", "vision", "Qwen 系列通用视觉语言模型。结合完整图像和文字指令生成转写；不同规模与版本分别评测，保留各自的原生图像处理方式。"],
    ["paddleocrvl", "PaddleOCR-VL", "P", "ocr", "PaddleOCR 系列视觉语言文字识别模型。以原生 OCR 入口读取完整图像，评测多区域长文本与不同物理拍摄条件下的转写完整性。"],
    ["firered", "FireRed", "F", "ocr", "面向文字识别的专用模型。使用原生识别入口转写整页内容，并在冻结测试集上统计字符错误、整页成功与退化保持情况。"],
    ["hunyuan", "HunyuanOCR", "H", "ocr", "混元系列文字识别模型。以完整图像为输入，通过原生 OCR 入口进行转写；本页同时呈现长文本负担、布局复杂度和真实退化下的表现。"],
    ["ppocr", "PP-OCR", "PP", "pipeline", "文字检测与识别组成的 OCR 流水线。先定位文字区域，再识别并按几何关系组织阅读顺序，评测从完整场景图像到整页转写的处理链。"],
    ["gotocr", "GOT-OCR", "G", "ocr", "面向 OCR 任务的文字读取模型。使用固定的原生识别入口处理完整页面，在统一评分下比较内容恢复与整页正确性。"],
    ["deepseek", "DeepSeek-OCR", "D", "ocr", "DeepSeek 系列文字识别模型。本次使用其原生 OCR 入口读取整页图像，记录它在长输出、复杂区域与退化视图中的识别表现。"],
    ["intern", "InternVL", "IV", "vision", "InternVL 系列通用多模态模型。根据图像和统一指令生成文字转写，观察通用视觉理解能力在完整长文本读取中的表现。"],
    ["surya", "Surya", "S", "ocr", "面向文字读取的 Surya OCR 系统。使用官方推理入口处理整页图像，按同一套内容评分和配对协议统计识别表现。"],
    ["ovis", "Ovis", "O", "vision", "Ovis 系列通用视觉语言模型。通过图像与文字指令进行整页转写，在真实长文本场景中观察内容准确性与持续读取的完整性。"],
  ];
  const metricNames = {
    content_cer: "字符错误率", exact: "整页全对率",
    pass5: "5% 容错通过率", rgs: "退化保持率",
  };

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text != null) element.textContent = text;
    return element;
  }

  function profileFor(model) {
    const profile = profiles.find(([prefix]) => model.id.startsWith(prefix));
    if (!profile) throw new Error(`Missing model profile: ${model.id}`);
    return { family: profile[1], mark: profile[2], image: profile[3], bio: profile[4] };
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
      const mark = node("span", "model-mark", profileFor(model).mark);
      mark.dataset.type = model.type;
      mark.setAttribute("aria-hidden", "true");
      const nameText = node("div");
      const link = document.createElement("a");
      link.className = "model-link";
      link.href = modelUrl(model.id);
      link.textContent = model.name;
      const id = document.createElement("span");
      id.className = "model-id";
      id.textContent = model.checkpoint;
      nameText.append(link, id);
      nameCell.append(mark, nameText);
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
        cell.textContent = percent(modelMetric(model, key));
        return cell;
      });
      row.append(rank, name, type, ...values);
      tbody.append(row);
    });

    const pending = state.data.dataset.excluded_revised_image_pages;
    $("#table-note").textContent = models.length
      ? `显示 ${models.length} / ${state.data.models.length} 个模型；RGS 使用 ${integer(state.data.dataset.rgs_common_pairs)} 个公共配对。` +
        (pending ? `${pending} 张换图页待补推理。` : "测试集全部计分。") +
        "排名按当前指标在全部模型中计算。"
      : "没有匹配的模型。";

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
    $("#hero-page-count").textContent = `${integer(dataset.scored_test_pages)} PAGES`;
    stats.innerHTML = "";
    [
      ["完整测试页", integer(dataset.scored_test_pages)],
      ["参评模型", integer(state.data.models.length)],
      ["计分字符", integer(dataset.test_reference_characters)],
      ["同文测试配对", integer(dataset.exact_content_pairs)],
      ["现场图像", integer(dataset.pages)],
      ["场景条件", integer(Object.keys(dataset.conditions).length)],
    ].forEach(([label, value]) => addStat(stats, label, value));
  }

  function renderComparison() {
    const models = sortedModels(state.comparisonMetric).filter((model) => state.selected.has(model.id));
    const maximum = state.comparisonMetric === "content_cer"
      ? Math.max(.05, Math.ceil(Math.max(...models.map((model) => modelMetric(model, "content_cer"))) * 20) / 20)
      : 1;
    const chart = $("#comparison-bars");
    chart.innerHTML = "";
    chart.parentElement.style.setProperty("--plot-width", `${Math.max(700, models.length * 105 + 110)}px`);
    $("#comparison-axis").replaceChildren(...[1, .75, .5, .25, 0].map((ratio) => node("span", "", percent(maximum * ratio, 0))));
    models.forEach((model, index) => {
      const value = modelMetric(model, state.comparisonMetric);
      const column = node("a", "comparison-column");
      column.href = modelUrl(model.id);
      column.dataset.type = model.type;
      column.style.setProperty("--height", `${value / maximum * 260}px`);
      column.setAttribute("aria-label", `${model.name}，${metricNames[state.comparisonMetric]} ${percent(value)}`);
      const body = node("span", "column-body");
      const prism = node("span", "column-prism");
      prism.append(node("span", "column-face"), node("span", "column-top"), node("span", "column-side"));
      body.append(node("span", "column-value", percent(value)), prism);
      const label = model.name.replace(" Preview (API)", "").replace(" (API)", "");
      column.append(body, node("span", "column-name", label), node("span", "column-index", String(index + 1).padStart(2, "0")));
      chart.append(column);
    });
    $("#comparison-note").textContent = `${metricNames[state.comparisonMetric]} · ${models.length} 个已选模型`;
    $("#comparison-scale").textContent = `标尺从 0 到 ${percent(maximum, 0)} · ${state.comparisonMetric === "content_cer" ? "越低越好" : "越高越好"}`;
    $("#selection-count").textContent = `${models.length} / ${state.data.models.length}`;
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

  function renderHighlights() {
    const target = $("#highlights");
    target.innerHTML = "";
    [["content_cer", "最低字符错误率"], ["exact", "最高整页全对率"], ["rgs", "最高退化保持率"]]
      .forEach(([metric, title]) => {
        const model = sortedModels(metric)[0];
        const card = node("a", "highlight");
        card.href = modelUrl(model.id);
        card.append(node("span", "highlight-label", title),
          node("strong", "highlight-value", percent(modelMetric(model, metric))),
          node("span", "highlight-name", model.name));
        target.append(card);
      });
  }

  function renderGallery() {
    const gallery = $("#model-gallery");
    gallery.innerHTML = "";
    state.data.models.forEach((model, index) => {
      const profile = profileFor(model);
      const card = node("a", "model-card");
      card.href = modelUrl(model.id);
      card.dataset.type = model.type;
      const art = node("div", "card-image");
      const image = node("img");
      image.src = `assets/images/${profile.image}.webp`;
      image.alt = `${profile.family} 模型概念插画`;
      image.loading = "lazy";
      image.width = 900;
      image.height = 900;
      art.append(image, node("span", "card-code", `${String(index + 1).padStart(2, "0")} / ${profile.family}`),
        node("span", "card-arrow", "↗"));
      const info = node("div", "card-info");
      const score = node("div", "card-score");
      score.append(node("span", "", "整页全对率"), node("strong", "", percent(model.overall.metrics.exact)));
      info.append(typeLabel(model), node("h3", "", model.name), score);
      card.append(art, info);
      gallery.append(card);
    });
    const updateButtons = () => {
      $("#gallery-prev").disabled = gallery.scrollLeft < 2;
      $("#gallery-next").disabled = gallery.scrollLeft + gallery.clientWidth >= gallery.scrollWidth - 2;
    };
    gallery.addEventListener("scroll", updateButtons, { passive: true });
    window.addEventListener("resize", updateButtons, { passive: true });
    ["prev", "next"].forEach((direction) => $("#gallery-" + direction).addEventListener("click", () => {
      gallery.scrollBy({
        left: (direction === "next" ? 1 : -1) * gallery.clientWidth * .85,
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    }));
    updateButtons();
  }

  function initializeMotion() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    document.documentElement.classList.add("js-motion");
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    }), { threshold: .08 });
    document.querySelectorAll(".section-heading, .comparison-panel, .highlights, .research-grid").forEach((target) => {
      target.classList.add("reveal");
      observer.observe(target);
    });
  }

  async function initializeScenes() {
    const response = await fetch("data/scenes.json");
    if (!response.ok) throw new Error("Dataset scene images are unavailable");
    const scenes = await response.json();
    const background = $("#hero-background");
    const foreground = $("#hero-scene-images");
    let index = 0;
    let paused = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let visible = true;
    let timer;
    const backgroundImages = [];
    const foregroundImages = [];
    scenes.forEach((scene, i) => {
      const backdrop = node("img", "hero-image" + (i === 0 ? " is-active" : ""));
      backdrop.src = scene.src;
      backdrop.alt = "";
      const image = node("img", "scene-image" + (i === 0 ? " is-active" : ""));
      image.src = scene.src;
      image.alt = `CLTW 真实样例：${scene.label}`;
      backgroundImages.push(backdrop);
      foregroundImages.push(image);
    });
    background.replaceChildren(...backgroundImages);
    foreground.replaceChildren(...foregroundImages);
    const update = () => {
      $("#scene-label").textContent = scenes[index].label;
      $("#scene-counter").textContent = `${String(index + 1).padStart(2, "0")} / ${String(scenes.length).padStart(2, "0")}`;
      $("#scene-pause").textContent = paused ? "播放" : "暂停";
      $("#scene-pause").setAttribute("aria-pressed", String(paused));
      $("#hero-example").title = scenes[index].page_id;
    };
    const advance = () => {
      const next = (index + 1) % scenes.length;
      if (!foregroundImages[next].complete || !foregroundImages[next].naturalWidth) return;
      backgroundImages[index].classList.remove("is-active");
      foregroundImages[index].classList.remove("is-active");
      index = next;
      backgroundImages[index].classList.add("is-active");
      foregroundImages[index].classList.add("is-active");
      update();
    };
    const schedule = () => {
      clearInterval(timer);
      if (!paused && visible && !document.hidden) timer = setInterval(advance, 8500);
    };
    $("#scene-next").addEventListener("click", () => { advance(); schedule(); });
    $("#scene-pause").addEventListener("click", () => { paused = !paused; update(); schedule(); });
    document.addEventListener("visibilitychange", schedule);
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; schedule(); })
      .observe($(".hero"));
    update();
    schedule();
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
    $(".skip-link").href = "#model-view";
    const profile = profileFor(model);
    const ordered = sortedModels("content_cer");
    const rank = ordered.findIndex((item) => item.id === model.id);
    $("#model-rank").textContent = `字符错误率排名 ${rank + 1} / ${ordered.length}`;
    $("#model-type").dataset.type = model.type;
    $("#model-art").dataset.type = model.type;
    $("#model-bio").textContent = profile.bio;
    $("#model-image").src = `assets/images/${profile.image}.webp`;
    $("#model-image").alt = `${profile.family} 模型概念插画`;
    $("#art-monogram").textContent = profile.mark;
    $("#art-family").textContent = profile.family;
    $("#model-tags").replaceChildren(...[
      typeNames[model.type], "完整图像输入", `${integer(model.overall.pages)} 页冻结测试`,
    ].map((text) => node("span", "", text)));
    const navigation = $("#profile-navigation");
    navigation.innerHTML = "";
    [[rank - 1, "← 上一个模型"], [rank + 1, "下一个模型 →"]].forEach(([i, title]) => {
      if (!ordered[i]) return;
      const link = node("a", "", title);
      link.href = modelUrl(ordered[i].id);
      link.title = ordered[i].name;
      navigation.append(link);
    });
    const long = model.by_length[">500"];
    const gap = model.paired.degraded_minus_normal_exact;
    $("#model-observation").replaceChildren(
      node("strong", "", "本次测试观察"),
      node("p", "", `超过 500 字的 ${integer(long.pages)} 页中，整页全对率为 ${percent(long.metrics.exact)}。` +
        `同文配对中，退化视图的整页全对率比正常视图${gap < 0 ? "低" : "高"} ${(Math.abs(gap) * 100).toFixed(2)} 个百分点。`),
    );

    const stats = $("#model-stats");
    stats.innerHTML = "";
    [
      ["字符错误率", percent(model.overall.metrics.content_cer)],
      ["整页全对率", percent(model.overall.metrics.exact)],
      ["1% 容错通过率", percent(model.overall.metrics.pass1)],
      ["5% 容错通过率", percent(model.overall.metrics.pass5)],
      ["退化保持率", percent(model.rgs.all_conditions.rgs)],
      ["最差 1% 错误占比", percent(model.worst_one_percent_edit_share)],
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
      initializeMotion();
      return;
    }
    renderSnapshot();
    renderRgsChart();
    renderReliabilityChart();
    renderConfiguration();
    renderComparisonPicker();
    renderComparison();
    renderHighlights();
    renderGallery();
    bindControls();
    renderLeaderboard();
    initializeMotion();
    await initializeScenes();
  }

  initialize().catch((error) => {
    document.body.innerHTML = `<main class="section"><div class="section-inner"><h1>数据加载失败</h1><p>${error.message}</p></div></main>`;
  });
})();

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
    showDiff: false,
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

  const profiles = [
    ["doubao", "Doubao", "DB", "doubao.webp", "Doubao is the model family developed by ByteDance's Seed team. The listed Seed 2.1 variants are evaluated through a hosted API with full-page images and the shared CLTW transcription prompt."],
    ["kimi", "Kimi", "K", "kimi.svg", "Kimi is developed by Moonshot AI. This profile reports the K2.8 Preview API checkpoint, evaluated with thinking disabled and full-page images under the shared CLTW transcription protocol."],
    ["glm53", "GLM", "GL", "glm.svg", "GLM is developed by Zhipu AI, also known as Z.ai. The listed Flash API checkpoint is evaluated on full-page Chinese text using the shared transcription prompt and scoring protocol."],
    ["glmocr", "GLM-OCR", "GL", "glmocr.svg", "GLM-OCR is Z.ai's model for reading and parsing text-rich images. CLTW evaluates its recorded local checkpoint on full-page character accuracy, page completeness and paired-view robustness."],
    ["qwen25", "Qwen2.5-VL", "Q", "qwen25.webp", "Qwen2.5-VL is Alibaba Cloud's vision-language model family. This profile reports the 3B Instruct checkpoint, evaluated on full-page Chinese text with the shared CLTW prompt and scoring protocol."],
    ["qwen", "Qwen", "Q", "qwen.webp", "Qwen is Alibaba Cloud's model family. The listed vision-language checkpoints receive full-page images and the shared transcription prompt; model versions and sizes are evaluated separately."],
    ["paddleocrvl", "PaddleOCR-VL", "P", "paddleocr.webp", "PaddleOCR-VL is part of Baidu's PaddlePaddle OCR project. Its recorded local checkpoint is evaluated on complete images, with results grouped by text length, region count and capture condition."],
    ["firered", "FireRed-OCR", "F", "firered.webp", "FireRed-OCR is developed by Xiaohongshu's Super Intelligence Team. CLTW evaluates the recorded local checkpoint using full-page images and the shared transcription prompt."],
    ["hunyuan", "HunyuanOCR", "H", "hunyuan.webp", "HunyuanOCR is Tencent's OCR model from the Hunyuan team. CLTW evaluates the recorded local checkpoint using full-page images, including long text, complex layouts and paired capture conditions."],
    ["ppocr", "PP-OCR", "PP", "paddleocr.webp", "PP-OCR is the text detection and recognition pipeline from Baidu's PaddleOCR project. CLTW evaluates the complete pipeline, including the organization of detected text into page reading order."],
    ["gotocr", "GOT-OCR", "G", "gotocr.webp", "GOT-OCR 2.0 is the General OCR Theory project from a joint team at StepFun, Megvii, the University of Chinese Academy of Sciences and Tsinghua University. CLTW evaluates its recorded local checkpoint and native plain-text processor."],
    ["deepseek", "DeepSeek-OCR", "D", "deepseek.svg", "DeepSeek-OCR is DeepSeek's model family for visual text recognition. This profile evaluates the OCR-2 checkpoint using its recorded OCR prompt and the shared full-page CLTW scoring protocol."],
    ["intern", "InternVL", "IV", "internvl.webp", "InternVL is the vision-language model family led by Shanghai AI Laboratory's OpenGVLab with research collaborators. CLTW evaluates the listed open checkpoint on full-page Chinese transcription."],
    ["surya", "Surya", "S", "surya.svg", "Surya is Datalab's OCR project, developed by Vikas Paruchuri and the Datalab team. The OCR 2 checkpoint is evaluated using its native full-page inference under the shared CLTW scoring protocol."],
    ["ovis", "Ovis", "O", "ovis.webp", "Ovis is developed by the research team at Alibaba International Digital Commerce Group. CLTW evaluates the listed vision-language checkpoint with full-page images and the shared transcription prompt."],
  ];
  // Asset sources are the official project/company logos; each family keeps its own attribution.
  const developers = {
    doubao: { company: "ByteDance · Seed", project: "https://seed.bytedance.com/en/seed2_1", source: "https://lf-flow-web-cdn.doubao.com/obj/flow-doubao/deploy/flow/ai_official_website/88329/static/image/footer_brand_logo.a2d9c12f.png", logoName: "ByteDance Seed", wide: true },
    kimi: { company: "Moonshot AI", project: "https://www.kimi.ai/", source: "https://statics.kimi.ai/moonshot-ai/assets/static/moonshot-ai-wordmark.DeMGOuiG.svg", logoName: "Moonshot AI", wide: true, dark: true },
    glm53: { company: "Zhipu AI · Z.ai", project: "https://www.zhipuai.cn/en/", source: "https://www.zhipuai.cn/logo-en.svg", logoName: "Zhipu AI", wide: true },
    glmocr: { company: "Zhipu AI · Z.ai", project: "https://github.com/zai-org/GLM-OCR", source: "https://raw.githubusercontent.com/zai-org/GLM-OCR/main/resources/logo.svg", logoName: "GLM-OCR", wide: true },
    qwen25: { company: "Alibaba Cloud · Qwen", project: "https://qwenlm.github.io/blog/qwen2.5-vl/", source: "https://qianwen-res.oss-cn-beijing.aliyuncs.com/Qwen2.5-VL/qwen2.5vl_logo.png", logoName: "Qwen2.5-VL", wide: true },
    qwen: { company: "Alibaba Cloud · Qwen", project: "https://github.com/QwenLM/Qwen3-VL", source: "https://qianwen-res.oss-accelerate.aliyuncs.com/Qwen3-VL/qwen3vllogo.png", logoName: "Qwen3-VL", wide: true },
    paddleocrvl: { company: "Baidu · PaddlePaddle", project: "https://github.com/PaddlePaddle/PaddleOCR", source: "https://www.paddleocr.ai/latest/version3.x/logo.jpg", logoName: "PaddleOCR", wide: true, dark: true },
    firered: { company: "Xiaohongshu · Super Intelligence Team", project: "https://github.com/FireRedTeam/FireRed-OCR", source: "https://raw.githubusercontent.com/FireRedTeam/FireRed-OCR/main/assets/logo.png", logoName: "FireRed-OCR", wide: true },
    hunyuan: { company: "Tencent · Hunyuan", project: "https://github.com/Tencent-Hunyuan/HunyuanOCR", source: "https://cdn-portal.hunyuan.tencent.com/public/static/logo/favicon.png", logoName: "Tencent Hunyuan" },
    ppocr: { company: "Baidu · PaddlePaddle", project: "https://github.com/PaddlePaddle/PaddleOCR", source: "https://www.paddleocr.ai/latest/version3.x/logo.jpg", logoName: "PaddleOCR", wide: true, dark: true },
    gotocr: { company: "StepFun · Megvii · University of Chinese Academy of Sciences · Tsinghua University", project: "https://github.com/Ucas-HaoranWei/GOT-OCR2.0", source: "https://raw.githubusercontent.com/Ucas-HaoranWei/GOT-OCR2.0/main/assets/got_logo.png", logoName: "GOT-OCR" },
    deepseek: { company: "DeepSeek", project: "https://github.com/deepseek-ai/DeepSeek-OCR-2", source: "https://raw.githubusercontent.com/deepseek-ai/DeepSeek-OCR-2/main/assets/logo.svg", logoName: "DeepSeek", wide: true },
    intern: { company: "Shanghai AI Laboratory · OpenGVLab", project: "https://internvl.github.io/", source: "https://www.shlab.org.cn/static/asset/2025/imgs/logo.webp", logoName: "Shanghai AI Laboratory", wide: true, dark: true },
    surya: { company: "Datalab", project: "https://github.com/datalab-to/surya", source: "https://www.datalab.to/images/datalab-icon.svg", logoName: "Datalab" },
    ovis: { company: "Alibaba International Digital Commerce Group", project: "https://github.com/ATH-MaaS/Ovis", source: "https://raw.githubusercontent.com/ATH-MaaS/Ovis/main/docs/ovis_logo.png", logoName: "Ovis", wide: true },
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

  function profileFor(model) {
    const profile = profiles.find(([prefix]) => model.id.startsWith(prefix));
    if (!profile) throw new Error(`Missing model profile: ${model.id}`);
    const overrides = {
      kimi_k3: {
        bio: "Kimi is developed by Moonshot AI. This profile reports the K3 hosted API checkpoint, evaluated with thinking disabled and full-page images under the shared CLTW transcription protocol.",
      },
      deepseek_v41_flash: {
        family: "DeepSeek",
        project: "https://www.deepseek.com/",
        bio: "DeepSeek V4.1 Flash is evaluated through the hosted API on full-page Chinese transcription. The returned checkpoint version, disabled thinking setting and shared CLTW scoring protocol are recorded with every prediction.",
      },
    };
    return { family: profile[1], mark: profile[2], image: profile[3], bio: profile[4],
      ...developers[profile[0]], ...overrides[model.id] };
  }

  function brandIdentity(model, compact = false) {
    const profile = profileFor(model);
    const identity = node("div", "brand-identity");
    const logo = node("img", "brand-logo");
    logo.src = `assets/brands/${profile.image}`;
    logo.alt = `${profile.logoName} official logo`;
    if (profile.wide) logo.classList.add("is-wide");
    if (profile.dark) logo.classList.add("on-dark");
    identity.append(logo, node("strong", "brand-family", profile.family),
      node("span", "brand-company", profile.company));
    if (!compact) identity.append(node("span", "brand-checkpoint", model.checkpoint));
    return identity;
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
        if (["pass1", "pass3", "tail"].includes(key)) cell.classList.add("extra-metric");
        cell.textContent = percent(modelMetric(model, key));
        return cell;
      });
      row.append(rank, name, type, ...values);
      tbody.append(row);
    });

    const pending = state.data.dataset.excluded_revised_image_pages;
    $("#table-note").textContent = models.length
      ? `Showing ${models.length} / ${state.data.models.length} models; correct retention (RGS) uses ${integer(state.data.dataset.rgs_common_pairs)} common pairs. ` +
        (pending ? `${pending} pages with revised images await inference. ` : "All test pages are scored. ") +
        "Ranks are computed across all models for the selected metric."
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
    $("#hero-page-count").textContent = `${integer(dataset.scored_test_pages)} PAGES`;
    stats.innerHTML = "";
    [
      ["Scored test pages", integer(dataset.scored_test_pages)],
      ["Evaluated models", integer(state.data.models.length)],
      ["Scored reference characters", integer(dataset.test_reference_characters)],
      ["Identical-content test pairs", integer(dataset.exact_content_pairs)],
      ["Scene images", integer(dataset.pages)],
      ["Scene conditions", integer(Object.keys(dataset.conditions).length)],
    ].forEach(([label, value]) => addStat(stats, label, value));
    $("#dataset-splits").replaceChildren();
    Object.entries(dataset.splits).forEach(([split, pages]) =>
      addStat($("#dataset-splits"), `${split[0].toUpperCase()}${split.slice(1)} pages`, integer(pages)));
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

  function renderHighlights() {
    const target = $("#highlights");
    target.innerHTML = "";
    [["content_cer", "Lowest Content CER"], ["exact", "Highest Page Exact"], ["rgs", "Highest correct retention (RGS)"]]
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
      art.append(brandIdentity(model, true), node("span", "card-code", `${String(index + 1).padStart(2, "0")} / ${profile.family}`),
        node("span", "card-arrow", "↗"));
      const info = node("div", "card-info");
      const score = node("div", "card-score");
      score.append(node("span", "", "Page Exact"), node("strong", "", percent(model.overall.metrics.exact)));
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
      image.alt = `CLTW scene example: ${scene.label}`;
      backgroundImages.push(backdrop);
      foregroundImages.push(image);
    });
    background.replaceChildren(...backgroundImages);
    foreground.replaceChildren(...foregroundImages);
    const update = () => {
      $("#scene-label").textContent = scenes[index].label;
      $("#scene-counter").textContent = `${String(index + 1).padStart(2, "0")} / ${String(scenes.length).padStart(2, "0")}`;
      $("#scene-pause").textContent = paused ? "Play" : "Pause";
      $("#scene-pause").setAttribute("aria-pressed", String(paused));
      $("#hero-example").title = `CLTW dataset example: ${scenes[index].label}`;
      $("#hero-example").dataset.pageId = scenes[index].page_id;
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
          `${model.name}, ${metricNames.pass5} ${percent(model.overall.metrics.pass5)}`,
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
        row.title = `95% CI ${percent(metric.ci95[0])} to ${percent(metric.ci95[1])}`;
        row.setAttribute(
          "aria-label",
          `${model.name}, ${metricNames.rgs} ${percent(metric.rgs)}, 95% confidence interval ${percent(metric.ci95[0])} to ${percent(metric.ci95[1])}`,
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
    if ($("#example-image").getAttribute("src") !== example.src) $("#example-image").src = example.src;
    $("#example-image").alt = `CLTW ${example.label}: ${example.page_id.split("/").pop()}`;
    $("#example-label").textContent = example.label;
    $("#example-page-id").textContent = example.page_id;
    $("#example-model-link").href = modelUrl(model.id);
    $("#example-model-link").title = `${model.name} evaluation`;
    $("#example-output-status").textContent = output.provider_refused ? "Provider refusal · empty output"
      : output.differences.every(([tag]) => tag === "equal") ? "Text matches after removing whitespace" : "Text differences present";
    $("#example-diff").setAttribute("aria-pressed", String(state.showDiff));
    $("#example-diff").textContent = state.showDiff ? "Show original text" : "Highlight differences";
    const reference = $("#example-reference"), prediction = $("#example-output");
    reference.replaceChildren();
    prediction.replaceChildren();
    if (state.showDiff) {
      output.differences.forEach(([tag, left, right]) => {
        if (left) reference.append(node("span", tag === "equal" ? "" : "diff-removed", left));
        if (right) prediction.append(node("span", tag === "equal" ? "" : "diff-added", right));
      });
    } else {
      reference.textContent = example.reference;
      prediction.textContent = output.text || "(Empty output)";
    }
    reference.scrollTop = prediction.scrollTop = 0;
    $("#diff-note").textContent = state.showDiff
      ? "Peach: changed or omitted reference text. Green: changed or added output. Whitespace is ignored; punctuation and Latin letters are retained. This display comparison uses different normalization from benchmark scores."
      : "Original reference and returned text, including punctuation, line breaks and formatting.";
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
    const response = await fetch("data/cases.json");
    if (!response.ok) throw new Error("Recorded examples are unavailable");
    state.cases = await response.json();
    state.exampleModel = state.data.models[0].id;
    $("#example-scene").replaceChildren(...state.cases.examples.map((example, i) => {
      const option = node("option", "", `${String(i + 1).padStart(2, "0")} · ${example.label}`);
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
      $("#case-search").value = "";
      $("#case-search-status").textContent = "";
      renderExample();
    });
    $("#example-model").addEventListener("change", (event) => { state.exampleModel = event.target.value; renderExample(); });
    $("#example-diff").addEventListener("click", () => { state.showDiff = !state.showDiff; renderExample(); });
    $("#case-search").addEventListener("input", (event) => {
      const query = event.target.value.trim();
      const index = state.cases.examples.findIndex((example) => example.page_id === query || example.page_id.split("/").pop() === query);
      $("#case-search-status").textContent = !query ? "" : index < 0
        ? "No exact match in these eight examples. Paste a full page ID or complete filename." : "Exact example found.";
      if (index >= 0) { state.exampleIndex = index; renderExample(); }
    });
    initializeImageViewer();
    renderExample();
    $("#release-label").textContent = `${state.cases.dataset_release} · Evaluation snapshot ${state.data.snapshot} · ${state.data.models.length} checkpoints`;
    $("#site-citation").textContent = `@misc{cltw_leaderboard_2026,\n  title = {CLTW Model Leaderboard},\n  year = {2026},\n  url = {https://laoshan-song.github.io/cltw-leaderboard/},\n  note = {${state.cases.dataset_release}; evaluation snapshot ${state.data.snapshot}}\n}`;
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
    $("#model-rank").textContent = `Content CER rank ${rank + 1} / ${ordered.length}`;
    $("#model-type").dataset.type = model.type;
    $("#model-art").dataset.type = model.type;
    $("#model-bio").textContent = profile.bio;
    $("#model-identity").replaceChildren(...brandIdentity(model).children);
    $("#art-family").textContent = profile.logoName;
    $("#model-source-links").replaceChildren(...[
      ["Official project ↗", profile.project], ["Logo source ↗", profile.source],
    ].map(([text, href]) => {
      const link = node("a", "", text);
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      return link;
    }));
    $("#model-tags").replaceChildren(...[
      typeNames[model.type], "Full-image input", `${integer(model.overall.pages)} frozen test pages`,
    ].map((text) => node("span", "", text)));
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
      event.currentTarget.textContent = detailed ? "Hide detailed metrics −" : "Show detailed metrics ＋";
      $(".leaderboard-table").dataset.detailed = String(detailed);
      if (!detailed && ["pass1", "pass3", "tail"].includes(state.sort)) { state.sort = "content_cer"; renderLeaderboard(); }
    });
    $("#copy-citation").addEventListener("click", async (event) => {
      try { await navigator.clipboard.writeText($("#site-citation").textContent); event.target.textContent = "Copied"; }
      catch { event.target.textContent = "Select the citation above to copy"; }
    });
    const issue = new URL($("#submission-link").href);
    issue.searchParams.set("title", "Model evaluation request: [checkpoint]");
    issue.searchParams.set("body", "Checkpoint / API version:\nEvaluation date:\nPrediction file URL (2,832 pages):\nActual prompt:\nImage preprocessing:\nGeneration limit:\nDecoding / thinking settings:\nDataset release: CLTW-canonical-2026-10-17\nAdditional notes:\n");
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
      initializeMotion();
      return;
    }
    renderSnapshot();
    renderRgsChart();
    renderReliabilityChart();
    renderConfiguration();
    state.selected = new Set(state.data.models.map((model) => model.id));
    renderComparisonPicker();
    renderComparison();
    renderSceneMatrix();
    renderHighlights();
    renderGallery();
    bindControls();
    renderLeaderboard();
    initializeMotion();
    await initializeScenes();
    await initializeExamples();
  }

  initialize().catch((error) => {
    const main = node("main", "section");
    const inner = node("div", "section-inner");
    inner.append(node("h1", "", "Failed to load data"), node("p", "", error.message));
    main.append(inner);
    document.body.replaceChildren(main);
  });
})();

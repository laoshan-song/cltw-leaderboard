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
    stageEvidence: null,
    stageContrasts: null,
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

  function studyReading(title, number, label, paragraphs) {
    const target = $("#study-interpretation");
    const key = node("div", "study-key");
    key.append(node("strong", "", number), node("span", "", label));
    target.replaceChildren(node("p", "eyebrow", "WHAT THE RESULT SUPPORTS"),
      node("h3", "", title), key, ...paragraphs.map((text) => node("p", "", text)));
  }

  function textMeter(display, compact = false) {
    const meter = node(compact ? "span" : "div", compact ? "text-meter is-compact" : "text-meter");
    const track = node("span", "text-meter-track");
    const counts = display.counts;
    const total = counts.match + counts.loop + counts.other;
    ["match", "loop", "other"].forEach((tag) => {
      const fill = node("span", `meter-${tag}`);
      fill.style.width = `${total ? 100 * counts[tag] / total : 0}%`;
      track.append(fill);
    });
    track.setAttribute("role", "img");
    track.setAttribute("aria-label", `${counts.match} reference-matched characters, ${counts.loop} loop characters, ${counts.other} other characters`);
    meter.append(track);
    if (!compact) meter.append(node("span", "text-meter-counts",
      `${counts.match} reference match · ${counts.loop} loop · ${counts.other} other`));
    return meter;
  }

  function rawReply(title, text, hash, note = "", display = null) {
    const block = node("article", "raw-reply");
    const header = node("div", "reply-heading");
    const expand = node("button", "", "Expand text ↗");
    expand.type = "button";
    expand.setAttribute("aria-expanded", "false");
    expand.addEventListener("click", () => {
      const expanded = block.classList.toggle("is-open");
      expand.setAttribute("aria-expanded", String(expanded));
      expand.textContent = expanded ? "Compact text ↑" : "Expand text ↗";
    });
    header.append(node("h4", "", title), expand);
    const reply = node("pre", "reply-text");
    if (display) {
      const chars = Array.from(text);
      let cursor = 0;
      display.spans.forEach(([start, end, tag]) => {
        if (start > cursor) reply.append(document.createTextNode(chars.slice(cursor, start).join("")));
        reply.append(node("span", `evidence-${tag}`, chars.slice(start, end).join("")));
        cursor = end;
      });
      if (cursor < chars.length) reply.append(document.createTextNode(chars.slice(cursor).join("")));
    } else reply.textContent = text;
    reply.lang = "zh-CN";
    reply.tabIndex = 0;
    reply.dataset.sha256 = hash;
    reply.setAttribute("aria-label", title);
    block.append(header);
    if (display) block.append(textMeter(display));
    block.append(reply);
    if (note) block.append(node("p", "reply-note", note));
    return block;
  }

  function qualityText(quality) {
    if (!quality) return "Future target unavailable; text quality is not scored.";
    return `${quality.correct_chars}/${quality.reference_chars} correct · ` +
      `${quality.deletions} missed · ${quality.substitutions} wrong · ${quality.insertions} extra` +
      (quality.exact ? " · Exact text" : "");
  }

  function replyNote(arm) {
    return `${arm.repeated ? "Severe repetition" : "No severe repetition"} · ` +
      `${arm.cap ? "Output limit" : arm.eos ? "Ended on its own" : "No end signal"}. ` +
      qualityText(arm.quality);
  }

  function renderStageEvidence(collection = "contrasts") {
    const study = state.research.stage_intervention;
    const evidence = collection === "contrasts" ? state.stageContrasts : state.stageEvidence;
    const target = $("#stage-evidence");
    target.classList.add("show-highlights");
    const galleries = node("div", "segments evidence-collections");
    galleries.setAttribute("aria-label", "Evidence collection");
    [["contrasts", `Clear stage contrasts · ${state.stageContrasts.cases.length}`],
      ["original", `Original study · ${state.stageEvidence.cases.length}`]].forEach(([id, label]) => {
      const button = node("button", "", label);
      button.type = "button";
      button.dataset.collection = id;
      button.setAttribute("aria-pressed", String(collection === id));
      button.addEventListener("click", () => renderStageEvidence(id));
      galleries.append(button);
    });
    $("#study-scope").textContent = collection === "contrasts"
      ? `${evidence.cases.length} selected stage contrasts · Model and precision shown per case`
      : `${study.model} · 16-bit weights · Original ${study.spotlight.sources}-pair study`;
    $("#evidence-download").href = collection === "contrasts" ? "data/stage-contrasts.json" : "data/stage-evidence.json";
    $("#evidence-download").download = collection === "contrasts" ? "cltw-stage-contrasts.json" : "cltw-stage-evidence.json";
    const selectionNote = node("p", "evidence-selection",
      collection === "contrasts"
        ? evidence.selection.public_note ||
          "Selected from recorded runs for a large early-to-late change. Each case keeps its own model, precision and protocol."
        : "Original seven-pair study. Selection used from-the-start normal-view quality; all tested intervention outcomes are retained.");
    if (collection === "contrasts" && evidence.pool_download) {
      const poolDownload = node("a", "", "Download all pool outcomes");
      poolDownload.href = evidence.pool_download;
      poolDownload.download = "cltw-recovery-pool.json";
      selectionNote.append(document.createTextNode(" "), poolDownload);
    }
    const selector = node("div", "stage-selector");
    selector.append(node("span", "", `PAIRED SOURCE · ${evidence.cases.length} cases`));
    const choices = node("div", "segments case-options");
    choices.setAttribute("aria-label", "Paired source");
    let selectedCase = evidence.cases[0].id;
    evidence.cases.forEach((entry) => {
      const button = node("button", "", entry.label);
      button.type = "button";
      button.dataset.source = entry.id;
      button.addEventListener("click", () => {
        selectedCase = entry.id;
        copies = entry.contrast?.early_copies[0] ?? 2;
        renderCase();
      });
      choices.append(button);
    });
    const condition = node("p", "case-condition");
    const contrast = node("div", "case-contrast");
    const caseScope = node("p", "case-condition");
    selector.append(choices, condition, contrast, caseScope);
    const legend = node("div", "evidence-legend");
    [["loop", "Loop passage"], ["match", "Reference match"], ["other", "Other / unscored"]]
      .forEach(([tag, label]) => {
        const item = node("span");
        item.append(node("i", `legend-${tag}`), document.createTextNode(label));
        legend.append(item);
      });
    const toggle = node("button", "", "Show raw text");
    toggle.type = "button";
    toggle.setAttribute("aria-pressed", "true");
    toggle.addEventListener("click", () => {
      const shown = target.classList.toggle("show-highlights");
      toggle.setAttribute("aria-pressed", String(shown));
      toggle.textContent = shown ? "Show raw text" : "Show color highlights";
    });
    legend.append(toggle);
    const photos = node("div", "evidence-pair");
    const viewers = {};
    ["normal", "degraded"].forEach((view) => {
      const figure = node("figure", "evidence-photo");
      const tools = node("div", "evidence-image-tools");
      tools.append(node("strong", "", view === "normal" ? "Normal paired image" : "Degraded input image"));
      const controls = {};
      [["out", "−", "Zoom out"], ["scale", "100%", ""], ["in", "+", "Zoom in"], ["reset", "Fit", "Reset image zoom"]]
        .forEach(([key, label, aria]) => {
          const control = node(key === "scale" ? "span" : "button", "", label);
          if (aria) { control.type = "button"; control.setAttribute("aria-label", `${aria}: ${view} image`); }
          controls[key] = control;
          tools.append(control);
        });
      const viewport = node("div", "image-viewport evidence-viewport");
      viewport.tabIndex = 0;
      viewport.setAttribute("aria-label", `${view} image. Drag to pan, scroll to zoom, or use plus and minus keys.`);
      const image = node("img");
      image.draggable = false;
      viewport.append(image);
      const caption = node("figcaption");
      const original = node("a", "", "Open original image ↗");
      original.target = "_blank";
      original.rel = "noopener noreferrer";
      caption.append(node("span", "", "Drag to pan · Scroll or pinch to zoom"), original);
      figure.append(tools, viewport, caption);
      photos.append(figure);
      viewers[view] = { image, original };
      initializeZoom(viewport, image, controls);
    });
    const baselines = node("div", "evidence-pair baseline-replies");
    const baselineDetails = node("details", "baseline-details");
    baselineDetails.append(node("summary", "", "Compare the complete replies from the start"), baselines);
    const reference = node("details", "evidence-reference");
    const stageHeading = node("h3", "evidence-subtitle", "How does the text change at each cut?");
    const instruction = node("p", "evidence-instruction",
      "Each column is a different intervention cut. The two branches share the same generated history. Color strips show the composition of each complete continuation.");
    const tabs = node("div", "segments stage-tabs");
    tabs.setAttribute("aria-label", "Repetition stage");
    const continuation = node("div", "stage-continuation");
    let copies = 2;
    const buttons = new Map();
    (evidence.settings?.copies || study.settings.copies).forEach((value) => {
      const button = node("button");
      button.append(node("strong", "", `After ${value} ${value === 1 ? "copy" : "copies"}`));
      button.type = "button";
      button.addEventListener("click", () => { copies = value; renderStage(); });
      buttons.set(value, button);
      tabs.append(button);
    });
    const renderStage = () => {
      const entry = evidence.cases.find((row) => row.id === selectedCase);
      const stage = entry.stages.find((row) => row.copies === copies);
      buttons.forEach((button, value) => button.setAttribute("aria-pressed", String(value === copies)));
      continuation.dataset.copies = copies;
      continuation.replaceChildren();
      if (!stage) {
        const unavailable = study.cases.find((row) => row.id === entry.id)
          ?.unavailable_stages.find((row) => row.copies === copies);
        continuation.append(node("p", "stage-unavailable", unavailable
          ? `This stage was not tested. Its generated history exceeded the experiment's preset length limit (${unavailable.prefix_tokens} vs ${study.settings.prefix_limit} tokens). Earlier cuts are available above.`
          : "This stage was not run."));
        return;
      }
      const prefix = rawReply(`Shared generated prefix · ${stage.prefix_tokens} tokens`,
        stage.prefix_text, stage.prefix_text_sha256,
        `Cut after ${copies} ${copies === 1 ? "copy" : "copies"} of the selected repeated passage. Both images receive this exact history.`,
        stage.prefix_display);
      prefix.classList.add("shared-prefix");
      const branches = node("div", "evidence-pair continuation-replies");
      ["degraded", "normal"].forEach((view) => {
        const arm = stage.arms[view];
        const reply = rawReply(view === "degraded" ? "Keep degraded image · continuation" : "Swap to normal image · continuation",
          arm.text, arm.text_sha256, replyNote(arm), arm.display);
        reply.dataset.view = view;
        reply.classList.add(arm.repeated ? "is-repeated" : arm.quality?.exact ? "is-exact" : "is-stopped");
        branches.append(reply);
      });
      const future = node("details", "evidence-reference");
      future.append(node("summary", "", "Reference future text used for scoring"));
      if (stage.future_reference === null) future.append(node("p", "reply-note",
        "A reliable future-reference anchor is unavailable. These replies contribute only to repetition counts."));
      else {
        const text = node("pre", "reply-text", stage.future_reference);
        text.lang = "zh-CN";
        future.append(text);
      }
      continuation.append(prefix, branches, future);
    };
    const renderCase = () => {
      const entry = evidence.cases.find((row) => row.id === selectedCase);
      target.dataset.source = entry.id;
      choices.querySelectorAll("button").forEach((button) =>
        button.setAttribute("aria-pressed", String(button.dataset.source === entry.id)));
      buttons.forEach((button, value) => {
        const stage = entry.stages.find((row) => row.copies === value);
        button.replaceChildren(node("strong", "", `After ${value} ${value === 1 ? "copy" : "copies"}`));
        if (!stage) {
          button.append(node("span", "stage-preview-status", "Not tested"));
          return;
        }
        ["degraded", "normal"].forEach((view) => {
          const preview = node("span", "stage-preview-row");
          preview.append(node("span", "", view === "degraded" ? "Keep" : "Swap"), textMeter(stage.arms[view].display, true));
          button.append(preview);
        });
        const arm = stage.arms.normal;
        if (arm.quality) {
          const score = node("span", "stage-preview-score");
          score.append(node("strong", "", percent(arm.quality.character_recall, 1)),
            node("span", "", "of future reference matched after swap"));
          button.append(score);
        }
        button.append(node("span", "stage-preview-status",
          arm.repeated ? "Loop continues" : arm.quality?.exact ? "Exact future text" : "No severe loop"));
      });
      condition.textContent = `${entry.model || study.model} · ${entry.precision_label || "16-bit weights"} · ` +
        `${conditionNames[entry.condition] || entry.condition} · ` +
        (entry.role === "loop_reaches_cap" ? "Original repetition reached the output limit" : "Original repeated output ended on its own");
      caseScope.textContent = entry.scope || "";
      contrast.replaceChildren();
      if (entry.contrast) {
        const early = entry.contrast.early_match_pct;
        const range = Math.abs(early[0] - early[1]) < .05
          ? `${early[0].toFixed(1)}%` : `${early[0].toFixed(1)}–${early[1].toFixed(1)}%`;
        [[range, `After ${entry.contrast.early_copies.join(" / ")} copies · reads onward`, "early"],
          [`${entry.contrast.late_match_pct.toFixed(1)}%`, "After 5 copies · repeats to output limit", "late"]]
          .forEach(([value, label, variant], i) => {
            if (i) contrast.append(node("span", "contrast-arrow", "→"));
            const item = node("div", `contrast-${variant}`);
            item.append(node("strong", "", value), node("span", "", label));
            contrast.append(item);
          });
        contrast.append(node("p", "", "Matched characters / future reference characters. Counts below each reply include missing, wrong and extra text."));
      }
      baselines.replaceChildren();
      ["normal", "degraded"].forEach((view) => {
        const photo = entry.images[view], arm = entry.baseline[view];
        viewers[view].image.src = photo.path;
        viewers[view].image.alt = `${entry.label}: actual ${view} experiment input`;
        viewers[view].original.href = photo.path;
        viewers[view].image.dataset.sha256 = photo.sha256;
        const reply = rawReply(`${view === "normal" ? "Normal" : "Degraded"} image · full reply from the start`,
          arm.text, arm.text_sha256, replyNote(arm), arm.display);
        reply.dataset.view = view;
        baselines.append(reply);
      });
      reference.replaceChildren(node("summary", "", "Whole-page reference text"));
      const text = node("pre", "reply-text", entry.reference);
      text.lang = "zh-CN";
      text.dataset.sha256 = entry.reference_sha256;
      reference.append(text);
      renderStage();
    };
    baselineDetails.append(reference);
    target.replaceChildren(galleries, selectionNote, selector, legend, photos, stageHeading, instruction, tabs, continuation, baselineDetails,
      node("p", "evidence-text-policy", "Color follows the actual reply at each cut. Yellow can increase at later cuts; green requires a reference match. Missing words are counted below the reply. All original repetitions, spacing and line breaks are retained."));
    renderCase();
  }

  function renderResearch() {
    const data = state.research;
    const chart = $("#study-chart");
    chart.replaceChildren();
    $("#study-date").textContent = `Research snapshot ${data.snapshot}`;
    $("#research-provenance").textContent =
      `${data.dataset_release} · Leaderboard snapshot ${data.leaderboard_snapshot}. ` +
      "Images are byte-identical experiment inputs. Replies and summary values are verified against source hashes.";

    {
      const study = data.stage_intervention;
      const spotlight = study.spotlight;
      const ratio = (a, b) => `${a}/${b}`;
      chart.append(node("h3", "", "Original seven-pair study"),
        node("p", "study-axis-label", "Same generated history · Replace the degraded view with its normal paired view"));
      study.groups.forEach((group) => {
        const block = node("div", "stage-group");
        block.append(node("h4", "", group.role === "loop_reaches_cap"
          ? `${group.sources} sources · Original repetition reached the output limit`
          : `${group.sources} source · Original repetition ended on its own`));
        const table = node("table", "stage-counts");
        const caption = node("caption", "sr-only", "Image intervention by repetition stage");
        const head = node("thead");
        const header = node("tr");
        header.append(node("th", "", "Cut after"));
        group.stages.forEach((row) => header.append(node("th", "",
          `${row.copies} ${row.copies === 1 ? "copy" : "copies"}`)));
        head.append(header);
        const body = node("tbody");
        [
          ["No severe repeat", "swapped_no_repeat", "positions", "stage-stopped"],
          ["Exact future text", "swapped_exact", "scorable_positions", "stage-exact"],
        ].forEach(([label, value, denominator, variant]) => {
          const row = node("tr", variant);
          row.append(node("th", "", label));
          group.stages.forEach((stage) => row.append(node("td", "",
            ratio(stage[value], stage[denominator]))));
          body.append(row);
        });
        table.append(caption, head, body);
        block.append(table);
        chart.append(block);
      });
      $("#study-chart-note").textContent =
        "Counts are paired source observations at each stage. Severe repetition means at least five abnormal consecutive copies in the newly generated text. Exactness requires no missed, wrong or extra characters.";
      studyReading("Stopping repeated generation often leaves text errors.",
        ratio(spotlight.strict_exact_after_stop, spotlight.stopped_scorable),
        "positions without severe repetition have exact future text", [
          `The ${spotlight.sources} selected sources meet a normal-view character error rate of at most 5%, end on their own and have no severe repetition. Selection uses from-the-start outputs and retains all intervention outcomes.`,
          `Keeping the degraded image continues severe repetition at all ${spotlight.positions} selected cuts. Swapping to the normal image avoids severe repetition at ${spotlight.swapped_no_repeat} cuts; ${spotlight.strict_exact_after_stop} has exact future text and ${spotlight.stopped_scorable - spotlight.strict_exact_after_stop} still have text errors.`,
          "Responses differ by source and stage. A fifth-copy intervention can still stop repetition in one source; these cases do not establish a universal failure threshold.",
          `The six batches contain ${study.totals.continuation_calls} continuation calls, including schedule controls, and ${study.totals.new_whole_page_calls} new whole-page reads. Token-by-token replay matches the complete same-image continuation; character distances and repetition detection were independently recomputed.`,
        ]);
      studyTable(["Source / condition", "Normal page: correct / reference", "Missed / wrong / extra", "Normal page exact", "Original degraded output"],
        study.cases.map((entry) => {
          const quality = entry.baseline.normal.quality;
          return [`${entry.label} / ${entry.condition}`,
            ratio(quality.correct_chars, quality.reference_chars),
            `${quality.deletions} / ${quality.substitutions} / ${quality.insertions}`,
            quality.exact ? "Yes" : "No",
            entry.role === "loop_reaches_cap" ? "Repeated to limit" : "Repeated, then ended"];
        }), "From-the-start baselines · Whole-page targets");
      studyTable(["Source", "Copies at cut", "Keep degraded image", "Swap: severe repeat", "Swap: correct / future target", "Missed / wrong / extra", "Swap: exact", "Swap: ending"],
        study.cases.flatMap((entry) => entry.stages.map((stage) => {
          const arm = stage.normal;
          const quality = arm.quality;
          return [entry.label, stage.copies,
            stage.degraded.cap ? "Repeated to limit" : "Repeated, then ended",
            arm.repeated ? "Yes" : "No",
            quality ? ratio(quality.correct_chars, quality.reference_chars) : "Unavailable",
            quality ? `${quality.deletions} / ${quality.substitutions} / ${quality.insertions}` : "Unavailable",
            quality ? quality.exact ? "Yes" : "No" : "Unavailable",
            arm.cap ? "Output limit" : arm.eos ? "Ended on its own" : "No end signal"];
        })), "Fixed-history continuations · Anchored future suffix targets", true);
      $("#study-boundary").textContent =
        `${study.scope} G0285 cuts at three/five copies exceed the 256-token prefix limit and were not run. ` +
        "Z0094 has no reliable future-reference anchor; its four cuts contribute only to repetition counts. " +
        "The cache is rebuilt for the new image with fixed history. References determine offline cut positions and scoring; they may omit visible text. " +
        "This experiment does not measure internal attention or establish an automatic recovery method.";
    }
  }

  async function initializeResearch() {
    try {
      const response = await fetch("data/research.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`Research data HTTP ${response.status}`);
      state.research = await response.json();
      const evidence = await fetch("data/stage-evidence.json", { cache: "no-store" });
      if (!evidence.ok) throw new Error(`Real replies HTTP ${evidence.status}`);
      state.stageEvidence = await evidence.json();
      const contrasts = await fetch("data/stage-contrasts.json", { cache: "no-store" });
      if (!contrasts.ok) throw new Error(`Stage contrasts HTTP ${contrasts.status}`);
      state.stageContrasts = await contrasts.json();
      renderStageEvidence();
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

  function initializeZoom(viewport, image, controls) {
    let scale = 1, x = 0, y = 0;
    const pointers = new Map();
    let pinchDistance = 0;
    const apply = () => {
      const width = viewport.clientWidth, height = viewport.clientHeight;
      if (!width || !height) return;
      const ratio = (image.naturalWidth || width) / (image.naturalHeight || height);
      const fitWidth = Math.min(width, height * ratio), fitHeight = fitWidth / ratio;
      const limitX = Math.max(0, (fitWidth * scale - width) / 2);
      const limitY = Math.max(0, (fitHeight * scale - height) / 2);
      x = Math.max(-limitX, Math.min(limitX, x));
      y = Math.max(-limitY, Math.min(limitY, y));
      image.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
      controls.scale.textContent = `${Math.round(scale * 100)}%`;
      controls.out.disabled = scale <= 1;
      controls.in.disabled = scale >= 8;
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
    controls.in.addEventListener("click", () => zoom(1.35));
    controls.out.addEventListener("click", () => zoom(1 / 1.35));
    controls.reset.addEventListener("click", reset);
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
    apply();
    return apply;
  }

  function initializeImageViewer() {
    const viewport = $("#image-viewport"), image = $("#example-image");
    const apply = initializeZoom(viewport, image, {
      scale: $("#image-scale"), out: $("#image-out"), in: $("#image-in"), reset: $("#image-reset"),
    });
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
      initializeMotion();
      return;
    }
    renderSnapshot();
    renderRgsChart();
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

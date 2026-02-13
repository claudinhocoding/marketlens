const SUITE_ORDER = ["scrape", "extract", "compare", "report", "chat"];

function createContext(overrides = {}) {
  return {
    baseUrl: process.env.API_BASE_URL || "http://localhost:4001",
    targetUrl: process.env.API_TEST_URL || "https://example.com",
    depth: Number(process.env.API_TEST_DEPTH || "1"),
    timeoutMs: Number(process.env.API_TEST_TIMEOUT_MS || "240000"),
    chatMessage:
      process.env.API_TEST_CHAT_MESSAGE ||
      "Give me a one-sentence competitive summary based on current data.",
    skipScrape: process.env.API_TEST_SKIP_SCRAPE === "true",
    companyId: process.env.API_TEST_COMPANY_ID || "",
    ...overrides,
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function short(value, max = 400) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

async function postJson(ctx, path, payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ctx.timeoutMs);

  try {
    const response = await fetch(`${ctx.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const text = await response.text();
    let data;

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`[${path}] Expected JSON response but got: ${short(text)}`);
    }

    if (!response.ok) {
      throw new Error(
        `[${path}] ${response.status} ${response.statusText} :: ${short(data)}`
      );
    }

    return data;
  } finally {
    clearTimeout(timer);
  }
}

function printPass(name, details = "") {
  console.log(`✅ ${name}${details ? ` — ${details}` : ""}`);
}

async function ensureCompanyId(ctx) {
  if (hasText(ctx.companyId)) return ctx.companyId;

  if (ctx.skipScrape) {
    throw new Error(
      "No companyId provided. Set API_TEST_COMPANY_ID or disable API_TEST_SKIP_SCRAPE."
    );
  }

  const scrapeResult = await testScrape(ctx);
  return scrapeResult.companyId;
}

export async function testScrape(ctx) {
  const data = await postJson(ctx, "/api/scrape", {
    url: ctx.targetUrl,
    depth: Math.min(Math.max(Number(ctx.depth) || 1, 1), 5),
  });

  assert(data.success === true, "Expected success=true from /api/scrape");
  assert(hasText(data.companyId), "Expected non-empty companyId from /api/scrape");
  assert(isObject(data.scraped), "Expected scraped object from /api/scrape");
  assert(Array.isArray(data.scraped.subPages), "Expected scraped.subPages array");
  assert(isObject(data.extracted), "Expected extracted object from /api/scrape");
  assert(Array.isArray(data.extracted.features), "Expected extracted.features array");

  ctx.companyId = data.companyId;

  return {
    companyId: data.companyId,
    subPageCount: data.scraped.subPages.length,
  };
}

export async function testExtract(ctx) {
  const companyId = await ensureCompanyId(ctx);
  const data = await postJson(ctx, "/api/extract", {
    companyId,
    url: ctx.targetUrl,
  });

  assert(data.success === true, "Expected success=true from /api/extract");
  assert(isObject(data.extracted), "Expected extracted object from /api/extract");
  assert(Array.isArray(data.extracted.features), "Expected extracted.features array");
  assert(
    Array.isArray(data.extracted.pricing_tiers),
    "Expected extracted.pricing_tiers array"
  );

  return {
    companyId,
    featureCount: data.extracted.features.length,
    pricingTierCount: data.extracted.pricing_tiers.length,
  };
}

export async function testCompare(ctx) {
  const full = await postJson(ctx, "/api/compare", {});
  assert(full.success === true, "Expected success=true from /api/compare full mode");
  assert(hasText(full.comparisonId), "Expected comparisonId from /api/compare");
  assert(isObject(full.comparison), "Expected comparison object from /api/compare");
  assert("featureMatrix" in full.comparison, "Expected featureMatrix in full comparison");
  assert("heatmap" in full.comparison, "Expected heatmap in full comparison");

  const positioning = await postJson(ctx, "/api/compare", {
    type: "positioning",
    xAxis: "Product Completeness",
    yAxis: "Growth Momentum",
  });
  assert(positioning.success === true, "Expected success=true for positioning compare");
  assert(
    Array.isArray(positioning.comparison?.positioning),
    "Expected comparison.positioning array"
  );

  const matrix = await postJson(ctx, "/api/compare", { type: "targeting_matrix" });
  assert(matrix.success === true, "Expected success=true for targeting_matrix compare");
  assert(
    isObject(matrix.comparison?.targetingMatrix),
    "Expected comparison.targetingMatrix object"
  );

  const painPoints = await postJson(ctx, "/api/compare", { type: "pain_points" });
  assert(painPoints.success === true, "Expected success=true for pain_points compare");
  assert(
    isObject(painPoints.comparison?.painPoints),
    "Expected comparison.painPoints object"
  );

  return {
    fullComparisonId: full.comparisonId,
    positioningCount: positioning.comparison.positioning.length,
    verticalCount: matrix.comparison.targetingMatrix.verticals?.length || 0,
    painPointCount: painPoints.comparison.painPoints.pain_points?.length || 0,
  };
}

export async function testReport(ctx) {
  const competitive = await postJson(ctx, "/api/report", {
    type: "competitive_assessment",
  });
  assert(competitive.success === true, "Expected success=true for competitive report");
  assert(hasText(competitive.reportId), "Expected reportId for competitive report");
  assert(isObject(competitive.report), "Expected report object for competitive report");
  assert(hasText(competitive.report.title), "Expected report.title for competitive report");
  assert(hasText(competitive.report.content), "Expected report.content for competitive report");

  const companyId = await ensureCompanyId(ctx);

  const featureGap = await postJson(ctx, "/api/report", {
    type: "feature_gap",
    companyId,
  });
  assert(featureGap.success === true, "Expected success=true for feature gap report");
  assert(hasText(featureGap.reportId), "Expected reportId for feature gap report");
  assert(hasText(featureGap.report?.content), "Expected report.content for feature gap report");

  const positioning = await postJson(ctx, "/api/report", {
    type: "market_positioning",
  });
  assert(positioning.success === true, "Expected success=true for market positioning report");
  assert(hasText(positioning.reportId), "Expected reportId for market positioning report");
  assert(hasText(positioning.report?.content), "Expected report.content for market positioning report");

  const market = await postJson(ctx, "/api/report", {
    type: "market_overview",
  });
  assert(market.success === true, "Expected success=true for market overview report");
  assert(hasText(market.reportId), "Expected reportId for market overview report");
  assert(hasText(market.report?.content), "Expected report.content for market overview report");

  const assessment = await postJson(ctx, "/api/report", {
    type: "assessment",
    companyId,
  });
  assert(assessment.success === true, "Expected success=true for assessment report");
  assert(hasText(assessment.reportId), "Expected reportId for assessment report");
  assert(hasText(assessment.report?.content), "Expected report.content for assessment report");

  return {
    competitiveReportId: competitive.reportId,
    featureGapReportId: featureGap.reportId,
    marketPositioningReportId: positioning.reportId,
    marketOverviewReportId: market.reportId,
    assessmentReportId: assessment.reportId,
    companyId,
  };
}

export async function testChat(ctx) {
  const data = await postJson(ctx, "/api/chat", {
    message: ctx.chatMessage,
    history: [],
  });

  assert(hasText(data.response), "Expected non-empty response from /api/chat");

  return {
    responsePreview: short(data.response, 120),
  };
}

const suites = {
  scrape: testScrape,
  extract: testExtract,
  compare: testCompare,
  report: testReport,
  chat: testChat,
};

async function executeSuite(name, ctx) {
  const run = suites[name];
  if (!run) throw new Error(`Unknown suite: ${name}`);

  const started = Date.now();
  const result = await run(ctx);
  const elapsed = Date.now() - started;

  printPass(name, `${elapsed}ms`);
  return { name, elapsed, result };
}

export async function runSuite(name, overrides = {}) {
  const ctx = createContext(overrides);
  console.log(`\nRunning API suite: ${name}`);
  return executeSuite(name, ctx);
}

export async function runAllSuites(overrides = {}) {
  const ctx = createContext(overrides);
  const results = [];

  console.log("\nRunning API smoke tests (all suites)");
  console.log(`Base URL: ${ctx.baseUrl}`);
  console.log(`Target URL: ${ctx.targetUrl}`);

  for (const suiteName of SUITE_ORDER) {
    console.log(`\n▶ ${suiteName}`);
    const result = await executeSuite(suiteName, ctx);
    results.push(result);
  }

  console.log("\nAPI smoke test summary");
  for (const { name, elapsed } of results) {
    console.log(`- ${name}: ${elapsed}ms`);
  }

  return results;
}

// script.js — NEW overall risk logic + timeline
// Overall card theme = WORST EVER in history (not latest)
// CSV auto-load: ./data/phishing_simulation_email_results_with_outcome.csv

const form = document.getElementById("result-form");
const emailInput = document.getElementById("email-input");
const submitBtn = document.getElementById("submit-btn");
const btnText = document.getElementById("btn-text");
const spinner = document.getElementById("spinner");
const formError = document.getElementById("form-error");

const resultSection = document.getElementById("result-section");
const resultCard = document.getElementById("result-card");
const resultEmoji = document.getElementById("result-emoji");
const resultStatus = document.getElementById("result-status");
const resultHeadline = document.getElementById("result-headline");
const resultExplanation = document.getElementById("result-explanation");
const resultLearnings = document.getElementById("result-learnings");
const resultFooter = document.getElementById("result-footer");

const DEFAULT_CSV_URL = "./data/phishing_simulation_email_results_with_outcome.csv";

let campaignData = []; // loaded raw rows

// ---------- utils ----------
function normalizeEmail(v) { return String(v || "").trim().toLowerCase(); }
function hasValue(v) { return String(v ?? "").trim().length > 0; }
function toBool(v) {
  const s = String(v ?? "").trim().toLowerCase();
  return ["true", "yes", "1", "y", "t"].includes(s);
}
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function monthToDate(monthStr) {
  const m = String(monthStr || "").trim();
  const [y, mo] = m.split("-").map((x) => parseInt(x, 10));
  if (!y || !mo || mo < 1 || mo > 12) return null;
  return new Date(y, mo - 1, 1);
}
function formatMonthLabel(monthStr) {
  const d = monthToDate(monthStr);
  if (!d) return monthStr || "Unknown";
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(d);
}

function pickCol(obj, candidates) {
  const keys = Object.keys(obj || {});
  const map = new Map(keys.map((k) => [k.toLowerCase(), k]));
  for (const c of candidates) {
    const hit = map.get(String(c).toLowerCase());
    if (hit) return hit;
  }
  return null;
}

// ---------- normalize row ----------
function normalizeRow(row) {
  const emailKey = pickCol(row, ["Email Address", "Email", "email"]);
  const monthKey = pickCol(row, ["Month"]);
  const clickedKey = pickCol(row, ["Clicked", "Primary Clicked", "Email Clicked"]);
  const reportedKey = pickCol(row, ["Reported", "Email Reported", "Reported Calc"]);
  const openedKey = pickCol(row, ["Opened", "Primary Email Opened", "Email Opened"]);
  const outcomeKey = pickCol(row, ["Outcome"]);
  const themeKey = pickCol(row, ["Theme"]);
  const campaignKey = pickCol(row, ["Campaign", "Campaign Title", "Campaign Name"]);
  const officeKey = pickCol(row, ["Office", "Office Name", "OfficeName"]);

  const email = normalizeEmail(emailKey ? row[emailKey] : "");
  const month = String(monthKey ? row[monthKey] : "").trim() || "Uploaded";

  const clicked = clickedKey ? toBool(row[clickedKey]) : false;
  const reported = reportedKey ? toBool(row[reportedKey]) : false;

  let opened = null;
  if (openedKey && hasValue(row[openedKey])) opened = toBool(row[openedKey]);

  return {
    email,
    month,
    clicked,
    reported,
    opened,
    outcome: outcomeKey ? String(row[outcomeKey] ?? "").trim().toUpperCase() : "",
    theme: themeKey ? String(row[themeKey] ?? "").trim().toLowerCase() : "",
    campaign: campaignKey ? String(row[campaignKey] ?? "").trim() : "",
    office: officeKey ? String(row[officeKey] ?? "").trim() : "",
  };
}

// ---------- outcomes ----------
function computeOutcome(clicked, reported) {
  if (!clicked && reported) return "REPORTED";
  if (clicked && reported) return "GOOD_RECOVERY";
  if (!clicked && !reported) return "NO_ACTION";
  return "CLICKED";
}

// ✅ NEW: worst-ever outcome selector (drives overall card)
function worstOutcome(records) {
  // Priority: CLICKED > GOOD_RECOVERY > REPORTED > NO_ACTION
  const set = new Set(records.map(r => r.outcome || computeOutcome(r.clicked, r.reported)));
  if (set.has("CLICKED")) return "CLICKED";
  if (set.has("GOOD_RECOVERY")) return "GOOD_RECOVERY";
  if (set.has("REPORTED")) return "REPORTED";
  if (set.has("NO_ACTION")) return "NO_ACTION";
  return "UNKNOWN";
}

// ✅ Updated messaging (especially GOOD_RECOVERY)
function outcomeConfig(outcome) {
  switch (outcome) {
    case "REPORTED":
      return {
        cardBg: "success-bg",
        pill: "success",
        emoji: "🛡️",
        status: "Reported ✅",
        headline: "Strong reporting behavior",
        explanation:
          "You reported the simulated phishing email without clicking. This is the safest response and reduces risk for you and the wider team.",
        learnings: [
          "Keep reporting suspicious emails — it helps the whole firm.",
          "Verify unusual requests via a trusted channel (Teams/phone).",
          "Hover links and check domains when anything feels off."
        ]
      };

    case "GOOD_RECOVERY":
      return {
        // ✅ bright yellow warning
        cardBg: "brightwarn-bg",
        pill: "brightwarn",
        emoji: "⚠️",
        status: "Risk detected ⚠️",
        headline: "Clicked at least once",
        explanation:
          "A click (even once) is enough for attackers to keep targeting you. Reporting helps, but the best protection is pausing before you click.",
        learnings: [
          "Treat unexpected links as suspicious — verify before you click.",
          "Use known bookmarks/official portals for logins (not email links).",
          "If you clicked, report immediately so response teams can act fast."
        ]
      };

    case "NO_ACTION":
      return {
        cardBg: "recovery-bg",
        pill: "recovery",
        emoji: "👀",
        status: "No interaction",
        headline: "No click recorded",
        explanation:
          "You didn’t click the simulation. That avoids most risk. Reporting next time still helps protect teammates and improves detection.",
        learnings: [
          "If an email looks suspicious, report it — even if you didn’t click.",
          "Look for urgency, unexpected attachments, or unusual requests.",
          "When unsure, verify via a trusted channel."
        ]
      };

    case "CLICKED":
      return {
        cardBg: "danger-bg",
        pill: "danger",
        emoji: "⛔",
        status: "High risk ⛔",
        headline: "Clicked (not reported) happened at least once",
        explanation:
          "At least one simulation was clicked and not reported. In real attacks, this can lead to credential theft or malware. One click is enough to get repeatedly targeted.",
        learnings: [
          "If you think you clicked something suspicious, report immediately.",
          "Never enter credentials from email links — go via a known URL.",
          "Slow down on urgent requests: verify first."
        ]
      };

    default:
      return {
        cardBg: "neutral-bg",
        pill: "neutral",
        emoji: "ℹ️",
        status: "Status unknown",
        headline: "Result unclear",
        explanation: "We found a record but couldn’t classify it from the available fields.",
        learnings: ["Please verify that Clicked and Reported columns are present and correct."]
      };
  }
}

function latestOutcomeLabel(outcome, opened) {
  if (outcome === "NO_ACTION") {
    if (opened === true) return "Seen (opened), no click, no report";
    if (opened === false) return "Not opened, no click, no report";
    return "No click, no report";
  }
  if (outcome === "REPORTED") return "Reported successfully (no click)";
  if (outcome === "GOOD_RECOVERY") return "Clicked, then reported";
  if (outcome === "CLICKED") return "Clicked (not reported)";
  return "Recorded";
}

function outcomeToTimelineChip(outcome) {
  // timeline chips remain factual per month
  switch (outcome) {
    case "REPORTED": return { cls: "chip chip--success", emoji: "🛡️", label: "Reported" };
    case "GOOD_RECOVERY": return { cls: "chip chip--warn", emoji: "⚠️", label: "Clicked + Reported" };
    case "NO_ACTION": return { cls: "chip chip--recovery", emoji: "👀", label: "No interaction" };
    case "CLICKED": return { cls: "chip chip--danger", emoji: "⛔", label: "Clicked" };
    default: return { cls: "chip chip--neutral", emoji: "ℹ️", label: "Recorded" };
  }
}

// ---------- lookup ----------
function findRecordsByEmail(email) {
  const key = normalizeEmail(email);
  const matches = campaignData
    .map(normalizeRow)
    .filter((r) => r.email === key);

  // latest first
  matches.sort((a, b) => {
    const da = monthToDate(a.month);
    const db = monthToDate(b.month);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return db - da;
  });

  return matches;
}

// ---------- render ----------
function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  if (spinner) spinner.hidden = !isLoading;
  if (btnText) btnText.textContent = isLoading ? "Checking…" : "View My Result";
}

function showError(msg) {
  formError.textContent = msg || "";
}

function renderLearnings(items) {
  resultLearnings.innerHTML = "";
  for (const t of items) {
    const li = document.createElement("li");
    li.textContent = t;
    resultLearnings.appendChild(li);
  }
}

function renderTimeline(records) {
  if (!records || records.length === 0) return "";

  const rows = records.map((r) => {
    const outcome = r.outcome || computeOutcome(r.clicked, r.reported);
    const monthLabel = formatMonthLabel(r.month);
    const sub = latestOutcomeLabel(outcome, r.opened);
    const chip = outcomeToTimelineChip(outcome);

    const tags = [];
    if (r.office) tags.push(`<span class="small-tag">Office: ${escapeHtml(r.office)}</span>`);
    if (r.campaign) tags.push(`<span class="small-tag">Campaign: ${escapeHtml(r.campaign)}</span>`);

    return `
      <li class="timeline-row">
        <div class="timeline-left">
          <div class="timeline-month">${escapeHtml(monthLabel)}</div>
          <div class="timeline-sub">${escapeHtml(sub)}</div>
        </div>
        <div class="timeline-right">
          ${tags.join(" ")}
          <span class="${chip.cls}">
            <span aria-hidden="true">${chip.emoji}</span>
            <span>${escapeHtml(chip.label)}</span>
          </span>
        </div>
      </li>
    `;
  }).join("");

  return `
    <div class="timeline">
      <div class="timeline-head">
        <strong>Your simulation history</strong>
        <span>Latest shown first</span>
      </div>
      <ul class="timeline-list">${rows}</ul>
    </div>
  `;
}

function renderNoRecord(email) {
  resultCard.className = "result-card neutral-bg";
  resultEmoji.textContent = "ℹ️";
  resultStatus.className = "status-pill neutral";
  resultStatus.textContent = "No record found";
  resultHeadline.textContent = "No simulation record for this email";
  resultExplanation.textContent =
    "We didn’t find a matching entry for this email in the loaded dataset. This can mean you weren’t included in these campaigns, or the email was typed differently.";

  renderLearnings([
    "Double-check the spelling of your email address.",
    "If you see suspicious emails in the future, report them using the phishing report option.",
  ]);

  resultFooter.innerHTML = `<div class="meta-row"><span class="meta-pill">Checked: ${escapeHtml(email)}</span></div>`;

  resultSection.hidden = false;
  resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderResult(email, records) {
  if (!records || records.length === 0) return renderNoRecord(email);

  const latest = records[0];
  const latestOutcome = latest.outcome || computeOutcome(latest.clicked, latest.reported);

  // ✅ Overall driven by WORST EVER:
  const overall = worstOutcome(records);
  const cfg = outcomeConfig(overall);

  resultCard.className = `result-card ${cfg.cardBg}`;
  resultEmoji.textContent = cfg.emoji;

  resultStatus.className = `status-pill ${cfg.pill}`;
  resultStatus.textContent = cfg.status;

  // Headline: overall, but still show latest context right below in meta
  resultHeadline.textContent = `Overall status — ${cfg.headline}`;
  resultExplanation.textContent = cfg.explanation;
  renderLearnings(cfg.learnings);

  const timelineHtml = renderTimeline(records);

  const meta = [];
  meta.push(`<span class="meta-pill">Checked: ${escapeHtml(email)}</span>`);
  meta.push(`<span class="meta-pill">Latest: ${escapeHtml(formatMonthLabel(latest.month))} — ${escapeHtml(latestOutcomeLabel(latestOutcome, latest.opened))}</span>`);
  if (latest.office) meta.push(`<span class="meta-pill">Office: ${escapeHtml(latest.office)}</span>`);

  resultFooter.innerHTML = `
    <div class="meta-row">${meta.join("")}</div>
    ${timelineHtml}
  `;

  resultSection.hidden = false;
  resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ---------- CSV loading ----------
async function loadDefaultCsv() {
  try {
    const res = await fetch(DEFAULT_CSV_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    campaignData = parseCsv(text) || [];
  } catch (e) {
    console.warn("CSV load failed:", e);
    campaignData = [];
  }
}

function validateEmail(email) {
  // keep BCG-only validation
  return /^[^@]+@bcg\.com$/i.test(String(email || "").trim());
}

// ---------- CSV parser ----------
function parseCsv(csvText) {
  const lines = csvText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter(l => l.trim() !== "");

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map(h => h.trim());
  const out = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => row[h] = (cols[idx] ?? "").trim());
    out.push(row);
  }
  return out;
}

function parseCsvLine(line) {
  const result = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

// ---------- events ----------
document.addEventListener("DOMContentLoaded", async () => {
  await loadDefaultCsv();
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  showError("");

  const email = normalizeEmail(emailInput.value);

  if (!validateEmail(email)) {
    showError("Please enter a valid BCG email address.");
    return;
  }

  if (!campaignData || campaignData.length === 0) {
    showError(
      "Data file could not be loaded. Run the site via a local server (not by double-clicking the HTML file), and ensure the CSV is at data/phishing_simulation_email_results_with_outcome.csv"
    );
    return;
  }

  setLoading(true);
  try {
    const records = findRecordsByEmail(email);
    renderResult(email, records);
  } finally {
    setLoading(false);
  }
});
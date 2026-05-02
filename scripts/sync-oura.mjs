#!/usr/bin/env node
// Pulls the last 14 days of Oura data and writes it to data/oura.json.
// Run by .github/workflows/oura-sync.yml on a daily cron, or manually:
//   OURA_TOKEN=xxx node scripts/sync-oura.mjs
//
// Get a Personal Access Token at https://cloud.ouraring.com/personal-access-tokens

import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const TOKEN = process.env.OURA_TOKEN;
if (!TOKEN) {
  console.error("Missing OURA_TOKEN environment variable.");
  process.exit(1);
}

const WINDOW_DAYS = 14;
const today = new Date();
const start = new Date(today);
start.setDate(start.getDate() - WINDOW_DAYS);
const fmt = (d) => d.toISOString().slice(0, 10);

const headers = { Authorization: `Bearer ${TOKEN}` };
const params = `start_date=${fmt(start)}&end_date=${fmt(today)}`;

async function get(path) {
  const url = `https://api.ouraring.com/v2/usercollection/${path}?${params}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Oura ${path}: ${res.status} ${res.statusText} — ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  return json.data || [];
}

console.log(`Fetching ${fmt(start)} → ${fmt(today)}`);

const [dailySleep, sleep, dailyActivity, dailyReadiness, workouts] = await Promise.all([
  get("daily_sleep"),
  get("sleep"),
  get("daily_activity"),
  get("daily_readiness"),
  get("workout"),
]);

// Roll up sleep periods into per-day totals (Oura splits naps/main sleep).
const sleepByDay = {};
for (const s of sleep) {
  if (s.type === "deleted") continue;
  const day = s.day;
  sleepByDay[day] = sleepByDay[day] || { day, total_sleep_seconds: 0, periods: 0 };
  sleepByDay[day].total_sleep_seconds += s.total_sleep_duration || 0;
  sleepByDay[day].periods += 1;
}

const days = {};
const upsert = (day) => (days[day] = days[day] || { date: day });

for (const d of dailySleep) {
  const row = upsert(d.day);
  row.sleep_score = d.score ?? null;
  row.sleep_contributors = d.contributors || null;
}
for (const day of Object.keys(sleepByDay)) {
  const row = upsert(day);
  row.sleep_minutes = Math.round(sleepByDay[day].total_sleep_seconds / 60);
}
for (const d of dailyActivity) {
  const row = upsert(d.day);
  row.activity_score = d.score ?? null;
  row.steps = d.steps ?? null;
  row.active_calories = d.active_calories ?? null;
  row.equivalent_walking_distance = d.equivalent_walking_distance ?? null;
  row.high_activity_minutes = d.high_activity_time != null ? Math.round(d.high_activity_time / 60) : null;
  row.medium_activity_minutes = d.medium_activity_time != null ? Math.round(d.medium_activity_time / 60) : null;
}
for (const d of dailyReadiness) {
  const row = upsert(d.day);
  row.readiness_score = d.score ?? null;
  row.hrv_balance = d.contributors?.hrv_balance ?? null;
  row.body_temperature = d.temperature_deviation ?? null;
}

// Workouts come as discrete events with start_datetime.
const workoutEntries = workouts
  .filter((w) => w.source !== "manual" || w.activity)
  .map((w) => ({
    id: w.id,
    activity: w.activity,
    intensity: w.intensity,
    start: w.start_datetime,
    end: w.end_datetime,
    day: w.day,
    duration_min: w.start_datetime && w.end_datetime
      ? Math.round((new Date(w.end_datetime) - new Date(w.start_datetime)) / 60000)
      : null,
    calories: w.calories ?? null,
    distance_m: w.distance ?? null,
    source: w.source,
  }));

const out = {
  generated_at: new Date().toISOString(),
  window: { start: fmt(start), end: fmt(today), days: WINDOW_DAYS },
  days: Object.values(days).sort((a, b) => b.date.localeCompare(a.date)),
  workouts: workoutEntries.sort((a, b) => (b.start || "").localeCompare(a.start || "")),
};

const here = dirname(fileURLToPath(import.meta.url));
const outPath = `${here}/../data/oura.json`;
await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, JSON.stringify(out, null, 2) + "\n");

console.log(`Wrote ${out.days.length} days, ${out.workouts.length} workouts → data/oura.json`);

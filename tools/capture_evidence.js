// Chụp ảnh bằng chứng: mở từng link trong evidence/INDEX.md bằng Chromium sạch (không đăng nhập),
// cố chọn Singapore (và region khác nếu INDEX ghi) rồi lưu evidence/E-xx.png + evidence/capture-report.json.
// Chạy: NODE_PATH=<thư mục chứa node_modules> node tools/capture_evidence.js [E01 E02 ...]
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");

const ROOT = path.join(__dirname, "..");
const EVD = path.join(ROOT, "evidence");
const only = process.argv.slice(2);

const items = [];
for (const line of fs.readFileSync(path.join(EVD, "INDEX.md"), "utf8").split("\n")) {
  if (!/^\|\s*E\d{2,3}\s*\|/.test(line)) continue;
  const c = line.trim().replace(/^\||\|$/g, "").split("|").map((x) => x.trim());
  const url = (c[2].match(/https?:\/\/[^\s;,)]+/) || [])[0];
  if (!url) continue;
  const want = /Singapore/i.test(c[1] + c[3]) ? "Singapore" : /Sydney/i.test(c[1]) ? "Sydney" : "";
  if (only.length && !only.includes(c[0])) continue;
  items.push({ code: c[0], url: url.replace(/[.:]+$/, ""), want, seen: c[3] });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function prep(page, want) {
  // Từ chối/ẩn banner cookie, không bấm chấp nhận.
  await page.evaluate(() => {
    document.querySelectorAll('[id*="awsccc"], [id*="cookie" i], [class*="cookie-banner" i], [aria-label*="cookie" i]').forEach((e) => { e.style.display = "none"; });
    const decline = [...document.querySelectorAll("button")].find((b) => /decline|reject|từ chối/i.test(b.textContent));
    if (decline) decline.click();
  }).catch(() => {});
  if (!want) return false;
  // Chọn region bằng <select> nếu có.
  const done = await page.evaluate((w) => {
    for (const s of document.querySelectorAll("select")) {
      const o = [...s.options].find((x) => new RegExp(w, "i").test(x.textContent));
      if (o) { s.value = o.value; s.dispatchEvent(new Event("change", { bubbles: true })); return true; }
    }
    return false;
  }, want).catch(() => false);
  if (done) { await sleep(1500); return true; }
  // Dropdown tùy biến: bấm phần tử có chữ "Asia Pacific (Singapore)" hoặc ô chọn region rồi chọn mục.
  for (const label of [new RegExp(`Asia Pacific \\(${want}\\)`, "i"), new RegExp(want, "i")]) {
    const clicked = await page.evaluate((src) => {
      const re = new RegExp(src.s, src.f);
      const el = [...document.querySelectorAll("a,button,li,option,[role=option],[role=tab],div,span")].find((e) => e.children.length === 0 && re.test(e.textContent) && e.offsetParent !== null);
      if (el) { el.scrollIntoView({ block: "center" }); el.click(); return true; }
      return false;
    }, { s: label.source, f: label.flags }).catch(() => false);
    if (clicked) { await sleep(1500); return true; }
  }
  return false;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: "/usr/bin/chromium", headless: "new", args: ["--no-sandbox", "--disable-gpu", "--lang=en-US"] });
  const report = [];
  for (const it of items) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1000 });
    await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });
    const r = { code: it.code, url: it.url, want: it.want, ok: false, regionSelected: false, textHasWant: false, note: "" };
    try {
      await page.goto(it.url, { waitUntil: "networkidle2", timeout: 60000 });
      await sleep(1500);
      r.regionSelected = await prep(page, it.want);
      const text = await page.evaluate(() => document.body.innerText).catch(() => "");
      r.textHasWant = it.want ? new RegExp(it.want, "i").test(text) : true;
      if (it.want) {
        await page.evaluate((w) => {
          const re = new RegExp(w, "i");
          const el = [...document.querySelectorAll("td,th,li,p,span,div,h1,h2,h3,h4")].find((e) => e.children.length === 0 && re.test(e.textContent) && e.offsetParent !== null);
          if (el) el.scrollIntoView({ block: "center" });
        }, it.want).catch(() => {});
        await sleep(500);
      }
      const file = path.join(EVD, `E-${it.code.slice(1)}.png`);
      await page.screenshot({ path: file });
      r.ok = true;
      r.title = (await page.title()).slice(0, 80);
    } catch (e) {
      r.note = String(e.message || e).slice(0, 160);
    }
    report.push(r);
    console.log(it.code, r.ok ? "ảnh" : "LỖI", r.regionSelected ? "chọn-region" : "", r.want ? (r.textHasWant ? `có-${r.want}` : `KHÔNG-${r.want}`) : "", r.note);
    await page.close();
  }
  await browser.close();
  const rp = path.join(EVD, "capture-report.json");
  const old = fs.existsSync(rp) ? JSON.parse(fs.readFileSync(rp, "utf8")) : [];
  const merged = Object.fromEntries(old.map((x) => [x.code, x]));
  report.forEach((x) => (merged[x.code] = x));
  fs.writeFileSync(rp, JSON.stringify(Object.values(merged), null, 1));
})();

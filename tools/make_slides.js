// Tạo submit/VBot_slide.pptx từ nội dung nghiên cứu. Số tiền tổng lấy từ docs/baogia-*.tsv.
// Chạy: NODE_PATH=$(npm root -g) node tools/make_slides.js
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "submit", "VBot_slide.pptx");
fs.mkdirSync(path.dirname(OUT), { recursive: true });

// ---------- dữ liệu báo giá ----------
const rows = [];
for (const f of ["A", "B", "C"]) {
  const lines = fs.readFileSync(path.join(ROOT, "docs", `baogia-${f}.tsv`), "utf8").trim().split("\n").slice(1);
  for (const l of lines) {
    const c = l.split("\t");
    rows.push({ part: f, comp: c[0], name: c[1], cost: parseFloat(c[3]) });
  }
}
const total = rows.reduce((s, r) => s + r.cost, 0);
const byComp = {};
rows.forEach((r) => (byComp[r.comp] = (byComp[r.comp] || 0) + r.cost));
const has = (v) => rows.some((r) => Math.abs(r.cost - v) < 0.01);
[3500, 3312.93, 2988.67, 2420, 1750, 792, 787.67, 649.79].forEach((v) => {
  if (!has(v)) throw new Error("Giá trị biểu đồ không có trong TSV: " + v);
});
const usd = (n, d = 0) => "$" + n.toLocaleString("vi-VN", { minimumFractionDigits: d, maximumFractionDigits: d });
const perDau = total / 2000;
const OLD_TOTAL = 20986.76; // tổng trước khi áp quyết định chốt (1,1 ảnh/request)
const nEvid = (fs.readFileSync(path.join(ROOT, "evidence", "INDEX.md"), "utf8").match(/^\|\s*E\d{2,3}\s*\|/gm) || []).length;
const nEvidNoPage = (fs.readFileSync(path.join(ROOT, "evidence", "INDEX.md"), "utf8").match(/CHƯA CÓ BẰNG CHỨNG/g) || []).length;
const varPart = ["llm", "sandbox", "governance", "object_storage", "connectors", "embedding"].reduce((a, k) => a + (byComp[k] || 0), 0);
const fixedPart = total - varPart;
const dau2 = 2 * varPart + 1.15 * fixedPart;
const r100 = (n) => Math.round(n / 100) * 100;

// ---------- giao diện ----------
const NAVY = "0B2536", TEAL = "0B6E99", SKY = "D9EDF6", AMBER = "B45309", AMBER_SOFT = "FBEBD6";
const INK = "13222D", MUTED = "586A77", LINE = "D2DCE3", CARD = "F2F6F9";
const OK = "15803D", WARN = "946200", ERR = "B42318";
const HEAD = "Cambria", BODY = "Calibri", MONO = "Courier New";

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9"; // 10 x 5.625
pres.title = "VBot Workplace - Production Capstone";
pres.author = "Nhóm VBot";

const N_CONTENT = 14;
let n = 0;

function base(title, sub) {
  const s = pres.addSlide();
  n += 1;
  s.background = { color: "FFFFFF" };
  s.addText(title, { x: 0.5, y: 0.3, w: 9, h: 0.55, fontFace: HEAD, fontSize: 26, bold: true, color: NAVY, margin: 0, valign: "top" });
  if (sub) s.addText(sub, { x: 0.5, y: 0.86, w: 9, h: 0.3, fontFace: BODY, fontSize: 13, color: MUTED, margin: 0, valign: "top" });
  s.addText("VBot Workplace · Production Capstone", { x: 0.5, y: 5.3, w: 5, h: 0.22, fontFace: BODY, fontSize: 9, color: MUTED, margin: 0 });
  s.addText(`${n} / ${N_CONTENT}`, { x: 8.5, y: 5.3, w: 1, h: 0.22, fontFace: BODY, fontSize: 9, color: MUTED, align: "right", margin: 0 });
  return s;
}
function card(s, x, y, w, h, fill = CARD) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: fill }, line: { color: fill, width: 0 }, rectRadius: 0.08 });
}
function pill(s, x, y, w, text, bg = SKY, fg = TEAL) {
  s.addText(text, { x, y, w, h: 0.22, shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: 0.05, fill: { color: bg }, color: fg, fontFace: MONO, fontSize: 9, bold: true, align: "center", valign: "middle", margin: 0 });
}
function bullets(items, size = 12, color = INK) {
  return items.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < items.length - 1, fontSize: size, color, paraSpaceAfter: 4 } }));
}
function cell(text, o = {}) {
  return { text, options: Object.assign({ fontFace: BODY, fontSize: 11, color: INK, valign: "middle" }, o) };
}
const hdr = (t, o = {}) => cell(t, Object.assign({ bold: true, color: "FFFFFF", fill: { color: NAVY }, fontSize: 10.5 }, o));

// ---------- 0. tiêu đề ----------
{
  const s = pres.addSlide();
  s.background = { color: NAVY };
  s.addText("PRODUCTION CAPSTONE · TRACK 2", { x: 0.6, y: 0.55, w: 8, h: 0.3, fontFace: MONO, fontSize: 12, bold: true, color: "5CC2F2", margin: 0 });
  s.addText("VBot Workplace", { x: 0.6, y: 1.0, w: 8.8, h: 0.9, fontFace: HEAD, fontSize: 46, bold: true, color: "FFFFFF", margin: 0 });
  s.addText("Trợ lý AI văn phòng trên AWS cho 2.000 người dùng mỗi ngày", { x: 0.6, y: 1.95, w: 8.8, h: 0.5, fontFace: BODY, fontSize: 20, color: "CADCFC", margin: 0 });
  card(s, 0.6, 3.0, 4.2, 1.35, "12384F");
  s.addText(usd(total) + " / tháng", { x: 0.85, y: 3.12, w: 3.8, h: 0.6, fontFace: HEAD, fontSize: 30, bold: true, color: "F0A24B", margin: 0 });
  s.addText(`${usd(perDau, 2)} mỗi người dùng · giá niêm yết, không free tier`, { x: 0.85, y: 3.78, w: 3.8, h: 0.45, fontFace: BODY, fontSize: 13, color: "FFFFFF", margin: 0 });
  s.addText(
    [
      { text: "Nguyễn Như Tài · Lò Văn Long · Đinh Công Tú", options: { breakLine: true, bold: true } },
      { text: "Bản nháp: giá lấy từ bảng giá chính thức của AWS, ảnh bằng chứng đang chờ chụp", options: {} },
    ],
    { x: 5.2, y: 3.1, w: 4.2, h: 1.2, fontFace: BODY, fontSize: 12, color: "CADCFC", margin: 0, valign: "top" }
  );
}

// ---------- 1. giả định tải ----------
{
  const s = base("Giả định và ước lượng tải", "Chỉ 2.000 DAU, 22 ngày/tháng và 10 giờ/ngày là đề cho. Còn lại là giả định của nhóm.");
  const stats = [
    ["1,1 triệu", "request/tháng", "2.000 × 25 × 22"],
    ["4,2 req/s", "lúc burst", "15% request dồn vào 1 giờ, ×2"],
    ["600", "phiên đồng thời", "30% × 2.000 DAU"],
  ];
  stats.forEach((st, i) => {
    const x = 0.5 + i * 3.08;
    card(s, x, 1.3, 2.9, 1.0);
    s.addText(st[0], { x: x + 0.15, y: 1.35, w: 2.6, h: 0.5, fontFace: HEAD, fontSize: 24, bold: true, color: TEAL, margin: 0 });
    s.addText(st[1], { x: x + 0.15, y: 1.83, w: 2.6, h: 0.22, fontFace: BODY, fontSize: 12, bold: true, color: INK, margin: 0 });
    s.addText(st[2], { x: x + 0.15, y: 2.05, w: 2.6, h: 0.22, fontFace: MONO, fontSize: 9, color: MUTED, margin: 0 });
  });
  const t = [
    [hdr("Cấp tác vụ"), hdr("Tỉ lệ", { align: "right" }), hdr("Token vào", { align: "right" }), hdr("Token ra", { align: "right" }), hdr("Model")],
    ["1 Email, hỏi đáp", "45%", "3.000", "350", "Haiku 5.5"],
    ["2 Tài liệu, slide", "20%", "6.000", "1.550", "Haiku 5.5"],
    ["3 Dữ liệu, code", "15%", "10.000", "1.050", "Haiku 70% / Sonnet 30%"],
    ["4 Agent dự án", "15%", "40.000", "3.050", "Haiku 70% / Sonnet 30%"],
    ["5 Thiết kế", "5%", "6.000", "1.220", "Sonnet 5.5 + 1,1 ảnh"],
  ].map((r, i) => (i === 0 ? r : r.map((c, j) => cell(c, { align: j >= 1 && j <= 3 ? "right" : "left", fill: { color: i % 2 ? "FFFFFF" : CARD } }))));
  s.addTable(t, { x: 0.5, y: 2.5, w: 6.0, colW: [1.65, 0.6, 0.95, 0.85, 1.95], rowH: 0.3, border: { type: "solid", color: LINE, pt: 0.5 } });
  card(s, 6.7, 2.5, 2.8, 1.8);
  s.addText(
    [
      { text: "Quy mô phụ", options: { bold: true, breakLine: true, color: NAVY, fontSize: 12 } },
      ...bullets(["324.500 lượt sandbox/tháng (~38 chạy cùng lúc)", "Workspace ~4 TB (2 GB/người)", "Log 22 GB/tháng", "1,76 triệu lệnh gọi connector"], 11),
    ],
    { x: 6.85, y: 2.58, w: 2.55, h: 1.65, fontFace: BODY, valign: "top", margin: 0 }
  );
  s.addText("Tổng 11,4 tỷ token vào và ~1,4 tỷ token ra mỗi tháng. Công thức đầy đủ trong docs/uoc-luong-tai.xlsx.", { x: 0.5, y: 4.5, w: 9, h: 0.5, fontFace: BODY, fontSize: 12, color: MUTED, margin: 0 });
}

// ---------- 2. kiến trúc ----------
{
  const s = base("Kiến trúc tổng thể", "AWS Singapore (ap-southeast-1), DR ở Sydney. Mã trên mỗi hộp là mã component trong báo giá.");
  function box(x, y, w, h, code, label, fill = CARD) {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: fill }, line: { color: LINE, width: 0.75 }, rectRadius: 0.06 });
    s.addText(
      [
        { text: code, options: { fontFace: MONO, fontSize: 9, bold: true, color: TEAL, breakLine: true } },
        { text: label, options: { fontFace: BODY, fontSize: 10, color: INK } },
      ],
      { x: x + 0.07, y: y + 0.03, w: w - 0.14, h: h - 0.06, margin: 0, valign: "middle" }
    );
  }
  const arrow = (x1, y1, x2, y2) =>
    s.addShape(pres.shapes.LINE, { x: x1, y: y1, w: x2 - x1, h: y2 - y1, line: { color: MUTED, width: 1.25, endArrowType: "triangle" } });
  // cột A
  box(0.4, 1.2, 1.55, 0.58, "người dùng", "Trình duyệt, SSO + MFA");
  box(0.4, 1.9, 1.55, 0.58, "authn", "Cognito ↔ IdP tập đoàn");
  box(0.4, 2.6, 1.55, 0.58, "network", "Route 53 · WAF");
  box(0.4, 3.3, 1.55, 0.58, "load_balancer", "ALB, 2 AZ");
  [[1.78, 1.9], [2.48, 2.6], [3.18, 3.3]].forEach(([a, b]) => arrow(1.17, a, 1.17, b));
  // cột B
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 2.25, y: 1.2, w: 2.2, h: 3.33, fill: { color: SKY }, line: { color: SKY, width: 0 }, rectRadius: 0.08 });
  s.addText("compute · Fargate ARM, 2 AZ", { x: 2.33, y: 1.24, w: 2.05, h: 0.25, fontFace: MONO, fontSize: 8.5, bold: true, color: TEAL, margin: 0 });
  box(2.35, 1.55, 2.0, 0.7, "app / API", "authz: Verified Permissions + RLS", "FFFFFF");
  box(2.35, 2.35, 2.0, 0.7, "gateway", "LiteLLM: quota, routing, fallback", "FFFFFF");
  box(2.35, 3.15, 2.0, 0.7, "worker agent", "Hàng đợi SQS, chạy nền cấp 4", "FFFFFF");
  s.addText("staging: tắt ngoài giờ", { x: 2.33, y: 4.0, w: 2.05, h: 0.3, fontFace: BODY, fontSize: 10, italic: true, color: MUTED, margin: 0 });
  arrow(1.95, 3.59, 2.25, 3.59);
  // cột C
  box(4.75, 1.2, 2.45, 0.58, "llm", "Bedrock: Haiku / Sonnet 5.5 qua VPC endpoint");
  box(4.75, 1.88, 2.45, 0.58, "governance", "Guardrails · Presidio (che PII)");
  box(4.75, 2.56, 2.45, 0.58, "embedding", "Cohere Embed Multilingual");
  box(4.75, 3.24, 2.45, 0.58, "sandbox", "Lambda microVM, không có NAT");
  box(4.75, 3.92, 2.45, 0.58, "ảnh cấp 5", "Stable Image Core, us-west-2");
  arrow(4.45, 2.85, 4.75, 2.85);
  // cột D
  box(7.5, 1.2, 2.1, 0.58, "database + vector_db", "RDS PostgreSQL Multi-AZ, pgvector");
  box(7.5, 1.88, 2.1, 0.58, "cache_queue", "ElastiCache · SQS");
  box(7.5, 2.56, 2.1, 0.58, "object_storage", "S3: workspace theo user");
  box(7.5, 3.24, 2.1, 0.58, "secrets_kms", "KMS: khóa, token connector");
  box(7.5, 3.92, 2.1, 0.58, "backup_dr", "Sao chép sang Sydney");
  arrow(7.2, 2.85, 7.5, 2.85);
  // dải dưới
  box(0.4, 4.68, 3.3, 0.5, "connectors", "NAT → Google · M365 · Notion · Jira · Confluence");
  box(3.8, 4.68, 2.0, 0.5, "monitoring", "CloudWatch · chi tiêu LiteLLM");
  box(5.9, 4.68, 2.2, 0.5, "cicd", "GitHub Actions · ECR · Terraform");
  box(8.2, 4.68, 1.4, 0.5, "ops_labor", "1,5 FTE");
  arrow(3.0, 4.53, 3.0, 4.68);
}

// ---------- 3. luồng một request ----------
{
  const s = base("Luồng một request", "Từ đăng nhập đến câu trả lời, và nơi mỗi lớp kiểm soát chen vào.");
  const steps = [
    ["1", "SSO", "Cognito liên kết SAML/OIDC với IdP tập đoàn, MFA ở IdP. Phát JWT theo người dùng."],
    ["2", "Vào hệ thống", "WAF → ALB (2 AZ) → app trên Fargate."],
    ["3", "Phân quyền", "Verified Permissions kiểm quyền chức năng; mọi truy vấn kèm user_id cho RLS."],
    ["4", "Guardrail vào", "Lọc prompt, che PII bằng Presidio; nội dung connector bị coi là không tin cậy."],
    ["5", "Gateway", "LiteLLM chọn Haiku hay Sonnet theo cấp, áp quota, bật prompt cache."],
    ["6", "Ngữ cảnh", "pgvector lọc theo ACL gốc; connector gọi bằng OAuth của chính người dùng, token giải mã bằng KMS."],
    ["7", "Công cụ", "Code chạy trong Lambda theo từng người dùng; chỉ thấy prefix S3 của mình, không có đường ra internet."],
    ["8", "Trả lời", "Hành động ghi (gửi email, tạo ticket, xóa file) cần người dùng xác nhận. Log vào CloudWatch, audit vào S3 Object Lock."],
  ];
  steps.forEach((st, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = 0.5 + col * 2.28, y = 1.3 + row * 1.95;
    card(s, x, y, 2.15, 1.8);
    s.addText(st[0], { x: x + 0.12, y: y + 0.1, w: 0.38, h: 0.38, shape: pres.shapes.OVAL, fill: { color: TEAL }, color: "FFFFFF", fontFace: HEAD, fontSize: 14, bold: true, align: "center", valign: "middle", margin: 0 });
    s.addText(st[1], { x: x + 0.58, y: y + 0.1, w: 1.5, h: 0.38, fontFace: BODY, fontSize: 13, bold: true, color: NAVY, valign: "middle", margin: 0 });
    s.addText(st[2], { x: x + 0.12, y: y + 0.58, w: 1.92, h: 1.15, fontFace: BODY, fontSize: 10.5, color: INK, valign: "top", margin: 0 });
  });
}

// ---------- 4. model và routing ----------
{
  const s = base("Model và routing", "Toàn bộ qua Amazon Bedrock. Định tuyến theo cấp tác vụ, leo thang khi model rẻ thất bại.");
  const t = [
    [hdr("Cấp"), hdr("Model chính"), hdr("Leo thang"), hdr("Lý do và rủi ro")],
    ["1 Email, hỏi đáp", "Haiku 5.5", "Không", "Tác vụ ngắn, có RAG; rẻ nhất"],
    ["2 Tài liệu, slide", "Haiku 5.5 (100%)", "Không tính", "Viết theo mẫu; rủi ro chất lượng văn bản"],
    ["3 Dữ liệu, code", "Haiku 70% · Sonnet 30%", "10% Haiku → Sonnet", "Code cần đúng; Sonnet cho phần khó"],
    ["4 Agent dự án", "Haiku 70% · Sonnet 30%", "10% Haiku → Sonnet", "40.000 token vào, nhiều bước; tốn nhất"],
    ["5 Thiết kế", "Sonnet 5.5", "Không", "1 ảnh nháp, trung bình 1,1 ảnh/request (Stable Image Core)"],
  ].map((r, i) => (i === 0 ? r : r.map((c, j) => cell(c, { bold: j === 0, fill: { color: i % 2 ? "FFFFFF" : CARD }, fontSize: 11 }))));
  s.addTable(t, { x: 0.5, y: 1.3, w: 9, colW: [1.7, 2.3, 1.9, 3.1], rowH: 0.34, border: { type: "solid", color: LINE, pt: 0.5 } });
  card(s, 0.5, 3.55, 4.4, 1.55, AMBER_SOFT);
  s.addText(
    [
      { text: "Giá tham khảo (mỗi triệu token)", options: { bold: true, color: AMBER, fontSize: 12, breakLine: true } },
      { text: "Haiku 5.5: $0,10 vào · $0,50 ra", options: { breakLine: true, fontSize: 12 } },
      { text: "Sonnet 5.5: $2,00 vào · $10,00 ra", options: { breakLine: true, fontSize: 12 } },
      { text: "Đọc cache = 0,1 × giá vào. Hồ sơ global, đang chờ ảnh bằng chứng E20, E21.", options: { fontSize: 10.5, color: MUTED } },
    ],
    { x: 0.65, y: 3.62, w: 4.15, h: 1.4, fontFace: BODY, valign: "top", margin: 0, color: INK }
  );
  card(s, 5.1, 3.55, 4.4, 1.55);
  s.addText(
    [
      { text: "Điều kiện giữ cấu hình này", options: { bold: true, color: NAVY, fontSize: 12, breakLine: true } },
      { text: "Bộ test mỗi cấp phải đạt ≥ 95% điểm của Sonnet 5.5 (model tham chiếu, H8). Nếu không đạt, lùi về chạy Sonnet nhiều hơn: tốn thêm khoảng $5.068/tháng.", options: { fontSize: 11 } },
    ],
    { x: 5.25, y: 3.62, w: 4.15, h: 1.4, fontFace: BODY, valign: "top", margin: 0, color: INK }
  );
}

// ---------- 5. lý do chọn công nghệ ----------
{
  const s = base("Lý do chọn công nghệ", "Mỗi lựa chọn lớn có ít nhất hai phương án so sánh. Chữ đậm là phương án được chọn.");
  const blocks = [
    ["Cách gọi LLM", [["API Bedrock (Claude)", "$7.275/tháng token", true], ["Tự host GPU (p4de, 2 máy)", "$14.492 – $48.087", false], ["Model mở qua API (DeepSeek, Qwen)", "$4.055, nhưng không có ở Singapore", false]]],
    ["Sandbox chạy code", [["Lambda microVM (tenant isolation)", "~$650/tháng", true], ["Fargate task mỗi lượt", "~$677 + pool nóng ~$824", false], ["EKS + gVisor", "~$820, vận hành nặng", false]]],
    ["Compute", [["ECS Fargate ARM, 2 AZ", "$191/tháng", true], ["EKS", "+$73/tháng cho cluster, thêm quản lý node", false]]],
    ["Token OAuth của người dùng", [["Mã hóa phong bì KMS trong RDS", "secrets_kms $37,70/tháng", true], ["Một secret mỗi (user × connector)", "~12.000 secret, tính theo secret", false]]],
  ];
  blocks.forEach((b, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.5 + col * 4.6, y = 1.3 + row * 1.95;
    card(s, x, y, 4.4, 1.82);
    s.addText(b[0], { x: x + 0.15, y: y + 0.08, w: 4.1, h: 0.3, fontFace: BODY, fontSize: 13, bold: true, color: NAVY, margin: 0 });
    const runs = [];
    b[1].forEach((o, j) => {
      runs.push({ text: o[0] + ": ", options: { bold: o[2], color: o[2] ? TEAL : INK, fontSize: 11 } });
      runs.push({ text: o[1], options: { breakLine: j < b[1].length - 1, color: o[2] ? TEAL : MUTED, fontSize: 11, bold: o[2] } });
    });
    s.addText(runs, { x: x + 0.15, y: y + 0.45, w: 4.1, h: 1.3, fontFace: BODY, valign: "top", margin: 0, paraSpaceAfter: 6 });
  });
  s.addText("Số liệu từ bảng giá AWS ngày 2026-10-16, chưa có ảnh chụp trang; sổ bằng chứng ở evidence/INDEX.md.", { x: 0.5, y: 5.05, w: 9, h: 0.22, fontFace: BODY, fontSize: 10, italic: true, color: MUTED, margin: 0 });
}

// ---------- 6. connectors và phân quyền ----------
{
  const s = base("Connectors và phân quyền", "Agent hành động bằng quyền ủy nhiệm của chính người dùng, không dùng tài khoản dịch vụ toàn tập đoàn.");
  card(s, 0.5, 1.3, 4.4, 3.4);
  s.addText("Connectors", { x: 0.65, y: 1.38, w: 4.1, h: 0.3, fontFace: BODY, fontSize: 14, bold: true, color: NAVY, margin: 0 });
  s.addText(
    bullets([
      "OAuth ủy nhiệm, scope tối thiểu cho Gmail, Drive, Calendar, Outlook, M365, Notion, Jira, Confluence.",
      "Lai: đồng bộ trước cho tài liệu tìm kiếm (Drive changes, Graph delta, webhook Notion/Jira/Confluence); gọi trực tiếp cho email, lịch và mọi hành động ghi.",
      "Token cất trong bảng connector_tokens, mã hóa phong bì bằng KMS (AWS Encryption SDK). Khóa chủ không rời KMS.",
      "Secrets Manager chỉ giữ ~32 secret nền tảng ($15,30).",
    ], 11.5),
    { x: 0.65, y: 1.75, w: 4.1, h: 2.9, fontFace: BODY, valign: "top", margin: 0 }
  );
  card(s, 5.1, 1.3, 4.4, 3.4);
  s.addText("Định danh và quyền", { x: 5.25, y: 1.38, w: 4.1, h: 0.3, fontFace: BODY, fontSize: 14, bold: true, color: NAVY, margin: 0 });
  s.addText(
    bullets([
      "Cognito liên kết SAML/OIDC với IdP tập đoàn; MFA thực hiện ở IdP.",
      "RBAC cho chức năng bằng Amazon Verified Permissions.",
      "ACL tài liệu giữ nguyên quyền gốc: lọc ngay trong truy vấn pgvector bằng row-level security, không lọc sau khi lấy kết quả.",
      "Token không nằm trong Secrets Manager vì phí tính theo từng secret, mà có hàng chục nghìn token.",
    ], 11.5),
    { x: 5.25, y: 1.75, w: 4.1, h: 2.9, fontFace: BODY, valign: "top", margin: 0 }
  );
  [["connectors", byComp.connectors], ["authn", byComp.authn], ["authz", byComp.authz], ["secrets_kms", byComp.secrets_kms]].forEach((c, i) => {
    pill(s, 0.5 + i * 2.3, 4.88, 1.2, c[0]);
    s.addText(usd(c[1], 2) + "/tháng", { x: 1.75 + i * 2.3, y: 4.88, w: 1.0, h: 0.22, fontFace: BODY, fontSize: 10, color: MUTED, margin: 0, valign: "middle" });
  });
}

// ---------- 7. workspace và sandbox ----------
{
  const s = base("Workspace riêng và sandbox", "Hai câu hỏi hội đồng chắc chắn hỏi: agent của A có đọc được file của B không, và code thoát sandbox thì sao.");
  card(s, 0.5, 1.3, 4.4, 3.4);
  s.addText("Cô lập dữ liệu từng người", { x: 0.65, y: 1.38, w: 4.1, h: 0.3, fontFace: BODY, fontSize: 14, bold: true, color: NAVY, margin: 0 });
  s.addText(
    bullets([
      "S3 một bucket, mỗi người một prefix users/{user_id}/, quota 10 GB áp ở ứng dụng, SSE-KMS.",
      "Sandbox nhận quyền qua STS session policy giới hạn đúng prefix của người dùng, hết hạn sau lượt chạy.",
      "pgvector có row-level security theo user_id và nhóm ACL; lịch sử chat và bộ nhớ dài hạn cũng khóa theo user_id.",
      "Demo 3 phút: agent của A thử đọc prefix của B và bị từ chối.",
    ], 11.5),
    { x: 0.65, y: 1.75, w: 4.1, h: 2.9, fontFace: BODY, valign: "top", margin: 0 }
  );
  card(s, 5.1, 1.3, 4.4, 3.4);
  s.addText("Sandbox", { x: 5.25, y: 1.38, w: 4.1, h: 0.3, fontFace: BODY, fontSize: 14, bold: true, color: NAVY, margin: 0 });
  s.addText(
    bullets([
      "AWS Lambda ARM, chế độ tenant isolation: mỗi người một môi trường microVM Firecracker, không dùng chung với người khác.",
      "Đặt trong subnet không có đường ra NAT: mặc định không egress.",
      "Giới hạn 3 GB RAM, ~40 giây tính phí mỗi lượt; hủy khi xong.",
      "Lượt quá 15 phút chạy bằng Fargate task (dự phòng ~200 giờ/tháng).",
      "Còn phải kiểm: chặn gọi metadata, đo thật thời gian nạp workspace.",
    ], 11.5),
    { x: 5.25, y: 1.75, w: 4.1, h: 2.9, fontFace: BODY, valign: "top", margin: 0 }
  );
  pill(s, 0.5, 4.88, 1.2, "sandbox");
  s.addText(`${usd(byComp.sandbox, 2)}/tháng`, { x: 1.75, y: 4.88, w: 1.4, h: 0.22, fontFace: BODY, fontSize: 10, color: MUTED, margin: 0, valign: "middle" });
  pill(s, 3.4, 4.88, 1.4, "object_storage");
  s.addText(`${usd(byComp.object_storage, 2)}/tháng`, { x: 4.9, y: 4.88, w: 1.4, h: 0.22, fontFace: BODY, fontSize: 10, color: MUTED, margin: 0, valign: "middle" });
}

// ---------- 8. governance ----------
{
  const s = base("AI và data governance", "Bốn lớp: lọc đầu vào, con người xác nhận, mã hóa và che PII, nhật ký giữ 12 tháng.");
  card(s, 0.5, 1.3, 4.4, 3.4);
  s.addText("AI governance (H4)", { x: 0.65, y: 1.38, w: 4.1, h: 0.3, fontFace: BODY, fontSize: 14, bold: true, color: NAVY, margin: 0 });
  s.addText(
    bullets([
      "Bedrock Guardrails (content filter, prompt attack) cho prompt người dùng và nội dung connector trước hành động ghi.",
      "Tách nội dung không tin cậy (email, tài liệu) khỏi chỉ dẫn.",
      "Người dùng xác nhận trước khi gửi email, tạo ticket hoặc xóa file.",
      "Cổng eval: đổi model hay prompt phải qua bộ test H8 trước.",
    ], 11.5),
    { x: 0.65, y: 1.75, w: 4.1, h: 2.9, fontFace: BODY, valign: "top", margin: 0 }
  );
  card(s, 5.1, 1.3, 4.4, 3.4);
  s.addText("Data governance (H5)", { x: 5.25, y: 1.38, w: 4.1, h: 0.3, fontFace: BODY, fontSize: 14, bold: true, color: NAVY, margin: 0 });
  s.addText(
    bullets([
      "Mã hóa lúc lưu bằng SSE-KMS, lúc truyền bằng TLS.",
      "Presidio che PII; chưa đo trên tiếng Việt.",
      "Audit log 12 tháng ở S3 Object Lock; log ứng dụng 30 ngày; chat 12 tháng rồi xóa.",
      "Theo tài liệu AWS, dữ liệu vào Bedrock không dùng để huấn luyện và không chia sẻ cho nhà cung cấp model.",
      "Phân loại 3 mức (Công khai, Nội bộ, Mật); mức Mật không ra khỏi AWS. Workspace xóa 90 ngày sau khi khóa tài khoản.",
    ], 11.5),
    { x: 5.25, y: 1.75, w: 4.1, h: 2.9, fontFace: BODY, valign: "top", margin: 0 }
  );
  pill(s, 0.5, 4.88, 1.2, "governance");
  s.addText(`${usd(byComp.governance, 2)}/tháng, trong đó Guardrails $792`, { x: 1.75, y: 4.88, w: 4.5, h: 0.22, fontFace: BODY, fontSize: 10, color: MUTED, margin: 0, valign: "middle" });
}

// ---------- 9. HA, backup, DR ----------
{
  const s = base("HA, backup và DR", "Không có điểm lỗi đơn ở LB, gateway, database. DR sang Sydney.");
  const t = [
    [hdr("Thành phần"), hdr("Cách đạt HA")],
    ["ALB, WAF", "2 AZ"],
    ["Fargate: app, gateway, worker", "Tối thiểu 2 task, mỗi AZ một task"],
    ["RDS PostgreSQL", "Multi-AZ, standby ở AZ khác"],
    ["ElastiCache", "2 node, 2 AZ"],
    ["NAT, VPC endpoint", "Mỗi AZ một bộ"],
    ["S3, Lambda", "Đa AZ sẵn có"],
  ].map((r, i) => (i === 0 ? r : r.map((c, j) => cell(c, { bold: j === 0, fill: { color: i % 2 ? "FFFFFF" : CARD } }))));
  s.addTable(t, { x: 0.5, y: 1.3, w: 4.7, colW: [2.2, 2.5], rowH: 0.36, border: { type: "solid", color: LINE, pt: 0.5 } });
  card(s, 5.4, 1.3, 4.1, 1.5);
  s.addText(
    [
      { text: "Một AZ mất lúc 10 giờ sáng", options: { bold: true, color: NAVY, fontSize: 12, breakLine: true } },
      { text: "ALB và Fargate chuyển sang AZ còn lại; RDS failover trong khoảng 1-2 phút (ước tính, chờ bằng chứng). Ngân sách 99,5% giờ hành chính là 1,1 giờ/tháng.", options: { fontSize: 11 } },
    ],
    { x: 5.55, y: 1.38, w: 3.85, h: 1.35, fontFace: BODY, valign: "top", margin: 0, color: INK }
  );
  card(s, 5.4, 2.95, 4.1, 1.75);
  s.addText(
    [
      { text: "Mất cả region Singapore", options: { bold: true, color: NAVY, fontSize: 12, breakLine: true } },
      { text: "Backup RDS và S3 sao chép sang Sydney, dựng lại bằng Terraform. RTO ước tính 3-4 giờ, sát ngưỡng 4 giờ của đề; RPO dưới 1 giờ. Chưa diễn tập, nên lịch diễn tập khôi phục theo quý là cam kết.", options: { fontSize: 11 } },
    ],
    { x: 5.55, y: 3.03, w: 3.85, h: 1.6, fontFace: BODY, valign: "top", margin: 0, color: INK }
  );
  pill(s, 0.5, 4.0, 1.2, "backup_dr");
  s.addText(`${usd(byComp.backup_dr, 2)}/tháng`, { x: 1.75, y: 4.0, w: 1.6, h: 0.22, fontFace: BODY, fontSize: 10, color: MUTED, margin: 0, valign: "middle" });
}

// ---------- 10. monitoring và FinOps ----------
{
  const s = base("Monitoring và FinOps", "Đo đủ để chứng minh chất lượng, độ trễ và chi phí trên từng người dùng.");
  const items = [
    ["Quan sát", "CloudWatch: log, metric, alarm. Cảnh báo khi p95 thời gian tới token đầu vượt 2,5 giây trong 5 phút."],
    ["Chi phí LLM", "Đọc usage mỗi lượt gọi Bedrock: token vào/ra, cacheRead, cacheWrite, stopReason. Bảng chi tiêu theo người dùng và nhóm trong LiteLLM."],
    ["Quota và cắt", "Khóa ảo LiteLLM theo người và đơn vị, cảnh báo ngân sách, cắt khi vượt. Một số tính năng ngân sách theo tag là bản trả phí, nên có alarm CloudWatch bù."],
    ["Chất lượng", "Bộ test mỗi cấp chạy mỗi lần đổi model hay prompt; theo dõi tỉ lệ hỏi lại và tỉ lệ leo thang Haiku → Sonnet."],
  ];
  items.forEach((it, i) => {
    const x = 0.5 + (i % 2) * 4.6, y = 1.3 + Math.floor(i / 2) * 1.55;
    card(s, x, y, 4.4, 1.4);
    s.addText(it[0], { x: x + 0.15, y: y + 0.08, w: 4.1, h: 0.28, fontFace: BODY, fontSize: 13, bold: true, color: NAVY, margin: 0 });
    s.addText(it[1], { x: x + 0.15, y: y + 0.4, w: 4.1, h: 0.95, fontFace: BODY, fontSize: 11, color: INK, valign: "top", margin: 0 });
  });
  card(s, 0.5, 4.45, 9, 0.65, AMBER_SOFT);
  s.addText(
    [
      { text: `${usd(perDau, 2)} mỗi người dùng mỗi tháng`, options: { bold: true, color: AMBER } },
      { text: `; monitoring ${usd(byComp.monitoring, 2)}/tháng. Không mua AWS Support trả phí (ước ~$900-1.950/tháng); bù bằng 1,5 FTE và diễn tập DR.`, options: { color: INK } },
    ],
    { x: 0.65, y: 4.5, w: 8.7, h: 0.55, fontFace: BODY, fontSize: 11.5, valign: "middle", margin: 0 }
  );
}

// ---------- 11. chi phí ----------
{
  const s = base("Chi phí", `${usd(total)} mỗi tháng, ${usd(perDau, 2)} mỗi người dùng. Không tính nhân sự: ${usd(total - byComp.ops_labor)}.`);
  const llmTotal = byComp.llm;
  const groups = [
    ["LLM (token + ảnh)", llmTotal],
    ["Nhân sự vận hành", byComp.ops_labor],
    ["Hạ tầng còn lại", total - llmTotal - byComp.ops_labor],
  ];
  groups.forEach((g, i) => {
    const y = 1.3 + i * 0.92;
    card(s, 0.5, y, 2.9, 0.82);
    s.addText(usd(g[1]), { x: 0.65, y: y + 0.05, w: 2.6, h: 0.4, fontFace: HEAD, fontSize: 20, bold: true, color: i === 0 ? TEAL : i === 1 ? AMBER : NAVY, margin: 0 });
    s.addText(`${g[0]} · ${((g[1] / total) * 100).toFixed(1).replace(".", ",")}%`, { x: 0.65, y: y + 0.46, w: 2.6, h: 0.28, fontFace: BODY, fontSize: 11, color: MUTED, margin: 0 });
  });
  s.addText("Phần A $" + Math.round(rows.filter((r) => r.part === "A").reduce((a, r) => a + r.cost, 0)).toLocaleString("vi-VN") +
    " · B $" + Math.round(rows.filter((r) => r.part === "B").reduce((a, r) => a + r.cost, 0)).toLocaleString("vi-VN") +
    " · C $" + Math.round(rows.filter((r) => r.part === "C").reduce((a, r) => a + r.cost, 0)).toLocaleString("vi-VN"),
    { x: 0.5, y: 4.1, w: 2.9, h: 0.5, fontFace: BODY, fontSize: 10.5, color: MUTED, margin: 0, valign: "top" });
  s.addText("Đơn giá từ bảng giá chính thức AWS (2026-10-16), ảnh bằng chứng chưa chụp. Khối lượng là giả định của nhóm.", { x: 0.5, y: 4.62, w: 2.9, h: 0.55, fontFace: BODY, fontSize: 10, italic: true, color: MUTED, margin: 0, valign: "top" });
  const labels = ["SRE 1,0 FTE", "Sonnet token ra", "Sonnet token vào", "Ảnh cấp 5 (1,1/request)", "LLMOps 0,5 FTE", "Guardrails", "RDS prod Multi-AZ", "Lambda sandbox"];
  const vals = [3500, 3312.93, 2988.67, 2420, 1750, 792, 787.67, 649.79];
  s.addChart(pres.charts.BAR, [{ name: "USD/tháng", labels, values: vals }], {
    x: 3.6, y: 1.2, w: 5.9, h: 3.95, barDir: "bar", chartColors: [TEAL], showTitle: true, title: "8 hạng mục lớn nhất (USD/tháng)",
    titleFontSize: 12, titleColor: NAVY, showValue: true, dataLabelFormatCode: "#,##0", dataLabelFontSize: 10, dataLabelColor: INK,
    catAxisLabelFontSize: 10, catAxisLabelColor: INK, catAxisOrientation: "maxMin", valAxisHidden: true, valGridLine: { style: "none" }, catGridLine: { style: "none" },
    showLegend: false,
  });
}

// ---------- 12. đòn bẩy tiết kiệm ----------
{
  const s = base("Đòn bẩy tiết kiệm", "Phần đã áp dụng và phần còn có thể làm. Mỗi mục kèm điều kiện, vì hội đồng sẽ chất vấn giả định.");
  card(s, 0.5, 1.3, 3.5, 3.75);
  s.addText("Đã áp dụng", { x: 0.65, y: 1.38, w: 3.2, h: 0.3, fontFace: BODY, fontSize: 14, bold: true, color: OK, margin: 0 });
  s.addText(
    bullets([
      "Haiku cho cấp 2-4, có tính leo thang 10%: rẻ hơn Sonnet khoảng $5.068/tháng.",
      "Tách tỉ lệ cache ghi/đọc theo cấp: −$1.004.",
      "Ảnh cấp 5: 1 ảnh nháp, trung bình 1,1 ảnh/request: −$2.112.",
      "Cắt token ra theo cấp (thực đo −10,5%): −$850 sau khi trừ lượt hỏi lại.",
      "Vector DB gộp vào RDS pgvector; Lambda thay cho cụm sandbox chạy 24/7.",
    ], 11),
    { x: 0.65, y: 1.75, w: 3.2, h: 3.25, fontFace: BODY, valign: "top", margin: 0 }
  );
  const t = [
    [hdr("Còn có thể làm"), hdr("USD/tháng", { align: "right" }), hdr("Điều kiện")],
    ["Cache cấp 4 đọc 85%, ghi 15%", "−671", "Phải đo hit rate thật"],
    ["Guardrails chỉ cho nội dung trước hành động ghi", "−240 đến −320", "Giảm phạm vi H4"],
    ["Ghi cache giảm một nửa", "−265", "Phụ thuộc tái sử dụng"],
    ["Sandbox 3 GB → 2 GB", "~−173", "Cần đo thời gian chạy"],
  ].map((r, i) => (i === 0 ? r : r.map((c, j) => cell(c, { align: j === 1 ? "right" : "left", fill: { color: i % 2 ? "FFFFFF" : CARD }, fontSize: 10.5, bold: j === 1, color: j === 1 ? OK : INK }))));
  s.addTable(t, { x: 4.2, y: 1.3, w: 5.3, colW: [2.5, 1.0, 1.8], rowH: 0.42, border: { type: "solid", color: LINE, pt: 0.5 } });
  s.addText(`Sau các quyết định chốt: ${usd(OLD_TOTAL)} → ${usd(total)} mỗi tháng.`, { x: 4.2, y: 4.5, w: 5.3, h: 0.5, fontFace: BODY, fontSize: 12, bold: true, color: AMBER, margin: 0, valign: "top" });
}

// ---------- 13. rủi ro và mở rộng ----------
{
  const s = base("Rủi ro và mở rộng", "Rủi ro lớn nhất nằm ở những chỗ chưa đo, không phải ở hạ tầng.");
  card(s, 0.5, 1.3, 4.4, 3.8);
  s.addText("Rủi ro lớn nhất", { x: 0.65, y: 1.38, w: 4.1, h: 0.3, fontFace: BODY, fontSize: 14, bold: true, color: ERR, margin: 0 });
  s.addText(
    bullets([
      "H8: Haiku cho cấp 2-4 chưa đo ≥ 95%. Lùi về Sonnet nhiều hơn: +$5.068.",
      "H1: đã chốt giữ hồ sơ Bedrock global (cùng một cloud AWS, không lưu dữ liệu). Guardrails dùng cross-Region và ảnh gọi ở us-west-2, nên có thể bị chất vấn về nơi xử lý.",
      "H6: p95 token đầu dưới 3 giây mới là ước lượng; quota Bedrock lúc burst chưa kiểm.",
      `Bằng chứng: ${nEvid} mã ảnh chưa chụp; ${nEvidNoPage} chỗ đơn giá Singapore chỉ thấy trong bảng giá JSON, chưa thấy trên trang.`,
    ], 11.5),
    { x: 0.65, y: 1.75, w: 4.1, h: 3.3, fontFace: BODY, valign: "top", margin: 0 }
  );
  card(s, 5.1, 1.3, 4.4, 1.9);
  s.addText("Nếu DAU gấp đôi (4.000)", { x: 5.25, y: 1.38, w: 4.1, h: 0.3, fontFace: BODY, fontSize: 14, bold: true, color: NAVY, margin: 0 });
  s.addText(
    [
      { text: `Ước tính ~${usd(r100(dau2))}/tháng (+${Math.round((dau2 / total - 1) * 100)}%).`, options: { bold: true, color: AMBER, breakLine: true, fontSize: 12 } },
      { text: `Phần tăng theo tải (LLM, sandbox, Guardrails, lưu trữ, ~${usd(r100(varPart))}) nhân đôi; phần cố định (nhân sự, ALB, NAT, DB, ~${usd(r100(fixedPart))}) tăng khoảng 15%. Ước tính của nhóm, chưa tính lại quota.`, options: { fontSize: 11 } },
    ],
    { x: 5.25, y: 1.75, w: 4.1, h: 1.4, fontFace: BODY, valign: "top", margin: 0, color: INK }
  );
  card(s, 5.1, 3.35, 4.4, 1.75);
  s.addText("Độ nhạy khác", { x: 5.25, y: 3.43, w: 4.1, h: 0.3, fontFace: BODY, fontSize: 14, bold: true, color: NAVY, margin: 0 });
  s.addText(
    bullets([`Giá LLM ±30%: khoảng ±${usd(r100(0.3 * byComp.llm))}`, "Leo thang Haiku → Sonnet 30% thay vì 10%: +$1.971", "Hit rate cache thấp hơn 10 điểm: +$952"], 11),
    { x: 5.25, y: 3.78, w: 4.1, h: 1.25, fontFace: BODY, valign: "top", margin: 0 }
  );
}

// ---------- 14. H1-H8 và việc còn lại ----------
{
  const s = base("Đối chiếu ràng buộc cứng và việc còn lại", "Đạt trên giấy chưa phải đã chứng minh. Màu cho biết mức độ.");
  const st = { ok: ["Đạt trên giấy", OK], warn: ["Chưa chứng minh", WARN], bad: ["Rủi ro", ERR] };
  const data = [
    ["H1 Cloud", "warn", "Đã chốt: AWS, hồ sơ global, không lưu dữ liệu; có thể bị hỏi về nơi xử lý"],
    ["H2 Định danh", "ok", "Cognito SAML/OIDC, MFA, OAuth ủy nhiệm, token KMS"],
    ["H3 Sandbox", "ok", "Lambda microVM, không egress; chưa kiểm metadata và recall RLS"],
    ["H4 Governance", "ok", "Guardrails, xác nhận trước khi ghi; eval gate chưa đo"],
    ["H5 Data", "ok", "SSE-KMS, Presidio, audit 12 tháng; chính sách lưu và phân loại đã chốt"],
    ["H6 Độ trễ", "warn", "p95 < 3 giây mới là ước lượng"],
    ["H7 HA/DR", "ok", "Không SPOF; RTO 3-4 giờ, RPO < 1 giờ chưa diễn tập"],
    ["H8 Chất lượng", "bad", "Chưa đo Haiku ≥ 95%; quota theo người chưa có số"],
  ];
  const t = [[hdr("Ràng buộc"), hdr("Trạng thái"), hdr("Ghi chú")]].concat(
    data.map((d, i) => [
      cell(d[0], { bold: true, fill: { color: i % 2 ? CARD : "FFFFFF" } }),
      cell(st[d[1]][0], { bold: true, color: st[d[1]][1], fill: { color: i % 2 ? CARD : "FFFFFF" } }),
      cell(d[2], { fill: { color: i % 2 ? CARD : "FFFFFF" }, fontSize: 10.5 }),
    ])
  );
  s.addTable(t, { x: 0.5, y: 1.3, w: 9, colW: [1.7, 1.7, 5.6], rowH: 0.33, border: { type: "solid", color: LINE, pt: 0.5 } });
  card(s, 0.5, 4.45, 9, 0.7, AMBER_SOFT);
  s.addText(`Đã chốt 7 câu hỏi mở. Còn phải làm: chụp ${nEvid} ảnh bằng chứng · đo H6 và H8 · tập bảo vệ 7 phút.`, {
    x: 0.65, y: 4.5, w: 8.7, h: 0.6, fontFace: BODY, fontSize: 12, bold: true, color: AMBER, valign: "middle", margin: 0,
  });
}

// ---------- phụ lục: báo giá theo component ----------
{
  const s = pres.addSlide();
  s.background = { color: "FFFFFF" };
  s.addText("Phụ lục: báo giá theo component", { x: 0.5, y: 0.3, w: 9, h: 0.5, fontFace: HEAD, fontSize: 24, bold: true, color: NAVY, margin: 0 });
  const comps = Object.entries(byComp).sort((a, b) => b[1] - a[1]);
  const half = Math.ceil(comps.length / 2);
  [comps.slice(0, half), comps.slice(half)].forEach((list, k) => {
    const t = [[hdr("Component"), hdr("USD/tháng", { align: "right" })]].concat(
      list.map((c, i) => [cell(c[0], { fontFace: MONO, fontSize: 10, fill: { color: i % 2 ? CARD : "FFFFFF" } }), cell(c[1].toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), { align: "right", fontSize: 10.5, fill: { color: i % 2 ? CARD : "FFFFFF" } })])
    );
    s.addTable(t, { x: 0.5 + k * 4.6, y: 1.0, w: 4.4, colW: [2.6, 1.8], rowH: 0.3, border: { type: "solid", color: LINE, pt: 0.5 } });
  });
  s.addText(`TỔNG ${usd(total, 2)} / tháng · ${usd(perDau, 2)} mỗi DAU. Chi tiết từng dòng và bằng chứng: docs/baogia-A/B/C.tsv và evidence/INDEX.md. vector_db tính trong database.`, {
    x: 0.5, y: 4.85, w: 9, h: 0.4, fontFace: BODY, fontSize: 11, bold: true, color: INK, margin: 0,
  });
}

pres.writeFile({ fileName: OUT }).then(() => console.log("saved", OUT, "tổng", total.toFixed(2)));

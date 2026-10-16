"""Tạo docs/uoc-luong-tai.xlsx: bảng ước lượng tải VBot từ 2.000 DAU.

Chạy:  python tools/make_uoc_luong_tai.py docs/uoc-luong-tai.xlsx
Mọi con số ở sheet GiaDinh là GIẢ ĐỊNH của nhóm (ô chữ xanh), sửa ở đó thì sheet TinhToan tự tính lại.
"""
import sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment

out = sys.argv[1] if len(sys.argv) > 1 else "docs/uoc-luong-tai.xlsx"
wb = Workbook()
g = wb.active
g.title = "GiaDinh"
t = wb.create_sheet("TinhToan")

BLUE = Font(color="0000FF")
BOLD = Font(bold=True)
HEAD = PatternFill("solid", fgColor="D9EDF6")
WARN = PatternFill("solid", fgColor="FBF0CF")


def head(ws, row, labels):
    for i, lab in enumerate(labels, start=1):
        c = ws.cell(row=row, column=i, value=lab)
        c.font = BOLD
        c.fill = HEAD
        c.alignment = Alignment(wrap_text=True, vertical="top")


def inp(ws, ref, val):
    ws[ref] = val
    ws[ref].font = BLUE


# ---------- GiaDinh ----------
g["A1"] = "GIẢ ĐỊNH ĐẦU VÀO (chữ xanh = sửa được; chữ đen = công thức)"
g["A1"].font = Font(bold=True, size=13)
g["A2"] = "Chỉ có 2.000 DAU, 22 ngày, 10 giờ/ngày là đề cho. Mọi số khác là giả định ban đầu của nhóm, cần bàn lại."
rows = [
    (3, "DAU (người dùng hoạt động/ngày)", 2000, "Đề cho"),
    (4, "Request mỗi người mỗi ngày", 25, "Giả định (file đề dùng 25 làm mặc định)"),
    (5, "Ngày làm việc/tháng", 22, "Đề cho"),
    (6, "Giờ hành chính/ngày", 10, "Đề cho (8:00-18:00)"),
    (7, "Tỉ lệ request dồn vào giờ cao điểm nhất", 0.15, "Giả định: 15% request cả ngày rơi vào 1 giờ"),
    (8, "Hệ số bùng nổ (burst) so với trung bình giờ cao điểm", 2, "Giả định"),
    (9, "Tỉ lệ người dùng đang có phiên mở cùng lúc", 0.3, "Giả định"),
    (10, "Tỉ lệ input token đọc từ prompt cache", 0.5, "Giả định, đòn bẩy tiết kiệm lớn; hội đồng sẽ hỏi căn cứ"),
    (11, "Giá cache read so với giá input thường (nhân)", 0.1, "Theo tài liệu giá Anthropic; CẦN KIỂM trên trang giá Bedrock"),
]
for r, lab, val, note in rows:
    g.cell(row=r, column=1, value=lab)
    inp(g, f"B{r}", val)
    g.cell(row=r, column=3, value=note)

g["A13"] = "BẢNG GIÁ MODEL (USD / 1 triệu token) - GIÁ THAM KHẢO, PHẢI THAY BẰNG GIÁ BEDROCK ap-southeast-1 + ẢNH CHỤP"
g["A13"].font = BOLD
g["A13"].fill = WARN
head(g, 14, ["Lớp model", "Model gợi ý (chưa chốt)", "Input", "Output", "Hỗ trợ prompt cache (1/0)"])
for r, (cls, model, i, o) in enumerate(
    [("small", "Haiku 4.5 hoặc tương đương", 1.0, 5.0),
     ("medium", "Sonnet 4.6 hoặc tương đương", 3.0, 15.0),
     ("large", "Opus (chưa kiểm giá)", 5.0, 25.0),
     ("open", "DeepSeek V3.1 hoặc Qwen3 trên Bedrock (giá Sydney, CẦN KIỂM region và giá)", 0.6, 1.73)], start=15):
    g.cell(row=r, column=1, value=cls)
    g.cell(row=r, column=2, value=model)
    inp(g, f"C{r}", i)
    inp(g, f"D{r}", o)
    inp(g, f"E{r}", 0 if cls == "open" else 1)

g["A19"] = "5 CẤP TÁC VỤ"
g["A19"].font = BOLD
head(g, 20, ["Cấp tác vụ", "Tỉ lệ request", "Token vào/request", "Token ra/request", "Lớp model",
             "Tỉ lệ có chạy sandbox", "Giây sandbox/lượt", "Lệnh gọi connector/request", "Ảnh sinh ra/request", "Ghi chú"])
tiers = [
    ("Cấp 1 Email, hỏi đáp", 0.45, 3000, 400, "small", 0.0, 0, 1, 0, "Gồm context RAG"),
    ("Cấp 2 Tài liệu, slide", 0.20, 6000, 2000, "medium", 0.5, 20, 1, 0, "Xuất DOCX/XLSX/PPTX chạy trong sandbox"),
    ("Cấp 3 Dữ liệu, code", 0.15, 10000, 1500, "medium", 0.9, 30, 1, 0, "Phân tích bảng, chạy script"),
    ("Cấp 4 Agent dự án", 0.15, 40000, 4000, "medium", 0.3, 60, 5, 0, "Nhiều bước; token vào là tổng các bước"),
    ("Cấp 5 Thiết kế", 0.05, 6000, 1500, "large", 0.3, 30, 1, 1.1, "1 ảnh nháp, trung bình 1,1 ảnh/request"),
]
for r, row in enumerate(tiers, start=21):
    for c, v in enumerate(row, start=1):
        cell = g.cell(row=r, column=c, value=v)
        if 2 <= c <= 9:
            cell.font = BLUE
g["A26"] = "Tổng tỉ lệ (phải bằng 1)"
g["B26"] = "=SUM(B21:B25)"

g["A28"] = "LƯU TRỮ, LOG, MẠNG"
g["A28"].font = BOLD
store = [
    (29, "Workspace trung bình mỗi người (GB)", 2, "Giả định; quota là 10 GB"),
    (30, "Quota mỗi người (GB)", 10, "Đề cho"),
    (31, "Số tài liệu trong knowledge base", 500000, "Giả định"),
    (32, "Chunk mỗi tài liệu", 8, "Giả định"),
    (33, "Số chiều vector", 1024, "Giả định"),
    (34, "Byte mỗi chiều (float32)", 4, ""),
    (35, "Log mỗi request (KB)", 20, "Giả định: prompt/response đã che PII + metadata"),
    (36, "Số tháng giữ audit log", 12, "Đề cho (H5)"),
    (37, "KB mỗi lệnh gọi connector (egress/ingress)", 50, "Giả định"),
    (38, "KB mỗi ảnh sinh ra", 500, "Giả định"),
    (39, "KB lịch sử chat mỗi request", 10, "Giả định"),
]
for r, lab, val, note in store:
    g.cell(row=r, column=1, value=lab)
    inp(g, f"B{r}", val)
    g.cell(row=r, column=3, value=note)

for col, w in zip("ABCDEFGHIJ", [52, 26, 18, 18, 12, 18, 16, 20, 18, 46]):
    g.column_dimensions[col].width = w

# ---------- TinhToan ----------
t["A1"] = "TÍNH TOÁN TỪ GIẢ ĐỊNH (không sửa tay; sửa ở sheet GiaDinh)"
t["A1"].font = Font(bold=True, size=13)
t["A2"] = "Chi phí LLM chỉ là con số kiểm tra nhanh theo giá tham khảo ở GiaDinh. Số nộp phải lấy từ báo giá có ảnh chụp."
head(t, 3, ["Cấp tác vụ", "Request/tháng", "Token vào (triệu)", "Token ra (triệu)",
            "Tiền input (USD)", "Tiền output (USD)", "Lượt sandbox", "Giờ sandbox",
            "Lệnh gọi connector", "Ảnh sinh ra", "Tiền LLM (USD)"])
for i in range(5):
    r = 4 + i
    s = 21 + i
    t[f"A{r}"] = f"=GiaDinh!A{s}"
    t[f"B{r}"] = f"=GiaDinh!$B$3*GiaDinh!$B$4*GiaDinh!$B$5*GiaDinh!B{s}"
    t[f"C{r}"] = f"=B{r}*GiaDinh!C{s}/1000000"
    t[f"D{r}"] = f"=B{r}*GiaDinh!D{s}/1000000"
    t[f"E{r}"] = (f"=C{r}*(1-GiaDinh!$B$10*VLOOKUP(GiaDinh!E{s},GiaDinh!$A$15:$E$18,5,FALSE)*(1-GiaDinh!$B$11))"
                  f"*VLOOKUP(GiaDinh!E{s},GiaDinh!$A$15:$E$18,3,FALSE)")
    t[f"F{r}"] = f"=D{r}*VLOOKUP(GiaDinh!E{s},GiaDinh!$A$15:$E$18,4,FALSE)"
    t[f"G{r}"] = f"=B{r}*GiaDinh!F{s}"
    t[f"H{r}"] = f"=G{r}*GiaDinh!G{s}/3600"
    t[f"I{r}"] = f"=B{r}*GiaDinh!H{s}"
    t[f"J{r}"] = f"=B{r}*GiaDinh!I{s}"
    t[f"K{r}"] = f"=E{r}+F{r}"
t["A9"] = "TỔNG"
for col in "BCDEFGHIJK":
    t[f"{col}9"] = f"=SUM({col}4:{col}8)"
for col in "ABCDEFGHIJK":
    t[f"{col}9"].font = BOLD
t["A10"] = "Tiền LLM mỗi DAU mỗi tháng (USD)"
t["B10"] = "=K9/GiaDinh!B3"

t["A12"] = "GIỜ CAO ĐIỂM"
t["A12"].font = BOLD
peak = [
    (13, "Request/ngày", "=GiaDinh!B3*GiaDinh!B4"),
    (14, "Request/tháng", "=B13*GiaDinh!B5"),
    (15, "Request trong giờ cao điểm", "=B13*GiaDinh!B7"),
    (16, "Request/giây trung bình giờ cao điểm", "=B15/3600"),
    (17, "Request/giây khi burst", "=B16*GiaDinh!B8"),
    (18, "Phiên đồng thời", "=GiaDinh!B3*GiaDinh!B9"),
    (19, "Token vào/giây khi burst", "=C9*1000000/GiaDinh!B5*GiaDinh!B7/3600*GiaDinh!B8"),
    (20, "Token ra/giây khi burst", "=D9*1000000/GiaDinh!B5*GiaDinh!B7/3600*GiaDinh!B8"),
    (21, "Sandbox chạy đồng thời khi burst", "=H9/GiaDinh!B5*GiaDinh!B7*GiaDinh!B8"),
]
for r, lab, f in peak:
    t[f"A{r}"] = lab
    t[f"B{r}"] = f

t["A23"] = "LƯU TRỮ, LOG, MẠNG"
t["A23"].font = BOLD
stor = [
    (24, "Workspace thực tế (TB)", "=GiaDinh!B3*GiaDinh!B29/1024"),
    (25, "Workspace nếu mọi người đầy quota (TB)", "=GiaDinh!B3*GiaDinh!B30/1024"),
    (26, "Số vector trong knowledge base", "=GiaDinh!B31*GiaDinh!B32"),
    (27, "Dung lượng vector (GB, chưa tính index)", "=B26*GiaDinh!B33*GiaDinh!B34/1000000000"),
    (28, "Log mới mỗi tháng (GB)", "=B14*GiaDinh!B35/1000000"),
    (29, "Audit log giữ đủ kỳ hạn (GB)", "=B28*GiaDinh!B36"),
    (30, "Ảnh sinh ra mỗi tháng (GB)", "=J9*GiaDinh!B38/1000000"),
    (31, "Lưu lượng connector mỗi tháng (GB)", "=I9*GiaDinh!B37/1000000"),
    (32, "Lịch sử chat mới mỗi năm (GB)", "=B14*GiaDinh!B39/1000000*12"),
]
for r, lab, f in stor:
    t[f"A{r}"] = lab
    t[f"B{r}"] = f

for col, w in zip("ABCDEFGHIJK", [46, 18, 18, 18, 16, 16, 14, 14, 18, 14, 16]):
    t.column_dimensions[col].width = w
for row in t.iter_rows(min_row=4, max_row=32, min_col=2, max_col=11):
    for c in row:
        c.number_format = "#,##0.00" if c.row in (10, 16, 17, 19, 20, 21) else "#,##0"

wb.save(out)
print("saved", out)

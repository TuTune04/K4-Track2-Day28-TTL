# Phân việc nhóm VBot Capstone

Nhóm 3 người, dùng chung một máy. Đề gợi ý 5 vai cho 4–5 người, nên gộp lại còn 3 phần.
**Đây là đề xuất, đổi tên hoặc đổi phần nếu nhóm muốn.** Ai phụ trách phần nào thì sở hữu các dòng báo giá và các hộp trên sơ đồ của phần đó, nhưng cả ba phải trả lời được câu hỏi về mọi mảng khi bảo vệ.

| Thành viên | GitHub | Vai | Component sở hữu (mã trong báo giá) |
|---|---|---|---|
| Nguyễn Như Tài (2A202602976) | nntai1111 | **A. Model và tải** | `llm`, `embedding`, `gateway`; bảng ước lượng tải; routing; bảng hòa vốn API và tự host; cách đo chất lượng H8 |
| Lò Văn Long (2A202602541) | getlmt | **B. Dữ liệu, sandbox, bảo mật** | `database`, `vector_db`, `object_storage`, `cache_queue`, `sandbox`, `connectors`, `authn`, `authz`, `secrets_kms`, `governance`; H2, H3, H4, H5 |
| Đinh Công Tú (2A202602479) | TuTune04 | **C. Hạ tầng, HA, ghép bài** | `compute`, `load_balancer`, `network`, `backup_dr`, `monitoring`, `cicd`, `ops_labor`, `licenses`, `contingency`, `TOTAL`; H6, H7; ghép slide và báo giá |

Vai C kiêm kiến trúc sư trưởng: giữ cho slide và báo giá khớp nhau, dẫn phần bảo vệ.

## Quy tắc dùng chung một máy
1. **Mỗi người sửa file của mình.** Không sửa file người khác đang làm; nếu cần sửa thì báo trước.
   - `docs/phan-A-model-tai.md` (Tài), `docs/phan-B-du-lieu-bao-mat.md` (Long), `docs/phan-C-ha-van-hanh.md` (Tú).
   - Báo giá: mỗi người ghi dòng của mình vào `docs/baogia-A.tsv`, `baogia-B.tsv`, `baogia-C.tsv` (cùng 5 cột với mẫu trong `vbot-capstone.html`, có dòng tiêu đề); Tú ghép thành `G??_baogia.xlsx`.
   - Chỉ Tú sửa `docs/uoc-luong-tai.xlsx` sau khi cả nhóm đã thống nhất. Muốn thử số khác thì copy file ra `docs/nhap-<ten>.xlsx`.
2. **Commit đúng tên mình.** Máy đang cấu hình git user là `TuTune04`, nên Tài và Long phải đặt tên và email của mình khi commit:
   `git -c user.name="<tên>" -c user.email="<email GitHub>" commit -m "..."`.
3. **Commit thường xuyên, nhỏ.** Trước khi bắt đầu buổi làm việc chạy `git status` để xem người khác đã sửa gì.
4. **Ảnh bằng chứng** lưu ở `evidence/E01.png`, `E02.png`… Một người giữ sổ mã ở `evidence/INDEX.md` (mã, dịch vụ, SKU, region, ngày chụp, ai chụp) để không trùng mã.
5. **Không đưa vào repo:** khóa truy cập AWS, mật khẩu, thông tin cá nhân.

## Thứ tự công việc theo lịch buổi học
Giờ lấy theo lịch trong đề (00:00 là lúc giảng viên mở đề). Hạn nộp là 03:05.

| Giờ | Việc chung | A (Tài) | B (Long) | C (Tú) |
|---|---|---|---|---|
| 00:25–01:15 Sizing | Bàn lại giả định trong `uoc-luong-tai.xlsx`; **chốt hướng LLM trước 01:15** | Chốt model từng cấp, model tham chiếu, routing | Chốt công nghệ sandbox, cách cô lập, nơi lưu token | Chốt AZ, mức scale ngoài giờ, mức HA |
| 01:25–02:35 Kiến trúc + báo giá | Vẽ sơ đồ, điền báo giá, **chụp ảnh ngay khi tra giá** | Dòng `llm`, `embedding`, `gateway` + slide model | Dòng phần B + slide bảo mật | Dòng phần C + sơ đồ tổng + luồng request |
| 02:35–03:05 Tối ưu, đóng gói | Chạy công cụ kiểm tra đến khi ĐẠT; đối chiếu slide với `TOTAL` | Đòn bẩy tiết kiệm có số USD | Rà H2–H5 | Ghép file, nộp form trước 03:05 |
| Sau 03:10 | Bảo vệ 7 phút + 3 phút hỏi | Trình bày: tải, model, chi phí | Trình bày: bảo mật, sandbox | Mở đầu, kiến trúc, HA, kết |

Nên làm một buổi tập dợt trước (đủ 7 phút, có người bấm giờ).

## Danh sách việc cho từng người

### A. Tài – Model và tải
- [ ] Đọc `docs/uoc-luong-tai.xlsx`, sửa giả định nào thấy vô lý (ghi lý do vào `docs/phan-A-model-tai.md`).
- [ ] Chọn model cho từng cấp và model tham chiếu; viết cách đo "đạt 95%" (bộ câu hỏi, cách chấm).
- [ ] Tra giá Bedrock cho các model đã chọn (kèm phí cache, cross-region nếu có) và chụp ảnh.
- [ ] Làm bảng hòa vốn API và tự host GPU (cần giá GPU và thông lượng).
- [ ] Điền các dòng `llm`, `embedding`, `gateway` vào báo giá.
- [ ] Soạn slide: giả định tải, model và routing, đòn bẩy tiết kiệm.

### B. Long – Dữ liệu, sandbox, bảo mật
- [ ] Chốt Lambda hay Fargate/gVisor cho sandbox, viết cách chặn egress và metadata endpoint.
- [ ] Thiết kế cô lập workspace: S3 prefix + STS, RLS ở pgvector; viết cách chứng minh "agent A không đọc file B".
- [ ] So sánh cách lưu token connector (Secrets Manager và KMS + RDS); tra giá cả hai.
- [ ] Viết guardrail, chống prompt injection, DLP, audit; tra giá Guardrails.
- [ ] Điền các dòng phần B vào báo giá (nhớ dòng `vector_db` ghi 0 phải nói "nằm trong" database).
- [ ] Soạn slide: connector và phân quyền, workspace và sandbox, AI và data governance.

### C. Tú – Hạ tầng, HA, ghép bài
- [ ] Tra giá compute (Fargate), ALB, NAT, WAF, VPC endpoint, CloudWatch, backup xuyên region, CI/CD.
- [ ] Chốt số AZ, số task, lịch scale ngoài giờ; viết kịch bản "một AZ mất".
- [ ] Ước lượng `ops_labor` (số FTE, lý do) và `contingency`; ghi `NA` ở bằng chứng cho hai dòng này.
- [ ] Giữ sổ ảnh `evidence/INDEX.md`.
- [ ] Vẽ sơ đồ tổng (mỗi hộp ghi mã component) và luồng một request.
- [ ] Ghép báo giá, chạy công cụ kiểm tra (mục "Báo giá" trong `vbot-capstone.html`) đến khi ĐẠT.
- [ ] Ghép slide (dùng skill `pptx`), kiểm tra tổng trên slide bằng dòng `TOTAL`.

## Việc cả nhóm cùng làm
- [ ] Mở `vbot-capstone.html` trong trình duyệt, đọc lại 8 ràng buộc H1–H8 và đối chiếu từng cái với thiết kế.
- [ ] Đảm bảo đủ 19 component bắt buộc có dòng trong báo giá (công cụ kiểm tra sẽ báo thiếu).
- [ ] Không dùng các từ "free tier", "trial", "credit", "miễn phí", "khuyến mãi" trong báo giá.
- [ ] Chép tên file nộp theo mã nhóm (`G??_slide.pdf` hoặc `.pptx`, `G??_baogia.xlsx`) khi giảng viên cho biết mã.

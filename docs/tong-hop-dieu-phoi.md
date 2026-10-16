# Tổng hợp điều phối: VBot Capstone (cập nhật 2026-10-16, sau tối ưu và áp quy tắc bằng chứng)

> **Cập nhật sau quyết định chốt (2026-10-16):** 7 câu hỏi mở ở mục 7 đã được chốt, xem `docs/quyet-dinh-chot.md`. Tổng mới **$18.871,95/tháng** (A 9.811,98; B 2.873,95; C 6.186,02). Các số cũ trong mục 2, 5 và 7 bên dưới là trước khi chốt.


Nguồn: `phan-A-model-tai.md`, `phan-B-du-lieu-bao-mat.md`, `phan-C-ha-van-hanh.md`, `baogia-A/B/C.tsv`, `evidence/INDEX.md`. Mọi số tiền dưới đây cộng trực tiếp từ cột chi phí của ba file TSV. Một vòng sửa duy nhất đã giao cho `tu` (rerank, vùng Cohere Embed); đã xong.

## 1. Kiểm tra 19 component

Đủ 19 component bắt buộc, không thiếu, không trùng giữa các phần. TSV có 22 nhãn: 19 bắt buộc cộng `embedding`, `licenses`, `contingency` (nhãn ghép của đề).

| Phần | Component |
|---|---|
| A (tai) | llm, embedding, gateway |
| B (long) | database, vector_db, object_storage, cache_queue, sandbox, connectors, authn, authz, secrets_kms, governance |
| C (tu) | compute, load_balancer, network, backup_dr, monitoring, cicd, ops_labor, licenses, contingency |

Staging có đủ: RDS, ElastiCache, sandbox, connector, Presidio (B), compute tắt ngoài giờ (C). HA có: RDS Multi-AZ, ElastiCache 2 node, Fargate 2 AZ, NAT mỗi AZ, ALB 2 AZ, gateway 2 task mỗi AZ một.

## 2. Tổng chi phí (USD/tháng, giá niêm yết, không free tier)

| Phần | Component chính | Chi phí | Tỉ trọng |
|---|---|---|---|
| A | llm 11.806,99; gateway 93,66; embedding 23,33 | **11.923,98** | 56,8% |
| B | database 951,83; governance 881,40; sandbox 689,51; object_storage 129,25; cache_queue 88,09; connectors 41,40; secrets_kms 37,70; authn 30,45; authz 22,50 | **2.872,13** | 13,7% |
| C | ops_labor 5.450,00; network 225,65; compute 191,24; backup_dr 172,83; monitoring 45,16; load_balancer 42,00; cicd 16,50; licenses 12,00; contingency 35,27 | **6.190,65** | 29,5% |
| **Tổng** | | **20.986,76** | 100% |

Theo nhóm: LLM 56,3% (11.806,99); nhân sự 26,0% (5.450); hạ tầng còn lại 17,8% (3.729,77). Không tính nhân sự: 15.536,76. So với lần tổng hợp trước (25.316,77): giảm 4.330,01, hầu hết do Haiku cho cấp 2-4, cache theo cấp và cắt token ra, trừ phần tăng của ảnh.

**5 hạng mục lớn nhất:**

| # | Hạng mục | USD |
|---|---|---|
| 1 | Sinh ảnh cấp 5: Stability Stable Image Core (us-west-2) | 4.532,00 |
| 2 | SRE/Platform 1,0 FTE | 3.500,00 |
| 3 | Sonnet 5.5 token ra | 3.312,93 |
| 4 | Sonnet 5.5 token vào | 2.988,67 |
| 5 | LLMOps 0,5 FTE | 1.750,00 |

Kế tiếp: Bedrock Guardrails 792,00; RDS prod Multi-AZ 787,67; Lambda sandbox 649,79. Điểm đáng chú ý: ảnh lớn hơn cả toàn bộ token Haiku (973) cộng embedding và gateway.

## 3. Mâu thuẫn còn lại giữa A/B/C

| # | Vấn đề | Tình trạng |
|---|---|---|
| 1 | Dịch vụ ảnh đã đổi: Titan Image/Nova Canvas không còn dùng được, A chuyển sang Stable Image Core ở **us-west-2** (4.532, tăng từ 1.100). C đã cộng NAT +3,36 cho đường ảnh; B không bị ảnh hưởng | Nhất quán về số; rủi ro H1 (xem câu hỏi mở) |
| 2 | Embedding đổi sang Cohere Embed Multilingual (A: Singapore). C đã đổi sơ đồ và độ trễ; sau vòng sửa C ghi DR Sydney cho embedding là chưa kiểm. B vector 1024 chiều vẫn khớp | Đã khớp |
| 3 | DeepSeek/Qwen: A bỏ hẳn (không có ở Singapore, không dùng làm fallback); sơ đồ C đã sửa, không còn nhắc | Đã khớp; hướng ban đầu "model mở" trong RULES.md đã lỗi thời, chỉ còn Claude |
| 4 | Rerank: C tính 150-400 ms "nếu có", A không đưa vào báo giá (ước 660 nếu có, không có ở Singapore cho Amazon Rerank) | Đã sửa: C ghi rõ rerank ngoài baseline |
| 5 | Region: mọi dịch vụ ap-southeast-1, DR Sydney; ngoại lệ ảnh us-west-2; Claude 5.5 ở Singapore chỉ qua hồ sơ **global**; Guardrails Standard (bắt buộc cho tiếng Việt) dùng **cross-Region** trong cùng geography nhưng vùng đích chưa có bằng chứng | Chưa giải quyết được, cần người dùng quyết (H1) |
| 6 | Gateway tính một lần ở A (93,66), C đã bỏ dòng LiteLLM; staging DB riêng ở B (81,36), C đã sửa câu | Đã khớp từ vòng trước |
| 7 | Báo giá A ghi kịch bản S3 (Haiku cho cấp 2-4 + leo thang 10%); mức này **chưa đo H8**. Nếu lùi S2: LLM token +5.068 | Phụ thuộc kết quả đo |
| 8 | `contingency` 35,27 chỉ tính trên hạ tầng phần C; token LLM (±30% ≈ ±3.400 trên token 7.275 + ảnh) không có dự phòng | Cần quyết |
| 9 | Nhiều đơn giá Singapore **CHƯA CÓ BẰNG CHỨNG trên trang** (chỉ thấy trong JSON), xem mục 6 | Phải chụp tay |

## 4. Đối chiếu H1-H8

| H | Trạng thái | Ghi chú |
|---|---|---|
| H1 Cloud | **Rủi ro** | AWS Singapore + DR Sydney. Hồ sơ global (xử lý ở region bất kỳ), Guardrails cross-Region, ảnh us-west-2: cả ba cần chốt hoặc có cam kết không lưu dữ liệu |
| H2 Định danh | Đạt trên giấy | Cognito SAML/OIDC + MFA ở IdP; Verified Permissions; OAuth ủy nhiệm; token mã hóa KMS trong RDS (không phải Secrets Manager, hội đồng có thể hỏi) |
| H3 Sandbox | Đạt trên giấy | Lambda microVM tenant isolation, subnet không NAT; "hủy sau khi chạy" chưa theo nghĩa đen; RLS pgvector chưa đo recall |
| H4 Governance | Đạt trên giấy | Guardrails + xác nhận trước khi ghi; eval gate nằm ở tai/tu, chưa đo |
| H5 Data | Đạt trên giấy | SSE-KMS, Presidio (tiếng Việt chưa đo), audit 12 tháng S3 Object Lock; thiếu chính sách thời hạn lưu |
| H6 Độ trễ | Chưa chứng minh | p95 TTFT < 3 s chỉ là ước lượng; cấp 2-3 rủi ro; quota Bedrock (burst ~2,6 triệu token/phút) chưa kiểm |
| H7 HA/DR | Đạt trên giấy | Không SPOF ở LB, gateway, DB; RTO 3-4 giờ theo kế hoạch (RDS 300 GB khôi phục 1:30-2:30) sát ngưỡng 4 giờ; RPO < 1 giờ; chưa diễn tập |
| H8 Chất lượng/chi phí | **Chưa đạt** | Haiku cho cấp 2-4 ≥95% model tham chiếu chưa đo; có điều kiện lùi S2; quota theo người/đơn vị ở LiteLLM chưa có số |

## 5. Đòn bẩy tiết kiệm còn lại (USD/tháng, từ phần A/B/C)

| Đòn bẩy | Tiết kiệm | Điều kiện/rủi ro |
|---|---|---|
| Ảnh cấp 5: **1 ảnh nháp** thay vì 2 (4.532 → 2.266) | **−2.266** | Chọn bản nháp rẻ, người dùng xin thêm khi cần; cần chốt trải nghiệm |
| Bỏ LLMOps 0,5 FTE (gộp vào SRE) | −1.750 | Quyết định nhân sự, không phải kỹ thuật |
| Cache tốt hơn: cấp 4 hit read 85%/write 15% | −671 | Cần đo hit rate thực tế |
| Sandbox 3 → 2 GB RAM | ~−173 | Cần đo thời gian chạy |
| Guardrails chỉ quét nội dung trước hành động ghi của cấp 4 | ~−240 đến −320 (30-40% của 792) | Giảm phủ H4 ở các cấp khác |
| Ghi cache giảm một nửa | −265 | Phụ thuộc tái sử dụng |
| Giữ global thay vì geo APAC | tránh +727 | Đánh đổi với H1 |
| S3 Intelligent-Tiering cho workspace | chưa có số | Cần số liệu mức độ lạnh |

Nếu áp riêng "1 ảnh nháp": tổng 20.986,76 → 18.720,76. Rủi ro tăng cần dự phòng: lùi S2 +5.068, hit rate thấp hơn 10 điểm +952, token ra không cắt được +1.202, leo thang 30% +1.971, geo APAC +727.

## 6. Ảnh bằng chứng cần chụp tay (`evidence/INDEX.md`)

Tổng 61 mã, **toàn bộ "chưa chụp"**. Chỉ có người dùng chụp được. Hai bảng dưới đây là phần cần xử lý trước hạn nộp:

| Phần | Số mã | Khoảng mã | Mã `CHƯA CÓ BẰNG CHỨNG` trên trang (số Singapore chỉ trong JSON) | Việc chụp |
|---|---|---|---|---|
| C (tu) | 20 | E01-E19, E39 | 15 | Fargate, ALB, WAF, NAT, PrivateLink, data transfer, RDS, S3, CloudWatch... Thứ tự chụp đề xuất ở cuối INDEX: E01-E06, E08, E10, E12, rồi E09/E17-E19, rồi E11/E13-E16/E39 |
| A (tai) | 17 | E20-E38 (trừ E34, E37) | 7 | Bedrock: Haiku/Sonnet/Opus 5.5, Cohere Embed, Stable Image Core, Fargate, models-region, prompt caching, cross-Region, data protection, quotas |
| B (long) | 24 | E40-E63 | 11 | Lambda, ElastiCache, SQS, Cognito, Verified Permissions, KMS, Secrets Manager, Guardrails (E57-E60), S3 Object Lock, RDS |
| **Cộng** | **61** | | **33** | |

Quy tắc xử lý: nếu trang giá không hiện Singapore, lưu một bản **Pricing Calculator** (https://calculator.aws) và dán link vào cột Bằng chứng; dòng nào chưa có ảnh/link phải coi là CHƯA CÓ BẰNG CHỨNG khi trình bày. Thêm ngoài INDEX: console Bedrock (model access, quota Singapore), Guardrails Standard (vùng đích cross-Region), kết quả đo p95 TTFT, diễn tập failover.

## 7. Câu hỏi mở (chỉ người dùng quyết được)

1. H1: chấp nhận Bedrock hồ sơ **global** (rẻ hơn) hay geo APAC (+727/tháng cho token; gọi từ Sydney/Tokyo)? Chấp nhận Guardrails Standard cross-Region (cần cho tiếng Việt)?
2. Ảnh cấp 5: gọi Stable Image Core ở us-west-2 (chỉ gửi mô tả văn bản)? Giữ 2 ảnh hay 1 ảnh nháp (−2.266)?
3. Chốt model tham chiếu H8 (đề xuất Sonnet 5.5) và có nộp S3 hay S2 (S3 rẻ hơn 5.068 nhưng chưa đo; nếu không kịp đo thì nộp S2 để chắc điểm)?
4. Có tính nhân sự 1,5 FTE (5.450) vào báo giá không, và có giữ LLMOps 0,5 FTE không (−1.750)?
5. Dự phòng: giữ 5% chỉ trên hạ tầng (35,27) hay thêm dự phòng cho token/ảnh?
6. Thời hạn lưu dữ liệu và chính sách phân loại (H5).
7. DR: chấp nhận RTO ước tính 3-4 giờ sát ngưỡng 4 giờ, hay tăng chi phí cho pilot light chạy sẵn?

## 8. Ba điểm chưa chắc lớn nhất

1. Haiku cho cấp 2-4 và mức cắt token ra chưa đo (H8): quyết định ~5.000-7.000 USD/tháng.
2. 33 trong 61 mã bằng chứng thiếu số Singapore trên trang; mọi ảnh chưa chụp.
3. H1: global profile, Guardrails cross-Region và ảnh ở Mỹ; H6 chưa đo quota Bedrock.

TRẠNG THÁI: XONG

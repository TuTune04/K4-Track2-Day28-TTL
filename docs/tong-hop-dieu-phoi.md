# Tổng hợp điều phối: VBot Capstone (2026-10-16)

Nguồn: `phan-A-model-tai.md`, `phan-B-du-lieu-bao-mat.md`, `phan-C-ha-van-hanh.md`, `baogia-A/B/C.tsv`. Cả ba agent (tai, long, tu) đã báo `TRẠNG THÁI: XONG`. Không agent nào bị chặn quyền. Đã chạy một vòng sửa (tai, tu) sau khi kiểm chéo. Số tiền dưới đây là số **sau vòng sửa**, cộng trực tiếp từ ba file TSV.

## 1. Kiểm tra 19 component

Đủ 19 component bắt buộc, không thiếu, không trùng giữa các phần:

| Phần | Component |
|---|---|
| A (tai) | llm, gateway (thêm dòng `embedding`) |
| B (long) | database, vector_db, object_storage, cache_queue, sandbox, connectors, authn, authz, secrets_kms, governance |
| C (tu) | compute, load_balancer, network, backup_dr, monitoring, cicd, ops_labor (thêm `licenses`, `contingency`) |

- Staging có: RDS staging (B 81,36), ElastiCache, sandbox, connector, Presidio staging (B), compute staging tắt ngoài giờ (C).
- HA có: RDS Multi-AZ, ElastiCache 2 node, 2 AZ cho Fargate, NAT mỗi AZ, ALB 2 AZ. Chưa có HA cho gateway ở bên A trong phần mô tả cũ, nay dùng cỡ của C (2 task, mỗi AZ một task).
- Còn sót: `licenses` và `contingency` thuộc vai kiến trúc sư trưởng theo đề; tu đã làm hộ. `embedding` chỉ 6,53 USD.

## 2. Mâu thuẫn tìm được

| # | Mâu thuẫn | Xử lý |
|---|---|---|
| 1 | LiteLLM tính 2 lần: A `gateway` 71,97 và C `compute` 93,65 | Đã sửa: tai giữ dòng `gateway` (93,66, cỡ của tu); tu xóa dòng khỏi `compute` |
| 2 | Audit log 12 tháng vừa ở S3 Object Lock (B 6,60) vừa ở CloudWatch (C ~8 + ingest) | Đã sửa: tu bỏ phần lưu trữ audit 12 tháng khỏi CloudWatch |
| 3 | Kích cỡ DB: B 300 GB gp3, C tính backup theo 150 GB | Đã sửa: tu tính lại backup/DR theo 300 GB (backup_dr 123,94 → 171,33) |
| 4 | C nói DB staging dùng chung với prod, B có RDS staging riêng | Đã sửa câu của C, B đã tính 81,36 |
| 5 | Region: mọi thứ ap-southeast-1, nhưng Titan Image phải gọi us-west-2, DeepSeek/Qwen chỉ có Sydney, Claude 5.5 ở Singapore chỉ qua hồ sơ "global" | Không phải lỗi nội bộ, nhưng là rủi ro H1 (câu hỏi mở bên dưới) |
| 6 | Hướng ban đầu "Claude + DeepSeek/Qwen"; A khuyến nghị chỉ dùng Claude (Haiku 5.5 + Sonnet 5.5) vì Singapore không có model mở | Khớp với B/C (sơ đồ C còn ghi DeepSeek/Qwen: tu nên bỏ khi gộp slide) |
| 7 | Guardrails tầng Standard (B) bắt buộc cross-region inference, trong khi C/B nói mọi thứ ở Singapore | Chưa xác nhận, xem câu hỏi mở |

Khớp nhau: tải (1,1 triệu request, 4,2 req/s, 600 phiên, ~38 sandbox, 3,9 TB, 22 GB log), sandbox Lambda microVM (B) với subnet sandbox không NAT (C), token connector mã hóa KMS trong RDS (B, C đồng ý), Bedrock qua VPC endpoint (C), region DR Sydney.

## 3. Đối chiếu H1-H8

| H | Trạng thái | Ghi chú |
|---|---|---|
| H1 Cloud | Rủi ro | AWS Singapore. Hồ sơ "global" xử lý ở region nào cũng được; Guardrails Standard cross-region; ảnh gọi us-west-2 |
| H2 Định danh | Đạt trên giấy | Cognito SAML/OIDC + MFA ở IdP, Verified Permissions, token KMS trong RDS ("vault" không phải Secrets Manager, hội đồng có thể hỏi) |
| H3 Sandbox | Đạt trên giấy | Lambda tenant isolation (Firecracker), không egress. "Hủy sau khi chạy" chưa theo nghĩa đen; RLS pgvector chưa đo recall |
| H4 Governance | Đạt trên giấy | Guardrails + xác nhận trước khi ghi. Cổng eval chưa thấy chi phí/thiết kế rõ ràng (thuộc tai/tu), cần bổ sung |
| H5 Data | Đạt trên giấy | SSE-KMS, Presidio (chưa đo tiếng Việt), audit 12 tháng Object Lock. Chưa có chính sách thời hạn lưu |
| H6 Độ trễ | Chưa chứng minh | p95 TTFT < 3 s mới là ước lượng; quota Bedrock (~2,6 triệu token vào/phút lúc burst) chưa kiểm |
| H7 HA/DR | Đạt trên giấy | Không SPOF ở LB, gateway, DB; RTO ~3 giờ/RPO < 1 giờ là ước tính, chưa diễn tập. Sandbox Lambda và gateway chưa có kế hoạch ở Sydney ngoài Terraform |
| H8 Chất lượng/chi phí | Chưa đạt | Mức Haiku/Sonnet cho từng cấp chưa đo ≥ 95% điểm model tham chiếu; quota theo người/đơn vị nằm ở LiteLLM nhưng chưa có số |

## 4. Tổng chi phí tạm tính (USD/tháng)

| Phần | Chi phí | Tỉ trọng |
|---|---|---|
| A: llm 16.158,90, gateway 93,66, embedding 6,53 | 16.259,09 | 64,2% |
| B: database 951,83, governance 881,40, sandbox 689,51, object_storage 129,25, cache_queue 88,09, connectors 41,40, secrets_kms 37,70, authn 30,45, authz 22,50 | 2.872,13 | 11,3% |
| C: ops_labor 5.450, network 222,29, compute 191,24, backup_dr 171,33, monitoring 45,16, load_balancer 42, cicd 16,50, licenses 12, contingency 35,03 | 6.185,55 | 24,4% |
| **Tổng** | **25.316,77** | 100% |

- Theo nhóm: LLM 63,8%; nhân sự 21,5%; hạ tầng còn lại (không gồm LLM, nhân sự) 14,7% (~3.700).
- Không tính nhân sự: 19.866,77.

**5 hạng mục lớn nhất:** (1) Sonnet 5.5 token ra 7.920; (2) Sonnet 5.5 token vào 6.385,50; (3) SRE 1,0 FTE 3.500; (4) LLMOps 0,5 FTE 1.750; (5) sinh ảnh Titan 1.100. Ngay sau đó: Guardrails 792, RDS prod 787,67.

**Đòn bẩy tiết kiệm đáng thử:**
- Chuyển cấp 2-4 sang Haiku 5.5 (kịch bản S3 của A): tiết kiệm ~7.215/tháng, chỉ khi bộ eval H8 đạt. Đây là đòn bẩy lớn nhất, gấp ~10 lần mọi thứ khác.
- Sonnet chiếm ~95% tiền token: thử cache tốt hơn (giả định hiện 50% đọc) và rút gọn prompt cấp 4.
- Ảnh cấp 5: Nova Canvas ở Tokyo đắt gấp 4 (4.400 so với 1.100), nên Titan us-west-2 rẻ nhưng vướng H1.
- Guardrails 792: chỉ áp cho nội dung connector trước hành động ghi, không áp cho mọi prompt.
- Giảm nhân sự (0,5 FTE LLMOps ghép với SRE) là phép tính của người dùng, đang chiếm 21,5%.
- Contingency 35 USD chỉ tính trên hạ tầng phần C; token LLM ±30% (~±4.800) không có dự phòng.

## 5. Câu hỏi mở (chỉ người dùng quyết được)

1. Chấp nhận Bedrock hồ sơ "global" (rẻ hơn ~10%, xử lý ở region bất kỳ) hay hồ sơ geo APAC (+~1.500/tháng) để thỏa H1?
2. Chọn model tham chiếu H8 (đề xuất Sonnet 5.5) và có chấp nhận chạy Haiku 5.5 cho cấp 1-2 không?
3. Titan Image ở us-west-2 (H1, chỉ gửi mô tả văn bản) hay Nova Canvas Tokyo (gấp 4 giá)?
4. Guardrails Standard (hỗ trợ tiếng Việt, bắt buộc cross-region) có chấp nhận không?
5. Mức ops_labor: lương tham khảo 2.700 USD/tháng, 1,0 + 0,5 FTE có tính vào báo giá không? (đề cho phép, nhưng chiếm 21,5%)
6. Contingency: 5% chỉ trên hạ tầng hay thêm dự phòng cho token LLM?
7. Thời hạn lưu dữ liệu và chính sách phân loại (H5).
8. Tách riêng hay dùng chung NAT/DB staging với prod.

## 6. Ảnh bằng chứng cần chụp tay

- Trang giá chính thức (tên dịch vụ, SKU, region, đơn giá) cho mọi dịch vụ: Bedrock (Claude Haiku/Sonnet 5.5 ap-southeast-1, E-A1/E-A2), Titan Embeddings (E-A3), Titan Image us-west-2 (E-A4), Fargate (E-A5, E01); ALB (E02), WAF (E03), NAT (E04), PrivateLink (E05), data transfer (E06), Route 53 (E07), RDS (E08, E09), S3 (E10), ECR (E11), CloudWatch (E12), GitHub Actions/Team (E13, E14); Lambda, ElastiCache, SQS, Cognito, Verified Permissions, KMS, Secrets Manager, Guardrails (B).
- Console Bedrock: Model access và quota (tokens/phút) cho Haiku/Sonnet 5.5 ở Singapore.
- Console Bedrock Guardrails: tầng Standard, hành vi cross-region.
- Pricing Calculator đã lưu (xuất PDF) cho toàn bộ báo giá.
- Kết quả đo: p95 TTFT (k6/Locust 600 phiên, 4,2 req/s), diễn tập failover RDS, khôi phục DR (nếu làm kịp).

## 7. Ba điểm chưa chắc lớn nhất

1. Giá trong báo giá lấy từ Price List JSON chính thức, **chưa mở và chụp trang web**; khối lượng token, cache, log là giả định.
2. H6 và H8 chưa có số đo (quota Bedrock, chất lượng Haiku so với Sonnet, p95 TTFT).
3. H1: hồ sơ global, Guardrails cross-region, ảnh ở Mỹ cần người dùng quyết.

TRẠNG THÁI: XONG

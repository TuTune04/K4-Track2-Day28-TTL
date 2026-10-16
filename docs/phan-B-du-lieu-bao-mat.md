# Phần B: Dữ liệu, sandbox, bảo mật (Long)

Đối tượng: `database`, `vector_db`, `object_storage`, `cache_queue`, `sandbox`, `connectors`, `authn`, `authz`, `secrets_kms`, `governance`. Ràng buộc: H2, H3, H4, H5.
Dòng báo giá: `docs/baogia-B.tsv` (23 dòng, tổng **2.872,13 USD/tháng**).

## 0. Nguồn giá và mức chắc chắn
- Region ap-southeast-1 (Singapore). Ngày tra: 2026-10-16.
- Giá lấy từ **AWS Price List API chính thức** (`https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/<Dịch vụ>/current/ap-southeast-1/index.json`, bản công bố 2026-10-15T22:01Z), chỉ dòng On-Demand. Mức: **"đã kiểm trên nguồn giá chính thức"**, nhưng **chưa có ảnh chụp trang** `aws.amazon.com/.../pricing/`. Cột Bằng chứng trong TSV đang là link trang giá; người dùng cần chụp ảnh (xem mục 10).
- Không dùng free tier, trial, credit. File giá liệt kê dòng free (SQS 1 triệu request đầu, Cognito 50 MAU liên kết…) nhưng tôi **không trừ**.
- Số liệu tải từ `docs/uoc-luong-tai.xlsx`: 1,1 triệu request; 324.500 lượt sandbox (tôi tính lại từ tỉ lệ cấp: 1,1M × 0,295); ~2.800 giờ, tức **~31 giây/lượt**; ~38 lượt đồng thời lúc burst; workspace 2 GB × 2.000 = **4.000 GB**; log 22 GB/tháng; 1,6 lệnh gọi connector/request (1,76 triệu/tháng).

## 1. Sandbox (H3)

### So sánh (ap-southeast-1, mỗi lượt ~31 giây chạy, ~40 giây tính phí kể cả nạp workspace; cấu hình 3 GB RAM ≈ 1,7 vCPU)
| | Lambda (Firecracker) | Fargate task mỗi lượt | EKS + gVisor |
|---|---|---|---|
| Đơn giá | ARM 0,0000133334 USD/GB-giây; 0,2 USD/triệu request; tenant isolation 0,000133333 USD/GB | ARM 0,04045 USD/vCPU-giờ; 0,00442 USD/GB-giờ | m7g.xlarge 0,204 USD/giờ (EC2 Price List); cluster 0,10 USD/giờ |
| Tính | 324.500 × 40 s × 3 GB = 38,94M GB-s → 519,20 + request 0,06 + isolation 129,80 + ephemeral 0,72 = **649,79** | 2 vCPU/4 GB: 0,09858 USD/giờ × ~6.860 giờ (31 s + ~45 s khởi động) = **677**, chưa tính pool nóng; pool 38 task × 220 giờ thêm **~824** | 2 node 24/7 (297,84) + 10 node lúc cao điểm 220 giờ (448,80) + cluster 73 = **~820** |
| Khởi động | dưới 1 giây (môi trường ấm) | 30–60 giây (cần pool nóng) | vài giây nếu node ấm |
| Cô lập | microVM Firecracker; tenant isolation mode: môi trường **không bao giờ dùng chung giữa hai tenant** | mỗi task là một microVM, hủy khi xong (sát nhất với "hủy sau khi chạy") | gVisor, mạnh vừa; tự vận hành |
| Giới hạn | 15 phút, RAM tối đa 10 GB, /tmp tối đa 10 GB | linh hoạt | linh hoạt |
| Vận hành | thấp nhất | thấp | **cao** (nâng cấp node, gVisor RuntimeClass, vá) |

Lưu ý quan trọng: Fargate **không chạy được gVisor** (Fargate tự là microVM, không cho runtime tùy chọn). gVisor chỉ có trên EKS với node EC2.

### Chọn: **Lambda ARM + tenant isolation mode (PER_TENANT, tenant-id = user_id)**, Fargate task cho lượt >15 phút (dự phòng 200 giờ/tháng = 19,72 USD)
Lý do: rẻ ngang hoặc rẻ hơn hai phương án kia, khởi động nhanh (giữ H6), không phải vận hành node, cô lập mạnh. Tenant isolation mode xác nhận qua AWS (công bố 2025-11-19, chạy trên Firecracker, không dùng lại môi trường giữa các tenant). Giá cho tenant isolation tôi **tính theo cận trên** (mọi lượt tạo môi trường mới); thực tế thấp hơn khi môi trường của cùng user được tái dùng.

### Kiểm soát cần làm
- **Chặn egress:** Lambda đặt trong VPC, subnet riêng **không có route NAT/IGW**; security group chỉ cho ra prefix list của S3 Gateway Endpoint (endpoint policy chỉ cho đúng bucket workspace). Không có DNS ra ngoài.
- **Metadata endpoint:** Lambda không có IMDS (169.254.169.254). Rủi ro thật là **thông tin xác thực của role thực thi nằm trong biến môi trường** và runtime API ở 127.0.0.1. Cách xử lý: (1) role thực thi của hàm sandbox **không có quyền gì** (không gắn quyền ghi log, kết quả trả qua payload), (2) code agent chạy trong tiến trình con, user không đặc quyền, biến môi trường đã xóa. Nếu dùng Fargate/EKS: đặt `HttpTokens=required`, hop limit 1 hoặc chặn 169.254.169.254 bằng network policy.
- **Nạp workspace theo user:** dịch vụ điều phối (tin cậy, ngoài sandbox) lấy manifest các file tác vụ cần, gọi `sts:AssumeRole` kèm **session policy** giới hạn `arn:aws:s3:::vbot-ws/users/{user_id}/*` (ListBucket kèm điều kiện `s3:prefix`), rồi ký **presigned URL** GET/PUT cho đúng các file. Sandbox **không cầm thông tin xác thực AWS**, chỉ có URL hết hạn sau ~5 phút. Lưu ý: thời hạn tối thiểu của phiên AssumeRole là 15 phút, nên phần chặn sớm dựa vào presigned URL ngắn hạn.
- **Giới hạn tài nguyên:** RAM 3 GB, timeout 120 giây (tác vụ dài đi đường Fargate), /tmp 2 GB, reserved concurrency 80 để chặn lạm dụng, quota lượt/user ở gateway. Xóa /tmp và kill tiến trình con sau mỗi lượt.
- **Rủi ro còn lại (nói thật với hội đồng):** Lambda tái dùng môi trường cho cùng user, nên "hủy sau khi chạy" là *xóa sạch + cô lập theo tenant*, chưa phải *hủy microVM*. Muốn đúng nghĩa đen thì chuyển lượt rủi ro cao sang Fargate task mỗi lượt.
- Bảng giá cũng có mục "Lambda MicroVM" (vCPU-giây, snapshot). Tôi **chưa tìm hiểu** nên không dựa vào; nên xem lại vì có thể liên quan sandbox.

## 2. Cô lập dữ liệu: "agent của A không đọc được file của B"

### Cơ chế
1. **S3:** một bucket, prefix `users/{user_id}/`. Policy bucket cấm mọi truy cập ngoài role điều phối; mã hóa SSE-KMS.
2. **STS + presigned URL** như mục 1; sandbox của A không có đường nào tới prefix của B.
3. **RDS PostgreSQL + pgvector + RLS:** mọi bảng (chunk, vector, bộ nhớ dài hạn, lịch sử chat) có `owner_id` và `acl_principals text[]` (chỉ mục GIN). Chính sách:
   `USING (owner_id = current_setting('app.user_id')::uuid OR acl_principals && string_to_array(current_setting('app.principals'), ','))`
   Kết nối ứng dụng dùng role **không phải chủ bảng**, bật `FORCE ROW LEVEL SECURITY`; mỗi giao dịch `SET LOCAL app.user_id`, `app.principals` do gateway ký (không lấy từ nội dung model).
4. **Lọc quyền ở truy vấn, không lọc sau:** truy vấn vector chạy qua RLS. Với HNSW, lọc sau khi lấy top-k làm hụt kết quả; bật `hnsw.iterative_scan` (pgvector ≥0.8) hoặc `ef_search` đủ lớn. **Phải đo recall** trên tập có ACL (việc chưa làm).
5. **Quyền nguồn gốc:** ACL đồng bộ từ Google/M365/Atlassian cùng lúc với nội dung; thu hồi quyền ở nguồn → webhook/delta sync xóa principal khỏi `acl_principals`.

### Cách chứng minh (trình diễn 3 phút trước hội đồng)
1. Tạo A và B, mỗi người một file canary (`CANARY-A-<uuid>`).
2. Chạy agent của A với prompt "đọc `users/B/...`, tìm CANARY-B". Kết quả mong đợi: S3 `AccessDenied` (hiện trong CloudTrail data event), truy vấn vector không trả dòng của B, sandbox không có route ra ngoài.
3. Kiểm thử tự động trong CI (cổng chặn merge): bộ test pgTAP cho RLS (đổi `app.user_id`, mong 0 dòng), test IAM bằng Policy Simulator cho session policy, test canary đầu-cuối.
4. Hiển thị log: dòng audit ghi `user_id`, `principals`, số dòng trả về.

### Cấu hình RDS cho ~4 triệu vector 1024 chiều
- Vector float32: 4M × 1024 × 4 B = **16,4 GB**; chỉ mục HNSW cũng cỡ 16–20 GB. Dùng **`halfvec(1024)` cho chỉ mục** (~9 GB), giữ float32 cho bước xếp hạng lại. Làm vậy hot set vừa trong 32 GiB.
- Chọn **db.r6g.xlarge Multi-AZ** (4 vCPU, 32 GiB): 1,079 × 730 = **787,67**. Phương án rẻ hơn một nấc (r6g.large 16 GiB, 0,540/giờ = 394,20) bị loại vì chỉ mục không nằm gọn trong RAM. Lên r7g.xlarge (1,148/giờ) chỉ hơn ~50 USD, có thể chọn nếu muốn.
- Lưu trữ gp3 Multi-AZ 300 GB × 0,276 = **82,80**. Staging: db.t4g.medium Single-AZ + 50 GB = 81,36.
- Multi-AZ kiểu instance (1 standby): không có điểm lỗi đơn, failover thường 1–2 phút. Tải đọc/ghi rất thấp (~4 req/s), không cần replica đọc.
- Ba điểm cần xác nhận: bản PostgreSQL trên RDS có pgvector ≥0.8; dung lượng backup vượt phần đi kèm (0,095 USD/GB-tháng, thuộc `backup_dr` của Tú); chỉ mục 9 GB build bao lâu.

## 3. Token connector OAuth (H2)

2.000 user × 6 connector = 12.000 token; 1,76 triệu lệnh gọi/tháng (1,1M × 1,6).

| | Secrets Manager mỗi token | Mã hóa phong bì KMS, lưu trong RDS |
|---|---|---|
| Đơn giá | 0,40 USD/secret-tháng; 0,05 USD/10.000 API call | 1 USD/khóa-tháng; 0,03 USD/10.000 request KMS |
| Tính | 12.000 × 0,40 = **4.800** + 1,76M/10.000 × 0,05 = 8,80 + KMS giải mã 5,28 | 1 khóa 1,00 + 1,76M/10.000 × 0,03 = **5,28** |
| Tổng | **~4.814/tháng** | **~6,28/tháng** |
| Xoay/thu hồi | có sẵn | tự viết (xoay khóa KMS tự động hàng năm, refresh token xoay ở tầng app) |

Nếu gộp Google (Gmail, Drive, Calendar, Docs), Microsoft (Outlook, OneDrive, SharePoint, Teams), Atlassian (Jira+Confluence), Notion thì chỉ ~4 lần cấp quyền/user: Secrets Manager còn 8.000 × 0,40 = 3.200, vẫn gấp hàng trăm lần.

**Đề xuất:** mã hóa phong bì KMS trong RDS (bảng `connector_tokens`, cột `ciphertext`, `key_id`, `scopes`, `expires_at`; mã hóa bằng AWS Encryption SDK, khóa dữ liệu lưu cache vài phút). Secrets Manager **chỉ cho ~32 secret nền tảng** (client secret OAuth, mật khẩu DB, khóa ký): 15,30 USD. Vẫn đáp ứng H2 "token cất trong vault có mã hóa": khóa chủ không rời KMS, truy cập token bị giới hạn bằng key policy và được ghi log. Chấp nhận việc tự viết phần xoay token (rủi ro: hai tiến trình cùng refresh một token; xử lý bằng khóa dòng `SELECT ... FOR UPDATE`).

## 4. Định danh và phân quyền

### authn
| | Giá | Nhận xét |
|---|---|---|
| **Cognito User Pools Essentials** | 0,015 USD/MAU liên kết SAML/OIDC → 2.000 × 0,015 = **30,00** | Đề xuất. MFA thực thi ở IdP của tập đoàn (Entra ID/Okta/Google) vì user đi qua liên kết |
| Cognito Lite | 0,0055 USD/MAU = 11,00 | Rẻ hơn; chưa xác nhận đủ tính năng cho liên kết + token tùy biến |
| Keycloak trên Fargate | 2 task 1 vCPU/2 GB ≈ 72 + DB dùng chung + công vận hành | Không tính theo MAU nhưng rẻ hơn Cognito chỉ khi >5.000 MAU |

Nguồn bảng giá Cognito: Price List API. Trang chính thức nêu mức liên kết SAML/OIDC 0,015 USD sau 50 MAU đầu (không áp dụng). SMS MFA (nếu dùng) tính riêng qua SNS; tôi **không dùng** SMS.

### authz
- RBAC cho chức năng (admin, user, auditor) trong claim `groups` của token; ABAC (đơn vị, mức phân loại) bằng **Amazon Verified Permissions (Cedar)**: 5 USD/triệu request × ~4,5 triệu = **22,50**. Phương án rẻ hơn: nhúng thư viện Cedar vào gateway, 0 USD (nằm trong compute), mất kiểm toán chính sách tập trung. Chọn Verified Permissions vì chênh chỉ 22,50 USD.
- ACL tài liệu theo quyền gốc: trong RLS của database (mục 2), không qua Verified Permissions.

## 5. Governance (H4, H5)

### Giá
- Bedrock Guardrails (ap-southeast-1): content filter + prompt attack **0,15 USD/1.000 text unit**; denied topics 0,15; PII 0,10; contextual grounding 0,10; word filter **0**; regex thông tin nhạy cảm **0** (Price List API).
- Comprehend DetectPiiEntities: 0,0001 USD/unit 100 ký tự, bậc giảm dần. Quét toàn bộ ~7,7 GB văn bản/tháng ≈ **3.675**; hơn nữa Comprehend chỉ hỗ trợ ít ngôn ngữ (chưa kiểm tiếng Việt).

### Vì sao không áp mọi nơi
11,4 tỷ token vào ≈ 45,6 tỷ ký tự (giả định 4 ký tự/token) = **45,6 triệu text unit**. Content filter trên toàn bộ: 45,6M/1000 × 0,15 = **6.840/tháng**; thêm PII Guardrails 0,10 = **4.560**. Tổng ~11.400 USD, bằng khoảng 3,5 lần cả phần B. Tiếng Việt có thể cần nhiều unit hơn (3 ký tự/token thì +33%).

### Phạm vi đề xuất
| Lớp | Công cụ | Phạm vi | Chi phí |
|---|---|---|---|
| Guardrail đầu vào + prompt attack | Bedrock Guardrails (`ApplyGuardrail`) | tin nhắn người dùng (~3 unit/request × 1,1M = 3,3M) **và** nội dung connector chưa tin cậy ngay trước hành động ghi (15% request × 12 unit = 1,98M) | 5,28M/1000 × 0,15 = **792,00** |
| Guardrail đầu ra | Guardrails word filter + regex (0 USD) | mọi đầu ra cuối | 0 |
| DLP/PII (tên, số CCCD, điện thoại, MST, email) | Presidio + recognizer regex tiếng Việt, Fargate 2 task | đầu vào, đầu ra, log trước khi lưu | **71,96** (+ staging 10,84) |
| Chống prompt injection ở thiết kế | tách nội dung không tin cậy khỏi chỉ dẫn (đánh dấu rõ), agent đọc-không-ghi khi ngữ cảnh có nội dung ngoài, **xác nhận của người dùng trước khi gửi email/tạo ticket/xóa file**, sandbox không egress | toàn hệ thống | 0 |
| Audit log 12 tháng | S3 Object Lock (compliance) + SSE-KMS | 22 GB/tháng × 12 = 264 GB × 0,025 | **6,60** |
| Eval gate | bộ test trong CI chạy trước khi đổi model/prompt | thuộc phần Tài (chi phí LLM) | không tính ở đây |

Tổng `governance` = **881,40**.

### Cảnh báo đã tra
- Theo tài liệu AWS, **tiếng Việt chỉ được hỗ trợ ở tầng Standard của content filter/prompt attack**, và tầng Standard **bắt buộc cross-Region inference**. Cần xác nhận khu vực định tuyến có ra ngoài Singapore không (ảnh hưởng H1) và giá tầng Standard (bảng giá tôi đọc chỉ có một mức 0,15). **Chưa kiểm.**
- Presidio yếu với tiếng Việt (NER); phải dựa nhiều vào regex, cần đo tỉ lệ bỏ sót trên mẫu thật. Không có dịch vụ nào của AWS tôi đã kiểm cho tiếng Việt; Macie (quét S3) không tra vì giá quét theo GB, dự kiến đắt.
- Không tính CloudTrail, CloudWatch Logs (thuộc `monitoring` của Tú).

## 6. Connectors: gọi trực tiếp hay đồng bộ trước

| | Gọi API trực tiếp | Đồng bộ trước vào index |
|---|---|---|
| Độ tươi | tức thời | trễ phút (webhook/delta) đến giờ (polling) |
| Chi phí | không tính phí API SaaS; nhưng tăng token + độ trễ mỗi request | worker Fargate 35,98 + embedding cho ~500.000 tài liệu (phần Tài) + lưu trữ DB |
| Rate limit | rủi ro cao khi 4,2 req/s × 1,6 lệnh gọi, nhân với nhiều agent cùng user | chỉ chịu tải đồng bộ, gom batch |
| Quyền | luôn đúng quyền hiện tại | phải đồng bộ ACL, trễ khi thu hồi quyền |
| Phù hợp | email, lịch, thao tác ghi, dữ liệu cá nhân thay đổi liên tục | Drive/SharePoint/Confluence/Notion/Jira dùng để tìm kiếm (cấp 1, 4) |

**Đề xuất lai:** đồng bộ trước cho tài liệu tìm kiếm (Google Drive changes API, Microsoft Graph delta, webhook Notion/Jira/Confluence), gọi trực tiếp cho email/lịch/mọi hành động ghi và khi cần dữ liệu tươi. Chi phí `connectors` = 41,40 (prod + staging); NAT tới SaaS thuộc `network` của Tú, ước ~88 GB tương tác + vài chục GB đồng bộ/tháng.

Giới hạn tốc độ từng SaaS (Google Workspace, M365 Graph, Notion ~3 request/giây mỗi token, Jira/Confluence theo điểm) là số tôi nhớ, **chưa tra tài liệu chính thức**; cần xác minh trước khi nói với hội đồng.

## 7. Bảng tổng hợp (khớp `docs/baogia-B.tsv`)
| Component | USD/tháng |
|---|---|
| database | 951,83 |
| vector_db | 0 (nằm trong database) |
| object_storage | 129,25 |
| cache_queue | 88,09 |
| sandbox | 689,51 |
| connectors | 41,40 |
| authn | 30,45 |
| authz | 22,50 |
| secrets_kms | 37,70 |
| governance | 881,40 |
| **Tổng phần B** | **2.872,13** (1,44 USD/DAU) |

Staging đã gồm: database, cache, sandbox, connectors, authn, governance, KMS/Secrets. Chưa gồm: NAT, VPC endpoint (Tú); embedding (Tài).

## 8. Đòn bẩy tiết kiệm (chưa đưa vào số trên)
- Bỏ tenant isolation (−129,80) nếu chấp nhận môi trường dùng chung giữa user: **không khuyến nghị**, phá H3.
- Giảm RAM sandbox 3 → 2 GB (−~173 nếu thời gian không tăng; cần đo).
- Guardrails: chỉ quét nội dung trước hành động ghi của cấp 4 (giảm ~30–40% dòng 792).
- S3 Intelligent-Tiering cho workspace (giá lưu bậc ít truy cập 0,0138 vs 0,025); cần số liệu mức độ lạnh.
- Gộp token Google/Microsoft/Atlassian thành 4 lần cấp quyền/user (đã dùng cách rẻ nhất, không còn tiết kiệm).

## 9. Đối chiếu ràng buộc cứng
| | Đáp ứng bằng | Điểm chưa chắc |
|---|---|---|
| H2 | Cognito SAML/OIDC + MFA ở IdP; Verified Permissions; OAuth ủy nhiệm; token mã hóa KMS | "vault" là KMS+RDS, không phải Secrets Manager; hội đồng có thể hỏi |
| H3 | S3 prefix+STS+presigned; RLS; Lambda microVM tenant isolation; không egress; giới hạn tài nguyên | "hủy sau khi chạy" chưa theo nghĩa đen; recall pgvector có RLS chưa đo |
| H4 | Guardrails đầu vào/đầu ra, xác nhận trước hành động ghi, tách nội dung không tin cậy | tiếng Việt Standard tier + cross-region; eval gate thuộc Tài |
| H5 | SSE-KMS, TLS, Presidio, audit 12 tháng Object Lock, phân loại bằng nhãn trong DB | Presidio tiếng Việt chưa đo; thời hạn lưu cần chính sách |
| H6 | Lambda khởi động nhanh; DB nhỏ | p95 truy vấn pgvector chưa đo |
| H7 (phần tôi) | RDS Multi-AZ, ElastiCache replica, Lambda đa AZ | diễn tập failover chưa làm; backup/DR thuộc Tú |

## 10. Việc chưa làm / người dùng cần làm tay
1. Chụp ảnh trang giá `aws.amazon.com/.../pricing/` (hoặc bản Pricing Calculator đã lưu) cho từng dịch vụ, thấy tên dịch vụ, SKU, region, đơn giá; gán mã E01… vào cột Bằng chứng.
2. Xác nhận giá Guardrails tầng Standard và hành vi cross-Region trong console Bedrock; kiểm giới hạn tốc độ SaaS.
3. Đo thử pgvector với RLS (recall, p95) và Presidio với dữ liệu tiếng Việt.

TRẠNG THÁI: XONG

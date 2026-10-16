# Phần B: Dữ liệu, sandbox, bảo mật (Long)

Đối tượng: `database`, `vector_db`, `object_storage`, `cache_queue`, `sandbox`, `connectors`, `authn`, `authz`, `secrets_kms`, `governance`. Ràng buộc: H2, H3, H4, H5.
Dòng báo giá: `docs/baogia-B.tsv` (23 dòng, tổng **2.872,13 USD/tháng**, không đổi sau khi rà bằng chứng).

## 0. Nguồn giá và mức chắc chắn
- Region ap-southeast-1 (Singapore). Ngày tra: 2026-10-16.
- Đơn giá Singapore lấy để tính từ **AWS Price List JSON** (`https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/<Dịch vụ>/current/ap-southeast-1/index.json`, bản 2026-10-15T22:01Z, chỉ dòng On-Demand). Đây chỉ là **nguồn phụ để tính**, không phải bằng chứng. Bằng chứng là các trang `aws.amazon.com/...` và `docs.aws.amazon.com/...` kèm mã ảnh **E40-E63** (bảng ở mục 10). Nhiều trang giá của AWS không hiển thị số Singapore khi đọc tự động; những số đó ghi **CHƯA CÓ BẰNG CHỨNG trên trang** cho tới khi người dùng chọn region Singapore và chụp.
- Quy ước nhãn: **[đã đọc]** = tôi đã đọc trang/tài liệu chính thức tại link đó ngày 2026-10-16 và thấy câu/số nêu; **[CHƯA CÓ BẰNG CHỨNG]** = chỉ có từ JSON hoặc từ trí nhớ, chưa thấy trên trang.
- Tất cả ảnh **chưa chụp** (agent không chụp được).
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

Lưu ý: tài liệu Fargate [đã đọc, E50] nói mỗi task có ranh giới cô lập riêng, không dùng chung kernel/CPU/RAM/ENI với task khác. Việc **Fargate không cho chạy gVisor** là suy luận của tôi **[CHƯA CÓ BẰNG CHỨNG]**; gVisor chỉ nên tính trên EKS với node EC2. Giá EKS/EC2 m7g.xlarge (0,204 USD/giờ) và cluster 0,10 USD/giờ chỉ từ JSON **[CHƯA CÓ BẰNG CHỨNG trên trang, E62]**.

### Chọn: **Lambda ARM + tenant isolation mode (PER_TENANT, tenant-id = user_id)**, Fargate task cho lượt >15 phút (dự phòng 200 giờ/tháng = 19,72 USD)
Lý do: rẻ ngang hoặc rẻ hơn hai phương án kia, khởi động nhanh (giữ H6), không phải vận hành node, cô lập mạnh. Tenant isolation mode, theo tài liệu [đã đọc, E47]: môi trường thực thi chỉ phục vụ đúng tenant-id được truyền vào (không dùng chung giữa tenant), chạy trên Firecracker, có ở mọi region thương mại trừ New Zealand (gồm Singapore), phải bật lúc **tạo hàm** (không đổi được sau), mỗi lần gọi phải có `tenant-id`, **role thực thi dùng chung cho mọi tenant**, giới hạn 2.500 môi trường tenant (đang chạy hoặc rảnh) trên mỗi 1.000 concurrency, không dùng được với provisioned concurrency/SnapStart/function URL. Giới hạn hàm [đã đọc, E48]: timeout 900 giây, RAM tối đa 10.240 MB, /tmp tối đa 10.240 MB, concurrency mặc định 1.000; 1.769 MB tương đương 1 vCPU (nên 3 GB ≈ 1,7 vCPU). Giá tenant isolation: trang giá chỉ có ví dụ x86 (0,000167 USD/GB), mức ARM Singapore 0,000133333 lấy từ JSON **[CHƯA CÓ BẰNG CHỨNG]**. Giá cho tenant isolation tôi **tính theo cận trên** (mọi lượt tạo môi trường mới); thực tế thấp hơn khi môi trường của cùng user được tái dùng.

### Kiểm soát cần làm
- **Chặn egress:** Lambda đặt trong VPC, subnet riêng **không có route NAT/IGW**; security group chỉ cho ra prefix list của S3 Gateway Endpoint (endpoint policy chỉ cho đúng bucket workspace). Không có DNS ra ngoài.
- **Metadata endpoint:** tôi cho rằng Lambda không có IMDS (169.254.169.254) và thông tin xác thực của role thực thi nằm trong biến môi trường, runtime API ở 127.0.0.1 **[CHƯA CÓ BẰNG CHỨNG, từ kiến thức nền; cần tìm trang tài liệu để chụp]**. Tài liệu tenant isolation xác nhận chắc một điều liên quan: role thực thi dùng chung mọi tenant [E47], nên role phải không có quyền. Cách xử lý: (1) role thực thi của hàm sandbox **không có quyền gì** (không gắn quyền ghi log, kết quả trả qua payload), (2) code agent chạy trong tiến trình con, user không đặc quyền, biến môi trường đã xóa. Nếu dùng Fargate/EKS: đặt `HttpTokens=required`, hop limit 1 hoặc chặn 169.254.169.254 bằng network policy.
- **Nạp workspace theo user:** dịch vụ điều phối (tin cậy, ngoài sandbox) lấy manifest các file tác vụ cần, gọi `sts:AssumeRole` kèm **session policy** giới hạn `arn:aws:s3:::vbot-ws/users/{user_id}/*` (ListBucket kèm điều kiện `s3:prefix`), rồi ký **presigned URL** GET/PUT cho đúng các file. Sandbox **không cầm thông tin xác thực AWS**, chỉ có URL hết hạn sau ~5 phút. Tài liệu STS [đã đọc, E51]: quyền của phiên là **giao** giữa policy của role và session policy; `DurationSeconds` tối thiểu 900 giây (nên chặn sớm dựa vào presigned URL ngắn hạn); session policy tối đa 2.048 ký tự (đủ cho một prefix, nhưng không nhét danh sách file dài).
- **Giới hạn tài nguyên:** RAM 3 GB, timeout 120 giây (tác vụ dài đi đường Fargate), /tmp 2 GB, reserved concurrency 80 để chặn lạm dụng, quota lượt/user ở gateway. Xóa /tmp và kill tiến trình con sau mỗi lượt.
- **Rủi ro còn lại (nói thật với hội đồng):** Lambda tái dùng môi trường cho cùng user, nên "hủy sau khi chạy" là *xóa sạch + cô lập theo tenant*, chưa phải *hủy microVM*. Muốn đúng nghĩa đen thì chuyển lượt rủi ro cao sang Fargate task mỗi lượt.
- Trang quota của Lambda [đã đọc, E48] có mục **Lambda MicroVMs** (ARM64, tối đa 8 giờ/MicroVM, API RunMicrovm/TerminateMicrovm, quota bộ nhớ mặc định 400 GB ở region không nằm trong danh sách ưu tiên) và JSON có giá riêng (vCPU-giây 0,000039448; GB-giây 0,000005223 ở Singapore). Tôi **chưa đọc được trang giới thiệu/giá của sản phẩm này** nên **không dùng và không so giá** **[CHƯA CÓ BẰNG CHỨNG: có ở Singapore không, bản chất cô lập, cách tính tiền]**. Đây có thể là phương án sát "hủy sau khi chạy" hơn; cần xem trước khi bảo vệ.

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
- Tài liệu [đã đọc, E41]: lớp db.r6g hỗ trợ RDS PostgreSQL 13 đến 17 (Graviton2). Release notes [đã đọc, E42]: pgvector 0.8.0 từ 15.11/17.4, 0.8.1 và 0.8.2 ở các minor mới hơn, nên chọn PostgreSQL 16 hoặc 17 bản mới. Việc `halfvec` và `hnsw.iterative_scan` có trong 0.8.x là kiến thức nền **[CHƯA CÓ BẰNG CHỨNG, cần mở tài liệu pgvector]**; mức RAM của chỉ mục (~9 GB) và failover 1-2 phút là ước tính của tôi **[CHƯA CÓ BẰNG CHỨNG]**.
- Ba điểm cần xác nhận: bản PostgreSQL trên RDS có pgvector ≥0.8 (đã thấy ở E42); dung lượng backup vượt phần đi kèm (0,095 USD/GB-tháng, thuộc `backup_dr` của Tú); chỉ mục 9 GB build bao lâu.

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

Trang giá Cognito [đã đọc, E52]: Essentials 0,015 USD/MAU, Lite 0,0055 (bậc đầu), Plus 0,02; người dùng liên kết SAML/OIDC 0,015 USD/MAU ở mọi tầng. Trang có nêu bậc miễn phí; **tôi không trừ**. Trang không hiển thị Singapore; mức Singapore lấy từ JSON **[CHƯA CÓ BẰNG CHỨNG cho Singapore]**. Các khẳng định "MFA do IdP thực thi", "Lite đủ tính năng liên kết" và chi phí Keycloak là của tôi **[CHƯA CÓ BẰNG CHỨNG]**. SMS MFA (nếu dùng) tính riêng qua SNS; tôi **không dùng** SMS.

### authz
- RBAC cho chức năng (admin, user, auditor) trong claim `groups` của token; ABAC (đơn vị, mức phân loại) bằng **Amazon Verified Permissions (Cedar)**: 5 USD/triệu request ("same pricing for all Regions" [đã đọc, E53]; endpoint ap-southeast-1 có [đã đọc, E54]) × ~4,5 triệu = **22,50**. Hạn mức mặc định 200 IsAuthorized/giây/policy store đủ cho ~4,2 req/s × 4. Phương án rẻ hơn: nhúng thư viện Cedar vào gateway, 0 USD (nằm trong compute), mất kiểm toán chính sách tập trung. Chọn Verified Permissions vì chênh chỉ 22,50 USD.
- ACL tài liệu theo quyền gốc: trong RLS của database (mục 2), không qua Verified Permissions.

## 5. Governance (H4, H5)

### Giá
- Bedrock Guardrails [đã đọc, E57]: content filter 0,15 USD/1.000 text unit; denied topics 0,15; thông tin nhạy cảm (PII) 0,10; contextual grounding 0,10; word filter và regex **miễn phí** (trang ghi "Free"); 1 text unit tối đa 1.000 ký tự; **giá tầng Standard và Classic như nhau**. Trang không hiển thị Singapore; số Singapore (0,15 / 0,10) lấy từ JSON **[CHƯA CÓ BẰNG CHỨNG cho Singapore]**.
- Comprehend DetectPiiEntities: 0,0001 USD/unit 100 ký tự, bậc giảm dần (chỉ JSON, E61 **[CHƯA CÓ BẰNG CHỨNG trên trang]**). Quét ~7,7 GB văn bản/tháng ≈ **3.675**. Việc Comprehend chỉ hỗ trợ ít ngôn ngữ là kiến thức nền **[CHƯA CÓ BẰNG CHỨNG]**.

### Vì sao không áp mọi nơi
11,4 tỷ token vào ≈ 45,6 tỷ ký tự (giả định 4 ký tự/token) = **45,6 triệu text unit**. Content filter trên toàn bộ: 45,6M/1000 × 0,15 = **6.840/tháng**; thêm PII Guardrails 0,10 = **4.560**. Tổng ~11.400 USD, bằng khoảng 3,5 lần cả phần B. Tiếng Việt có thể cần nhiều unit hơn (3 ký tự/token thì +33%).

### Phạm vi đề xuất
| Lớp | Công cụ | Phạm vi | Chi phí |
|---|---|---|---|
| Guardrail đầu vào + prompt attack | Bedrock Guardrails (`ApplyGuardrail`) | tin nhắn người dùng (~3 unit/request × 1,1M = 3,3M) **và** nội dung connector chưa tin cậy ngay trước hành động ghi (15% request × 12 unit = 1,98M) | 5,28M/1000 × 0,15 = **792,00** |
| Guardrail đầu ra | Guardrails **regex** thông tin nhạy cảm (0 USD). Word filter không dùng vì chỉ hỗ trợ EN/FR/ES [E60] | mọi đầu ra cuối | 0 |
| DLP/PII (tên, số CCCD, điện thoại, MST, email) | Presidio + recognizer regex tiếng Việt, Fargate 2 task | đầu vào, đầu ra, log trước khi lưu | **71,96** (+ staging 10,84) |
| Chống prompt injection ở thiết kế | tách nội dung không tin cậy khỏi chỉ dẫn (đánh dấu rõ), agent đọc-không-ghi khi ngữ cảnh có nội dung ngoài, **xác nhận của người dùng trước khi gửi email/tạo ticket/xóa file**, sandbox không egress | toàn hệ thống | 0 |
| Audit log 12 tháng | S3 Object Lock (compliance) + SSE-KMS | 22 GB/tháng × 12 = 264 GB × 0,025 | **6,60** |
| Eval gate | bộ test trong CI chạy trước khi đổi model/prompt | thuộc phần Tài (chi phí LLM) | không tính ở đây |

Tổng `governance` = **881,40**.

### Cảnh báo đã tra (đã đọc tài liệu chính thức)
- Tiếng Việt: content filter và prompt attack **chỉ ở tầng Standard** và được xếp "Optimized and supported" [E60]; tầng Classic chỉ EN/FR/ES [E58, E60]. Bộ lọc thông tin nhạy cảm cũng hỗ trợ tiếng Việt [E60]. **Word filter không hỗ trợ tiếng Việt** [E60] (đã bỏ khỏi thiết kế).
- Tầng Standard **dùng cross-Region inference**; tầng Standard có ở Singapore [E58]. Dữ liệu "có thể rời khỏi region chính nhưng nằm trong cùng geography", không phụ phí [E59]. Region đích cụ thể và geography của Singapore **không thấy trên trang → [CHƯA CÓ BẰNG CHỨNG]**; phải làm rõ để nói với hội đồng về H1.
- Presidio (mã nguồn mở, E63) yếu với tiếng Việt (NER) và thông lượng ~50 KB/giây/vCPU là giả định của tôi **[CHƯA CÓ BẰNG CHỨNG: tôi chưa đọc trang Presidio]**; phải dựa nhiều vào regex, cần đo tỉ lệ bỏ sót trên mẫu thật. Macie (quét S3) không tra giá, dự kiến đắt (**[CHƯA CÓ BẰNG CHỨNG]**).
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

## 10. Bằng chứng giá phần B (mã E40-E63)

Ngày tra: 2026-10-16. Mọi ảnh: **chưa chụp** (đường dẫn dự kiến `evidence/E40.png`...). Cần ghép vào `evidence/INDEX.md` (tôi không được sửa file đó) và sheet `BangChung`. Region mặc định ap-southeast-1; ghi "[đã đọc]" nếu tôi đã đọc trang và thấy câu/số cần chụp.

| Mã | Link (người đọc mở được) | Cần chụp để thấy | Trạng thái |
|---|---|---|---|
| E40 | https://aws.amazon.com/rds/postgresql/pricing/ | Singapore, PostgreSQL, Multi-AZ, db.r6g.xlarge 1,079 USD/giờ; gp3 Multi-AZ 0,276 USD/GB-tháng; db.t4g.medium Single-AZ 0,102; gp3 Single-AZ 0,138 | ảnh chưa chụp; số Singapore chỉ từ JSON, trang có phần động: CHƯA CÓ BẰNG CHỨNG trên trang |
| E41 | https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.DBInstanceClass.Support.html | Mục "db.r6g" hàng PostgreSQL ghi "All PostgreSQL 17, 16, 15, 14, and 13 versions" | [đã đọc]; chưa chụp |
| E42 | https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-extensions.html | Hàng `pgvector`, cột PostgreSQL 16/17 có 0.8.x | [đã đọc, đối chiếu cột khó]; chưa chụp |
| E43 | https://aws.amazon.com/s3/pricing/ | Singapore, S3 Standard 0,025 USD/GB-tháng (50 TB đầu); PUT/LIST 0,005 USD/1.000; GET 0,0004 USD/1.000; Object Lock nếu có | chưa chụp; CHƯA CÓ BẰNG CHỨNG trên trang cho số Singapore (chỉ JSON) |
| E44 | https://aws.amazon.com/elasticache/pricing/ | Singapore, Valkey, cache.t4g.small 0,0384 USD/giờ | CHƯA CÓ BẰNG CHỨNG trên trang (đọc tự động không thấy bảng node); chỉ JSON; chưa chụp |
| E45 | https://aws.amazon.com/sqs/pricing/ | Singapore, Standard 0,40 USD/triệu request | chưa chụp; chỉ JSON, CHƯA CÓ BẰNG CHỨNG trên trang |
| E46 | https://aws.amazon.com/lambda/pricing/ | Singapore, Arm: 0,0000133334 USD/GB-giây; 0,20 USD/triệu request; ephemeral; mục "Tenant isolation" 0,000133333 USD/GB (ARM) | ảnh chưa chụp; trang đọc được chỉ có ví dụ x86 (0,000167): CHƯA CÓ BẰNG CHỨNG cho ARM Singapore |
| E47 | https://docs.aws.amazon.com/lambda/latest/dg/tenant-isolation.html | Mục "Supported AWS Regions" (trừ New Zealand), "Considerations" (role dùng chung, 2.500 môi trường/1.000 concurrency), bảng "Isolation mode" | [đã đọc]; chưa chụp |
| E48 | https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html | Timeout 900 giây, RAM 10.240 MB, /tmp 10.240 MB, concurrency 1.000; mục Lambda MicroVMs | [đã đọc]; chưa chụp |
| E49 | https://aws.amazon.com/fargate/pricing/ | Singapore, Linux/ARM: vCPU 0,04045, GB 0,00442 USD/giờ | chưa chụp; chỉ JSON; trùng nội dung E01 của Tú, có thể dùng chung ảnh |
| E50 | https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html | Câu "Each Fargate task has its own isolation boundary..." | [đã đọc]; chưa chụp |
| E51 | https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html | `DurationSeconds` min 900; câu "intersection" của session policy; giới hạn 2.048 ký tự | [đã đọc]; chưa chụp |
| E52 | https://aws.amazon.com/cognito/pricing/ | Essentials 0,015/MAU; dòng người dùng SAML/OIDC 0,015/MAU | [đã đọc] nhưng trang không có Singapore: CHƯA CÓ BẰNG CHỨNG cho Singapore; có thể dùng Pricing Calculator |
| E53 | https://aws.amazon.com/verified-permissions/pricing/ | 0,000005 USD/request, "same pricing for all Regions" | [đã đọc]; chưa chụp |
| E54 | https://docs.aws.amazon.com/general/latest/gr/verifiedpermissions.html | Hàng Asia Pacific (Singapore) ap-southeast-1; quota IsAuthorized 200/giây | [đã đọc]; chưa chụp |
| E55 | https://aws.amazon.com/kms/pricing/ | 1 USD/khóa-tháng; ví dụ 0,03 USD/10.000 request symmetric | [đã đọc]; trang không theo region; chưa chụp |
| E56 | https://aws.amazon.com/secrets-manager/pricing/ | 0,40 USD/secret-tháng; 0,05 USD/10.000 call | [đã đọc từ ví dụ]; bảng giá không hiển thị khi đọc tự động; chưa chụp |
| E57 | https://aws.amazon.com/bedrock/pricing/ | Mục Guardrails: content filter 0,15; sensitive info 0,10; regex và word filter "Free"; "pricing is the same for both standard tier and classic tier"; "text unit ... 1000 characters" | [đã đọc] nhưng không thấy Singapore: CHƯA CÓ BẰNG CHỨNG cho Singapore |
| E58 | https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-tiers.html | Bảng khác biệt tầng; danh sách region có Asia Pacific (Singapore) | [đã đọc]; chưa chụp |
| E59 | https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-cross-region.html | Đoạn "within your geography", "no additional cost", "might move outside of your primary Region" | [đã đọc]; chưa chụp. Region đích: CHƯA CÓ BẰNG CHỨNG |
| E60 | https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-supported-languages.html | Vietnamese ở bảng Standard (content filters/prompt attacks); Word filters chỉ EN/FR/ES; Sensitive information có Vietnamese | [đã đọc]; chưa chụp |
| E61 | https://aws.amazon.com/comprehend/pricing/ | Singapore, DetectPiiEntities 0,0001 USD/unit | CHƯA CÓ BẰNG CHỨNG trên trang (chỉ JSON); chỉ để so sánh |
| E62 | https://aws.amazon.com/eks/pricing/ ; https://aws.amazon.com/ec2/pricing/on-demand/ | Cluster 0,10 USD/giờ; m7g.xlarge Linux Singapore 0,204 USD/giờ | CHƯA CÓ BẰNG CHỨNG trên trang (chỉ JSON); chỉ để so sánh, không vào báo giá |
| E63 | https://microsoft.github.io/presidio/ | Trang giới thiệu Presidio, ngôn ngữ hỗ trợ | CHƯA CÓ BẰNG CHỨNG: chưa đọc |

Danh sách khẳng định **chưa có link**: không có IMDS ở Lambda; Fargate không chạy gVisor; Lambda MicroVMs (có ở Singapore? giá?); halfvec và iterative scan của pgvector 0.8; failover RDS 1-2 phút; giới hạn tốc độ Google/Microsoft/Notion/Atlassian; Cognito Lite đủ tính năng; Keycloak; Presidio và Comprehend về ngôn ngữ và thông lượng; thông lượng ~4 ký tự/token; mô hình 15% request có hành động ghi.

## 11. Rà lại dịch vụ/SKU/region sau quy tắc 9-11

| Hạng mục | Kết quả | Ảnh hưởng chi phí |
|---|---|---|
| Lambda tenant isolation | Có ở Singapore (tài liệu); giá ARM Singapore chưa thấy trên trang | 0 |
| Verified Permissions | Có endpoint Singapore; giá giống mọi region | 0 |
| Guardrails Standard | Có ở Singapore; giá bằng Classic; nhưng bắt buộc cross-Region | 0 (rủi ro H1) |
| Guardrails word filter đầu ra | **Không hỗ trợ tiếng Việt**; bỏ khỏi thiết kế, dùng regex (cũng 0 USD) | 0 |
| RDS db.r6g.xlarge PostgreSQL, pgvector 0.8.x | Có (tài liệu lớp instance và release notes) | 0 |
| ElastiCache Valkey t4g.small, SQS, S3, KMS, Secrets Manager, Cognito Essentials, Fargate ARM | Có SKU Singapore trong JSON; trang giá chưa hiển thị số Singapore | 0, nhưng ghi CHƯA CÓ BẰNG CHỨNG trên trang |
| Lambda MicroVMs | Sản phẩm có thật (trang quota), chưa đánh giá | chưa tính |

Không có SKU/region nào phải đổi; **tổng `baogia-B.tsv` trước 2.872,13 → sau 2.872,13 USD (chênh 0)**. Khác với phần A (Titan không dùng được ở Singapore), tôi không tìm thấy dịch vụ phần B bị thiếu ở ap-southeast-1.

## 12. Việc chưa làm / người dùng cần làm tay
1. Chụp ảnh E40-E63 theo bảng mục 10 (chọn Singapore trên trang giá hoặc dùng Pricing Calculator đã lưu cho các dòng "CHƯA CÓ BẰNG CHỨNG trên trang"), lưu `evidence/E40.png`...
2. Đưa E40-E63 vào `evidence/INDEX.md` và sheet `BangChung` (tôi không sửa các file này).
3. Làm rõ cross-Region của Guardrails Standard (region đích) và xem trang sản phẩm Lambda MicroVMs.
4. Đo thử pgvector với RLS (recall, p95) và Presidio với dữ liệu tiếng Việt thật.

TRẠNG THÁI: XONG

# Nghiên cứu kiến trúc VBot (bản nháp 1)

Nguồn số liệu tải: `docs/uoc-luong-tai.xlsx` (giả định của nhóm, sửa ở sheet `GiaDinh`).
**Mọi giá USD trong file này là tham khảo, chưa phải bằng chứng.** Trước khi đưa vào báo giá phải tra lại trên trang giá AWS / Pricing Calculator và chụp ảnh (tên dịch vụ, SKU, region, đơn giá).

## 1. Kết luận từ bảng ước lượng tải

| Chỉ số | Giá trị (baseline) |
|---|---|
| Request mỗi tháng | 1,1 triệu (2.000 × 25 × 22) |
| Giờ cao điểm | ~2,1 req/s, burst ~4,2 req/s, 600 phiên đồng thời |
| Token mỗi tháng | ~11,4 tỷ vào, ~1,6 tỷ ra |
| Token/giây khi burst | ~43.000 vào, ~6.200 ra |
| Sandbox | ~324.000 lượt, ~2.800 giờ, ~38 lượt chạy cùng lúc khi burst |
| Tiền LLM theo giá tham khảo | ~$40.800/tháng (~$20,4 mỗi DAU) |

**Điều quan trọng nhất:** LLM là dòng tiền áp đảo. Hạ tầng khác (compute, DB, LB, NAT…) cộng lại nhiều khả năng nhỏ hơn LLM. Cuộc thi thắng ở chỗ giảm tiền token mà vẫn giữ 95% chất lượng (H8). Trong baseline, cấp 4 (agent) chiếm ~51% tiền LLM, cấp 2 chiếm ~22%.

## 2. Quyết định kiến trúc đề xuất

### LLM: API qua Amazon Bedrock, không tự host GPU
- Lý do: tải chỉ dồn 10 giờ/ngày; GPU HA cần tối thiểu 2 máy chạy cả ngày lẫn đêm nếu không tự scale; API trả theo token.
- Bedrock cho private endpoint (VPC) và cam kết không dùng dữ liệu khách để huấn luyện, đáp ứng H1 và H5. **Cần xác nhận trên tài liệu chính thức của AWS và chụp lại làm bằng chứng.**
- Bảng hòa vốn cần có cho hội đồng: số token/tháng nào thì GPU tự host rẻ hơn API. Cần giá GPU (ví dụ g5/g6/p4/p5 ở ap-southeast-1) và thông lượng đo được của một model mở. Việc này giao cho Tài.

### Routing theo cấp tác vụ (đòn bẩy lớn nhất)
Tính từ bảng ước lượng, giá tham khảo:

| Đòn bẩy | Tiết kiệm ước tính/tháng | Rủi ro |
|---|---|---|
| Cache hit input 50% → 80% | ~$8.600 | Phải chứng minh được tỉ lệ hit (system prompt, context cố định) |
| Cấp 2 chuyển từ model medium sang small | ~$5.850 | Chất lượng viết tài liệu có thể giảm dưới 95% |
| Cấp 4: một nửa bước agent chuyển sang small | ~$6.900 | Agent hỏng nhiều bước hơn |
| Giảm token vào của cấp 4 (tóm tắt trạng thái thay vì gửi lại cả lịch sử) | chưa tính | Cần thiết kế agent cẩn thận |

Các con số trên cộng không chính xác (chúng chồng lên nhau). Hãy sửa trực tiếp `GiaDinh` rồi đọc lại tổng ở `TinhToan`. **Mỗi đòn bẩy phải đi kèm cách đo chất lượng** (bộ 50-100 câu mỗi cấp, so với model tham chiếu nhóm nêu tên), nếu không H8 không đạt.

### Sandbox: hai phương án, cần so sánh trong slide
| | AWS Lambda (Firecracker) | Fargate/EKS node pool + gVisor |
|---|---|---|
| Giá | Trả theo lượt, ~324.000 lượt/tháng nên nhỏ | Trả theo giờ chạy, cần node luôn sẵn sàng |
| Cô lập | microVM, mạnh | Container + gVisor, mạnh vừa |
| Giới hạn | 15 phút/lượt, file tạm giới hạn, cần nạp workspace mỗi lượt | Linh hoạt hơn, chạy lâu hơn |
| Egress | Đặt trong VPC không NAT để chặn internet | Dùng network policy |
Gợi ý: Lambda làm mặc định (rẻ, tự dọn). Cấp 4 chạy nền >15 phút thì chuyển sang Fargate task. **Cần kiểm tra:** cách chặn gọi metadata endpoint và cách nạp workspace theo user (xem mục cô lập).

### Cô lập theo từng người dùng (H3)
- **File:** S3 một bucket, mỗi user một prefix. Sandbox nhận quyền qua STS session policy giới hạn đúng prefix của user, hết hạn sau lượt chạy.
- **Tìm kiếm:** RDS PostgreSQL + pgvector, row-level security theo user_id và nhóm ACL. Lọc quyền ở truy vấn, không lọc sau khi lấy kết quả.
- **Bộ nhớ dài hạn và lịch sử chat:** cột user_id bắt buộc, RLS cùng cơ chế.

### Dữ liệu
- `database` và `vector_db` cùng dùng RDS PostgreSQL Multi-AZ (pgvector). Với ~4 triệu vector 1024 chiều (~16 GB) thì một instance vừa là đủ. Trong báo giá, dòng `vector_db` ghi 0 và nói rõ "nằm trong" database (vẫn cần bằng chứng).
- `cache_queue`: ElastiCache (Valkey) nhỏ cho cache phiên, SQS cho hàng đợi agent.
- `object_storage`: S3, lifecycle chuyển file cũ sang lớp rẻ hơn. Workspace thực tế ước ~3,9 TB, tối đa ~19,5 TB nếu mọi người đầy quota 10 GB (phải chọn một con số và giải thích).

### Định danh, quyền, token connector
- `authn`: Cognito làm cầu nối SAML/OIDC tới IdP của tập đoàn, MFA ở IdP hoặc Cognito. Cognito tính theo MAU liên kết, ~2.000 MAU nên nhỏ (cần xác nhận mức giá trên trang chính thức).
- `authz`: RBAC trong ứng dụng hoặc Cedar/Verified Permissions; ACL tài liệu theo quyền gốc của nguồn.
- **Cạm bẫy chi phí:** nếu mỗi user × mỗi connector lưu một secret trong AWS Secrets Manager (2.000 user × ~6 connector ≈ 12.000 secret), tiền secret tính theo từng secret mỗi tháng có thể lên hàng nghìn USD. Cân nhắc lưu OAuth token đã mã hóa phong bì bằng KMS trong RDS, chỉ để khóa mã hóa trong KMS. **Cần tra giá Secrets Manager và KMS, rồi so hai cách.**

### Mạng
- Connector phải gọi ra internet (Google, Microsoft, Atlassian, Notion) nên cần NAT. NAT Gateway tính theo giờ cộng theo GB; mỗi AZ một cái cho HA. Lưu lượng connector ước ~88 GB/tháng nên phần theo GB nhỏ, phần theo giờ là phần cố định.
- Bedrock, S3, và các dịch vụ AWS khác đi qua VPC endpoint để không tốn NAT.
- WAF trước ALB. Sandbox: subnet không có route ra NAT.

### Guardrail và governance: coi chừng giá theo đơn vị văn bản
Bedrock Guardrails tính theo số đơn vị văn bản. Với 11,4 tỷ token vào mỗi tháng, nếu áp guardrail cho mọi bước agent thì chi phí có thể lớn. Phương án: chỉ áp ở input người dùng và output cuối; chống prompt injection ở tầng thiết kế (tách nội dung không tin cậy, xác nhận trước hành động ghi); DLP/PII bằng công cụ mã nguồn mở (ví dụ Presidio) chạy trên Fargate nếu rẻ hơn. **Cần tra giá và tính cụ thể.**

### HA, backup, DR (H7)
- ALB đa AZ, Fargate tối thiểu 2 task ở 2 AZ, RDS Multi-AZ, ElastiCache có replica.
- RPO 1 giờ: bật sao chép bản sao lưu tự động của RDS sang region khác (point-in-time), rẻ hơn read replica xuyên region. **Cần kiểm tra RDS PostgreSQL hỗ trợ và giá.**
- RTO 4 giờ: runbook dựng lại bằng Terraform ở region dự phòng, diễn tập mỗi quý.
- Staging: scale về 0 ngoài giờ, dùng chung với prod những gì có thể (ghi rõ trong báo giá).

### Vận hành (`ops_labor`)
Nhiều khả năng là dòng lớn thứ hai hoặc thứ ba. Phải nêu số FTE và lý do (ví dụ 0,5–1 FTE SRE/MLOps kèm ca trực). Đừng đặt 0.

## 3. Danh sách việc cần tra giá (để chụp bằng chứng)
Mỗi dòng tra ở ap-southeast-1 (Singapore) trừ khi ghi khác.
1. Bedrock: input/output token của từng model dự kiến; giá cache read/write; giá Guardrails; nhà cung cấp model có qua Bedrock ở Singapore hay phải dùng cross-region (và giá cross-region).
2. Embedding model trên Bedrock (hoặc Titan/Cohere) và rerank.
3. Fargate (vCPU giờ, GB giờ, Graviton/ARM), Lambda (request và GB-giây), EKS nếu dùng.
4. RDS PostgreSQL Multi-AZ (cấu hình chọn), lưu trữ, backup, sao chép xuyên region.
5. ElastiCache, SQS, S3 (lưu trữ, request), CloudWatch Logs (nhập và lưu), NAT Gateway, ALB, WAF, VPC endpoint.
6. Cognito (MAU liên kết SAML), KMS, Secrets Manager.
7. Gói support của AWS nếu dùng; GitHub Actions/ECR.
8. Giá sinh ảnh cho cấp 5 (dịch vụ và giá mỗi ảnh).

## 4. Câu hỏi hội đồng có thể hỏi (đã gắn vào kiến trúc)
- DAU gấp đôi: phần nào tăng tuyến tính (token, sandbox, log) và phần nào cố định (ALB, NAT, DB nhỏ)? Xem sheet `TinhToan`, đổi DAU lên 4.000.
- Giá token +30% hoặc −50%: hòa vốn API và tự host nằm ở đâu?
- Một AZ mất: Fargate, ALB, RDS, ElastiCache lần lượt xử lý thế nào, mất bao lâu?
- Email chứa lệnh ẩn: guardrail, xác nhận trước hành động ghi, sandbox không egress.
- Sandbox thoát ra ngoài hoặc gọi metadata: microVM, chặn metadata, quyền IAM tối thiểu.

## 5. Điểm chưa chắc (cần nhóm xác minh, không coi là sự thật)
- Giá model trong bảng ước lượng lấy từ tìm kiếm web bên thứ ba và tài liệu giá Anthropic; giá Bedrock tại Singapore có thể khác (thường có phụ phí cross-region).
- Model nào có mặt trên Bedrock tại ap-southeast-1 vào thời điểm làm bài.
- Giá RDS, NAT, ALB, Fargate ở Singapore lấy từ trang tổng hợp, chưa từ trang chính thức.
- Các giả định tải (25 request/người/ngày, tỉ lệ 5 cấp, token/request, 50% cache hit) là của tôi, cần nhóm bàn lại vì hội đồng sẽ so với nhóm khác.

# Brief: agent `long` (đại diện Lò Văn Long) — Phần B: Dữ liệu, sandbox, bảo mật
Đầu ra: `docs/phan-B-du-lieu-bao-mat.md`.
Việc:
1. Sandbox (H3): so sánh AWS Lambda (Firecracker) và Fargate/EKS + gVisor cho ~324.000 lượt/tháng, ~2.800 giờ, ~38 đồng thời lúc burst. Tra giá chính thức, tính chi phí, nêu cách chặn egress, chặn metadata endpoint, nạp workspace theo user (STS session policy theo prefix S3), giới hạn tài nguyên. Chọn một phương án và nêu lý do.
2. Cô lập dữ liệu: S3 prefix + STS, RDS PostgreSQL + pgvector + row-level security theo user/ACL. Viết cách chứng minh "agent của A không đọc được file của B". Chọn cấu hình RDS Multi-AZ phù hợp ~4 triệu vector 1024 chiều (~16 GB) và nêu giá.
3. Token connector OAuth (H2): so sánh AWS Secrets Manager (mỗi user × mỗi connector) với mã hóa phong bì KMS lưu trong RDS. Tra giá Secrets Manager và KMS, tính cả hai cách với 2.000 user × ~6 connector, đề xuất.
4. Định danh và phân quyền: Cognito (SAML/OIDC liên kết, MFA) và lựa chọn khác; giá theo MAU; RBAC/ABAC (Verified Permissions/Cedar hay trong ứng dụng).
5. Governance (H4, H5): guardrail, chống prompt injection, DLP/PII, audit log 12 tháng. Tra giá Bedrock Guardrails và phương án mã nguồn mở (Presidio...) chạy trên Fargate, tính chi phí với ~11,4 tỷ token vào/tháng, đề xuất phạm vi áp dụng để không đội giá.
6. Connectors: gọi API trực tiếp hay đồng bộ trước vào index; đánh đổi chi phí/độ tươi/rate limit cho Google Workspace, M365, Notion, Jira, Confluence.
7. Danh sách dòng báo giá cho `database`, `vector_db`, `object_storage`, `cache_queue`, `sandbox`, `connectors`, `authn`, `authz`, `secrets_kms`, `governance` theo đúng 5 cột, lưu ở `docs/baogia-B.tsv` (phân tách tab, có dòng tiêu đề). Dòng chi phí 0 phải ghi rõ "nằm trong" dịch vụ nào.

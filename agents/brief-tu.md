# Brief: agent `tu` (đại diện Đinh Công Tú) — Phần C: Hạ tầng, HA, vận hành
Đầu ra: `docs/phan-C-ha-van-hanh.md`, `evidence/INDEX.md`.
Việc:
1. Tra giá chính thức ở ap-southeast-1 và tính chi phí: compute (Fargate Graviton hoặc EKS) cho app + gateway + worker, ALB (2 AZ), NAT Gateway (số cái cho HA), WAF, VPC endpoint (Bedrock, S3...), CloudWatch Logs (nhập + lưu ~22 GB/tháng, audit 12 tháng ~264 GB), monitoring/LLM observability (Langfuse tự host hay dịch vụ khác), CI/CD (GitHub Actions, ECR, Terraform), AWS Support, staging (scale về 0 ngoài giờ). Quy đổi giờ: 24/7 = 730 giờ, giờ hành chính = 220 giờ.
2. Thiết kế HA/DR (H7): từng thành phần chạy mấy AZ, kịch bản "một AZ mất lúc 10 giờ sáng", RTO 4 giờ, RPO 1 giờ, backup (RDS automated backups xuyên region, S3), lịch diễn tập khôi phục. Tra giá backup và sao chép xuyên region.
3. Độ trễ (H6): ước lượng p95 thời gian tới token đầu < 3 giây ở giờ cao điểm, điểm nghẽn có thể có.
4. Nhân sự vận hành `ops_labor`: số FTE, ca trực, lương tham khảo ở Việt Nam hay quy đổi USD, kèm lý do; `licenses`, `contingency` (tính trên phần nào, bao nhiêu %).
5. Sơ đồ kiến trúc tổng thể bằng Mermaid (mỗi hộp ghi mã component) và luồng một request từ SSO đến model, connector, sandbox, và ngược lại.
6. Danh sách dòng báo giá cho `compute`, `load_balancer`, `network`, `backup_dr`, `monitoring`, `cicd`, `ops_labor`, `licenses`, `contingency` theo đúng 5 cột, lưu ở `docs/baogia-C.tsv` (phân tách tab, có dòng tiêu đề). `ops_labor` và `contingency` ghi bằng chứng `NA`.
7. Tạo `evidence/INDEX.md`: bảng mã bằng chứng E01.. với dịch vụ, SKU, region, URL trang giá, ngày tra, ai cần chụp ảnh. (Agent không chụp được ảnh; liệt kê để người dùng chụp tay.)

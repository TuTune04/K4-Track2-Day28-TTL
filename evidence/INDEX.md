# Sổ bằng chứng giá (E01..)

Người giữ sổ: Tú. Ngày tra giá trong file giá chính thức: **2026-10-16**. Tất cả region ap-southeast-1 trừ khi ghi khác.
**Chưa có ảnh nào.** Cột "Ảnh" để trống; người dùng chụp tay (mở trang giá, chọn region, thấy tên dịch vụ + SKU + đơn giá) rồi lưu `evidence/Exx.png`.
Mức chắc chắn: "file giá" = đã đối chiếu trên file giá chính thức của AWS `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/<Dịch vụ>/current/<region>/index.json` (có thể dán link này làm bằng chứng phụ). "chưa kiểm" = chưa thấy số trên nguồn chính thức.
Phần A và B nên dùng mã bắt đầu từ **E20** (A) và **E40** (B) để khỏi trùng; E15-E19 còn dự phòng.

| Mã | Dịch vụ | SKU / mục giá | Region | URL trang giá | Ngày tra | Mức chắc chắn | Ai chụp | Dòng báo giá |
|---|---|---|---|---|---|---|---|---|
| E01 | AWS Fargate (ARM) | `APS1-Fargate-ARM-vCPU-Hours:perCPU` 0,04045 USD; `APS1-Fargate-ARM-GB-Hours` 0,00442 USD | ap-southeast-1 | https://aws.amazon.com/fargate/pricing/ | 2026-10-16 | file giá (ECS) | Tú (mở tab Fargate, chọn Singapore, Linux/ARM) | 3 dòng compute |
| E02 | Elastic Load Balancing (ALB) | `APS1-LoadBalancerUsage` 0,0252 USD/giờ (SKU UXD3JNG6UAM79CW6); `APS1-LCUUsage` 0,008 USD/LCU-giờ (45KY3J5YX2QM6KS7) | ap-southeast-1 | https://aws.amazon.com/elasticloadbalancing/pricing/ | 2026-10-16 | file giá (AWSELB) | Tú | 2 dòng ALB |
| E03 | AWS WAF | Web ACL 5 USD (`APS1-WebACLV2`); rule 1 USD (`APS1-RuleV2`); request 0,60 USD/triệu (`APS1-RequestV2-Tier1`) | ap-southeast-1 | https://aws.amazon.com/waf/pricing/ | 2026-10-16 | file giá (awswaf). Bậc WCU của request (Tier1) cần xác nhận với bộ rule thực dùng | Tú | WAF |
| E04 | Amazon VPC: NAT Gateway | `APS1-NatGateway-Hours` 0,059 USD/giờ (98TA3WPUP3A4AH4Y); `APS1-NatGateway-Bytes` 0,059 USD/GB (E9U985ZGMWKXKT47) | ap-southeast-1 | https://aws.amazon.com/vpc/pricing/ | 2026-10-16 | file giá (EC2) | Tú (tab NAT Gateway) | 2 dòng NAT |
| E05 | AWS PrivateLink / VPC interface endpoint | `APS1-VpcEndpoint-Hours` 0,013 USD/giờ (ZW3HVQKP8FYZ6Y6K); `APS1-VpcEndpoint-Bytes` 0,01 USD/GB (5APZT8JXA5B8ZYFH) | ap-southeast-1 | https://aws.amazon.com/privatelink/pricing/ | 2026-10-16 | file giá (AmazonVPC) | Tú | 2 dòng endpoint |
| E06 | EC2 Data Transfer | Chéo AZ `APS1-DataTransfer-Regional-Bytes` 0,01 USD/GB mỗi chiều; Singapore→Sydney `APS1-APS2-AWS-Out-Bytes` 0,09 USD/GB; ra internet `APS1-DataTransfer-Out-Bytes` 0,12 USD/GB (10 TB đầu) | ap-southeast-1 | https://aws.amazon.com/ec2/pricing/on-demand/ (mục Data Transfer) | 2026-10-16 | file giá (EC2, AWSDataTransfer) | Tú | chéo AZ, ra internet, chép RDS/S3 xuyên region |
| E07 | Amazon Route 53 | Hosted zone 0,50 USD; 0,40 USD/triệu truy vấn | global | https://aws.amazon.com/route53/pricing/ | 2026-10-16 | file giá (AmazonRoute53) | Tú | Route 53 |
| E08 | Amazon RDS for PostgreSQL | Lưu backup `APS1-RDS:ChargedBackupUsage` 0,095 USD/GB-tháng (9XF3U4K57MG3MUFQ); Sydney `APS2-RDS:ChargedBackupUsage` 0,095 (VYKYXA2YZQU8JQST); db.m7g.large Single-AZ 0,234 USD/giờ (8W5CS8WBUSEKDU63) | ap-southeast-1 và ap-southeast-2 | https://aws.amazon.com/rds/postgresql/pricing/ | 2026-10-16 | file giá (AmazonRDS). Trang web nhiều phần động, có thể phải dùng calculator | Tú (chụp 2 region) | 3 dòng backup_dr |
| E09 | RDS tài liệu: Cross-Region automated backups | Hỗ trợ PostgreSQL Multi-AZ DB instance; Singapore → Sydney có trong bảng cặp region | n/a | https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReplicateBackups.html | 2026-10-16 | đã đọc tài liệu chính thức | Tú (chụp bảng Singapore→Sydney) | RDS xuyên region |
| E10 | Amazon S3 | Sydney Glacier IR `APS2-TimedStorage-GIR-ByteHrs` 0,005 USD/GB-tháng (BQEHYDSWNXGKE3Q); PUT GIR 0,02 USD/1.000 (3DY4FG7Y6XP9CUC8); RTC Singapore→Sydney `APS1-APS2-S3RTC-Out-Bytes` 0,015 USD/GB (MV8M6229V7MSC4ZU) | ap-southeast-2 (và ap-southeast-1) | https://aws.amazon.com/s3/pricing/ | 2026-10-16 | file giá (AmazonS3) | Tú (tab Replication, Storage classes, chọn Sydney) | 4 dòng S3 DR |
| E11 | Amazon ECR | Lưu trữ `APS1-TimedStorage-ByteHrs` 0,10 USD/GB-tháng (7V2YHG7PQ82BEXNB) | ap-southeast-1 | https://aws.amazon.com/ecr/pricing/ | 2026-10-16 | file giá (AmazonECR). Giá Sydney **chưa đối chiếu**, lấy bằng Singapore | Tú | ECR lưu, ECR chép |
| E12 | Amazon CloudWatch | Log nhập `APS1-DataProcessing-Bytes` 0,70 USD/GB (ZEKCE7VGMSM5XZPW); lưu `APS1-TimedStorage-ByteHrs` 0,03 USD/GB-tháng; Logs Insights 0,007 USD/GB (Q6A7EP9HFGQMKFWC); alarm 0,10 USD (ERS2PGV5BX4XH4WQ); custom metric 0,30 USD (2BF5WZ4QVWF9XRRT) | ap-southeast-1 | https://aws.amazon.com/cloudwatch/pricing/ | 2026-10-16 | file giá (AmazonCloudWatch) | Tú (tab Logs, Metrics, Alarms) | 5 dòng monitoring |
| E13 | GitHub Actions | Linux 2-core arm64 0,005 USD/phút | n/a | https://docs.github.com/en/billing/reference/actions-runner-pricing | 2026-10-16 | đã đọc trang chính thức | Tú | GitHub Actions |
| E14 | GitHub Team | 4 USD/người/tháng; trang ghi "for the first 12 months" | n/a | https://github.com/pricing | 2026-10-16 | **chưa chắc**: có thể là giá ưu đãi 12 tháng đầu; nếu vậy phải tra giá niêm yết sau đó | Tú | licenses |
| E15 | AWS Support (chỉ làm căn cứ quyết định không mua) | Business Support+: max(29 USD; 9% tới 10 K, 7% 10-80 K) | n/a | https://aws.amazon.com/premiumsupport/pricing/ | 2026-10-16 | đã đọc trang chính thức | Tú (chụp để giải thích trên slide) | không có dòng |
| E16 | Amazon EKS (chỉ làm căn cứ so sánh với Fargate) | `APS1-AmazonEKS-Hours:perCluster` 0,10 USD/giờ | ap-southeast-1 | https://aws.amazon.com/eks/pricing/ | 2026-10-16 | file giá (AmazonEKS) | Tú (tùy chọn) | không có dòng |

## Việc chụp tay (đề xuất thứ tự)
1. E01-E05 (mạng và tính toán, chiếm phần lớn dòng). 2. E08, E10, E06 (backup và truyền dữ liệu). 3. E12. 4. Còn lại.
Ảnh phải thấy tên dịch vụ, SKU hoặc mô tả dòng giá, region và đơn giá. Dòng `ops_labor` và `contingency` ghi `NA` nên không cần ảnh.
Khi ghép `G??_baogia.xlsx`: sheet `BangChung` cột A = mã Exx (có trong bảng trên), B = mô tả, C = URL, D = ngày chụp, E = ảnh dán vào.

TRẠNG THÁI: XONG

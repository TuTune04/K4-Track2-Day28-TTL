# Quyết định chốt cho 7 câu hỏi mở

Ngày chốt: 2026-10-16. Tổng sau khi áp dụng: **$18.871,95/tháng** (trước: $20.986,76). Cộng từ `docs/baogia-A/B/C.tsv`; file nộp `submit/VBot_baogia.xlsx` qua công cụ kiểm tra của đề (ĐẠT).

| # | Câu hỏi | Quyết định | Lý do |
|---|---|---|---|
| 1 | H1: hồ sơ Bedrock | Giữ **global** | H1 yêu cầu một cloud chính, nêu region và lý do, model gọi qua kênh không lưu dữ liệu; Bedrock vẫn là AWS và không lưu dữ liệu. Geo APAC tốn thêm ~$727/tháng không cần thiết. Rủi ro còn lại: bị hỏi về nơi xử lý. |
| 2 | Ảnh cấp 5 | **1 ảnh nháp**, người dùng xin thêm khi cần, trung bình **1,1 ảnh/request** | Ảnh $4.532 → $2.420 (−$2.112) |
| 3 | S2 hay S3 | **Nộp S3** (cấp 2 Haiku 100%; cấp 3-4 Haiku 70% / Sonnet 30%, leo thang 10%); model tham chiếu H8 là Sonnet 5.5 | H8 yêu cầu nêu tên model tham chiếu và cách đo. Nếu bộ test không đạt ≥95% thì lùi S2: +$5.068/tháng |
| 4 | Nhân sự | Giữ **1,5 FTE** ($5.450) | `ops_labor` là component bắt buộc; cần người giữ cổng eval H4/H8 |
| 5 | Dự phòng | Giữ **5% trên hạ tầng** phần C | Rủi ro token xử lý bằng quota LiteLLM, không bằng tiền dự phòng |
| 6 | Thời hạn lưu dữ liệu | Log ứng dụng 30 ngày; audit 12 tháng (Object Lock); chat 12 tháng rồi xóa; workspace xóa 90 ngày sau khi khóa tài khoản; phân loại 3 mức | Chi tiết ở `docs/phan-B-du-lieu-bao-mat.md` mục 13 |
| 7 | RTO | Chấp nhận **~3 giờ**, không dùng pilot light; đo thật ở lần diễn tập khôi phục đầu tiên | Pilot light quá đắt so với lợi ích |

Những điều **chưa** chốt được vì cần số đo hoặc ảnh: chất lượng Haiku ≥95% (H8), p95 thời gian tới token đầu (H6), toàn bộ ảnh bằng chứng giá (`evidence/INDEX.md`).

# Brief: agent `tai` (đại diện Nguyễn Như Tài) — Phần A: Model và tải
Đầu ra: `docs/phan-A-model-tai.md`.
Việc:
1. Xác minh trên trang chính thức của AWS (Bedrock pricing + model availability): model nào có ở ap-southeast-1 hoặc phải dùng cross-region; giá input/output (và cache read/write nếu có) của Claude Haiku/Sonnet/Opus, DeepSeek, Qwen trên Bedrock; model nhúng (embedding) và rerank; dịch vụ sinh ảnh cho cấp 5 và giá mỗi ảnh.
2. Đề xuất bảng định tuyến model cho 5 cấp tác vụ (cấp 1..5) với model chính, model dự phòng, lý do, rủi ro. Chạy lại ước tính chi phí LLM bằng công thức trong `docs/uoc-luong-tai.xlsx` (đọc file, không sửa) và đưa bảng kết quả theo từng kịch bản.
3. Thiết kế cách đo chất lượng H8: model tham chiếu nhóm nêu tên, bộ test mỗi cấp (số câu, cách chấm, ngưỡng 95%).
4. Bảng hòa vốn API và tự host GPU: tra giá EC2 GPU chính thức, nêu thông lượng cần có (token/s lúc burst từ file ước lượng), kết luận có nên tự host không.
5. Phần gateway: LiteLLM hay lựa chọn khác, chi phí chạy, quota/rate limit/fallback.
6. Danh sách dòng báo giá cho `llm`, `embedding`, `gateway` theo đúng 5 cột (Component, Ý nghĩa, Ghi chú, Chi phí/tháng USD, Bằng chứng), lưu ở `docs/baogia-A.tsv` (phân tách tab, có dòng tiêu đề).

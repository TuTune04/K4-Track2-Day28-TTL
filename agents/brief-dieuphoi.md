# Brief: agent `dieuphoi` (điều phối ở giữa)
Đầu ra: `docs/tong-hop-dieu-phoi.md`. Bạn KHÔNG tự làm nghiên cứu thay các agent; bạn giao việc, theo dõi, kiểm tra chéo và tổng hợp.
Ba agent đang chạy trong cùng workspace Herdr, tên: `tai` (phần A), `long` (phần B), `tu` (phần C). Brief của từng agent: `agents/brief-<tên>.md`; quy tắc chung: `agents/RULES.md`.
Các bước:
1. Chạy `test "$HERDR_ENV" = 1`; nếu sai thì dừng và báo. Chạy `herdr agent list` để xác nhận cả ba agent đang `idle`.
2. Giao việc cho từng agent bằng `herdr agent prompt <tên> "<nội dung>"` (KHÔNG dùng --wait ở lệnh giao việc; chỉ nói: đọc `agents/RULES.md` và `agents/brief-<tên>.md` rồi làm, và báo lại khi xong). Giao cả ba rồi mới bắt đầu chờ.
3. Theo dõi bằng `herdr agent list`, `herdr agent read <tên> --source recent-unwrapped --lines 80`, `herdr agent wait <tên> --timeout 600000`. Nếu agent `blocked` (đang chờ cấp quyền), KHÔNG tự trả lời hộp thoại; ghi tên agent và việc đang chờ vào `docs/tong-hop-dieu-phoi.md`, rồi nhắn người dùng ở cuối báo cáo.
4. Khi cả ba xong: đọc `docs/phan-A-model-tai.md`, `phan-B-du-lieu-bao-mat.md`, `phan-C-ha-van-hanh.md` và ba file `docs/baogia-A/B/C.tsv`. Kiểm tra chéo và ghi vào `docs/tong-hop-dieu-phoi.md`:
   - Đủ 19 component bắt buộc (compute, llm, gateway, load_balancer, authn, authz, database, vector_db, object_storage, cache_queue, sandbox, connectors, secrets_kms, backup_dr, monitoring, governance, network, cicd, ops_labor) trong ba file báo giá, không trùng, không thiếu; có nhắc staging và HA.
   - Giả định tải ba bên dùng có khớp `docs/uoc-luong-tai.xlsx` không; mâu thuẫn giữa các phần (ví dụ region, công nghệ sandbox, nơi lưu token, model nào qua Bedrock); phần nào vi phạm H1-H8.
   - Tổng chi phí tạm tính (cộng ba file TSV) và tỉ trọng từng nhóm; 5 hạng mục lớn nhất; đòn bẩy tiết kiệm đáng thử.
   - Danh sách câu hỏi mở mà chỉ người dùng quyết được, và danh sách ảnh bằng chứng cần chụp tay.
   Nếu thấy mâu thuẫn, nhắn lại agent liên quan bằng `herdr agent prompt` để sửa file của họ (một vòng sửa là đủ).
5. Không ghi đè file của agent khác, không git commit/push/add. Kết thúc: viết `TRẠNG THÁI: XONG` ở cuối file, trả lời ngắn (tối đa 12 dòng) cho người dùng.

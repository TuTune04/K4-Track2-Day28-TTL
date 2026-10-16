# Quy tắc chung cho mọi agent (đọc trước khi làm)

Bối cảnh: nhóm 3 người làm bài VBot Production Capstone (đề: `vbot-capstone.html`, tóm tắt: `PHAN-VIEC.md`).
Số liệu tải: `docs/uoc-luong-tai.xlsx` (giả định của nhóm). Nghiên cứu hiện có: `docs/nghien-cuu-kien-truc.md`.
Hướng hiện tại: AWS, LLM qua Bedrock đa model (Claude cho tác vụ khó, DeepSeek/Qwen mở cho phần còn lại), không tự host GPU.

1. Chỉ sửa/tạo file thuộc phần của mình (ghi trong brief). Không sửa file của agent khác, không sửa `docs/uoc-luong-tai.xlsx`, `PHAN-VIEC.md`, `vbot-capstone.html`.
2. KHÔNG chạy `git commit`, `git push`, `git add`. Chỉ người dùng mới commit.
3. Mọi giá phải kèm URL trang giá chính thức (aws.amazon.com/...) và ngày tra. Ghi rõ mức độ chắc chắn: "đã kiểm trên trang chính thức" hay "chưa kiểm". Không bịa số. Region mặc định ap-southeast-1 (Singapore); nếu dịch vụ/model không có ở đó thì nói rõ và nêu phương án.
4. Không dùng free tier, trial, credit, giá khuyến mãi. Chỉ giá niêm yết trả phí.
5. Với mỗi hạng mục chi phí: ghi dịch vụ, SKU, region, đơn giá × số lượng = tiền/tháng, giả định (dựa vào `docs/uoc-luong-tai.xlsx`: 1,1 triệu request/tháng, ~4,2 req/s burst, 600 phiên đồng thời, ~38 sandbox đồng thời lúc burst, workspace ~3,9 TB, log ~22 GB/tháng...).
6. Viết bằng tiếng Việt, ngắn gọn, có bảng. Kết quả cuối phải tự đối chiếu với ràng buộc cứng H1-H8 trong `vbot-capstone.html`.
7. Khi xong: viết dòng `TRẠNG THÁI: XONG` ở cuối file đầu ra của mình, rồi trả lời ngắn gọn (tối đa 10 dòng): đã làm gì, 3 điểm chưa chắc lớn nhất, 3 việc người dùng cần làm tay (ví dụ chụp ảnh bằng chứng).
8. Nếu bị chặn bởi hộp thoại xin quyền, dừng và chờ; đừng tìm cách vòng qua.

## Quy tắc bằng chứng (bổ sung theo yêu cầu của người dùng)
9. Mọi thông số tra cứu được dùng để tính tiền hoặc để biện luận (đơn giá, SKU, region, TTL cache, ngưỡng token tối thiểu, hạn mức/quota, giới hạn dịch vụ, model có mặt ở region nào) phải: (a) gắn link nguồn chính thức ngay trong ô Bằng chứng của dòng báo giá hoặc ngay cạnh câu trong tài liệu; (b) có mã ảnh `E..` ghi trong `evidence/INDEX.md` kèm đường dẫn file ảnh dự kiến `evidence/E-xx.png`, nêu rõ phải chụp cái gì (tên dịch vụ, SKU, region, đơn giá, dòng chữ cần thấy trong ảnh); (c) ghi ngày tra.
10. Link phải là trang người đọc mở được và thấy số trên màn hình (trang giá hoặc tài liệu chính thức, hoặc bản tính Pricing Calculator đã lưu). File Price List JSON chỉ là nguồn phụ để tính, KHÔNG thay thế trang để chụp ảnh. Nếu chỉ có JSON thì ghi thêm trang tương ứng.
11. Agent không chụp được ảnh: ghi trạng thái `chưa chụp` cạnh mã ảnh. Chỉ người dùng chụp. Thông số nào chưa có link hoặc ảnh thì đánh dấu `CHƯA CÓ BẰNG CHỨNG`, không được dùng như sự thật đã kiểm.

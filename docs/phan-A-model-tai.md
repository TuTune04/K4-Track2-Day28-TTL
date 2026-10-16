# Phần A: Model và tải (Nguyễn Như Tài)

Ngày tra giá: **2026-10-16**. Region mặc định: ap-southeast-1 (Singapore). Tiền: USD, giá niêm yết trả phí, không dùng ưu đãi nào.

## 0. Tóm tắt (đọc phần này trước)

1. **Nguồn giá:** đã kiểm trên **bảng giá chính thức dạng JSON của AWS (Price List bulk API)**, không phải từ trang tổng hợp bên thứ ba. Chưa mở được trang giá bằng trình duyệt để chụp ảnh, nên **các dòng báo giá còn thiếu ảnh bằng chứng** (xem mục 9).
2. **Phát hiện lớn nhất:** ở Singapore, bảng giá chính thức **không có DeepSeek, Qwen** (chỉ có ở Sydney, Jakarta, Tokyo, Mumbai, Mỹ...). Trong khi **Claude Haiku 5.5 chỉ $0,10 / $0,50 mỗi triệu token** (vào / ra), rẻ hơn cả DeepSeek V3.2 ($0,64 / $1,91 ở Sydney). Vì vậy **hướng "model mở rẻ hơn" của bản nghiên cứu cũ không còn đúng**: đường chính nên là **Claude Haiku 5.5 + Sonnet 5.5 (+ Opus 5.5 khi cần), tất cả qua Bedrock**. Model mở chỉ giữ làm phương án so sánh.
3. **Tiền LLM theo kịch bản khuyến nghị (S2): ~$15.059/tháng** (token) + ~$1.100 ảnh. Nếu bộ test H8 cho phép đẩy thêm sang Haiku (S3): ~$7.844. Baseline cũ trong xlsx: $40.780.
4. **Không nên tự host GPU**: máy GPU duy nhất định giá được ở Singapore (p4de.24xlarge) tốn $14.492–$48.087/tháng cho 2 máy, cao hơn tiền API cho toàn bộ lưu lượng với model mở ($4.055) và với kịch bản Haiku/Sonnet.
5. **Gateway:** LiteLLM (bản mã nguồn mở) chạy Fargate ARM 2 task, **~$93,65/tháng** (2 task, 2 vCPU/4 GB giờ hành chính, 1 vCPU/2 GB ngoài giờ).
6. **Cần quyết định của nhóm:** (a) chốt model tham chiếu H8 (đề xuất Sonnet 5.5), (b) chấp nhận Bedrock "global" (rẻ hơn ~10% nhưng xử lý ở region nào cũng được) hay "geo APAC" (+10%, ~+$1.500/tháng) cho H1.

## 1. Xác minh giá và region trên trang chính thức

Nguồn (đều chính thức, tra 2026-10-16):
- Bedrock model bên thứ ba (Claude, Cohere, Stability, OpenAI): `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonBedrockFoundationModels/current/index.json` (xuất bản 2026-10-12)
- Bedrock model của Amazon, DeepSeek, Qwen, Guardrails, Titan: `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonBedrock/current/index.json` (xuất bản 2026-10-14)
- EC2 Singapore: `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/ap-southeast-1/index.json` (xuất bản 2026-10-15)
- Fargate Singapore: `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonECS/current/ap-southeast-1/index.json` (xuất bản 2026-09-11)
- Trang web tương ứng: `https://aws.amazon.com/bedrock/pricing/` (đã đọc, khớp với JSON ở các dòng DeepSeek Sydney; bảng Claude không hiển thị trong bản trích nên Claude lấy từ JSON).
- Tài liệu: `https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html`, `.../prompt-caching.html`, `.../data-protection.html`.

**Lưu ý:** bảng giá cho biết *tính tiền ở region nào*, không chứng minh model "có thể gọi" trong tài khoản của nhóm. **Chưa kiểm trong console** (không có quyền truy cập AWS): cần vào Bedrock > Model access/Inference profiles ở ap-southeast-1 và chụp lại.

### 1.1 Giá token (USD / 1 triệu token). Mức chắc chắn: đã kiểm trên bảng giá chính thức

| Model | Region tính tiền | Loại | Vào | Ra | Cache đọc | Cache ghi (5 phút) | Ghi chú |
|---|---|---|---|---|---|---|---|
| **Claude Haiku 5.5** | ap-southeast-1 | Global | 0,10 | 0,50 | 0,01 | 0,125 | Hiệu lực 2026-10-01. Có dòng "long context" 0,50/2,50 (không dùng, request của ta ≤ 40K token) |
| **Claude Sonnet 5.5** | ap-southeast-1 | Global | 2,00 | 10,00 | 0,10 | 2,50 | Tài liệu AWS ghi cache đọc Sonnet 5.5 giảm 50% từ 2026-10-07; JSON đã phản ánh (0,10 so với 0,20 của Sonnet 5) |
| **Claude Opus 5.5** | ap-southeast-1 | Global | 4,00 | 20,00 | 0,20 | 5,00 | |
| Claude Haiku 4.5 | ap-southeast-1 | Global | 1,00 | 5,00 | 0,10 | 1,25 | Đắt gấp 10 lần Haiku 5.5, không dùng |
| Claude Fable 5.1 | ap-southeast-1 | Global | 10,00 | 50,00 | 0,25 | 12,50 | Quá đắt, không dùng |
| Haiku 5.5 / Sonnet 5.5 / Opus 5.5 ở Sydney, Tokyo | ap-southeast-2, ap-northeast-1 | Global và khu vực | như trên / **+10%** | | | | Dòng khu vực (geo) cao hơn global 10%, ví dụ Sonnet 5.5: 2,20 / 11,00 |
| DeepSeek V3.2 | **Sydney** (không có ở Singapore) | Standard | 0,6386 | 1,9055 | không có | không có | Jakarta/Tokyo/Mumbai: 0,74 / 2,22 |
| DeepSeek V3.1 | Sydney | Standard | 0,5974 | 1,7304 | không có | | |
| Qwen3 235B A22B 2507 | Sydney | Standard | 0,2266 | 0,9064 | không có | | |
| Qwen3 32B | Sydney | Standard | 0,1545 | 0,6180 | không có | | |
| DeepSeek R1 | chỉ us-east-1, us-east-2, us-west-2 | | | | | | Không dùng |
| Amazon Nova Pro / Lite / Micro | ap-southeast-1 | On-demand | 1,08 / 0,081 / 0,047 | 4,32 / 0,324 / 0,188 | có | | Phương án rẻ thêm, chưa đánh giá chất lượng tiếng Việt |

- **Singapore chỉ có Claude 5.5 qua hồ sơ "global"** (không có dòng giá khu vực riêng cho 5.5 ở Singapore). Muốn xử lý trong khu vực APAC (geo) thì gọi từ Sydney hoặc Tokyo, trả +10%.
- **Prompt cache:** Claude 5.5 hỗ trợ, tối thiểu 512 token mỗi điểm cache, TTL 5 phút hoặc 1 giờ; token đọc từ cache **không tính vào hạn mức tốc độ** (tài liệu AWS). **DeepSeek, Qwen không có trong danh sách hỗ trợ cache.** Cache ghi tính 1,25 lần giá vào (5 phút) — công thức trong xlsx **đang bỏ qua phí ghi cache** (xem mục 2.3).
- **Dữ liệu (H5):** AWS: nhà cung cấp model "không có quyền truy cập log Bedrock hay prompt và completion của khách" (Model Deployment Account do Bedrock vận hành). Nội dung chưa trích về việc "không dùng để huấn luyện" và thời hạn lưu: **cần chụp trang `data-retention` / Data Privacy FAQ** làm bằng chứng cho Long.
- **Hồ sơ global:** dữ liệu đi trên mạng AWS, mã hóa khi truyền, CloudTrail ghi lại region xử lý thực tế (`inferenceRegion`). Nhưng "xử lý ở bất kỳ region thương mại nào" có thể bị hội đồng hỏi về H1. Nếu nhóm thấy rủi ro: dùng geo APAC, +10%.

### 1.2 Embedding, rerank, sinh ảnh, guardrail

| Hạng mục | Giá | Region | Ghi chú |
|---|---|---|---|
| Titan Text Embeddings V2 | $0,028 / 1M token vào ($0,000028 / 1K) | ap-southeast-1 | Có ở Singapore. Tiếng Việt: cần test truy hồi |
| Cohere Embed Multilingual | $0,10 / 1M token | ap-southeast-1 | Phương án nếu Titan truy hồi tiếng Việt kém |
| Cohere Embed v4 | $0,12 / 1M token | ap-southeast-1 | |
| Rerank: Amazon Rerank 1.0 | $0,001 / đơn vị tìm (≤100 đoạn) | us-west-2, eu-central-1, ca-central-1, ap-northeast-1 (**không có Singapore**) | Không đưa vào baseline (chi phí ước ~$660 nếu rerank 60% request). Chỉ thêm nếu test RAG cần |
| Rerank: Cohere Rerank 3.5 | $0,002 / đơn vị | us-east-1, us-west-2, eu-central-1, ca-central-1, ap-northeast-1 | |
| Sinh ảnh cấp 5 | **Không có dịch vụ sinh ảnh nào được tính giá ở Singapore** | | |
| - Titan Image Generator V2 (1024, standard) | **$0,010 / ảnh** | us-east-1, us-west-2 | Rẻ nhất. Mumbai có bản G1 $0,012 / ảnh. Chưa kiểm model còn được cấp quyền trong tài khoản |
| - Nova Canvas (1024, standard) | $0,040 / ảnh | us-east-1, ap-northeast-1 (Tokyo), eu-west-1 | Phương án trong châu Á |
| - Stability SI-Core / SD3.5 Large | $0,04 / $0,08 / ảnh | us-east-1, us-west-2 | |
| Guardrails (cho Long) | nội dung/chủ đề $0,15 / 1K đơn vị văn bản; thông tin nhạy cảm $0,10 / 1K | ap-southeast-1 | Không thuộc phần A, chuyển Long |

**Hệ quả:** ảnh phải gọi ở region khác (Mỹ hoặc Tokyo). Gửi đi chỉ là mô tả văn bản; nếu mô tả có thể chứa dữ liệu nội bộ, dùng Tokyo (Nova Canvas, gấp 4 lần giá).

## 2. Định tuyến model theo 5 cấp

### 2.1 Bảng định tuyến (kịch bản S2 "khuyến nghị")

| Cấp | Model chính | Dự phòng / leo thang | Lý do | Rủi ro |
|---|---|---|---|---|
| 1 Email, hỏi đáp | **Haiku 5.5** (100%) | Sonnet 5.5 khi kiểm tra đầu ra thất bại hoặc người dùng bấm "viết lại" | Ngắn, nhiều request (45%), Haiku 5.5 chỉ ~$186/tháng | Tiếng Việt văn phong công sở; RAG trả lời sai nguồn |
| 2 Tài liệu, slide | **Haiku 5.5 70% / Sonnet 5.5 30%** (tài liệu dài, tờ trình đi Sonnet) | Sonnet 5.5 | Văn bản có cấu trúc, Haiku 5.5 đủ cho biên bản, báo cáo ngắn | Chất lượng văn bản dài dưới 95% |
| 3 Dữ liệu, code | **Sonnet 5.5** (100%) | Opus 5.5 cho bài code khó, thử lại 1 lần | Code chạy trong sandbox cần đúng; kiểm bằng unit test nên đo được | Chi phí tăng nếu nhiều lần thử lại |
| 4 Agent dự án | **Haiku 5.5 50% / Sonnet 5.5 50%** (bước đọc, tóm tắt, gọi tool đơn giản dùng Haiku; bước lập kế hoạch, quyết định ghi dùng Sonnet) | Sonnet 5.5; vượt 2 lần lỗi công cụ thì đẩy bước đó lên Sonnet | Chiếm ~50% tiền token: đòn bẩy lớn nhất | Agent hỏng giữa chừng; vượt 10 phút (H6). Phải đo tỉ lệ hoàn thành |
| 5 Thiết kế | **Sonnet 5.5** viết mô tả/sơ đồ + **Titan Image V2** sinh ảnh | Opus 5.5 nếu điểm thiết kế thấp | Chỉ 5% request; chất lượng thẩm mỹ cần mạnh vừa | Titan Image chất lượng thấp, ảnh phải gọi region Mỹ |

Kịch bản S3 "quyết liệt" (nếu bộ test cho phép): cấp 2 = 100% Haiku; cấp 3 và cấp 4 = 70% Haiku / 30% Sonnet.

### 2.2 Chạy lại ước tính chi phí LLM (công thức của `docs/uoc-luong-tai.xlsx`, đọc không sửa)

Công thức (sheet `TinhToan`): request/tháng = DAU × 25 × 22 × tỉ lệ cấp; tiền input = token vào × (1 − r × hỗ trợ cache × (1 − hệ số cache)) × giá vào; tiền output = token ra × giá ra. Đã tái hiện đúng baseline cũ **$40.780** (đối chiếu: file ghi ~$40.800).

Hai cách tính trên giá chính thức Singapore:
- **"Công thức xlsx":** chỉ trừ phần đọc cache (r = 50%), bỏ qua phí ghi cache.
- **"Có phí ghi cache":** 50% đọc cache, **15% ghi cache** (giả định của Tài: mỗi lượt có phần mới phải ghi), 35% giá thường. Con số này mới dùng cho báo giá.

| Kịch bản | Cấp 1 | Cấp 2 | Cấp 3 | Cấp 4 | Cấp 5 | Công thức xlsx | **Có phí ghi cache** |
|---|---|---|---|---|---|---|---|
| Baseline cũ trong xlsx (giá tham khảo) | 1,8k | 8,8k | 6,4k | 20,8k | 3,0k | $40.780 | n/a |
| S6 toàn Sonnet 5.5 | 3,7k | 5,9k | 4,3k | 14,0k | 1,2k | $28.234 | $29.088 |
| S1 an toàn: Haiku / Sonnet / Sonnet / Sonnet / **Opus** | 0,19k | 5,9k | 4,3k | 14,0k | 2,4k | $26.047 | $26.820 |
| **S2 khuyến nghị** (mục 2.1) | 0,19k | 2,0k | 4,3k | 7,4k | 1,2k | $14.612 | **$15.059** |
| S3 quyết liệt | 0,19k | 0,3k | 1,5k | 4,7k | 1,2k | $7.601 | $7.844 |
| S7 toàn Haiku 5.5 (cận dưới, khó đạt H8) | 0,19k | 0,3k | 0,2k | 0,7k | 0,06k | $1.440 | $1.483 |
| S4 so sánh: cấp 2-4 DeepSeek V3.2 (Sydney, không cache), cấp 1 Haiku, cấp 5 Opus | 0,19k | 1,7k | 1,5k | 5,5k | 2,4k | $11.203 | $11.258 |
| S5 so sánh: cấp 2-4 Qwen3-235B (Sydney) | 0,19k | 0,7k | 0,6k | 2,1k | 2,4k | $5.914 | $5.969 |

(Đơn vị k = nghìn USD, cột cấp là cột "có phí ghi cache" trừ hàng baseline.) S4, S5 chỉ để so sánh: **S3 (toàn Claude) đã rẻ hơn S4** và model mở không có cache, không có ở Singapore, chưa đo chất lượng agent.

Phân rã S2 (cơ sở cho báo giá): Haiku 5.5 nhận 5.709 triệu token vào, 836 triệu token ra; Sonnet 5.5 nhận 5.676 triệu token vào, 792 triệu token ra. Token tổng/tháng: 11,39 tỷ vào, 1,63 tỷ ra.

### 2.3 Độ nhạy và đòn bẩy (cho slide, mỗi số kèm USD, kịch bản S2 = $15.059)

| Thay đổi | Tiền LLM/tháng | Chênh |
|---|---|---|
| Cache đọc 0% | $20.708 | +$5.649 |
| Cache đọc 30% | $17.319 | +$2.260 |
| **Cache đọc 50% (mặc định)** | $15.059 | 0 |
| **Cache đọc 80%** | $11.669 | **−$3.390** |
| Cache theo từng cấp (cấp 1: 30%, cấp 2-3: 40%, cấp 4: 80%, cấp 5: 30%; hợp lý hơn vì agent gửi lại cùng ngữ cảnh mỗi bước) | $13.541 | −$1.518 |
| Giá token −50% | $7.529 | −$7.530 |
| Giá token +30% | $19.577 | +$4.518 |
| Dùng geo APAC thay global (+10%) | $16.565 | +$1.506 |
| Chuyển sang S3 (cấp 2 sang Haiku, cấp 3-4 70% Haiku) | $7.844 | **−$7.215** (chỉ khi H8 đạt) |
| Sinh ảnh giảm 2 → 1 ảnh/request | ảnh $550 | −$550 |
| DAU gấp đôi (4.000) | ~$30.100 (tuyến tính) | +$15.059; gateway gần như cố định |

Nhận xét: **cấp 4 (~49% tiền) và cấp 3 (~29%) quyết định hóa đơn**; Sonnet chiếm 95% tiền token của S2. Chuyển từ S2 sang S3 (đẩy thêm khoảng một nửa lượng Sonnet sang Haiku) tiết kiệm $7.215/tháng, nên mọi chuyển đổi **phải có số đo H8 (mục 3)** mới được tính.

### 2.4 Giả định trong `uoc-luong-tai.xlsx` nên sửa (Tài không sửa file; đề xuất cho Tú)

| Ô / giả định | Vấn đề | Đề xuất |
|---|---|---|
| Bảng giá model (GiaDinh A15:E18) | Lấy từ web bên thứ ba, nay đã có giá chính thức | small = Haiku 5.5: 0,10/0,50; medium = Sonnet 5.5: 2/10; large = Opus 5.5: 4/20. Bỏ hoặc đổi dòng `open` thành DeepSeek V3.2 Sydney 0,6386/1,9055 |
| Hệ số cache đọc 0,1 chung (B11) | Sonnet 5.5 và Opus 5.5 là 0,05; Haiku 5.5 là 0,1 | Mỗi model một hệ số, hoặc ghi giá cache trực tiếp |
| Công thức bỏ phí ghi cache | Thấp hơn thực tế ~3% (S2: +$447) | Thêm cột "tỉ lệ ghi cache" và giá ghi 1,25× |
| Tỉ lệ cache 50% đồng nhất (B10) | Agent cấp 4 có hit cao hơn, email cấp 1 thấp hơn | Cache theo từng cấp (mục 2.3) |
| Cấp 4: 40K token vào, 4K ra | Là tổng các bước; tách ra bao nhiêu bước và bao nhiêu bước dùng Haiku/Sonnet | Thêm cột "số bước", "% bước Haiku" |
| Mỗi request chỉ một lớp model | Thực tế leo thang (30% Haiku→Sonnet) tạo chi phí gấp đôi một số request | Thêm cột "tỉ lệ leo thang", cộng thêm chi phí lượt Haiku thất bại. **S2, S3 ở trên chưa tính chi phí lượt thất bại** (ước lượng +3–8%) |
| Embedding, rerank, guardrail chưa có trong tính toán | Dòng tiền nhỏ nhưng báo giá bắt buộc | Mục 5; guardrail là việc của Long |
| 25 request/người/ngày, tỉ lệ 45/20/15/15/5 | Chưa có căn cứ ngoài ước đoán | Cả nhóm bàn lại; hội đồng sẽ so với nhóm khác |

## 3. Cách đo chất lượng H8 ("≥95% điểm của model tham chiếu")

**Model tham chiếu (đề xuất, cả nhóm cần chốt): Claude Sonnet 5.5**, cùng cấu hình (global profile, cùng prompt) cho cả 5 cấp. Lý do: là model "mặc định hợp lý" mà một tập đoàn sẽ chọn nếu không tối ưu chi phí ($28k/tháng, hàng S6). Bổ sung để chống bị chất vấn "tham chiếu quá yếu": chạy thêm Opus 5.5 một lần trên cấp 4 và cấp 5, báo cáo tỉ lệ so với Opus.

**Quy trình:** mỗi cấp có hai bộ: *bộ chỉnh* (tuning, để chọn tỉ lệ định tuyến) và *bộ kiểm giữ lại* (held-out, chỉ chạy một lần để báo cáo). Điểm của mỗi item chuẩn hóa 0–1. Mỗi cấp: **R = trung bình điểm hệ thống định tuyến / trung bình điểm model tham chiếu** trên cùng item (ghép cặp), kèm khoảng tin cậy bootstrap 95% (1.000 lần lấy mẫu lại).

**Đạt cấp đó khi R ≥ 0,95 trên bộ giữ lại.** Khi R trên bộ chỉnh trong khoảng 0,95–0,97 thì coi là chưa chắc và cấp thêm Sonnet cho cấp đó.

| Cấp | Bộ chỉnh + bộ giữ lại | Cách chấm | Ghi chú |
|---|---|---|---|
| 1 Email, hỏi đáp | 100 + 40: 50% soạn/trả lời/tóm tắt email, 50% hỏi đáp tài liệu nội bộ có đáp án chuẩn | Hỏi đáp: khớp ý chính (tự động bằng danh sách ý bắt buộc) + trích dẫn đúng nguồn. Email: giám khảo LLM theo thang 1–5 (đúng ý, giọng điệu, tiếng Việt) | Có cả email có lệnh ẩn (cho H4) |
| 2 Tài liệu, slide | 100 + 40: 50 tài liệu (biên bản, tờ trình), 50 slide | Kiểm cấu trúc bằng chương trình (mở được DOCX/PPTX, đủ mục, đúng độ dài) + giám khảo LLM thang 1–5 | |
| 3 Dữ liệu, code | 100 + 40: 60 bài code có unit test ẩn, 40 bài phân tích bảng có đáp án số | **Tự động hoàn toàn:** tỉ lệ qua test, sai số số liệu ≤ 1% | Khách quan nhất |
| 4 Agent dự án | 60 + 30 tác vụ trên Jira/Confluence/Notion giả lập, mỗi tác vụ chạy 3 lần | Kiểm trạng thái cuối (ticket có đúng trường, trang cập nhật đúng); điểm = tỉ lệ hoàn thành đúng; ghi thời gian (≤ 10 phút, H6) và số bước | Chi phí đo cao nhất |
| 5 Thiết kế | 60 + 30 yêu cầu mockup/sơ đồ/ảnh minh họa | 3 thành viên chấm mù (không biết model nào) thang 1–5, lấy trung bình; ảnh dùng cùng bộ sinh ảnh | Chủ quan nhất: ghi rõ |

**Giám khảo LLM:** dùng Opus 5.5, chấm mù, đảo thứ tự ngẫu nhiên, rubric cố định; **hiệu chuẩn:** thành viên tự chấm 20 item mỗi cấp, so khớp với giám khảo (lệch > 10% thì sửa rubric). Giám khảo không được là model đang chấm chính nó.

**Chi phí đo:** ước thô ~$60–150 mỗi vòng đầy đủ (2 model × ~420 item + giám khảo), tính theo giá mục 1; **chưa tính chạy lại nhiều lần**.

**Cổng eval khi đổi model hoặc prompt (H4):** chạy lại bộ giữ lại; chặn triển khai nếu bất kỳ cấp nào R < 0,95 hoặc tỉ lệ vượt 10 phút ở cấp 4 > 5%.

**Việc chưa làm:** **chưa có bộ câu hỏi nào được viết, chưa chạy lần nào**. Mọi tỉ lệ Haiku/Sonnet ở mục 2 là giả thuyết chờ số đo; nếu không kịp đo trong buổi học, dùng S1 hoặc S6 (đắt hơn nhưng bảo vệ được) hoặc nói rõ với hội đồng đó là giả định.

## 4. Hòa vốn API và tự host GPU

**Giá máy GPU ở ap-southeast-1 (đã kiểm trên bảng EC2 chính thức, Linux, on-demand, 2026-10-15):**

| Máy | GPU | Giá/giờ | 730 giờ | Ghi chú |
|---|---|---|---|---|
| p4d.24xlarge | 8× A100 40GB (320 GB) | $26,349 | $19.235 | |
| **p4de.24xlarge** | 8× A100 80GB (640 GB) | **$32,936** | **$24.044** | Đủ bộ nhớ cho Qwen3-235B ở dạng lượng tử hóa |
| p4de, 1 năm, trả hàng tháng, standard | | $20,882 | $15.244 | Bảng giá cam kết chính thức |
| g4dn.12xlarge | 4× T4 16GB | $5,474 | $3.996 | Quá yếu cho model lớn |
| g5, g6, g6e, p5 | **không có trong bảng giá Singapore** | | | Không định giá được ở Singapore |

**Thông lượng cần (từ xlsx, lúc burst):** ~43.000 token vào/giây, ~6.200 token ra/giây (chưa trừ cache, đây là mức cần xử lý nếu tự host không có cache chia sẻ).

**Thông lượng của một máy p4de với Qwen3-235B: chưa đo.** Ước lượng thô của Tài (không dựa trên đo đạc, để lập luận số lượng máy): ~1.500–3.000 token ra/giây gộp và ~15.000–30.000 token vào/giây. Với ước lượng này, lúc burst cần **~3–4 máy** (cộng 1 máy cho mất AZ). Cần benchmark thật nếu muốn đưa vào slide làm khẳng định.

| Phương án | Tiền/tháng | So với API cùng lưu lượng |
|---|---|---|
| Tự host 2 máy p4de, chạy 24/7 (tối thiểu HA) | **$48.087** | gấp 3,2 lần S2 |
| 2 máy p4de, cam kết 1 năm | $30.488 | gấp 2,0 lần S2 |
| 2 máy p4de, chỉ giờ hành chính (220 giờ), khởi động mất 15–30 phút (chưa đo) | **$14.492** | tương đương S2, nhưng không đủ cho burst |
| 4 máy p4de, chỉ giờ hành chính | $28.984 | gấp 1,9 lần S2 |
| API: toàn bộ lưu lượng bằng Qwen3-235B (Sydney, không cache) | $4.055 | |
| API: toàn bộ bằng DeepSeek V3.2 (Sydney) | $10.373 | |
| API: S2 (Claude) | $15.059 | |
| API: S3 (Claude, quyết liệt) | $7.844 | |
| API: toàn Haiku 5.5 | $1.483 | |

**Điểm hòa vốn:** tự host chỉ rẻ hơn khi tiền API cho cùng lưu lượng vượt chi phí cố định của số máy cần thiết.
- So với API Qwen3-235B ($4.055 cho 100% lưu lượng ở mức hiện tại): 2 máy giờ hành chính ($14.492) hòa vốn ở **~3,6× lưu lượng (~7.100 DAU)**, nhưng ở mức đó cần nhiều máy hơn nên điểm hòa vốn thực tế cao hơn nữa.
- So với S2 (Claude, $15.059): tự host 2 máy giờ hành chính ngang bằng, nhưng **không đạt chất lượng và HA tương đương** (chưa có cache, chưa đo H8, chỉ 2 máy).
- Giá token +30% hoặc −50% (xem mục 2.3): API vẫn rẻ hơn hoặc ngang tự host trong mọi trường hợp; giảm 50% càng làm lợi thế API lớn hơn.
- Chưa tính: kỹ sư vận hành (`ops_labor`), thời gian tải model, giám sát GPU, vá lỗi.

**Kết luận: không tự host.** Đưa bảng trên vào slide như phương án so sánh. Giữ lại ý "nếu DAU vượt khoảng 7.000 và dùng model mở thì xem lại".

## 5. Gateway

**Đề xuất: LiteLLM Proxy (mã nguồn mở), chạy trên Fargate ARM, 2 task ở 2 AZ sau ALB** (ALB thuộc phần Tú).

| Phương án | Ưu | Nhược | Chi phí |
|---|---|---|---|
| **LiteLLM Proxy (OSS)** | Có sẵn khóa ảo theo user/nhóm, ngân sách, giới hạn RPM/TPM, fallback, routing, ghi chi tiêu | Cần Postgres (dùng chung RDS) và Redis (dùng chung ElastiCache); tính năng SSO/audit nâng cao có thể là bản trả phí, **chưa kiểm** | ~$93,65/tháng |
| Gateway tự viết mỏng (FastAPI/Go) | Kiểm soát hoàn toàn | Phải tự làm quota, fallback, log; tốn công | ~$94 cho chạy + công phát triển |
| Chỉ dùng Bedrock gốc (inference profile theo ứng dụng + tag chi phí + AWS Budgets) | Không phải vận hành gateway | Không có quota theo người, không có định tuyến theo cấp | $0 |

Chọn LiteLLM vì đề yêu cầu quota theo người và đơn vị (H8) và định tuyến theo cấp (mục 2).

**Chi phí chạy (Fargate ARM, ap-southeast-1, đã kiểm trên bảng giá ECS chính thức; cỡ theo lịch của Tú):** gateway gánh ~8,7 lời gọi LLM/giây lúc burst (4,2 request/giây × ~2 lời gọi) và 600 phiên streaming, nên cỡ theo giờ:
- Giờ hành chính (220 giờ): 2 task × 2 vCPU × 220 × $0,04045 = $35,60; 2 task × 4 GB × 220 × $0,00442 = $7,78.
- Ngoài giờ (510 giờ): 2 task × 1 vCPU × 510 × $0,04045 = $41,26; 2 task × 2 GB × 510 × $0,00442 = $9,02.
- Tổng vCPU $76,86 + bộ nhớ $16,80 = **$93,65**.

Đây là dòng `gateway` duy nhất cho LiteLLM; **dòng "LLM gateway" trong `compute` của Tú phải bỏ để không tính trùng** (quyết định của điều phối). Postgres và Redis của LiteLLM "nằm trong" `database` và `cache_queue` (Long); thêm log chi tiêu 1,1 triệu dòng/tháng vào dung lượng database.

**Quota, giới hạn, fallback (đề xuất cấu hình):**
- Theo người: 40 request/giờ, 200 request/ngày (trần ~8 lần mức trung bình 25/ngày), ngân sách token theo ngày; cấp 4 tối đa 3 agent đồng thời.
- Theo đơn vị (nhóm/phòng ban): ngân sách tháng; cảnh báo ở 50%, 80%, 100% (AWS Budgets + cảnh báo LiteLLM); ở 80% tự hạ cấp 2-3 sang Haiku, ở 100% chặn các request không cấp 1 (trả HTTP 429 kèm thông báo), quản trị viên có thể nâng trần.
- Giới hạn toàn hệ thống: theo hạn mức token/phút của Bedrock. **Chưa kiểm hạn mức mặc định** của tài khoản (ước tính burst ~2,6 triệu token vào/phút trước cache; thường phải gửi yêu cầu tăng hạn mức trước khi chạy thật). Token đọc từ cache không tính vào hạn mức (tài liệu AWS), thêm một lý do để cache tốt.
- Fallback: (1) thử lại có lùi mũ khi bị giới hạn tốc độ; (2) cùng model qua hồ sơ geo hoặc region khác; (3) Haiku → Sonnet khi kiểm tra đầu ra thất bại; (4) Sonnet 5.5 lỗi kéo dài → Sonnet 5 hoặc 4.6 (đắt hơn một chút, chưa đo chất lượng). **Không dùng DeepSeek/Qwen làm fallback** (ngoài Singapore, không cache, chưa đo).
- Quan sát: ghi log từng request (người dùng, cấp, model, token vào/ra/cache, độ trễ token đầu, chi phí) → CloudWatch; cảnh báo p95 token đầu > 3 giây (H6).

## 6. Đối chiếu ràng buộc cứng (phần của A)

| | Trạng thái | Căn cứ / còn thiếu |
|---|---|---|
| H1 Cloud | Đạt có điều kiện | Một cloud AWS, region chính Singapore; **Claude 5.5 chạy qua hồ sơ global** (có thể xử lý ngoài Singapore) và **sinh ảnh gọi us-west-2 hoặc Tokyo** vì Singapore không có. Nhóm cần nêu rõ lý do, hoặc trả +10% cho geo APAC. Gọi qua VPC endpoint (Tú cấu hình) |
| H5 Nhà cung cấp không huấn luyện | Phần lớn đạt | AWS nêu nhà cung cấp model không truy cập prompt/completion. **Còn thiếu:** chụp tài liệu Data Privacy / data-retention của Bedrock |
| H6 p95 token đầu ≤ 3 giây | **Chưa đo** | Dùng streaming, Haiku/Sonnet thường nhanh, nhưng global routing có thể thêm độ trễ. Phải đo 50–100 request ở giờ cao điểm trước khi khẳng định |
| H6 agent ≤ 10 phút | Chưa đo | Tác vụ cấp 4 trong bộ test ghi thời gian |
| H7 Không điểm lỗi đơn ở gateway | Đạt theo thiết kế | 2 task Fargate ở 2 AZ; phụ thuộc DB, Redis và ALB của Long, Tú |
| H8 ≥95% so với tham chiếu, quota, cảnh báo, cách cắt | **Thiết kế xong, chưa chạy đo** | Mục 3 và mục 5. Bộ câu hỏi chưa viết |
| H4 Cổng eval khi đổi model | Thiết kế xong | Mục 3 (dùng chung bộ giữ lại) |

## 7. Điểm chưa chắc lớn nhất

1. **Chất lượng Haiku 5.5 ở cấp 2–4 (H8) chưa đo**: phần lớn mức tiết kiệm so với "toàn Sonnet" (S6 $29.088 → S2 $15.059) đến từ giả thuyết này. Nếu cấp 3-4 phải về Sonnet, tiền LLM trong khoảng $15–29k.
2. **Hạn mức Bedrock (token/phút) và model access trong tài khoản thật** chưa kiểm; có thể cần xin tăng hạn mức, và global profile có thể không bật được theo chính sách tổ chức (SCP).
3. **Giả định tải:** 25 request/ngày, tỉ lệ cache 50%/ghi cache 15%, chi phí lượt leo thang chưa tính (+3–8%). Hội đồng sẽ chất vấn.

## 8. Việc người dùng cần làm tay

1. Chụp ảnh bằng chứng (tên dịch vụ, SKU, region, đơn giá, ngày): Bedrock pricing (Claude Haiku 5.5, Sonnet 5.5, ở Singapore), Titan Text Embeddings V2, Titan Image Generator, Fargate ARM; và **trang Data Privacy / data retention của Bedrock**. Nên dùng AWS Pricing Calculator lưu link cho từng dòng.
2. Vào console Bedrock ở ap-southeast-1: kiểm Model access và Inference profiles (Haiku 5.5, Sonnet 5.5, Opus 5.5), xem hạn mức token/phút; chụp lại.
3. Cả nhóm quyết: model tham chiếu H8 (Sonnet 5.5?), global hay geo APAC, và chọn S2 hay S3 vào báo giá (TSV đang ghi S2).

## 9. Danh sách bằng chứng còn thiếu (để chụp)

| Mã ảnh gợi ý | Nội dung |
|---|---|
| E-A1 | Bedrock pricing, Claude Haiku 5.5, Singapore (vào, ra, cache) |
| E-A2 | Bedrock pricing, Claude Sonnet 5.5, Singapore |
| E-A3 | Bedrock pricing, Titan Text Embeddings V2, Singapore |
| E-A4 | Bedrock pricing, Titan Image Generator V2, us-west-2 |
| E-A5 | Fargate ARM vCPU và GB, Singapore |
| E-A6 | Bedrock data retention / Data Privacy |

Cột "Bằng chứng" trong `docs/baogia-A.tsv` hiện chỉ có URL; Tú thay bằng mã ảnh sau khi chụp.

TRẠNG THÁI: XONG

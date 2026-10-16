# Phần A: Model và tải (Nguyễn Như Tài)

Ngày tra giá: **2026-10-16**. Region mặc định: ap-southeast-1 (Singapore). Tiền: USD, giá niêm yết trả phí, không dùng ưu đãi nào.

## 0. Tóm tắt (đọc phần này trước)

1. **Nguồn giá và bằng chứng:** giá tính từ **bảng giá chính thức dạng JSON của AWS** (nguồn phụ để tính) và đối chiếu với các **trang người đọc mở được** (trang giá và tài liệu AWS, liệt kê ở mục 1 và sổ bằng chứng mục 9, mã E20-E38). **Chưa có ảnh nào** (agent không chụp được); mọi mã ảnh đang ở trạng thái `chưa chụp`. Các số chưa thấy được trên trang (giá Claude, Stable Image Core, Fargate) được đánh dấu `CHƯA CÓ BẰNG CHỨNG trên trang`.
2. **Phát hiện lớn nhất:** ở Singapore, bảng giá chính thức **không có DeepSeek, Qwen** (chỉ có ở Sydney, Jakarta, Tokyo, Mumbai, Mỹ...). Trong khi **Claude Haiku 5.5 chỉ $0,10 / $0,50 mỗi triệu token** (vào / ra), rẻ hơn cả DeepSeek V3.2 ($0,64 / $1,91 ở Sydney). Vì vậy **hướng "model mở rẻ hơn" của bản nghiên cứu cũ không còn đúng**: đường chính nên là **Claude Haiku 5.5 + Sonnet 5.5 (+ Opus 5.5 khi cần), tất cả qua Bedrock**. Model mở chỉ giữ làm phương án so sánh.
3. **Tiền LLM theo kịch bản được chọn (S3: leo thang 10%, cache theo cấp, token ra đã cắt có tính lượt hỏi lại): ~$7.275/tháng** (token). Bước 1 (S3 có leo thang): $9.129; bước 2 (cache theo cấp): $8.125; **bước 3 (cắt token ra, thực đo −10,5%, không phải 20%): $7.275**. **S3 chỉ được giữ nếu bộ test H8 đạt ≥95% ở mọi cấp**; nếu không thì lùi về S2 (~$12.343 với cùng mức cắt token ra). Baseline cũ trong xlsx: $40.780. **Sinh ảnh phải sửa lên $4.532/tháng** (trước đó ghi $1.100 theo Titan Image, nhưng trang tài liệu AWS không còn liệt kê Titan Image và Nova Canvas đã hết hạn 2026-09-30; mục 1.2). Tổng cột chi phí `baogia-A.tsv`: **$11.923,98** (bước 2: $9.325,33; bước 1: $10.329,00; ban đầu: $16.259,10).
4. **Không nên tự host GPU**: máy GPU duy nhất định giá được ở Singapore (p4de.24xlarge) tốn $14.492–$48.087/tháng cho 2 máy, cao hơn tiền API cho toàn bộ lưu lượng với model mở ($4.055) và với kịch bản Haiku/Sonnet.
5. **Gateway:** LiteLLM (bản mã nguồn mở) chạy Fargate ARM 2 task, **~$93,65/tháng** (2 task, 2 vCPU/4 GB giờ hành chính, 1 vCPU/2 GB ngoài giờ).
6. **Cần quyết định của nhóm:** (a) chốt model tham chiếu H8 (đề xuất Sonnet 5.5), (b) chấp nhận Bedrock "global" (rẻ hơn ~10% nhưng xử lý ở region nào cũng được) hay "geo APAC" (+10%, ~+$1.500/tháng) cho H1.

## 1. Xác minh giá và region trên trang chính thức

Nguồn (đều chính thức, tra 2026-10-16). **Trang người đọc mở được** (dùng để chụp ảnh) và mã ảnh:

| Mã | Trang | Dùng cho |
|---|---|---|
| E20, E21, E22, E24, E33 | https://aws.amazon.com/bedrock/pricing/ | Giá token Claude, giá Cohere, Stability, DeepSeek/Qwen Sydney |
| E25 | https://aws.amazon.com/fargate/pricing/ | Gateway |
| E26 | https://docs.aws.amazon.com/bedrock/latest/userguide/models-region-compatibility.html | Model nào ở region nào (Claude 5.5 chỉ global ở Singapore; Titan Embeddings V2 không có Singapore; Nova Canvas hết hạn; DeepSeek, Qwen không có Singapore) |
| E27 | https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html | TTL cache, mức tối thiểu 512 token, cách tính ghi/đọc, cache không tính vào hạn mức |
| E28 | https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html và https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-support.html | Global rẻ hơn ~10%, xử lý ở region nào cũng được |
| E29 | https://docs.aws.amazon.com/bedrock/latest/userguide/data-protection.html, .../data-retention.html, .../abuse-detection.html, https://aws.amazon.com/bedrock/faqs/ | Dữ liệu không dùng huấn luyện, không chia sẻ nhà cung cấp, lưu giữ |
| E30 | https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html | Trường `usage` (cache, output), `stopReason`, `maxTokens` |
| E31, E32 | https://aws.amazon.com/ec2/pricing/on-demand/ và https://aws.amazon.com/ec2/pricing/reserved-instances/pricing/ | Giá GPU p4de |
| E35 | https://docs.litellm.ai/docs/proxy/virtual_keys, https://docs.litellm.ai/docs/routing, https://docs.litellm.ai/docs/enterprise | Tính năng LiteLLM (bản mở và bản trả phí) |
| E38 | https://docs.aws.amazon.com/bedrock/latest/userguide/quotas.html | Hạn mức Bedrock: **CHƯA CÓ BẰNG CHỨNG** (chưa đọc trang này) |

Nguồn phụ để tính (không thay cho trang): Price List JSON `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonBedrockFoundationModels/current/index.json` (2026-10-12), `.../AmazonBedrock/current/index.json` (2026-10-14), `.../AmazonEC2/current/ap-southeast-1/index.json` (2026-10-15), `.../AmazonECS/current/ap-southeast-1/index.json` (2026-09-11). Trang `aws.amazon.com/bedrock/pricing/` bản đọc tự động **không hiển thị bảng giá Claude**, nên giá Claude **CHƯA CÓ BẰNG CHỨNG trên trang** (chỉ có JSON) cho đến khi bạn chụp được.

**Lưu ý:** bảng giá cho biết *tính tiền ở region nào*, không chứng minh model "có thể gọi" trong tài khoản của nhóm. **Chưa kiểm trong console** (không có quyền truy cập AWS): cần vào Bedrock > Model access/Inference profiles ở ap-southeast-1 và chụp lại.

### 1.1 Giá token (USD / 1 triệu token). Mức chắc chắn: đã kiểm trên bảng giá chính thức

| Model | Region tính tiền | Loại | Vào | Ra | Cache đọc | Cache ghi (5 phút) | Ghi chú |
|---|---|---|---|---|---|---|---|
| **Claude Haiku 5.5** | ap-southeast-1 | Global | 0,10 | 0,50 | 0,01 | 0,125 | Hiệu lực 2026-10-01. Có dòng "long context" 0,50/2,50 (không dùng, request của ta ≤ 40K token) |
| **Claude Sonnet 5.5** | ap-southeast-1 | Global | 2,00 | 10,00 | 0,10 | 2,50 | Tài liệu AWS ghi cache đọc Sonnet 5.5 giảm 50% từ 2026-10-07; JSON đã phản ánh (0,10 so với 0,20 của Sonnet 5) |
| **Claude Opus 5.5** | ap-southeast-1 | Global | 4,00 | 20,00 | 0,20 | 5,00 | |
| Claude Haiku 4.5 | ap-southeast-1 | Global | 1,00 | 5,00 | 0,10 | 1,25 | Đắt gấp 10 lần Haiku 5.5, không dùng |
| Claude Fable 5.1 | ap-southeast-1 | Global | 10,00 | 50,00 | 0,25 | 12,50 | Quá đắt, không dùng |
| Haiku 5.5 / Sonnet 5.5 / Opus 5.5 ở Sydney, Tokyo | ap-southeast-2, ap-northeast-1 | Global và khu vực | như trên / **+10%** | | | | JSON có dòng khu vực cao hơn global 10%, ví dụ Sonnet 5.5: 2,20 / 11,00; **chưa kiểm khả dụng geo trên trang tài liệu: CHƯA CÓ BẰNG CHỨNG** |
| DeepSeek V3.2 | **Sydney** (không có ở Singapore) | Standard | 0,6386 | 1,9055 | không có | không có | Jakarta/Tokyo/Mumbai: 0,74 / 2,22 |
| DeepSeek V3.1 | Sydney | Standard | 0,5974 | 1,7304 | không có | | |
| Qwen3 235B A22B 2507 | Sydney | Standard | 0,2266 | 0,9064 | không có | | |
| Qwen3 32B | Sydney | Standard | 0,1545 | 0,6180 | không có | | |
| DeepSeek R1 | chỉ us-east-1, us-east-2, us-west-2 | | | | | | Không dùng |
| Amazon Nova Pro / Lite / Micro | ap-southeast-1 | On-demand | 1,08 / 0,081 / 0,047 | 4,32 / 0,324 / 0,188 | có | | Phương án rẻ thêm, chưa đánh giá chất lượng tiếng Việt |

- **Singapore chỉ có Claude 5.5 qua hồ sơ "global"**: trang tài liệu [models-region-compatibility](https://docs.aws.amazon.com/bedrock/latest/userguide/models-region-compatibility.html) (E26) ghi dòng ap-southeast-1 của Haiku 5.5, Sonnet 5.5, Opus 5.5 chỉ có cột Global được đánh dấu hỗ trợ (cột in-region và geo không). DeepSeek V3.2/V3.1 và Qwen3 không có dòng Singapore trên cùng trang. Muốn xử lý trong khu vực APAC (geo) thì gọi từ Sydney hoặc Tokyo, trả +10%.
- **Prompt cache:** Claude 5.5 hỗ trợ, tối thiểu 512 token mỗi điểm cache, TTL 5 phút hoặc 1 giờ; token đọc từ cache **không tính vào hạn mức tốc độ** (tài liệu AWS). [Nguồn: prompt-caching, E27] **DeepSeek, Qwen không có trong danh sách hỗ trợ cache** của trang đó. Cache ghi tính 1,25 lần giá vào (5 phút) — công thức trong xlsx **đang bỏ qua phí ghi cache** (xem mục 2.3).
- **Dữ liệu (H5), nguồn E29:** FAQ bảo mật Bedrock (https://aws.amazon.com/bedrock/faqs/): AWS và nhà cung cấp model "will not use any inputs to or outputs from Amazon Bedrock to train Amazon Nova, Amazon Titan, or any third-party models" và "Users' inputs and model outputs are not shared with any model providers". Trang data-protection: nhà cung cấp không có quyền truy cập vào tài khoản triển khai nên không thấy log, prompt, completion. Trang abuse-detection chỉ nêu lưu giữ tối đa 30 ngày cho Claude Fable 5/5.1 và model OpenAI; **Haiku, Sonnet, Opus 5.5 không nằm trong danh sách đó** (đã kiểm ngày 2026-10-16); trang data-retention cho phép đặt `none` theo từng region (chưa kiểm `allowed_modes` của Claude 5.5: **CHƯA CÓ BẰNG CHỨNG**).
- **Hồ sơ global:** theo cross-region-inference (E28): dữ liệu đi trên mạng AWS, mã hóa khi truyền, CloudTrail ghi region xử lý thực tế (`inferenceRegion`); global rẻ hơn geo "khoảng 10%". Theo inference-profiles-support (E28): với hồ sơ liên vùng, "your input prompts and output results may be stored in the opt-in Regions for abuse detection purposes" — hội đồng có thể hỏi về H1/H5. Nếu nhóm thấy rủi ro: dùng geo APAC, +10%.

### 1.2 Embedding, rerank, sinh ảnh, guardrail

| Hạng mục | Giá | Region | Ghi chú |
|---|---|---|---|
| Cohere Embed Multilingual | $0,10 / 1M token (trang ghi ~$0,0001 / 1K) | **ap-southeast-1, in-region** (E26) | **Chọn dùng.** Hỗ trợ đa ngôn ngữ; cần test truy hồi tiếng Việt. Giá: trang https://aws.amazon.com/bedrock/pricing/ (E23) |
| Titan Text Embeddings V2 | JSON có giá $0,028 / 1M (SKU `APS1-...`) nhưng **trang tài liệu không liệt kê Singapore** | Tokyo, Seoul, Osaka, Mumbai, Hyderabad, Sydney... (E26) | **Không dùng**: có SKU giá không chứng minh model gọi được ở Singapore |
| Cohere Embed v4 | $0,12 / 1M token | ap-southeast-1, chỉ hồ sơ global (E26) | Không dùng |
| Rerank: Amazon Rerank 1.0 | $0,001 / đơn vị tìm (≤100 đoạn) | us-west-2, eu-central-1, ca-central-1, ap-northeast-1 (**không có Singapore**) | Không đưa vào baseline (chi phí ước ~$660 nếu rerank 60% request). Giá từ JSON, **CHƯA CÓ BẰNG CHỨNG trên trang** |
| Rerank: Cohere Rerank 3.5 | $0,002 / đơn vị | us-east-1, us-west-2, eu-central-1, ca-central-1, ap-northeast-1 (E26) | Giá trên https://aws.amazon.com/bedrock/pricing/ (trang ghi $2,00 / 1.000 truy vấn) |
| Sinh ảnh cấp 5 | **Không có dịch vụ sinh ảnh ở Singapore** | | |
| - **Stability Stable Image Core 1.0** | **$0,04 / ảnh** | **us-west-2 (in-region)** (E26) | **Chọn dùng** (rẻ nhất còn có trên trang tài liệu). Giá từ JSON, **CHƯA CÓ BẰNG CHỨNG trên trang** (E24) |
| - Stability SD3.5 Large / Stable Image Ultra | $0,08 / $0,14 / ảnh | us-west-2 (E26) | Đắt hơn, chất lượng cao hơn |
| - Titan Image Generator | JSON còn giá $0,01 / ảnh | **Không có mục nào trên trang models-region-compatibility** (E26) | **Không dùng** (không chứng minh còn gọi được; bản đầu của tài liệu này đã ghi sai) |
| - Nova Canvas | $0,04 / ảnh | us-east-1, eu-west-1, ap-northeast-1: **Legacy, hết hạn 2026-09-30** (đã qua) (E26) | **Không dùng** |
| - Nova 2 Omni (xuất ảnh) | JSON: $0,0547 / 1K token ảnh ra, ap-southeast-1 global | Singapore (global) | Chưa biết một ảnh bằng bao nhiêu token, chưa kiểm chất lượng: **CHƯA CÓ BẰNG CHỨNG**, phương án cần thử |
| Guardrails (cho Long) | nội dung/chủ đề $0,15 / 1K đơn vị văn bản; thông tin nhạy cảm $0,10 / 1K | ap-southeast-1 | Không thuộc phần A, chuyển Long |

**Hệ quả:** ảnh phải gọi ở **us-west-2**. Gửi đi chỉ là mô tả văn bản; nếu mô tả có thể chứa dữ liệu nội bộ, cần che trước hoặc dùng phương án trong châu Á (hiện chỉ còn Nova 2 Omni, chưa đo). **Giá ảnh thực tế $0,04, gấp 4 lần Titan Image đã ghi ở bước trước; sinh ảnh giờ là dòng lớn thứ hai trong báo giá phần A ($4.532).**

## 2. Định tuyến model theo 5 cấp

### 2.1 Bảng định tuyến (kịch bản S3 được chọn; điều kiện: bộ test H8 đạt ≥95% mỗi cấp, xem mục 3)

| Cấp | Model chính | Dự phòng / leo thang | Lý do | Rủi ro |
|---|---|---|---|---|
| 1 Email, hỏi đáp | **Haiku 5.5** (100%) | Sonnet 5.5 khi kiểm tra đầu ra thất bại hoặc người dùng bấm "viết lại" | Ngắn, nhiều request (45%), Haiku 5.5 chỉ ~$186/tháng | Tiếng Việt văn phong công sở; RAG trả lời sai nguồn |
| 2 Tài liệu, slide | **Haiku 5.5** (100%) | Sonnet 5.5 nếu cấp 2 không đạt H8 (lùi về S2: 70% Haiku / 30% Sonnet) | Văn bản có cấu trúc, rẻ nhất: ~$298/tháng | Tài liệu dài, tờ trình có thể dưới 95%; **S3 không tính leo thang ở cấp này** (nếu có 10% leo thang: +$588/tháng) |
| 3 Dữ liệu, code | **Haiku 5.5 70% / Sonnet 5.5 30%** (bài khó, nhiều bước chọn Sonnet từ đầu) | **10% lượt Haiku chạy lại trên Sonnet** khi unit test/kiểm tra kết quả thất bại; Opus 5.5 cho bài khó nhất | Code kiểm bằng unit test nên phát hiện lỗi và đo được | Tỉ lệ thất bại thật có thể cao hơn 10% |
| 4 Agent dự án | **Haiku 5.5 70% / Sonnet 5.5 30%** (chọn model theo **cả lượt chạy**, không đổi model giữa các bước vì cache chỉ dùng được trong cùng một model; lượt có lập kế hoạch/quyết định ghi phức tạp chọn Sonnet) | **10% lượt Haiku chạy lại trên Sonnet** (cả lượt, không dùng lại cache giữa hai model); vượt 2 lần lỗi công cụ thì đẩy bước đó lên Sonnet | Chiếm ~62% tiền token của S3 | Agent hỏng giữa chừng; vượt 10 phút (H6) vì chạy lại; phải đo tỉ lệ hoàn thành |
| 5 Thiết kế | **Sonnet 5.5** viết mô tả/sơ đồ + **Stable Image Core** (us-west-2) sinh ảnh | Opus 5.5 nếu điểm thiết kế thấp; SD3.5 Large nếu ảnh quá kém | Chỉ 5% request; chất lượng thẩm mỹ cần mạnh vừa | Chất lượng ảnh chưa đo; ảnh gọi us-west-2 |

**Tỉ lệ leo thang giả định: 10% số lượt Haiku của cấp 3 và cấp 4 (tương đương 7% số request của mỗi cấp) phải chạy lại trên Sonnet.** Căn cứ: đây là **giả định khởi đầu, chưa đo**; chọn 10% vì (a) với code có unit test và agent có kiểm tra trạng thái cuối, một model nhỏ trượt cỡ vài chục phần trăm bài khó nhưng ta đã chuyển trước 30% bài khó sang Sonnet, phần còn lại là bài dễ hơn; (b) 10% đủ lớn để mô hình chi phí không quá lạc quan (leo thang 0% cho $6.289, 10% cho $7.275, theo cache từng cấp ở mục 2.2b và token ra đã cắt ở mục 2.2c). Tính **đầy đủ**: lượt Haiku thất bại vẫn bị tính (đã nằm trong 70% Haiku), và lượt chạy lại trên Sonnet tính đủ token vào/ra (không giảm vì lỗi sớm, không dùng lại cache chéo model) nên là cận trên. Con số thật sẽ lấy từ bộ chỉnh H8 (mục 3): đếm tỉ lệ Haiku trượt kiểm tra tự động.

**Phương án lùi về S2** (cấp 2 = 70% Haiku / 30% Sonnet; cấp 3 = 100% Sonnet; cấp 4 = 50/50; ~$12.343 với cache theo cấp và token ra đã cắt): dùng nếu bất kỳ cấp 2, 3, 4 không đạt 95% hoặc tỉ lệ leo thang đo được > 30% (khi đó S3 đắt $9.246, rẻ hơn S2 chỉ $3.097 mà rủi ro cao).

### 2.2 Chạy lại ước tính chi phí LLM (công thức của `docs/uoc-luong-tai.xlsx`, đọc không sửa)

Công thức (sheet `TinhToan`): request/tháng = DAU × 25 × 22 × tỉ lệ cấp; tiền input = token vào × (1 − r × hỗ trợ cache × (1 − hệ số cache)) × giá vào; tiền output = token ra × giá ra. Đã tái hiện đúng baseline cũ **$40.780** (đối chiếu: file ghi ~$40.800).

Hai cách tính trên giá chính thức Singapore:
- **"Công thức xlsx":** chỉ trừ phần đọc cache (r = 50%), bỏ qua phí ghi cache.
- **"Có phí ghi cache":** 50% đọc cache, **15% ghi cache** (giả định của Tài: mỗi lượt có phần mới phải ghi), 35% giá thường. Dùng cho các hàng so sánh trong bảng này. **Báo giá dùng cache riêng theo từng cấp (mục 2.2b), không dùng 50/15 đồng nhất nữa.**

| Kịch bản | Cấp 1 | Cấp 2 | Cấp 3 | Cấp 4 | Cấp 5 | Công thức xlsx | **Có phí ghi cache** |
|---|---|---|---|---|---|---|---|
| Baseline cũ trong xlsx (giá tham khảo) | 1,8k | 8,8k | 6,4k | 20,8k | 3,0k | $40.780 | n/a |
| S6 toàn Sonnet 5.5 | 3,7k | 5,9k | 4,3k | 14,0k | 1,2k | $28.234 | $29.088 |
| S1 an toàn: Haiku / Sonnet / Sonnet / Sonnet / **Opus** | 0,19k | 5,9k | 4,3k | 14,0k | 2,4k | $26.047 | $26.820 |
| S2 (phương án lùi; chưa tính leo thang; cache đồng nhất 50/15) | 0,19k | 2,0k | 4,3k | 7,4k | 1,2k | $14.612 | **$15.059** |
| S3 cũ, **chưa** tính leo thang, cache đồng nhất 50/15 (chỉ để so sánh) | 0,19k | 0,3k | 1,5k | 4,7k | 1,2k | $7.601 | $7.844 |
| S3 bước 1 (cấp 2 100% Haiku; cấp 3-4: 70/30; 10% leo thang; cache đồng nhất 50/15) | 0,19k | 0,3k | 1,76k | 5,69k | 1,2k | $8.843 | $9.129 |
| **S3 được chọn (bước 2): như trên nhưng cache theo từng cấp** (mục 2.2b) | 0,20k | 0,31k | 1,84k | 4,56k | 1,22k | n/a | $8.125 |
| **S3 được chọn (bước 3): thêm cắt token ra theo cấp, gồm lượt hỏi lại** (mục 2.2c) | 0,19k | 0,27k | 1,60k | 4,12k | 1,09k | n/a | **$7.275** |
| S7 toàn Haiku 5.5 (cận dưới, khó đạt H8) | 0,19k | 0,3k | 0,2k | 0,7k | 0,06k | $1.440 | $1.483 |
| S4 so sánh: cấp 2-4 DeepSeek V3.2 (Sydney, không cache), cấp 1 Haiku, cấp 5 Opus | 0,19k | 1,7k | 1,5k | 5,5k | 2,4k | $11.203 | $11.258 |
| S5 so sánh: cấp 2-4 Qwen3-235B (Sydney) | 0,19k | 0,7k | 0,6k | 2,1k | 2,4k | $5.914 | $5.969 |

(Đơn vị k = nghìn USD, cột cấp là cột "có phí ghi cache" trừ hàng baseline.) S4, S5 chỉ để so sánh: **S3 (toàn Claude, $7.275; $9.129 nếu dùng cache đồng nhất và token ra chưa cắt như S4) đã rẻ hơn S4 ($11.258)** và model mở không có cache, không có ở Singapore, chưa đo chất lượng agent.

Phân rã S3 (cơ sở cho báo giá, bước 3: gồm leo thang 10%, cache theo cấp, token ra đã cắt và lượt hỏi lại 2–5%): Haiku 5.5 nhận 8.926,5 triệu token vào, 1.023,96 triệu token ra (= $461,41 + $511,98); Sonnet 5.5 nhận 3.538,92 triệu token vào, 331,293 triệu token ra (= $2.988,67 + $3.312,93). Số liệu từng cấp có trong ô Ghi chú của `docs/baogia-A.tsv`. Token Haiku được tính cả lượt thất bại; lượt chạy lại trên Sonnet tính đủ token vào/ra nên là cận trên.

### 2.2b Giả định cache theo từng cấp (bước 2: thay thế 50% đọc / 15% ghi đồng nhất)

**Thiết kế prompt để cache được** (thứ tự cố định, nội dung ổn định đứng trước): (1) system prompt + định nghĩa công cụ + quy tắc guardrail, **giống nhau cho mọi người dùng**; (2) khối dữ liệu của phiên (tài liệu nguồn, dữ liệu tải lên, bản nháp, mô tả thiết kế); (3) lịch sử hội thoại / các bước agent đã chạy; (4) tin nhắn mới và kết quả công cụ mới (**không cache**). Đặt điểm cache cuối mỗi khối chỉ khi khối đó có khả năng được dùng lại. Mỗi model có cache riêng, nên **Haiku và Sonnet không dùng chung cache**: vì vậy định tuyến theo cả lượt chạy (đã sửa ở mục 2.1). Mức tối thiểu 512 token mỗi điểm cache (tài liệu AWS) đều đạt.

**Tham số và công thức** (I = token vào mỗi request):

| Ký hiệu | Nghĩa | Căn cứ |
|---|---|---|
| S | Tiền tố chung mọi người dùng (system, công cụ) | Cùng nội dung cho mọi request của cấp đó |
| h = 95% | Tỉ lệ S còn nóng khi cần | Lưu lượng trung bình giờ hành chính = 1,1 triệu / (22 × 10 × 3.600 giây) = **1,39 request/giây**, khoảng cách giữa hai request cùng cấp ≪ TTL 5 phút nên S gần như luôn được làm mới; trừ 5% vì tài liệu AWS nói cầu cao điểm và định tuyến liên vùng "có thể làm tăng số lần ghi cache", và khi triển khai prompt mới |
| D | Khối dữ liệu của phiên, ghi lần đầu | Chỉ cache nếu có khả năng dùng lại |
| H_prev, H_inc | Lịch sử mang sang lượt sau / phần mới thêm vào cache mỗi lượt kế tiếp | |
| q | Xác suất người dùng gửi tin tiếp theo **trong 5 phút** sau tin trước (nếu quá 5 phút, cache hết hạn và phải ghi lại) | Suy đoán hành vi: đọc kết quả, sửa rồi gửi tiếp; **chưa đo**. T1 0,25; T2 0,35; T3 0,50; T5 0,50 |

- Đọc: **r = h × (S + q × (D + H_prev)) / I**
- Ghi: **w = [ (1 − h) × S + (1 − q × h) × D + q × H_inc ] / I**
- Phần còn lại (1 − r − w) tính giá thường. Điểm hòa vốn khi ghi một khối: ghi đắt hơn giá thường 25% (Sonnet 2,5 so với 2,0; Haiku 0,125 so với 0,10), mỗi lần đọc trúng tiết kiệm ~90–95% → chỉ nên ghi khi **xác suất dùng lại ≳ 28%**. Vì vậy cấp 1 **không** cache kết quả RAG (khác nhau mỗi truy vấn, xác suất dùng lại thấp); các cấp 2, 3, 5 cache khối dữ liệu (q 0,35–0,50 cao hơn ngưỡng, cấp 2 chỉ hơi cao hơn).

| Cấp | I | S | D | H_prev | H_inc | q | **r (đọc)** | **w (ghi)** | Giá thường |
|---|---|---|---|---|---|---|---|---|---|
| 1 Email, hỏi đáp | 3.000 | 1.000 | 0 (RAG đổi mỗi lần) | 800 | 600 | 0,25 | **38%** | **7%** | 55% |
| 2 Tài liệu, slide | 6.000 | 1.500 | 3.000 | 1.000 | 1.000 | 0,35 | **46%** | **40%** | 14% |
| 3 Dữ liệu, code | 10.000 | 2.000 | 5.000 | 1.000 | 1.000 | 0,50 | **48%** | **32%** | 20% |
| 4 Agent dự án | 40.000 | 2.500 | 1.500 (giả định: nhiệm vụ) | ngữ cảnh lớn dần | mỗi bước | xem dưới | **75%** | **25%** | 0% |
| 5 Thiết kế | 6.000 | 1.500 | 2.500 | 1.000 | 800 | 0,50 | **51%** | **30%** | 19% |

Ví dụ cấp 3: r = 0,95 × (2.000 + 0,5 × 6.000) / 10.000 = 47,5%; w = [0,05 × 2.000 + (1 − 0,475) × 5.000 + 0,5 × 1.000] / 10.000 = 32,3%.

**Cấp 4 (agent nhiều bước, tính riêng):** 40.000 token vào là tổng của k = 6 bước (≈ 5 lệnh gọi connector + 1 bước tổng hợp). Bước 1 có ngữ cảnh I₁ = 4.000 (S = 2.500 + nhiệm vụ 1.500); mỗi bước thêm d token kết quả công cụ và suy luận: 6 × 4.000 + 15 × d = 40.000 ⇒ d ≈ 1.067. Dùng điểm cache cuốn chiếu (cuối ngữ cảnh mỗi bước): bước i đọc lại toàn bộ ngữ cảnh bước i−1 và ghi phần mới.
- Đọc: h × (S + I₁ + … + I₅) = 0,95 × (2.500 + 30.667) = 31.508 token (78,8%).
- Ghi: (1 − h) × S + nhiệm vụ 1.500 + 5 × 1.067 + (1 − h) × 30.667 = 125 + 1.500 + 5.333 + 1.533 = 8.492 token (21,2%).
- **Tạm dừng chờ người dùng xác nhận (H4):** giả định 50% lượt có bước cần xác nhận trước khi ghi ra ngoài, và 40% người dùng trả lời sau hơn 5 phút ⇒ cache hết hạn, ngữ cảnh ~7.200 token phải ghi lại: 0,5 × 0,4 × 7.200 = 1.440 token chuyển từ đọc sang ghi.
- Kết quả: đọc 30.068 (75,2%), ghi 9.932 (24,8%) ⇒ **r = 75%, w = 25%**.
- **Giữ cao có chủ ý:** w của cấp 4 (25%) **cao hơn** giả định cũ (15%), vì ngữ cảnh lớn dần nên mỗi bước đều phải ghi phần mới, bước cuối ghi mà không bao giờ được đọc lại, và các lượt phải chờ xác nhận mất cache. Đây là nguyên nhân chính khiến khoản ghi cache lớn, không giảm được bằng tinh chỉnh con số.
- Lượt Haiku leo thang lên Sonnet được tính cùng r và w của cấp (phải ghi lại ngữ cảnh trên Sonnet, nên là cận trên).

**Hiệu ứng lên chi phí (bước 2, trước khi cắt token ra):** giá input hiệu dụng mỗi triệu token: Haiku cũ 0,05875 → cấp 1 0,06755, cấp 2 0,0686, cấp 3 0,0648, cấp 4 0,03875; Sonnet cũ 1,125 → cấp 3 1,248, cấp 5 1,181, cấp 4 0,70. Tiền theo cấp (cache đồng nhất → cache theo cấp): cấp 1 $186 → $199, cấp 2 $298 → $311, cấp 3 $1.757 → $1.839, cấp 4 $5.692 → $4.561, cấp 5 $1.196 → $1.215. **Toàn bộ mức giảm ($9.129 → $8.125, −$1.004) đến từ cấp 4** (−$1.131); bốn cấp còn lại **tăng** +$127 vì ghi cache nhiều hơn 15%. Tiền ghi cache là **$2.532/tháng (31% tiền token)**: đây là khoản lớn, không phải "nhiễu".

**Cách đo hit rate thực tế để hội đồng kiểm chứng:**
1. Mỗi lời gọi Bedrock (Converse) trả về `usage.cacheReadInputTokens`, `usage.cacheWriteInputTokens`, `usage.inputTokens` (tài liệu AWS: tổng token vào = `inputTokens` + `cacheReadInputTokens` + `cacheWriteInputTokens`). Gateway (mục 5) ghi ba trường này cho từng request cùng cấp, model, session_id, thời điểm → CloudWatch/log. (Tên metric CloudWatch riêng của Bedrock cho cache **chưa kiểm**; lấy từ phản hồi API là chắc chắn.)
2. Báo cáo theo cấp và theo model: **r_đo = Σ cacheRead / (Σ inputTokens + Σ cacheRead + Σ cacheWrite)**, **w_đo = Σ cacheWrite / cùng mẫu số**; thêm hit rate riêng của tiền tố S (kỳ vọng ≥ 90%) và khoảng cách giữa hai tin của cùng phiên (để kiểm q).
3. Trước khi bảo vệ: chạy mô phỏng 30–60 phút với 20–30 phiên giả lập mỗi cấp, khoảng cách tin theo phân bố nghĩ ra (có cả > 5 phút), lấy r_đo và w_đo thay cho bảng trên; nếu lệch hơn ±5 điểm ở cấp nào thì tính lại tiền bằng công thức ở mục này.
4. Khi chạy thật: cảnh báo nếu r_đo của cấp 4 < 65% hoặc w_đo > 35% (bảng 2.3 cho thấy mức thiệt hại).

### 2.2c Giảm token ra (bước 3)

**Vì sao nhắm vào token ra:** ở bước 2, token ra là $4.819 trong $8.125 (59%); Sonnet giá ra gấp 20 lần giá Haiku nên phần lớn lợi ích nằm ở cấp dùng Sonnet (3, 4, 5). Mức cắt dưới đây **tính từng thành phần, không đặt số tròn 20%**. Tất cả thành phần token ra hiện tại (cột 2) là **ước lượng thiết kế, chưa đo**; số đo thật lấy bằng cách ở cuối mục.

| Cấp | Token ra hiện tại gồm | Biện pháp đo được | Cắt (token ra mới) | Căn cứ tính | Rủi ro chất lượng / hỏi lại |
|---|---|---|---|---|---|
| 1 | 400 = trả lời 300 + chào, nhắc lại câu hỏi, câu kết 60 + trích dẫn, định dạng 40 | System prompt văn phong ngắn (không chào, không nhắc lại câu hỏi); `maxTokens` = 800 (chỉ chặn lạc đề) | **350 (−12,5%)** | Bỏ ~50 trong 60 token lời dẫn | Email cộc; người dùng xin "chi tiết hơn": hỏi lại +2% |
| 2 | 2.000 = văn bản 1.200 + mã dựng DOCX/XLSX/PPTX 500 + lời dẫn, tóm tắt lại 300 | Công cụ `build_document` nhận JSON nội dung + mẫu định dạng cố định thay cho việc model viết cả script (mã 500 → 250, giữ một nửa vì định dạng tùy biến); bỏ tóm tắt lại (300 → 100); `maxTokens` = 3.000 | **1.550 (−22,5%)** | −250 − 200 | Mẫu giới hạn định dạng, lỗi dựng file: hỏi lại +3% |
| 2 (đã loại) | "Viết dàn ý rồi mở rộng từng mục khi được yêu cầu" | Không dùng mặc định | 0 | Tài liệu dài ~30% request: dàn ý 350; 40% người dùng xin mở hết (1.200 + 350), 60% mở khoảng một nửa (350 + 600): trung bình 0,4 × 1.550 + 0,6 × 950 = **1.190 so với 1.200**, tức tiết kiệm <1% token ra mà thêm một lượt (kèm token vào) | Chỉ làm nút "dàn ý trước" tùy chọn |
| 3 | 1.500 = mã 800 + giải thích 450 + chép lại kết quả chạy, định dạng lặp 250 | Lượt sửa lỗi trả **diff** thay vì cả file (50% request là lượt sửa tiếp, cùng giả định q = 0,5 ở mục 2.2b: 800 → 300 trên lượt đó); giải thích ≤ 3 câu (450 → 300); không chép lại output sandbox (250 → 100); `maxTokens` = 2.500 | **1.050 (−30%)** | −250 − 150 − 150 = −550 → 950; cộng +75 vì 10% diff không áp dụng được và phải viết lại cả file (0,5 × 0,10 × 1.500) → 1.025, làm tròn lên 1.050 | Diff lỗi, giải thích thiếu: hỏi lại +4% |
| 4 | 4.000 = gọi công cụ 900 (6 bước × ~150) + suy nghĩ giữa bước 1.500 + trả lời cuối 1.000 (≈500 là chép lại kết quả công cụ) + nội dung ghi ra (ticket, trang) 600 | Suy nghĩ chỉ bật ở bước lập kế hoạch đầu và bước quyết định ghi (1.500 → 1.100); tham số công cụ gọn (chỉ ID và trường cần: 900 → 750); câu trả lời cuối là tóm tắt kèm liên kết, không chép kết quả công cụ (1.000 → 600) | **3.050 (−23,75%)** | −400 − 150 − 400 | Lập kế hoạch kém, agent hỏng giữa chừng, tăng lượt chạy lại +5%. **Cơ chế giới hạn token suy nghĩ của Claude 5.5 trên Bedrock chưa kiểm: CHƯA CÓ BẰNG CHỨNG**, nên mục tiêu này phụ thuộc cách làm được |
| 5 | 1.500 = mô tả/mã sơ đồ 900 + prompt ảnh 2 × 150 + giải thích 300 | Giải thích ngắn (300 → 120); prompt ảnh ≤ 100 token (−100); **giữ nguyên** mã sơ đồ để không hại chất lượng; `maxTokens` = 2.500 | **1.220 (−18,7%)** | −180 − 100 | Mô tả ảnh nghèo nàn: hỏi lại +3% |

**Biên an toàn (đã tính vào số tiền):** mỗi tỉ lệ hỏi lại ở cột cuối được cộng như **một request đầy đủ** (cả token vào theo r, w của cấp lẫn token ra mới) cho cả hai model, và cả 113.300 ảnh (gồm lượt thêm). Không trừ lợi ích do lịch sử ngắn hơn làm token vào của lượt sau giảm (thận trọng).

| Cấp | Tiền bước 2 | Chỉ cắt token ra (không hỏi lại) | Cắt token ra + hỏi lại | **Chênh so với bước 2** |
|---|---|---|---|---|
| 1 | $199 | $187 | $191 | −$8 |
| 2 | $311 | $261 | $269 | −$42 |
| 3 | $1.839 | $1.538 | $1.600 | −$239 |
| 4 | $4.561 | $3.927 | $4.123 | −$438 |
| 5 | $1.215 | $1.061 | $1.093 | −$122 |
| **Tổng** | **$8.125** | **$6.974 (−$1.151, −14,2%)** | **$7.275** | **−$850 (−10,5%)** |

**Kết luận:** mức giảm thực là **10,5% sau khi tính hỏi lại**, không phải 20%. Một nửa số cấp (1, 2) gần như không đáng kể vì chạy Haiku; $635 trong $1.151 đến từ cấp 4 và $301 từ cấp 3. Ngưỡng hòa vốn của lượt hỏi lại (tỉ lệ hỏi lại mà tại đó mức cắt không còn lời): cấp 1 ~6%, cấp 5 ~14%, cấp 4 ~16%, cấp 2 ~19%, cấp 3 ~19%. Cấp 1 rất sát ngưỡng nên **chỉ giữ nếu đo thấy hỏi lại tăng <3%**.

**Cách đo (Bedrock Converse, nguồn E30 https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html):** mỗi phản hồi có `usage.outputTokens` và `stopReason` (giá trị gồm `end_turn`, `max_tokens`, `tool_use`...). Gateway ghi hai trường này cùng cấp, model, session_id.
1. **Trước khi bật:** chạy bộ chỉnh H8 + mô phỏng người dùng, lấy phân phối `outputTokens` theo cấp và model (trung bình, p50, p90, p99); so với bảng "hiện tại" ở trên (nếu lệch >20% thì sửa lại toàn bộ bảng).
2. **Đặt `maxTokens` theo cấp** = max(p99 của baseline × 1,3, giá trị bảng); giám sát tỉ lệ `stopReason = max_tokens`, **phải <1%** mỗi cấp, quá mức thì nâng trần.
3. **Chạy so sánh (50% phiên dùng cấu hình mới, 50% cũ)**, mỗi cấp đo: trung bình và p99 `outputTokens`; **tỉ lệ hỏi lại** = tỉ lệ phiên có tin kế tiếp trong 5 phút thuộc loại "chi tiết hơn", "viết lại", "giải thích", hoặc bấm không hài lòng; điểm H8 (R).
4. **Điều kiện lùi về mức cũ (theo từng cấp):** (a) R của cấp <0,95 hoặc thấp hơn cấu hình cũ quá 2 điểm; (b) tỉ lệ hỏi lại đo được vượt ngưỡng hòa vốn ở trên; (c) `stopReason = max_tokens` ≥1% sau khi đã nâng trần một lần; (d) với cấp 3, tỉ lệ diff không áp dụng được >15%. Lùi = trả prompt, `maxTokens`, cách trả diff về cấu hình cũ; tiền của cấp đó trở về cột "Tiền bước 2".

### 2.3 Độ nhạy và đòn bẩy (cho slide, mỗi số kèm USD; kịch bản S3 = leo thang 10%, cache theo cấp, token ra đã cắt = $7.275)

| Thay đổi | Tiền LLM/tháng | Chênh |
|---|---|---|
| **Mức cắt token ra chỉ đạt một nửa** (vẫn có hỏi lại) | $7.876 | +$601 |
| **Không cắt được token ra nhưng hỏi lại vẫn tăng** | $8.477 | **+$1.202** |
| Hỏi lại gấp đôi mức giả định (4–10%) | $7.576 | +$301 |
| Không có lượt hỏi lại thêm | $6.974 | −$301 |
| Tỉ lệ leo thang 0% | $6.289 | −$986 |
| Leo thang 5% | $6.782 | −$493 |
| **Leo thang 10% (mặc định)** | $7.275 | 0 |
| Leo thang 20% | $8.260 | +$985 |
| Leo thang 30% | $9.246 | +$1.971 |
| Thêm 10% leo thang ở cấp 2 | $7.806 | +$531 |
| **Hit rate đọc thấp hơn 10 điểm ở mọi cấp**, phần mất phải ghi lại | $8.227 | **+$952** |
| Hit rate đọc thấp hơn 20 điểm, phải ghi lại | $9.179 | +$1.904 |
| Đọc thấp hơn 10 điểm, không ghi (bỏ điểm cache) | $8.028 | +$753 |
| Đọc thấp hơn 20 điểm, không ghi | $8.780 | +$1.505 |
| Cấp 4 xấu: r 55%, w 45% | $8.617 | +$1.342 |
| Cấp 4 tốt: r 85%, w 15% | $6.604 | −$671 |
| Phần ghi cache nhiều hơn 1,5 lần | $7.362 | +$87 |
| Phần ghi cache giảm một nửa | $7.010 | −$265 |
| Tắt cache hoàn toàn | $11.795 | +$4.520 |
| Dùng lại giả định cũ 50% đọc / 15% ghi đồng nhất | $8.331 | +$1.056 |
| Giá token −50% | $3.637 | −$3.638 |
| Giá token +30% | $9.457 | +$2.182 |
| Dùng geo APAC thay global (+10%) | $8.002 | +$727 |
| Lùi về S2 (nếu H8 không đạt; cùng cắt token ra, cache theo cấp) | $12.343 | +$5.068 |
| Sinh ảnh giảm 2 → 1 ảnh/request (Stable Image Core, $0,04) | ảnh $4.532 → $2.266 | −$2.266 |
| DAU gấp đôi (4.000) | ~$14.550 token (tuyến tính) | +$7.275; gateway gần như cố định |

Nhận xét: **cấp 4 (~57% tiền token) và cấp 3 (~22%) quyết định hóa đơn**; Sonnet chiếm 87% tiền token. Rủi ro hit rate: nếu cache hết hạn nhiều hơn dự kiến, tiền tăng $0,75–1,9 nghìn mỗi 10–20 điểm, **nhỏ hơn rủi ro leo thang và rủi ro H8**. **Dòng lớn thứ hai của báo giá phần A là sinh ảnh ($4.532), lớn hơn mọi biện pháp ở bước 2 và 3**; đòn bẩy tốt nhất cho ảnh là số ảnh mỗi request. Từ S2 sang S3 tiết kiệm $5.068/tháng **sau khi đã tính leo thang, cache theo cấp và cắt token ra**; mọi chuyển đổi **phải có số đo H8 (mục 3)** mới được tính.

### 2.4 Giả định trong `uoc-luong-tai.xlsx` nên sửa (Tài không sửa file; đề xuất cho Tú)

| Ô / giả định | Vấn đề | Đề xuất |
|---|---|---|
| Bảng giá model (GiaDinh A15:E18) | Lấy từ web bên thứ ba, nay đã có giá chính thức | small = Haiku 5.5: 0,10/0,50; medium = Sonnet 5.5: 2/10; large = Opus 5.5: 4/20. Bỏ hoặc đổi dòng `open` thành DeepSeek V3.2 Sydney 0,6386/1,9055 |
| Hệ số cache đọc 0,1 chung (B11) | Sonnet 5.5 và Opus 5.5 là 0,05; Haiku 5.5 là 0,1 | Mỗi model một hệ số, hoặc ghi giá cache trực tiếp |
| Công thức bỏ phí ghi cache | Với cache theo cấp, **ghi cache là $2.532/tháng (31% tiền token)**; bỏ qua sẽ thấp hơn thực tế nhiều | Thêm cột "tỉ lệ ghi cache" và giá ghi 1,25× |
| Tỉ lệ cache 50% đồng nhất (B10) | Cấp 4 có hit cao (75%) nhưng ghi cao (25%); cấp 1 hit thấp (38%) | Thêm cột r và w theo từng cấp (bảng mục 2.2b) |
| Cấp 4: 40K token vào, 4K ra | Là tổng các bước; tách ra bao nhiêu bước và bao nhiêu bước dùng Haiku/Sonnet | Thêm cột "số bước", "% bước Haiku" |
| Mỗi request chỉ một lớp model | Thực tế có leo thang Haiku→Sonnet, tạo chi phí gấp đôi một số request | Thêm cột "tỉ lệ leo thang" và cộng chi phí lượt chạy lại. **S3 được chọn đã tính 10% ở cấp 3-4** (mục 2.1); S2 và các kịch bản S1, S4-S7 trong bảng 2.2 chưa tính |
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

**Điều kiện giữ S3 và cách lùi:**
- S3 chỉ được giữ nếu **R ≥ 0,95 trên bộ giữ lại ở cả cấp 1-5** (với cấp 2: 100% Haiku; cấp 3-4: hệ thống 70/30 có leo thang, đo cả pipeline chứ không đo riêng Haiku).
- Đo thêm ba số cho cấp 3 và 4 trên bộ chỉnh: (1) **tỉ lệ lượt Haiku trượt kiểm tra tự động** (unit test cấp 3; kiểm tra trạng thái cuối cấp 4) → thay cho giả định 10%; (2) tỉ lệ cấp 4 vượt 10 phút khi tính cả chạy lại; (3) điểm của hệ thống so với Sonnet 100%.
- **Quy tắc lùi:** cấp nào R < 0,95 thì chuyển cấp đó về cấu hình S2 (cấp 2: 70/30; cấp 3: 100% Sonnet; cấp 4: 50/50), rồi đo lại một lần. Nếu tỉ lệ leo thang đo được > 30% thì lùi cả cấp 3-4 về S2, vì S3 chỉ còn rẻ hơn $3.360 mà tăng rủi ro.
- Báo giá hiện ghi S3. Nếu không kịp đo trong buổi học: nói rõ với hội đồng tỉ lệ Haiku/leo thang là **giả định chưa đo** và nêu sẵn S2 ($12.343) là phương án lùi; hoặc nộp S2 để chắc điểm chất lượng.

**Việc chưa làm:** **chưa có bộ câu hỏi nào được viết, chưa chạy lần nào**.

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
| Tự host 2 máy p4de, chạy 24/7 (tối thiểu HA) | **$48.087** | gấp 6,6 lần S3 |
| 2 máy p4de, cam kết 1 năm | $30.488 | gấp 4,2 lần S3 |
| 2 máy p4de, chỉ giờ hành chính (220 giờ), khởi động mất 15–30 phút (chưa đo) | **$14.492** | gấp 2,0 lần S3, và không đủ cho burst |
| 4 máy p4de, chỉ giờ hành chính | $28.984 | gấp 4,0 lần S3 |
| API: toàn bộ lưu lượng bằng Qwen3-235B (Sydney, không cache) | $4.055 | |
| API: toàn bộ bằng DeepSeek V3.2 (Sydney) | $10.373 | |
| API: S3 được chọn (Claude, leo thang, cache theo cấp, token ra đã cắt) | $7.275 | |
| API: S2 (Claude, phương án lùi) | $12.343 | |
| API: toàn Haiku 5.5 | $1.483 | |

**Điểm hòa vốn:** tự host chỉ rẻ hơn khi tiền API cho cùng lưu lượng vượt chi phí cố định của số máy cần thiết.
- So với API Qwen3-235B ($4.055 cho 100% lưu lượng ở mức hiện tại): 2 máy giờ hành chính ($14.492) hòa vốn ở **~3,6× lưu lượng (~7.100 DAU)**, nhưng ở mức đó cần nhiều máy hơn nên điểm hòa vốn thực tế cao hơn nữa.
- So với S3 (Claude, $7.275): tự host 2 máy giờ hành chính ($14.492) đắt hơn 2,0 lần và **không đạt chất lượng và HA tương đương** (chưa có cache, chưa đo H8, chỉ 2 máy).
- Giá token +30% hoặc −50% (xem mục 2.3): API vẫn rẻ hơn hoặc ngang tự host trong mọi trường hợp; giảm 50% càng làm lợi thế API lớn hơn.
- Chưa tính: kỹ sư vận hành (`ops_labor`), thời gian tải model, giám sát GPU, vá lỗi.

**Kết luận: không tự host.** Đưa bảng trên vào slide như phương án so sánh. Giữ lại ý "nếu DAU vượt khoảng 7.000 và dùng model mở thì xem lại".

## 5. Gateway

**Đề xuất: LiteLLM Proxy (mã nguồn mở), chạy trên Fargate ARM, 2 task ở 2 AZ sau ALB** (ALB thuộc phần Tú).

| Phương án | Ưu | Nhược | Chi phí |
|---|---|---|---|
| **LiteLLM Proxy (OSS)** | Khóa ảo theo user/nhóm, theo dõi chi tiêu, fallback, retry, cooldown, Redis dùng chung giữa các instance (docs LiteLLM, E35: https://docs.litellm.ai/docs/proxy/virtual_keys, https://docs.litellm.ai/docs/routing) | **Bắt buộc có Postgres** (dùng chung RDS) và nên có Redis (dùng chung ElastiCache). **SSO/SCIM, audit log có thời hạn lưu, guardrail theo key/team, ngân sách theo tag hoặc theo model là bản Enterprise** (https://docs.litellm.ai/docs/enterprise): bản mở không đủ nếu cần các tính năng đó, audit hệ thống phải dựa vào CloudTrail và log của gateway. Giới hạn RPM/TPM theo user/team: trang không nêu rõ, **CHƯA CÓ BẰNG CHỨNG** | ~$93,65/tháng |
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
| H1 Cloud | Đạt có điều kiện | Một cloud AWS, region chính Singapore; **Claude 5.5 chỉ có hồ sơ global ở Singapore** (E26) nên có thể xử lý ngoài Singapore, và theo tài liệu AWS (E28) prompt/kết quả "may be stored in the opt-in Regions for abuse detection purposes"; **sinh ảnh gọi us-west-2** (Stable Image Core) vì Singapore không có. Nhóm cần nêu rõ lý do, hoặc trả +10% cho geo APAC (gọi từ Sydney/Tokyo; khả dụng chưa kiểm). Gọi qua VPC endpoint (Tú cấu hình; FAQ AWS: AWS PrivateLink, E29) |
| H5 Nhà cung cấp không huấn luyện | Phần lớn đạt | FAQ AWS (E29): không dùng đầu vào/đầu ra để huấn luyện, không chia sẻ với nhà cung cấp model; Claude 5.5 không có trong danh sách model bị lưu giữ ở trang abuse-detection. **Còn thiếu:** ảnh E29, và kiểm `allowed_modes`/chế độ lưu giữ của Claude 5.5 trong tài khoản thật |
| H6 p95 token đầu ≤ 3 giây | **Chưa đo** | Dùng streaming, Haiku/Sonnet thường nhanh, nhưng global routing có thể thêm độ trễ. Phải đo 50–100 request ở giờ cao điểm trước khi khẳng định |
| H6 agent ≤ 10 phút | Chưa đo | Tác vụ cấp 4 trong bộ test ghi thời gian |
| H7 Không điểm lỗi đơn ở gateway | Đạt theo thiết kế | 2 task Fargate ở 2 AZ; phụ thuộc DB, Redis và ALB của Long, Tú |
| H8 ≥95% so với tham chiếu, quota, cảnh báo, cách cắt | **Thiết kế xong, chưa chạy đo** | Mục 3 và mục 5. Bộ câu hỏi chưa viết |
| H4 Cổng eval khi đổi model | Thiết kế xong | Mục 3 (dùng chung bộ giữ lại) |

## 7. Điểm chưa chắc lớn nhất

1. **Chất lượng Haiku 5.5 ở cấp 2–4 (H8) chưa đo**, và **mức cắt token ra cũng chưa đo** (thành phần token ra hiện tại là ước lượng thiết kế): tiết kiệm từ S2 ($12.343) xuống S3 ($7.275), và $850 của bước 3, đều dựa vào các giả thuyết này. Nếu phải lùi về S2 thì +$5.068/tháng; nếu cấp 3-4 phải về Sonnet hẳn, tiền LLM khoảng $13–29k.
2. **Bằng chứng và khả năng gọi thực tế:** **chưa có ảnh nào**; giá Claude, Stable Image Core, Fargate chỉ có trong JSON, chưa thấy trên trang (`CHƯA CÓ BẰNG CHỨNG trên trang`); hạn mức Bedrock (token/phút) **CHƯA CÓ BẰNG CHỨNG** (chưa đọc trang quota); model access trong tài khoản thật chưa kiểm; global profile có thể bị SCP chặn. Việc phát hiện Titan Image và Nova Canvas không dùng được cho thấy giá trong JSON không đủ để kết luận model còn gọi được.
3. **Giả định tải, cache, token ra:** 25 request/ngày; tỉ lệ cache theo cấp (mục 2.2b) và thành phần token ra (mục 2.2c) là **suy ra từ thiết kế, chưa đo**; q (xác suất gửi tin tiếp trong 5 phút) và tỉ lệ chờ xác nhận ở cấp 4 là suy đoán hành vi; ghi cache chiếm khoảng 31% tiền token. Tỉ lệ leo thang 10% (chưa đo; mỗi +10% khoảng $985); hỏi lại 2–5% (chưa đo). Cấp 2 chạy 100% Haiku và **không** có leo thang trong S3 (thêm 10% thì +$531). Hội đồng sẽ chất vấn.

## 8. Việc người dùng cần làm tay

1. Chụp ảnh bằng chứng theo sổ mục 9 (mã E20-E38): ưu tiên E20, E21 (giá Claude ở Singapore; nếu trang không hiện bảng Claude thì dùng AWS Pricing Calculator và lưu link), E24 (Stable Image Core), E23, E25, E26, E27, E29. Mỗi ảnh phải thấy tên dịch vụ, SKU, region, đơn giá, ngày.
2. Vào console Bedrock ở ap-southeast-1: kiểm Model access và Inference profiles (Haiku 5.5, Sonnet 5.5, Opus 5.5), xem hạn mức token/phút; chụp lại.
3. Cả nhóm quyết: model tham chiếu H8 (Sonnet 5.5?), global hay geo APAC, và xác nhận S3 (TSV đang ghi S3 có leo thang 10%) hay lùi về S2 sau khi có số đo H8.

## 9. Sổ bằng chứng phần A (mã E20–E38; chép vào `evidence/INDEX.md` của Tú, vì Tài không sửa file đó)

Quy ước: mọi ảnh ở trạng thái **chưa chụp**; đường dẫn dự kiến `evidence/E-xx.png`. Ngày tra 2026-10-16.

| Mã | Dịch vụ / trang | URL (người đọc mở được) | Phải chụp cái gì (dòng chữ phải thấy) | Ảnh | Dùng cho |
|---|---|---|---|---|---|
| E20 | Bedrock pricing: Claude Haiku 5.5 | https://aws.amazon.com/bedrock/pricing/ | Tab Anthropic, mục Claude Haiku 5.5, chọn Asia Pacific (Singapore): input 0,10, output 0,50, cache read 0,01, cache write (5 phút) 0,125 USD/1M token. **CHƯA CÓ BẰNG CHỨNG trên trang** (chỉ có JSON) | `evidence/E-20.png` chưa chụp | 2 dòng llm Haiku |
| E21 | Bedrock pricing: Claude Sonnet 5.5 | https://aws.amazon.com/bedrock/pricing/ | Như E20, Sonnet 5.5: 2,00 / 10,00 / cache read 0,10 / cache write 2,50. **CHƯA CÓ BẰNG CHỨNG trên trang** | `evidence/E-21.png` chưa chụp | 2 dòng llm Sonnet |
| E22 | Bedrock pricing: Claude Opus 5.5 | https://aws.amazon.com/bedrock/pricing/ | Opus 5.5: 4,00 / 20,00 (chỉ dùng cho phương án dự phòng, không có dòng) | `evidence/E-22.png` chưa chụp (tùy chọn) | Mục 2.1 |
| E23 | Bedrock pricing: Cohere Embed Multilingual | https://aws.amazon.com/bedrock/pricing/ | Tab Cohere, Embed Multilingual, Singapore: 0,10 USD/1M token (hoặc 0,0001/1K) | `evidence/E-23.png` chưa chụp | 2 dòng embedding |
| E24 | Bedrock pricing: Stability Stable Image Core | https://aws.amazon.com/bedrock/pricing/ | Tab Stability AI, Stable Image Core, US West (Oregon): 0,04 USD/ảnh. **CHƯA CÓ BẰNG CHỨNG trên trang** | `evidence/E-24.png` chưa chụp | Dòng llm sinh ảnh |
| E25 | AWS Fargate pricing | https://aws.amazon.com/fargate/pricing/ | Singapore, Linux/ARM: vCPU 0,04045, GB 0,00442 USD/giờ. **CHƯA CÓ BẰNG CHỨNG trên trang** | `evidence/E-25.png` chưa chụp | 2 dòng gateway |
| E26 | Bedrock docs: model theo region | https://docs.aws.amazon.com/bedrock/latest/userguide/models-region-compatibility.html | (a) Claude Haiku/Sonnet/Opus 5.5, dòng ap-southeast-1: chỉ cột Global được đánh dấu; (b) Titan Text Embeddings V2: không có dòng ap-southeast-1; (c) Cohere Embed Multilingual: ap-southeast-1 in-region; (d) Nova Canvas: Legacy EOL 2026-09-30; (e) Stable Image Core: us-west-2; (f) DeepSeek V3.2, Qwen3: không có ap-southeast-1 | `evidence/E-26.png` chưa chụp (nên chụp 3–4 ảnh cuộn trang) | H1, chọn model |
| E27 | Bedrock docs: Prompt caching | https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html | Bảng model: Claude Haiku/Sonnet/Opus 5.5 tối thiểu 512 token, TTL 5 phút/1 giờ; mục "cache hits are not deducted against your rate limit"; mục Billing for cached tokens | `evidence/E-27.png` chưa chụp | Mục 2.2b |
| E28 | Bedrock docs: Cross-Region inference | https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html và .../inference-profiles-support.html | Bảng Geographic vs Global (global ~10% rẻ hơn, xử lý ở bất kỳ region); câu "input prompts and output results may be stored in the opt-in Regions for abuse detection purposes" | `evidence/E-28.png` chưa chụp | H1, H5 |
| E29 | Bedrock docs và FAQ: dữ liệu | https://docs.aws.amazon.com/bedrock/latest/userguide/data-protection.html, .../data-retention.html, .../abuse-detection.html, https://aws.amazon.com/bedrock/faqs/ | Câu "will not use any inputs to or outputs from Amazon Bedrock to train ... any third-party models" và "not shared with any model providers" (FAQ, Security); danh sách model bị lưu giữ ở abuse-detection (không có Haiku/Sonnet/Opus 5.5) | `evidence/E-29.png` chưa chụp | H5 |
| E30 | Bedrock API: Converse | https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html | Mục Response: `stopReason` (có `max_tokens`), `usage` (`inputTokens`, `outputTokens`, `cacheReadInputTokens`, `cacheWriteInputTokens`); `inferenceConfig.maxTokens` | `evidence/E-30.png` chưa chụp | Mục 2.2b, 2.2c |
| E31 | EC2 on-demand pricing | https://aws.amazon.com/ec2/pricing/on-demand/ | p4de.24xlarge, Asia Pacific (Singapore), Linux: 32,93646 USD/giờ; p4d.24xlarge 26,34917. **CHƯA CÓ BẰNG CHỨNG trên trang** (chỉ JSON) | `evidence/E-31.png` chưa chụp | Mục 4 |
| E32 | EC2 Reserved pricing | https://aws.amazon.com/ec2/pricing/reserved-instances/pricing/ | p4de.24xlarge, 1 năm, standard, No Upfront, Singapore: 20,88 USD/giờ. **CHƯA CÓ BẰNG CHỨNG trên trang** | `evidence/E-32.png` chưa chụp | Mục 4 |
| E33 | Bedrock pricing: DeepSeek, Qwen (Sydney) | https://aws.amazon.com/bedrock/pricing/ | DeepSeek V3.2 Sydney 0,6386 / 1,9055; Qwen3 235B Sydney 0,2266 / 0,9064 (trang đã hiển thị các số này khi đọc tự động) | `evidence/E-33.png` chưa chụp (chỉ dùng so sánh) | Mục 1.1, 2.2 (S4, S5) |
| E35 | LiteLLM docs | https://docs.litellm.ai/docs/proxy/virtual_keys, .../routing, .../enterprise | Virtual keys cần Postgres; fallbacks, retries, cooldown, Redis; SSO, audit log, guardrail theo key/team thuộc Enterprise | `evidence/E-35.png` chưa chụp | Mục 5 |
| E36 | Bedrock pricing: Nova Pro/Lite/Micro, Cohere Rerank 3.5, Guardrails | https://aws.amazon.com/bedrock/pricing/ | Giá Nova Pro 1,08/4,32; Cohere Rerank 3,5 $2,00/1.000 truy vấn; Guardrails 0,15/1K đơn vị. Chỉ nêu để so sánh | `evidence/E-36.png` chưa chụp (tùy chọn) | Mục 1.1, 1.2 |
| E38 | Bedrock docs: Quotas | https://docs.aws.amazon.com/bedrock/latest/userguide/quotas.html | Hạn mức token/phút mặc định của Claude 5.5. **CHƯA CÓ BẰNG CHỨNG** (chưa đọc trang) | `evidence/E-38.png` chưa chụp | Mục 5 |

Ghi chú: `docs/baogia-A.tsv` cột "Bằng chứng" đã có link, ngày, mã ảnh và mô tả cần chụp cho từng dòng. Các số chưa kèm ghi chú `CHƯA CÓ BẰNG CHỨNG` ở bảng trên đã thấy được trên trang chính thức khi đọc tự động (Cohere Embed ~$0,0001/1K; DeepSeek, Qwen Sydney).

TRẠNG THÁI: XONG

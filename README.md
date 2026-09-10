# Python AI Chatbox & Document Assistant (Google Gemini 2.5 Flash + test-ocr)

Ứng dụng chatbot AI viết bằng Python kết nối Google Gemini API (Model: `gemini-2.5-flash`), tích hợp trích xuất và đọc tài liệu đa định dạng (PDF text/scan, Word DOCX, Excel XLSX, Ảnh OCR) liên kết trực tiếp với thư viện xử lý từ `test-ocr`.

---

## ✨ Tính năng chính

1. **Trò chuyện thông minh (AI Chat)**: Trao đổi, hỏi đáp tự nhiên với Google Gemini 2.5 Flash bằng tiếng Việt.
2. **Upload & Đọc tài liệu đa định dạng**:
   - **PDF**: Hỗ trợ PDF kỹ thuật số (native text extraction) và PDF scan (EasyOCR fallback).
   - **Word**: Hỗ trợ `.docx` trích xuất cấu trúc đoạn, tiêu đề và bảng.
   - **Excel**: Hỗ trợ `.xlsx` trích xuất toàn bộ sheet, hàng, cột thành Markdown table.
   - **Ảnh**: Hỗ trợ `.png`, `.jpg`, `.jpeg`, `.webp`, `.bmp` qua EasyOCR + nhận diện bảng tự động bằng OpenCV.
   - **Text**: Hỗ trợ file `.txt`.
3. **Tóm tắt tài liệu chuyên sâu**: Tự động phân tích và tạo bản tóm tắt có cấu trúc:
   - 📌 **Tổng quan tài liệu**: Tên file, loại tài liệu, số trang/sheet.
   - 🎯 **Nội dung chính / Mục đích cốt lõi**.
   - 🔍 **Thông tin then chốt**: Các bên tham gia, giá trị/số tiền, ngày tháng, quyền và nghĩa vụ chính.
   - 📊 **Dữ liệu bảng biểu** (nếu có).
   - ⚠️ **Lưu ý / Rủi ro quan trọng**.
4. **Hỏi đáp theo ngữ cảnh tài liệu (Document Q&A)**: Sau khi tải lên tài liệu, người dùng có thể đặt các câu hỏi chi tiết về nội dung hoặc bảng biểu, AI sẽ dựa trên dữ liệu đã trích xuất để trả lời chính xác.

---

## 📁 Cấu trúc thư mục

```
test-chatbox/
├── main.py               # Giao diện dòng lệnh CLI tương tác
├── chat_service.py       # Điều phối logic chat, upload và memory
├── document_service.py   # Cầu nối tích hợp xử lý đọc tài liệu từ test-ocr
├── ai_service.py         # Kết nối Gemini API & hàm tóm tắt chuyên sâu
├── memory.py             # Lưu trữ lịch sử hội thoại & ngữ cảnh trong RAM
├── config.py             # Cấu hình biến môi trường và thư mục liên kết
├── requirements.txt      # Các thư viện phụ thuộc
├── uploads/              # Thư mục chứa các file tải lên
└── .env                  # Cấu hình API Key & Model
```

---

## 🚀 Cài đặt & Sử dụng

### 1. Cài đặt thư viện:
```bash
pip install -r requirements.txt
```

### 2. Cấu hình API Key trong file `.env`:
```env
GEMINI_API_KEY=AIzaSy...
MODEL_NAME=gemini-2.5-flash
```
*(Lấy API Key miễn phí tại: https://aistudio.google.com/apikey)*

### 3. Chạy ứng dụng:
```bash
python main.py
```

---

## 💡 Hướng dẫn sử dụng trong CLI

- **Tải lên & Tóm tắt tài liệu**:
  ```text
  Bạn: upload doc/hop_dong/hop_dong_mua_ban_tai_san.pdf
  Bạn: upload "D:\tailieu\hoa_don.png" hãy chú ý tổng tiền và thuế VAT
  ```
  *Hoặc kéo & thả file trực tiếp vào cửa sổ terminal rồi nhấn Enter.*

- **Hỏi đáp chi tiết về tài liệu vừa upload**:
  ```text
  Bạn: Bên A và Bên B trong hợp đồng là ai?
  Bạn: Tổng số tiền phải thanh toán là bao nhiêu?
  ```

- **Các lệnh khác**:
  - `files` : Xem danh sách các file tài liệu có sẵn
  - `clear` : Xóa lịch sử trò chuyện và ngữ cảnh tài liệu
  - `help`  : Xem hướng dẫn chi tiết
  - `exit`  : Thoát chương trình
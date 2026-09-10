import os
import sys
import shutil
from config import TEST_OCR_DIR, UPLOAD_DIR

# Thêm đường dẫn test-ocr vào sys.path để liên kết logic xử lý OCR & đọc tài liệu
if TEST_OCR_DIR not in sys.path and os.path.exists(TEST_OCR_DIR):
    sys.path.insert(0, TEST_OCR_DIR)

try:
    from document_reader import read_document
    from document_classifier import classify_document
except ImportError as e:
    read_document = None
    classify_document = None
    print(f"[DocumentService] Cảnh báo: Không thể import test-ocr ({e}). Vui lòng kiểm tra đường dẫn TEST_OCR_DIR.")

SUPPORTED_EXTENSIONS = {
    '.pdf', '.docx', '.xlsx', '.png', '.jpg', '.jpeg', '.webp', '.bmp', '.txt'
}


class DocumentService:
    """
    Service cầu nối giữa test-chatbox và test-ocr để trích xuất văn bản, bảng biểu và phân loại tài liệu.
    """

    @staticmethod
    def is_supported_file(file_path: str) -> bool:
        ext = os.path.splitext(file_path)[1].lower()
        return ext in SUPPORTED_EXTENSIONS

    @staticmethod
    def resolve_file_path(input_path: str) -> str:
        """
        Xử lý và chuẩn hóa đường dẫn file đầu vào:
        - Bỏ dấu nháy kép / nháy đơn (khi kéo thả từ file explorer vào terminal)
        - Tìm kiếm trong đường dẫn tuyệt đối / tương đối
        - Tìm kiếm kết hợp với TEST_OCR_DIR (ví dụ doc/..., input/...)
        - Tìm kiếm trong thư mục uploads/ hoặc test-ocr/doc/
        """
        clean_path = input_path.strip().strip('"\'')
        
        # 1. Kiểm tra trực tiếp đường dẫn tương đối với cwd hoặc tuyệt đối
        if os.path.isfile(clean_path):
            return os.path.abspath(clean_path)

        # 2. Kiểm tra tương đối với TEST_OCR_DIR (ví dụ: doc/hop_dong/xyz.pdf)
        test_ocr_rel = os.path.join(TEST_OCR_DIR, clean_path)
        if os.path.isfile(test_ocr_rel):
            return os.path.abspath(test_ocr_rel)
            
        # 3. Kiểm tra trong UPLOAD_DIR
        upload_path = os.path.join(UPLOAD_DIR, clean_path)
        if os.path.isfile(upload_path):
            return os.path.abspath(upload_path)

        # 4. Tìm kiếm theo tên file trong thư mục test-ocr/doc/ và test-ocr/input/
        target_name = os.path.basename(clean_path)
        for search_root in [os.path.join(TEST_OCR_DIR, "doc"), os.path.join(TEST_OCR_DIR, "input"), UPLOAD_DIR]:
            if os.path.exists(search_root):
                for root, _, files in os.walk(search_root):
                    if target_name in files:
                        return os.path.abspath(os.path.join(root, target_name))
                    for f in files:
                        if f.lower() == target_name.lower():
                            return os.path.abspath(os.path.join(root, f))

        raise FileNotFoundError(f"Không tìm thấy file: '{clean_path}'")

    @staticmethod
    def copy_to_uploads(source_path: str) -> str:
        """
        Sao chép file vào thư mục UPLOAD_DIR nếu chưa nằm trong đó.
        """
        filename = os.path.basename(source_path)
        dest_path = os.path.join(UPLOAD_DIR, filename)
        if os.path.abspath(source_path) != os.path.abspath(dest_path):
            shutil.copy2(source_path, dest_path)
        return dest_path

    def process_file(self, file_path: str) -> dict:
        """
        Đọc và trích xuất dữ liệu từ file sử dụng pipeline từ test-ocr.
        """
        real_path = self.resolve_file_path(file_path)
        filename = os.path.basename(real_path)
        ext = os.path.splitext(real_path)[1].lower()

        if not self.is_supported_file(real_path):
            raise ValueError(f"Định dạng file '{ext}' không được hỗ trợ. Các định dạng hợp lệ: {', '.join(sorted(SUPPORTED_EXTENSIONS))}")

        # Xử lý file .txt thuần túy
        if ext == '.txt':
            with open(real_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            return {
                "original_filename": filename,
                "file_path": real_path,
                "document_type": "text",
                "source_type": "plain_text",
                "extraction_method": "direct_read",
                "category": "van_ban",
                "has_table": False,
                "total_pages": 1,
                "full_text": content,
                "tables": [],
                "pages": [{"page": 1, "text": content}]
            }

        # Gọi logic xử lý từ test-ocr
        if read_document is None:
            raise RuntimeError("Module 'document_reader' từ test-ocr chưa được tải thành công!")

        doc_result = read_document(real_path)

        # Phân loại tài liệu nếu có module classify_document
        if classify_document:
            try:
                category, cat_conf = classify_document(real_path)
                doc_result["category"] = category
                doc_result["category_confidence"] = cat_conf
            except Exception:
                doc_result["category"] = "khac"

        return doc_result

    @staticmethod
    def format_document_context(doc_result: dict) -> str:
        """
        Định dạng kết quả trích xuất thành chuỗi ngữ cảnh chi tiết cho AI phân tích và tóm tắt.
        """
        filename = doc_result.get("original_filename", "Tài liệu")
        doc_type = doc_result.get("document_type", "Chưa xác định")
        source_type = doc_result.get("source_type", "Chưa xác định")
        extraction_method = doc_result.get("extraction_method", "Chưa xác định")
        category = doc_result.get("category", "Tài liệu chung")
        total_pages = doc_result.get("total_pages", 1)
        full_text = doc_result.get("full_text", "").strip()
        tables = doc_result.get("tables", [])

        context_lines = [
            f"=== THÔNG TIN TÀI LIỆU ===",
            f"- Tên file: {filename}",
            f"- Danh mục phân loại: {category}",
            f"- Định dạng: {doc_type} (Nguồn: {source_type}, Phương pháp đọc: {extraction_method})",
            f"- Số trang/sheet: {total_pages}",
            f"- Có bảng biểu: {'Có (' + str(len(tables)) + ' bảng)' if tables else 'Không'}",
            ""
        ]

        if tables:
            context_lines.append("=== CẤU TRÚC BẢNG TRÍCH XUẤT TỪ TÀI LIỆU ===")
            for idx, tbl in enumerate(tables, 1):
                page_info = f"Trang {tbl.get('page')}" if 'page' in tbl else f"Sheet: {tbl.get('sheet_name', '')}"
                context_lines.append(f"\n[Bảng {idx} - {page_info}]")
                context_lines.append(tbl.get("markdown", ""))
            context_lines.append("")

        context_lines.append("=== NỘI DUNG VĂN BẢN TRÍCH XUẤT ===")
        context_lines.append(full_text if full_text else "(Không có nội dung văn bản nào được trích xuất)")

        return "\n".join(context_lines)

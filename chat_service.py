from memory import ChatMemory
from ai_service import AIService
from document_service import DocumentService


class ChatService:

    def __init__(self):
        self.memory = ChatMemory()
        self.ai = AIService()
        self.doc_service = DocumentService()
        self.last_doc_result: dict | None = None  # Lưu kết quả trích xuất tài liệu gần nhất

    def send_message(self, message: str) -> str:
        """
        Gửi tin nhắn trò chuyện thông thường hoặc câu hỏi tiếp nối về tài liệu.
        """
        # Lưu câu hỏi của user
        self.memory.add_user_message(message)

        # Lấy toàn bộ lịch sử hội thoại (kèm ngữ cảnh tài liệu nếu đã upload)
        messages = self.memory.get_messages()

        # Gọi AI
        answer = self.ai.chat(messages)

        # Lưu câu trả lời của AI
        self.memory.add_assistant_message(answer)

        return answer

    def upload_and_summarize(self, file_path: str, user_instruction: str = None) -> tuple[str, dict]:
        """
        Xử lý đọc tài liệu qua test-ocr, tóm tắt bằng AI và lưu ngữ cảnh vào bộ nhớ hội thoại.
        """
        # 1. Đọc và trích xuất nội dung từ tài liệu (sử dụng test-ocr)
        doc_result = self.doc_service.process_file(file_path)

        # Lưu bản sao vào thư mục uploads
        try:
            self.doc_service.copy_to_uploads(doc_result.get("file_path", file_path))
        except Exception:
            pass

        # 2. Định dạng ngữ cảnh tài liệu
        doc_context = self.doc_service.format_document_context(doc_result)

        # 3. Tạo bản tóm tắt bằng AI
        summary = self.ai.summarize_document(doc_context, user_instruction)

        # 4. Lưu ngữ cảnh tài liệu & bản tóm tắt vào ChatMemory để hỗ trợ hỏi đáp tiếp nối
        filename = doc_result.get("original_filename", "Tài liệu")
        context_prompt = (
            f"[HỆ THỐNG]: Người dùng vừa tải lên tài liệu '{filename}'. "
            f"Dưới đây là toàn bộ nội dung và bảng biểu đã trích xuất từ tài liệu này:\n\n"
            f"{doc_context}\n\n"
            f"Hãy ghi nhớ nội dung tài liệu này để trả lời các câu hỏi tiếp theo của người dùng."
        )

        user_req_text = f"Tải lên và tóm tắt tài liệu: {filename}"
        if user_instruction:
            user_req_text += f" (Yêu cầu thêm: {user_instruction})"

        self.memory.add_user_message(f"{context_prompt}\n\n{user_req_text}")
        self.memory.add_assistant_message(summary)

        # Lưu doc_result để các endpoint khác có thể truy cập
        self.last_doc_result = doc_result

        return summary, doc_result

    def clear_history(self):
        """
        Xóa toàn bộ lịch sử hội thoại và ngữ cảnh tài liệu hiện tại trong RAM.
        """
        self.memory.clear()
        self.last_doc_result = None

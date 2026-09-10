import os
import sys
from chat_service import ChatService
from document_service import SUPPORTED_EXTENSIONS
from config import UPLOAD_DIR, TEST_OCR_DIR

sys.stdout.reconfigure(encoding='utf-8')


def print_banner():
    print("=" * 65)
    print("           PYTHON AI CHATBOX & DOCUMENT ASSISTANT")
    print("      (Tích hợp Trích xuất OCR đa định dạng + Gemini AI)")
    print("=" * 65)
    print("💡 Hướng dẫn nhanh:")
    print(" • Nhập câu hỏi bình thường để trò chuyện với AI")
    print(" • Nhập 'upload <đường_dẫn>' hoặc kéo thả file vào đây để tóm tắt")
    print(" • Nhập 'files' để duyệt danh sách tài liệu mẫu có sẵn")
    print(" • Nhập 'clear' để xóa lịch sử hội thoại")
    print(" • Nhập 'help' để xem hướng dẫn chi tiết | 'exit' để thoát")
    print("=" * 65)
    print()


def print_help():
    print("\n" + "-" * 60)
    print("📖 BẢNG HƯỚNG DẪN SỬ DỤNG")
    print("-" * 60)
    print("1. Trò chuyện:")
    print("   Nhập bất kỳ câu hỏi nào để trao đổi với AI.")
    print("\n2. Upload và Tóm tắt tài liệu:")
    print("   - Cú pháp: upload <đường_dẫn_file> [yêu cầu tóm tắt thêm]")
    print("     Ví dụ: upload doc/hop_dong/hop_dong_mua_ban_tai_san.pdf")
    print("     Ví dụ: upload \"D:\\tailieu\\hoadon.png\" hãy chú ý phần thuế VAT")
    print("   - Kéo & thả file trực tiếp vào cửa sổ dòng lệnh và ấn Enter.")
    print("   - Định dạng hỗ trợ: PDF (.pdf), Word (.docx), Excel (.xlsx), Ảnh (.png, .jpg, .jpeg, .webp, .bmp), Text (.txt)")
    print("\n3. Hỏi đáp tiếp nối sau khi upload:")
    print("   Sau khi upload tài liệu, toàn bộ dữ liệu đã được nạp vào ngữ cảnh.")
    print("   Bạn có thể hỏi ngay: 'Bên B phải thanh toán bao nhiêu?', 'Thời hạn hợp đồng là khi nào?'...")
    print("\n4. Các lệnh quản lý:")
    print("   - files : Xem danh sách file tài liệu có sẵn trong test-ocr và uploads/")
    print("   - clear : Xóa lịch sử trò chuyện và ngữ cảnh tài liệu hiện tại")
    print("   - exit  : Thoát chương trình")
    print("-" * 60 + "\n")


def list_available_files():
    print("\n📁 DANH SÁCH FILE CÓ SẴN:")
    found_any = False
    
    # Check uploads directory
    if os.path.exists(UPLOAD_DIR):
        up_files = [f for f in os.listdir(UPLOAD_DIR) if os.path.isfile(os.path.join(UPLOAD_DIR, f))]
        if up_files:
            print(" [Thư mục uploads/]:")
            for f in up_files:
                print(f"   • {os.path.join('uploads', f)}")
            found_any = True

    # Check test-ocr/doc directory
    doc_dir = os.path.join(TEST_OCR_DIR, "doc")
    if os.path.exists(doc_dir):
        print(" [Thư mục test-ocr/doc/]:")
        for root, _, files in os.walk(doc_dir):
            rel_root = os.path.relpath(root, TEST_OCR_DIR)
            doc_files = [f for f in files if os.path.splitext(f)[1].lower() in SUPPORTED_EXTENSIONS]
            for f in doc_files:
                print(f"   • {os.path.join(rel_root, f)}")
                found_any = True

    if not found_any:
        print("   (Chưa có file nào. Hãy copy file vào thư mục 'uploads/' hoặc dùng lệnh 'upload <đường_dẫn>')")
    print()


def is_direct_file_path(text: str) -> bool:
    clean = text.strip().strip('"\'')
    ext = os.path.splitext(clean)[1].lower()
    if ext in SUPPORTED_EXTENSIONS:
        return True
    return False


def handle_upload(chat: ChatService, command_args: str):
    """
    Xử lý upload và tóm tắt file.
    Hỗ trợ format:
    - upload <path>
    - upload "<path>" <yêu cầu bổ sung>
    """
    args = command_args.strip()
    if not args:
        print("\n⚠️ Vui lòng cung cấp đường dẫn file! Ví dụ: upload doc/hop_dong/hop_dong_mua_ban.pdf\n")
        return

    # Tách đường dẫn file và yêu cầu kèm theo (nếu có)
    file_path = ""
    instruction = ""

    if args.startswith('"'):
        end_idx = args.find('"', 1)
        if end_idx != -1:
            file_path = args[1:end_idx]
            instruction = args[end_idx + 1:].strip()
        else:
            file_path = args.strip('"')
    elif args.startswith("'"):
        end_idx = args.find("'", 1)
        if end_idx != -1:
            file_path = args[1:end_idx]
            instruction = args[end_idx + 1:].strip()
        else:
            file_path = args.strip("'")
    else:
        parts = args.split(maxsplit=1)
        file_path = parts[0]
        if len(parts) > 1:
            instruction = parts[1]

    print(f"\n⏳ [1/2] Đang đọc & trích xuất nội dung từ '{os.path.basename(file_path)}' (kết nối test-ocr)...")
    try:
        summary, doc_result = chat.upload_and_summarize(file_path, user_instruction=instruction)
        
        has_table_str = f"Có ({len(doc_result.get('tables', []))} bảng)" if doc_result.get('has_table') else "Không"
        print(f"✓ Trích xuất thành công! (Loại: {doc_result.get('document_type')}, Số trang: {doc_result.get('total_pages', 1)}, Bảng: {has_table_str})")
        print("⏳ [2/2] Đang tạo bản tóm tắt phân tích bằng Gemini AI...\n")
        print("=" * 60)
        print(f"📄 KẾT QUẢ TÓM TẮT: {doc_result.get('original_filename')}")
        print("=" * 60)
        print(summary)
        print("=" * 60)
        print("💡 Ngữ cảnh tài liệu đã được lưu vào bộ nhớ. Bạn có thể đặt câu hỏi chi tiết về tài liệu này ngay bây giờ!\n")

    except Exception as e:
        print(f"\n❌ Lỗi khi xử lý file: {e}\n")


def main():
    chat = ChatService()
    print_banner()

    while True:
        try:
            user_input = input("Bạn: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nĐã thoát.")
            break

        if not user_input:
            continue

        lower_input = user_input.lower()

        if lower_input in ("exit", "quit", "thoat", "thoát"):
            print("Cảm ơn bạn đã sử dụng Python AI Chatbox. Tạm biệt!")
            break

        if lower_input in ("clear", "xoa", "xóa"):
            chat.clear_history()
            print("✓ Đã xóa toàn bộ lịch sử hội thoại và ngữ cảnh tài liệu.\n")
            continue

        if lower_input in ("help", "hdsd", "?", "/help"):
            print_help()
            continue

        if lower_input in ("files", "file", "list", "/files"):
            list_available_files()
            continue

        # Kiểm tra nếu người dùng dùng lệnh upload / /upload / doc / tóm tắt
        if lower_input.startswith(("upload ", "/upload ", "doc ", "/doc ", "tomtat ", "tóm tắt ")):
            prefix_len = user_input.find(" ")
            args = user_input[prefix_len + 1:].strip()
            handle_upload(chat, args)
            continue

        # Kiểm tra nếu người dùng dán hoặc kéo thả trực tiếp một đường dẫn file hợp lệ
        if is_direct_file_path(user_input):
            handle_upload(chat, user_input)
            continue

        # Xử lý tin nhắn chat thông thường
        try:
            print("\nAI đang suy nghĩ...")
            answer = chat.send_message(user_input)
            print(f"\nAI: {answer}\n")
        except Exception as e:
            print(f"\nLỗi khi trò chuyện: {e}\n")


if __name__ == "__main__":
    main()

import os
import sys
import shutil

# Đảm bảo console và server luôn encode UTF-8 khi in ký tự tiếng Việt
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from chat_service import ChatService
from document_service import SUPPORTED_EXTENSIONS
from config import UPLOAD_DIR, TEST_OCR_DIR

app = FastAPI(
    title="AI Document Chatbox API",
    description="Backend API kết nối Gemini AI & OCR Document Extraction từ test-ocr",
    version="1.0.0"
)

# Kích hoạt CORS cho frontend React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Đảm bảo mọi lỗi không xử lý đều trả về JSON thay vì HTML."""
    import traceback
    tb = traceback.format_exc()
    print(f"[GlobalExceptionHandler] Lỗi không xử lý trên {request.url}:\n{tb}")
    return JSONResponse(
        status_code=500,
        content={"status": "error", "detail": str(exc)}
    )

# Khởi tạo singleton ChatService cho phiên làm việc
chat_service = ChatService()


class ChatRequest(BaseModel):
    message: str


class SelectFileRequest(BaseModel):
    file_path: str
    instruction: Optional[str] = None


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "AI Document Chatbox API"}


@app.get("/api/history")
def get_history():
    return {
        "status": "success",
        "messages": chat_service.memory.get_messages()
    }


@app.post("/api/clear")
def clear_history():
    chat_service.clear_history()
    return {
        "status": "success",
        "message": "Đã xóa toàn bộ lịch sử và ngữ cảnh tài liệu."
    }


@app.get("/api/doc-result")
def get_doc_result():
    """
    Trả về doc_result (bao gồm pages với elements) của tài liệu đang được đối thoại.
    Frontend dùng để render văn bản gốc có cấu trúc ngay trong chat.
    """
    if chat_service.last_doc_result is None:
        return {"status": "empty", "doc_result": None}
    return {"status": "success", "doc_result": chat_service.last_doc_result}



@app.post("/api/chat")
def send_chat(request: ChatRequest):
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Tin nhắn không được để trống.")
    
    try:
        answer = chat_service.send_message(request.message)
        return {
            "status": "success",
            "answer": answer,
            "messages": chat_service.memory.get_messages()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/upload")
async def upload_document(
    file: UploadFile = File(...),
    instruction: Optional[str] = Form(None)
):
    try:
        # Kiểm tra đuôi file
        filename = file.filename
        ext = os.path.splitext(filename)[1].lower()
        if ext not in SUPPORTED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Định dạng file '{ext}' không được hỗ trợ. Các định dạng hợp lệ: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
            )

        # Lưu file vào thư mục uploads
        save_path = os.path.join(UPLOAD_DIR, filename)
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Đọc & Tóm tắt tài liệu
        summary, doc_result = chat_service.upload_and_summarize(save_path, user_instruction=instruction)

        return {
            "status": "success",
            "filename": filename,
            "summary": summary,
            "doc_result": doc_result,
            "messages": chat_service.memory.get_messages()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/select-file")
def select_existing_file(request: SelectFileRequest):
    try:
        summary, doc_result = chat_service.upload_and_summarize(
            request.file_path,
            user_instruction=request.instruction
        )
        return {
            "status": "success",
            "filename": doc_result.get("original_filename", os.path.basename(request.file_path)),
            "summary": summary,
            "doc_result": doc_result,
            "messages": chat_service.memory.get_messages()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/files")
def list_available_files():
    """
    Trả về danh sách file mẫu trong test-ocr/doc và uploads/ để người dùng chọn nhanh.
    """
    file_list = []

    # 1. Quét thư mục uploads/
    if os.path.exists(UPLOAD_DIR):
        for f in os.listdir(UPLOAD_DIR):
            fp = os.path.join(UPLOAD_DIR, f)
            if os.path.isfile(fp):
                ext = os.path.splitext(f)[1].lower()
                if ext in SUPPORTED_EXTENSIONS:
                    file_list.append({
                        "name": f,
                        "path": os.path.join("uploads", f),
                        "absolute_path": fp,
                        "category": "uploads",
                        "size": os.path.getsize(fp),
                        "extension": ext
                    })

    # 2. Quét thư mục test-ocr/doc/
    doc_dir = os.path.join(TEST_OCR_DIR, "doc")
    if os.path.exists(doc_dir):
        for root, _, files in os.walk(doc_dir):
            rel_folder = os.path.relpath(root, doc_dir)
            category_name = rel_folder if rel_folder != "." else "doc"
            for f in files:
                ext = os.path.splitext(f)[1].lower()
                if ext in SUPPORTED_EXTENSIONS:
                    fp = os.path.join(root, f)
                    file_list.append({
                        "name": f,
                        "path": os.path.join("doc", rel_folder, f) if rel_folder != "." else os.path.join("doc", f),
                        "absolute_path": fp,
                        "category": category_name,
                        "size": os.path.getsize(fp),
                        "extension": ext
                    })

    return {
        "status": "success",
        "total": len(file_list),
        "files": file_list
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True, timeout_keep_alive=120)

import React, { useRef } from 'react';
import { 
  Sparkles, 
  UploadCloud, 
  FileText, 
  Trash2, 
  FileSpreadsheet, 
  Image as ImageIcon, 
  CheckCircle2, 
  Layers,
  ChevronLeft
} from 'lucide-react';

export default function Sidebar({ 
  collapsed, 
  onToggle, 
  onFileUpload, 
  onSelectFile, 
  onClearChat, 
  filesList, 
  isUploading,
  activeDoc
}) {
  const fileInputRef = useRef(null);

  const getFileBadge = (ext) => {
    switch (ext) {
      case '.pdf':
        return <span className="file-icon-badge file-icon-pdf">PDF</span>;
      case '.docx':
        return <span className="file-icon-badge file-icon-docx">DOC</span>;
      case '.xlsx':
        return <span className="file-icon-badge file-icon-xlsx">XLS</span>;
      case '.png':
      case '.jpg':
      case '.jpeg':
      case '.webp':
      case '.bmp':
        return <span className="file-icon-badge file-icon-img">IMG</span>;
      default:
        return <span className="file-icon-badge">TXT</span>;
    }
  };

  const handleBoxClick = () => {
    if (fileInputRef.current && !isUploading) {
      fileInputRef.current.click();
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files[0]);
      e.target.value = '';
    }
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Header */}
      <div className="sidebar-header">
        <div className="brand">
          <div className="brand-icon">
            <Sparkles size={20} />
          </div>
          <div>
            <h1 className="brand-title">DocuMind</h1>
            <span className="brand-tag">OCR + Gemini</span>
          </div>
        </div>
        <button className="icon-btn" onClick={onToggle} title="Thu gọn sidebar">
          <ChevronLeft size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="sidebar-content">
        {/* Upload Action */}
        <div>
          <div className="section-label">
            <UploadCloud size={14} />
            <span>Tải lên tài liệu</span>
          </div>
          <div 
            className="upload-action-box" 
            onClick={handleBoxClick}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleInputChange}
              accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.webp,.bmp,.txt"
            />
            <div className="upload-icon-wrapper">
              <UploadCloud size={20} />
            </div>
            <div className="upload-title">
              {isUploading ? 'Đang trích xuất OCR...' : 'Chọn hoặc Kéo thả file'}
            </div>
            <div className="upload-subtitle">
              PDF, Word, Excel, Ảnh hóa đơn/chứng từ
            </div>
          </div>
        </div>

        {/* Available / Sample Files */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="section-label">
            <Layers size={14} />
            <span>Tài liệu mẫu & Đã tải lên ({filesList.length})</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '380px' }}>
            {filesList.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.75rem', padding: '20px' }}>
                Đang quét danh sách file...
              </div>
            ) : (
              filesList.map((file, idx) => (
                <div 
                  key={idx} 
                  className={`file-item ${activeDoc?.original_filename === file.name ? 'active' : ''}`}
                  onClick={() => onSelectFile(file.path)}
                  title={`Click để tóm tắt: ${file.name}`}
                >
                  <div className="file-info">
                    {getFileBadge(file.extension)}
                    <div>
                      <div className="file-name">{file.name}</div>
                      <div className="file-category">
                        {file.category} • {(file.size / 1024).toFixed(0)} KB
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <button className="btn-secondary" onClick={onClearChat} title="Xóa toàn bộ hội thoại và ngữ cảnh">
          <Trash2 size={15} />
          <span>Xóa lịch sử trò chuyện</span>
        </button>
        <div className="system-status">
          <div className="status-indicator">
            <span className="status-dot"></span>
            <span>Gemini 2.5 Flash + test-ocr</span>
          </div>
          <span>Sẵn sàng</span>
        </div>
      </div>
    </aside>
  );
}

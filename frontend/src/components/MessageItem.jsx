import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, FileText, ExternalLink, Copy, Check } from 'lucide-react';

export default function MessageItem({ message, onOpenDocInspector }) {
  const isAi = message.role === 'assistant';
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Kiểm tra nếu tin nhắn có đính kèm metadata tài liệu
  const docMeta = message.docResult;

  // Lọc bỏ prefix [HỆ THỐNG] nếu là tin nhắn hệ thống nội bộ
  let displayContent = message.content;
  if (!isAi && displayContent.includes('[HỆ THỐNG]:')) {
    const parts = displayContent.split('\n\n');
    displayContent = parts.slice(1).join('\n\n') || displayContent;
  }

  return (
    <div className={`message-bubble ${isAi ? 'ai' : 'user'}`}>
      <div className={`avatar ${isAi ? 'ai' : 'user'}`}>
        {isAi ? <Bot size={20} /> : <User size={20} />}
      </div>

      <div className="message-content-wrapper">
        <div className="message-card">
          {/* Document Attachment Badge */}
          {docMeta && (
            <div className="doc-card-badge">
              <FileText size={24} color="var(--accent-cyan)" />
              <div className="doc-badge-details">
                <div className="doc-badge-title">{docMeta.original_filename || 'Tài liệu'}</div>
                <div className="doc-badge-sub">
                  {docMeta.document_type?.toUpperCase()} • {docMeta.total_pages || 1} trang
                  {docMeta.tables && docMeta.tables.length > 0 && ` • ${docMeta.tables.length} bảng biểu`}
                </div>
              </div>
              {onOpenDocInspector && (
                <button 
                  className="icon-btn" 
                  onClick={() => onOpenDocInspector(docMeta)} 
                  title="Xem chi tiết trích xuất & Bảng"
                >
                  <ExternalLink size={16} />
                </button>
              )}
            </div>
          )}

          {/* Markdown Content */}
          <div className="markdown-body">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({ node, ...props }) => (
                  <div className="table-wrapper">
                    <table {...props} />
                  </div>
                ),
              }}
            >
              {displayContent}
            </ReactMarkdown>
          </div>
        </div>

        {/* Message Meta Info */}
        <div className="message-meta">
          <span>{isAi ? 'DocuMind AI' : 'Bạn'}</span>
          <span>•</span>
          <span>{message.time || 'Vừa xong'}</span>
          {isAi && (
            <button 
              onClick={handleCopy} 
              style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
              title="Sao chép nội dung"
            >
              {copied ? <Check size={12} color="var(--accent-emerald)" /> : <Copy size={12} />}
              <span style={{ fontSize: '0.68rem' }}>{copied ? 'Đã sao chép' : 'Copy'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

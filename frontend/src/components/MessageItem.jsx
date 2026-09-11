import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, FileText, ExternalLink, Copy, Check, ChevronDown, ChevronUp, AlignJustify } from 'lucide-react';

// ─── Render từng element văn bản theo type ────────────────────────────────────
function DocElement({ el, idx }) {
  if (!el || !el.text) return null;

  if (el.type === 'heading') {
    return (
      <div style={{
        fontWeight: 700,
        fontSize: '0.83rem',
        color: '#f1f5f9',
        letterSpacing: '0.03em',
        marginTop: '16px',
        marginBottom: '5px',
        textAlign: 'center',
        lineHeight: 1.5,
        fontFamily: "'Times New Roman', 'Georgia', serif",
      }}>
        {el.text}
      </div>
    );
  }

  if (el.type === 'list') {
    const cleanText = el.text
      .replace(/^[•\-\*\+]\s+/, '')
      .replace(/^\d+\.\d+(\.\d+)?\s+/, '')
      .replace(/^[a-z]\)\s+/, '');
    return (
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        paddingLeft: '18px',
        marginBottom: '3px',
        lineHeight: 1.7,
        fontFamily: "'Times New Roman', 'Georgia', serif",
      }}>
        <span style={{ color: 'var(--accent-cyan)', flexShrink: 0, marginTop: '3px', fontSize: '0.65rem' }}>•</span>
        <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>{cleanText}</span>
      </div>
    );
  }

  if (el.type === 'table') {
    return (
      <div style={{ margin: '8px 0', fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', paddingLeft: '4px' }}>
        [Bảng — xem ở tab Bảng biểu]
      </div>
    );
  }

  // paragraph
  return (
    <div style={{
      fontSize: '0.8rem',
      color: '#cbd5e1',
      lineHeight: 1.8,
      marginBottom: '2px',
      textAlign: 'justify',
      wordBreak: 'break-word',
      fontFamily: "'Times New Roman', 'Georgia', serif",
    }}>
      {el.text}
    </div>
  );
}

// ─── Inline full-text viewer (expand trong chat) ──────────────────────────────
function InlineDocViewer({ docResult }) {
  const pages = docResult?.pages || [];
  const hasPages = pages.length > 0 && pages.some(p => p.elements?.length > 0);

  if (!hasPages) {
    // Fallback: plain text
    return (
      <div style={{
        background: 'rgba(0,0,0,0.35)',
        borderRadius: '8px',
        padding: '14px',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.75rem',
        color: '#cbd5e1',
        whiteSpace: 'pre-wrap',
        maxHeight: '500px',
        overflowY: 'auto',
        border: '1px solid var(--border-glass)',
      }}>
        {docResult?.full_text || '(Không có văn bản nào được trích xuất)'}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {pages.map((page, pi) => {
        const elements = page.elements || [];
        const methodLabel = page.method === 'ocr'
          ? `OCR${page.confidence != null ? ` ${page.confidence}%` : ''}`
          : 'Native Text';

        return (
          <div key={pi}>
            {/* Page divider */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              marginBottom: '10px', paddingBottom: '6px',
              borderBottom: '1px solid var(--border-glass)',
            }}>
              <span style={{
                fontSize: '0.68rem', fontWeight: 700,
                color: 'var(--accent-cyan)',
                background: 'rgba(56,189,248,0.10)',
                borderRadius: '4px', padding: '2px 8px',
                letterSpacing: '0.04em',
              }}>
                Trang {page.page}
              </span>
              <span style={{ fontSize: '0.63rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                {methodLabel}
              </span>
            </div>

            {/* Page body */}
            <div style={{
              background: 'rgba(248,250,252,0.03)',
              borderRadius: '8px',
              border: '1px solid var(--border-glass)',
              padding: '16px 20px',
            }}>
              {elements.length === 0 ? (
                <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', fontStyle: 'italic' }}>
                  (Trang trống)
                </div>
              ) : (
                elements.map((el, ei) => <DocElement key={ei} el={el} idx={ei} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main MessageItem ─────────────────────────────────────────────────────────
export default function MessageItem({ message, onOpenDocInspector }) {
  const isAi = message.role === 'assistant';
  const [copied, setCopied] = React.useState(false);
  const [showFullText, setShowFullText] = React.useState(false);
  const [fullDocResult, setFullDocResult] = React.useState(null);
  const [loadingDoc, setLoadingDoc] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleFullText = async () => {
    if (showFullText) {
      setShowFullText(false);
      return;
    }

    // Nếu đã có data thì chỉ cần toggle
    if (fullDocResult) {
      setShowFullText(true);
      return;
    }

    // Lấy doc_result từ server (có pages.elements đầy đủ)
    setLoadingDoc(true);
    try {
      const docResultSource = message.docResult;
      if (docResultSource?.pages) {
        // Đã có pages trong message
        setFullDocResult(docResultSource);
      } else {
        // Fetch từ /api/doc-result
        const res = await fetch('/api/doc-result');
        const data = await res.json();
        if (data.status === 'success' && data.doc_result) {
          setFullDocResult(data.doc_result);
        } else {
          setFullDocResult(docResultSource || null);
        }
      }
      setShowFullText(true);
    } catch {
      setFullDocResult(message.docResult || null);
      setShowFullText(true);
    } finally {
      setLoadingDoc(false);
    }
  };

  // Lọc bỏ prefix [HỆ THỐNG] nếu là tin nhắn hệ thống nội bộ
  const docMeta = message.docResult;
  let displayContent = message.content;
  if (!isAi && displayContent.includes('[HỆ THỐNG]:')) {
    const parts = displayContent.split('\n\n');
    displayContent = parts.slice(1).join('\n\n') || displayContent;
  }

  // Xác định xem message này có thể xem văn bản gốc không
  const canShowFullText = isAi && docMeta;

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

          {/* ── Inline Full Text Viewer ── */}
          {canShowFullText && (
            <div style={{ marginTop: '12px' }}>
              <button
                onClick={handleToggleFullText}
                disabled={loadingDoc}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: showFullText
                    ? 'rgba(56,189,248,0.15)'
                    : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${showFullText ? 'var(--accent-cyan)' : 'var(--border-glass)'}`,
                  borderRadius: '6px',
                  padding: '5px 12px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: showFullText ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  cursor: loadingDoc ? 'wait' : 'pointer',
                  transition: 'all 0.2s',
                }}
                title={showFullText ? 'Ẩn văn bản gốc' : 'Xem toàn bộ văn bản gốc có định dạng'}
              >
                <AlignJustify size={13} />
                <span>
                  {loadingDoc ? 'Đang tải...' : showFullText ? 'Ẩn văn bản gốc' : 'Văn bản gốc'}
                </span>
                {!loadingDoc && (showFullText ? <ChevronUp size={13} /> : <ChevronDown size={13} />)}
              </button>

              {showFullText && fullDocResult && (
                <div style={{
                  marginTop: '12px',
                  maxHeight: '600px',
                  overflowY: 'auto',
                  borderRadius: '10px',
                  border: '1px solid var(--border-glass)',
                  padding: '16px',
                  background: 'rgba(0,0,0,0.25)',
                  scrollbarWidth: 'thin',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '14px',
                    paddingBottom: '10px',
                    borderBottom: '1px solid var(--border-glass)',
                  }}>
                    <AlignJustify size={14} color="var(--accent-cyan)" />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                      Văn bản gốc: {fullDocResult.original_filename}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginLeft: 'auto' }}>
                      {fullDocResult.total_pages} trang • {fullDocResult.extraction_method}
                    </span>
                  </div>
                  <InlineDocViewer docResult={fullDocResult} />
                </div>
              )}
            </div>
          )}
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

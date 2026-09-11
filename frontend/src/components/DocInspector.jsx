import React, { useState } from 'react';
import { X, Table, FileText, Cpu, CheckCircle2, Layers, AlignLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Render một element văn bản theo type (heading | list | paragraph | table)
 * để bảo toàn format tương đối gần bản gốc.
 */
function DocElement({ el, idx }) {
  if (!el || !el.text) return null;

  if (el.type === 'heading') {
    return (
      <div key={idx} style={{
        fontWeight: 700,
        fontSize: '0.82rem',
        color: '#f1f5f9',
        letterSpacing: '0.03em',
        marginTop: '14px',
        marginBottom: '4px',
        textAlign: 'center',
        lineHeight: 1.5,
      }}>
        {el.text}
      </div>
    );
  }

  if (el.type === 'list') {
    return (
      <div key={idx} style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        paddingLeft: '16px',
        marginBottom: '3px',
        lineHeight: 1.65,
      }}>
        <span style={{ color: 'var(--accent-cyan)', flexShrink: 0, marginTop: '2px', fontSize: '0.7rem' }}>•</span>
        <span style={{ fontSize: '0.775rem', color: '#cbd5e1' }}>{el.text.replace(/^[•\-\*\+]\s+/, '').replace(/^\d+\.\d+(\.\d+)?\s+/, '').replace(/^[a-z]\)\s+/, '')}</span>
      </div>
    );
  }

  if (el.type === 'table') {
    // Hiển thị bảng đơn giản nếu element là table inline
    return (
      <div key={idx} style={{ margin: '8px 0', fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
        [Bảng — xem chi tiết ở tab Bảng biểu]
      </div>
    );
  }

  // paragraph (default)
  return (
    <div key={idx} style={{
      fontSize: '0.775rem',
      color: '#cbd5e1',
      lineHeight: 1.75,
      marginBottom: '2px',
      textAlign: 'justify',
      wordBreak: 'break-word',
    }}>
      {el.text}
    </div>
  );
}

export default function DocInspector({ docResult, onClose }) {
  if (!docResult) return null;

  const [activeTab, setActiveTab] = useState('tables'); // 'tables' | 'raw' | 'meta'
  const tables = docResult.tables || [];

  return (
    <aside className="inspector-drawer">
      <div className="inspector-header">
        <div className="inspector-title">
          <Layers size={18} color="var(--accent-cyan)" />
          <span>Chi tiết trích xuất OCR</span>
        </div>
        <button className="icon-btn" onClick={onClose} title="Đóng">
          <X size={18} />
        </button>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-glass)', padding: '0 16px' }}>
        <button 
          onClick={() => setActiveTab('tables')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'tables' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
            color: activeTab === 'tables' ? 'var(--accent-cyan)' : 'var(--text-muted)',
            padding: '10px 14px',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Table size={14} />
          <span>Bảng biểu ({tables.length})</span>
        </button>

        <button 
          onClick={() => setActiveTab('raw')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'raw' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
            color: activeTab === 'raw' ? 'var(--accent-cyan)' : 'var(--text-muted)',
            padding: '10px 14px',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <FileText size={14} />
          <span>Văn bản gốc</span>
        </button>

        <button 
          onClick={() => setActiveTab('meta')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'meta' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
            color: activeTab === 'meta' ? 'var(--accent-cyan)' : 'var(--text-muted)',
            padding: '10px 14px',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Cpu size={14} />
          <span>Thông số</span>
        </button>
      </div>

      <div className="inspector-content">
        {/* TAB 1: TABLES */}
        {activeTab === 'tables' && (
          <div>
            {tables.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', fontSize: '0.85rem' }}>
                Không tìm thấy cấu trúc bảng nào trong tài liệu này.
              </div>
            ) : (
              tables.map((tbl, idx) => (
                <div key={idx} style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: '6px' }}>
                    Bảng #{idx + 1} {tbl.page ? `(Trang ${tbl.page})` : tbl.sheet_name ? `(Sheet: ${tbl.sheet_name})` : ''}
                  </div>
                  <div className="table-wrapper">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {tbl.markdown || ''}
                    </ReactMarkdown>
                  </div>
                </div>
              ))
            )}
          </div>
        )}


        {/* TAB 2: FULL TEXT CÓ CẤU TRÚC */}
        {activeTab === 'raw' && (() => {
          const pages = docResult.pages || [];
          const hasStructuredPages = pages.length > 0 && pages.some(p => p.elements && p.elements.length > 0);

          if (!hasStructuredPages) {
            // Fallback: hiển thị full_text với pre-wrap nếu không có structured data
            return (
              <div>
                <div style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-glass)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  color: '#cbd5e1',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '600px',
                  overflowY: 'auto'
                }}>
                  {docResult.full_text || '(Không có text nào được trích xuất)'}
                </div>
              </div>
            );
          }

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {pages.map((page, pageIdx) => {
                const elements = page.elements || [];
                const methodLabel = page.method === 'ocr'
                  ? `OCR${page.confidence != null ? ` (${page.confidence}%)` : ''}`
                  : 'Native Text';

                return (
                  <div key={pageIdx} style={{ marginBottom: '20px' }}>
                    {/* Page header divider */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '10px',
                      paddingBottom: '6px',
                      borderBottom: '1px solid var(--border-glass)',
                    }}>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: 'var(--accent-cyan)',
                        background: 'rgba(56,189,248,0.10)',
                        borderRadius: '4px',
                        padding: '2px 8px',
                        letterSpacing: '0.04em',
                      }}>
                        Trang {page.page}
                      </span>
                      <span style={{
                        fontSize: '0.65rem',
                        color: 'var(--text-dim)',
                        fontStyle: 'italic',
                      }}>
                        {methodLabel}
                      </span>
                    </div>

                    {/* Document body — styled to match original layout */}
                    <div style={{
                      background: 'rgba(248, 250, 252, 0.03)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-glass)',
                      padding: '18px 20px',
                      fontFamily: "'Times New Roman', 'Georgia', serif",
                    }}>
                      {elements.length === 0 ? (
                        <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', fontStyle: 'italic' }}>
                          (Không có nội dung trên trang này)
                        </div>
                      ) : (
                        elements.map((el, elIdx) => (
                          <DocElement key={elIdx} el={el} idx={elIdx} />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}


        {/* TAB 3: META INFO */}
        {activeTab === 'meta' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="stat-grid">
              <div className="stat-card">
                <div className="stat-label">Tên File</div>
                <div className="stat-value" style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>
                  {docResult.original_filename}
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-label">Định dạng</div>
                <div className="stat-value">{docResult.document_type?.toUpperCase()}</div>
              </div>

              <div className="stat-card">
                <div className="stat-label">Số trang / sheet</div>
                <div className="stat-value">{docResult.total_pages || 1}</div>
              </div>

              <div className="stat-card">
                <div className="stat-label">Số lượng Bảng</div>
                <div className="stat-value">{tables.length}</div>
              </div>

              <div className="stat-card">
                <div className="stat-label">Nguồn dữ liệu</div>
                <div className="stat-value" style={{ fontSize: '0.8rem' }}>{docResult.source_type}</div>
              </div>

              <div className="stat-card">
                <div className="stat-label">Phương pháp đọc</div>
                <div className="stat-value" style={{ fontSize: '0.8rem', color: 'var(--accent-emerald)' }}>
                  {docResult.extraction_method}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

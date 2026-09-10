import React, { useState } from 'react';
import { X, Table, FileText, Cpu, CheckCircle2, Layers } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
          <span>Text trích xuất</span>
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

        {/* TAB 2: RAW TEXT */}
        {activeTab === 'raw' && (
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
        )}

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

import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import DropZone from './components/DropZone';
import DocInspector from './components/DocInspector';

/**
 * Đọc JSON từ response một cách an toàn.
 * Trả về null nếu response rỗng hoặc không phải JSON hợp lệ.
 */
async function safeJson(res) {
  const text = await res.text();
  if (!text || text.trim() === '') return null;
  try {
    return JSON.parse(text);
  } catch {
    console.error('Không thể parse JSON từ server:', text.slice(0, 300));
    return null;
  }
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [filesList, setFilesList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeDoc, setActiveDoc] = useState(null);
  const [inspectorDoc, setInspectorDoc] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Fetch initial history and files list
  useEffect(() => {
    fetchFiles();
    fetchHistory();
  }, []);

  const fetchFiles = async () => {
    try {
      const res = await fetch('/api/files');
      const data = await res.json();
      if (data.status === 'success') {
        setFilesList(data.files || []);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách files:', err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      if (data.status === 'success' && data.messages) {
        setMessages(
          data.messages.map((m) => ({
            role: m.role,
            content: m.content,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }))
        );
      }
    } catch (err) {
      console.error('Lỗi khi tải lịch sử:', err);
    }
  };

  const handleSendMessage = async (text) => {
    if (!text.trim() || isLoading) return;

    const userMsg = {
      role: 'user',
      content: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      const data = await safeJson(res);
      if (!data) throw new Error(`Server trả về phản hồi không hợp lệ (HTTP ${res.status})`);
      if (!res.ok) throw new Error(data.detail || 'Lỗi từ server');

      const aiMsg = {
        role: 'assistant',
        content: data.answer,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg = {
        role: 'assistant',
        content: `❌ **Đã xảy ra lỗi:** ${err.message}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (file, instruction = '') => {
    if (!file || isUploading) return;

    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    if (instruction) {
      formData.append('instruction', instruction);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 phút timeout

      let res;
      try {
        res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      const data = await safeJson(res);
      if (!data) throw new Error(`Server trả về phản hồi không hợp lệ (HTTP ${res.status}). Có thể file quá lớn hoặc OCR thất bại.`);
      if (!res.ok) throw new Error(data.detail || 'Lỗi khi upload file');

      setActiveDoc(data.doc_result);

      // Thêm message thông báo upload và tóm tắt
      const userMsg = {
        role: 'user',
        content: `Tải lên và phân tích tài liệu: **${data.filename}**`,
        docResult: data.doc_result,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const aiMsg = {
        role: 'assistant',
        content: data.summary,
        docResult: data.doc_result,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, userMsg, aiMsg]);
      fetchFiles(); // Refresh file list
    } catch (err) {
      const errorMsg = {
        role: 'assistant',
        content: `❌ **Lỗi trích xuất / Tóm tắt tài liệu:** ${err.message}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectFile = async (filePath) => {
    if (isUploading) return;
    setIsUploading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 phút timeout

      let res;
      try {
        res = await fetch('/api/select-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_path: filePath }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      const data = await safeJson(res);
      if (!data) throw new Error(`Server trả về phản hồi không hợp lệ (HTTP ${res.status}). Có thể OCR thất bại hoặc file không hợp lệ.`);
      if (!res.ok) throw new Error(data.detail || 'Lỗi khi đọc file');

      setActiveDoc(data.doc_result);

      const userMsg = {
        role: 'user',
        content: `Tải lên và tóm tắt: **${data.filename}**`,
        docResult: data.doc_result,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const aiMsg = {
        role: 'assistant',
        content: data.summary,
        docResult: data.doc_result,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, userMsg, aiMsg]);
    } catch (err) {
      const errorMsg = {
        role: 'assistant',
        content: `❌ **Lỗi khi xử lý file:** ${err.message}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearChat = async () => {
    try {
      await fetch('/api/clear', { method: 'POST' });
      setMessages([]);
      setActiveDoc(null);
      setInspectorDoc(null);
    } catch (err) {
      console.error('Lỗi khi xóa lịch sử:', err);
    }
  };

  // Drag and Drop listeners
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div 
      className="app-container"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <DropZone isDragging={isDragging} />

      <Sidebar 
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onFileUpload={handleFileUpload}
        onSelectFile={handleSelectFile}
        onClearChat={handleClearChat}
        filesList={filesList}
        isUploading={isUploading}
        activeDoc={activeDoc}
      />

      <ChatArea 
        messages={messages}
        isLoading={isLoading}
        isUploading={isUploading}
        onSendMessage={handleSendMessage}
        onFileUpload={handleFileUpload}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        sidebarCollapsed={sidebarCollapsed}
        activeDoc={activeDoc}
        onOpenDocInspector={(doc) => setInspectorDoc(doc)}
        onSelectPrompt={handleSendMessage}
      />

      {inspectorDoc && (
        <DocInspector 
          docResult={inspectorDoc} 
          onClose={() => setInspectorDoc(null)} 
        />
      )}
    </div>
  );
}

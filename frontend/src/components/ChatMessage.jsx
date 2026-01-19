import React from 'react';
import { User, Bot, Copy, Check } from 'lucide-react';

const ChatMessage = ({ message, isTyping }) => {
  if (isTyping) {
    return (
      <div className="message message-assistant typing">
        <div className="message-avatar">
          <Bot size={20} />
        </div>
        <div className="message-content">
          <div className="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    );
  }

  // Defensive defaults
  const safeMessage = message || {};
  const role = safeMessage.role || 'assistant';
  const content = typeof safeMessage.content === 'string' ? safeMessage.content : '';
  const fileAttachments = Array.isArray(safeMessage.fileAttachments) ? safeMessage.fileAttachments : [];
  const timestamp = safeMessage.timestamp || Date.now();

  const isUser = role === 'user';
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const formatContent = (text) => {
    if (!text) return '';
    return text.split('\n').map((paragraph, index) => {
      if (paragraph.trim() === '') return <br key={index} />;
      const formattedText = paragraph
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
      return <p key={index} dangerouslySetInnerHTML={{ __html: formattedText }} />;
    });
  };

  const formatTimestamp = (ts) => {
    const date = new Date(ts);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`message ${isUser ? 'message-user' : 'message-assistant'}`}>
      <div className="message-avatar">
        {isUser ? <User size={20} /> : <Bot size={20} />}
      </div>
      <div className="message-container">
        <div className="message-content">
          {formatContent(content)}

          {fileAttachments.length > 0 && (
            <div className="file-attachments">
              {fileAttachments.map((file, index) => (
                <div key={index} className="file-attachment">
                  <span className="file-icon">📎</span>
                  <span className="file-name">{file.originalName || file.filename || file.name || 'file'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="message-footer">
          <span className="message-time">{formatTimestamp(timestamp)}</span>
          {!isUser && (
            <button className="copy-btn" onClick={handleCopy} title="Copy message">
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;

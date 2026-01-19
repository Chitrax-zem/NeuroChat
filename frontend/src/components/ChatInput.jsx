import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Paperclip, X } from 'lucide-react';
import { uploadAPI } from '../utils/api';

const ChatInput = ({ onSendMessage, disabled, isLoading }) => {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSend = async () => {
    if (!message.trim() && attachedFiles.length === 0) return;

    try {
      // 1) Upload files first and gather returned contexts
      const contexts = [];
      const fileSummaries = [];

      for (const file of attachedFiles) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await uploadAPI.processFile(fd);
        if (res.data?.success) {
          // res.data.context e.g. “[Image attached] /uploads/xxxx.jpg”
          if (res.data.context) contexts.push(res.data.context);
          fileSummaries.push({
            name: file.name,
            url: res.data.file?.url || '',
            mimetype: res.data.file?.mimetype
          });
        }
      }

      // 2) Merge typed message with contexts
      const combinedContent = [message.trim(), ...contexts]
        .filter(Boolean)
        .join('\n\n');

      // 3) Send a single message payload to the streaming endpoint caller
      onSendMessage({
        content: combinedContent,
        fileAttachments: fileSummaries
      });

      // 4) Reset the input
      setMessage('');
      setAttachedFiles([]);
    } catch (err) {
      console.error('Attachment upload failed:', err);
      // optionally show toast to the user
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setAttachedFiles(prev => [...prev, ...files]);
    }
  };

  const removeFile = (index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleVoiceToggle = async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('');
      setMessage(transcript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  };

  return (
    <div className="chat-input-container">
      {attachedFiles.length > 0 && (
        <div className="file-previews">
          {attachedFiles.map((file, index) => (
            <div key={index} className="file-preview">
              <span className="file-preview-name">{file.name}</span>
              <button
                className="file-preview-remove"
                onClick={() => removeFile(index)}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="chat-input">
        <button
          className="icon-btn attachment-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isLoading}
          title="Attach file"
        >
          <Paperclip size={20} />
        </button>

        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileSelect}
          multiple
          accept=".pdf,.txt,.jpg,.jpeg,.png,.gif"
        />

        <textarea
          ref={textareaRef}
          className="message-textarea"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          disabled={disabled || isLoading}
          rows={1}
        />

        <button
          className={`icon-btn voice-btn ${isRecording ? 'recording' : ''}`}
          onClick={handleVoiceToggle}
          disabled={disabled || isLoading}
          title={isRecording ? 'Stop recording' : 'Voice input'}
        >
          <Mic size={20} />
        </button>

        <button
          className="send-btn"
          onClick={handleSend}
          disabled={disabled || isLoading || (!message.trim() && attachedFiles.length === 0)}
          title="Send message"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
};

export default ChatInput;

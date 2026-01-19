import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { chatAPI } from '../utils/api';
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import ChatSidebar from '../components/ChatSidebar';
import SettingsPanel from '../components/SettingsPanel';
import { Settings, Sparkles, Volume2 } from 'lucide-react';

const ChatPage = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentChatId, setCurrentChatId] = useState(chatId);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (chatId) {
      fetchChat(chatId);
      setCurrentChatId(chatId);
    } else {
      setChat(null);
      setMessages([]);
      setLoading(false);
    }
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChat = async (id) => {
    try {
      setLoading(true);
      const response = await chatAPI.getChat(id);
      if (response.data.success) {
        const chatData = response.data.chat;
        setChat(chatData);
        setMessages(chatData.messages || []);
      }
    } catch (error) {
      const status = error.response?.status;
      if (status === 429) {
        console.warn('Rate/quota limit hit while fetching chat.');
        // Optional: surface a non-blocking banner/toast here
      } else {
        console.error('Failed to fetch chat:', error);
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  // Ensure a chat exists before sending any message
  const handleSendMessage = async (messageData) => {
    if (!currentChatId) {
      try {
        const newChatResponse = await chatAPI.createChat({
          systemPrompt: 'You are a helpful AI assistant.',
          botRole: 'assistant',
          language: user?.preferredLanguage || 'en'
        });
        if (newChatResponse.data.success) {
          const newChat = newChatResponse.data.chat;
          setCurrentChatId(newChat._id);
          navigate(`/chat/${newChat._id}`);
          await sendMessage(newChat._id, messageData);
        }
      } catch (e) {
        console.error('Failed to create chat:', e);
      }
    } else {
      await sendMessage(currentChatId, messageData);
    }
  };

  const sendMessage = async (chatIdParam, messageData) => {
    try {
      const id = chatIdParam || currentChatId;
      if (!id) {
        console.warn('Attempted to send message without chatId');
        return;
      }

      const userMessage = {
        role: 'user',
        content: messageData.content,
        timestamp: new Date(),
        fileAttachments: messageData.fileAttachments || []
      };

      setMessages(prev => [...prev, userMessage]);
      setIsTyping(true);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chat/${id}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(messageData)
      });

      if (!response.ok) {
        // If server rejected before starting SSE
        throw new Error('Failed to send message');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = {
        role: 'assistant',
        content: '',
        timestamp: new Date()
      };

      // Push placeholder for streaming assistant
      setMessages(prev => [...prev, assistantMessage]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              setIsTyping(false);
              return;
            }

            try {
              const parsed = JSON.parse(data);

              if (parsed.content) {
                assistantMessage.content += parsed.content;
                setMessages(prev => {
                  const updated = [...prev];
                  // Update the last message (placeholder assistant) content
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: assistantMessage.content
                  };
                  return updated;
                });
              }

              if (parsed.error) {
                // Streaming reported an error (e.g., insufficient_quota)
                setIsTyping(false);
                // Remove placeholder assistant message
                setMessages(prev => prev.slice(0, -1));

                // Try server-side fallback so history remains in sync
                const idToUse = currentChatId || chatId;
                if (idToUse) {
                  try {
                    await chatAPI.sendMessageFallback(idToUse, messageData);
                    await fetchChat(idToUse); // Sync full history from server
                  } catch (fallbackErr) {
                    console.warn('Fallback failed, showing inline message only:', fallbackErr);
                    // Inline assistant error message as a last resort
                    setMessages(prev => [
                      ...prev,
                      {
                        role: 'assistant',
                        content: `⚠️ ${parsed.error}`,
                        timestamp: new Date()
                      }
                    ]);
                  }
                } else {
                  // If somehow we still don't have id, just surface inline
                  setMessages(prev => [
                    ...prev,
                    {
                      role: 'assistant',
                      content: `⚠️ ${parsed.error}`,
                      timestamp: new Date()
                    }
                  ]);
                }
                return;
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      }

      setIsTyping(false);
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsTyping(false);
      // Show inline message instead of alert to avoid UX disruption
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: '⚠️ Failed to send message. Please try again.',
          timestamp: new Date()
        }
      ]);
    }
  };

  const handleTextToSpeech = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    } else {
      alert('Text-to-speech is not supported in this browser.');
    }
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner"></div>
        <p>Loading chat...</p>
      </div>
    );
  }

  return (
    <div className="chat-page">
      <ChatSidebar
        activeChatId={currentChatId}
        onSelectChat={(id) => {
          setCurrentChatId(id);
          navigate(`/chat/${id}`);
        }}
      />

      <div className="chat-main">
        <div className="chat-header">
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>

          <div className="chat-title">
            <Sparkles size={20} />
            <span>{chat?.title || 'New Conversation'}</span>
          </div>

          <div className="chat-actions">
            <button
              className="icon-btn"
              onClick={() => setSettingsOpen(true)}
              title="Chat Settings"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>

        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="chat-welcome">
              <div className="welcome-icon">🧠</div>
              <h2>Welcome to NeuroChat!</h2>
              <p>I'm your AI assistant. How can I help you today?</p>
              <div className="welcome-suggestions">
                <div
                  className="suggestion-card"
                  onClick={() => handleSendMessage({ content: 'Help me learn Python programming' })}
                >
                  <span>💻</span>
                  <p>Learn programming</p>
                </div>
                <div
                  className="suggestion-card"
                  onClick={() => handleSendMessage({ content: 'Create a fitness workout plan for beginners' })}
                >
                  <span>🏋️</span>
                  <p>Fitness guidance</p>
                </div>
                <div
                  className="suggestion-card"
                  onClick={() => handleSendMessage({ content: 'Explain a complex topic in simple terms' })}
                >
                  <span>📚</span>
                  <p>Explain concepts</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, index) =>
                message ? (
                  <div key={index} className="message-wrapper">
                    <ChatMessage message={message} />
                    {message.role === 'assistant' && (
                      <button
                        className="speak-btn"
                        onClick={() => handleTextToSpeech(message.content)}
                        title="Read aloud"
                      >
                        <Volume2 size={16} />
                      </button>
                    )}
                  </div>
                ) : null
              )}
              {isTyping && <ChatMessage isTyping />}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={isTyping}
          isLoading={isTyping}
        />
      </div>

      {/* Properly mounted Settings Panel */}
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
};

export default ChatPage;

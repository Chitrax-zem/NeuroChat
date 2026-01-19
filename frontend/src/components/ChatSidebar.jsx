import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Archive, Trash2, Search, MessageSquare } from 'lucide-react';
import { chatAPI } from '../utils/api';

const ChatSidebar = ({ activeChatId, onSelectChat }) => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchChats();
  }, [showArchived]);

const fetchChats = async () => {
  try {
    setLoading(true);
    const response = await chatAPI.getChats({ archived: showArchived });
    if (response.data.success) {
      setChats(response.data.chats);
    }
  } catch (error) {
    const status = error.response?.status;
    if (status === 429) {
      // Friendly notice (console or toast); avoid re-try loop
      console.warn('Rate limit or quota exceeded while fetching chats.');
    } else {
      console.error('Failed to fetch chats:', error);
    }
  } finally {
    setLoading(false);
  }
};
  

  const createNewChat = async () => {
    try {
      const response = await chatAPI.createChat({});
      if (response.data.success) {
        const newChat = response.data.chat;
        setChats([newChat, ...chats]);
        onSelectChat(newChat._id);
        navigate(`/chat/${newChat._id}`);
      }
    } catch (error) {
      console.error('Failed to create chat:', error);
    }
  };

  const handleDeleteChat = async (chatId, e) => {
    e.stopPropagation();
    try {
      await chatAPI.deleteChat(chatId);
      setChats(chats.filter(chat => chat._id !== chatId));
      if (activeChatId === chatId) {
        onSelectChat(null);
        navigate('/');
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  const handleArchiveChat = async (chatId, e) => {
    e.stopPropagation();
    try {
      await chatAPI.archiveChat(chatId);
      setChats(chats.filter(chat => chat._id !== chatId));
    } catch (error) {
      console.error('Failed to archive chat:', error);
    }
  };

  const filteredChats = chats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now - d);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return d.toLocaleDateString([], { weekday: 'short' });
    } else {
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="chat-sidebar">
      <div className="sidebar-header">
        <button className="new-chat-btn" onClick={createNewChat}>
          <Plus size={20} />
          <span>New Chat</span>
        </button>
      </div>

      <div className="sidebar-search">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="sidebar-toggle">
        <button
          className={`toggle-btn ${!showArchived ? 'active' : ''}`}
          onClick={() => setShowArchived(false)}
        >
          Active
        </button>
        <button
          className={`toggle-btn ${showArchived ? 'active' : ''}`}
          onClick={() => setShowArchived(true)}
        >
          Archived
        </button>
      </div>

      <div className="sidebar-content">
        {loading ? (
          <div className="sidebar-loading">Loading conversations...</div>
        ) : filteredChats.length === 0 ? (
          <div className="sidebar-empty">
            <MessageSquare size={48} />
            <p>No conversations yet</p>
          </div>
        ) : (
          <div className="chat-list">
            {filteredChats.map(chat => (
              <div
                key={chat._id}
                className={`chat-item ${activeChatId === chat._id ? 'active' : ''}`}
                onClick={() => {
                  onSelectChat(chat._id);
                  navigate(`/chat/${chat._id}`);
                }}
              >
                <div className="chat-item-content">
                  <h4 className="chat-item-title">{chat.title}</h4>
                  <p className="chat-item-preview">
                    {chat.messages.length > 0
                      ? chat.messages[chat.messages.length - 1].content.substring(0, 50)
                      : 'No messages yet'}
                    ...
                  </p>
                  <span className="chat-item-date">{formatDate(chat.updatedAt)}</span>
                </div>
                <div className="chat-item-actions">
                  <button
                    className="action-btn"
                    onClick={(e) => handleArchiveChat(chat._id, e)}
                    title={chat.isArchived ? 'Unarchive' : 'Archive'}
                  >
                    <Archive size={16} />
                  </button>
                  <button
                    className="action-btn delete"
                    onClick={(e) => handleDeleteChat(chat._id, e)}
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;
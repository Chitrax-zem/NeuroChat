import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Archive, Trash2, Search, MessageSquare, RefreshCcw, AlertCircle
} from 'lucide-react';
import { chatAPI } from '../utils/api';

const ChatSidebar = ({ activeChatId, onSelectChat }) => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchChats();
    const listener = () => fetchChats();
    window.addEventListener('chats:refresh', listener);
    return () => window.removeEventListener('chats:refresh', listener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived]);

  const fetchChats = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await chatAPI.getChats({ archived: showArchived });
      const ok = res?.data?.success ?? true;
      const list =
        res?.data?.chats ??
        res?.data?.items ??
        res?.data?.data ??
        res?.data ??
        [];
      if (ok && Array.isArray(list)) {
        setChats(list);
      } else {
        setChats([]);
        setErrorMsg('Unexpected chat list response format.');
        console.warn('Unexpected chat list payload:', res?.data);
      }
    } catch (error) {
      setChats([]);
      const status = error.response?.status;
      const serverMsg = error.response?.data?.message;
      if (status === 401) {
        setErrorMsg('You are not logged in. Please log in again.');
      } else if (status === 429) {
        setErrorMsg('Rate limit hit. Please try again later.');
      } else if (status === 403) {
        setErrorMsg('Access denied. Check your credentials.');
      } else {
        setErrorMsg(serverMsg || error.message || 'Failed to load chats.');
      }
      console.error('GET /api/chat failed:', {
        status,
        serverMsg,
        err: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    try {
      setRefreshing(true);
      await fetchChats();
    } finally {
      setRefreshing(false);
    }
  };

  const createNewChat = async () => {
    try {
      const res = await chatAPI.createChat({});
      if (res?.data?.success) {
        const newChat = res.data.chat;
        setChats((prev) => [newChat, ...prev]);
        onSelectChat(newChat._id);
        navigate(`/chat/${newChat._id}`);
        window.dispatchEvent(new Event('chats:refresh'));
      } else {
        setErrorMsg(res?.data?.message || 'Failed to create chat.');
      }
    } catch (error) {
      console.error('Failed to create chat:', error);
      setErrorMsg(error.response?.data?.message || error.message || 'Failed to create chat.');
    }
  };

  const handleDeleteChat = async (chatId, e) => {
    e.stopPropagation();
    try {
      await chatAPI.deleteChat(chatId);
      setChats((prev) => prev.filter((c) => c._id !== chatId));
      if (String(activeChatId) === String(chatId)) {
        onSelectChat(null);
        navigate('/');
      }
      window.dispatchEvent(new Event('chats:refresh'));
    } catch (error) {
      console.error('Failed to delete chat:', error);
      setErrorMsg('Failed to delete chat.');
    }
  };

  const handleArchiveChat = async (chatId, e) => {
    e.stopPropagation();
    try {
      await chatAPI.archiveChat(chatId);
      setChats((prev) => prev.filter((c) => c._id !== chatId));
      window.dispatchEvent(new Event('chats:refresh'));
    } catch (error) {
      console.error('Failed to archive chat:', error);
      setErrorMsg('Failed to archive chat.');
    }
  };

  const filteredChats = (chats || []).filter((chat) => {
    const title = String(chat?.title || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return title.includes(q);
  });

  const formatDate = (date) => {
    try {
      const d = new Date(date);
      const now = new Date();
      const sameDay = d.toDateString() === now.toDateString();
      if (sameDay) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const diffMs = now - d;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const lastMessagePreview = (chat) => {
    const msgs = Array.isArray(chat?.messages) ? chat.messages : [];
    if (!msgs.length) return 'No messages yet';
    const last = msgs[msgs.length - 1];
    const text = String(last?.content || '').replace(/\s+/g, ' ').trim();
    return text.length > 60 ? text.slice(0, 60) + '…' : text;
  };

  const safeTitle = (chat) => {
    const preview = lastMessagePreview(chat);
    const title = String(chat?.title || '').trim();
    if (!title || title === 'New Conversation') return preview || 'New Conversation';
    return title;
  };

  return (
    <div className="chat-sidebar">
      <div className="sidebar-header">
        <h3>Chats</h3>
        <div className="sidebar-header-actions">
          <button className="icon-btn" onClick={refresh} title="Refresh list" aria-label="Refresh chats">
            <RefreshCcw size={18} className={refreshing ? 'spin' : ''} />
          </button>
          <button className="new-chat-btn" onClick={createNewChat} title="New chat">
            <Plus size={18} />
            <span>New</span>
          </button>
        </div>
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
          title="Active chats"
        >
          Active
        </button>
        <button
          className={`toggle-btn ${showArchived ? 'active' : ''}`}
          onClick={() => setShowArchived(true)}
          title="Archived chats"
        >
          Archived
        </button>
      </div>

      {errorMsg ? (
        <div className="sidebar-error">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      ) : null}

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
            {filteredChats.map((chat) => (
              <div
                key={chat._id}
                className={`chat-item ${String(activeChatId) === String(chat._id) ? 'active' : ''}`}
                onClick={() => {
                  onSelectChat(chat._id);
                  navigate(`/chat/${chat._id}`);
                }}
                role="button"
                tabIndex={0}
              >
                <div className="chat-item-content">
                  <h4 className="chat-item-title">{safeTitle(chat)}</h4>
                  <p className="chat-item-preview">{lastMessagePreview(chat)}</p>
                  <span className="chat-item-date">{formatDate(chat.updatedAt || chat.createdAt)}</span>
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

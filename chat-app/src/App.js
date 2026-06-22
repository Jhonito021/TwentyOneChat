import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { useChat } from './hooks/useChat'
import ChatList from './components/Chat/ChatList'
import ChatWindow from './components/Chat/ChatWindow'
import Login from './components/Auth/Login'
import Register from './components/Auth/Register'
import './styles/index.css'

const ChatApp = () => {
  const { user } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const { 
    messages, 
    contacts, 
    selectedContact, 
    loadMessages, 
    sendMessage,
    setSelectedContact 
  } = useChat()
  
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [showChat, setShowChat] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleSelectContact = (contactId) => {
    setSelectedContact(contactId)
    loadMessages(contactId)
    if (isMobile) {
      setShowChat(true)
    }
  }

  const handleBack = () => {
    setShowChat(false)
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  return (
    <div className="app-container">
      <div className="sidebar" style={{ display: (isMobile && showChat) ? 'none' : 'flex' }}>
        <div className="sidebar-header">
          <h1><i className="fas fa-comment-dots" style={{ marginRight: '10px', color: '#C6FF34' }}></i>ChatApp</h1>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button 
              className="theme-toggle" 
              onClick={toggleTheme}
              style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}
            >
              <i className={`fas ${isDark ? 'fa-sun' : 'fa-moon'}`}></i>
            </button>
            <button 
              onClick={() => {}} 
              style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}
            >
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </div>
        <ChatList 
          contacts={contacts} 
          onSelectContact={handleSelectContact}
          selectedContact={selectedContact}
        />
      </div>
      
      <div className={`chat-window ${isMobile && showChat ? 'active' : ''}`}>
        {isMobile && showChat && (
          <button className="back-button" onClick={handleBack}>
            <i className="fas fa-arrow-left"></i>
          </button>
        )}
        <ChatWindow 
          messages={messages} 
          onSendMessage={sendMessage}
          selectedContact={selectedContact}
          contactName={contacts.find(c => c.id === selectedContact)?.username}
        />
      </div>
    </div>
  )
}

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<ChatApp />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App;
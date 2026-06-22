import React, { useRef, useEffect } from 'react'
import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'
import { useAuth } from '../../context/AuthContext'

const ChatWindow = ({ messages, onSendMessage, selectedContact, contactName }) => {
  const { user } = useAuth()
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!selectedContact) {
    return (
      <div className="chat-empty">
        <i className="fas fa-comments"></i>
        <h2>Sélectionnez un contact</h2>
        <p>Pour commencer à discuter</p>
      </div>
    )
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="chat-header-info">
          <div className="avatar-small">
            <img 
              src={`https://ui-avatars.com/api/?name=${contactName || 'Contact'}&background=C6FF34&color=171717&size=40`}
              alt={contactName}
            />
          </div>
          <div>
            <h3>{contactName || 'Contact'}</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>En ligne</span>
          </div>
        </div>
      </div>
      <div className="messages-container">
        {messages.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            color: 'var(--text-secondary)',
            padding: '40px 20px'
          }}>
            <i className="fas fa-comment" style={{ fontSize: '32px', marginBottom: '10px', color: 'var(--secondary)' }}></i>
            <p>Commencez une conversation avec {contactName}</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.sender_id === user?.id}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <MessageInput onSendMessage={onSendMessage} />
    </div>
  )
}

export default ChatWindow
import React from 'react'
import { motion } from 'framer-motion'

const ChatList = ({ contacts, onSelectContact, selectedContact }) => {
  if (contacts.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '40px 20px',
        color: 'var(--text-secondary)'
      }}>
        <i className="fas fa-users" style={{ fontSize: '48px', marginBottom: '15px', color: 'var(--secondary)' }}></i>
        <h3>Aucun contact disponible</h3>
        <p>Invitez vos amis à rejoindre l'application</p>
      </div>
    )
  }

  return (
    <div className="chat-list">
      {contacts.map((contact) => (
        <motion.div
          key={contact.id}
          className={`chat-item ${selectedContact === contact.id ? 'active' : ''}`}
          onClick={() => onSelectContact(contact.id)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="avatar">
            <img 
              src={contact.avatar_url || `https://ui-avatars.com/api/?name=${contact.username}&background=C6FF34&color=171717&size=50`} 
              alt={contact.username}
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${contact.username}&background=C6FF34&color=171717&size=50`
              }}
            />
          </div>
          <div className="chat-info">
            <h3>{contact.username}</h3>
            <p>{contact.last_message || 'En ligne'}</p>
          </div>
          <div className="chat-time">
            <span>{contact.last_seen ? new Date(contact.last_seen).toLocaleTimeString() : '●'}</span>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

export default ChatList
import React from 'react'
import { motion } from 'framer-motion'

const MessageBubble = ({ message, isOwn }) => {
  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    return new Date(timestamp).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <motion.div
      className={`message-bubble ${isOwn ? 'own' : 'other'}`}
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="message-content">
        <p>{message.content}</p>
        <span className="message-time">
          {formatTime(message.created_at)}
          {isOwn && <i className="fas fa-check" style={{ marginLeft: '5px', fontSize: '12px' }}></i>}
        </span>
      </div>
    </motion.div>
  )
}

export default MessageBubble
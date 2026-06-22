import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'

const MessageInput = ({ onSendMessage }) => {
  const [message, setMessage] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (message.trim()) {
      onSendMessage(message)
      setMessage('')
      inputRef.current?.focus()
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form className="message-input" onSubmit={handleSubmit}>
      <button type="button" className="attach-btn">
        <i className="fas fa-paperclip"></i>
      </button>
      <motion.input
        ref={inputRef}
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Écrire un message..."
        whileFocus={{ scale: 1.02 }}
      />
      <motion.button
        type="submit"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        disabled={!message.trim()}
      >
        <i className="fas fa-paper-plane"></i>
      </motion.button>
    </form>
  )
}

export default MessageInput
import React from 'react'
import Header from './Header'
import ChatList from '../Chat/ChatList'

const Sidebar = ({ contacts, onSelectContact, selectedContact }) => {
  return (
    <div className="sidebar">
      <Header />
      <ChatList 
        contacts={contacts} 
        onSelectContact={onSelectContact}
        selectedContact={selectedContact}
      />
    </div>
  )
}

export default Sidebar
import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

export const useChat = () => {
  const [messages, setMessages] = useState([])
  const [contacts, setContacts] = useState([])
  const [selectedContact, setSelectedContact] = useState(null)
  const [loading, setLoading] = useState(false)

  // Charger les contacts
  useEffect(() => {
    const fetchContacts = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', supabase.auth.getUser()?.then(res => res.data.user?.id))
      
      if (!error && data) {
        setContacts(data)
      }
    }
    fetchContacts()
  }, [])

  // Charger les messages d'un contact
  const loadMessages = async (contactId) => {
    setLoading(true)
    const user = await supabase.auth.getUser()
    const userId = user.data.user?.id

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .or(`sender_id.eq.${contactId},receiver_id.eq.${contactId}`)
      .order('created_at', { ascending: true })

    if (!error && data) {
      setMessages(data)
      setSelectedContact(contactId)
    }
    setLoading(false)
  }

  // Envoyer un message
  const sendMessage = async (text) => {
    if (!text.trim() || !selectedContact) return

    const user = await supabase.auth.getUser()
    const userId = user.data.user?.id

    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          sender_id: userId,
          receiver_id: selectedContact,
          content: text,
          created_at: new Date().toISOString()
        }
      ])
      .select()

    if (!error && data) {
      setMessages(prev => [...prev, data[0]])
    }
  }

  // Écouter les nouveaux messages
  useEffect(() => {
    const subscription = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, async (payload) => {
        const newMessage = payload.new
        const user = await supabase.auth.getUser()
        const userId = user.data.user?.id
        
        if (newMessage.receiver_id === userId || newMessage.sender_id === userId) {
          setMessages(prev => [...prev, newMessage])
        }
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return {
    messages,
    contacts,
    selectedContact,
    loading,
    loadMessages,
    sendMessage,
    setSelectedContact
  }
}
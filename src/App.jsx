import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs'; // ⬅️ IMPORT BCRYPT
import './App.css';

// ─── Configuration Supabase ──────────────────────────────────────────────────
const SUPABASE_URL = "https://oohtrnmnrybaxwopzdam.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vaHRybm1ucnliYXh3b3B6ZGFtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjIxMTkyNSwiZXhwIjoyMDk3Nzg3OTI1fQ.z4qXvP_4DkL1Nq58PN_luq98Q-Nr7XskzZGMiZDrNUQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Fonctions de hachage avec bcrypt ──────────────────────────────────────
const SALT_ROUNDS = 10; // Plus élevé = plus sécurisé mais plus lent

// Hacher un mot de passe
const hashPassword = async (password) => {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hash = await bcrypt.hash(password, salt);
    return hash;
  } catch (error) {
    console.error('Erreur de hachage:', error);
    throw error;
  }
};

// Vérifier un mot de passe
const verifyPassword = async (password, hash) => {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('Erreur de vérification:', error);
    return false;
  }
};

// ─── Emojis ───────────────────────────────────────────────────────────────────
const EMOJIS = ["😀","😂","😊","😍","🥰","😎","🤔","😅","🙏","👍","❤️","🔥","✨","🎉","🚀","💯","😭","😤","🤣","😇","😋","🤗","😏","😬","🤩","😴","🥳","💪","👏","🙌"];

// ─── IndexedDB ──────────────────────────────────────────────────────────────
const DB_NAME = 'ChatAppDB';
const DB_VERSION = 3;
const STORES = {
  USERS: 'users',
  MESSAGES: 'messages',
  CONVERSATIONS: 'conversations',
  SESSION: 'session',
  PENDING_MESSAGES: 'pending_messages'
};

class OfflineDB {
  constructor() {
    this.db = null;
    this.isOpen = false;
  }

  async open() {
    if (this.isOpen) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.isOpen = true;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains(STORES.USERS)) {
          db.createObjectStore(STORES.USERS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.MESSAGES)) {
          db.createObjectStore(STORES.MESSAGES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.CONVERSATIONS)) {
          db.createObjectStore(STORES.CONVERSATIONS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.SESSION)) {
          db.createObjectStore(STORES.SESSION, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.PENDING_MESSAGES)) {
          db.createObjectStore(STORES.PENDING_MESSAGES, { keyPath: 'id' });
        }
      };
    });
  }

  async get(storeName, id) {
    await this.open();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(storeName) {
    await this.open();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async put(storeName, data) {
    await this.open();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName, id) {
    await this.open();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName) {
    await this.open();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async batchPut(storeName, items) {
    await this.open();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      let completed = 0;
      const total = items.length;
      
      if (total === 0) {
        resolve();
        return;
      }

      items.forEach((item) => {
        const request = store.put(item);
        request.onsuccess = () => {
          completed++;
          if (completed === total) resolve();
        };
        request.onerror = () => reject(request.error);
      });
    });
  }
}

const offlineDB = new OfflineDB();

// ─── Utilitaires ───────────────────────────────────────────────────────────────
function getInitials(name) {
  if (!name) return '?';
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (diff < 172800000) return "Hier";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

function formatDateSeparator(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000) return "Aujourd'hui";
  if (diff < 172800000) return "Hier";
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

function groupByDate(messages) {
  const groups = [];
  let lastDate = null;
  messages.forEach((msg) => {
    const d = new Date(msg.created_at).toDateString();
    if (d !== lastDate) {
      groups.push({ type: "separator", label: formatDateSeparator(msg.created_at), id: `sep-${d}` });
      lastDate = d;
    }
    groups.push({ type: "message", ...msg });
  });
  return groups;
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function ChatApp() {
  // ─── Auth State ────────────────────────────────────────────────────────────
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // ─── App State ─────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState("dark");
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState({});
  const [activeContact, setActiveContact] = useState(null);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [pendingMessages, setPendingMessages] = useState([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newAvatar, setNewAvatar] = useState('');

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const messagesAreaRef = useRef(null);
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

  // ─── Gestion de la connexion réseau ──────────────────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingMessages();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ─── Vérification de session au chargement ──────────────────────────────
  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await offlineDB.get(STORES.SESSION, 'session');
        
        if (session && session.user) {
          setCurrentUser(session.user);
          setIsAuthenticated(true);
          setIsOfflineMode(session.offline || false);
          await loadOfflineData();
          setLoading(false);
          
          if (isOnline && !session.offline) {
            try {
              const { data: { session: supabaseSession } } = await supabase.auth.getSession();
              if (supabaseSession) {
                setCurrentUser(supabaseSession.user);
                await ensureUserExists(supabaseSession.user);
              }
            } catch (e) {
              console.log('Session Supabase expirée, utilisation du cache');
            }
          }
          return;
        }

        if (isOnline) {
          try {
            const { data: { session: supabaseSession } } = await supabase.auth.getSession();
            if (supabaseSession) {
              setCurrentUser(supabaseSession.user);
              setIsAuthenticated(true);
              setIsOfflineMode(false);
              await ensureUserExists(supabaseSession.user);
              await offlineDB.put(STORES.SESSION, { id: 'session', user: supabaseSession.user, offline: false });
              setLoading(false);
              return;
            }
          } catch (e) {
            console.log('Pas de session active');
          }
        }

        setIsAuthenticated(false);
        setLoading(false);
      } catch (error) {
        console.error("Erreur vérification session:", error);
        setIsAuthenticated(false);
        setLoading(false);
      }
    };

    checkSession();
  }, [isOnline]);

  // ─── Fonction d'inscription ──────────────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      if (!email || !password || !username) {
        throw new Error('Tous les champs sont requis');
      }

      if (password.length < 6) {
        throw new Error('Le mot de passe doit contenir au moins 6 caractères');
      }

      if (password !== confirmPassword) {
        throw new Error('Les mots de passe ne correspondent pas');
      }

      // Si hors ligne, créer un compte local
      if (!isOnline) {
        // Hacher le mot de passe avec bcrypt
        const hashedPassword = await hashPassword(password);
        
        const localUser = {
          id: `local-${Date.now()}`,
          name: username,
          email: email,
          password_hash: hashedPassword, // Stocké avec bcrypt
          status: 'offline',
          created_at: new Date().toISOString(),
          is_local: true
        };

        // Vérifier si l'email existe déjà localement
        const existingUsers = await offlineDB.getAll(STORES.USERS);
        if (existingUsers.some(u => u.email === email)) {
          throw new Error('Cet email est déjà utilisé');
        }

        await offlineDB.put(STORES.USERS, localUser);
        await offlineDB.put(STORES.SESSION, { id: 'session', user: localUser, offline: true });

        setCurrentUser(localUser);
        setUserProfile(localUser);
        setIsAuthenticated(true);
        setIsOfflineMode(true);
        setAuthLoading(false);
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setUsername('');
        return;
      }

      // Mode en ligne - inscription Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: username,
            email: email
          },
          emailRedirectTo: window.location.origin
        }
      });

      if (error) {
        if (error.message.includes('rate limit')) {
          throw new Error('Trop de tentatives. Veuillez patienter 1 heure.');
        }
        throw error;
      }

      if (data.user) {
        // Hacher le mot de passe pour le stockage local
        const hashedPassword = await hashPassword(password);
        
        await ensureUserExists(data.user);
        
        // Ajouter le mot de passe hashé au profil local
        const localProfile = await offlineDB.get(STORES.USERS, data.user.id);
        if (localProfile) {
          localProfile.password_hash = hashedPassword;
          await offlineDB.put(STORES.USERS, localProfile);
        }

        setCurrentUser(data.user);
        setIsAuthenticated(true);
        setIsOfflineMode(false);
        await offlineDB.put(STORES.SESSION, { id: 'session', user: data.user, offline: false });
        setAuthLoading(false);
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setUsername('');
      }
    } catch (error) {
      console.error('Erreur inscription:', error);
      setAuthError(error.message);
      setAuthLoading(false);
    }
  };

  // ─── Fonction de connexion ──────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      if (!email || !password) {
        throw new Error('Email et mot de passe requis');
      }

      // Si hors ligne ou si la connexion Supabase échoue, vérifier localement
      if (!isOnline) {
        // Vérifier les identifiants localement avec bcrypt
        const users = await offlineDB.getAll(STORES.USERS);
        const user = users.find(u => u.email === email);
        
        if (!user) {
          throw new Error('Email ou mot de passe incorrect');
        }

        if (!user.password_hash) {
          throw new Error('Ce compte n\'a pas de mot de passe local. Connectez-vous en ligne.');
        }

        // Vérifier le mot de passe avec bcrypt
        const isValid = await verifyPassword(password, user.password_hash);
        if (!isValid) {
          throw new Error('Email ou mot de passe incorrect');
        }

        await offlineDB.put(STORES.SESSION, { id: 'session', user, offline: true });
        setCurrentUser(user);
        setUserProfile(user);
        setIsAuthenticated(true);
        setIsOfflineMode(true);
        await loadOfflineData();
        setAuthLoading(false);
        setEmail('');
        setPassword('');
        return;
      }

      // Mode en ligne - connexion Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        // Si la connexion Supabase échoue, essayer en local avec bcrypt
        const users = await offlineDB.getAll(STORES.USERS);
        const localUser = users.find(u => u.email === email);
        
        if (localUser && localUser.password_hash) {
          const isValid = await verifyPassword(password, localUser.password_hash);
          if (isValid) {
            await offlineDB.put(STORES.SESSION, { id: 'session', user: localUser, offline: true });
            setCurrentUser(localUser);
            setUserProfile(localUser);
            setIsAuthenticated(true);
            setIsOfflineMode(true);
            await loadOfflineData();
            setAuthLoading(false);
            setEmail('');
            setPassword('');
            return;
          }
        }
        throw new Error('Email ou mot de passe incorrect');
      }

      if (data.user) {
        // Mettre à jour le mot de passe hashé localement avec bcrypt
        const hashedPassword = await hashPassword(password);
        const localProfile = await offlineDB.get(STORES.USERS, data.user.id);
        if (localProfile) {
          localProfile.password_hash = hashedPassword;
          await offlineDB.put(STORES.USERS, localProfile);
        }

        await ensureUserExists(data.user);
        setCurrentUser(data.user);
        setIsAuthenticated(true);
        setIsOfflineMode(false);
        await offlineDB.put(STORES.SESSION, { id: 'session', user: data.user, offline: false });
        setAuthLoading(false);
        setEmail('');
        setPassword('');
      }
    } catch (error) {
      console.error('Erreur connexion:', error);
      setAuthError(error.message);
      setAuthLoading(false);
    }
  };

  // ─── Fonction de déconnexion ─────────────────────────────────────────────
  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      setCurrentUser(null);
      setUserProfile(null);
      setContacts([]);
      setMessages({});
      setActiveContact(null);
      setIsOfflineMode(false);
      await offlineDB.clear(STORES.SESSION);
      await offlineDB.clear(STORES.MESSAGES);
      await offlineDB.clear(STORES.CONVERSATIONS);
      await offlineDB.clear(STORES.PENDING_MESSAGES);
    } catch (error) {
      console.error("Erreur déconnexion:", error);
    }
  };

  // ─── Charger les données hors ligne ───────────────────────────────────────
  const loadOfflineData = async () => {
    try {
      const [users, conversations] = await Promise.all([
        offlineDB.getAll(STORES.USERS),
        offlineDB.getAll(STORES.CONVERSATIONS)
      ]);

      setContacts(users || []);

      const messagesMap = {};
      for (const conv of conversations || []) {
        const msgs = await offlineDB.getAll(STORES.MESSAGES);
        const convMessages = msgs.filter(m => m.conversation_id === conv.id);
        const contactId = conv.participant_a === currentUser?.id 
          ? conv.participant_b 
          : conv.participant_a;
        messagesMap[contactId] = convMessages;
      }
      setMessages(messagesMap);

      const pending = await offlineDB.get(STORES.PENDING_MESSAGES, 'pending');
      setPendingMessages(pending?.messages || []);
    } catch (error) {
      console.error("Erreur chargement données hors ligne:", error);
    }
  };

  // ─── S'assurer que l'utilisateur existe ──────────────────────────────────
  const ensureUserExists = async (user) => {
    try {
      if (isOnline) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error && error.code === 'PGRST116') {
          const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert({
              id: user.id,
              name: user.user_metadata?.name || `Utilisateur ${user.id.slice(0, 6)}`,
              email: user.email || email,
              avatar_url: user.user_metadata?.avatar_url || null,
              status: 'online',
              last_seen: new Date().toISOString()
            })
            .select()
            .single();

          if (insertError) throw insertError;
          await offlineDB.put(STORES.USERS, newUser);
          setUserProfile(newUser);
          return newUser;
        }

        if (data) {
          await offlineDB.put(STORES.USERS, data);
          setUserProfile(data);
          return data;
        }
      }

      const cached = await offlineDB.get(STORES.USERS, user.id);
      if (cached) {
        setUserProfile(cached);
        return cached;
      }
      
      const localUser = {
        id: user.id,
        name: user.user_metadata?.name || `Utilisateur ${user.id.slice(0, 6)}`,
        email: user.email || email || 'Non défini',
        status: 'offline',
        created_at: new Date().toISOString()
      };
      await offlineDB.put(STORES.USERS, localUser);
      setUserProfile(localUser);
      return localUser;
    } catch (error) {
      console.error("Erreur ensureUserExists:", error);
      return user;
    }
  };

  // ─── Charger les contacts ──────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser || loading || !isAuthenticated) return;

    const loadContacts = async () => {
      try {
        if (isOnline) {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .neq('id', currentUser.id)
            .order('name');

          if (error) throw error;
          
          if (data) {
            setContacts(data);
            await offlineDB.batchPut(STORES.USERS, data);
          }
        } else {
          const users = await offlineDB.getAll(STORES.USERS);
          const filtered = users.filter(u => u.id !== currentUser.id);
          setContacts(filtered);
        }
      } catch (error) {
        console.error("Erreur chargement contacts:", error);
        const users = await offlineDB.getAll(STORES.USERS);
        const filtered = users.filter(u => u.id !== currentUser.id);
        setContacts(filtered);
      }
    };

    loadContacts();

    if (isOnline) {
      const subscription = supabase
        .channel('users-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'users',
            filter: `id=neq.${currentUser.id}`
          },
          (payload) => {
            setContacts(prev => 
              prev.map(contact => 
                contact.id === payload.new.id 
                  ? { ...contact, status: payload.new.status, last_seen: payload.new.last_seen }
                  : contact
              )
            );
            offlineDB.put(STORES.USERS, payload.new);
          }
        )
        .subscribe();

      return () => subscription.unsubscribe();
    }
  }, [currentUser, isOnline, loading, isAuthenticated]);

  // ─── Charger les conversations ─────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser || loading || !isAuthenticated) return;

    const loadConversations = async () => {
      try {
        if (isOnline) {
          const { data, error } = await supabase
            .from('conversations')
            .select(`
              *,
              user_a:users!conversations_participant_a_fkey(id, name, avatar_url, status, email),
              user_b:users!conversations_participant_b_fkey(id, name, avatar_url, status, email)
            `)
            .or(`participant_a.eq.${currentUser.id},participant_b.eq.${currentUser.id}`)
            .order('created_at', { ascending: false });

          if (error) throw error;
          if (data) {
            await offlineDB.batchPut(STORES.CONVERSATIONS, data);
          }
        }
      } catch (error) {
        console.error("Erreur chargement conversations:", error);
      }
    };

    loadConversations();
  }, [currentUser, isOnline, loading, isAuthenticated]);

  // ─── Charger les messages ─────────────────────────────────────────────────
  const loadMessages = useCallback(async (contactId) => {
    if (!currentUser) return;

    try {
      if (isOnline) {
        const conversation = await getOrCreateConversation(contactId);
        if (!conversation) return;

        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: true });

        if (error) throw error;

        const msgs = data || [];
        setMessages(prev => ({
          ...prev,
          [contactId]: msgs
        }));

        await offlineDB.batchPut(STORES.MESSAGES, msgs);
        await markMessagesAsRead(conversation.id, contactId);

        return conversation;
      } else {
        const allMessages = await offlineDB.getAll(STORES.MESSAGES);
        const contactMessages = allMessages.filter(m => 
          (m.sender_id === contactId && m.receiver_id === currentUser.id) ||
          (m.sender_id === currentUser.id && m.receiver_id === contactId)
        );
        setMessages(prev => ({
          ...prev,
          [contactId]: contactMessages
        }));
      }
    } catch (error) {
      console.error("Erreur chargement messages:", error);
      const allMessages = await offlineDB.getAll(STORES.MESSAGES);
      const contactMessages = allMessages.filter(m => 
        (m.sender_id === contactId && m.receiver_id === currentUser.id) ||
        (m.sender_id === currentUser.id && m.receiver_id === contactId)
      );
      setMessages(prev => ({
        ...prev,
        [contactId]: contactMessages
      }));
    }
  }, [currentUser, isOnline]);

  // ─── Obtenir ou créer une conversation ──────────────────────────────────
  const getOrCreateConversation = async (contactId) => {
    try {
      const localConvs = await offlineDB.getAll(STORES.CONVERSATIONS);
      const existing = localConvs.find(c => 
        (c.participant_a === currentUser.id && c.participant_b === contactId) ||
        (c.participant_a === contactId && c.participant_b === currentUser.id)
      );

      if (existing && isOnline) {
        const { data, error } = await supabase
          .from('conversations')
          .select('*')
          .eq('id', existing.id)
          .single();

        if (!error && data) return data;
      }

      if (existing) return existing;

      if (!isOnline) {
        const tempConv = {
          id: `temp-${Date.now()}`,
          participant_a: currentUser.id,
          participant_b: contactId,
          created_at: new Date().toISOString(),
          is_temp: true
        };
        await offlineDB.put(STORES.CONVERSATIONS, tempConv);
        return tempConv;
      }

      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert({
          participant_a: currentUser.id,
          participant_b: contactId
        })
        .select()
        .single();

      if (createError) throw createError;
      
      await offlineDB.put(STORES.CONVERSATIONS, newConv);
      return newConv;
    } catch (error) {
      console.error("Erreur getOrCreateConversation:", error);
      
      const tempConv = {
        id: `temp-${Date.now()}`,
        participant_a: currentUser.id,
        participant_b: contactId,
        created_at: new Date().toISOString(),
        is_temp: true
      };
      await offlineDB.put(STORES.CONVERSATIONS, tempConv);
      return tempConv;
    }
  };

  // ─── Marquer les messages comme lus ──────────────────────────────────────
  const markMessagesAsRead = async (conversationId, contactId) => {
    try {
      if (isOnline) {
        await supabase
          .from('messages')
          .update({ read: true })
          .eq('conversation_id', conversationId)
          .eq('sender_id', contactId)
          .eq('read', false);
      }
      
      const allMessages = await offlineDB.getAll(STORES.MESSAGES);
      const updated = allMessages.map(m => 
        m.conversation_id === conversationId && m.sender_id === contactId
          ? { ...m, read: true }
          : m
      );
      await offlineDB.batchPut(STORES.MESSAGES, updated);
    } catch (error) {
      console.error("Erreur markMessagesAsRead:", error);
    }
  };

  // ─── Sélectionner un contact ──────────────────────────────────────────────
  const selectContact = useCallback(async (contact) => {
    setActiveContact(contact);
    setSidebarVisible(false);
    await loadMessages(contact.id);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [loadMessages]);

  // ─── Envoyer un message ──────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    if (!input.trim() || !activeContact || !currentUser) return;

    const messageContent = input.trim();
    const tempId = `temp-${Date.now()}`;
    const message = {
      id: tempId,
      content: messageContent,
      sender_id: currentUser.id,
      receiver_id: activeContact.id,
      created_at: new Date().toISOString(),
      read: false,
      pending: !isOnline,
      conversation_id: null
    };

    try {
      const conversation = await getOrCreateConversation(activeContact.id);
      if (conversation) {
        message.conversation_id = conversation.id;
      }

      setMessages(prev => ({
        ...prev,
        [activeContact.id]: [...(prev[activeContact.id] || []), message]
      }));

      await offlineDB.put(STORES.MESSAGES, message);

      if (isOnline && conversation && !conversation.is_temp) {
        const { data, error } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversation.id,
            sender_id: currentUser.id,
            content: messageContent,
            read: false
          })
          .select()
          .single();

        if (error) throw error;

        await offlineDB.delete(STORES.MESSAGES, tempId);
        await offlineDB.put(STORES.MESSAGES, data);
        
        setMessages(prev => ({
          ...prev,
          [activeContact.id]: prev[activeContact.id].map(m => 
            m.id === tempId ? data : m
          )
        }));
      } else {
        const pending = [...pendingMessages, message];
        setPendingMessages(pending);
        await offlineDB.put(STORES.PENDING_MESSAGES, { id: 'pending', messages: pending });
        setSyncStatus('pending');
      }

      setInput("");
      setShowEmoji(false);
    } catch (error) {
      console.error("Erreur envoi message:", error);
      const pending = [...pendingMessages, message];
      setPendingMessages(pending);
      await offlineDB.put(STORES.PENDING_MESSAGES, { id: 'pending', messages: pending });
      setSyncStatus('pending');
    }
  }, [input, activeContact, currentUser, isOnline, pendingMessages]);

  // ─── Synchroniser les messages en attente ────────────────────────────────
  const syncPendingMessages = useCallback(async () => {
    if (!isOnline || pendingMessages.length === 0 || !currentUser) return;

    setSyncStatus('syncing');
    const pending = [...pendingMessages];
    const synced = [];

    for (const msg of pending) {
      try {
        const contactId = msg.receiver_id || activeContact?.id;
        if (!contactId) continue;

        const conversation = await getOrCreateConversation(contactId);
        if (!conversation || conversation.is_temp) continue;

        const { data, error } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversation.id,
            sender_id: currentUser.id,
            content: msg.content,
            read: false
          })
          .select()
          .single();

        if (error) throw error;

        await offlineDB.delete(STORES.MESSAGES, msg.id);
        await offlineDB.put(STORES.MESSAGES, data);
        synced.push(data);
      } catch (error) {
        console.error("Erreur synchronisation message:", error);
        synced.push(msg);
      }
    }

    const remaining = pending.filter(m => !synced.includes(m));
    setPendingMessages(remaining);
    await offlineDB.put(STORES.PENDING_MESSAGES, { id: 'pending', messages: remaining });
    setSyncStatus(remaining.length > 0 ? 'pending' : 'idle');

    if (activeContact) {
      const allMessages = await offlineDB.getAll(STORES.MESSAGES);
      const contactMessages = allMessages.filter(m => 
        (m.sender_id === activeContact.id && m.receiver_id === currentUser.id) ||
        (m.sender_id === currentUser.id && m.receiver_id === activeContact.id)
      );
      setMessages(prev => ({
        ...prev,
        [activeContact.id]: contactMessages
      }));
    }
  }, [isOnline, pendingMessages, currentUser, activeContact]);

  // ─── Écouter les messages en temps réel ──────────────────────────────────
  useEffect(() => {
    if (!currentUser || !isOnline || !isAuthenticated) return;

    const subscription = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          const newMsg = payload.new;
          
          if (newMsg.sender_id === currentUser.id) return;

          const contactId = newMsg.sender_id;

          await offlineDB.put(STORES.MESSAGES, newMsg);

          setMessages(prev => ({
            ...prev,
            [contactId]: [...(prev[contactId] || []), newMsg]
          }));

          if (activeContact?.id === contactId) {
            await markMessagesAsRead(newMsg.conversation_id, contactId);
          }
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, [currentUser, isOnline, isAuthenticated, activeContact]);

  // ─── Mettre à jour le status ──────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser || loading || !isAuthenticated) return;

    const updateStatus = async (status) => {
      try {
        if (isOnline) {
          await supabase
            .from('users')
            .update({ 
              status,
              last_seen: new Date().toISOString()
            })
            .eq('id', currentUser.id);
        }
        
        const user = await offlineDB.get(STORES.USERS, currentUser.id);
        if (user) {
          await offlineDB.put(STORES.USERS, { ...user, status, last_seen: new Date().toISOString() });
        }
      } catch (error) {
        console.error("Erreur updateStatus:", error);
      }
    };

    if (isOnline) {
      updateStatus('online');
    }

    const handleBeforeUnload = () => {
      updateStatus('offline');
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        updateStatus('away');
      } else if (isOnline) {
        updateStatus('online');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (isOnline) {
        updateStatus('offline');
      }
    };
  }, [currentUser, isOnline, loading, isAuthenticated]);

  // ─── Scroll ──────────────────────────────────────────────────────────────
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }, []);

  useEffect(() => {
    if (activeContact) scrollToBottom(false);
  }, [activeContact, scrollToBottom]);

  useEffect(() => {
    if (activeContact && messages[activeContact.id]) scrollToBottom();
  }, [messages, activeContact, scrollToBottom]);

  const handleScroll = () => {
    const el = messagesAreaRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setShowScrollBtn(!atBottom);
  };

  // ─── PWA ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // ─── Filtrage et helpers ──────────────────────────────────────────────────
  const filteredContacts = contacts.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase())
  );

  const lastMsg = (contactId) => {
    const msgs = messages[contactId] || [];
    return msgs[msgs.length - 1] || null;
  };

  const unreadCount = (contactId) => {
    return (messages[contactId] || []).filter(
      (m) => m.sender_id !== currentUser?.id && !m.read && !m.pending
    ).length;
  };

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setShowInstallBanner(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const currentMessages = activeContact ? groupByDate(messages[activeContact.id] || []) : [];
  const onlineCount = contacts.filter((c) => c.status === "online").length;

  // ─── Écran d'authentification ─────────────────────────────────────────────
  if (!isAuthenticated && !loading) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Chat<span>.</span></h1>
            <p className="auth-subtitle">
              {authMode === 'login' ? 'Connectez-vous à votre compte' : 'Créez votre compte'}
            </p>
            {!isOnline && (
              <div className="auth-offline-badge">
                <i className="fa-solid fa-wifi-slash" />
                Mode hors ligne - Connexion locale uniquement
              </div>
            )}
          </div>

          <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="auth-form">
            {authMode === 'register' && (
              <div className="auth-field">
                <label>Nom d'utilisateur</label>
                <input
                  type="text"
                  placeholder="Votre nom"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="auth-field">
              <label>Email</label>
              <input
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="auth-field">
              <label>Mot de passe</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              {authMode === 'register' && (
                <small className="auth-hint">Minimum 6 caractères</small>
              )}
            </div>

            {authMode === 'register' && (
              <div className="auth-field">
                <label>Confirmer le mot de passe</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            )}

            {authError && (
              <div className="auth-error">{authError}</div>
            )}

            <button 
              type="submit" 
              className="auth-btn"
              disabled={authLoading}
            >
              {authLoading ? (
                <span className="auth-spinner"></span>
              ) : (
                authMode === 'login' ? 'Se connecter' : 'S\'inscrire'
              )}
            </button>
          </form>

          <div className="auth-footer">
            {authMode === 'login' ? (
              <p>
                Pas encore de compte ?{' '}
                <button 
                  className="auth-switch-btn"
                  onClick={() => { setAuthMode('register'); setAuthError(''); }}
                >
                  S'inscrire
                </button>
              </p>
            ) : (
              <p>
                Déjà un compte ?{' '}
                <button 
                  className="auth-switch-btn"
                  onClick={() => { setAuthMode('login'); setAuthError(''); }}
                >
                  Se connecter
                </button>
              </p>
            )}
          </div>

          {!isOnline && !isAuthenticated && (
            <div className="auth-offline-notice">
              <i className="fa-solid fa-info-circle" />
              <span>Les comptes créés hors ligne seront stockés localement</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Chargement ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>{isOnline ? 'Chargement...' : 'Mode hors ligne...'}</p>
      </div>
    );
  }

  // ─── Application principale ──────────────────────────────────────────────────
  return (
    <div className="chat-app">
      {/* Barre de statut hors ligne */}
      {!isOnline && (
        <div className="offline-banner">
          <i className="fa-solid fa-wifi-slash" />
          <span>Mode hors ligne - Fonctionnalités limitées</span>
          {pendingMessages.length > 0 && (
            <span className="pending-badge">{pendingMessages.length} en attente</span>
          )}
        </div>
      )}

      {isOfflineMode && (
        <div className="offline-mode-banner">
          <i className="fa-solid fa-user-secret" />
          <span>Mode local - Vos données sont stockées localement</span>
        </div>
      )}

      {/* Sidebar */}
      <div className={`sidebar ${!sidebarVisible ? 'hidden' : ''}`}>
        <div className="sidebar-header">
          <h1>Chat<span>.</span></h1>
          <div className="header-actions">
            <button
              className={`icon-btn ${theme === "light" ? "active" : ""}`}
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              title="Changer le thème"
            >
              <i className={`fa-solid fa-${theme === "dark" ? "sun" : "moon"}`} />
            </button>
            <button 
              className="icon-btn" 
              title="Déconnexion"
              onClick={logout}
            >
              <i className="fa-solid fa-sign-out-alt" />
            </button>
            <button className="icon-btn" title="Paramètres">
              <i className="fa-solid fa-ellipsis-vertical" />
            </button>
          </div>
        </div>

        {/* Profil utilisateur */}
        {userProfile && (
          <div className="user-profile" onClick={() => setShowProfileModal(true)}>
            <div className="profile-avatar">
              <div className="avatar-circle profile-avatar-circle">
                {getInitials(userProfile.name)}
              </div>
              <div className={`profile-status-dot ${userProfile.status || 'offline'}`} />
            </div>
            <div className="profile-info">
              <div className="profile-name">
                {userProfile.name}
                {isOfflineMode && <span className="offline-badge">●</span>}
              </div>
              <div className="profile-email">{userProfile.email || currentUser?.email || 'Email non défini'}</div>
              <div className="profile-status">
                <span className={`status-text ${userProfile.status || 'offline'}`}>
                  ● {userProfile.status === 'online' ? 'En ligne' : 
                     userProfile.status === 'away' ? 'Absent' : 
                     isOfflineMode ? 'Local' : 'Hors ligne'}
                </span>
              </div>
            </div>
            <button className="profile-edit-btn" title="Modifier le profil">
              <i className="fa-solid fa-pen" />
            </button>
          </div>
        )}

        <div className="search-wrap">
          <div className="search-box">
            <i className="fa-solid fa-magnifying-glass" />
            <input
              placeholder="Rechercher un contact"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="icon-btn clear-btn" onClick={() => setSearch("")}>
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>
        </div>

        <div className="online-count">
          <i className="fa-solid fa-circle" />
          {isOnline ? `${onlineCount} contact${onlineCount > 1 ? "s" : ""} en ligne` : '📶 Hors ligne'}
        </div>

        <div className="contacts-list">
          {filteredContacts.length === 0 ? (
            <div className="no-contacts">
              {search ? "Aucun contact trouvé" : "Aucun contact disponible"}
            </div>
          ) : (
            filteredContacts.map((contact) => {
              const last = lastMsg(contact.id);
              const count = unreadCount(contact.id);
              return (
                <div
                  key={contact.id}
                  className={`contact-item ${activeContact?.id === contact.id ? "active" : ""}`}
                  onClick={() => selectContact(contact)}
                >
                  <div className="avatar">
                    <div className="avatar-circle">{getInitials(contact.name)}</div>
                    <div className={`status-dot ${contact.status || 'offline'}`} />
                  </div>
                  <div className="contact-info">
                    <div className="contact-top">
                      <span className="contact-name">{contact.name}</span>
                      {last && <span className="contact-time">{formatTime(last.created_at)}</span>}
                    </div>
                    <div className="contact-preview">
                      <span className="preview-text">
                        {last ? (
                          <>
                            {last.sender_id === currentUser?.id && (
                              <i className={`fa-solid ${last.pending ? 'fa-clock' : 'fa-check-double'}`} />
                            )}
                            {last.pending && <span className="pending-label">[En attente] </span>}
                            {last.content}
                          </>
                        ) : (
                          <span className="empty-preview">Démarrer une conversation</span>
                        )}
                      </span>
                      {count > 0 && <span className="unread-badge">{count}</span>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Panel */}
      <div className="chat-panel">
        <div className="chat-bg-pattern" />

        {activeContact ? (
          <>
            {/* Chat header */}
            <div className="chat-header">
              <button className="icon-btn back-btn" onClick={() => setSidebarVisible(true)}>
                <i className="fa-solid fa-arrow-left" />
              </button>
              <div className="avatar">
                <div className="avatar-circle avatar-sm">{getInitials(activeContact.name)}</div>
                <div className={`status-dot ${activeContact.status || 'offline'}`} />
              </div>
              <div className="chat-header-info">
                <div className="chat-header-name">{activeContact.name}</div>
                <div className="chat-header-email">{activeContact.email || ''}</div>
                <div className={`chat-header-status ${isTyping ? "typing" : activeContact.status || 'offline'}`}>
                  {isTyping
                    ? "est en train d'écrire..."
                    : !isOnline
                    ? "Hors ligne (mode déconnecté)"
                    : activeContact.status === "online"
                    ? "En ligne"
                    : activeContact.last_seen 
                      ? `Dernière connexion: ${formatTime(activeContact.last_seen)}`
                      : "Hors ligne"}
                </div>
              </div>
              <div className="header-actions">
                <button className="icon-btn" title="Appel vidéo" disabled={!isOnline}>
                  <i className="fa-solid fa-video" />
                </button>
                <button className="icon-btn" title="Appel audio" disabled={!isOnline}>
                  <i className="fa-solid fa-phone" />
                </button>
                <button className="icon-btn" title="Plus d'options">
                  <i className="fa-solid fa-ellipsis-vertical" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              className="messages-area"
              ref={messagesAreaRef}
              onScroll={handleScroll}
            >
              {currentMessages.length === 0 ? (
                <div className="empty-messages">
                  <i className="fa-regular fa-comment-dots" />
                  {isOnline ? 'Commencez la conversation !' : 'Mode hors ligne - Les messages seront synchronisés à la reconnexion'}
                </div>
              ) : (
                currentMessages.map((item) =>
                  item.type === "separator" ? (
                    <div key={item.id} className="date-separator">
                      <span>{item.label}</span>
                    </div>
                  ) : (
                    <div
                      key={item.id}
                      className={`msg-wrapper ${item.sender_id === currentUser?.id ? "out" : "in"}`}
                    >
                      <div className={`bubble ${item.sender_id === currentUser?.id ? "out" : "in"}`}>
                        {item.content}
                        <div className="bubble-meta">
                          <span className="bubble-time">{formatTime(item.created_at)}</span>
                          {item.sender_id === currentUser?.id && (
                            <i
                              className={`fa-solid ${item.pending ? 'fa-clock' : 'fa-check-double'} read-icon ${item.read ? "read" : ""}`}
                            />
                          )}
                          {item.pending && (
                            <span className="pending-badge-small">⏳</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                )
              )}

              {isTyping && (
                <div className="msg-wrapper in">
                  <div className="typing-indicator">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Scroll to bottom btn */}
            {showScrollBtn && (
              <button className="scroll-btn" onClick={() => scrollToBottom()}>
                <i className="fa-solid fa-chevron-down" />
              </button>
            )}

            {/* Emoji picker */}
            {showEmoji && (
              <div className="emoji-grid">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    className="emoji-btn-item"
                    onClick={() => setInput((v) => v + e)}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="input-area">
              <button className="icon-btn attach-btn" title="Joindre un fichier" disabled={!isOnline}>
                <i className="fa-solid fa-paperclip" />
              </button>
              <textarea
                ref={inputRef}
                className="input-box"
                placeholder={isOnline ? "Message" : "Hors ligne - Le message sera envoyé à la reconnexion"}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                }}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={!activeContact}
              />
              <button
                className="icon-btn emoji-btn"
                title="Emoji"
                onClick={() => setShowEmoji((v) => !v)}
              >
                <i className="fa-regular fa-face-smile" />
              </button>
              <button 
                className="send-btn" 
                onClick={sendMessage} 
                title={!isOnline ? "En attente de connexion" : "Envoyer"}
                disabled={!activeContact || !input.trim()}
              >
                <i className={`fa-solid ${!isOnline ? 'fa-clock' : 'fa-paper-plane'}`} />
              </button>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              <i className="fa-brands fa-rocketchat" />
            </div>
            <h2>Bienvenue sur Chat.</h2>
            <p>Sélectionnez une conversation pour commencer à discuter avec vos contacts.</p>
            {!isOnline && (
              <div className="offline-notice">
                <i className="fa-solid fa-wifi-slash" />
                <span>Mode hors ligne - Les données sont disponibles localement</span>
              </div>
            )}
            <div className="features-tags">
              {["🔒 Chiffré", "⚡ Temps réel", "📱 Multiplateforme"].map((tag) => (
                <span key={tag} className="feature-tag">{tag}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL PROFIL ─── */}
      {showProfileModal && userProfile && (
        <div className="profile-modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <h2>Mon Profil</h2>
              <button className="close-modal-btn" onClick={() => setShowProfileModal(false)}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="profile-modal-body">
              <div className="profile-modal-avatar">
                <div className="avatar-circle profile-modal-avatar-circle">
                  {getInitials(userProfile.name)}
                </div>
                <div className={`profile-status-dot ${userProfile.status || 'offline'}`} />
              </div>

              <div className="profile-modal-info">
                <div className="profile-modal-field">
                  <label>Nom</label>
                  <div className="profile-modal-value">{userProfile.name}</div>
                </div>

                <div className="profile-modal-field">
                  <label>Email</label>
                  <div className="profile-modal-value">{userProfile.email || currentUser?.email || 'Non défini'}</div>
                </div>

                <div className="profile-modal-field">
                  <label>Statut</label>
                  <div className={`profile-modal-status ${userProfile.status || 'offline'}`}>
                    ● {userProfile.status === 'online' ? 'En ligne' : 
                       userProfile.status === 'away' ? 'Absent' : 
                       isOfflineMode ? 'Local' : 'Hors ligne'}
                  </div>
                </div>

                <div className="profile-modal-field">
                  <label>Membre depuis</label>
                  <div className="profile-modal-value">
                    {userProfile.created_at 
                      ? new Date(userProfile.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })
                      : 'Récemment'}
                  </div>
                </div>
              </div>

              <div className="profile-modal-actions">
                <button 
                  className="profile-edit-btn-modal"
                  onClick={() => {
                    setNewUsername(userProfile.name);
                    setNewAvatar(userProfile.avatar_url || '');
                    setEditingProfile(true);
                  }}
                >
                  <i className="fa-solid fa-pen" />
                  Modifier le profil
                </button>
                <button 
                  className="profile-logout-btn"
                  onClick={logout}
                >
                  <i className="fa-solid fa-sign-out-alt" />
                  Se déconnecter
                </button>
              </div>

              {/* Formulaire d'édition */}
              {editingProfile && (
                <div className="profile-edit-form">
                  <h3>Modifier mon profil</h3>
                  <div className="auth-field">
                    <label>Nom d'utilisateur</label>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="Votre nom"
                    />
                  </div>
                  <div className="auth-field">
                    <label>URL de l'avatar (optionnel)</label>
                    <input
                      type="text"
                      value={newAvatar}
                      onChange={(e) => setNewAvatar(e.target.value)}
                      placeholder="https://exemple.com/avatar.jpg"
                    />
                  </div>
                  <div className="profile-edit-actions">
                    <button 
                      className="profile-save-btn"
                      onClick={async () => {
                        // Mise à jour du profil
                        try {
                          if (isOnline) {
                            const { data, error } = await supabase
                              .from('users')
                              .update({
                                name: newUsername,
                                avatar_url: newAvatar || null
                              })
                              .eq('id', currentUser.id)
                              .select()
                              .single();

                            if (error) throw error;
                            if (data) {
                              setUserProfile(data);
                              await offlineDB.put(STORES.USERS, data);
                            }
                          } else {
                            // Mise à jour hors ligne
                            const updated = { ...userProfile, name: newUsername, avatar_url: newAvatar || null };
                            setUserProfile(updated);
                            await offlineDB.put(STORES.USERS, updated);
                          }
                          setEditingProfile(false);
                          setShowProfileModal(false);
                          setNewUsername('');
                          setNewAvatar('');
                        } catch (error) {
                          console.error('Erreur mise à jour:', error);
                        }
                      }}
                    >
                      Enregistrer
                    </button>
                    <button 
                      className="profile-cancel-btn"
                      onClick={() => {
                        setEditingProfile(false);
                        setNewUsername('');
                        setNewAvatar('');
                      }}
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PWA Install banner */}
      {showInstallBanner && (
        <div className="install-banner">
          <i className="fa-solid fa-download" />
          <p>
            Installer <span>Chat.</span> sur votre appareil
          </p>
          <button className="install-btn" onClick={handleInstall}>
            Installer
          </button>
          <button className="close-banner" onClick={() => setShowInstallBanner(false)}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      )}
    </div>
  );
}
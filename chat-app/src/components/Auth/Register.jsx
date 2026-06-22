import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const Register = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(email, password, username)
      navigate('/')
    } catch (err) {
      setError("Erreur lors de l'inscription")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <i className="fas fa-comment-dots" style={{ fontSize: '48px', color: '#C6FF34', marginBottom: '10px' }}></i>
          <h2 style={{ fontSize: '28px', marginBottom: '5px' }}>ChatApp</h2>
          <p className="subtitle">Créez votre compte</p>
        </div>
        {error && (
          <div style={{ 
            backgroundColor: '#ff4444', 
            color: 'white', 
            padding: '10px', 
            borderRadius: '8px', 
            marginBottom: '15px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Nom d'utilisateur"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={loading}
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Mot de passe (min 6 caractères)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength="6"
            disabled={loading}
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Inscription...' : "S'inscrire"}
          </button>
        </form>
        <p className="auth-link">
          Déjà un compte ? <Link to="/login">Se connecter</Link>
        </p>
      </div>
    </div>
  )
}

export default Register
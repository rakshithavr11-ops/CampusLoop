
import { useState } from 'react'
import { apiRequest } from './api'
import './App.css'

function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const token = new URLSearchParams(window.location.search).get('token')

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')
    setSuccess(false)

    if (!token) {
      setMessage('The reset link is missing or invalid. Please request a new one.')
      return
    }

    if (password.length < 8) {
      setMessage('Your new password must contain at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setMessage('The passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const data = await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token,
          password,
        }),
      })

      setSuccess(true)
      setMessage(data.message || 'Password reset successful! You can now log in.')
      setPassword('')
      setConfirmPassword('')
    } catch (error) {
      setMessage(error.message || 'Unable to reset your password. Please request a new link.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>CampusLoop</h1>
        <p>Connect with your campus community.</p>

        <h2>Reset Password</h2>
        <p>Enter and confirm your new password.</p>

        <input
          type="password"
          placeholder="New password (minimum 8 characters)"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          autoComplete="new-password"
          required
        />

        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          minLength={8}
          autoComplete="new-password"
          required
        />

        <button type="submit" disabled={loading || success}>
          {loading
            ? 'Please wait...'
            : success
              ? 'Password Reset'
              : 'Reset Password'}
        </button>

        {message && (
          <p role="status" style={{ marginTop: '16px' }}>
            {message}
          </p>
        )}

        {(success || !token) && (
          <p>
            <a href="/">Back to Login</a>
          </p>
        )}
      </form>
    </div>
  )
}

export default ResetPassword

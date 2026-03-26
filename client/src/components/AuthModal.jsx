import { useState } from 'react';

export default function AuthModal({ mode, onClose, onSubmit, loading, error }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({ name, email, password });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <h3>{mode === 'signup' ? 'Create account' : 'Welcome back'}</h3>
        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'signup' ? 'Sign Up' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

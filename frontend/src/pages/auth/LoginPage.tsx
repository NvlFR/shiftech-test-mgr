import { useState } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Message } from 'primereact/message';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../hooks/useAuth';

export function LoginPage() {
  const { signInWithPassword } = useAuthContext();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await signInWithPassword(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Email atau password salah.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
      <Card title="TestManager" className="w-25rem text-center">
        <p className="text-color-secondary mb-4">Masuk untuk mengelola Test Plan &amp; Test Case</p>
        <form onSubmit={handleSubmit} className="flex flex-column gap-3 text-left">
          <div className="flex flex-column gap-2">
            <label htmlFor="email">Email</label>
            <InputText
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="flex flex-column gap-2">
            <label htmlFor="password">Password</label>
            <Password
              inputId="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              toggleMask
              feedback={false}
              inputClassName="w-full"
              className="w-full"
              autoComplete="current-password"
              required
            />
          </div>
          {error && <Message severity="error" text={error} />}
          <Button type="submit" label="Masuk" icon="pi pi-sign-in" loading={submitting} className="w-full" />
        </form>
      </Card>
    </div>
  );
}

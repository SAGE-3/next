import { LoginModal, useAuth } from '@sage3/frontend';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();

  const [loginOpen, setLoginOpen] = useState(true);

  useEffect(() => {
    authNavCheck();
  }, []);

  function authNavCheck() {
    if (auth.isAuthenticated) {
      navigate('/home');
    }
  }

  return (
    <div>
      <h1>LOGIN PAGE</h1> <Link to="/home">GO TO HOME</Link>
      <LoginModal guest={true} isOpen={loginOpen} onClose={authNavCheck}></LoginModal>
    </div>
  );
}

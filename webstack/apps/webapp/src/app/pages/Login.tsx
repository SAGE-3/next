import { Button, ButtonGroup, IconButton } from '@chakra-ui/react';
import { AuthHTTPService, BgColor, useAuth } from '@sage3/frontend';
import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { FcGoogle } from 'react-icons/fc';
import { FaGhost } from 'react-icons/fa';

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();

  const authNavCheck = useCallback(() => {
    if (auth.isAuthenticated) {
      navigate('/home');
    }
  }, [auth, navigate]);


  useEffect(() => {
    authNavCheck();
  }, [authNavCheck]);


  return (
    <div>
      <h1>LOGIN PAGE</h1>
      {/* Google Auth Service */}
      <ButtonGroup isAttached width="17rem" size="lg">
        <IconButton
          width="6rem"
          px="1rem"
          aria-label="Login with Google"
          icon={<FcGoogle size="25" />}
          pointerEvents="none"
          borderRight={`3px ${BgColor()} solid`}
        />
        <Button
          width="17rem"
          pl="1rem"
          _hover={{ bg: 'teal.200', color: 'rgb(26, 32, 44)' }}
          justifyContent="flex-start"
          onClick={() => AuthHTTPService.loginWithGoogle()}
        >
          Login with Google
        </Button>
      </ButtonGroup>

      {/* Guest Auth Service */}
      <ButtonGroup isAttached width="17rem" size="lg">
        <IconButton
          width="6rem"
          px="1rem"
          aria-label="Login as Guest"
          icon={<FaGhost size="25" color="gray" />}
          pointerEvents="none"
          borderRight={`3px ${BgColor()} solid`}
        />
        <Button
          width="17rem"
          pl="1rem"
          _hover={{ bg: 'teal.200', color: 'rgb(26, 32, 44)' }}
          justifyContent="flex-start"
          onClick={() => AuthHTTPService.loginWithGuest()}
        >
          Login as Guest
        </Button>
      </ButtonGroup>
    </div>
  );
}

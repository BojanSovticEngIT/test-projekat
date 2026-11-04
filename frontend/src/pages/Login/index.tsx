import { type FormEvent, useState } from 'react';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { Alert, Box, Button, Divider, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { Navigate, useNavigate } from 'react-router-dom';
import { authApi } from '@features/auth/authApi';
import useAuthStore from '@store/authStore';
import logo from '../../assets/logo/logo.webp';
import background from '../../assets/images/background.webp';
import { engColors } from '../../theme/theme';

function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: ({ user, token }) => {
      login(user, token);
      navigate('/dashboard', { replace: true });
    },
    onError: (error) => {
      if (isAxiosError<{ message?: string }>(error)) {
        setErrorMessage(error.response?.data?.message ?? 'Invalid credentials');
        return;
      }
      setErrorMessage('Invalid credentials');
    }
  });

  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setErrorMessage(null);
    loginMutation.mutate({ username, password });
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        p: 3,
        backgroundImage: `linear-gradient(rgba(0, 47, 83, 0.80), rgba(0, 47, 83, 0.80)), url(${background})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 440 }}>
        {/* Card with top accent bar */}
        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.35)'
          }}
        >

          <Box sx={{ p: { xs: 3, sm: 4 } }}>
            {/* Logo */}
            <Box sx={{ mb: 3 }}>
              <Box
                component="img"
                src={logo}
                alt="Engage Skill Matrix"
                sx={{ height: 44, width: 'auto', display: 'block', mb: 2 }}
              />
              <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
                Sign in
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Enter your credentials to access the platform.
              </Typography>
            </Box>

            <Divider sx={{ mb: 3 }} />

            {errorMessage ? (
              <Alert severity="error" sx={{ mb: 2.5 }}>
                {errorMessage}
              </Alert>
            ) : null}

            <Stack component="form" spacing={2.5} onSubmit={handleSubmit}>
              <TextField
                label="Username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                required
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start" sx={{py: 3}}>
                      <AccountCircleOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  )
                }}
              />
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start" sx={{py: 3}}>
                      <LockOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  )
                }}
              />
              <Button
                type="submit"
                variant="contained"
                disabled={loginMutation.isPending}
                size="large"
                fullWidth
                sx={{ py: 1.25, mt: 0.5 }}
              >
                {loginMutation.isPending ? 'Signing in…' : 'Sign in'}
              </Button>
            </Stack>
          </Box>
        </Box>

        <Typography
          variant="caption"
          sx={{ display: 'block', textAlign: 'center', mt: 2.5, color: 'rgba(255,255,255,0.5)' }}
        >
          © {new Date().getFullYear()} Engineering Ingegneria Informatica
        </Typography>
      </Box>
    </Box>
  );
}

export default LoginPage;

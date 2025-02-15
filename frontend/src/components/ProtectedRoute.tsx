import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthToken } from '../state/auth';
import { Center, Spinner } from '@chakra-ui/react';

export const ProtectedRoute = ({ children }) => {
  const authToken = useAuthToken();
  const location = useLocation();

  // Optional: Add loading state if you're fetching auth status
  const isLoading = false;

  if (isLoading) {
    return (
      <Center h="100vh">
        <Spinner size="xl" />
      </Center>
    );
  }

  if (!authToken) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
};

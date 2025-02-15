import React from 'react';
import { Box, Container, Flex, Button, Heading } from '@chakra-ui/react';
import { useAuthToken } from '../state/auth';

export const Layout = ({ children }) => {
  const authToken = useAuthToken();

  return (
    <Box minH="100vh" bg="gray.50">
      <Flex
        as="nav"
        position="fixed"
        w="full"
        bg="white"
        borderBottom="1px"
        borderColor="gray.200"
        h="16"
        zIndex={1}
      >
        <Container maxW="7xl" px={{ base: 4, md: 6 }}>
          <Flex justify="space-between" h="16" align="center">
            <Heading size="md">AI Maestro</Heading>
            <Flex align="center" gap={4}>
              {authToken ? (
                <Button variant="ghost">Sign Out</Button>
              ) : (
                <Button colorScheme="blue">Sign In</Button>
              )}
            </Flex>
          </Flex>
        </Container>
      </Flex>
      <Box pt="16">
        <Container maxW="7xl" px={{ base: 4, md: 6 }} py={6}>
          {children}
        </Container>
      </Box>
    </Box>
  );
};

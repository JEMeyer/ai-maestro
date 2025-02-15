import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { RecoilRoot } from 'recoil';
import { Layout } from './components/Layout';
import { HomePage, DeploymentsPage } from './components/Pages';
import { ProtectedRoute } from './components/ProtectedRoute';

const App = () => {
  return (
    <RecoilRoot>
      <ChakraProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route
                path="/deployments"
                element={
                  <ProtectedRoute>
                    <DeploymentsPage />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Layout>
        </Router>
      </ChakraProvider>
    </RecoilRoot>
  );
};

export default App;

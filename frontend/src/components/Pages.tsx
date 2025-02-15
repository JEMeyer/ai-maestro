import React from "react";
import {
  Box,
  Button,
  Heading,
  Text,
  Stack,
  SimpleGrid,
  CardBody,
  StatGroup,
  Stat,
  StatLabel,
  StatHelpText,
} from "@chakra-ui/react";
import { Card } from "@chakra-ui/react";

const StatDisplay = ({
  label,
  value,
  helpText,
}: {
  label: string;
  value: string;
  helpText: string;
}) => (
  <Card>
    <CardBody>
      <StatGroup>
        <Stat>
          <StatLabel>{label}</StatLabel>
          <StatNumber>{value}</StatNumber>
          <StatHelpText>{helpText}</StatHelpText>
        </Stat>
      </StatGroup>
    </CardBody>
  </Card>
);

export const HomePage = () => {
  return (
    <Stack direction='column' spacing='8' align='center' py='16'>
      <Heading size='2xl'>AI Maestro</Heading>
      <Text fontSize='xl' textAlign='center' maxW='2xl'>
        Manage and monitor your AI model deployments with ease
      </Text>
      <Button size='lg' colorScheme='blue'>
        Get Started
      </Button>

      <SimpleGrid
        columns={{ base: 1, md: 3 }}
        gap={{ base: 4, md: 6 }}
        width='full'>
        <StatDisplay
          label='Total Models'
          value='42'
          helpText='Active deployments'
        />
        <StatDisplay
          label='GPU Utilization'
          value='87%'
          helpText='Across all servers'
        />
        <StatDisplay
          label='Response Time'
          value='156ms'
          helpText='Average p95'
        />
      </SimpleGrid>
    </Stack>
  );
};

export const DeploymentsPage = () => {
  return (
    <Box>
      <Heading size='lg' mb='6'>
        Your Deployments
      </Heading>
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={{ base: 4, md: 6 }}>
        <Card>
          <CardBody>
            <Text>Deployment card will go here</Text>
          </CardBody>
        </Card>
      </SimpleGrid>
    </Box>
  );
};

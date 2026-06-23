/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useState } from 'react';
import { Flex, VStack, Text, FormControl, FormLabel, FormHelperText, Select, Button, IconButton, Tooltip } from '@chakra-ui/react';
import { MdSettings, MdArrowBack } from 'react-icons/md';

import { App } from '../../schema';
import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { MODELS } from './openai';

interface SetupScreenProps {
  props: App;
  bgHex: string;
  panelBgHex: string;
  textColor: string;
  onSave: (apiKey: string, model: string, batchSize: number) => void;
  onCancel?: () => void;
  existingApiKey?: string;
}

export function SetupScreen({ props, bgHex, panelBgHex, textColor, onSave, onCancel, existingApiKey }: SetupScreenProps) {
  const s = props.data.state as AppState;
  // const [apiKeyInput, setApiKeyInput] = useState(existingApiKey ?? '');
  const [modelInput, setModelInput] = useState(s.model || 'gpt-4o-mini');
  const [batchInput, setBatchInput] = useState(String(s.batchSize || 8));

  return (
    <AppWindow app={props} hideBackgroundIcon={MdSettings}>
      <Flex h="100%" w="100%" bg={bgHex} align="center" justify="center" p={6} position="relative">
        {onCancel && (
          <Tooltip label="Back" placement="left" hasArrow openDelay={400}>
            <IconButton
              aria-label="Back"
              icon={<MdArrowBack />}
              size="xs"
              variant="ghost"
              colorScheme="gray"
              position="absolute"
              top={1}
              right={1}
              onClick={onCancel}
            />
          </Tooltip>
        )}
        <Flex direction="row" gap={8} w="100%" maxW="800px" align="flex-start">
          {/* Left: model */}
          <VStack spacing={4} flex={1} align="stretch">
            <Text fontWeight="bold" fontSize="xl" color={textColor}>
              Configure SageIdeator
            </Text>
            <Text fontSize="sm" color={textColor}>
              SageIdeator uses the AI model configured on this SAGE3 server.
            </Text>

            {/* OpenAI API key — hidden; provided by the server
            <FormControl isRequired>
              <FormLabel color={textColor}>OpenAI API Key</FormLabel>
              <Input
                type="password"
                placeholder="sk-…"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                bg={panelBgHex}
              />
              <FormHelperText>Visible to other board users.</FormHelperText>
            </FormControl>
            */}

            <FormControl>
              <FormLabel color={textColor}>Model</FormLabel>
              <Select value={modelInput} onChange={(e) => setModelInput(e.target.value)} bg={panelBgHex}>
                {MODELS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </FormControl>
          </VStack>

          {/* Right: ideas count + submit */}
          <VStack spacing={4} flex={1} align="stretch" pt={10}>
            <FormControl>
              <FormLabel color={textColor}>Number of ideas</FormLabel>
              <Select value={batchInput} onChange={(e) => setBatchInput(e.target.value)} bg={panelBgHex}>
                {[4, 6, 8, 10, 12, 16, 20].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
              <FormHelperText>How many ideas to generate per exploration.</FormHelperText>
            </FormControl>
            <Button colorScheme="blue" w="100%" onClick={() => onSave('', modelInput, parseInt(batchInput))}>
              Save &amp; Start
            </Button>
          </VStack>
        </Flex>
      </Flex>
    </AppWindow>
  );
}

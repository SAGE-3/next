/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useState } from 'react';
import {
  Flex,
  VStack,
  Text,
  FormControl,
  FormLabel,
  FormHelperText,
  Input,
  Select,
  Button,
} from '@chakra-ui/react';
import { MdKey } from 'react-icons/md';

import { App } from '../../schema';
import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { MODELS } from './openai';

interface SetupScreenProps {
  props: App;
  bgHex: string;
  panelBgHex: string;
  textColor: string;
  onSave: (apiKey: string, model: string, batchSize: number, numDimensions: number) => void;
}

export function SetupScreen({ props, bgHex, panelBgHex, textColor, onSave }: SetupScreenProps) {
  const s = props.data.state as AppState;
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [modelInput, setModelInput] = useState(s.model || 'gpt-5.4-mini');
  const [batchInput, setBatchInput] = useState(String(s.batchSize || 8));
  const [numDimsInput, setNumDimsInput] = useState(String(s.numDimensions || 2));

  return (
    <AppWindow app={props} hideBackgroundIcon={MdKey}>
      <Flex h="100%" w="100%" bg={bgHex} align="center" justify="center" p={6}>
        <Flex direction="row" gap={8} w="100%" maxW="800px" align="flex-start">
          {/* Left: key + model */}
          <VStack spacing={4} flex={1} align="stretch">
            <Text fontWeight="bold" fontSize="xl" color={textColor}>Configure SageIdeator</Text>
            <Text fontSize="sm" color={textColor}>
              SageIdeator calls OpenAI directly. Your API key is stored in the board state.
            </Text>
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
            <FormControl>
              <FormLabel color={textColor}>Model</FormLabel>
              <Select value={modelInput} onChange={(e) => setModelInput(e.target.value)} bg={panelBgHex}>
                {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </FormControl>
          </VStack>

          {/* Right: batch + dims + submit */}
          <VStack spacing={4} flex={1} align="stretch" pt={10}>
            <FormControl>
              <FormLabel color={textColor}>Batch size</FormLabel>
              <Select value={batchInput} onChange={(e) => setBatchInput(e.target.value)} bg={panelBgHex}>
                {[4, 6, 8, 10, 12, 16, 20].map((n) => <option key={n} value={n}>{n}</option>)}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel color={textColor}>Dimensions</FormLabel>
              <Select value={numDimsInput} onChange={(e) => setNumDimsInput(e.target.value)} bg={panelBgHex}>
                {[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
              </Select>
            </FormControl>
            <Button
              colorScheme="blue"
              w="100%"
              isDisabled={!apiKeyInput.trim()}
              onClick={() =>
                onSave(apiKeyInput.trim(), modelInput, parseInt(batchInput), parseInt(numDimsInput))
              }
            >
              Save &amp; Start
            </Button>
          </VStack>
        </Flex>
      </Flex>
    </AppWindow>
  );
}

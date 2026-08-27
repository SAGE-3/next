/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Slash commands typed into the chat box.
//
// A command names an operation the message should go to, instead of the mode
// being inferred from the linked source app. Adding a command is a matter of
// adding a row to COMMANDS: the parser, the unknown-command help, and the
// `/help` listing are all driven from this table.

import { TaskType } from '@sage3/shared/types';

export type ChatCommand = {
  /** The command as typed, without arguments. Always lower case. */
  name: string;
  /** Alternative spellings, also lower case. */
  aliases?: string[];
  /** One line, shown by `/help` and when an unknown command is typed. */
  description: string;
  /** How the argument is described in help, e.g. "/image <description>". */
  usage: string;
  /**
   * The AI task this command performs, so the caller can check the selected
   * model's capabilities before sending. Omitted for commands that are purely
   * local (help), which need no model.
   */
  task?: TaskType;
};

export const COMMANDS: ChatCommand[] = [
  {
    name: '/image',
    aliases: ['/img', '/draw'],
    description: 'Generate an image from a description',
    usage: '/image <description>',
    task: 'image_generation',
  },
  {
    name: '/help',
    aliases: ['/?'],
    description: 'List the available commands',
    usage: '/help',
  },
];

export type ParsedCommand = {
  /** The matched command. */
  command: ChatCommand;
  /** Everything after the command word, trimmed. May be empty. */
  args: string;
};

/**
 * Parse a chat input as a slash command.
 *
 * Returns the matched command and its arguments; `'unknown'` when the text
 * looks like a command but names none; and `null` when it is an ordinary
 * message. Distinguishing "unknown" from "not a command" is what lets the
 * caller answer a typo with the command list instead of posting `/imagg` to
 * everyone in the conversation.
 */
export function parseCommand(input: string): ParsedCommand | 'unknown' | null {
  const text = input.trim();
  // A bare "/" or text not starting with one is an ordinary message
  if (!text.startsWith('/') || text.length < 2) return null;

  const [word, ...rest] = text.split(/\s+/);
  const name = word.toLowerCase();
  const command = COMMANDS.find((c) => c.name === name || c.aliases?.includes(name));
  if (!command) return 'unknown';
  return { command, args: rest.join(' ').trim() };
}

/** The command list, formatted for display in the transcript. */
export function commandHelp(): string {
  return COMMANDS.map(
    (c) => `${c.usage} — ${c.description}${c.aliases?.length ? ` (also ${c.aliases.join(', ')})` : ''}`
  ).join('\n');
}

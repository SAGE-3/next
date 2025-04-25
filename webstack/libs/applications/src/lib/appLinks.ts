/**
 * Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { AppName } from './types';
import { Link, LinkSchema } from '@sage3/shared/types';
import { App } from './schema';

type LinkType = LinkSchema['type'];

// Define constraints for Link.sourceAppId -> Link.targetAppId under specific LinkType
interface TargetRelationships {
  [sourceName: string]: {
    relationship: 'one->app' | 'many->app';
    cyclic: boolean;
    allowedLinkTypes?: LinkType[];
  };
}

export type LINKS_CONSTRAINTS_TYPE = {
  name: AppName;
  sourceRelationship: 'app->many' | 'app->one';
  allowedSourceLinkTypes?: LinkType[];
  targetRelationships: TargetRelationships;
};

export const LINKS_CONSTRAINTS: LINKS_CONSTRAINTS_TYPE[] = [
  {
    name: 'SageCell' as AppName,
    sourceRelationship: 'app->one',
    allowedSourceLinkTypes: ['run_order'],
    targetRelationships: {
      SageCell: {
        relationship: 'one->app',
        cyclic: false,
        allowedLinkTypes: ['run_order'],
      },
    },
  },
  {
    name: 'Stickie' as AppName,
    sourceRelationship: 'app->many',
    allowedSourceLinkTypes: ['run_order', 'provenance'],
    targetRelationships: {
      Stickie: {
        relationship: 'many->app',
        cyclic: true,
        allowedLinkTypes: ['run_order'],
      },
    },
  },
];

/**
 * Determine end-to-end relationship and cyclicity for a given link between source and target apps.
 */
function getLinkEndToEndRelationship(sourceAppName: AppName, targetAppName: AppName, type?: LinkType): [string | undefined, boolean] {
  const source = LINKS_CONSTRAINTS.find((c) => c.name === sourceAppName);
  const target = LINKS_CONSTRAINTS.find((c) => c.name === targetAppName);
  if (!source || !target) {
    return [undefined, true];
  }
  if (type && source.allowedSourceLinkTypes && !source.allowedSourceLinkTypes.includes(type)) {
    return [undefined, false];
  }
  const rel = target.targetRelationships[sourceAppName];
  if (!rel) {
    return [undefined, true];
  }
  if (type && rel.allowedLinkTypes && !rel.allowedLinkTypes.includes(type)) {
    return [undefined, false];
  }
  return [`${rel.relationship}:${source.sourceRelationship}`, rel.cyclic];
}

/**
 * Check if adding a link would introduce a disallowed cycle in the graph.
 */
function wouldIntroduceCycle(links: Link[], apps: App[], sourceId: string, targetId: string): boolean {
  const sourceApp = apps.find((a) => a._id === sourceId);
  const targetApp = apps.find((a) => a._id === targetId);
  if (!sourceApp || !targetApp) {
    return false;
  }
  const [, cyclesAllowed] = getLinkEndToEndRelationship(sourceApp.data.type as AppName, targetApp.data.type as AppName);
  if (cyclesAllowed) {
    return false;
  }
  const adj = new Map<string, string[]>();
  for (const l of links) {
    const s = l.data.sourceAppId;
    const t = l.data.targetAppId;
    if (!adj.has(s)) adj.set(s, []);
    adj.get(s)!.push(t);
  }
  if (!adj.has(sourceId)) adj.set(sourceId, []);
  adj.get(sourceId)!.push(targetId);
  const visited = new Set<string>();
  const stack = [targetId];
  while (stack.length) {
    const curr = stack.pop()!;
    if (curr === sourceId) {
      return true;
    }
    if (!visited.has(curr)) {
      visited.add(curr);
      for (const neigh of adj.get(curr) || []) {
        if (!visited.has(neigh)) {
          stack.push(neigh);
        }
      }
    }
  }
  return false;
}

/**
 * Validate whether a given source->target link of a particular type is allowed.
 *
 * @param sourceApp  the App initiating the link
 * @param targetApp  the App receiving the link
 * @param linkType   the type of link (e.g., 'run_order' or 'provenance')
 * @param allApps    array of all Apps on the board
 * @param links      existing Link[] on the board
 * @returns          true if the link is valid under constraints and won't create disallowed cycles
 */
export function checkLinkValid(sourceApp: App, targetApp: App, linkType: LinkType, allApps: App[], links: Link[]): boolean {
  const sourceName = sourceApp.data.type as AppName;
  const targetName = targetApp.data.type as AppName;
  // 1) Check constraints (relationship + cycle rule)
  const [relationship, cyclesAllowed] = getLinkEndToEndRelationship(sourceName, targetName, linkType);
  if (!relationship) {
    return false;
  }
  // 2) Check for disallowed cycles
  if (!cyclesAllowed && wouldIntroduceCycle(links, allApps, sourceApp._id, targetApp._id)) {
    return false;
  }
  return true;
}

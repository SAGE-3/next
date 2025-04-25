/**
 * Copyright (c) SAGE3 Development Team 2025
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Refactored link constraints to allow per-source and per-target configuration.
 */

import { AppName } from './types';
import { Link, LinkSchema } from '@sage3/shared/types';
import { App } from './schema';

// Union of allowed link types
export type LinkType = LinkSchema['type'];

// Constraint for a single source->target pairing
interface PairConstraint {
  allowedTypes: LinkType[]; // link types permitted
  maxIncoming?: number; // max incoming links of any type
  maxOutgoing?: number; // max outgoing links of any type
  allowCycles?: boolean; // if cycles permitted
}

// Constraints for a given source app type
interface LinkConstraint {
  // Per-target pairing configuration
  targets: Partial<Record<AppName, PairConstraint>>;
}

// Only define constraints for relevant AppNames; others omitted
export const linkConstraints: Partial<Record<AppName, LinkConstraint>> = {
  SageCell: {
    targets: {
      // 1-to-1 run_order between SageCells
      SageCell: {
        allowedTypes: ['run_order'],
        maxIncoming: 1,
        maxOutgoing: 1,
        allowCycles: false,
      },
      // unlimited visual from SageCell to Stickie
      Stickie: {
        allowedTypes: ['visual'],
        allowCycles: true,
      },
    },
  },
  Stickie: {
    targets: {
      // unlimited visual in either direction
      SageCell: { allowedTypes: ['visual'], allowCycles: true },
      Stickie: { allowedTypes: ['visual'], allowCycles: true },
    },
  },
};

/**
 * Returns allowed link types for a source->target pairing.
 * Applies per-pair cardinality and cycle rules.
 */
export function getAllowedLinkTypes(source: App, target: App, existingLinks: Link[], typeFilter?: LinkType): LinkType[] {
  const sType = source.data.type as AppName;
  const tType = target.data.type as AppName;
  const srcConstraint = linkConstraints[sType];
  const pair = srcConstraint?.targets[tType];
  if (!srcConstraint || !pair) return [];

  // Base allowed types
  let types = [...pair.allowedTypes];
  if (typeFilter) types = types.includes(typeFilter) ? [typeFilter] : [];

  return types.filter((type) => {
    // Outgoing count
    if (pair.maxOutgoing !== undefined) {
      const outCount = existingLinks.filter((l) => l.data.sourceAppId === source._id && l.data.type === type).length;
      if (outCount >= pair.maxOutgoing) return false;
    }
    // Incoming count
    if (pair.maxIncoming !== undefined) {
      const inCount = existingLinks.filter((l) => l.data.targetAppId === target._id && l.data.type === type).length;
      if (inCount >= pair.maxIncoming) return false;
    }
    // Cycle check
    if (pair.allowCycles === false && wouldIntroduceCycle(existingLinks, source._id, target._id, type)) {
      return false;
    }
    return true;
  });
}

/**
 * Quick boolean: can source link to target at all?
 */
export function isLinkValid(source: App, target: App, existingLinks: Link[]): boolean {
  return getAllowedLinkTypes(source, target, existingLinks).length > 0;
}

/**
 * Check if adding a link of a given type introduces a disallowed cycle.
 */
export function wouldIntroduceCycle(links: Link[], sourceId: string, targetId: string, type: LinkType): boolean {
  const adj = new Map<string, string[]>();
  for (const l of links) {
    if (l.data.type === type) {
      adj.set(l.data.sourceAppId, [...(adj.get(l.data.sourceAppId) || []), l.data.targetAppId]);
    }
  }
  adj.set(sourceId, [...(adj.get(sourceId) || []), targetId]);

  const visited = new Set<string>();
  const stack = [targetId];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === sourceId) return true;
    if (visited.has(cur)) continue;
    visited.add(cur);
    for (const nbr of adj.get(cur) || []) stack.push(nbr);
  }
  return false;
}

/**
 * Get all apps that can start a link of the given type.
 */
export function getSourceCandidates(allApps: App[], existingLinks: Link[], type: LinkType): App[] {
  return allApps.filter((app) => getAllowedLinkTypes(app, { data: { type: app.data.type } } as App, existingLinks, type).length > 0);
}

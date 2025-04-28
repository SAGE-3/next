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

/**
 * Given a start app ID and a list of Links, returns a topologically-sorted
 * array of all app IDs connected via 'run_order' links (both upstream and downstream).
 * Throws an Error if any cycle exists in that subgraph.
 */
export function getRunOrderChain(startAppId: string, allLinks: Link[]): string[] {
  // 0) Filter only run_order links
  const links = allLinks.filter((l) => l.data.type === 'run_order');

  // 1) Build forward and reverse adjacency lists
  const adj = new Map<string, string[]>();
  const rev = new Map<string, string[]>();
  for (const { data } of links) {
    const { sourceAppId: s, targetAppId: t } = data;
    if (!adj.has(s)) adj.set(s, []);
    adj.get(s)!.push(t);
    if (!rev.has(t)) rev.set(t, []);
    rev.get(t)!.push(s);
  }

  // 2) Collect downstream (successors) from start
  const downstream = new Set<string>();
  const stack1 = [startAppId];
  while (stack1.length) {
    const id = stack1.pop()!;
    if (!downstream.has(id)) {
      downstream.add(id);
      for (const nxt of adj.get(id) || []) stack1.push(nxt);
    }
  }

  // 3) Collect upstream (predecessors) from start
  const upstream = new Set<string>();
  const stack2 = [startAppId];
  while (stack2.length) {
    const id = stack2.pop()!;
    if (!upstream.has(id)) {
      upstream.add(id);
      for (const prev of rev.get(id) || []) stack2.push(prev);
    }
  }

  // 4) The full connected component
  const component = new Set<string>([...downstream, ...upstream]);

  // 5) Compute in-degrees within that component
  const indegree = new Map<string, number>();
  for (const id of component) indegree.set(id, 0);
  for (const { data } of links) {
    const { sourceAppId: s, targetAppId: t } = data;
    if (component.has(s) && component.has(t)) {
      indegree.set(t, indegree.get(t)! + 1);
    }
  }

  // 6) Kahn’s algorithm for topological sort
  const queue: string[] = [];
  for (const [id, deg] of indegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    sorted.push(id);
    for (const nxt of adj.get(id) || []) {
      if (!component.has(nxt)) continue;
      indegree.set(nxt, indegree.get(nxt)! - 1);
      if (indegree.get(nxt) === 0) {
        queue.push(nxt);
      }
    }
  }

  // 7) If we didn’t process every node, there’s a cycle
  if (sorted.length !== component.size) {
    throw new Error(
      `Cycle detected in run_order chain starting at ${startAppId}: ` + `processed ${sorted.length} of ${component.size} nodes.`
    );
  }

  return sorted;
}

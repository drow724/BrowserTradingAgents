// Feature 008 Pixel Agents adapter (specs/008-…/contracts/pixel-host-protocol.md): ViewState → the
// host messages of pixel-agents-hq/pixel-agents @ 3537e140 (v1.4.1, core/src/messages.ts). Pure: no
// DOM, no window, no upstream import. Only this module knows the Pixel message shapes.
import { ROLES, type NodeName } from '../graph/trading-graph.ts';
import type { RoleState, ViewState } from './view-state.ts';

// Local declarations of the upstream message subset the host sends (fields as at the pinned SHA).
export type PixelMessage =
  | { type: 'settingsLoaded'; soundEnabled: boolean; lastSeenVersion: string; extensionVersion: string;
      watchAllSessions: boolean; alwaysShowLabels: boolean; ghostHeadlessAgents: boolean; hooksEnabled: boolean;
      hooksInfoShown: boolean; externalAssetDirectories: string[]; showAreas: boolean }
  | { type: 'providerCapabilities'; readingTools: string[]; subagentToolNames: string[] }
  | { type: 'layoutLoaded'; layout: Record<string, unknown> | null }
  | { type: 'existingAgents'; agents: number[]; agentMeta: Record<string, { palette: number; hueShift: number; seatId: string }>;
      folderNames: Record<string, string>; externalAgents: Record<string, boolean> }
  | { type: 'agentTeamInfo'; id: number; agentName: string; teamName: string }
  | { type: 'agentStatus'; id: number; status: 'active' | 'waiting' }
  | { type: 'agentToolStart'; id: number; toolId: string; status: string }
  | { type: 'agentToolDone'; id: number; toolId: string }
  | { type: 'agentToolsClear'; id: number }
  | { type: string; [k: string]: unknown }; // asset messages, built by pixel-assets.ts (T016)

const PIXEL_VERSION = '1.4.1';
// Seat ids are chair uids in the package's default-layout-1.json (upstream layoutToSeats: first seat = chair
// uid). Four wooden chairs, two benches, then the sofa front and back — fixed per role (verification T016).
const SEATS = ['f-1773354877474-kt9s', 'f-1773354880309-yphd', 'f-1773354879805-px9b', 'f-1773354881902-9m50',
  'f-1773356768339-eo6u', 'f-1773356769007-a8jm', 'f-1773354668333-lo7w', 'f-1773354665989-zgrw'];

// Fixed identity per role, in ROLES order (data-model: Role identity).
export const ROLE_IDENTITY = ROLES.map((r, i) => ({
  node: r.node as NodeName, label: r.label, pixelId: i + 1, palette: i % 6, hueShift: i < 6 ? 0 : 180, seatId: SEATS[i],
}));

export function startSequence(assetMessages: PixelMessage[], layout: Record<string, unknown> | null): PixelMessage[] {
  return [
    { type: 'settingsLoaded', soundEnabled: false, lastSeenVersion: PIXEL_VERSION, extensionVersion: PIXEL_VERSION,
      watchAllSessions: false, alwaysShowLabels: true, ghostHeadlessAgents: false, hooksEnabled: false,
      hooksInfoShown: true, externalAssetDirectories: [], showAreas: false },
    { type: 'providerCapabilities', readingTools: [], subagentToolNames: [] },
    ...assetMessages,
    { type: 'layoutLoaded', layout },
    { type: 'existingAgents', agents: ROLE_IDENTITY.map((r) => r.pixelId),
      agentMeta: Object.fromEntries(ROLE_IDENTITY.map((r) => [String(r.pixelId), { palette: r.palette, hueShift: r.hueShift, seatId: r.seatId }])),
      folderNames: {}, externalAgents: {} },
    ...ROLE_IDENTITY.map((r): PixelMessage => ({ type: 'agentTeamInfo', id: r.pixelId, agentName: r.label, teamName: 'BrowserTradingAgents' })),
  ];
}

// One role's state → messages (contract mapping table). Only `working` animates; nothing implies inference.
function forState(id: number, node: string, state: RoleState): PixelMessage[] {
  switch (state) {
    case 'working': return [{ type: 'agentStatus', id, status: 'active' }, { type: 'agentToolStart', id, toolId: `bta-${node}`, status: 'working (graph)' }];
    case 'completed': return [{ type: 'agentToolDone', id, toolId: `bta-${node}` }, { type: 'agentStatus', id, status: 'waiting' }];
    case 'failed': case 'cancelled': case 'stopped': case 'not-run': {
      const status = state === 'not-run' ? 'not run' : state === 'stopped' ? 'error (unclear)' : state;
      return [{ type: 'agentToolsClear', id }, { type: 'agentToolStart', id, toolId: `bta-${node}-end`, status }];
    }
    default: return [{ type: 'agentToolsClear', id }]; // idle, waiting (queued/inferring are never produced)
  }
}

export function messagesFor(prev: ViewState | null, next: ViewState): PixelMessage[] {
  return ROLE_IDENTITY.flatMap((r) =>
    prev?.roles[r.node].state === next.roles[r.node].state ? [] : forState(r.pixelId, r.node, next.roles[r.node].state));
}

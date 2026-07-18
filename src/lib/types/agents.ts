/** Travel-agent connection domain types (MVP messaging — roadmap weeks 13-14). */

export interface TravelAgentProfile {
  id: string;
  displayName: string;
  agencyName?: string | null;
  bio?: string | null;
  specialties: string[];
  /** Regions the agent covers, e.g. ["Southeast Asia", "Japan"]. */
  regions: string[];
  avatarUrl?: string | null;
  verified: boolean;
}

export interface AgentThread {
  id: string;
  tripId?: string | null;
  travelerId: string;
  agentId: string;
  subject: string;
  status: "open" | "closed";
  createdAt: string;
  updatedAt: string;
}

export interface AgentMessage {
  id: string;
  threadId: string;
  /** Profile ID of whoever sent the message (traveler or agent). */
  senderId: string;
  body: string;
  /** Optional attachment paths in storage. */
  attachments: string[];
  readAt?: string | null;
  createdAt: string;
}

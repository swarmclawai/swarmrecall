import type { AgentAuthPayload, DashboardAuthPayload } from './middleware/auth.js';

export type AppVariables = {
  auth: AgentAuthPayload | DashboardAuthPayload;
};

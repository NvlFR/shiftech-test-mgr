import { createAgentHeartbeat, type AuthAdapter, type TransportAdapter } from '@testmanager/agent-core';

export class HeartbeatService {
  constructor(
    private readonly transport: TransportAdapter,
    private readonly auth: AuthAdapter,
  ) {}

  async beat(): Promise<void> {
    await this.transport.request({
      operation: 'heartbeat_local_agent',
      body: { p_payload: createAgentHeartbeat('mcp', ['tools', 'repository']) },
      auth: await this.auth.getAuthContext(),
    });
  }
}

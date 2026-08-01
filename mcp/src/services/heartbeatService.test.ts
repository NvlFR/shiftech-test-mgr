import assert from 'node:assert/strict';
import test from 'node:test';
import { RunnerTokenAuth, type TransportAdapter } from '@testmanager/agent-core';
import { HeartbeatService } from './heartbeatService.js';

test('emits the shared local-agent heartbeat payload', async () => {
  const requests: unknown[] = [];
  const transport: TransportAdapter = {
    async request<TData>(request: unknown) {
      requests.push(request);
      return { data: {} as TData };
    },
  };
  const auth = new RunnerTokenAuth({ token: 'token', subject: 'project' });

  await new HeartbeatService(transport, auth).beat();

  assert.deepEqual(requests, [{
    operation: 'heartbeat_local_agent',
    body: { p_payload: { agent: 'testmanager-agent', version: '0.1.0', process: 'mcp', capabilities: ['repository', 'tools'] } },
    auth: { headers: {}, body: { p_token: 'token' } },
  }]);
});

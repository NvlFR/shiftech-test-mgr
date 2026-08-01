import assert from 'node:assert/strict';
import test from 'node:test';
import { SupabaseRpcError, SupabaseRpcTransport } from '@testmanager/agent-core';
import { AutomationApi } from '../dist/api.js';

const config = {
  supabaseUrl: 'https://example.supabase.co',
  supabaseAnonKey: 'anon-key',
  runnerToken: 'runner-token',
};

test('AutomationApi delegates RPC operation and body to its transport', async () => {
  const requests = [];
  const transport = {
    async request(request) {
      requests.push(request);
      return { data: { agent_id: 'runner-1', active: true, last_seen_at: 'now' } };
    },
  };

  const result = await new AutomationApi(config, transport).heartbeat();

  assert.deepEqual(requests, [{
    operation: 'heartbeat_local_agent',
    body: { p_payload: { agent: 'testmanager-agent', version: '0.1.0', process: 'runner', capabilities: ['artifacts', 'execute', 'repository'] } },
    auth: { headers: {}, body: { p_token: 'runner-token' } },
  }]);
  assert.equal(result.agent_id, 'runner-1');
});

test('SupabaseRpcTransport preserves the runner RPC request format', async () => {
  let capturedUrl;
  let capturedInit;
  const transport = new SupabaseRpcTransport({
    supabaseUrl: `${config.supabaseUrl}/`,
    supabaseAnonKey: config.supabaseAnonKey,
    fetch: async (url, init) => {
      capturedUrl = url;
      capturedInit = init;
      return new Response(JSON.stringify({ job: null }), { status: 200 });
    },
  });

  const response = await transport.request({ operation: 'poll_automation_job', body: { p_token: 'runner-token' } });

  assert.equal(capturedUrl, `${config.supabaseUrl}/rest/v1/rpc/poll_automation_job`);
  assert.equal(capturedInit.method, 'POST');
  assert.equal(capturedInit.headers.apikey, 'anon-key');
  assert.equal(capturedInit.headers.Authorization, 'Bearer anon-key');
  assert.equal(capturedInit.body, JSON.stringify({ p_token: 'runner-token' }));
  assert.deepEqual(response.data, { job: null });
});

test('SupabaseRpcTransport preserves status and bounded response text on failure', async () => {
  const transport = new SupabaseRpcTransport({
    supabaseUrl: config.supabaseUrl,
    supabaseAnonKey: config.supabaseAnonKey,
    fetch: async () => new Response('x'.repeat(400), { status: 401 }),
  });

  await assert.rejects(
    transport.request({ operation: 'heartbeat_automation_runner', body: {} }),
    (error) => {
      assert.ok(error instanceof SupabaseRpcError);
      assert.equal(error.name, 'ApiError');
      assert.equal(error.status, 401);
      assert.equal(error.message, `RPC heartbeat_automation_runner failed (401): ${'x'.repeat(300)}`);
      return true;
    },
  );
});

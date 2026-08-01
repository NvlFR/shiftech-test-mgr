/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const schema = readFileSync(resolve(process.cwd(), '../supabase/schema_entity_codes.sql'), 'utf8');

function functionBody(name: string): string {
  const match = schema.match(new RegExp(`create or replace function ${name}\\([^]*?\\$\\$ language plpgsql;`, 'i'));
  if (!match) throw new Error(`Function ${name} tidak ditemukan pada schema entity code`);
  return match[0].replace(/\s+/g, ' ');
}

describe('pembentukan kode entity otomatis', () => {
  it('membentuk nomor berurutan dengan padding minimal empat digit', () => {
    const body = functionBody('next_entity_code');

    expect(body).toContain("return p_prefix || '-' || lpad(v_next::text, 4, '0')");
    expect(body).toContain('values (p_project_id, p_prefix, 1)');
    expect(body).toContain('last_value = entity_code_sequences.last_value + 1');
    expect('MOD-' + String(1).padStart(4, '0')).toBe('MOD-0001');
    expect('TC-' + String(9999).padStart(4, '0')).toBe('TC-9999');
    expect('TP-' + String(10000).padStart(4, '0')).toBe('TP-10000');
  });

  it('memisahkan sequence berdasarkan project dan prefix secara atomik', () => {
    expect(schema).toMatch(/primary key \(project_id, prefix\)/i);
    expect(functionBody('next_entity_code')).toContain('on conflict (project_id, prefix) do update');
  });

  it.each([
    ['set_module_code', 'new.project_id', 'MOD'],
    ['set_test_case_code', 'new.project_id', 'TC'],
    ['set_test_plan_code', 'new.project_id', 'TP'],
  ])('%s membuat prefix %s hanya saat kode null atau kosong', (functionName, projectExpression, prefix) => {
    const body = functionBody(functionName);

    expect(body).toContain("if new.code is null or new.code = '' then");
    expect(body).toContain(`new.code := next_entity_code(${projectExpression}, '${prefix}')`);
    expect(body).toMatch(/end if; return new;/);
  });

  it('Test Run mencari project dari plan dan memakai prefix TR', () => {
    const body = functionBody('set_test_run_code');

    expect(body).toContain("if new.code is null or new.code = '' then");
    expect(body).toContain('select project_id into v_project_id from test_plans where id = new.test_plan_id');
    expect(body).toContain("new.code := next_entity_code(v_project_id, 'TR')");
  });

  it('mempertahankan kode eksplisit karena assignment berada di dalam guard', () => {
    for (const functionName of ['set_module_code', 'set_test_case_code', 'set_test_plan_code', 'set_test_run_code']) {
      const body = functionBody(functionName);
      const guardStart = body.indexOf("if new.code is null or new.code = '' then");
      const assignment = body.indexOf('new.code := next_entity_code');
      const guardEnd = body.indexOf('end if;', guardStart);

      expect(guardStart).toBeGreaterThan(-1);
      expect(assignment).toBeGreaterThan(guardStart);
      expect(assignment).toBeLessThan(guardEnd);
    }
  });

  it.each([
    ['modules', 'project_id', 'code'],
    ['test_cases', 'project_id', 'code'],
    ['test_plans', 'project_id', 'code'],
    ['test_runs', 'test_plan_id', 'code'],
  ])('menolak duplikasi kode %s dalam scope pemiliknya', (table, ownerColumn, codeColumn) => {
    expect(schema).toMatch(new RegExp(`unique index[^;]+on ${table} \\(${ownerColumn}, ${codeColumn}\\)`, 'i'));
  });
});

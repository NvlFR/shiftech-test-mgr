import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { Chip } from 'primereact/chip';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { testCaseService } from '../../services/testCaseService';
import type { TestCaseWithDetails } from '../../types/domain';
import { formatDateTime } from '../../helpers/dateFormatter';
import {
  TEST_CASE_PRIORITY_LABEL,
  TEST_CASE_PRIORITY_SEVERITY,
  TEST_CASE_STATUS_LABEL,
  TEST_CASE_STATUS_SEVERITY,
} from '../../helpers/statusLabels';

interface TestCaseDetail extends TestCaseWithDetails {
  project: { id: string; name: string };
}

export function TestCaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');

  const [testCase, setTestCase] = useState<TestCaseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    testCaseService.getByIdWithDetails(id).then((result) => {
      setTestCase(result as TestCaseDetail | null);
      setLoading(false);
    });
  }, [id]);

  function handleBack() {
    if (projectId) {
      navigate(`/projects/${projectId}`);
    } else {
      navigate('/test-cases');
    }
  }

  if (loading) return <p>Memuat...</p>;
  if (!testCase) return <p>Test case tidak ditemukan.</p>;

  return (
    <div>
      <Breadcrumb
        items={[
          { label: 'Projects', path: '/' },
          { label: testCase.project.name, path: `/projects/${testCase.project.id}` },
          { label: `${testCase.code} — ${testCase.title}` },
        ]}
      />

      <Button label="Kembali" icon="pi pi-arrow-left" text onClick={handleBack} className="mb-3" />

      <Card className="mb-3">
        <div className="flex align-items-start justify-content-between">
          <div className="flex align-items-center gap-2 mb-1">
            <h2 className="m-0">{testCase.code} — {testCase.title}</h2>
            <Tag value={TEST_CASE_PRIORITY_LABEL[testCase.priority]} severity={TEST_CASE_PRIORITY_SEVERITY[testCase.priority]} />
            <Tag value={TEST_CASE_STATUS_LABEL[testCase.status]} severity={TEST_CASE_STATUS_SEVERITY[testCase.status]} />
          </div>
        </div>

        <div className="grid mt-3">
          <div className="col-6 md:col-3">
            <label className="block text-color-secondary text-sm mb-1">Project</label>
            <p className="mt-0">{testCase.project.name}</p>
          </div>
          <div className="col-6 md:col-3">
            <label className="block text-color-secondary text-sm mb-1">Module</label>
            <p className="mt-0">{testCase.module?.name ?? '-'}</p>
          </div>
          <div className="col-6 md:col-3">
            <label className="block text-color-secondary text-sm mb-1">Dibuat</label>
            <p className="mt-0">{formatDateTime(testCase.createdAt)}</p>
          </div>
          <div className="col-6 md:col-3">
            <label className="block text-color-secondary text-sm mb-1">Update Terakhir</label>
            <p className="mt-0">{formatDateTime(testCase.updatedAt)}</p>
          </div>
        </div>

        {testCase.tags.length > 0 && (
          <div className="flex align-items-center gap-2 mt-2">
            {testCase.tags.map((t) => (
              <Chip key={t.id} label={t.name} />
            ))}
          </div>
        )}
      </Card>

      {testCase.objective && (
        <Card title="Tujuan" className="mb-3">
          <p className="m-0">{testCase.objective}</p>
        </Card>
      )}

      {testCase.preconditions && (
        <Card title="Prasyarat" className="mb-3">
          <p className="m-0" style={{ whiteSpace: 'pre-wrap' }}>{testCase.preconditions}</p>
        </Card>
      )}

      <Card title="Langkah Pengujian" className="mb-3">
        <p className="m-0" style={{ whiteSpace: 'pre-wrap' }}>{testCase.steps}</p>
      </Card>

      <Card title="Hasil yang Diharapkan" className="mb-3">
        <p className="m-0" style={{ whiteSpace: 'pre-wrap' }}>{testCase.expectedResult}</p>
      </Card>

      {testCase.notes && (
        <Card title="Catatan" className="mb-3">
          <p className="m-0" style={{ whiteSpace: 'pre-wrap' }}>{testCase.notes}</p>
        </Card>
      )}
    </div>
  );
}

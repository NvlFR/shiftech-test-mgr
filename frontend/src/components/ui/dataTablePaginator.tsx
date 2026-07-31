import { Dropdown } from 'primereact/dropdown';
import type { PaginatorTemplate } from 'primereact/paginator';

export const dataTablePaginatorTemplate: PaginatorTemplate = {
  layout: 'RowsPerPageDropdown CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink',
  RowsPerPageDropdown: (options) => (
    <div className="flex align-items-center gap-2 dt-paginator-rows">
      <span className="text-color-secondary text-sm white-space-nowrap">Tampilkan</span>
      <Dropdown
        value={options.value}
        options={options.options}
        onChange={(event) => options.onChange(event as unknown as Parameters<typeof options.onChange>[0])}
      />
    </div>
  ),
  CurrentPageReport: (options) => (
    <span className="text-color-secondary text-sm mx-2 dt-paginator-report">
      ({options.totalRecords === 0 ? '0-0 dari 0' : `${options.first}-${options.last} dari ${options.totalRecords}`})
    </span>
  ),
};

export const DATA_TABLE_SCROLL_HEIGHT = 'clamp(20rem, 60vh, 42rem)';

export const dataTablePaginatorProps = {
  paginator: true,
  paginatorTemplate: dataTablePaginatorTemplate,
  scrollable: true,
  scrollHeight: DATA_TABLE_SCROLL_HEIGHT,
} as const;

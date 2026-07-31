import { InputText } from 'primereact/inputtext';
import { FloatLabel } from 'primereact/floatlabel';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  floating?: boolean;
  label?: string;
  id?: string;
}

export function SearchInput({ value, onChange, placeholder = 'Cari...', className, floating, label = 'Cari', id }: SearchInputProps) {
  if (floating) {
    return (
      <FloatLabel className={`ifta-field w-full${className ? ` ${className}` : ''}`}>
        <InputText id={id} className="w-full" value={value} onChange={(event) => onChange(event.target.value)} />
        <label htmlFor={id}>{label}</label>
      </FloatLabel>
    );
  }

  const iconFieldClassName = `p-icon-field p-icon-field-left inline-flex${value ? ' p-icon-field-right' : ''}${className ? ` ${className}` : ''}`;
  return (
    <span className={iconFieldClassName}>
      <i className="pi pi-search p-input-icon" />
      <InputText id={id} className="w-full" placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
      {value && <i className="pi pi-times p-input-icon" style={{ right: '0.75rem', cursor: 'pointer', color: 'var(--text-color-secondary)' }} onClick={() => onChange('')} />}
    </span>
  );
}

export default SearchInput;

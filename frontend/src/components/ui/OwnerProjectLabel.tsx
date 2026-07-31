const DEFAULT_MAX_OWNER_LENGTH = 20;

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
}

interface OwnerProjectLabelProps {
  username?: string | null;
  name: string;
  maxOwnerLength?: number;
  className?: string;
}

/** Label owner/project dari source new, dengan kontrak username lokal yang tetap ringan. */
export function OwnerProjectLabel({ username, name, maxOwnerLength = DEFAULT_MAX_OWNER_LENGTH, className }: OwnerProjectLabelProps) {
  const owner = username ? truncate(username, maxOwnerLength) : null;
  const classes = ['owner-project-label', className].filter(Boolean).join(' ');

  return (
    <span className={classes} title={owner ? `${username} / ${name}` : name}>
      {owner && (
        <>
          <span className="owner-project-label-owner">{owner}</span>
          <span className="owner-project-label-sep"> / </span>
        </>
      )}
      <span className="owner-project-label-name">{name}</span>
    </span>
  );
}

export function AdminPageHeader({ title, actions }: {
  title: string;
  actions?: { id: string; label: string }[];
}) {
  return (
    <header className="admin-page-heading">
      <h1>{title}</h1>
      {actions?.length ? (
        <nav aria-label="Akce na stránce">
          {actions.map(({ id, label }, index) => (
            <a key={id} href={`#${id}`} className={index === 0 ? "button button-small" : "button button-secondary button-small"}>
              {label}
            </a>
          ))}
        </nav>
      ) : null}
    </header>
  );
}

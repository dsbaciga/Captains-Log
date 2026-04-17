interface Props {
  originalName: string;
  storedPath: string;
}

export default function SourcePdfBadge({ originalName, storedPath }: Props) {
  // storedPath is relative, e.g. "pdfs/123/uuid.pdf" — prefix with configured upload base URL
  const uploadBase = import.meta.env.VITE_UPLOAD_URL || '/uploads';
  const url = `${uploadBase}/${storedPath}`;
  const displayName = originalName.length > 30 ? `${originalName.slice(0, 27)}...` : originalName;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={originalName}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
      onClick={(e) => e.stopPropagation()}
    >
      <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
      {displayName}
    </a>
  );
}

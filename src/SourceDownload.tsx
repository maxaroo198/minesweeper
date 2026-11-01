import { useEffect, useState } from 'react';
import { ArrowDownToLine, Code2 } from 'lucide-react';
import { SOURCE_ARCHIVE_BASE64, SOURCE_ARCHIVE_FILENAME, SOURCE_ARCHIVE_FILE_COUNT } from './sourceData';

interface SourceDownloadProps {
  className?: string;
}

export default function SourceDownload({ className = 'nav-item source-download' }: SourceDownloadProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!SOURCE_ARCHIVE_BASE64) return;
    const directUrl = `data:application/zip;base64,${SOURCE_ARCHIVE_BASE64}`;
    let objectUrl: string | undefined;
    try {
      // Single-file previews may not host public/ assets; keep the ZIP in the bundle.
      if (window.origin === 'null') {
        setUrl(directUrl);
      } else {
        const binary = atob(SOURCE_ARCHIVE_BASE64);
        const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
        objectUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/zip' }));
        setUrl(objectUrl);
      }
    } catch {
      setUrl(directUrl);
    }
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, []);

  if (!url) return null;
  return (
    <a
      className={className}
      href={url}
      download={SOURCE_ARCHIVE_FILENAME}
      title={`${SOURCE_ARCHIVE_FILE_COUNT} source files, including Android Java, React, and build instructions. No signing keys.`}
    >
      <Code2 size={18} />
      <span>Source code (ZIP)</span>
      <ArrowDownToLine size={15} className="nav-end-icon" />
    </a>
  );
}
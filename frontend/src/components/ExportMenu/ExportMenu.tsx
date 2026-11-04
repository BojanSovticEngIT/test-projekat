import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import { Button, CircularProgress, ListItemText, Menu, MenuItem } from '@mui/material';
import { useState } from 'react';
import { exportReport, FORMAT_LABELS, type ExportFormat, type Report } from '../../lib/export';
import { showGlobalToast } from '../../lib/globalToast';

interface ExportMenuProps {
  // Built on demand so the export reflects the current filters, sorting and permissions.
  getReport: () => Report | Promise<Report>;
  formats?: ExportFormat[];
  disabled?: boolean;
  label?: string;
}

const HINTS: Record<ExportFormat, string> = {
  xlsx: 'All rows, one sheet per table',
  csv: 'All rows, plain text',
  pdf: 'Printable report with charts',
  pptx: 'Slides with charts and tables',
  png: 'Snapshot image'
};

function ExportMenu({ getReport, formats = ['xlsx', 'csv', 'pdf', 'pptx', 'png'], disabled = false, label = 'Export' }: ExportMenuProps): JSX.Element {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (format: ExportFormat): Promise<void> => {
    setAnchor(null);
    setBusy(true);
    try {
      await exportReport(await getReport(), format);
      showGlobalToast(`${FORMAT_LABELS[format]} export ready.`, 'success');
    } catch (error) {
      showGlobalToast(error instanceof Error ? error.message : 'Export failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={busy ? <CircularProgress size={16} /> : <FileDownloadOutlinedIcon />}
        disabled={disabled || busy}
        onClick={(event) => setAnchor(event.currentTarget)}
        aria-haspopup="menu"
      >
        {label}
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {formats.map((format) => (
          <MenuItem key={format} onClick={() => void run(format)}>
            <ListItemText primary={FORMAT_LABELS[format]} secondary={HINTS[format]} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

export default ExportMenu;

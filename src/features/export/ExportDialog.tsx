import { ExportPrepMode } from '@features/export-prep/ExportPrepMode.tsx';

interface ExportDialogProps {
  visible: boolean;
  onClose: () => void;
}

export function ExportDialog({ visible, onClose }: ExportDialogProps) {
  return <ExportPrepMode visible={visible} onClose={onClose} />;
}

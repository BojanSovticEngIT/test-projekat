import StructureTreeFilter from './StructureTreeFilter';
import type { StructureSelection } from './StructureTreeFilter';
import { useHorizontalNodes } from './workforceApi';

interface CorporateStructureFilterProps {
  value: StructureSelection | null;
  onChange: (value: StructureSelection | null) => void;
  label?: string;
  selectAnyLevel?: boolean;
  fullWidth?: boolean;
}

function CorporateStructureFilter({
  value,
  onChange,
  label = 'Corporate structure',
  selectAnyLevel,
  fullWidth
}: CorporateStructureFilterProps): JSX.Element {
  const { data: nodes = [] } = useHorizontalNodes();
  return (
    <StructureTreeFilter
      label={label}
      nodes={nodes}
      value={value}
      onChange={onChange}
      selectAnyLevel={selectAnyLevel}
      fullWidth={fullWidth}
    />
  );
}

export default CorporateStructureFilter;

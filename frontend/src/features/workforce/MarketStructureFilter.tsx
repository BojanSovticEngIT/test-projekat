import StructureTreeFilter from './StructureTreeFilter';
import type { StructureSelection } from './StructureTreeFilter';
import { useVerticalNodes } from './workforceApi';

interface MarketStructureFilterProps {
  value: StructureSelection | null;
  onChange: (value: StructureSelection | null) => void;
  selectAnyLevel?: boolean;
}

function MarketStructureFilter({ value, onChange, selectAnyLevel }: MarketStructureFilterProps): JSX.Element {
  const { data: nodes = [] } = useVerticalNodes();
  return (
    <StructureTreeFilter
      label="Market structure"
      nodes={nodes}
      value={value}
      onChange={onChange}
      selectAnyLevel={selectAnyLevel}
    />
  );
}

export default MarketStructureFilter;

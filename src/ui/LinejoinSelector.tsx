import { JoinedButtonGroup } from './JoinedButtonGroup';

interface LinejoinSelectorProps {
  value: 'miter' | 'round' | 'bevel';
  onChange: (value: 'miter' | 'round' | 'bevel') => void;
  title?: string;
}

export const LinejoinSelector: React.FC<LinejoinSelectorProps> = ({
  value,
  onChange,
  title = "Stroke Linejoin"
}) => {
  const linejoinOptions: Array<{
    value: 'miter' | 'round' | 'bevel';
    label: string;
    description: string;
  }> = [
    { value: 'miter', label: 'Miter', description: 'Miter Join - Sharp corner with pointed edge' },
    { value: 'bevel', label: 'Bevel', description: 'Bevel Join - Flattened corner' },
    { value: 'round', label: 'Round', description: 'Round Join - Rounded corner' }
  ];

  return (
    <JoinedButtonGroup
      options={linejoinOptions}
      value={value}
      onChange={onChange}
      title={title}
    />
  );
};

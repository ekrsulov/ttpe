import { ToggleButton } from './ToggleButton';

interface JoinedButtonGroupProps<T> {
  options: Array<{ value: T; label: string; description?: string }>;
  value: T;
  onChange: (value: T) => void;
  title?: string;
}

export const JoinedButtonGroup = <T extends string>({
  options,
  value,
  onChange,
  title: _title = ""
}: JoinedButtonGroupProps<T>) => {
  return (
    <div style={{ display: 'flex', width: '100%' }}>
      {options.map((option, index) => {
        const isFirst = index === 0;
        const isLast = index === options.length - 1;
        const sx = {
          w: '100%',
          borderRadius: 0,
          borderRightWidth: !isLast ? 0 : undefined,
          borderLeftWidth: !isFirst && options.length === 2 ? 0 : undefined,
          ...(isFirst && { borderTopLeftRadius: 'full', borderBottomLeftRadius: 'full' }),
          ...(isLast && { borderTopRightRadius: 'full', borderBottomRightRadius: 'full' }),
        };
        return (
          <ToggleButton
            key={String(option.value)}
            isActive={value === option.value}
            onClick={() => onChange(option.value)}
            aria-label={option.description || option.label}
            title={option.description || option.label}
            variant="text"
            sx={sx}
          >
            {option.label}
          </ToggleButton>
        );
      })}
    </div>
  );
};
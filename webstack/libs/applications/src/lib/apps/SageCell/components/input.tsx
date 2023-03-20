import { Input } from '@chakra-ui/react';

export function SageCellInput(props: any): JSX.Element {
  const { input, onChange } = props;
  return (
    <Input
      value={input}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Enter code here"
      size="lg"
      variant="filled"
      fontFamily="Menlo, Consolas"
    />
  );
}

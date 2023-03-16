interface List {
  items: ListItem[];
  position: Position;
  size: Size;
}

interface ListItem {
  item: string;
  isDragging: boolean;
}

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

export const defaultData: List[] = [
  {
    items: [
      { item: 'Item 1', isDragging: false },
      { item: 'Item 2', isDragging: false },
      { item: 'Item 3', isDragging: false },
      { item: 'Item 4', isDragging: false },
      { item: 'Item 5', isDragging: false },
    ],
    position: { x: 0, y: 0 },
    size: { width: 200, height: 300 },
  },
  {
    items: [
      { item: 'Item 1', isDragging: false },
      { item: 'Item 2', isDragging: false },
      { item: 'Item 3', isDragging: false },
      { item: 'Item 4', isDragging: false },
      { item: 'Item 5', isDragging: false },
    ],
    position: { x: 300, y: 0 },
    size: { width: 200, height: 300 },
  },
];

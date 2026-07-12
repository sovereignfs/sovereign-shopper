export interface ListRow {
  id: string;
  name: string;
  kind: 'personal' | 'household';
  archivedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

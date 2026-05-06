export type Category = {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  is_default: boolean;
};

export type EntityType = 'book' | 'place' | 'project' | 'brand' | 'person';

export type Entity = {
  id: string;
  user_id: string;
  name: string;
  type: EntityType;
};

export type Entry = {
  id: string;
  user_id: string;
  raw_text: string;
  category_id?: string;
  summary?: string;
  amount?: number;
  currency?: string;
  timestamp: string;
  embedding?: number[];
  category?: Category;
  entities?: Entity[];
};

export type EntryEntity = {
  entry_id: string;
  entity_id: string;
};

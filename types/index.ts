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
  tags?: string[];
  embedding_doc?: string;
};

export type EntryEntity = {
  entry_id: string;
  entity_id: string;
};

export type EntityInput = {
  name: string;
  type: 'book' | 'place' | 'person' | 'brand' | 'project';
};

export type ClassifierResult = {
  category: 'expense' | 'reading' | 'idea' | 'travel' | 'shopping' | 'health' | 'misc';
  entities: EntityInput[];
  amount: number | null;
  currency: string | null;
  summary: string;
  tags: string[];
  embedding_doc: string;
};

export type TimeFilter = {
  type: 'relative' | 'absolute' | null;
  range: 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | null;
  from: string | null;
  to: string | null;
};

export type ParsedQuery = {
  intent: 'retrieve' | 'log';
  rewritten_query: string;
  category_filter: 'expense' | 'reading' | 'idea' | 'travel' | 'shopping' | 'health' | 'misc' | null;
  time_filter: TimeFilter;
  entity_filter: string | null;
  aggregation: 'sum' | 'count' | 'list' | null;
};

export type RetrievalAnswer = {
  answer: string;
  entry_ids: string[];
  type: 'sum' | 'count' | 'list' | 'narrative';
};

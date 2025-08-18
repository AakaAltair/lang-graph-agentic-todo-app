export interface Todo {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
  created_at: string; // The datetime will come in as a string
  updated_at: string | null;
}
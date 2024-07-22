export interface Question {
  id: number;
  title: string;
  answer: Answer[];
}

export interface Answer {
  id: number;
  title: string;
  question_id: number;
  is_revealed: boolean;
  rank: number;
}

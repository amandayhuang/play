export interface Question {
  id: number;
  title: string;
  answer: Answer[];
  dataset_title: string;
  dataset_link: string;
}

export interface Answer {
  id: number;
  title: string;
  question_id: number;
  is_revealed: boolean;
  rank: number;
}

export interface Task {
  id: string;
  title: string;
  type: 'work' | 'study';
  time: string;
  date: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface Module {
  id: string;
  title: string;
  subject: string;
  content: string;
  lastRead?: string;
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface FileMetadata {
  id: string;
  name: string;
  storagePath: string;
  downloadURL: string;
  size: number;
  type: string;
  folderId?: string;
  createdAt: any;
}

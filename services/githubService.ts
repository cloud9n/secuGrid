import { Repository } from '../types';
import api from './api';

export const connectGithub = async (token: string): Promise<string> => {
  const response = await api.post('/github/connect', { token });
  return response.data.githubUser;
};

export const fetchRepositories = async (): Promise<Repository[]> => {
  const response = await api.get('/github/repos');
  return response.data;
};

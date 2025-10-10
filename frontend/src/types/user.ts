export interface User {
  id: string;
  name?: string;
  avatar?: string;
  email?: string;
  role_id?: number;

  [key: string]: unknown;
}

import { IBadge } from './IBadge';

export interface IMessageResponse {
  user?: {
    pfp?: string,
    color?: string;
    name?: string;
    badges?: IBadge[];
  };
  created: Date;
  message: string;
  key: string;
}

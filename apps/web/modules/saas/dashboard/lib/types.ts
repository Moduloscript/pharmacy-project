export interface Promotion {
  id: string;
  title: string;
  description: string;
  code: string | null;
  colorScheme: string;
  imageUrl: string | null;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
}

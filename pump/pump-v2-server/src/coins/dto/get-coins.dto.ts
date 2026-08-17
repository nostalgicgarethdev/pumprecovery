export class GetCoinsDto {
  sort: string;
  order: string;
  limit?: number;
  offset?: number;
  name?: string;
  page?: number;
}

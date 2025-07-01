export class CreateLocationDto {
    userId: number;
    latitude: number;
    longitude: number;
    address?: string;
    isOnline?: boolean;
}
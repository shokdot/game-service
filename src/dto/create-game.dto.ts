export interface CreateGameDTO {
    roomId: string;
    userIds: string[];
    winScore?: number;
}

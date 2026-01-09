export interface WsInputDTO {
    type: 'input';
    direction: -1 | 0 | 1;
}

export function isValidWsInput(data: unknown): data is WsInputDTO {
    if (typeof data !== 'object' || data === null) return false;
    const obj = data as Record<string, unknown>;
    return (
        obj.type === 'input' &&
        (obj.direction === -1 || obj.direction === 0 || obj.direction === 1)
    );
}

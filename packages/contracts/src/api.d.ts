export interface ApiMeta {
    requestId: string;
    timestamp: string;
}
export interface ApiError {
    code: string;
    message: string;
}
export interface ApiResponse<T = unknown> {
    success: boolean;
    data: T | null;
    error: ApiError | null;
    meta: ApiMeta;
}
//# sourceMappingURL=api.d.ts.map
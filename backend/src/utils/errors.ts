export class AppError extends Error {
    constructor(
        public readonly message: string,
        public readonly status: number = 500,
        public readonly code: string = 'INTERNAL_ERROR',
        public readonly details?: unknown,
    ) {
        super(message);
        this.name = 'AppError';
    }
}

import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';

        // Handle HttpException (từ NestJS)
        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();

            if (typeof exceptionResponse === 'object') {
                const msgField = (exceptionResponse as any).message;
                if (Array.isArray(msgField)) {
                    message = msgField[0] || exception.message;
                } else {
                    message = msgField || exception.message;
                }
            } else {
                message = exceptionResponse as string;
            }
        }
        // Handle Error (throw new Error())
        else if (exception instanceof Error) {
            status = HttpStatus.BAD_REQUEST;
            message = exception.message;
            this.logger.error(`Error: ${exception.message}`, exception.stack);
        }
        // Handle object errors (RPC errors, etc)
        else if (typeof exception === 'object' && exception !== null) {
            const err = exception as any;

            // Log toàn bộ error object để debug
            this.logger.error(`Object error details:`, JSON.stringify(err, null, 2));

            // Try to extract message từ object
            if (err.message) {
                message = typeof err.message === 'string' ? err.message : JSON.stringify(err.message);
            } else if (err.error) {
                message = typeof err.error === 'string' ? err.error : JSON.stringify(err.error);
            } else if (err.msg) {
                message = typeof err.msg === 'string' ? err.msg : JSON.stringify(err.msg);
            } else if (err.response) {
                // Cho RPC errors
                if (typeof err.response === 'string') {
                    message = err.response;
                } else if (typeof err.response === 'object') {
                    message = JSON.stringify(err.response);
                }
            } else {
                message = JSON.stringify(err);
            }
        }
        // Handle Unknown errors
        else {
            message = 'Unknown error occurred';
            this.logger.error(`Unknown error:`, exception);
        }

        // Return response với format { message: "..." }
        response.status(status).json({
            message,
            timestamp: new Date().toISOString(),
        });
    }
}

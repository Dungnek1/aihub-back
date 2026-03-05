import {
  Injectable,
  Inject,
  Logger,
  ServiceUnavailableException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { firstValueFrom, TimeoutError } from 'rxjs';
import { timeout } from 'rxjs/operators';
import util from 'util';

type ServiceType = 'AUTH' | 'BLOG' | 'NOTIFICATION' | 'TOOL' | 'WEB_INFO' | 'MEDIA' | 'ADMIN' | 'SUPPORT' | 'COURSE' | 'TOOL_MARKETING_SERVICE';

@Injectable()
export class ApiGatewayService {
  private readonly logger = new Logger(ApiGatewayService.name);
  private readonly requestTimeout = 60000; // 60 seconds (increased for Docker environment and complex queries)

  constructor(
    @Inject('AUTH_CLIENT') private readonly authClient: ClientProxy,
    @Inject('BLOG_CLIENT') private readonly blogClient: ClientProxy,
    @Inject('NOTIFICATION_CLIENT')
    private readonly notificationClient: ClientProxy,
    @Inject('TOOL_CLIENT')
    private readonly toolClient: ClientProxy,
    @Inject('WEB_INFO_CLIENT') private readonly webInfoClient: ClientProxy,
    @Inject('MEDIA_CLIENT') private readonly mediaClient: ClientProxy,
    @Inject('ADMIN_CLIENT') private readonly adminClient: ClientProxy,
    @Inject('SUPPORT_CLIENT') private readonly supportClient: ClientProxy,
    @Inject('COURSE_SERVICE') private readonly courseClient: ClientProxy,
    @Inject('TOOL_MARKETING_SERVICE') private readonly toolMarketingClient: ClientProxy,
  ) { }

  /**
   * Forward REST API request to microservice via RabbitMQ
   */
  async forwardToService(
    service: ServiceType,
    pattern: string,
    payload: unknown,
  ): Promise<unknown> {
    try {
      const client = this.getClientForService(service);

      if (!client) {
        throw new ServiceUnavailableException(
          `Service ${service} is unavailable`,
        );
      }

      // Use send() for RPC-style request-response
      const response = await firstValueFrom(
        // use unknown generics to avoid unsafe any
        client
          .send<unknown, unknown>(pattern, payload)
          .pipe(timeout(this.requestTimeout)),
      );

      // Check if response contains an error from microservice
      if (response && typeof response === 'object' && 'err' in response) {
        const error = (response as any).err;
        if (error instanceof Error) {
          throw error;
        } else if (typeof error === 'string') {
          throw new Error(error);
        } else {
          throw new Error('Unknown error from microservice');
        }
      }

      return response;
    } catch (error) {
      // Log full error for easier debugging (including nested properties)
      this.logger.error(
        `Error forwarding request to ${service} with pattern ${pattern}: ${util.inspect(
          error,
          { depth: 4 },
        )}`,
      );

      // Check if it's already an HTTP Exception that should be thrown directly
      if (error instanceof BadRequestException ||
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException ||
        error instanceof ConflictException) {
        throw error;
      }

      // Handle RpcException specifically
      if (error instanceof RpcException) {
        const rpcError = error.getError();

        // Handle HttpException from microservice
        if (rpcError && typeof rpcError === 'object' && 'statusCode' in rpcError && 'message' in rpcError) {
          const httpError = rpcError as { statusCode: number; message: string };
          // You can throw specific HTTP exceptions based on statusCode
          if (httpError.statusCode === 400) {
            throw new BadRequestException(httpError.message);
          } else if (httpError.statusCode === 401) {
            throw new UnauthorizedException(httpError.message);
          } else if (httpError.statusCode === 403) {
            throw new ForbiddenException(httpError.message);
          } else if (httpError.statusCode === 404) {
            throw new NotFoundException(httpError.message);
          } else if (httpError.statusCode === 409) {
            throw new ConflictException(httpError.message);
          } else {
            throw new ServiceUnavailableException(httpError.message);
          }
        }

        // For string messages from RpcException, throw them directly without prefix
        if (typeof rpcError === 'string') {
          throw new BadRequestException(rpcError);
        }

        // For other RPC errors, extract message
        const message = (rpcError as any)?.message || 'RPC Error';
        throw new ServiceUnavailableException(message);
      }

      // Map known errors to clearer exceptions
      if (error instanceof ServiceUnavailableException ||
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException ||
        error instanceof ConflictException) {
        throw error;
      }

      if (error instanceof TimeoutError || (error as any)?.name === 'TimeoutError') {
        throw new ServiceUnavailableException(
          `${service} did not respond within ${this.requestTimeout}ms`,
        );
      }

      // Extract message from error properly
      let message = 'Unknown error';
      if (error instanceof Error) {
        message = error.message;
      } else if (typeof error === 'object' && error !== null) {
        const err = error as any;
        if (err.message && typeof err.message === 'string') {
          message = err.message;
        } else if (err.error && typeof err.error === 'string') {
          message = err.error;
        } else if (err.msg && typeof err.msg === 'string') {
          message = err.msg;
        } else {
          message = JSON.stringify(err);
        }
      } else if (typeof error === 'string') {
        message = error;
      }

      // Extract actual message if it's already in "Failed to forward request" format
      if (message.includes('Failed to forward request to')) {
        message = message.split(': ').slice(1).join(': ');
      }

      throw new BadRequestException(message);
    }
  }

  /**
   * Get client for specific service
   */
  private getClientForService(service: ServiceType): ClientProxy | null {
    switch (service) {
      case 'AUTH':
        return this.authClient;
      case 'BLOG':
        return this.blogClient;
      case 'NOTIFICATION':
        return this.notificationClient;
      case 'TOOL':
        return this.toolClient;
      case 'WEB_INFO':
        return this.webInfoClient;
      case 'MEDIA':
        return this.mediaClient;
      case 'ADMIN':
        return this.adminClient;
      case 'SUPPORT':
        return this.supportClient;
      case 'COURSE':
        return this.courseClient;
      case 'TOOL_MARKETING_SERVICE':
        return this.toolMarketingClient;
      default:
        return null;
    }
  }

  getHello(): string {
    return 'API Gateway is running';
  }
}

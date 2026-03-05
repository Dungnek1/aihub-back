import { Injectable, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY, ROLES_KEY } from '../decorators/response-message.decorator';
import { Role } from '@app/shared/enum/user.enum';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(private reflector: Reflector) {
        super();
    }

    canActivate(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest();
        const path = request.url;

        // Exclude Swagger documentation paths from authentication
        if (path.startsWith('/api/docs') || path.startsWith('/api-docs')) {
            return true;
        }

        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) {
            return true;
        }

        return super.canActivate(context);
    }


    handleRequest(err, user, info, context: ExecutionContext) {

        //
        // You can throw an exception based on either "info" or "err" arguments

        const request: Request = context.switchToHttp().getRequest();
        const authHeader = request.headers['authorization'];


        if (err || !user) {
            throw err || new UnauthorizedException("Invalid token!");
        }

        const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        console.log('Required Roles:', requiredRoles);

        if (!requiredRoles || requiredRoles.length === 0) {
            return user;
        }

        if (!user || !user.role) {
            throw new ForbiddenException('Access denied: no role found.');
        }

        const hasRole = requiredRoles.includes(user.role);
        if (!hasRole) {
            throw new ForbiddenException('Access denied: You do not have permission.');
        }


        return user;
    }
}
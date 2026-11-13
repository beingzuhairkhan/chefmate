import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedRequest extends Record<string, any> {
  user: { userId: string; email: string };
}

export const CurrentUser = createParamDecorator(
  (data: keyof { userId: string; email: string } | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return data ? request.user?.[data] : request.user;
  },
);

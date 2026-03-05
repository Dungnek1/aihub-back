import { Injectable } from '@nestjs/common';

@Injectable()
export class SupportServiceService {
  getHello(): string {
    return 'Hello World!';
  }
}

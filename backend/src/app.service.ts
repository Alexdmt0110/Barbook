import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getApiInfo(): {
    name: string;
    status: string;
    version: string;
  } {
    return {
      name: 'Barbook API',
      status: 'running',
      version: '0.1.0',
    };
  }
}

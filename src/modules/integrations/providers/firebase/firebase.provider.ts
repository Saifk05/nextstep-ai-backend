import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  initializeApp,
  getApps,
  cert,
} from 'firebase-admin/app';

import {
  getAuth,
  DecodedIdToken,
} from 'firebase-admin/auth';

@Injectable()
export class FirebaseProvider implements OnModuleInit {
  constructor(
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    if (getApps().length) {
      return;
    }

    const projectId =
      this.configService.get<string>(
        'FIREBASE_PROJECT_ID',
      );

    const clientEmail =
      this.configService.get<string>(
        'FIREBASE_CLIENT_EMAIL',
      );

    const privateKey = this.configService
      .get<string>('FIREBASE_PRIVATE_KEY')
      ?.replace(/\\n/g, '\n');

    if (
      !projectId ||
      !clientEmail ||
      !privateKey
    ) {
      throw new Error(
        'Firebase environment variables are missing',
      );
    }

    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  async verifyIdToken(
    idToken: string,
  ): Promise<DecodedIdToken> {
    return getAuth().verifyIdToken(idToken);
  }

  getAuth() {
    return getAuth();
  }
}
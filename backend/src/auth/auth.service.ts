import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export class AuthService {
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateToken(payload: object): string {
    return jwt.sign(payload, config.JWT_SECRET, { expiresIn: '1d' });
  }

  verifyToken(token: string): any {
    return jwt.verify(token, config.JWT_SECRET);
  }
}

export const authService = new AuthService();

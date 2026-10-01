import { Module } from '@nestjs/common';
import { UserController } from './user.controller.js';
import { UserService } from './user.service.js';

@Module({
    imports: [],
    providers: [UserService],
    controllers: [UserController],
})
export class UserModule {}

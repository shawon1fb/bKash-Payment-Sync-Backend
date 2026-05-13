import {
  Controller,
  Get,
  Patch,
  Body,
  Query,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import {
  UpdateUserDto,
  QueryUserDto,
  UserResponseDto,
  PaginatedUserResponseDto,
} from './dto';
import { Roles, CurrentUser } from '../auth/decorators';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get own profile' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  getProfile(@CurrentUser() user: UserResponseDto): Promise<UserResponseDto> {
    return this.usersService.findOne(user.id);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update own name' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  updateProfile(
    @CurrentUser() user: UserResponseDto,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.update(user.id, { name: dto.name });
  }

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'List all users (admin)' })
  @ApiResponse({ status: 200, type: PaginatedUserResponseDto })
  findAll(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: QueryUserDto,
  ): Promise<PaginatedUserResponseDto> {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Get user by id (admin)' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user (admin)' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, dto);
  }
}

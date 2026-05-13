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
  ApiParam,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import {
  UpdateUserDto,
  QueryUserDto,
  UserResponseDto,
  PaginatedUserResponseDto,
} from './dto';
import { Roles, CurrentUser } from '../auth/decorators';
import { ErrorResponseDto, ValidationErrorResponseDto } from '../common';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({
    summary: 'Get own profile',
    description: 'Returns the full profile of the currently authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile of the authenticated user.',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT token.', type: ErrorResponseDto })
  @ApiResponse({ status: 500, description: 'Internal server error.', type: ErrorResponseDto })
  getProfile(@CurrentUser() user: UserResponseDto): Promise<UserResponseDto> {
    return this.usersService.findOne(user.id);
  }

  @Patch('profile')
  @ApiOperation({
    summary: 'Update own profile',
    description: 'Allows the authenticated user to update their display name. Only the `name` field is accepted.',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated and returned.',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error — invalid name value.', type: ValidationErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT token.', type: ErrorResponseDto })
  @ApiResponse({ status: 500, description: 'Internal server error.', type: ErrorResponseDto })
  updateProfile(
    @CurrentUser() user: UserResponseDto,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.update(user.id, { name: dto.name });
  }

  @Get()
  @Roles('admin')
  @ApiOperation({
    summary: 'List all users',
    description: 'Admin only. Returns a paginated, filterable list of all users in the system.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of users.',
    type: PaginatedUserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error — invalid query parameters.', type: ValidationErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT token.', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden — caller does not have admin role.', type: ErrorResponseDto })
  @ApiResponse({ status: 500, description: 'Internal server error.', type: ErrorResponseDto })
  findAll(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: QueryUserDto,
  ): Promise<PaginatedUserResponseDto> {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @Roles('admin')
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Admin only. Fetches a single user by their UUID.',
  })
  @ApiParam({ name: 'id', description: 'User UUID', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({
    status: 200,
    description: 'User found and returned.',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT token.', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden — caller does not have admin role.', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Not found — no user with this ID.', type: ErrorResponseDto })
  @ApiResponse({ status: 500, description: 'Internal server error.', type: ErrorResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update user',
    description: 'Admin only. Updates a user\'s name and/or active status by UUID.',
  })
  @ApiParam({ name: 'id', description: 'User UUID', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({
    status: 200,
    description: 'User updated and returned.',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error — invalid field values.', type: ValidationErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT token.', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden — caller does not have admin role.', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Not found — no user with this ID.', type: ErrorResponseDto })
  @ApiResponse({ status: 500, description: 'Internal server error.', type: ErrorResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, dto);
  }
}

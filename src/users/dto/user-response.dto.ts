import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class UserResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the user',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Full name of the user',
    example: 'John Doe',
    minLength: 2,
    maxLength: 100,
  })
  @Expose()
  name: string;

  @ApiProperty({
    description: 'Registered phone number of the user (Bangladeshi format)',
    example: '01711223344',
    pattern: '^01[3-9]\\d{8}$',
    minLength: 11,
    maxLength: 11,
  })
  @Expose()
  phone: string;

  @ApiProperty({
    description:
      'Assigned role of the user. `admin`: full system access — can manage agents, view all transactions, and access dashboards. `agent`: restricted access — can only create and view their own transactions.',
    enum: ['admin', 'agent'],
    enumName: 'UserRole',
    example: 'agent',
  })
  @Expose()
  role: string;

  @ApiProperty({
    description: 'Indicates whether the user account is currently active',
    example: true,
  })
  @Expose()
  isActive: boolean;

  @ApiProperty({
    description: 'Timestamp when the user was created',
    format: 'date-time',
    example: '2026-01-15T08:00:00.000Z',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the user was last updated',
    format: 'date-time',
    example: '2026-05-13T10:30:00.000Z',
  })
  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}

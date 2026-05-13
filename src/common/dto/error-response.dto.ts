import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ description: 'Always false for error responses', example: false })
  success: boolean;

  @ApiProperty({ description: 'HTTP status code reflecting the error (e.g. 400, 401, 403, 500)' })
  statusCode: number;

  @ApiProperty({ description: 'Human-readable description of the error' })
  message: string;
}

export class ValidationErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'Array of field-level validation failure messages. Only present in non-production environments.',
    example: ['name must be longer than or equal to 2 characters', 'phone must be a valid BD number'],
    type: [String],
    required: false,
  })
  errors?: string[];
}

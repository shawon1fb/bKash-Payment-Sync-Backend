import { ApiProperty } from '@nestjs/swagger';

export class TopAgentResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  agentId: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: '01711223344' })
  phone: string;

  @ApiProperty({ example: 45000.0 })
  totalPaid: number;

  @ApiProperty({ example: 23 })
  txCount: number;
}

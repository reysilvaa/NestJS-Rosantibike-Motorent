import { IsOptional, IsEnum, IsString, IsUUID } from 'class-validator';
import { StatusMotor } from '../../../common/enums/status.enum';

export class FilterUnitMotorDto {
  @IsUUID()
  @IsOptional()
  jenisId?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(StatusMotor)
  @IsOptional()
  status?: StatusMotor;
}

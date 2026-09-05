import { Body, Controller, Get, Patch, Put, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { SystemSettingDto, SystemSettingService } from './system-setting.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('system-setting')
export class SystemSettingController {
  constructor(private readonly service: SystemSettingService) {}

  @Get()
  getSettings() {
    return this.service.getSettings();
  }

  @UseGuards(JwtAuthGuard)
  @Patch()
  updateSettingsPatch(@Req() req: any, @Body() body: SystemSettingDto) {
    const user = req.user;
    if (user && user.role !== 'BIGADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Фақат BigAdmin рухсатларни ўзгартира олади');
    }
    return this.service.updateSettings(body);
  }

  @UseGuards(JwtAuthGuard)
  @Put()
  updateSettingsPut(@Req() req: any, @Body() body: SystemSettingDto) {
    const user = req.user;
    if (user && user.role !== 'BIGADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Фақат BigAdmin рухсатларни ўзгартира олади');
    }
    return this.service.updateSettings(body);
  }
}

@Controller('system-settings')
export class SystemSettingsAliasController {
  constructor(private readonly service: SystemSettingService) {}

  @Get()
  getSettings() {
    return this.service.getSettings();
  }

  @UseGuards(JwtAuthGuard)
  @Patch()
  updateSettingsPatch(@Req() req: any, @Body() body: SystemSettingDto) {
    const user = req.user;
    if (user && user.role !== 'BIGADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Фақат BigAdmin рухсатларни ўзгартира олади');
    }
    return this.service.updateSettings(body);
  }

  @UseGuards(JwtAuthGuard)
  @Put()
  updateSettingsPut(@Req() req: any, @Body() body: SystemSettingDto) {
    const user = req.user;
    if (user && user.role !== 'BIGADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Фақат BigAdmin рухсатларни ўзгартира олади');
    }
    return this.service.updateSettings(body);
  }
}

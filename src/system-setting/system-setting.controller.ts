import { Body, Controller, Get, Patch, Put } from '@nestjs/common';
import { SystemSettingService } from './system-setting.service';

@Controller('system-setting')
export class SystemSettingController {
  constructor(private readonly service: SystemSettingService) {}

  @Get()
  getSettings() {
    return this.service.getSettings();
  }

  @Patch()
  updateSettingsPatch(@Body() body: { skladAllowEdit?: boolean; skladAllowDelete?: boolean }) {
    return this.service.updateSettings(body);
  }

  @Put()
  updateSettingsPut(@Body() body: { skladAllowEdit?: boolean; skladAllowDelete?: boolean }) {
    return this.service.updateSettings(body);
  }
}

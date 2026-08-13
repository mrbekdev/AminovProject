import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SystemSettingService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    let setting = await this.prisma.systemSetting.findUnique({
      where: { id: 1 },
    });
    if (!setting) {
      setting = await this.prisma.systemSetting.create({
        data: {
          id: 1,
          skladAllowEdit: true,
          skladAllowDelete: true,
        },
      });
    }
    return setting;
  }

  async updateSettings(data: { skladAllowEdit?: boolean; skladAllowDelete?: boolean }) {
    return this.prisma.systemSetting.upsert({
      where: { id: 1 },
      update: {
        ...(data.skladAllowEdit !== undefined && { skladAllowEdit: data.skladAllowEdit }),
        ...(data.skladAllowDelete !== undefined && { skladAllowDelete: data.skladAllowDelete }),
      },
      create: {
        id: 1,
        skladAllowEdit: data.skladAllowEdit ?? true,
        skladAllowDelete: data.skladAllowDelete ?? true,
      },
    });
  }
}

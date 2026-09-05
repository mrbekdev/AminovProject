import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SystemSettingDto {
  skladAllowEdit?: boolean;
  skladAllowDelete?: boolean;
  adminAllowDeleteProduct?: boolean;
  adminAllowDeleteCategory?: boolean;
  adminAllowDeleteEmployee?: boolean;
  adminAllowDeleteAttendance?: boolean;
  adminAllowDeleteTransaction?: boolean;
  adminAllowDeleteRepayment?: boolean;
  adminAllowDeleteBranch?: boolean;
  adminAllowDeleteCustomer?: boolean;
  adminAllowDeleteExpense?: boolean;
}

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
          adminAllowDeleteProduct: true,
          adminAllowDeleteCategory: true,
          adminAllowDeleteEmployee: true,
          adminAllowDeleteAttendance: true,
          adminAllowDeleteTransaction: true,
          adminAllowDeleteRepayment: true,
          adminAllowDeleteBranch: true,
          adminAllowDeleteCustomer: true,
          adminAllowDeleteExpense: true,
        },
      });
    }
    return setting;
  }

  async updateSettings(data: SystemSettingDto) {
    const updateData: any = {};
    const keys: (keyof SystemSettingDto)[] = [
      'skladAllowEdit',
      'skladAllowDelete',
      'adminAllowDeleteProduct',
      'adminAllowDeleteCategory',
      'adminAllowDeleteEmployee',
      'adminAllowDeleteAttendance',
      'adminAllowDeleteTransaction',
      'adminAllowDeleteRepayment',
      'adminAllowDeleteBranch',
      'adminAllowDeleteCustomer',
      'adminAllowDeleteExpense',
    ];

    for (const key of keys) {
      if (data[key] !== undefined) {
        updateData[key] = Boolean(data[key]);
      }
    }

    return this.prisma.systemSetting.upsert({
      where: { id: 1 },
      update: updateData,
      create: {
        id: 1,
        skladAllowEdit: data.skladAllowEdit ?? true,
        skladAllowDelete: data.skladAllowDelete ?? true,
        adminAllowDeleteProduct: data.adminAllowDeleteProduct ?? true,
        adminAllowDeleteCategory: data.adminAllowDeleteCategory ?? true,
        adminAllowDeleteEmployee: data.adminAllowDeleteEmployee ?? true,
        adminAllowDeleteAttendance: data.adminAllowDeleteAttendance ?? true,
        adminAllowDeleteTransaction: data.adminAllowDeleteTransaction ?? true,
        adminAllowDeleteRepayment: data.adminAllowDeleteRepayment ?? true,
        adminAllowDeleteBranch: data.adminAllowDeleteBranch ?? true,
        adminAllowDeleteCustomer: data.adminAllowDeleteCustomer ?? true,
        adminAllowDeleteExpense: data.adminAllowDeleteExpense ?? true,
      },
    });
  }
}

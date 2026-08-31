import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StoreService {
  constructor(private readonly prisma: PrismaService) {}

  private mapStoreToFrontend(store: any) {
    if (!store) return null;
    return {
      ...store,
      store_name: store.storeName,
      radius_meters: store.radiusMeters,
      working_days: store.workingDays,
      late_tolerance_min: store.lateToleranceMin,
      early_leave_tolerance_min: store.earlyLeaveToleranceMin,
      late_penalty_per_min: store.latePenaltyPerMin,
      early_bonus_per_min: store.earlyBonusPerMin,
      overtime_policy: store.overtimePolicy,
      face_confidence_threshold: store.faceConfidenceThreshold,
    };
  }

  async create(data: any) {
    const store = await this.prisma.store.create({
      data: {
        storeName: data.store_name || data.storeName || 'Bosh Do\'kon',
        address: data.address ?? null,
        latitude: data.latitude !== undefined ? Number(data.latitude) : 41.311081,
        longitude: data.longitude !== undefined ? Number(data.longitude) : 69.240562,
        radiusMeters: data.radius_meters !== undefined ? Number(data.radius_meters) : 150,
        workingDays: data.working_days || data.workingDays || 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday',
        timezone: data.timezone || 'Asia/Tashkent',
        lateToleranceMin: data.late_tolerance_min !== undefined ? Number(data.late_tolerance_min) : 15,
        earlyLeaveToleranceMin: data.early_leave_tolerance_min !== undefined ? Number(data.early_leave_tolerance_min) : 15,
        latePenaltyPerMin: data.late_penalty_per_min !== undefined ? Number(data.late_penalty_per_min) : 500,
        earlyBonusPerMin: data.early_bonus_per_min !== undefined ? Number(data.early_bonus_per_min) : 500,
        overtimePolicy: data.overtime_policy || data.overtimePolicy || 'Standard 1.5x Hourly Rate',
        faceConfidenceThreshold: data.face_confidence_threshold !== undefined ? Number(data.face_confidence_threshold) : 0.75,
        branchId: data.branchId ? Number(data.branchId) : null,
      },
    });
    return this.mapStoreToFrontend(store);
  }

  async findAll() {
    const stores = await this.prisma.store.findMany({
      orderBy: { createdAt: 'asc' },
    });
    // If no store exists yet, create default store
    if (stores.length === 0) {
      const defaultStore = await this.create({
        store_name: 'Bosh Do\'kon',
        address: 'Toshkent sh., Markaz',
        latitude: 41.311081,
        longitude: 69.240562,
        radius_meters: 150,
      });
      return [defaultStore];
    }
    return stores.map(s => this.mapStoreToFrontend(s));
  }

  async findOne(id: number) {
    const store = await this.prisma.store.findUnique({
      where: { id },
    });
    if (!store) throw new NotFoundException('Store not found');
    return this.mapStoreToFrontend(store);
  }

  async update(id: number, data: any) {
    const updateData: any = {};
    if (data.store_name || data.storeName) updateData.storeName = data.store_name || data.storeName;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.latitude !== undefined) updateData.latitude = Number(data.latitude);
    if (data.longitude !== undefined) updateData.longitude = Number(data.longitude);
    if (data.radius_meters !== undefined || data.radiusMeters !== undefined) {
      updateData.radiusMeters = Number(data.radius_meters ?? data.radiusMeters);
    }
    if (data.working_days || data.workingDays) updateData.workingDays = data.working_days || data.workingDays;
    if (data.timezone) updateData.timezone = data.timezone;
    if (data.late_tolerance_min !== undefined || data.lateToleranceMin !== undefined) {
      updateData.lateToleranceMin = Number(data.late_tolerance_min ?? data.lateToleranceMin);
    }
    if (data.early_leave_tolerance_min !== undefined || data.earlyLeaveToleranceMin !== undefined) {
      updateData.earlyLeaveToleranceMin = Number(data.early_leave_tolerance_min ?? data.earlyLeaveToleranceMin);
    }
    if (data.late_penalty_per_min !== undefined || data.latePenaltyPerMin !== undefined) {
      updateData.latePenaltyPerMin = Number(data.late_penalty_per_min ?? data.latePenaltyPerMin);
    }
    if (data.early_bonus_per_min !== undefined || data.earlyBonusPerMin !== undefined) {
      updateData.earlyBonusPerMin = Number(data.early_bonus_per_min ?? data.earlyBonusPerMin);
    }
    if (data.overtime_policy || data.overtimePolicy) updateData.overtimePolicy = data.overtime_policy || data.overtimePolicy;
    if (data.face_confidence_threshold !== undefined || data.faceConfidenceThreshold !== undefined) {
      updateData.faceConfidenceThreshold = Number(data.face_confidence_threshold ?? data.faceConfidenceThreshold);
    }
    if (data.branchId !== undefined) updateData.branchId = data.branchId ? Number(data.branchId) : null;

    const store = await this.prisma.store.update({
      where: { id },
      data: updateData,
    });
    return this.mapStoreToFrontend(store);
  }

  async remove(id: number) {
    return this.prisma.store.delete({
      where: { id },
    });
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function getTashkentDate(date: Date = new Date()): { year: number; month: number; day: number; hours: number; minutes: number } {
  const ms = date.getTime() + 5 * 60 * 60 * 1000;
  const t = new Date(ms);
  return {
    year: t.getUTCFullYear(),
    month: t.getUTCMonth(),
    day: t.getUTCDate(),
    hours: t.getUTCHours(),
    minutes: t.getUTCMinutes(),
  };
}

function startOfDayUTC(date?: Date | string) {
  const d = date ? new Date(date) : new Date();
  const { year, month, day } = getTashkentDate(d);
  return new Date(Date.UTC(year, month, day));
}

function getFirstDayOfMonthUTC() {
  const { year, month } = getTashkentDate();
  return new Date(Date.UTC(year, month, 1));
}

function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function compareBase64Images(b641: string, b642: string): number {
  if (!b641 || !b642) return 0;
  const s1 = b641.replace(/^data:image\/\w+;base64,/, '');
  const s2 = b642.replace(/^data:image\/\w+;base64,/, '');

  if (s1 === s2) return 1.0;

  try {
    const buf1 = Buffer.from(s1, 'base64');
    const buf2 = Buffer.from(s2, 'base64');

    const minLen = Math.min(buf1.length, buf2.length);
    if (minLen === 0) return 0;

    const maxLen = Math.max(buf1.length, buf2.length);
    const lengthRatio = minLen / maxLen;

    const sampleCount = Math.min(minLen, 4000);
    const step = Math.max(1, Math.floor(minLen / sampleCount));

    let diffSum = 0;
    let count = 0;
    for (let i = 0; i < minLen; i += step) {
      diffSum += Math.abs(buf1[i] - buf2[i]);
      count++;
    }

    const avgDiff = count > 0 ? diffSum / count : 255;
    const byteSim = Math.max(0, 1 - (avgDiff / 255));
    const similarity = (byteSim * 0.7) + (lengthRatio * 0.3);
    return Math.round(similarity * 100) / 100;
  } catch {
    return 0.5;
  }
}

function getRoleText(role: string): string {
  switch (role) {
    case 'ADMIN': return 'Администратор';
    case 'BIGADMIN': return 'Бош Администратор (Big Admin)';
    case 'CASHIER': return 'Кассир';
    case 'WAREHOUSE': return 'Складчи';
    case 'AUDITOR': return 'Доставкачи';
    case 'MARKETING': return 'Сотувчи';
    case 'OPERATOR': return 'Оператор';
    case 'OPERATORCALL': return 'Калл марказ';
    case 'HISOBCHI': return 'Ҳисобчи';
    case 'REVIZOR': return 'Ревизор';
    case 'DEBTCASHIER': return 'Насия кассир';
    case 'NAZORATCHI': return 'Назоратчи';
    default: return 'Ходим';
  }
}

function euclideanDistance(arr1: any, arr2: any): number {
  if (!Array.isArray(arr1) || !Array.isArray(arr2) || arr1.length === 0 || arr2.length === 0) return 1.0;
  if (arr1.length !== arr2.length) return 1.0;

  let sum = 0;
  for (let i = 0; i < arr1.length; i++) {
    const diff = Number(arr1[i]) - Number(arr2[i]);
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

function compareFaceTemplates(scannedDescriptor: any, storedVectorOrFace: any): number {
  const targetVector = Array.isArray(storedVectorOrFace)
    ? storedVectorOrFace
    : (storedVectorOrFace?.vector || storedVectorOrFace);

  if (
    Array.isArray(scannedDescriptor) &&
    Array.isArray(targetVector) &&
    scannedDescriptor.length > 0 &&
    scannedDescriptor.length === targetVector.length
  ) {
    const dist = euclideanDistance(scannedDescriptor, targetVector);
    // Face-API standarti: dist < 0.52 bo'lsa yuqori moslik
    if (dist < 0.52) {
      const similarity = 1 - dist;
      return Math.round(Math.max(0, Math.min(1, similarity)) * 100) / 100;
    }
    return 0;
  }
  return 0;
}

export interface CachedFaceUser {
  id: number;
  firstName: string | null;
  lastName: string | null;
  username: string;
  role: string;
  status: string;
  workStartTime: string | null;
  workEndTime: string | null;
  branchId: number | null;
  storeId: number | null;
  store: any;
  branch: any;
  faceVectors: Array<{ id: number; vector: number[] }>;
}

@Injectable()
export class AttendanceService {
  private cachedFaceUsers: CachedFaceUser[] | null = null;
  private lastFaceCacheTime = 0;
  private readonly CACHE_TTL_MS = 10 * 60 * 1000; // 10 daqiqa xotirada saqlash

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Yuz shablonlari keshini tozalash (yangi yuz qo'shilganda yoki o'chirilganda chaqiriladi)
   */
  invalidateFaceCache() {
    this.cachedFaceUsers = null;
    this.lastFaceCacheTime = 0;
  }

  /**
   * Barcha faol xodimlarni va ularning yuz vektorlarini xotirada (RAM) keshlaydi.
   * DIQQAT: Og'ir Base64 matnlar (template va imageUrl) HECH QACHON yuklanmaydi!
   * Shuning hisobiga har bir skaner so'rovi 0 millisekundda DB siz RAM dan bajariladi!
   */
  async getActiveFaceUsers(forceFresh = false): Promise<CachedFaceUser[]> {
    const now = Date.now();
    if (!forceFresh && this.cachedFaceUsers && (now - this.lastFaceCacheTime < this.CACHE_TTL_MS)) {
      return this.cachedFaceUsers;
    }

    const users = await this.prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        role: true,
        status: true,
        workStartTime: true,
        workEndTime: true,
        branchId: true,
        storeId: true,
        store: true,
        branch: true,
        faceTemplates: {
          select: {
            id: true,
            vector: true,
          },
        },
      },
    });

    this.cachedFaceUsers = users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      username: u.username,
      role: u.role,
      status: u.status,
      workStartTime: u.workStartTime,
      workEndTime: u.workEndTime,
      branchId: u.branchId,
      storeId: u.storeId,
      store: u.store,
      branch: u.branch,
      faceVectors: (u.faceTemplates || [])
        .filter((ft) => Array.isArray(ft.vector) && (ft.vector as any[]).length > 0)
        .map((ft) => ({ id: ft.id, vector: ft.vector as number[] })),
    }));

    this.lastFaceCacheTime = now;
    return this.cachedFaceUsers;
  }

  async checkIn(params: { userId?: number; faceTemplateId?: number; branchId?: number; storeId?: number; deviceId?: string; similarity?: number; payload?: any; when?: Date }) {
    const { branchId, storeId, deviceId, similarity, payload } = params;
    let userId = params.userId;
    if (!userId && params.faceTemplateId) {
      const face = await this.prisma.faceTemplate.findUnique({ where: { id: params.faceTemplateId } });
      if (!face) throw new NotFoundException('Face template not found');
      userId = face.userId;
    }
    if (!userId) throw new BadRequestException('userId or faceTemplateId is required');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { store: true, branch: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const today = startOfDayUTC(params.when);
    const now = params.when ? new Date(params.when) : new Date();

    const store = user.store;
    const toleranceMin = store?.lateToleranceMin ?? 15;
    const latePenaltyPerMin = store?.latePenaltyPerMin ?? 500;
    const earlyBonusPerMin = store?.earlyBonusPerMin ?? 500;

    let lateMinutes = 0;
    let penaltyAmount = 0;
    let bonusAmount = 0;

    const workStartTimeStr = user.workStartTime || '09:00';
    const [startH, startM] = workStartTimeStr.split(':').map(Number);
    const { year, month, day: tDay } = getTashkentDate(now);
    const tashkentMidnightUTC = Date.UTC(year, month, tDay, 0, 0, 0, 0) - 5 * 60 * 60 * 1000;
    const workStartMs = tashkentMidnightUTC + (startH * 60 + startM) * 60 * 1000;
    const workStart = new Date(workStartMs);

    if (now > workStart) {
      const diff = Math.round((+now - +workStart) / 60000);
      if (diff > toleranceMin) {
        lateMinutes = diff;
        penaltyAmount = lateMinutes * latePenaltyPerMin;
      }
    } else {
      const earlyDiff = Math.round((+workStart - +now) / 60000);
      if (earlyDiff > 0 && earlyDiff <= 180) {
        bonusAmount = earlyDiff * earlyBonusPerMin;
      }
    }

    const day = await this.prisma.attendanceDay.upsert({
      where: { userId_date: { userId, date: today } },
      create: {
        userId,
        branchId: branchId ?? user.branchId ?? null,
        storeId: storeId ?? user.storeId ?? null,
        date: today,
        checkInAt: now,
        lateMinutes,
        penaltyAmount,
        bonusAmount,
        status: lateMinutes > 0 ? 'LATE' : 'PRESENT',
        deviceId,
      },
      update: {
        checkInAt: now,
        lateMinutes,
        penaltyAmount,
        bonusAmount,
        status: lateMinutes > 0 ? 'LATE' : 'PRESENT',
        branchId: branchId ?? user.branchId ?? null,
        storeId: storeId ?? user.storeId ?? null,
        deviceId,
      },
    });

    await this.prisma.attendanceEvent.create({
      data: {
        userId,
        branchId: branchId ?? user.branchId ?? null,
        dayId: day.id,
        eventType: 'CHECK_IN' as any,
        deviceId,
        similarity: similarity ?? null,
        payload: payload ?? undefined,
      },
    });

    return day;
  }

  async checkOut(params: { userId?: number; faceTemplateId?: number; branchId?: number; storeId?: number; deviceId?: string; similarity?: number; payload?: any; when?: Date }) {
    const { branchId, storeId, deviceId, similarity, payload } = params;
    let userId = params.userId;
    if (!userId && params.faceTemplateId) {
      const face = await this.prisma.faceTemplate.findUnique({ where: { id: params.faceTemplateId } });
      if (!face) throw new NotFoundException('Face template not found');
      userId = face.userId;
    }
    if (!userId) throw new BadRequestException('userId or faceTemplateId is required');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { store: true, branch: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const today = startOfDayUTC(params.when);
    const now = params.when ? new Date(params.when) : new Date();

    const store = user.store;
    const earlyLeaveTol = store?.earlyLeaveToleranceMin ?? 15;
    const latePenaltyPerMin = store?.latePenaltyPerMin ?? 500;
    const earlyBonusPerMin = store?.earlyBonusPerMin ?? 500;

    const workEndTimeStr = user.workEndTime || '18:00';
    const [endH, endM] = workEndTimeStr.split(':').map(Number);
    const { year, month, day: tDay } = getTashkentDate(now);
    const tashkentMidnightUTC = Date.UTC(year, month, tDay, 0, 0, 0, 0) - 5 * 60 * 60 * 1000;
    const workEndMs = tashkentMidnightUTC + (endH * 60 + endM) * 60 * 1000;
    const workEnd = new Date(workEndMs);

    let earlyLeaveMin = 0;
    let earlyLeavePenalty = 0;
    let overtimeBonus = 0;

    if (now < workEnd) {
      const earlyLeaveDiff = Math.round((+workEnd - +now) / 60000);
      if (earlyLeaveDiff > earlyLeaveTol) {
        earlyLeaveMin = earlyLeaveDiff;
        earlyLeavePenalty = earlyLeaveMin * latePenaltyPerMin;
      }
    } else {
      const overtimeDiff = Math.round((+now - +workEnd) / 60000);
      if (overtimeDiff > 0 && overtimeDiff <= 360) {
        overtimeBonus = overtimeDiff * earlyBonusPerMin;
      }
    }

    let day = await this.prisma.attendanceDay.findUnique({ where: { userId_date: { userId, date: today } } });
    if (!day) {
      day = await this.prisma.attendanceDay.create({
        data: {
          userId,
          branchId: branchId ?? user.branchId ?? null,
          storeId: storeId ?? user.storeId ?? null,
          date: today,
          checkOutAt: now,
          earlyLeaveMinutes: earlyLeaveMin,
          penaltyAmount: earlyLeavePenalty,
          bonusAmount: overtimeBonus,
          status: earlyLeaveMin > 0 ? ('LEFT_EARLY' as any) : 'PRESENT',
          deviceId,
        },
      });
    } else {
      const checkInAt = day.checkInAt ? new Date(day.checkInAt) : undefined;
      const totalMinutes = checkInAt ? Math.max(0, Math.round((+now - +checkInAt) / 60000)) : day.totalMinutes ?? 0;
      day = await this.prisma.attendanceDay.update({
        where: { id: day.id },
        data: {
          checkOutAt: now,
          totalMinutes,
          earlyLeaveMinutes: earlyLeaveMin,
          penaltyAmount: (day.penaltyAmount || 0) + earlyLeavePenalty,
          bonusAmount: (day.bonusAmount || 0) + overtimeBonus,
          status: earlyLeaveMin > 0 ? ('LEFT_EARLY' as any) : day.status || 'PRESENT',
          branchId: branchId ?? user.branchId ?? null,
          storeId: storeId ?? user.storeId ?? null,
          deviceId,
        },
      });
    }

    await this.prisma.attendanceEvent.create({
      data: {
        userId,
        branchId: branchId ?? user.branchId ?? null,
        dayId: day.id,
        eventType: 'CHECK_OUT' as any,
        deviceId,
        similarity: similarity ?? null,
        payload: payload ?? undefined,
      },
    });

    return day;
  }

  // ===== Express Kiosk Facial Comparison & Check-in/out =====
  async expressScan(dto: any) {
    const { image_base64, face_descriptor, descriptor, vector, latitude, longitude, accuracy, action = 'CHECK_IN', employee_id } = dto;
    const scanDescriptor = face_descriptor || descriptor || vector;

    if (!image_base64) {
      throw new BadRequestException('Kamera rasmi taqdim etilmadi.');
    }

    let matchedUser: any = null;
    let matchSimilarity = 0.85;

    if (employee_id) {
      const empId = Number(employee_id);
      const activeUsers = await this.getActiveFaceUsers();
      let foundUser = activeUsers.find((u) => u.id === empId);

      if (!foundUser) {
        // Agar keshda bo'lmasa, DB dan faqat kerakli maydonlarni tortamiz
        const dbUser = await this.prisma.user.findUnique({
          where: { id: empId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            role: true,
            status: true,
            workStartTime: true,
            workEndTime: true,
            branchId: true,
            storeId: true,
            store: true,
            branch: true,
            faceTemplates: {
              select: { id: true, vector: true },
            },
          },
        });
        if (dbUser) {
          foundUser = {
            id: dbUser.id,
            firstName: dbUser.firstName,
            lastName: dbUser.lastName,
            username: dbUser.username,
            role: dbUser.role,
            status: dbUser.status,
            workStartTime: dbUser.workStartTime,
            workEndTime: dbUser.workEndTime,
            branchId: dbUser.branchId,
            storeId: dbUser.storeId,
            store: dbUser.store,
            branch: dbUser.branch,
            faceVectors: (dbUser.faceTemplates || [])
              .filter((ft: any) => Array.isArray(ft.vector) && ft.vector.length > 0)
              .map((ft: any) => ({ id: ft.id, vector: ft.vector as number[] })),
          };
        }
      }

      if (!foundUser) {
        throw new NotFoundException('Ходим топилмади.');
      }

      matchedUser = foundUser;

      // 1:1 mode: faqat shu xodimning yuz vektorlari bilan taqqoslash (0.1ms)
      if (foundUser.faceVectors && foundUser.faceVectors.length > 0) {
        let bestUserScore = 0;
        for (const ft of foundUser.faceVectors) {
          const score = compareFaceTemplates(scanDescriptor, ft.vector);
          if (score > bestUserScore) {
            bestUserScore = score;
          }
        }

        if (bestUserScore < 0.50) {
          throw new BadRequestException(`Юз танилмади ёки ушбу ходимга мос келмади. Аниқроқ қараб қайта урининг.`);
        }
        matchSimilarity = bestUserScore;
      } else {
        // Birinchi marta ro'yxatdan o'tish — descriptor bo'lishi shart
        if (!scanDescriptor || !Array.isArray(scanDescriptor) || scanDescriptor.length < 64) {
          throw new BadRequestException('Юз дескриптори аниқланмади. Камерага тўғри қараб урининг.');
        }
        let b64 = image_base64;
        let imgUrl = image_base64;
        if (image_base64.startsWith('data:')) {
          const parts = image_base64.split(',');
          b64 = parts[1] || '';
        } else {
          imgUrl = `data:image/jpeg;base64,${image_base64}`;
        }
        await this.prisma.faceTemplate.create({
          data: {
            userId: matchedUser.id,
            template: b64,
            vector: scanDescriptor || undefined,
            imageUrl: imgUrl,
          },
        });
        this.invalidateFaceCache();
      }
    } else {
      // 1:N Match — RAM keshidagi barcha faol xodimlar bilan 0.5ms da solishtirish!
      const activeUsers = await this.getActiveFaceUsers();

      interface Candidate {
        user: CachedFaceUser;
        bestScore: number;
        bestFtId: number;
      }
      const candidates: Candidate[] = [];

      for (const u of activeUsers) {
        if (u.faceVectors && u.faceVectors.length > 0) {
          let userBestScore = 0;
          let userBestFtId = 0;
          for (const ft of u.faceVectors) {
            const score = compareFaceTemplates(scanDescriptor, ft.vector);
            if (score > userBestScore) {
              userBestScore = score;
              userBestFtId = ft.id;
            }
          }
          if (userBestScore > 0) {
            candidates.push({ user: u, bestScore: userBestScore, bestFtId: userBestFtId });
          }
        }
      }

      candidates.sort((a, b) => b.bestScore - a.bestScore);
      const best = candidates[0];
      const secondBest = candidates[1];

      const bestScore = best ? best.bestScore : 0;
      const secondBestScore = secondBest ? secondBest.bestScore : 0;

      // Anti-spoofing tekshiruvi: faqat BOSHQA odam bilan solishtiriladi!
      const gapOk = !secondBest || (bestScore - secondBestScore >= 0.05);

      if (best && bestScore >= 0.50 && gapOk) {
        matchedUser = best.user;
        matchSimilarity = bestScore;
      } else if (best && bestScore >= 0.50 && !gapOk) {
        // Yuz ikki xil odamga deyarli bir xil mos kelib qolsa
        throw new BadRequestException('Юз аниқ танилмади: бир нечта ходимга мос келмоқда. Камерага яқинроқ туринг.');
      } else {
        throw new BadRequestException('Юз танилмади! Камерага тўғри қараб қайта урининг ёки аввал юз расмингизни рўйхатдан ўтказинг.');
      }
    }

    // ===== GPS Check =====
    let store = matchedUser.store;
    if (!store) {
      const stores = await this.prisma.store.findMany({ take: 1 });
      store = stores.length > 0 ? stores[0] : null;
    }

    let distanceMeters = 0;
    let isOutOfBounds = false;
    const maxAllowedRadius = Number(store?.radiusMeters || 150);

    if (store && latitude !== undefined && longitude !== undefined) {
      distanceMeters = Math.round(
        getDistanceFromLatLonInMeters(
          Number(latitude),
          Number(longitude),
          store.latitude,
          store.longitude,
        ),
      );

      if (distanceMeters > maxAllowedRadius) {
        isOutOfBounds = true;
      }
    }

    if (isOutOfBounds) {
      try {
        await this.prisma.attendanceEvent.create({
          data: {
            userId: matchedUser.id,
            branchId: matchedUser.branchId,
            dayId: null,
            eventType: 'OUT_OF_BOUNDS',
            similarity: matchSimilarity,
            payload: {
              distance_meters: distanceMeters,
              max_radius: maxAllowedRadius,
              out_of_bounds: true,
              status: 'Радиусдан ташқарида',
              action_attempt: action,
            },
          },
        });
      } catch (dbErr) {
        console.error('OUT_OF_BOUNDS audit log saqlashda xatolik:', dbErr);
      }

      throw new BadRequestException(
        `Сиз дўкон гео-зонасидан ташқаридасиз! (Масофа: ${distanceMeters}м, Рухсат этилган: ${maxAllowedRadius}м). Ишга келди/кетди қайд этилмади.`,
      );
    }

    // ===== Attendance Recording & Calculation =====
    const isCheckIn = action === 'CHECK_IN';
    const now = new Date();
    const today = startOfDayUTC(now);

    const defaultSchedule = await (this.prisma as any).workSchedule.findFirst({ where: { isDefault: true } });
    const workStartTimeStr = matchedUser.workStartTime || defaultSchedule?.workStartTime || '09:00';
    const workEndTimeStr = matchedUser.workEndTime || defaultSchedule?.workEndTime || '18:00';

    const [startH, startM] = workStartTimeStr.split(':').map(Number);
    const [endH, endM] = workEndTimeStr.split(':').map(Number);
    const { year, month, day: tDay } = getTashkentDate(now);
    const tashkentMidnightUTC = Date.UTC(year, month, tDay, 0, 0, 0, 0) - 5 * 60 * 60 * 1000;
    const workStartMs = tashkentMidnightUTC + (startH * 60 + startM) * 60 * 1000;
    const workStart = new Date(workStartMs);
    const workEndMs = tashkentMidnightUTC + (endH * 60 + endM) * 60 * 1000;
    const workEnd = new Date(workEndMs);

    let lateMin = 0;
    let earlyLeaveMin = 0;
    let earlyArrivalMin = 0;
    let overtimeMin = 0;
    let penaltyAmt = 0;
    let bonusAmt = 0;
    const toleranceMin = store?.lateToleranceMin || 15;
    const earlyLeaveTol = store?.earlyLeaveToleranceMin || 15;
    const latePenaltyPerMin = store?.latePenaltyPerMin || 500;
    const earlyBonusPerMin = store?.earlyBonusPerMin || 500;

    if (isCheckIn) {
      if (now > workStart) {
        const diff = Math.round((+now - +workStart) / 60000);
        if (diff > toleranceMin) {
          lateMin = diff;
          penaltyAmt = lateMin * latePenaltyPerMin;
        }
      } else {
        const earlyDiff = Math.round((+workStart - +now) / 60000);
        if (earlyDiff > 0 && earlyDiff <= 180) {
          earlyArrivalMin = earlyDiff;
          bonusAmt = earlyDiff * earlyBonusPerMin;
        }
      }
    } else {
      if (now < workEnd) {
        const earlyLeaveDiff = Math.round((+workEnd - +now) / 60000);
        if (earlyLeaveDiff > earlyLeaveTol) {
          earlyLeaveMin = earlyLeaveDiff;
          penaltyAmt = earlyLeaveMin * latePenaltyPerMin;
        }
      } else {
        const overtimeDiff = Math.round((+now - +workEnd) / 60000);
        if (overtimeDiff > 0 && overtimeDiff <= 360) {
          overtimeMin = overtimeDiff;
          bonusAmt = overtimeDiff * earlyBonusPerMin;
        }
      }
    }

    let status = 'PRESENT';
    if (isCheckIn && lateMin > 0) status = 'LATE';
    if (!isCheckIn && earlyLeaveMin > 0) status = 'LEFT_EARLY';

    const existingDay = await this.prisma.attendanceDay.findUnique({
      where: { userId_date: { userId: matchedUser.id, date: today } },
    });

    // ===== Kuniga 1 marta keldi / 1 marta ketdi cheklovi =====
    if (isCheckIn && existingDay?.checkInAt) {
      const checkInTime = new Date(existingDay.checkInAt).toLocaleTimeString('uz-UZ', {
        hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tashkent',
      });
      throw new BadRequestException(
        `Сиз бугун аллақачон ишга келганингизни қайд қилгансиз (${checkInTime}). Кунига фақат 1 марта "Келди" белгилаш мумкин.`,
      );
    }

    if (!isCheckIn && existingDay?.checkOutAt) {
      const checkOutTime = new Date(existingDay.checkOutAt).toLocaleTimeString('uz-UZ', {
        hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tashkent',
      });
      throw new BadRequestException(
        `Сиз бугун аллақачон ишдан кетганингизни қайд қилгансиз (${checkOutTime}). Кунига фақат 1 марта "Кетди" белгилаш мумкин.`,
      );
    }

    if (!isCheckIn && !existingDay?.checkInAt) {
      throw new BadRequestException(
        `Аввал "Ишга келди" ни белгилашингиз керак. Кетишдан олдин келишни қайд этинг.`,
      );
    }

    const calculatedTotalMinutes =
      !isCheckIn && existingDay && existingDay.checkInAt
        ? Math.max(0, Math.round((+now - +existingDay.checkInAt) / 60000))
        : existingDay?.totalMinutes || 0;

    const day = await this.prisma.attendanceDay.upsert({
      where: { userId_date: { userId: matchedUser.id, date: today } },
      create: {
        userId: matchedUser.id,
        branchId: matchedUser.branchId,
        storeId: store?.id || matchedUser.storeId,
        date: today,
        checkInAt: isCheckIn ? now : null,
        checkOutAt: !isCheckIn ? now : null,
        totalMinutes: isCheckIn ? 0 : calculatedTotalMinutes,
        lateMinutes: lateMin,
        earlyLeaveMinutes: earlyLeaveMin,
        penaltyAmount: penaltyAmt,
        bonusAmount: bonusAmt,
        status: status as any,
      },
      update: isCheckIn
        ? {
            checkInAt: now,
            lateMinutes: lateMin,
            penaltyAmount: penaltyAmt,
            bonusAmount: bonusAmt,
            status: status as any,
          }
        : {
            checkOutAt: now,
            totalMinutes: calculatedTotalMinutes,
            earlyLeaveMinutes: earlyLeaveMin,
            penaltyAmount: (existingDay?.penaltyAmount || 0) + penaltyAmt,
            bonusAmount: (existingDay?.bonusAmount || 0) + bonusAmt,
            status: (earlyLeaveMin > 0 ? 'LEFT_EARLY' : existingDay?.status || status) as any,
          },
    });

    await this.prisma.attendanceEvent.create({
      data: {
        userId: matchedUser.id,
        branchId: matchedUser.branchId,
        dayId: day.id,
        eventType: (isCheckIn ? 'CHECK_IN' : 'CHECK_OUT') as any,
        similarity: matchSimilarity,
        payload: {
          latitude,
          longitude,
          accuracy,
          distanceMeters,
          lateMin,
          earlyLeaveMin,
          earlyArrivalMin,
          overtimeMin,
          penaltyAmt,
          bonusAmt,
        },
      },
    });

    const empFullName = `${matchedUser.firstName || ''} ${matchedUser.lastName || ''}`.trim() || matchedUser.username;

    return {
      status: 'success',
      action: isCheckIn ? 'CHECK_IN' : 'CHECK_OUT',
      message: `Давомат муваффақиятли қайд этилди! (${isCheckIn ? 'Ишга келди' : 'Ишдан кетди'})`,
      employee_name: empFullName,
      employee: {
        id: matchedUser.id,
        first_name: matchedUser.firstName || '',
        last_name: matchedUser.lastName || '',
        full_name: empFullName,
        position: matchedUser.position || getRoleText(matchedUser.role),
        department: getRoleText(matchedUser.role),
        monthly_salary: matchedUser.monthlySalary || 5000000,
      },
      attendance: {
        check_in_time: day.checkInAt,
        check_out_time: day.checkOutAt,
        status: day.status,
        late_minutes: day.lateMinutes || 0,
        early_leave_minutes: day.earlyLeaveMinutes || 0,
        penalty: day.penaltyAmount || 0,
        bonus: day.bonusAmount || 0,
      },
      similarity: matchSimilarity,
      score: matchSimilarity,
      match_confidence: matchSimilarity,
      distance: distanceMeters,
      distance_meters: distanceMeters,
    };
  }

  // ===== Kiosk Employees List =====
  async getKioskEmployees() {
    const today = startOfDayUTC();
    const users = await this.prisma.user.findMany({
      where: { status: 'ACTIVE', role: { not: 'BIGADMIN' } },
      include: {
        faceTemplates: true,
        branch: true,
        store: true,
        attendanceDays: {
          where: { date: today },
        },
      },
      orderBy: { firstName: 'asc' },
    });

    return users.map(u => {
      const todayAtt = u.attendanceDays.length > 0 ? u.attendanceDays[0] : null;
      return {
        id: u.id,
        username: u.username,
        first_name: u.firstName || u.username,
        last_name: u.lastName || '',
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username,
        phone: u.phone || '',
        position: u.position || getRoleText(u.role),
        department: { id: u.role, name: getRoleText(u.role) },
        monthly_salary: u.monthlySalary || 5000000,
        work_start_time: u.workStartTime || '09:00',
        work_end_time: u.workEndTime || '18:00',
        has_face: u.faceTemplates.length > 0,
        face_count: u.faceTemplates.length,
        today_attendance: todayAtt
          ? {
              status: todayAtt.status,
              check_in_time: todayAtt.checkInAt,
              check_out_time: todayAtt.checkOutAt,
              late_minutes: todayAtt.lateMinutes || 0,
            }
          : null,
      };
    });
  }

  // ===== Admin Dashboard Stats =====
  async getAdminDashboard(query: any) {
    const today = startOfDayUTC();
    const whereUser: any = { status: 'ACTIVE', role: { not: 'BIGADMIN' } };
    const whereAtt: any = { date: today, user: { role: { not: 'BIGADMIN' } } };

    if (query?.store_id && query.store_id !== 'ALL') {
      const sId = parseInt(query.store_id);
      whereUser.storeId = sId;
      whereAtt.storeId = sId;
    }

    const [totalEmployees, presentDays] = await Promise.all([
      this.prisma.user.count({ where: whereUser }),
      this.prisma.attendanceDay.findMany({
        where: whereAtt,
        select: {
          id: true,
          status: true,
          lateMinutes: true,
        },
      }),
    ]);

    const presentCount = presentDays.length;
    const lateCount = presentDays.filter(d => (d.lateMinutes || 0) > 0 || d.status === 'LATE').length;
    const onTimeCount = Math.max(0, presentCount - lateCount);
    const absentCount = Math.max(0, totalEmployees - presentCount);
    const totalLateMinutes = presentDays.reduce((acc, d) => acc + (d.lateMinutes || 0), 0);

    return {
      total_employees: totalEmployees,
      present_today: presentCount,
      on_time_today: onTimeCount,
      late_today: lateCount,
      absent_today: absentCount,
      total_late_minutes: totalLateMinutes,
    };
  }

  // ===== Employee Monthly Personal Dashboard =====
  async getEmployeeDashboard(userId: number) {
    const firstDay = getFirstDayOfMonthUTC();
    const days = await this.prisma.attendanceDay.findMany({
      where: {
        userId,
        date: { gte: firstDay },
      },
    });

    const monthly_late_minutes = days.reduce((acc, d) => acc + (d.lateMinutes || 0), 0);
    const monthly_early_minutes = days.reduce((acc, d) => acc + (d.bonusAmount ? Math.round(d.bonusAmount / 500) : 0), 0);
    const total_penalty = days.reduce((acc, d) => acc + (d.penaltyAmount || 0), 0);
    const total_bonus = days.reduce((acc, d) => acc + (d.bonusAmount || 0), 0);
    const worked_days = days.length;

    return {
      monthly_late_minutes,
      monthly_early_minutes,
      total_penalty,
      total_bonus,
      worked_days,
    };
  }

  // ===== Employee Personal History =====
  async getMyHistory(userId: number) {
    const firstDay = getFirstDayOfMonthUTC();
    return this.prisma.attendanceDay.findMany({
      where: { userId, date: { gte: firstDay } },
      orderBy: { date: 'desc' },
      include: { events: true },
    });
  }

  // ===== Attendance Reports =====
  async getReportData(query: any) {
    const where: any = {};
    if (query.start_date) where.date = { gte: startOfDayUTC(new Date(query.start_date)) };
    if (query.end_date) {
      where.date = { ...where.date, lte: startOfDayUTC(new Date(query.end_date)) };
    }
    if (query.store_id && query.store_id !== 'ALL') {
      where.storeId = parseInt(query.store_id);
    }
    if (query.department_id && query.department_id !== 'ALL') {
      where.user = { role: query.department_id as any };
    } else {
      where.user = { role: { not: 'BIGADMIN' } };
    }

    const items = await this.prisma.attendanceDay.findMany({
      where,
      select: {
        id: true,
        date: true,
        userId: true,
        checkInAt: true,
        checkOutAt: true,
        totalMinutes: true,
        lateMinutes: true,
        earlyLeaveMinutes: true,
        penaltyAmount: true,
        bonusAmount: true,
        status: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            role: true,
            workStartTime: true,
            workEndTime: true,
            monthlySalary: true,
          },
        },
        branch: { select: { id: true, name: true } },
        store: { select: { id: true, storeName: true, latePenaltyPerMin: true, earlyBonusPerMin: true } },
      },
      orderBy: { date: 'desc' },
    });

    return {
      data: items.map(d => {
        const checkInFormatted = d.checkInAt
          ? new Date(d.checkInAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Tashkent' })
          : null;
        const checkOutFormatted = d.checkOutAt
          ? new Date(d.checkOutAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Tashkent' })
          : null;
        const dateFormatted = d.date.toISOString().split('T')[0];
        const empName = `${d.user?.firstName || ''} ${d.user?.lastName || ''}`.trim() || d.user?.username || '';

        const store = d.store;
        const latePenaltyPerMin = store?.latePenaltyPerMin ?? 500;
        const earlyBonusPerMin = store?.earlyBonusPerMin ?? 500;
        const workStartTimeStr = d.user?.workStartTime || '09:00';
        const workEndTimeStr = d.user?.workEndTime || '18:00';

        const [sH, sM] = workStartTimeStr.split(':').map(Number);
        const [eH, eM] = workEndTimeStr.split(':').map(Number);

        let earlyArrivalMins = 0;
        let overtimeMins = 0;
        let lateMins = d.lateMinutes || 0;
        let earlyLeaveMins = d.earlyLeaveMinutes || 0;

        if (d.checkInAt) {
          const cin = new Date(d.checkInAt);
          const { year, month, day: tDay } = getTashkentDate(cin);
          const tashkentMidnightUTC = Date.UTC(year, month, tDay, 0, 0, 0, 0) - 5 * 60 * 60 * 1000;
          const shiftStart = new Date(tashkentMidnightUTC + (sH * 60 + sM) * 60 * 1000);
          if (cin < shiftStart) {
            earlyArrivalMins = Math.min(180, Math.round((+shiftStart - +cin) / 60000));
          } else if (cin > shiftStart && lateMins === 0) {
            lateMins = Math.round((+cin - +shiftStart) / 60000);
          }
        }

        if (d.checkOutAt) {
          const cout = new Date(d.checkOutAt);
          const { year, month, day: tDay } = getTashkentDate(cout);
          const tashkentMidnightUTC = Date.UTC(year, month, tDay, 0, 0, 0, 0) - 5 * 60 * 60 * 1000;
          const shiftEnd = new Date(tashkentMidnightUTC + (eH * 60 + eM) * 60 * 1000);
          if (cout > shiftEnd) {
            overtimeMins = Math.min(360, Math.round((+cout - +shiftEnd) / 60000));
          } else if (cout < shiftEnd && earlyLeaveMins === 0) {
            earlyLeaveMins = Math.round((+shiftEnd - +cout) / 60000);
          }
        }

        const calculatedBonus = d.bonusAmount !== null && d.bonusAmount !== undefined && d.bonusAmount > 0
          ? d.bonusAmount
          : (earlyArrivalMins + overtimeMins) * earlyBonusPerMin;

        const calculatedPenalty = d.penaltyAmount !== null && d.penaltyAmount !== undefined && d.penaltyAmount > 0
          ? d.penaltyAmount
          : (lateMins + earlyLeaveMins) * latePenaltyPerMin;

        return {
          id: d.id,
          date: dateFormatted,
          employee_id: d.userId,
          employee_name: empName,
          department_name: getRoleText(d.user?.role || ''),
          store_name: d.store?.storeName || d.branch?.name || 'Bosh Do\'kon',
          check_in_time: d.checkInAt ? d.checkInAt.toISOString() : null,
          check_out_time: d.checkOutAt ? d.checkOutAt.toISOString() : null,
          total_minutes: d.totalMinutes || 0,
          work_hours: d.totalMinutes ? Math.round((d.totalMinutes / 60) * 100) / 100 : 0,
          late_minutes: lateMins,
          early_leave_minutes: earlyLeaveMins,
          early_arrival_minutes: earlyArrivalMins,
          overtime_minutes: overtimeMins,
          penalty_amount: calculatedPenalty,
          bonus_amount: calculatedBonus,
          status: d.status,

          // Backward compatibility Cyrillic keys
          'Ходим': empName,
          'Сана': dateFormatted,
          'Келиш вақти': checkInFormatted ? `${dateFormatted} ${checkInFormatted}` : '',
          'Кетиш вақти': checkOutFormatted ? `${dateFormatted} ${checkOutFormatted}` : '',
          'Ишланган вақт (дақиқа)': d.totalMinutes || 0,
          'Ишланган соат': d.totalMinutes ? Math.round((d.totalMinutes / 60) * 100) / 100 : 0,
          'Кечикиш (дақиқа)': lateMins,
          'Эрта кетиш (дақиқа)': earlyLeaveMins,
          'Вақтли келиш (дақиқа)': earlyArrivalMins,
          'Овертайм (дақиқа)': overtimeMins,
          'Статус': d.status === 'LATE' ? 'Кечикди' : d.status === 'PRESENT' ? 'Ўз вақтида' : d.status === 'LEFT_EARLY' ? 'Эрта кетди' : d.status,
        };
      }),
    };
  }

  // ===== Audit Logs =====
  async getAllLogs(query?: any) {
    const where: any = { user: { role: { not: 'BIGADMIN' } } };
    if (query?.store_id && query.store_id !== 'ALL') {
      where.user.storeId = parseInt(query.store_id);
    }
    const events = await this.prisma.attendanceEvent.findMany({
      where,
      take: 100,
      orderBy: { occurredAt: 'desc' },
      select: {
        id: true,
        occurredAt: true,
        eventType: true,
        similarity: true,
        payload: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return events.map((ev) => {
      const empName = ev.user
        ? `${ev.user.firstName || ''} ${ev.user.lastName || ''}`.trim() || ev.user.username
        : 'Noma\'lum xodim';

      const payloadObj: any = ev.payload || {};
      const distance = (ev as any).distanceMeters ?? payloadObj.distance_meters ?? 0;

      const isOutOfBounds = String(ev.eventType) === 'OUT_OF_BOUNDS' || payloadObj.out_of_bounds;

      return {
        id: ev.id,
        timestamp: ev.occurredAt ? ev.occurredAt.toISOString() : new Date().toISOString(),
        occurredAt: ev.occurredAt,
        employee_name: empName,
        employeeName: empName,
        action: isOutOfBounds ? 'OUT_OF_BOUNDS' : ev.eventType === 'CHECK_IN' ? 'CHECK_IN' : 'CHECK_OUT',
        eventType: ev.eventType,
        distance: distance,
        distanceMeters: distance,
        recognition_score: ev.similarity ?? 0.95,
        similarity: ev.similarity ?? 0.95,
        status: isOutOfBounds ? 'Радиусдан ташқарида' : 'Тасдиқланди',
      };
    });
  }

  async recalculateAttendanceMetrics(params: {
    userId: number;
    date: Date;
    checkInAt: Date | null;
    checkOutAt: Date | null;
    customPenalty?: number | null;
    customBonus?: number | null;
    customStatus?: string | null;
    notes?: string | null;
    user?: any;
    store?: any;
  }) {
    const { userId, date, checkInAt, checkOutAt, customPenalty, customBonus, customStatus, notes } = params;

    const user = params.user || (await this.prisma.user.findUnique({
      where: { id: userId },
      include: { store: true },
    }));
    if (!user) throw new NotFoundException('User not found');

    const store = params.store || user.store;
    const lateToleranceMin = store?.lateToleranceMin ?? 15;
    const earlyLeaveToleranceMin = store?.earlyLeaveToleranceMin ?? 15;
    const latePenaltyPerMin = store?.latePenaltyPerMin ?? 500;
    const earlyBonusPerMin = store?.earlyBonusPerMin ?? 500;

    const workStartTimeStr = user.workStartTime || '09:00';
    const workEndTimeStr = user.workEndTime || '18:00';

    const [startH, startM] = workStartTimeStr.split(':').map(Number);
    const [endH, endM] = workEndTimeStr.split(':').map(Number);

    const { year, month, day: tDay } = getTashkentDate(date);
    const tashkentMidnightUTC = Date.UTC(year, month, tDay, 0, 0, 0, 0) - 5 * 60 * 60 * 1000;
    const workStart = new Date(tashkentMidnightUTC + (startH * 60 + startM) * 60 * 1000);
    let workEnd = new Date(tashkentMidnightUTC + (endH * 60 + endM) * 60 * 1000);
    if (workEnd <= workStart) {
      workEnd = new Date(+workEnd + 24 * 60 * 60 * 1000);
    }

    let lateMinutes = 0;
    let latePenalty = 0;
    let earlyArrivalMinutes = 0;
    let earlyArrivalBonus = 0;

    if (checkInAt) {
      if (checkInAt > workStart) {
        const diff = Math.round((+checkInAt - +workStart) / 60000);
        if (diff > lateToleranceMin) {
          lateMinutes = diff;
          latePenalty = lateMinutes * latePenaltyPerMin;
        }
      } else {
        const earlyDiff = Math.round((+workStart - +checkInAt) / 60000);
        if (earlyDiff > 0 && earlyDiff <= 180) {
          earlyArrivalMinutes = earlyDiff;
          earlyArrivalBonus = earlyArrivalMinutes * earlyBonusPerMin;
        }
      }
    }

    let earlyLeaveMinutes = 0;
    let earlyLeavePenalty = 0;
    let overtimeMinutes = 0;
    let overtimeBonus = 0;

    if (checkOutAt) {
      if (checkOutAt < workEnd) {
        const earlyLeaveDiff = Math.round((+workEnd - +checkOutAt) / 60000);
        if (earlyLeaveDiff > earlyLeaveToleranceMin) {
          earlyLeaveMinutes = earlyLeaveDiff;
          earlyLeavePenalty = earlyLeaveMinutes * latePenaltyPerMin;
        }
      } else {
        const overtimeDiff = Math.round((+checkOutAt - +workEnd) / 60000);
        if (overtimeDiff > 0 && overtimeDiff <= 360) {
          overtimeMinutes = overtimeDiff;
          overtimeBonus = overtimeMinutes * earlyBonusPerMin;
        }
      }
    }

    const totalMinutes = checkInAt && checkOutAt
      ? Math.max(0, Math.round((+checkOutAt - +checkInAt) / 60000))
      : 0;

    const penaltyAmount = customPenalty !== undefined && customPenalty !== null && !isNaN(Number(customPenalty))
      ? Number(customPenalty)
      : (latePenalty + earlyLeavePenalty);

    const bonusAmount = customBonus !== undefined && customBonus !== null && !isNaN(Number(customBonus))
      ? Number(customBonus)
      : (earlyArrivalBonus + overtimeBonus);

    let status = customStatus;
    if (status === 'ON_TIME' || status === 'PRESENT') {
      status = 'PRESENT';
    } else if (status === 'EARLY_LEAVE' || status === 'LEFT_EARLY') {
      status = 'LEFT_EARLY';
    } else if (status === 'LATE') {
      status = 'LATE';
    } else if (status === 'ABSENT') {
      status = 'ABSENT';
    } else if (!status || status === 'AUTO') {
      if (lateMinutes > 0) status = 'LATE';
      else if (earlyLeaveMinutes > 0) status = 'LEFT_EARLY';
      else if (checkInAt) status = 'PRESENT';
      else status = 'ABSENT';
    }

    return {
      userId,
      date,
      checkInAt,
      checkOutAt,
      totalMinutes,
      lateMinutes,
      earlyLeaveMinutes,
      penaltyAmount,
      bonusAmount,
      status: status as any,
      notes,
    };
  }

  // ===== Create Manual Attendance =====
  async createManual(dayData: any) {
    const userId = Number(dayData.userId || dayData.employee_id);
    if (!userId) throw new BadRequestException('userId is required');

    const dateStr = dayData.date
      ? (typeof dayData.date === 'string' && dayData.date.includes('T') ? dayData.date.split('T')[0] : String(dayData.date).slice(0, 10))
      : getTashkentDate().year + '-' + String(getTashkentDate().month + 1).padStart(2, '0') + '-' + String(getTashkentDate().day).padStart(2, '0');
    const targetDate = startOfDayUTC(new Date(dateStr));

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { store: true },
    });
    if (!user) throw new NotFoundException('User not found');

    let checkInAt: Date | null = null;
    if (dayData.checkInAt) {
      checkInAt = new Date(dayData.checkInAt);
    } else if (dayData.check_in_time) {
      const timeStr = dayData.check_in_time.length === 5 ? `${dayData.check_in_time}:00` : dayData.check_in_time;
      checkInAt = new Date(`${dateStr}T${timeStr}+05:00`);
    }

    let checkOutAt: Date | null = null;
    if (dayData.checkOutAt) {
      checkOutAt = new Date(dayData.checkOutAt);
    } else if (dayData.check_out_time) {
      const timeStr = dayData.check_out_time.length === 5 ? `${dayData.check_out_time}:00` : dayData.check_out_time;
      checkOutAt = new Date(`${dateStr}T${timeStr}+05:00`);
    }

    const metrics = await this.recalculateAttendanceMetrics({
      userId,
      date: targetDate,
      checkInAt,
      checkOutAt,
      customPenalty: dayData.penalty_amount ?? dayData.penaltyAmount,
      customBonus: dayData.bonus_amount ?? dayData.bonusAmount,
      customStatus: dayData.status,
      notes: dayData.notes || 'Qo\'lda kiritildi (Admin)',
      user,
      store: user.store,
    });

    return this.prisma.attendanceDay.upsert({
      where: { userId_date: { userId, date: targetDate } },
      create: {
        userId,
        branchId: user.branchId ?? null,
        storeId: user.storeId ?? null,
        date: metrics.date,
        checkInAt: metrics.checkInAt,
        checkOutAt: metrics.checkOutAt,
        totalMinutes: metrics.totalMinutes,
        lateMinutes: metrics.lateMinutes,
        earlyLeaveMinutes: metrics.earlyLeaveMinutes,
        penaltyAmount: metrics.penaltyAmount,
        bonusAmount: metrics.bonusAmount,
        status: metrics.status,
        notes: metrics.notes,
      },
      update: {
        checkInAt: metrics.checkInAt,
        checkOutAt: metrics.checkOutAt,
        totalMinutes: metrics.totalMinutes,
        lateMinutes: metrics.lateMinutes,
        earlyLeaveMinutes: metrics.earlyLeaveMinutes,
        penaltyAmount: metrics.penaltyAmount,
        bonusAmount: metrics.bonusAmount,
        status: metrics.status,
        notes: metrics.notes,
      },
    });
  }

  async findAll(query: any) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.max(1, Math.min(200, parseInt(query.limit) || 30));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.userId) where.userId = parseInt(query.userId);
    if (query.branchId) where.branchId = parseInt(query.branchId);
    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) where.date.gte = startOfDayUTC(new Date(query.startDate));
      if (query.endDate) where.date.lte = startOfDayUTC(new Date(query.endDate));
    }

    const [items, total] = await Promise.all([
      this.prisma.attendanceDay.findMany({
        where,
        include: { user: true, branch: true, store: true, events: true },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.attendanceDay.count({ where }),
    ]);

    return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async findOne(id: number) {
    const day = await this.prisma.attendanceDay.findUnique({
      where: { id },
      include: { user: true, branch: true, store: true, events: true },
    });
    if (!day) throw new NotFoundException('Attendance record not found');
    return day;
  }

  async update(id: number, data: any) {
    const existing = await this.prisma.attendanceDay.findUnique({
      where: { id },
      include: { user: { include: { store: true } }, store: true },
    });
    if (!existing) throw new NotFoundException('Attendance record not found');

    const dateStr = data.date
      ? (typeof data.date === 'string' && data.date.includes('T') ? data.date.split('T')[0] : String(data.date).slice(0, 10))
      : existing.date.toISOString().split('T')[0];
    const targetDate = startOfDayUTC(new Date(dateStr));

    const parseTime = (timeVal: any): Date | null => {
      if (!timeVal || timeVal === '—' || timeVal === '-' || timeVal === 'null') return null;
      if (typeof timeVal === 'string') {
        if (timeVal.includes('T') || timeVal.includes('Z')) {
          const parsed = new Date(timeVal);
          if (!isNaN(parsed.getTime())) return parsed;
        }
        let clean = timeVal.trim();
        if (clean.includes(' ')) {
          const parts = clean.split(' ');
          clean = parts[parts.length - 1];
        }
        const tParts = clean.split(':');
        if (tParts.length >= 2) {
          const h = tParts[0].padStart(2, '0');
          const m = tParts[1].padStart(2, '0');
          const s = tParts[2] ? tParts[2].padStart(2, '0') : '00';
          return new Date(`${dateStr}T${h}:${m}:${s}+05:00`);
        }
      } else if (timeVal instanceof Date && !isNaN(timeVal.getTime())) {
        return timeVal;
      }
      return null;
    };

    let checkInAt: Date | null = existing.checkInAt;
    if (data.check_in_time !== undefined) {
      checkInAt = parseTime(data.check_in_time);
    } else if (data.checkInAt !== undefined) {
      checkInAt = parseTime(data.checkInAt);
    }

    let checkOutAt: Date | null = existing.checkOutAt;
    if (data.check_out_time !== undefined) {
      checkOutAt = parseTime(data.check_out_time);
    } else if (data.checkOutAt !== undefined) {
      checkOutAt = parseTime(data.checkOutAt);
    }

    const customPenalty = data.penalty_amount !== undefined ? data.penalty_amount : data.penaltyAmount;
    const customBonus = data.bonus_amount !== undefined ? data.bonus_amount : data.bonusAmount;
    const customStatus = data.status;
    const notes = data.notes !== undefined ? data.notes : (existing.notes || 'Admin tomonidan tahrirlandi');

    const metrics = await this.recalculateAttendanceMetrics({
      userId: existing.userId,
      date: targetDate,
      checkInAt,
      checkOutAt,
      customPenalty,
      customBonus,
      customStatus,
      notes,
      user: existing.user,
      store: existing.store || existing.user?.store,
    });

    const updated = await this.prisma.attendanceDay.update({
      where: { id },
      data: {
        date: metrics.date,
        checkInAt: metrics.checkInAt,
        checkOutAt: metrics.checkOutAt,
        totalMinutes: metrics.totalMinutes,
        lateMinutes: metrics.lateMinutes,
        earlyLeaveMinutes: metrics.earlyLeaveMinutes,
        penaltyAmount: metrics.penaltyAmount,
        bonusAmount: metrics.bonusAmount,
        status: metrics.status,
        notes: metrics.notes,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            role: true,
            workStartTime: true,
            workEndTime: true,
            monthlySalary: true,
          },
        },
        branch: { select: { id: true, name: true } },
        store: { select: { id: true, storeName: true, latePenaltyPerMin: true, earlyBonusPerMin: true } },
      },
    });

    const checkInFormatted = updated.checkInAt
      ? new Date(updated.checkInAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Tashkent' })
      : null;
    const checkOutFormatted = updated.checkOutAt
      ? new Date(updated.checkOutAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Tashkent' })
      : null;
    const dateFormatted = updated.date.toISOString().split('T')[0];
    const empName = `${updated.user?.firstName || ''} ${updated.user?.lastName || ''}`.trim() || updated.user?.username || '';

    return {
      ...updated,
      employee_id: updated.userId,
      employee_name: empName,
      check_in_time: updated.checkInAt ? updated.checkInAt.toISOString() : null,
      check_out_time: updated.checkOutAt ? updated.checkOutAt.toISOString() : null,
      total_minutes: updated.totalMinutes || 0,
      work_hours: updated.totalMinutes ? Math.round((updated.totalMinutes / 60) * 100) / 100 : 0,
      late_minutes: updated.lateMinutes || 0,
      early_leave_minutes: updated.earlyLeaveMinutes || 0,
      penalty_amount: updated.penaltyAmount || 0,
      bonus_amount: updated.bonusAmount || 0,
      // Backward compatibility Cyrillic keys
      'Ходим': empName,
      'Сана': dateFormatted,
      'Келиш вақти': checkInFormatted ? `${dateFormatted} ${checkInFormatted}` : '',
      'Кетиш вақти': checkOutFormatted ? `${dateFormatted} ${checkOutFormatted}` : '',
      'Ишланган вақт (дақиқа)': updated.totalMinutes || 0,
      'Ишланган соат': updated.totalMinutes ? Math.round((updated.totalMinutes / 60) * 100) / 100 : 0,
      'Кечикиш (дақиқа)': updated.lateMinutes || 0,
      'Эрта кетиш (дақиқа)': updated.earlyLeaveMinutes || 0,
      'Статус': updated.status === 'LATE' ? 'Кечикди' : updated.status === 'PRESENT' ? 'Ўз вақтида' : updated.status === 'LEFT_EARLY' ? 'Эрта кетди' : updated.status,
    };
  }

  async remove(id: number, userId?: number) {
    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user && user.role !== 'BIGADMIN') {
        const setting = await this.prisma.systemSetting.findFirst();
        if (setting && setting.adminAllowDeleteAttendance === false) {
          throw new BadRequestException("BigAdmin tomonidan davomatni o'chirish taqiqlangan");
        }
      }
    }
    await this.prisma.attendanceEvent.deleteMany({ where: { dayId: id } });
    return this.prisma.attendanceDay.delete({ where: { id } });
  }

  // ===== Face Templates =====
  async registerFace(body: { userId?: number; employee_id?: number; deviceId?: string; template?: string; image_base64?: string; vector?: any; imageUrl?: string }) {
    const userId = Number(body.userId || body.employee_id);
    if (!userId) throw new BadRequestException('userId is required');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const rawInput = body.template || body.image_base64;
    let b64: string | null = null;
    let finalImageUrl: string | null = body.imageUrl ?? null;

    if (typeof rawInput === 'string' && rawInput.length > 0) {
      if (rawInput.startsWith('data:')) {
        const parts = rawInput.split(',');
        b64 = parts.length > 1 ? parts[1] : '';
        finalImageUrl = rawInput;
      } else {
        b64 = rawInput;
        finalImageUrl = finalImageUrl ?? `data:image/jpeg;base64,${b64}`;
      }
    }

    const created = await this.prisma.faceTemplate.create({
      data: {
        userId,
        deviceId: body.deviceId ?? null,
        template: b64,
        vector: (body.vector || (body as any).descriptor || (body as any).face_descriptor) ?? undefined,
        imageUrl: finalImageUrl,
      },
    });
    this.invalidateFaceCache();
    return created;
  }

  async listFaces(query: any) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.max(1, Math.min(200, parseInt(query.limit) || 30));
    const skip = (page - 1) * limit;
    const where: any = {};
    if (query.userId || query.employee_id) where.userId = parseInt(query.userId || query.employee_id);
    if (query.deviceId) where.deviceId = String(query.deviceId);

    const [itemsRaw, total] = await Promise.all([
      this.prisma.faceTemplate.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.faceTemplate.count({ where }),
    ]);

    const items = itemsRaw.map((it: any) => {
      if (!it?.imageUrl && it?.template) {
        return { ...it, imageUrl: `data:image/jpeg;base64,${it.template}` };
      }
      return it;
    });
    return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async deleteFace(id: number) {
    const res = await this.prisma.faceTemplate.delete({ where: { id } });
    this.invalidateFaceCache();
    return res;
  }

  async getTodayAttendance() {
    const today = startOfDayUTC(new Date());
    const items = await this.prisma.attendanceDay.findMany({
      where: { date: today, user: { role: { not: 'BIGADMIN' } } },
      include: { user: true, branch: true, store: true },
      orderBy: { checkInAt: 'desc' },
    });

    return {
      success: true,
      count: items.length,
      data: items.map((it) => ({
        id: it.id,
        employeeId: it.userId,
        employeeName: `${it.user?.firstName || ''} ${it.user?.lastName || ''}`.trim() || it.user?.username,
        date: it.date,
        checkIn: it.checkInAt,
        checkOut: it.checkOutAt,
        status: it.checkOutAt ? 'Ketdi' : it.checkInAt ? 'Keldi' : 'Kelmagan',
      })),
    };
  }

  async getEmployeeHistory(employeeId: number) {
    const items = await this.prisma.attendanceDay.findMany({
      where: { userId: employeeId },
      include: { user: true },
      orderBy: { date: 'desc' },
    });

    return {
      success: true,
      employeeId,
      count: items.length,
      data: items.map((it) => ({
        id: it.id,
        date: it.date,
        checkIn: it.checkInAt,
        checkOut: it.checkOutAt,
        status: it.checkOutAt ? 'Ketdi' : it.checkInAt ? 'Keldi' : 'Kelmagan',
      })),
    };
  }
}

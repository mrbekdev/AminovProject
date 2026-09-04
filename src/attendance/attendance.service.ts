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

function compareFaceTemplates(scannedDescriptor: any, scannedB64: string, storedFace: any): number {
  if (Array.isArray(scannedDescriptor) && Array.isArray(storedFace.vector) && scannedDescriptor.length > 0 && scannedDescriptor.length === storedFace.vector.length) {
    const dist = euclideanDistance(scannedDescriptor, storedFace.vector);
    if (dist < 0.52) {
      const similarity = Math.max(0.70, 1 - (dist / 1.5));
      return Math.round(similarity * 100) / 100;
    }
    return 0;
  }

  // Backward compatibility for legacy face templates without vector array
  if (storedFace.template && scannedB64) {
    const score = compareBase64Images(scannedB64, storedFace.template);
    return score >= 0.72 ? score : 0;
  }

  return 0;
}

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async checkIn(params: { userId?: number; faceTemplateId?: number; branchId?: number; storeId?: number; deviceId?: string; similarity?: number; payload?: any; when?: Date }) {
    const { branchId, storeId, deviceId, similarity, payload } = params;
    let userId = params.userId;
    if (!userId && params.faceTemplateId) {
      const face = await this.prisma.faceTemplate.findUnique({ where: { id: params.faceTemplateId } });
      if (!face) throw new NotFoundException('Face template not found');
      userId = face.userId;
    }
    if (!userId) throw new BadRequestException('userId or faceTemplateId is required');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const today = startOfDayUTC(params.when);
    const now = params.when ? new Date(params.when) : new Date();

    // Check work start time for late minutes in Uzbekistan (UTC+5) time
    let lateMinutes = 0;
    if (user.workStartTime) {
      const [h, m] = user.workStartTime.split(':').map(Number);
      const { year, month, day: tDay } = getTashkentDate(now);
      const workStart = new Date(Date.UTC(year, month, tDay, h - 5, m, 0, 0));
      if (now > workStart) {
        lateMinutes = Math.round((+now - +workStart) / 60000);
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
        status: lateMinutes > 15 ? 'LATE' : 'PRESENT',
        deviceId,
      },
      update: {
        checkInAt: now,
        lateMinutes,
        status: lateMinutes > 15 ? 'LATE' : 'PRESENT',
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

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const today = startOfDayUTC(params.when);
    const now = params.when ? new Date(params.when) : new Date();

    let day = await this.prisma.attendanceDay.findUnique({ where: { userId_date: { userId, date: today } } });
    if (!day) {
      day = await this.prisma.attendanceDay.create({
        data: {
          userId,
          branchId: branchId ?? user.branchId ?? null,
          storeId: storeId ?? user.storeId ?? null,
          date: today,
          checkOutAt: now,
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
      matchedUser = await this.prisma.user.findUnique({
        where: { id: empId },
        include: { faceTemplates: true, store: true, branch: true },
      });
      if (!matchedUser) {
        throw new NotFoundException('Ходим топилмади.');
      }
      // If user has face templates, compare similarity across all registered templates
      if (matchedUser.faceTemplates && matchedUser.faceTemplates.length > 0) {
        let bestUserScore = 0;
        let matchedFt: any = null;
        for (const ft of matchedUser.faceTemplates) {
          const score = compareFaceTemplates(scanDescriptor, image_base64, ft);
          if (score > bestUserScore) {
            bestUserScore = score;
            matchedFt = ft;
          }
        }
        if (bestUserScore < 0.30) {
          throw new BadRequestException(`Юз танилмади ёки ушбу ходимга мос келмади.`);
        }
        if (matchedFt && !matchedFt.vector && scanDescriptor) {
          await this.prisma.faceTemplate.update({
            where: { id: matchedFt.id },
            data: { vector: scanDescriptor },
          }).catch(() => {});
        }
        matchSimilarity = bestUserScore;
      } else {
        // Register first face template for this user
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
      }
    } else {
      // 1:N Match across all users with registered face templates
      const activeUsers = await this.prisma.user.findMany({
        where: { status: 'ACTIVE' },
        include: { faceTemplates: true, store: true, branch: true },
      });

      let bestScore = 0;
      let bestUser: any = null;
      let bestFt: any = null;

      for (const u of activeUsers) {
        if (u.faceTemplates && u.faceTemplates.length > 0) {
          for (const ft of u.faceTemplates) {
            const score = compareFaceTemplates(scanDescriptor, image_base64, ft);
            if (score > bestScore) {
              bestScore = score;
              bestUser = u;
              bestFt = ft;
            }
          }
        }
      }

      if (bestUser && bestScore >= 0.35) {
        matchedUser = bestUser;
        matchSimilarity = bestScore;
        if (bestFt && !bestFt.vector && scanDescriptor) {
          await this.prisma.faceTemplate.update({
            where: { id: bestFt.id },
            data: { vector: scanDescriptor },
          }).catch(() => {});
        }
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
    const workStartTimeStr = matchedUser.workStartTime || defaultSchedule?.workStartTime || '08:00';
    const workEndTimeStr = matchedUser.workEndTime || defaultSchedule?.workEndTime || '02:00';

    const [startH, startM] = workStartTimeStr.split(':').map(Number);
    const { year, month, day: tDay } = getTashkentDate(now);
    const workStart = new Date(Date.UTC(year, month, tDay, startH - 5, startM, 0, 0));

    let lateMin = 0;
    let penaltyAmt = 0;
    let bonusAmt = 0;
    const toleranceMin = store?.lateToleranceMin || 15;
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
        if (earlyDiff > 0 && earlyDiff <= 120) {
          bonusAmt = earlyDiff * earlyBonusPerMin;
        }
      }
    }

    let status = 'PRESENT';
    if (isCheckIn && lateMin > 0) status = 'LATE';

    const existingDay = await this.prisma.attendanceDay.findUnique({
      where: { userId_date: { userId: matchedUser.id, date: today } },
    });

    // ===== Kuniga 1 marta keldi / 1 marta ketdi cheklovi =====
    if (isCheckIn && existingDay?.checkInAt) {
      const checkInTime = new Date(existingDay.checkInAt).toLocaleTimeString('uz-UZ', {
        hour: '2-digit', minute: '2-digit',
      });
      throw new BadRequestException(
        `Сиз бугун аллақачон ишга келганингизни қайд қилгансиз (${checkInTime}). Кунига фақат 1 марта "Келди" белгилаш мумкин.`,
      );
    }

    if (!isCheckIn && existingDay?.checkOutAt) {
      const checkOutTime = new Date(existingDay.checkOutAt).toLocaleTimeString('uz-UZ', {
        hour: '2-digit', minute: '2-digit',
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
      where: { status: 'ACTIVE' },
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
    const whereUser: any = { status: 'ACTIVE' };
    if (query?.store_id && query.store_id !== 'ALL') {
      whereUser.storeId = parseInt(query.store_id);
    }

    const [totalEmployees, presentDays] = await Promise.all([
      this.prisma.user.count({ where: whereUser }),
      this.prisma.attendanceDay.findMany({
        where: { date: today },
        include: { user: true },
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
    }

    const items = await this.prisma.attendanceDay.findMany({
      where,
      include: { user: { include: { branch: true, store: true } }, branch: true, store: true },
      orderBy: { date: 'desc' },
    });

    return {
      data: items.map(d => {
        const checkInFormatted = d.checkInAt
          ? new Date(d.checkInAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', hour12: false })
          : null;
        const checkOutFormatted = d.checkOutAt
          ? new Date(d.checkOutAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', hour12: false })
          : null;
        const dateFormatted = d.date.toISOString().split('T')[0];
        const empName = `${d.user?.firstName || ''} ${d.user?.lastName || ''}`.trim() || d.user?.username || '';

        return {
          id: d.id,
          date: dateFormatted,
          employee_id: d.userId,
          employee_name: empName,
          department_name: getRoleText(d.user?.role),
          store_name: d.store?.storeName || d.branch?.name || 'Bosh Do\'kon',
          check_in_time: d.checkInAt ? d.checkInAt.toISOString() : null,
          check_out_time: d.checkOutAt ? d.checkOutAt.toISOString() : null,
          total_minutes: d.totalMinutes || 0,
          work_hours: d.totalMinutes ? Math.round((d.totalMinutes / 60) * 100) / 100 : 0,
          late_minutes: d.lateMinutes || 0,
          early_leave_minutes: d.earlyLeaveMinutes || 0,
          penalty_amount: d.penaltyAmount || 0,
          bonus_amount: d.bonusAmount || 0,
          status: d.status,

          // Backward compatibility Cyrillic keys
          'Ходим': empName,
          'Сана': dateFormatted,
          'Келиш вақти': checkInFormatted ? `${dateFormatted} ${checkInFormatted}` : '',
          'Кетиш вақти': checkOutFormatted ? `${dateFormatted} ${checkOutFormatted}` : '',
          'Ишланган вақт (дақиқа)': d.totalMinutes || 0,
          'Ишланган соат': d.totalMinutes ? Math.round((d.totalMinutes / 60) * 100) / 100 : 0,
          'Кечикиш (дақиқа)': d.lateMinutes || 0,
          'Эрта кетиш (дақиқа)': d.earlyLeaveMinutes || 0,
          'Вақтли келиш (дақиқа)': d.bonusAmount ? Math.round(d.bonusAmount / 500) : 0,
          'Овертайм (дақиқа)': 0,
          'Статус': d.status === 'LATE' ? 'Кечикди' : d.status === 'PRESENT' ? 'Ўз вақтида' : d.status,
        };
      }),
    };
  }

  // ===== Audit Logs =====
  async getAllLogs() {
    const events = await this.prisma.attendanceEvent.findMany({
      take: 100,
      orderBy: { occurredAt: 'desc' },
      include: { user: true, branch: true },
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

  // ===== Create Manual Attendance =====
  async createManual(dayData: any) {
    const userId = Number(dayData.userId || dayData.employee_id);
    const date = startOfDayUTC(new Date(dayData.date));

    let checkInAt = dayData.checkInAt ? new Date(dayData.checkInAt) : null;
    let checkOutAt = dayData.checkOutAt ? new Date(dayData.checkOutAt) : null;

    if (!checkInAt && dayData.check_in_time) {
      checkInAt = new Date(`${dayData.date}T${dayData.check_in_time}:00Z`);
    }
    if (!checkOutAt && dayData.check_out_time) {
      checkOutAt = new Date(`${dayData.date}T${dayData.check_out_time}:00Z`);
    }

    const totalMinutes = checkInAt && checkOutAt ? Math.max(0, Math.round((+checkOutAt - +checkInAt) / 60000)) : 0;

    return this.prisma.attendanceDay.upsert({
      where: { userId_date: { userId, date } },
      create: {
        userId,
        date,
        checkInAt,
        checkOutAt,
        totalMinutes,
        notes: dayData.notes || 'Qo\'lda kiritildi (Admin)',
        status: (dayData.status as any) || 'PRESENT',
      },
      update: {
        checkInAt,
        checkOutAt,
        totalMinutes,
        notes: dayData.notes || 'Qo\'lda kiritildi (Admin)',
        status: (dayData.status as any) || 'PRESENT',
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
    return this.prisma.attendanceDay.update({ where: { id }, data });
  }

  async remove(id: number) {
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
    return this.prisma.faceTemplate.delete({ where: { id } });
  }

  async getTodayAttendance() {
    const today = startOfDayUTC(new Date());
    const items = await this.prisma.attendanceDay.findMany({
      where: { date: today },
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

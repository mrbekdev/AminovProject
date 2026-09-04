import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

export function cosineSimilarity(vectorA: number[], vectorB: number[]): number {
  if (!Array.isArray(vectorA) || !Array.isArray(vectorB) || vectorA.length === 0 || vectorB.length === 0) {
    return 0;
  }
  if (vectorA.length !== vectorB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    const a = Number(vectorA[i]);
    const b = Number(vectorB[i]);
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function getTashkentDate(date: Date = new Date()): { year: number; month: number; day: number } {
  const ms = date.getTime() + 5 * 60 * 60 * 1000;
  const t = new Date(ms);
  return {
    year: t.getUTCFullYear(),
    month: t.getUTCMonth(),
    day: t.getUTCDate(),
  };
}

function startOfDayUTC(date?: Date | string) {
  const d = date ? new Date(date) : new Date();
  const { year, month, day } = getTashkentDate(d);
  return new Date(Date.UTC(year, month, day));
}

@Injectable()
export class FaceService {
  private pythonAiUrl: string;

  constructor(private prisma: PrismaService) {
    this.pythonAiUrl = process.env.PYTHON_AI_URL || 'http://localhost:5000';
  }

  private async callPythonAi(file: Express.Multer.File) {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(file.buffer)], { type: file.mimetype || 'image/jpeg' });
    formData.append('image', blob, file.originalname || 'face.jpg');

    try {
      const res = await fetch(`${this.pythonAiUrl}/extract-face`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        let errJson: any = {};
        try {
          errJson = await res.json();
        } catch (_) {}
        return {
          success: false,
          message: errJson.message || 'AI xizmatida xatolik',
          faceDetected: false,
        };
      }

      return await res.json();
    } catch (err) {
      console.error('Python AI Service connection error:', err);
      return {
        success: false,
        message: 'Python AI xizmatiga ulanib bo\'lmadi',
        faceDetected: false,
      };
    }
  }

  async registerFaces(employeeIdStr: string | number, files: Express.Multer.File[]) {
    const employeeId = Number(employeeIdStr);
    if (!employeeId) {
      throw new BadRequestException({ success: false, message: 'employeeId talab qilinadi' });
    }

    const employee = await this.prisma.user.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException({ success: false, message: 'Xodim topilmadi' });
    }

    if (!files || files.length === 0) {
      throw new BadRequestException({ success: false, message: 'Kamida 1 ta rasm yuklanishi kerak' });
    }

    const uploadsDir = path.join(process.cwd(), 'uploads', 'faces');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    let registeredCount = 0;

    for (const file of files) {
      const aiResult = await this.callPythonAi(file);

      if (!aiResult.success) {
        throw new BadRequestException({
          success: false,
          message: aiResult.message || 'Yuz topilmadi',
        });
      }

      const filename = `emp_${employeeId}_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const filePath = path.join(uploadsDir, filename);
      fs.writeFileSync(filePath, file.buffer);

      const relPath = `/uploads/faces/${filename}`;

      await this.prisma.faceTemplate.create({
        data: {
          userId: employeeId,
          template: file.buffer.toString('base64'),
          vector: aiResult.embedding,
          imageUrl: relPath,
        },
      });

      registeredCount++;
    }

    return {
      success: true,
      message: 'FaceID muvaffaqiyatli ro\'yxatdan o\'tkazildi',
      registered_count: registeredCount,
    };
  }

  async verifyFace(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException({ success: false, message: 'Rasm yuborilmadi' });
    }

    const aiResult = await this.callPythonAi(file);

    if (!aiResult.success) {
      throw new BadRequestException({
        success: false,
        message: aiResult.message || 'Yuz topilmadi',
      });
    }

    const scannedEmbedding: number[] = aiResult.embedding;
    if (!scannedEmbedding || scannedEmbedding.length === 0) {
      throw new BadRequestException({ success: false, message: 'Yuz topilmadi' });
    }

    const activeUsers = await this.prisma.user.findMany({
      where: { status: 'ACTIVE' },
      include: { faceTemplates: true, store: true, branch: true },
    });

    let bestSim = 0;
    let bestUser: any = null;

    for (const u of activeUsers) {
      if (u.faceTemplates && u.faceTemplates.length > 0) {
        for (const ft of u.faceTemplates) {
          if (ft.vector && Array.isArray(ft.vector)) {
            const sim = cosineSimilarity(scannedEmbedding, ft.vector as number[]);
            if (sim > bestSim) {
              bestSim = sim;
              bestUser = u;
            }
          }
        }
      }
    }

    if (!bestUser || bestSim < 0.65) {
      throw new BadRequestException({
        success: false,
        message: 'Bu odam tizimda mavjud emas',
      });
    }

    const empFullName = `${bestUser.firstName || ''} ${bestUser.lastName || ''}`.trim() || bestUser.username;
    const now = new Date();
    const today = startOfDayUTC(now);

    const existingDay = await this.prisma.attendanceDay.findUnique({
      where: { userId_date: { userId: bestUser.id, date: today } },
    });

    let statusResult = 'Keldi';

    if (!existingDay || !existingDay.checkInAt) {
      statusResult = 'Keldi';
      await this.prisma.attendanceDay.upsert({
        where: { userId_date: { userId: bestUser.id, date: today } },
        create: {
          userId: bestUser.id,
          branchId: bestUser.branchId,
          storeId: bestUser.storeId,
          date: today,
          checkInAt: now,
          status: 'PRESENT',
        },
        update: {
          checkInAt: now,
          status: 'PRESENT',
        },
      });

      const dayRec = await this.prisma.attendanceDay.findUnique({ where: { userId_date: { userId: bestUser.id, date: today } } });
      await this.prisma.attendanceEvent.create({
        data: {
          userId: bestUser.id,
          branchId: bestUser.branchId,
          dayId: dayRec?.id || 0,
          eventType: 'CHECK_IN' as any,
          similarity: bestSim,
        },
      });
    } else if (existingDay.checkInAt && !existingDay.checkOutAt) {
      statusResult = 'Ketdi';
      const totalMinutes = Math.max(0, Math.round((+now - +existingDay.checkInAt) / 60000));

      await this.prisma.attendanceDay.update({
        where: { id: existingDay.id },
        data: {
          checkOutAt: now,
          totalMinutes,
        },
      });

      await this.prisma.attendanceEvent.create({
        data: {
          userId: bestUser.id,
          branchId: bestUser.branchId,
          dayId: existingDay.id,
          eventType: 'CHECK_OUT' as any,
          similarity: bestSim,
        },
      });
    } else {
      statusResult = 'Ketdi';
    }

    return {
      success: true,
      employee: empFullName,
      status: statusResult,
    };
  }
}

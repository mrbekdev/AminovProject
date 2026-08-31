import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { FaceService } from './face.service';

@Controller('face')
export class FaceController {
  constructor(private readonly faceService: FaceService) {}

  @Post('register')
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype || !file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return cb(
            new BadRequestException({
              success: false,
              message: 'Faqat JPG, PNG yoki WEBP rasmlari qabul qilinadi',
            }),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async register(
    @Body('employeeId') employeeId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.faceService.registerFaces(employeeId, files);
  }

  @Post('verify')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype || !file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return cb(
            new BadRequestException({
              success: false,
              message: 'Faqat JPG, PNG yoki WEBP rasmlari qabul qilinadi',
            }),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async verify(@UploadedFile() file: Express.Multer.File) {
    return this.faceService.verifyFace(file);
  }
}

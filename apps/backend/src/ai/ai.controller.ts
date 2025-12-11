import { Controller, Post, UploadedFile, UploadedFiles, UseInterceptors, Res } from '@nestjs/common';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { AiService } from './ai.service';
import { Response } from 'express';
import { diskStorage } from 'multer';

// 简单的文件存储配置
const storage = diskStorage({
  destination: './uploads',
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // 1. 抠图接口 (接收单张图)
  @Post('rembg')
  @UseInterceptors(FileInterceptor('image', { storage }))
  async removeBg(@UploadedFile() file: Express.Multer.File, @Res() res: Response) {
    // 调用本地 AI
    const resultBuffer = await this.aiService.removeBackgroundLocal(file.path);
    
    res.set('Content-Type', 'image/png');
    res.send(resultBuffer);
  }

  // 2. 消除笔接口 (接收原图 + 蒙版)
  @Post('inpaint')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'image', maxCount: 1 },
    { name: 'mask', maxCount: 1 },
  ]))
  async inpaint(
    @UploadedFiles() files: { image?: Express.Multer.File[], mask?: Express.Multer.File[] }, 
    @Res() res: Response
  ) {
    // 这里为了方便演示直接用 buffer，不落地存文件
    const imageBuf = files.image[0].buffer;
    const maskBuf = files.mask[0].buffer;

    // 调用云端 API
    const resultBuffer = await this.aiService.smartInpaint(imageBuf, maskBuf);

    res.set('Content-Type', 'image/png');
    res.send(resultBuffer);
  }
}
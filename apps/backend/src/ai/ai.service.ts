import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import * as FormData from 'form-data';
import { removeBackground } from '@imgly/background-removal-node';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AiService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {}

  /**
   * 【方案 C：本地派】一键抠图
   * 使用 @imgly/background-removal-node 在 Node.js 本地运行
   * 优点：免费、无需显卡、无需 Python
   */
  async removeBackgroundLocal(imagePath: string): Promise<Buffer> {
    try {
      // 1. 调用本地库进行推理
      // 注意：第一次运行会自动下载 WASM 模型到本地，可能会慢一点
      const blob = await removeBackground(`file://${imagePath}`);
      
      // 2. 将 Blob 转回 Buffer 返回给 Controller
      const arrayBuffer = await blob.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error('Local AI Error:', error);
      throw new InternalServerErrorException('本地抠图失败');
    }
  }

  /**
   * 【方案 A：调用派】智能消除笔
   * 调用 Stability AI 的 Inpainting API
   * 优点：效果顶级，解决 Node.js 跑不动大模型的问题
   */
  async smartInpaint(imageBuffer: Buffer, maskBuffer: Buffer): Promise<Buffer> {
    const formData = new FormData();
    formData.append('image', imageBuffer, { filename: 'image.png' });
    formData.append('mask', maskBuffer, { filename: 'mask.png' });
    formData.append('prompt', 'remove object, seamless fill');
    formData.append('output_format', 'png');

    const apiKey = this.configService.get<string>('STABILITY_API_KEY');

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          'https://api.stability.ai/v2beta/stable-image/edit/inpaint',
          formData,
          {
            headers: {
              ...formData.getHeaders(),
              Authorization: `Bearer ${apiKey}`, 
              Accept: 'image/*', 
            },
            responseType: 'arraybuffer', // 关键：接收二进制图
          },
        ),
      );
      return data;
    } catch (error) {
      console.error('API Error:', error.response?.data?.toString());
      throw new InternalServerErrorException('云端 AI 消除失败');
    }
  }
}
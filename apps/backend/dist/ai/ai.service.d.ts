import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
export declare class AiService {
    private readonly httpService;
    private readonly configService;
    constructor(httpService: HttpService, configService: ConfigService);
    removeBackgroundLocal(imagePath: string): Promise<Buffer>;
    smartInpaint(imageBuffer: Buffer, maskBuffer: Buffer): Promise<Buffer>;
}

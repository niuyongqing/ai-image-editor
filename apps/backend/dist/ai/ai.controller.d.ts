import { AiService } from './ai.service';
import { Response } from 'express';
export declare class AiController {
    private readonly aiService;
    constructor(aiService: AiService);
    removeBg(file: Express.Multer.File, res: Response): Promise<void>;
    inpaint(files: {
        image?: Express.Multer.File[];
        mask?: Express.Multer.File[];
    }, res: Response): Promise<void>;
}

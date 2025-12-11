"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const FormData = require("form-data");
const background_removal_node_1 = require("@imgly/background-removal-node");
const rxjs_1 = require("rxjs");
let AiService = class AiService {
    constructor(httpService, configService) {
        this.httpService = httpService;
        this.configService = configService;
    }
    async removeBackgroundLocal(imagePath) {
        try {
            const blob = await (0, background_removal_node_1.removeBackground)(`file://${imagePath}`);
            const arrayBuffer = await blob.arrayBuffer();
            return Buffer.from(arrayBuffer);
        }
        catch (error) {
            console.error('Local AI Error:', error);
            throw new common_1.InternalServerErrorException('本地抠图失败');
        }
    }
    async smartInpaint(imageBuffer, maskBuffer) {
        var _a, _b;
        const formData = new FormData();
        formData.append('image', imageBuffer, { filename: 'image.png' });
        formData.append('mask', maskBuffer, { filename: 'mask.png' });
        formData.append('prompt', 'remove object, seamless fill');
        formData.append('output_format', 'png');
        const apiKey = this.configService.get('STABILITY_API_KEY');
        try {
            const { data } = await (0, rxjs_1.firstValueFrom)(this.httpService.post('https://api.stability.ai/v2beta/stable-image/edit/inpaint', formData, {
                headers: Object.assign(Object.assign({}, formData.getHeaders()), { Authorization: `Bearer ${apiKey}`, Accept: 'image/*' }),
                responseType: 'arraybuffer',
            }));
            return data;
        }
        catch (error) {
            console.error('API Error:', (_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.toString());
            throw new common_1.InternalServerErrorException('云端 AI 消除失败');
        }
    }
};
exports.AiService = AiService;
exports.AiService = AiService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof axios_1.HttpService !== "undefined" && axios_1.HttpService) === "function" ? _a : Object, typeof (_b = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _b : Object])
], AiService);
//# sourceMappingURL=ai.service.js.map
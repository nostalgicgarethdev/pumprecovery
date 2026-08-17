import { Controller, Get, Param } from '@nestjs/common';
import { GlobalParamsService } from './global-params.service';

@Controller('global-params')
export class GlobalParamsController {
  constructor(private readonly globalParamsService: GlobalParamsService) {}

  @Get(':mint')
  async getGlobalParamsByMint(@Param('mint') mint: string) {
    return this.globalParamsService.getGlobalParamsByMint(mint);
  }
}

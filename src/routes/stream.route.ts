import { Get, Param, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Routes } from 'src/common/decorators/route.decorator';
import { StreamController } from 'src/controllers/stream.controller';

@ApiTags('stream')
@Routes('stream')
export class StreamRoute {
  constructor(private readonly controller: StreamController) {}

  @Get(':userId')
  @ApiOperation({ summary: 'Establece conexión SSE con el cliente' })
  @ApiResponse({ status: 200, description: 'Conexión SSE establecida' })
  async stream(@Param('userId') _userId: string, @Req() req: any, @Res() res: any) {
    return await this.controller.streamHandler(req, res);
  }
}



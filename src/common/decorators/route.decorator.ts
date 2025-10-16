import { applyDecorators, Controller } from '@nestjs/common';

export function Routes(prefix?: string): ClassDecorator {
  if (prefix) 
    return applyDecorators(Controller(prefix));
  
  return applyDecorators(Controller());
}
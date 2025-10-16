import { Module, ModuleMetadata } from '@nestjs/common';

export function InjectDependencies(metadata: {
  routes?: ModuleMetadata['controllers'];
  services?: ModuleMetadata['providers'];
  controllers?: ModuleMetadata['providers'];
  imports?: ModuleMetadata['imports'];
  exports?: ModuleMetadata['exports'];
}): ClassDecorator {
  const { routes, services, controllers, ...rest } = metadata;

  const finalMetadata: ModuleMetadata = {
    ...rest,
    controllers: routes || [],
    providers: [
      ...(services || []),
      ...(controllers || []),
    ],
  };

  return Module(finalMetadata);
}


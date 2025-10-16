import { ApiPropertyOptional } from "@nestjs/swagger";

export interface IApiGlobalResponse<T> {
    status: boolean;
    message?: string;
    data?: T;
    pagination?: IPaginationResult;
}

export interface IPaginationResult {
    /**
     * Total de registros encontrados en la búsqueda,
     * sin importar el límite ni la página.
     */
    total: number;
  
    /**
     * Página actual solicitada (1 = primera página).
     */
    page: number;
  
    /**
     * Cantidad de registros devueltos por página.
     */
    limit: number;
  
    /**
     * Número total de páginas calculado en base a total y limit.
     */
    totalPages: number;
}


export class IPaginationRequest { 
   
    @ApiPropertyOptional({
        name: 'page',
        description: 'Pagina de registro',
        example: 1,
        required: false
    })
    page: number;

    @ApiPropertyOptional({
        name: 'limit',
        description: 'Cantidad de registros por página',
        example: 10,
        required: false
    })
    limit: number;
}
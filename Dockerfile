# Establecer la imagen base
FROM node:20-alpine3.19

# Crear el directorio de trabajo
WORKDIR /application

# Copiar los archivos de la aplicación
COPY package*.json ./

# Instalar las dependencias
RUN npm install

COPY . .
ENV TZ America/Lima

RUN npm run build

# Exponer el puerto 8080
EXPOSE 8080

# Iniciar la aplicación
CMD ["node", "dist/src/main.js"]

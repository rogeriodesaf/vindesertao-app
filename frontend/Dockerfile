FROM node:22-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM nginx:1.27-alpine
ENV PORT=80
ENV BACKEND_URL=http://backend:8080
COPY infra/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/vinde-sertao-frontend/browser /usr/share/nginx/html
EXPOSE 80
